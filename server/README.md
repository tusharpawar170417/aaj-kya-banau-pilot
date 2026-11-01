# Aaj Kya Banau API

Firebase-ready backend foundation for the Aaj Kya Banau app.

## Stack
- Node.js + Express + TypeScript
- Firebase Admin SDK + Firestore
- JWT authentication
- Recipe, user, rating, follow, save, and report models

## Local dev

```bash
npm install
cp .env.example .env
npm run dev
```

If Firebase credentials are not configured yet, the server automatically falls back to a local in-memory store so the app can still boot and develop locally.

For production, set:
- `FIREBASE_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS`

The API listens on the port in `.env` (default `4000`).
