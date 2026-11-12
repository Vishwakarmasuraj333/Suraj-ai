"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, HelpCircle, Loader2, Mail } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { AnimatedBackground } from "@/components/background";
import { FAQ_ITEMS } from "@/data/faq";

export { FAQ_ITEMS };

export function FaqSection({ showHeading = true }: { showHeading?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Newsletter state
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [mode, setMode] = useState<"subscribe" | "unsubscribe">("subscribe");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      if (mode === "subscribe") {
        const res = await api.newsletterSubscribe({ email, consent, website });
        setFeedback({ ok: true, text: res.message });
        setEmail("");
        setConsent(false);
      } else {
        const res = await api.newsletterUnsubscribe({ email });
        setFeedback({ ok: true, text: res.message });
        setEmail("");
      }
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof ApiError ? err.message : "Could not process newsletter request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* FAQ Section */}
      <section id="faq" className="relative isolate overflow-hidden mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <AnimatedBackground variant="faq" className="rounded-3xl opacity-75" />
        <div className="relative z-10">
        {showHeading && (
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
              <HelpCircle className="h-3.5 w-3.5" /> Grounded Answers
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              Everything you need to know about SURAJ AI.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.q}
                className="glass-card overflow-hidden rounded-2xl transition hover:border-cyan-400/35"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-cyan-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-slate-200/70 px-5 py-4 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:text-slate-300">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Still have technical questions?{" "}
          <Link href="/contact" className="font-semibold text-cyan-400 hover:underline">
            Contact our engineering team
          </Link>{" "}
          or explore the{" "}
          <Link href="/faq" className="font-semibold text-cyan-400 hover:underline">
            dedicated FAQ page
          </Link>
          .
        </div>
        </div>
      </section>

      {/* Newsletter & Community */}
      <section id="newsletter" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6 space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                <Mail className="h-3.5 w-3.5" /> Engineering Updates
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Stay Ahead of Artificial Intelligence
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Get useful updates about AI technologies, model releases, engineering tutorials and SURAJ AI product improvements.
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="mb-3 flex gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode("subscribe");
                    setFeedback(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    mode === "subscribe"
                      ? "bg-cyan-500/20 text-cyan-500 ring-1 ring-cyan-400/40"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Subscribe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("unsubscribe");
                    setFeedback(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    mode === "unsubscribe"
                      ? "bg-slate-500/20 text-slate-700 ring-1 ring-slate-400/40 dark:text-slate-200"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Unsubscribe
                </button>
              </div>

              <form onSubmit={handleNewsletter} className="space-y-3">
                {/* Honeypot anti-spam field */}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@company.com"
                    aria-label="Newsletter email address"
                    className="flex-1 rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400 dark:border-white/15 dark:bg-slate-950/70 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === "subscribe" ? "Subscribe" : "Unsubscribe"}
                  </button>
                </div>

                {mode === "subscribe" && (
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>
                      I agree to receive SURAJ AI product updates and engineering articles, and understand I can unsubscribe anytime.
                    </span>
                  </label>
                )}

                {feedback && (
                  <div
                    className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                      feedback.ok
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                    }`}
                  >
                    {feedback.ok && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    <span>{feedback.text}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
