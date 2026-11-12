"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { api, ApiError } from "@/lib/api";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);
    try {
      await api.submitContact({ name, email, subject, message, website });
      setStatus({
        ok: true,
        text: "Your inquiry has been stored cleanly in our backend database and will appear in the Admin inbox.",
      });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setStatus({
        ok: false,
        text: err instanceof ApiError ? err.message : "Failed to submit message.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
            <Mail className="h-3.5 w-3.5" /> Engineering & Enterprise Inquiries
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            Contact SURaj AI
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Discuss custom multi-provider deployments, VPC architecture, or workspace support.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-6 space-y-4 sm:p-8">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold">Your Name</label>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Subject</label>
            <input
              type="text"
              required
              minLength={3}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enterprise architecture & provider setup"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Message</label>
            <textarea
              required
              minLength={10}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your requirements, self-hosted database setup, or inquiry details..."
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
            />
          </div>

          {status && (
            <div
              className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs ${
                status.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-400"
              }`}
            >
              {status.ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{status.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-3 text-sm font-bold text-white"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Message
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
