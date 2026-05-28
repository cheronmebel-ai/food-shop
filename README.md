# 🍕 Food Shop PWA

## Запуск

```bash
npm install
node server.js
```

Откройте: http://localhost:3000  
Админка: http://localhost:3000/admin (пароль: `admin123`)

## Переменные окружения (для деплоя)

```
PORT=3000
ADMIN_PASS=ВашПароль
JWT_SECRET=случайная_строка_32+символа
VAPID_PUBLIC_KEY=...   ← из vapid-keys.json после первого запуска
VAPID_PRIVATE_KEY=...  ← из vapid-keys.json после первого запуска
```

## Деплой на Render.com

1. Создайте репозиторий на GitHub, загрузите все файлы
2. Render → New Web Service → подключите репозиторий
3. Build command: `npm install`
4. Start command: `node server.js`
5. Добавьте переменные окружения из vapid-keys.json
6. Keepalive: cron-job.org → GET https://ваш-домен/api/vapid-public-key каждые 10 минут

## Структура

```
food-shop/
├── server.js          ← Node.js сервер, все API
├── package.json
├── data/              ← JSON-хранилище (auto-created)
│   ├── products.json
│   ├── orders.json
│   ├── users.json
│   ├── subscribers.json
│   ├── notifications.json
│   └── settings.json
├── uploads/           ← фото товаров, логотип, фавикон
├── public/
│   ├── index.html     ← витрина
│   ├── account.html   ← личный кабинет
│   ├── sw.js          ← Service Worker
│   ├── manifest.json
│   └── icon-*.png
└── admin/
    └── index.html     ← панель администратора
```

## API

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |
| GET | /api/products | Список товаров |
| GET | /api/categories | Категории |
| GET | /api/settings | Настройки магазина |
| GET | /api/delivery-zones | Зоны доставки |
| POST | /api/orders | Создать заказ |
| POST | /api/subscribe | Push-подписка |
| GET | /api/admin/stats | Статистика |
| GET | /api/admin/orders | Все заказы |
| PUT | /api/admin/orders/:id/status | Сменить статус |
| POST | /api/admin/push/send | Рассылка всем |
| POST | /api/admin/settings | Сохранить настройки |
