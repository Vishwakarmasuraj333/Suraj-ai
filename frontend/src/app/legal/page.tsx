import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Legal Policies",
  description: "SURaj AI Privacy Policy, Terms of Service, and Cookie Policy.",
};

export default function LegalPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 space-y-10 sm:px-6">
        <section id="privacy" className="glass-card rounded-3xl p-6 sm:p-8 space-y-3">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Privacy Policy</h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Account credentials, conversations, uploaded attachments, and persistent memory entries are stored per user account inside the configured database and upload directory. Server logs automatically redact common API token patterns and never log user passwords or OTP verification codes in plaintext.
          </p>
        </section>

        <section id="terms" className="glass-card rounded-3xl p-6 sm:p-8 space-y-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Terms of Service</h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            SURaj AI provides programmatic routing to third-party AI model APIs when configured with valid credentials. Usage is subject to configured rate limits and daily token quotas.
          </p>
        </section>

        <section id="cookies" className="glass-card rounded-3xl p-6 sm:p-8 space-y-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cookie & Local Storage Policy</h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            SURaj AI uses browser localStorage exclusively for essential session persistence (`suraj_ai_token`) and theme preferences (`suraj_ai_theme`) without third-party advertising trackers.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

