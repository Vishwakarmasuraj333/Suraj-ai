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
| `FRONTEND_BASE_URL` | Canonical frontend URL for billing callbacks & links | `https://app.yourdomain.com` |
| `OPENAI_API_KEY` | OpenAI API key (Chat, Vision, DALL-E 3) | `sk-...` |
| `GEMINI_API_KEY` | Google Gemini API key (Chat, Vision, Imagen 3) | `AIza...` |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude Chat & Vision) | `sk-ant-...` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` | Optional SMTP credentials for real OTP emails | `smtp.resend.com` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional Stripe checkout & signed webhook keys | `sk_live_...` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Optional Razorpay gateway keys | `rzp_live_...` |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | Per-user RPM limit | `30` |
| `RATE_LIMIT_DAILY_TOKENS` | Daily per-user token quota | `250000` |

> **Security:** Never expose API keys or SMTP/Stripe secrets in `frontend/.env*` or `NEXT_PUBLIC_*` variables. All provider calls happen exclusively inside the FastAPI backend.

## 2. Database Setup & Migrations (Alembic)
Run async Alembic migrations against PostgreSQL (or SQLite in development):
```bash
cd backend
alembic upgrade head
```
Tables managed by Alembic (`backend/alembic/versions/`):
- `0001_initial_schema`: `users`, `user_preferences`, `conversations`, `messages`, `attachments`, `usage_records`
- `0002_saas_platform_tables`: `email_otp_tokens`, `user_memories`, `blog_posts`, `subscriptions`, `billing_history`, `contact_submissions`
- `0003_newsletter_subscribers`: `newsletter_subscribers`

## 3. Docker Compose Production Stack
```bash
cp backend/.env.example backend/.env
# Set APP_ENV=production, DEBUG=false, strong SECRET_KEY, REDIS_URL, and provider keys
docker compose up --build -d
```
Note: `frontend/Dockerfile` sets `NEXT_STANDALONE=true` so Docker uses Next.js standalone mode while local `npm run start` works out-of-the-box without standalone conflicts.

Services exposed:
- Frontend: `http://localhost:3000`
- Backend API & OpenAPI docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## 4. Production Checklist
1. Terminate TLS (HTTPS) via Nginx, Caddy, or a cloud load balancer in front of ports `3000` and `8000`.
2. Mount persistent storage for `uploads/`.
3. Set `APP_ENV=production`, `DEBUG=false`, `RATE_LIMIT_DEV_FALLBACK=false`, and a strong non-default `SECRET_KEY` (enforced by startup validation).
4. Promote your primary admin account in PostgreSQL (`UPDATE users SET role = 'admin' WHERE email = '...';`) to unlock `/admin`.
5. Monitor `GET /api/v1/health` (tracks live DB connectivity, Redis status, request count, and error metrics).
