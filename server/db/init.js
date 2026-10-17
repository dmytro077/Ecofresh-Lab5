const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = path.join(__dirname, 'ecofresh.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'supplier', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    details TEXT,
    image TEXT,
    gallery TEXT,
    farmer TEXT,
    certificate TEXT,
    stock INTEGER DEFAULT 100,
    popular INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    total REAL NOT NULL,
    delivery_address TEXT,
    delivery_method TEXT,
    payment_method TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER,
    order_id INTEGER,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

const products = [
  {
    slug: 'tomatoes',
    name: 'Помідори червоні',
    category: 'Овочі',
    price: 45.00,
    description: 'Свіжі органічні помідори з ферми «Зелений Сад». Вирощені без пестицидів.',
    details: 'Вага: 1 кг | Сертифікат: Органік Стандарт | Регіон: Київська обл.',
    image: 'https://images.unsplash.com/photo-1546470427-e212b9d26045?w=400',
    gallery: JSON.stringify([
      'https://images.unsplash.com/photo-1546470427-e212b9d26045?w=400',
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'
    ]),
    farmer: 'Зелений Сад',
    certificate: 'Органік',
    stock: 50,
    popular: 10
  },
  {
    slug: 'carrots',
    name: 'Морква молода',
    category: 'Овочі',
    price: 28.00,
    description: 'Солодка молода морква, багата на каротин. Ідеальна для салатів і соків.',
    details: 'Вага: 1 кг | Сертифікат: Еко | Регіон: Вінницька обл.',
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400',
    gallery: JSON.stringify([
      'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400',
      'https://images.unsplash.com/photo-1447175008436-170170753d52?w=400'
    ]),
    farmer: 'Сонячна Грядка',
    certificate: 'Еко',
    stock: 80,
    popular: 8
  },
  {
    slug: 'cucumbers',
    name: 'Огірки свіжі',
    category: 'Овочі',
    price: 35.00,
    description: 'Хрусткі огірки з відкритого ґрунту. Без ГМО та хімічних добрив.',
    details: 'Вага: 1 кг | Сертифікат: Органік | Регіон: Черкаська обл.',
    image: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400',
    gallery: JSON.stringify([
      'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400'
    ]),
    farmer: 'Зелений Сад',
    certificate: 'Органік',
    stock: 60,
    popular: 7
  },
  {
    slug: 'apples',
    name: 'Яблука Голден',
    category: 'Фрукти',
    price: 42.00,
    description: 'Соковиті яблука сорту Голден. Зібрані вручну на екологічній фермі.',
    details: 'Вага: 1 кг | Сертифікат: Органік Стандарт | Регіон: Закарпаття',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
    gallery: JSON.stringify([
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
      'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=400'
    ]),
    farmer: 'Фруктовий Рай',
    certificate: 'Органік',
    stock: 100,
    popular: 12
  },
  {
    slug: 'strawberries',
    name: 'Полуниця садова',
    category: 'Ягоди',
    price: 89.00,
    description: 'Ароматна полуниця з власної плантації. Сезонна ягода без хімії.',
    details: 'Вага: 0.5 кг | Сертифікат: Еко | Регіон: Київська обл.',
    image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400',
    gallery: JSON.stringify([
      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400'
    ]),
    farmer: 'Ягідний Двір',
    certificate: 'Еко',
    stock: 30,
    popular: 15
  },
  {
    slug: 'potatoes',
    name: 'Картопля молода',
    category: 'Овочі',
    price: 22.00,
    description: 'Молода картопля з піщаних ґрунтів. Ідеальна для варіння та смаження.',
    details: 'Вага: 2 кг | Сертифікат: Еко | Регіон: Житомирська обл.',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400',
    gallery: JSON.stringify([
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400'
    ]),
    farmer: 'Сонячна Грядка',
    certificate: 'Еко',
    stock: 120,
    popular: 9
  },
  {
    slug: 'milk',
    name: 'Молоко фермерське',
    category: 'Молочні',
    price: 38.00,
    description: 'Свіже непастеризоване молоко від корів на вільному випасі.',
    details: 'Об\'єм: 1 л | Сертифікат: Органік | Регіон: Полтавська обл.',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
    gallery: JSON.stringify([
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'
    ]),
    farmer: 'Молочна Ферма',
    certificate: 'Органік',
    stock: 40,
    popular: 11
  },
  {
    slug: 'eggs',
    name: 'Яйця курячі домашні',
    category: 'Молочні',
    price: 55.00,
    description: 'Яйця від курей вільного вигулу. Багаті на омега-3.',
    details: 'Кількість: 10 шт | Сертифікат: Еко | Регіон: Чернігівська обл.',
    image: 'https://images.unsplash.com/photo-1582722878705-4f8c2b0e0b0a?w=400',
    gallery: JSON.stringify([
      'https://images.unsplash.com/photo-1582722878705-4f8c2b0e0b0a?w=400'
    ]),
    farmer: 'Пташиний Двір',
    certificate: 'Еко',
    stock: 70,
    popular: 6
  },
  {
    slug: 'honey',
    name: 'Мед акацієвий',
    category: 'Бакалія',
    price: 180.00,
    description: 'Натуральний мед з акації. Зібраний у екологічно чистій зоні.',
    details: 'Вага: 0.5 кг | Сертифікат: Органік Стандарт | Регіон: Карпати',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
    gallery: JSON.stringify([
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400'
    ]),
    farmer: 'Пасіка Карпат',
    certificate: 'Органік',
    stock: 25,
    popular: 14
  }
];

const insertProduct = db.prepare(`
  INSERT INTO products (slug, name, category, price, description, details, image, gallery, farmer, certificate, stock, popular)
  VALUES (@slug, @name, @category, @price, @description, @details, @image, @gallery, @farmer, @certificate, @stock, @popular)
`);

for (const p of products) {
  insertProduct.run(p);
}

// Demo users (password: password123)
const hash = bcrypt.hashSync('password123', 10);
db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`).run('Адмін EcoFresh', 'admin@ecofresh.ua', hash, 'admin');
db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`).run('Іван Фермер', 'farmer@zelenysad.ua', hash, 'supplier');
db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`).run('Олена Покупець', 'olena@example.com', hash, 'customer');

console.log('Database initialized successfully at', dbPath);
console.log('Demo users (password: password123):');
console.log('  admin@ecofresh.ua (admin)');
console.log('  farmer@zelenysad.ua (supplier)');
console.log('  olena@example.com (customer)');
db.close();
