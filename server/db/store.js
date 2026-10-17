const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data.json');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const hashVerify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === hashVerify;
}

const defaultData = {
  users: [],
  products: [],
  orders: [],
  order_items: [],
  reviews: [],
  _seq: { users: 1, products: 1, orders: 1, order_items: 1, reviews: 1 }
};

function load() {
  if (!fs.existsSync(DB_PATH)) {
    return JSON.parse(JSON.stringify(defaultData));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(data, table) {
  return data._seq[table]++;
}

function seed() {
  const data = load();
  if (data.products.length > 0) return data;

  const products = [
    { slug: 'tomatoes', name: 'Помідори червоні', category: 'Овочі', price: 45, description: 'Свіжі органічні помідори з ферми «Зелений Сад». Вирощені без пестицидів.', details: 'Вага: 1 кг | Сертифікат: Органік Стандарт | Регіон: Київська обл.', image: 'https://images.unsplash.com/photo-1546470427-e212b9d26045?w=400', gallery: ['https://images.unsplash.com/photo-1546470427-e212b9d26045?w=400', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'], farmer: 'Зелений Сад', certificate: 'Органік', stock: 50, popular: 10 },
    { slug: 'carrots', name: 'Морква молода', category: 'Овочі', price: 28, description: 'Солодка молода морква, багата на каротин.', details: 'Вага: 1 кг | Сертифікат: Еко | Регіон: Вінницька обл.', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400', gallery: ['https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400'], farmer: 'Сонячна Грядка', certificate: 'Еко', stock: 80, popular: 8 },
    { slug: 'cucumbers', name: 'Огірки свіжі', category: 'Овочі', price: 35, description: 'Хрусткі огірки з відкритого ґрунту.', details: 'Вага: 1 кг | Сертифікат: Органік | Регіон: Черкаська обл.', image: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400', gallery: ['https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400'], farmer: 'Зелений Сад', certificate: 'Органік', stock: 60, popular: 7 },
    { slug: 'apples', name: 'Яблука Голден', category: 'Фрукти', price: 42, description: 'Соковиті яблука сорту Голден.', details: 'Вага: 1 кг | Сертифікат: Органік Стандарт | Регіон: Закарпаття', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', gallery: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400'], farmer: 'Фруктовий Рай', certificate: 'Органік', stock: 100, popular: 12 },
    { slug: 'strawberries', name: 'Полуниця садова', category: 'Ягоди', price: 89, description: 'Ароматна полуниця з власної плантації.', details: 'Вага: 0.5 кг | Сертифікат: Еко | Регіон: Київська обл.', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400', gallery: ['https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400'], farmer: 'Ягідний Двір', certificate: 'Еко', stock: 30, popular: 15 },
    { slug: 'potatoes', name: 'Картопля молода', category: 'Овочі', price: 22, description: 'Молода картопля з піщаних ґрунтів.', details: 'Вага: 2 кг | Сертифікат: Еко | Регіон: Житомирська обл.', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400', gallery: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400'], farmer: 'Сонячна Грядка', certificate: 'Еко', stock: 120, popular: 9 },
    { slug: 'milk', name: 'Молоко фермерське', category: 'Молочні', price: 38, description: 'Свіже молоко від корів на вільному випасі.', details: 'Об\'єм: 1 л | Сертифікат: Органік | Регіон: Полтавська обл.', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', gallery: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'], farmer: 'Молочна Ферма', certificate: 'Органік', stock: 40, popular: 11 },
    { slug: 'eggs', name: 'Яйця курячі домашні', category: 'Молочні', price: 55, description: 'Яйця від курей вільного вигулу.', details: 'Кількість: 10 шт | Сертифікат: Еко | Регіон: Чернігівська обл.', image: 'https://images.unsplash.com/photo-1582722878705-4f8c2b0e0b0a?w=400', gallery: ['https://images.unsplash.com/photo-1582722878705-4f8c2b0e0b0a?w=400'], farmer: 'Пташиний Двір', certificate: 'Еко', stock: 70, popular: 6 },
    { slug: 'honey', name: 'Мед акацієвий', category: 'Бакалія', price: 180, description: 'Натуральний мед з акації.', details: 'Вага: 0.5 кг | Сертифікат: Органік Стандарт | Регіон: Карпати', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400', gallery: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400'], farmer: 'Пасіка Карпат', certificate: 'Органік', stock: 25, popular: 14 }
  ];

  products.forEach(p => {
    p.id = nextId(data, 'products');
    p.created_at = new Date().toISOString();
    data.products.push(p);
  });

  const hash = hashPassword('password123');
  [
    { name: 'Адмін EcoFresh', email: 'admin@ecofresh.ua', role: 'admin' },
    { name: 'Іван Фермер', email: 'farmer@zelenysad.ua', role: 'supplier' },
    { name: 'Олена Покупець', email: 'olena@example.com', role: 'customer' }
  ].forEach(u => {
    data.users.push({
      id: nextId(data, 'users'),
      ...u,
      password: hash,
      created_at: new Date().toISOString()
    });
  });

  save(data);
  console.log('DB seeded at', DB_PATH);
  return data;
}

module.exports = { load, save, nextId, seed, hashPassword, verifyPassword, DB_PATH };
