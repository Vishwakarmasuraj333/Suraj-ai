# SURaj AI – Future of Intelligence (AI SaaS Platform)

SURaj AI is a full-stack, production-ready AI SaaS platform built with **Next.js 15 (React 19 + TypeScript + Tailwind CSS + Framer Motion)** and **Python FastAPI + async SQLAlchemy + PostgreSQL/SQLite**.

## Key Features
- **SaaS Homepage & Multi-Page Experience (`/`):** Sticky glassmorphic navbar, futuristic **SURaj AI Core** animation, live **Workspace Preview**, 6 modular capability cards, 5-step execution pipeline, interactive AI architecture inspector backed by `/settings/capabilities`, pricing tiers, FAQ accordions, and DB-backed newsletter subscriptions.
- **Full Multimodal Workspace (`/chat`):** Real-time Server-Sent Events streaming chat via OpenAI (`OPENAI_API_KEY`), Google Gemini (`GEMINI_API_KEY`), or Anthropic Claude (`ANTHROPIC_API_KEY`), plus OpenAI-compatible endpoints (`OPENAI_BASE_URL`).
- **Document Knowledge RAG:** Upload PDF (`pypdf`), CSV/XLSX (`openpyxl`), JSON, Markdown, TXT, and source code files; manage or delete user-isolated documents (`GET /api/v1/files`, `DELETE /api/v1/files/{id}`); chunks and lexically ranks relevant excerpts with inline `[Source: filename | Section N]` citations.
- **Persistent AI Memory (`/memories`) & Tools (`/tools`):** User-managed memory drawer inside `/chat` and `/dashboard`, plus a validated AST Math Calculator (`POST /api/v1/tools/calculate`) and live tool status endpoint (`GET /api/v1/tools/status`).
- **Rich Rendering & Image Studio:** GitHub-flavored Markdown, KaTeX mathematical formulas, syntax-highlighted code blocks, **Mermaid** diagrams, **Recharts** visualizations (`bar`, `line`, `area`, `pie`), and DALL-E / Imagen image generation (`POST /api/v1/images/generate`).
- **Real Email OTP, Blog CMS, Pricing, Dashboard & Admin RBAC (`/auth`, `/dashboard`, `/docs`, `/blog`, `/pricing`, `/contact`, `/admin`):** Real SMTP OTP verification & password reset (returns `503 EMAIL_PROVIDER_NOT_CONFIGURED` when SMTP is unset), seeded technical blog with 14 categories, transparent Stripe/Razorpay integration status, contact inquiry persistence, newsletter subscribe/unsubscribe, API docs, and server-verified `admin` RBAC console with redacted log viewer.
- **Honest Integration Guarantees:** Never fabricates AI answers, OTP codes, payment confirmations, testimonials, or uptime metrics.

## Quick Start (Local Development)

### 1. Backend (FastAPI + Alembic)
```bash
cd backend
cp .env.example .env
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Next.js 15)
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Open `http://localhost:3000` (SaaS Homepage) or `http://localhost:3000/chat` (Workspace).

### 3. Tests
```bash
# Backend
cd backend && pytest -v

# Frontend unit/component + lint + typecheck
cd frontend && npm test -- --run && npx tsc --noEmit && npm run lint && npm run build
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for PostgreSQL, Redis, SMTP, Stripe/Razorpay, and Docker Compose production configuration.
