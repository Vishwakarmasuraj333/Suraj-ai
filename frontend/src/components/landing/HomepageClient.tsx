"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  Check,
  Code2,
  Cpu,
  Database,
  Eye,
  FileSearch,
  Image as ImageIcon,
  Layers,
  Lock,
  Mic,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroAiCore } from "@/components/HeroAiCore";
import { AnimatedBackground } from "@/components/background";
import { WorkspacePreview } from "@/components/WorkspacePreview";
import { AnimatedFeatureSlider } from "@/components/landing/AnimatedFeatureSlider";
import { ArchitectureAndPricingSection } from "@/components/landing/ArchitectureAndPricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import type { BlogPost, Capabilities } from "@/types";

const TRUST_STRIP = [
  {
    title: "Multi-Provider AI Engine",
    subtitle: "OpenAI, Gemini & Anthropic adapters",
    icon: Cpu,
  },
  {
    title: "Document Knowledge RAG",
    subtitle: "Grounded section retrieval & citations",
    icon: FileSearch,
  },
  {
    title: "Long-Term AI Memory",
    subtitle: "User-controlled persistent context",
    icon: Brain,
  },
  {
    title: "Enterprise-Grade Security",
    subtitle: "Bcrypt, JWT, rate limits & isolation",
    icon: ShieldCheck,
  },
];

const PERFORMANCE_CARDS = [
  {
    id: "knowledge-rag",
    anchor: "knowledge-rag",
    icon: FileSearch,
    badge: "Implemented",
    badgeStyle: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    title: "Knowledge RAG System",
    description:
      "Transform your documents into searchable knowledge. Upload supported documents, retrieve relevant sections using chunking and lexical scoring, and generate grounded answers with source attribution.",
    points: [
      "PDF, CSV, XLSX, JSON, Markdown & source code uploads",
      "Safe server-side text extraction and MIME validation",
      "Relevant section ranking across conversation attachments",
      "Structured [Source: filename | Section N] citations",
      "Zero external vector vendor lock-in",
    ],
  },
  {
    id: "ai-memory",
    anchor: "ai-memory",
    icon: Brain,
    badge: "Implemented",
    badgeStyle: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    title: "Long-Term AI Memory",
    description:
      "Build more contextual conversations with saved preferences, workflow context, and personalized assistance — cleanly separated from raw chat history.",
    points: [
      "Session Context: short-term turn continuity per thread",
      "Chat History: searchable, pinnable SQL conversation threads",
      "Persistent Memory: user-managed /memories prompt injection",
      "Instant toggle, edit, and delete controls per entry",
      "Strict per-user ownership and isolation",
    ],
  },
  {
    id: "ai-tools",
    anchor: "ai-tools",
    icon: Wrench,
    badge: "Workspace Tools",
    badgeStyle: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/35",
    title: "Automated AI Tools",
    description:
      "Extend AI conversations with built-in workspace capabilities and clearly labeled roadmap integrations.",
    points: [
      "Active: CSV/XLSX/JSON data parsing & Recharts charts",
      "Active: Mermaid diagram & syntax-highlighted code blocks",
      "Active: KaTeX formulas & AI Image Studio modal",
      "Active: Interactive math expression helper in /chat",
      "Planned: External Live Web Search & Weather APIs",
    ],
  },
  {
    id: "vision",
    icon: Eye,
    badge: "Model-Dependent",
    badgeStyle: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/35",
    title: "Multimodal Vision",
    description:
      "Understand visual information with AI-powered image analysis when vision-capable OpenAI, Gemini, or Claude models are configured.",
    points: [
      "Drag-and-drop PNG, JPEG, WEBP & GIF uploads",
      "Screenshot debugging & UI layout inspection",
      "Visual question answering in chat turns",
      "Document photo and chart interpretation",
      "Private authenticated image attachment previews",
    ],
  },
  {
    id: "voice",
    icon: Mic,
    badge: "Planned Audio Backend",
    badgeStyle: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35",
    title: "Voice Interface",
    description:
      "Voice input and audio playback controls are designed on the roadmap and activate only when dedicated audio STT/TTS integrations are configured.",
    points: [
      "Speech-to-text endpoint integration (Planned)",
      "Text-to-speech response playback (Planned)",
      "Accessible microphone permission handling",
      "Does not simulate audio streams without real integration",
      "Written & multilingual Hindi/English/Hinglish active today",
    ],
  },
  {
    id: "security",
    anchor: "security",
    icon: Lock,
    badge: "Verified Controls",
    badgeStyle: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/35",
    title: "Enterprise Security",
    description:
      "Protect user information through secure authentication, authorization, and carefully engineered backend controls without unverified compliance claims.",
    points: [
      "Bcrypt password hashing & 8+ char strength rules",
      "JWT bearer tokens & server-side Admin RBAC checks",
      "Strict user-scoped SQL queries & path sanitization",
      "Redis / fallback sliding-window RPM & token quotas",
      "Redacted server logs protecting provider API keys",
    ],
  },
];

