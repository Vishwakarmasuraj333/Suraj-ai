import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Company & Security",
  description: "About SURaj AI engineering principles, architecture security controls, and collaboration opportunities.",
};

export default function CompanyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 space-y-12 sm:px-6">
        <section id="about" className="glass-card rounded-3xl p-6 sm:p-8 space-y-3">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">About SURaj AI</h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            SURaj AI is engineered as a full-stack multi-provider AI SaaS platform focused on real, inspectable capabilities: honest provider routing across OpenAI, Google Gemini, and Anthropic Claude, file-based Knowledge RAG with section citations, explicit user-owned Persistent AI Memory, and clean React + FastAPI architecture.
          </p>
        </section>

        <section id="security" className="glass-card rounded-3xl p-6 sm:p-8 space-y-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Security Engineering</h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Security controls enforced directly in code include bcrypt password hashing, JWT authentication, per-user database query scoping, sanitized file upload storage, security HTTP headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`), redacted structured logs, and Redis/in-memory sliding-window rate limiting.
          </p>
        </section>

        <section id="careers" className="glass-card rounded-3xl p-6 sm:p-8 space-y-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Careers & Contributions</h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Interested in AI systems engineering, Next.js frontend architecture, or security auditing? Reach out via our contact form.
          </p>
          <Link href="/contact" className="inline-block text-xs font-bold text-cyan-400 hover:underline">
            Contact SURaj AI →
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
