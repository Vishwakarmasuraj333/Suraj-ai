"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { SurajLogo } from "@/components/SurajLogo";
import { API_BASE } from "@/lib/api";

interface HealthState {
  status: string;
  database: string;
  redis?: string;
}

export function Footer() {
  const [health, setHealth] = useState<HealthState | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/health`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setHealth(data);
      })
      .catch(() => {
        if (active) setHealth({ status: "unreachable", database: "unknown" });
      });
    return () => {
      active = false;
    };
  }, []);

  const healthLabel = !health
    ? "Checking live backend health..."
    : health.status === "ok"
      ? `API healthy • DB ${health.database}${health.redis ? ` • Cache ${health.redis}` : ""}`
      : `Backend status: ${health.status}`;

  const isHealthy = health?.status === "ok";

  return (
    <footer className="border-t border-slate-200/80 bg-slate-50/90 text-slate-600 dark:border-white/10 dark:bg-[#030610] dark:text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <SurajLogo size={38} showSub />
            <p className="max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Your intelligent workspace for modern innovation. Built around real multi-provider AI orchestration, grounded Knowledge RAG, persistent user memory, and verifiable backend security.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-white/5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isHealthy
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : health
                      ? "bg-amber-400"
                      : "bg-slate-400"
                }`}
              />
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-slate-700 dark:text-slate-200">{healthLabel}</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/chat" className="hover:text-cyan-500 transition-colors">
                  AI Workspace
                </Link>
              </li>
              <li>
                <Link href="/chat?tool=image" className="hover:text-cyan-500 transition-colors">
                  AI Image Studio
                </Link>
              </li>
              <li>
                <Link href="/#knowledge-rag" className="hover:text-cyan-500 transition-colors">
                  Knowledge Base
                </Link>
              </li>
              <li>
                <Link href="/#ai-memory" className="hover:text-cyan-500 transition-colors">
                  Persistent Memory
                </Link>
              </li>
              <li>
                <Link href="/#ai-tools" className="hover:text-cyan-500 transition-colors">
                  AI Tools
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Resources
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/blog" className="hover:text-cyan-500 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/#architecture" className="hover:text-cyan-500 transition-colors">
                  Documentation & API
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-cyan-500 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-cyan-500 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/blog?category=SURaj%20AI%20Product%20Updates" className="hover:text-cyan-500 transition-colors">
                  Product Updates
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/company#about" className="hover:text-cyan-500 transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-cyan-500 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/company#careers" className="hover:text-cyan-500 transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/company#security" className="hover:text-cyan-500 transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Legal
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/legal#privacy" className="hover:text-cyan-500 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal#terms" className="hover:text-cyan-500 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal#cookies" className="hover:text-cyan-500 transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-200/80 pt-8 text-xs dark:border-white/10 sm:flex-row sm:items-center">
          <p>© 2026 SURaj AI. All rights reserved.</p>
          <p className="text-slate-500 dark:text-slate-500">
            Modular Multi-Provider AI Architecture • Zero Fabricated AI Outputs
          </p>
        </div>
      </div>
    </footer>
  );
}
