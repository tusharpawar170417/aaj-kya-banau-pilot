# Aaj Kya Banau API

Production-ready backend foundation for the Aaj Kya Banau app.

## Stack
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT authentication
- Recipe, user, rating, follow, save, and report models

## Local dev

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

The API listens on the port in `.env` (default `4000`).
