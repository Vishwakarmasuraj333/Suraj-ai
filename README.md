# SURaj AI – Professional Multimodal AI Assistant

SURaj AI is a full-stack, production-ready multimodal AI workspace built with **Next.js (React + TypeScript + Tailwind CSS + Framer Motion)** and **Python FastAPI + PostgreSQL**.

## Key Features
- **Real AI Streaming Chat (SSE):** Multi-turn conversations via OpenAI (`OPENAI_API_KEY`), Google Gemini (`GEMINI_API_KEY`), or Anthropic Claude (`ANTHROPIC_API_KEY`), plus OpenAI-compatible endpoints (`OPENAI_BASE_URL` for Ollama/OpenRouter/Groq).
- **Rich Multimodal Rendering:** GitHub-flavored Markdown, KaTeX mathematical formulas, syntax-highlighted code blocks with copy, **Mermaid** flowcharts/diagrams, and interactive **Recharts** visualizations (`bar`, `line`, `area`, `pie`).
- **Real File Processing & Analysis:** Upload PDFs (`pypdf`), Images (Pillow + base64 multimodal vision), CSV/TSV/XLSX (`openpyxl` + column stats & instant chart preview), JSON, and source code files.
- **Image Studio:** Real API-backed image generation via OpenAI DALL-E 3 or Google Imagen 3 (`POST /api/v1/images/generate`).
- **Honest Integration Status:** Never simulates or fakes AI responses. If an API key is missing, the UI and API explicitly report `API_KEY_NOT_CONFIGURED` and show which environment variable to set.
- **Full Chat Controls:** New chat, conversation search, pin/rename/delete, Edit & Resend, Regenerate, Retry, Stop streaming (`AbortController`), Copy, Scroll-to-bottom, Dark/Light themes, and Multilingual support (Auto, English, हिन्दी/Hindi, Hinglish).
- **Security & Limits:** JWT authentication (`bcrypt` password hashing), per-user sliding-window RPM rate limiting, daily token quotas, and PostgreSQL persistence (`users`, `user_preferences`, `conversations`, `messages`, `attachments`, `usage_records`).

## Quick Start (Local Development)

### 1. Backend (FastAPI)
```bash
cd backend
cp .env.example .env
# Edit .env to set DATABASE_URL (PostgreSQL or sqlite+aiosqlite:///./suraj_ai.db for quick local test)
# and add your OPENAI_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Next.js)
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Open `http://localhost:3000`.

### 3. Run Backend Tests
```bash
cd backend
pytest -v
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for PostgreSQL + Docker Compose production setup.

