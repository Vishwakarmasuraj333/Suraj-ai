export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "What is SURaj AI?",
    a: "SURaj AI is a full-stack multimodal AI workspace built with Next.js 15 and Python FastAPI. It brings together multi-provider streaming chat, file-based Knowledge RAG, user-controlled persistent AI memory, data chart/diagram rendering, and image studio workflows in one interface.",
  },
  {
    q: "How does the AI workspace work?",
    a: "When you send a prompt inside /chat, the FastAPI backend validates your JWT session and rate limits, merges active persistent memory and relevant excerpts from conversation attachments, routes the request to your selected configured AI provider (OpenAI, Gemini, or Anthropic), and streams tokens back over Server-Sent Events.",
  },
  {
    q: "How does Knowledge RAG work?",
    a: "Supported uploads (PDF, CSV, XLSX, JSON, TXT, Markdown, and source code) have their text extracted safely on the backend. When you ask a question in a conversation with uploaded documents, SURaj AI chunks and scores relevant sections using lexical term matching and attaches grounded excerpts with [Source: filename | Section N] citations.",
  },
  {
    q: "Which AI providers are supported?",
    a: "SURaj AI implements adapters for OpenAI, Google Gemini, and Anthropic Claude. Each engine is active only when its corresponding server-side environment variable (OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY) is configured, and /settings/capabilities exposes live status honestly.",
  },
  {
    q: "Does SURaj AI remember previous conversations?",
    a: "SURaj AI distinguishes three layers: active session context (the current thread's recent turns), saved conversation history in PostgreSQL/SQLite (searchable, pinnable, and editable), and Persistent AI Memory (/memories), where you explicitly save, toggle, or delete preferences and project facts across chats.",
  },
  {
    q: "Is my data private and secure?",
    a: "Passwords are hashed with bcrypt, API routes are authenticated with signed JWTs and user-scoped database queries, uploads are validated with size/MIME checks and sanitized paths, API keys stay strictly server-side, and sliding-window rate limits protect against abuse.",
  },
  {
    q: "Can I upload PDF and other documents?",
    a: "Yes. You can upload PDFs, spreadsheets (CSV/XLSX), JSON files, Markdown, plain text, code files, and images (PNG/JPEG/WEBP/GIF) via file picker or drag-and-drop inside the /chat workspace.",
  },
  {
    q: "Does SURaj AI support image generation?",
    a: "Yes, through the Image Studio modal inside /chat when an image provider (OpenAI DALL-E or Google Imagen via GEMINI_API_KEY / OPENAI_API_KEY) is configured. Generated images are persisted as attachments with download support.",
  },
  {
    q: "Can I use SURaj AI for programming?",
    a: "Yes. Assistant responses support syntax-highlighted multi-language code blocks, copy controls, Markdown tables, LaTeX math via KaTeX, Mermaid architecture diagrams, and uploaded code file analysis.",
  },
  {
    q: "Does SURaj AI support Hindi and other languages?",
    a: "Yes. The chat header provides an Auto, English, Hindi (हिन्दी), and Hinglish response-language selector that guides the system prompt while preserving UTF-8 rendering across all conversations.",
  },
  {
    q: "How do I create an account?",
    a: "Click Sign In in the navigation bar or visit /auth to create an account with password strength checks, password confirmation, and Terms acceptance. Email OTP verification activates automatically when SMTP credentials are configured.",
  },
  {
    q: "How do I upgrade my plan?",
    a: "Visit /pricing or the Pricing section to inspect Developer, Pro Workspace, and Enterprise tiers. Paid upgrades initiate real Stripe or Razorpay checkout sessions once payment gateway credentials are configured on the server.",
  },
];

