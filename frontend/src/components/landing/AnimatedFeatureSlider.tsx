"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  ChevronLeft,
  ChevronRight,
  Code2,
  Cpu,
  FileSearch,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";
import { AnimatedBackground } from "@/components/background";

interface FeatureSlide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
  accentGradient: string;
  badgeTone: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SLIDES: FeatureSlide[] = [
  {
    id: "multi-provider",
    tag: "01 • ORCHESTRATION ENGINE",
    title: "Multi-Provider SSE Streaming",
    subtitle: "OpenAI, Google Gemini & Anthropic Claude in one unified workspace",
    description:
      "Switch seamlessly across server-configured frontier models with real Server-Sent Events streaming, automatic latency & token telemetry, and zero client-side key exposure.",
    highlights: [
      "GET /api/v1/settings/capabilities live provider readiness",
      "POST /api/v1/chat/stream token-by-token SSE pipeline",
      "Honest API_KEY_NOT_CONFIGURED handling without fake replies",
    ],
    ctaLabel: "Launch Streaming Chat",
    ctaHref: "/chat",
    accentGradient: "from-cyan-500 via-blue-500 to-violet-600",
    badgeTone: "border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:border-cyan-400/35 dark:text-cyan-300",
    icon: Cpu,
  },
  {
    id: "knowledge-rag",
    tag: "02 • DOCUMENT INTELLIGENCE",
    title: "Grounded Knowledge RAG",
    subtitle: "PDF, CSV, XLSX, JSON, Markdown & source code retrieval",
    description:
      "Upload workspace documents and retrieve top-scoring contextual sections using server-side chunking and lexical ranking — with inline source citations attached directly to responses.",
    highlights: [
      "MIME & file-size verification inside isolated upload storage",
      "Structured [Source: filename | Section N] response citations",
      "Manage & delete indexed files via /dashboard or /chat",
    ],
    ctaLabel: "Explore Document RAG",
    ctaHref: "/chat?tool=rag",
    accentGradient: "from-sky-400 via-cyan-500 to-emerald-500",
    badgeTone: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:border-sky-400/35 dark:text-sky-300",
    icon: FileSearch,
  },
  {
    id: "persistent-memory",
    tag: "03 • COGNITIVE CONTEXT",
    title: "User-Controlled AI Memory",
    subtitle: "Persistent preferences cleanly separated from raw chat threads",
    description:
      "Save coding conventions, project architecture facts, and preferred languages inside /memories with instant enable, edit, and delete controls scoped strictly to your account.",
    highlights: [
      "Explicit CRUD API at /api/v1/memories with user isolation",
      "Toggle individual memories directly in MemoryDrawer",
      "Multilingual continuity across English, Hindi & Hinglish",
    ],
    ctaLabel: "Configure AI Memory",
    ctaHref: "/chat?tool=memory",
    accentGradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    badgeTone: "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:border-violet-400/35 dark:text-violet-300",
    icon: Brain,
  },
  {
    id: "visual-studio",
    tag: "04 • CODE & VISUALIZATION",
    title: "Code, Recharts & Mermaid Studio",
    subtitle: "Rich syntax highlighting, interactive data charts & flowcharts",
    description:
      "Render production code blocks with one-click copy, parse spreadsheet uploads into interactive Bar/Line/Area/Pie charts, compile KaTeX math, and visualize Mermaid architectures.",
    highlights: [
      "Lazy-loaded Recharts, Prism syntax highlighting & Mermaid",
      "Safe server-side AST math calculator via /api/v1/tools/calculate",
      "Key-gated AI Image Studio when image providers are configured",
    ],
    ctaLabel: "Open Visual Studio",
    ctaHref: "/chat?tool=chart",
    accentGradient: "from-blue-500 via-indigo-500 to-fuchsia-500",
    badgeTone: "border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:border-indigo-400/35 dark:text-indigo-300",
    icon: Code2,
  },
  {
    id: "enterprise-security",
    tag: "05 • HARDENED INFRASTRUCTURE",
    title: "Production Security & Quotas",
    subtitle: "Redis sliding-window RPM, daily token caps & redacted telemetry",
    description:
      "Built for real multi-user SaaS operation with bcrypt password hashing, JWT authentication, strict SQL ownership filters, security response headers, and API-key log redaction.",
    highlights: [
      "Lua-backed Redis RPM & UTC daily token quota enforcement",
      "X-Request-ID correlation, CSP-safe Markdown & HSTS ready",
      "Alembic PostgreSQL & SQLite migrations preserving user data",
    ],
    ctaLabel: "Inspect Architecture",
    ctaHref: "/#architecture",
    accentGradient: "from-fuchsia-500 via-violet-500 to-cyan-500",
    badgeTone: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-700 dark:border-fuchsia-400/35 dark:text-fuchsia-300",
    icon: ShieldCheck,
  },
];