const WORKSPACE_TOOLS = [
  { name: "AI Workspace Chat", desc: "Streaming multi-provider SSE workspace", href: "/chat", icon: Sparkles, status: "Live" },
  { name: "Knowledge RAG QA", desc: "Ground answers in uploaded PDF & code", href: "/chat?tool=rag", icon: FileSearch, status: "Live" },
  { name: "Persistent Memory", desc: "Manage saved instructions & project facts", href: "/chat?tool=memory", icon: Brain, status: "Live" },
  { name: "AI Image Studio", desc: "Generate visuals with DALL-E / Imagen", href: "/chat?tool=image", icon: ImageIcon, status: "Key-Gated" },
  { name: "Code & Syntax Studio", desc: "TypeScript, Python & copy-ready blocks", href: "/chat?tool=code", icon: Code2, status: "Live" },
  { name: "Data & Recharts", desc: "Parse CSV/XLSX into Bar, Line, Area & Pie", href: "/chat?tool=chart", icon: BarChart3, status: "Live" },
  { name: "Mermaid Architecture", desc: "Render flowcharts, sequences & graphs", href: "/chat?tool=mermaid", icon: Layers, status: "Live" },
  { name: "Calculator & Math", desc: "KaTeX expressions & quantitative analysis", href: "/chat", icon: Calculator, status: "Live" },
];

