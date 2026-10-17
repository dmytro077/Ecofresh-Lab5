# EcoFresh — Full-Stack Web Application

Інтернет-магазин екологічних продуктів. Лабораторна робота №5 (вайбкодинг).

**Автор:** Михайловський Д.А., група 2-15  
**Університет:** Державний торговельно-економічний університет

## Стек

- **Frontend:** HTML5, CSS3 (Custom Properties, Flexbox/Grid), Vanilla JS (Fetch API, async/await)
- **Backend:** Node.js + Express
- **Database:** JSON file store (pure JS)
- **Auth:** JWT + bcrypt
- **Deploy:** Render / Railway / локально

## Швидкий старт

```bash
# 1. Клонувати
git clone <your-repo-url>
cd ecofresh

# 2. Встановити залежності
npm install

# 3. Ініціалізувати БД (створює таблиці + демо-дані)

# 4. Запустити
npm start
# або з автоперезавантаженням: npm run dev
```

Відкрийте http://localhost:3000

### Демо-акаунти (пароль: `password123`)

| Email | Роль |
|-------|------|
| olena@example.com | customer |
| farmer@zelenysad.ua | supplier |
| admin@ecofresh.ua | admin |

## REST API

| Method | Endpoint | Опис |
|--------|----------|------|
| GET | `/api/products` | Список товарів (фільтри: category, minPrice, maxPrice, certificate, sort, q) |
| GET | `/api/products/:slug` | Один товар |
| GET | `/api/categories` | Категорії |
| POST | `/api/auth/register` | Реєстрація |
| POST | `/api/auth/login` | Вхід |
| GET | `/api/auth/me` | Поточний користувач (Bearer) |
| POST | `/api/orders` | Створити замовлення (Bearer) |
| GET | `/api/orders` | Мої замовлення (Bearer) |
| POST | `/api/reviews` | Додати відгук (Bearer) |
| GET | `/api/reviews` | Список відгуків |

## Архітектура

```
ecofresh/
├── public/           # Клієнтська частина (static)
│   ├── css/styles.css
│   ├── js/main.js
│   ├── index.html, catalog.html, product.html, ...
├── server/
│   ├── index.js      # Express + routes
│   └── db/
│       ├── init.js   # Створення схеми + seed
│       └── ecofresh.db
├── package.json
└── README.md
```

## CRUD

- **Products:** Read (list + detail + filters)
- **Users:** Create (register), Read (me)
- **Orders:** Create, Read (list + detail)
- **Reviews:** Create, Read

## Безпека

- Паролі хешуються bcrypt
- JWT з терміном дії 7 днів
- Валідація вхідних даних на сервері
- Параметризовані SQL-запити (захист від SQL-injection)
- CORS увімкнено
- Секрети — через `.env`

## Розгортання (Render)

1. Створіть Web Service на [render.com](https://render.com)
2. Підключіть GitHub-репозиторій
4. Start: `npm start`
5. Environment: `JWT_SECRET=<random-string>`

Або локально + ngrok / Cloudflare Tunnel.

## Журнал вайбкодингу

Див. звіт до лабораторної роботи (розділ «Журнал взаємодії із ШІ»).

## Ліцензія

MIT