export function AnimatedFeatureSlider() {
  const prefersReduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (prefersReduced || isPaused) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [prefersReduced, isPaused]);

  const goTo = (index: number) => {
    const normalized = (index + SLIDES.length) % SLIDES.length;
    setDirection(normalized >= activeIndex ? 1 : -1);
    setActiveIndex(normalized);
  };

  const current = SLIDES[activeIndex];
  const Icon = current.icon;

  return (
    <section
      aria-label="SURAJ AI Platform Showcase Slider"
      className="relative isolate overflow-hidden mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
    >
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="glass-card relative isolate overflow-hidden rounded-3xl border border-cyan-400/25 p-5 shadow-2xl sm:p-8 lg:p-10"
      >
        <AnimatedBackground variant="architecture" className="opacity-55" />

        <div className="relative z-10">
          {/* Slider Top Header */}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                SURAJ AI PLATFORM SHOWCASE
              </span>
              <h2 className="mt-2.5 text-2xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Interactive Intelligence Slider
              </h2>
            </div>

            {/* Playback & Navigation Controls */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                aria-label={isPaused ? "Resume slider autoplay" : "Pause slider autoplay"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 transition hover:border-cyan-400/50 hover:text-cyan-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                aria-label="Previous slide"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 transition hover:border-cyan-400/50 hover:text-cyan-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                aria-label="Next slide"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 transition hover:border-cyan-400/50 hover:text-cyan-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Slide Navigation Pills */}
          <div className="mb-6 flex flex-wrap gap-2">
            {SLIDES.map((slide, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(idx)}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-violet-500/20 text-slate-900 shadow-sm dark:text-white"
                      : "border-slate-200/80 bg-white/60 text-slate-600 hover:border-cyan-400/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                  }`}
                >
                  {slide.title}
                </button>
              );
            })}
          </div>

          {/* Animated Slide Viewport */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-5 dark:border-white/10 dark:bg-[#04091a]/80 sm:p-8">
            <motion.div
              key={current.id}
              initial={
                prefersReduced
                  ? { opacity: 0 }
                  : { opacity: 0, x: direction > 0 ? 26 : -26 }
              }
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12"
            >
                <div className="lg:col-span-7 space-y-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${current.badgeTone}`}
                  >
                    {current.tag}
                  </span>

                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
                    {current.title}
                  </h3>
                  <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-300">
                    {current.subtitle}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {current.description}
                  </p>

                  <div className="pt-1">
                    <Link
                      href={current.ctaHref}
                      className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${current.accentGradient} px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:brightness-110`}
                    >
                      <span>{current.ctaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Right Telemetry & Highlights Visual Panel */}
                <div className="lg:col-span-5">
                  <div className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/95 p-5 text-white shadow-xl">
                    <div
                      className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br ${current.accentGradient} opacity-25 blur-2xl`}
                    />
                    <div className="relative flex items-center justify-between border-b border-white/10 pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${current.accentGradient} text-white shadow-md`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                            SURAJ AI MODULE
                          </p>
                          <p className="text-xs font-bold text-white">
                            Slide {activeIndex + 1} / {SLIDES.length}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                        Verified
                      </span>
                    </div>

                    <ul className="relative mt-4 space-y-2.5 text-xs text-slate-200">
                      {current.highlights.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
            </motion.div>
          </div>

          {/* Bottom Progress Dots */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(idx)}
                aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === activeIndex
                    ? "w-8 bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500"
                    : "w-2 bg-slate-300 hover:bg-cyan-400/60 dark:bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

