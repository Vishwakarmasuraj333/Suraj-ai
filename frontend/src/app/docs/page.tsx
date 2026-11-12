import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Documentation & API Reference",
  description:
    "Architecture documentation, REST API endpoints, Knowledge RAG retrieval specification, Persistent AI Memory isolation, and Docker/Alembic deployment guide for SURaj AI.",
};

const API_GROUPS = [
  {
    group: "Authentication & OTP (/api/v1/auth)",
    endpoints: [
      "POST /signup — Register with password strength rules, confirm_password & accept_terms",
      "POST /login — Returns signed JWT bearer token + UserResponse",
      "POST /send-otp — Sends cryptographic 6-digit SMTP OTP (503 if SMTP unconfigured)",
      "POST /verify-otp — Validates hashed OTP with attempt cap & expiry",
      "POST /forgot-password & POST /reset-password — Real SMTP reset workflow",
      "POST /change-password — Authenticated password rotation",
    ],
  },
  {
    group: "AI Chat, RAG & Files (/api/v1/chat, /files, /images)",
    endpoints: [
      "POST /chat/stream — Server-Sent Events streaming via OpenAI, Gemini, or Anthropic",
      "POST /files/upload — Extracts PDF, CSV, XLSX, JSON, TXT & Code cleanly",
      "GET /files & DELETE /files/{id} — User-isolated Knowledge RAG document management",
      "POST /images/generate — Real DALL-E 3 / Imagen 3 image generation",
    ],
  },
  {
    group: "Memory, Tools, Blog, Billing & Admin",
    endpoints: [
      "GET / POST / PATCH / DELETE /memories — Explicit user-managed Persistent AI Memory",
      "GET /tools/status & POST /tools/calculate — Validated tool status & AST math evaluator",
      "GET /blog/posts, /blog/categories & /blog/posts/{slug} — Persistent Markdown blog CMS",
      "POST /newsletter/subscribe & /unsubscribe — Consent-checked newsletter persistence",
      "GET /admin/* — Server-enforced role === 'admin' governance & redacted log buffer",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-14 space-y-8 sm:px-6 lg:px-8">
        <div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
            Technical Reference
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            SURaj AI Architecture & API Documentation
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Accurate specification of implemented backend routes, retrieval pipeline, authentication, and deployment configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {API_GROUPS.map((section) => (
            <section key={section.group} className="glass-card rounded-3xl p-6 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{section.group}</h2>
              <ul className="space-y-1.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                {section.endpoints.map((ep) => (
                  <li key={ep} className="rounded-lg bg-slate-100/80 px-3 py-2 dark:bg-white/[0.04]">
                    {ep}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="glass-card rounded-3xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Honest Implementation Notes
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Current Knowledge RAG (`rag_service.py`) performs document text extraction, fixed-overlap chunking, and lexical relevance ranking with `[Source: filename | Section N]` citations rather than requiring an external vector database. Live LLM streaming, Image Studio, SMTP OTP email delivery, Redis rate limiting, and Stripe/Razorpay checkouts activate strictly when their corresponding environment variables are configured on the FastAPI backend.
          </p>
          <div className="pt-2 flex flex-wrap gap-3 text-xs font-bold">
            <Link href="/chat" className="text-cyan-400 hover:underline">
              Launch Workspace →
            </Link>
            <Link href="/dashboard" className="text-cyan-400 hover:underline">
              User Dashboard →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

