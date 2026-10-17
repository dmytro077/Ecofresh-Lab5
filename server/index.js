require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { hashPassword, verifyPassword } = require('./db/store');
const jwt = require('jsonwebtoken');
const { load, save, nextId, seed } = require('./db/store');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ecofresh-secret-key-change-in-production';

seed();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/products', (req, res) => {
  try {
    let products = load().products.slice();
    if (req.query.category) products = products.filter(p => p.category === req.query.category);
    if (req.query.farmer) products = products.filter(p => p.farmer === req.query.farmer);
    if (req.query.certificate) products = products.filter(p => p.certificate === req.query.certificate);
    if (req.query.minPrice) products = products.filter(p => p.price >= Number(req.query.minPrice));
    if (req.query.maxPrice) products = products.filter(p => p.price <= Number(req.query.maxPrice));
    if (req.query.q) {
      const q = req.query.q.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    const sort = req.query.sort || 'popular';
    if (sort === 'price_asc') products.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') products.sort((a, b) => b.price - a.price);
    else products.sort((a, b) => (b.popular || 0) - (a.popular || 0));
    res.json({ products, count: products.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products/:slug', (req, res) => {
  const product = load().products.find(p => p.slug === req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.get('/api/categories', (req, res) => {
  const cats = [...new Set(load().products.map(p => p.category))].sort();
  res.json(cats);
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Ім\'я має містити щонайменше 2 символи' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Невірний формат email' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Пароль має містити щонайменше 8 символів' });
    const data = load();
    if (data.users.find(u => u.email === email.toLowerCase())) {
      return res.status(400).json({ error: 'Користувач з таким email вже існує' });
    }
    const user = {
      id: nextId(data, 'users'),
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashPassword(password),
      role: 'customer',
      created_at: new Date().toISOString()
    };
    data.users.push(user);
    save(data);
    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: payload, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email та пароль обов\'язкові' });
    const user = load().users.find(u => u.email === email.toLowerCase());
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }
    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: payload, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = load().users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at });
});

app.post('/api/orders', auth, (req, res) => {
  try {
    const { items, delivery_address, delivery_method, payment_method, phone } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Кошик порожній' });
    if (!delivery_address || delivery_address.trim().length < 5) return res.status(400).json({ error: 'Вкажіть адресу доставки' });
    if (!phone || !/^\+?380\d{9}$/.test(String(phone).replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Невірний формат телефону (+380XXXXXXXXX)' });
    }
    const data = load();
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = data.products.find(p => p.id === item.product_id);
      if (!product) return res.status(400).json({ error: `Товар id=${item.product_id} не знайдено` });
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Недостатньо товару «${product.name}» на складі` });
      }
      total += product.price * item.quantity;
      orderItems.push({ product_id: product.id, quantity: item.quantity, price: product.price, name: product.name, slug: product.slug });
    }
    const deliveryCost = delivery_method === 'courier' ? 80 : delivery_method === 'nova_poshta' ? 50 : 0;
    total += deliveryCost;
    const orderId = nextId(data, 'orders');
    data.orders.push({
      id: orderId,
      user_id: req.user.id,
      status: 'confirmed',
      total,
      delivery_address: delivery_address.trim(),
      delivery_method: delivery_method || 'pickup',
      payment_method: payment_method || 'cash',
      phone: String(phone).replace(/\s/g, ''),
      created_at: new Date().toISOString()
    });
    for (const oi of orderItems) {
      data.order_items.push({
        id: nextId(data, 'order_items'),
        order_id: orderId,
        product_id: oi.product_id,
        quantity: oi.quantity,
        price: oi.price
      });
      const p = data.products.find(x => x.id === oi.product_id);
      if (p) p.stock -= oi.quantity;
    }
    save(data);
    res.status(201).json({ order_id: orderId, total, message: 'Замовлення успішно оформлено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders', auth, (req, res) => {
  try {
    const data = load();
    const orders = data.orders
      .filter(o => o.user_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(o => {
        const items = data.order_items
          .filter(oi => oi.order_id === o.id)
          .map(oi => {
            const p = data.products.find(x => x.id === oi.product_id);
            return { ...oi, name: p?.name, slug: p?.slug };
          });
        return { ...o, items };
      });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/:id', auth, (req, res) => {
  const data = load();
  const order = data.orders.find(o => o.id === Number(req.params.id) && o.user_id === req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = data.order_items
    .filter(oi => oi.order_id === order.id)
    .map(oi => {
      const p = data.products.find(x => x.id === oi.product_id);
      return { ...oi, name: p?.name, slug: p?.slug, image: p?.image };
    });
  res.json({ ...order, items });
});

app.post('/api/reviews', auth, (req, res) => {
  try {
    const { product_id, rating, text } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Оцінка від 1 до 5' });
    const data = load();
    const id = nextId(data, 'reviews');
    data.reviews.push({
      id, user_id: req.user.id, product_id: product_id || null, rating, text: text || '',
      created_at: new Date().toISOString()
    });
    save(data);
    res.status(201).json({ id, message: 'Відгук додано' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/reviews', (req, res) => {
  const data = load();
  const reviews = data.reviews
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20)
    .map(r => {
      const u = data.users.find(x => x.id === r.user_id);
      return { ...r, user_name: u?.name || 'Анонім' };
    });
  res.json(reviews);
});

app.get('/api/supplier/stats', auth, (req, res) => {
  if (req.user.role !== 'supplier' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  const data = load();
  res.json({
    productsCount: data.products.length,
    ordersCount: data.orders.length,
    revenue: data.orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
  });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(__dirname, '..', 'public', req.path === '/' ? 'index.html' : req.path);
  res.sendFile(filePath, (err) => {
    if (err) res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });
});

app.listen(PORT, () => {
  console.log(`EcoFresh server running on http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/products`);
});
