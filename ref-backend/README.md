# Ref Backend MVP

Minimal TypeScript/Express backend for local iteration while building the dating app frontend.

## What is included

- `POST /auth/register`
- `POST /auth/login`
- `GET /profiles/:userId`
- `PUT /profiles/:userId`
- `GET /discovery/:userId`
- `POST /swipes`
- `GET /matches/:userId`
- `GET /chats/:matchId/messages`
- `POST /chats/:matchId/messages`
- `GET /health`

Data is persisted locally in `ref-backend/.data/db.json` so restarts keep state.

## Run

```bash
cd ref-backend
npm install
npm run dev
```

Server URL: `http://localhost:4000`

## Next production step

Replace the local JSON store with PostgreSQL (or Supabase) and add:

- JWT auth middleware
- password hashing
- migrations
- media upload storage
- push notifications
