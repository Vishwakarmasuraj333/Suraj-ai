# SURaj AI — Deployment Guide

## 1. Environment Variables (`backend/.env`)
Create `backend/.env` from `backend/.env.example`:

| Variable | Description | Example |
|---|---|---|
| `APP_ENV` | Runtime environment (`development` or `production`) | `production` |
| `DEBUG` | Must be `false` in production | `false` |
| `SECRET_KEY` | Strong random JWT signing secret (>=32 chars, non-default required in prod) | `openssl rand -hex 32` |
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://suraj:suraj_password@postgres:5432/suraj_ai` |
| `REDIS_URL` | Redis URL for distributed rate limiting | `redis://redis:6379/0` |
| `RATE_LIMIT_DEV_FALLBACK` | Allow in-memory limiter if Redis is unavailable (default `false` in production) | `false` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `https://app.yourdomain.com` |
| `OPENAI_API_KEY` | OpenAI API key (Chat, Vision, DALL-E 3) | `sk-...` |
| `GEMINI_API_KEY` | Google Gemini API key (Chat, Vision, Imagen 3) | `AIza...` |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude Chat & Vision) | `sk-ant-...` |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | Per-user RPM limit | `30` |
| `RATE_LIMIT_DAILY_TOKENS` | Daily per-user token quota | `250000` |

> **Security:** Never expose LLM API keys in `frontend/.env*` or `NEXT_PUBLIC_*` variables. All provider calls happen exclusively inside the FastAPI backend.

## 2. Database Setup & Migrations (Alembic)
Run async Alembic migrations against PostgreSQL (or SQLite in development):
```bash
cd backend
alembic upgrade head
```
Tables managed by Alembic (`backend/alembic/versions/`):
- `users`
- `user_preferences`
- `conversations`
- `messages`
- `attachments`
- `usage_records`

## 3. Docker Compose Production Stack
```bash
cp backend/.env.example backend/.env
# Set APP_ENV=production, DEBUG=false, a strong SECRET_KEY, REDIS_URL, and LLM API keys
docker compose up --build -d
```
Services exposed:
- Frontend: `http://localhost:3000`
- Backend API & OpenAPI docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## 4. Production Checklist
1. Terminate TLS (HTTPS) via Nginx, Caddy, or a cloud load balancer in front of ports `3000` and `8000`.
2. Mount persistent storage for `uploads/` (or adapt `file_processing_service.py` to S3/GCS).
3. Set `APP_ENV=production`, `DEBUG=false`, `RATE_LIMIT_DEV_FALLBACK=false`, and a strong non-default `SECRET_KEY` (enforced by startup validation).
4. Configure automated PostgreSQL backups (`pg_dump`) and monitor `GET /api/v1/health` (tracks DB, Redis, latency, and error metrics).
