# Global Shelf BD - Backend API

Standalone Node.js + Express + TypeScript + Prisma backend server for Global Shelf BD.

## 📁 Project Structure

```
backend/
├── prisma/               # Database schema, SQLite database & seeds
│   ├── schema.prisma
│   ├── seed.ts
│   └── seed-site.ts
├── src/
│   ├── lib/              # Database client, JWT, security, email, helpers
│   ├── middleware/       # JWT Auth & Rate Limiters
│   ├── routes/           # Express API routers (auth, products, orders, cart, etc.)
│   └── server.ts         # Express application entry point
├── .env                  # Environment variables
├── .env.example          # Environment template
├── package.json          # Dependencies & scripts
└── tsconfig.json         # TypeScript configuration
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (already done by default):
```bash
cp .env.example .env
```

### 3. Initialize & Seed Database
```bash
npx prisma db push
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
The server will start on `http://localhost:5000`.

### 5. Build for Production
```bash
npm run build
npm start
```

## 📡 API Endpoints

- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/me`, `/api/auth/forgot-password`, `/api/auth/verify-otp`, `/api/auth/reset-password`, `/api/auth/google`
- **Products**: `/api/products`, `/api/products/:id`, `/api/products/featured`
- **Cart**: `/api/cart/calculate`
- **Orders**: `/api/orders` (place order / my orders), `/api/orders/:id`, `/api/orders/track`
- **Admin**: `/api/admin/orders`, `/api/admin/orders/:id`, `/api/admin/banners` (GET/PUT), `/api/admin/banners/upload` (POST)
- **Wishlist**: `/api/wishlist`
- **Site**: `/api/site`
- **Contact**: `/api/contact`
- **Newsletter**: `/api/newsletter`
