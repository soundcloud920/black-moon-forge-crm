# Black Moon Activity Bot Server

Сервер для сбора событий из Discord и Telegram. Токены хранить только в локальном `.env`, не коммитить.

```bash
npm install
copy .env.example .env
npm run dev
```

API:
- `GET /health`
- `GET /events`
- `GET /stream`
- `POST /events`