export function HomepageClient({ initialFeaturedPosts = [] }: { initialFeaturedPosts?: BlogPost[] }) {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);

  useEffect(() => {
    api
      .capabilities()
      .then(setCapabilities)
      .catch(() => {});
  }, []);

  return (
    <div className="relative isolate min-h-screen flex flex-col">
      {/* Multi-Layer Futuristic AI Background System */}
      <AnimatedBackground variant="home" fixed />

      <Navbar />

      <main className="relative z-10 flex-1">
        {/* HERO SECTION */}
        <section className="relative isolate overflow-hidden border-b border-slate-200/70 pb-16 pt-10 dark:border-white/10 sm:pb-24 sm:pt-16">
          <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                <span>✦ SURAJ AI • FUTURE OF INTELLIGENCE</span>
              </div>

              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Your Intelligent{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
                  AI
                </span>{" "}
                <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                  Workspace
                </span>{" "}
                for Modern Innovation.
              </h1>

              <div className="mx-auto max-w-2xl space-y-2 text-base leading-relaxed text-slate-600 dark:text-slate-300 lg:mx-0 sm:text-lg">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Powered by AI. Built for You.
                </p>
                <p>
                  One unified intelligent workspace for real-time AI conversations, advanced coding assistance, document intelligence, persistent memory and powerful automated tools.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row lg:justify-start">
                <Link
                  href="/chat"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-cyan-500/25 transition hover:scale-[1.02] hover:brightness-110 sm:w-auto"
                >
                  <span>Start Chatting</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/#architecture"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/75 px-6 py-3.5 text-sm font-semibold text-slate-800 backdrop-blur-md transition hover:border-cyan-400/60 hover:text-cyan-500 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:border-cyan-400/50 sm:w-auto"
                >
                  <span>Explore AI Architecture</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>

            <div className="lg:col-span-5">
              <HeroAiCore />
            </div>
          </div>
        </section>

        {/* TRUST & CAPABILITY STRIP */}
        <section className="border-b border-slate-200/70 bg-slate-100/50 py-6 backdrop-blur-md dark:border-white/10 dark:bg-[#050a1c]/55">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
            {TRUST_STRIP.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-3.5 transition hover:-translate-y-0.5 hover:border-cyan-400/40 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-cyan-400 ring-1 ring-cyan-400/25 transition group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* LIVE WORKSPACE PREVIEW */}
        <WorkspacePreview capabilities={capabilities} />

        {/* INTERACTIVE ANIMATED FEATURE SLIDER */}
        <AnimatedFeatureSlider />

        {/* ENGINEERED FOR REAL AI PERFORMANCE */}
        <section id="features" className="relative isolate overflow-hidden mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <AnimatedBackground variant="features" className="rounded-3xl opacity-55" />
          <div className="relative z-10">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Engineered for Real AI Performance
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                Every feature in SURAJ AI is designed around intelligent workflows, modular AI architecture and secure data processing.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {PERFORMANCE_CARDS.map((card, idx) => {
                const Icon = card.icon;
                const cardBgVariant =
                  card.id === "knowledge-rag"
                    ? "rag"
                    : card.id === "ai-memory"
                      ? "memory"
                      : null;
                return (
                  <motion.div
                    key={card.id}
                    id={card.anchor}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                    className="glass-card relative isolate overflow-hidden flex flex-col justify-between rounded-3xl p-6 transition hover:-translate-y-1 hover:border-cyan-400/40"
                  >
                    {cardBgVariant && (
                      <AnimatedBackground variant={cardBgVariant} className="opacity-35" />
                    )}
                    <div className="relative z-10">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-violet-600/20 text-cyan-400 ring-1 ring-cyan-400/30">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${card.badgeStyle}`}>
                          {card.badge}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
                        {card.description}
                      </p>
                      <ul className="mt-4 space-y-2 border-t border-slate-200/70 pt-4 text-xs text-slate-700 dark:border-white/10 dark:text-slate-300">
                        {card.points.map((pt) => (
                          <li key={pt} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* WORKSPACE AI TOOLS DIRECTORY */}
        <section id="ai-tools" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="glass-card relative isolate overflow-hidden rounded-3xl p-6 sm:p-10">
            <AnimatedBackground variant="tools" className="opacity-65" />
            <div className="relative z-10">
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                    <Database className="h-3.5 w-3.5" /> Interactive Launcher
                  </span>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                    Launch Any Workspace Tool Directly
                  </h2>
                </div>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline"
                >
                  Open Full Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {WORKSPACE_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.name}
                      href={tool.href}
                      className="group rounded-2xl border border-slate-200/80 bg-white/70 p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/50 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="h-5 w-5 text-cyan-400 transition group-hover:scale-110" />
                        <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          {tool.status}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                        {tool.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tool.desc}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS + MULTI-PROVIDER ARCHITECTURE + PRICING */}
        <ArchitectureAndPricingSection capabilities={capabilities} />

        {/* ENGINEERING BLOG HIGHLIGHT (REAL DB POSTS) */}
        {initialFeaturedPosts.length > 0 && (
          <section className="relative isolate overflow-hidden mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <AnimatedBackground variant="blog" className="rounded-3xl opacity-75" />
            <div className="relative z-10">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                  <BookOpen className="h-3.5 w-3.5" /> Engineering Insights
                </span>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                  Latest from SURAJ AI Blog
                </h2>
              </div>
              <Link href="/blog" className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline">
                View All Articles →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {initialFeaturedPosts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="glass-card group flex flex-col justify-between rounded-2xl p-5 transition hover:-translate-y-1 hover:border-cyan-400/40"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-cyan-400">{post.category}</span>
                      <span>{post.reading_time_minutes} min read</span>
                    </div>
                    <h3 className="mt-2.5 text-base font-bold text-slate-900 group-hover:text-cyan-400 dark:text-white">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {post.excerpt}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400">
                    Read article <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
            </div>
          </section>
        )}

        {/* FAQ & NEWSLETTER */}
        <FaqSection />

        {/* FINAL CTA BANNER */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-50/90 via-indigo-50/90 to-violet-50/90 p-8 text-center shadow-2xl backdrop-blur-xl dark:border-cyan-400/30 dark:from-[#07112b]/90 dark:via-[#0c1438]/90 dark:to-[#1a0f3a]/90 sm:p-12">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Build Smarter Workflows Inside SURAJ AI
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              Start a real streaming session, inspect your document Knowledge RAG pipeline, or configure persistent user memory in seconds.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-cyan-500/20 hover:brightness-110"
              >
                Launch SURAJ AI Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-800 hover:border-cyan-400/50 hover:bg-white dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Create Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

