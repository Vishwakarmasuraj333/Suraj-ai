"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Check,
  Cpu,
  Database,
  FileSearch,
  Layers,
  MessageSquare,
  Server,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import { AnimatedBackground } from "@/components/background";
import type { Capabilities } from "@/types";

const WORKFLOW_STEPS = [
  {
    step: "STEP 01",
    title: "Ask Anything",
    desc: "Submit natural language, code, or multimodal files in English, Hindi, or Hinglish.",
    icon: MessageSquare,
  },
  {
    step: "STEP 02",
    title: "AI Understands Context",
    desc: "FastAPI authenticates the session and loads recent conversation turns and preferences.",
    icon: Brain,
  },
  {
    step: "STEP 03",
    title: "Retrieve Relevant Knowledge",
    desc: "Uploaded PDFs, spreadsheets, and code files are chunked and ranked with section attribution.",
    icon: FileSearch,
  },
  {
    step: "STEP 04",
    title: "Generate Intelligent Results",
    desc: "Your selected configured provider streams grounded Markdown, code, KaTeX, or charts via SSE.",
    icon: Sparkles,
  },
  {
    step: "STEP 05",
    title: "Save Useful Context When Enabled",
    desc: "Persist explicit preferences or project notes inside your isolated Persistent AI Memory store.",
    icon: Database,
  },
];

const ARCH_STAGES = [
  {
    id: "gateway",
    label: "1. FastAPI Security Gateway",
    endpoint: "POST /api/v1/auth/login • X-Request-ID • Rate Limiter",
    summary:
      "Every workspace request enters through JWT authentication, security response headers, and Redis/in-memory sliding-window RPM and daily token quotas before reaching any AI engine.",
  },
  {
    id: "rag",
    label: "2. Knowledge RAG & File Pipeline",
    endpoint: "POST /api/v1/files/upload • rag_service.retrieve_relevant_chunks()",
    summary:
      "Documents (PDF, CSV, XLSX, JSON, TXT, Code) undergo MIME + size validation and text extraction. Matching sections are ranked lexically and appended with [Source: filename | Section N] citations.",
  },
  {
    id: "memory",
    label: "3. Persistent Memory Injection",
    endpoint: "GET / POST / PATCH / DELETE /api/v1/memories",
    summary:
      "Active UserMemory records enabled by the account holder are merged with system instructions independently of raw chat history, remaining editable and deletable at any time.",
  },
  {
    id: "providers",
    label: "4. Multi-Provider SSE Router",
    endpoint: "POST /api/v1/chat/stream • GET /api/v1/settings/capabilities",
    summary:
      "Adapters for OpenAI, Google Gemini, and Anthropic Claude stay strictly server-side. If a provider key is missing, the router returns an honest API_KEY_NOT_CONFIGURED message instead of faking completions.",
  },
];

interface PricingCard {
  id: "free" | "pro" | "enterprise";
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  badge?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

const HOMEPAGE_PLANS: PricingCard[] = [
  {
    id: "free",
    name: "Developer",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    description: "Perfect for exploring SURAJ AI capabilities.",
    features: [
      "Access to configured AI providers",
      "Monthly usage allowance",
      "Basic workspace & streaming chat",
      "Supported document processing",
      "Persistent AI Memory controls",
      "Community support",
    ],
    ctaLabel: "Get Started",
    ctaHref: "/auth",
  },
  {
    id: "pro",
    name: "Pro Workspace",
    monthlyPrice: "$29",
    yearlyPrice: "$24",
    badge: "MOST POPULAR",
    description: "Proposed advanced tier for developers and professionals.",
    features: [
      "Higher AI usage limits",
      "Advanced document workflows",
      "Expanded knowledge management",
      "AI tools where available",
      "Multimodal vision & Image Studio where configured",
      "Priority email support when enabled",
    ],
    ctaLabel: "Start Pro Trial",
    ctaHref: "/pricing",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: "Custom",
    yearlyPrice: "Custom",
    description: "Flexible AI infrastructure for growing organizations.",
    features: [
      "Custom AI provider integrations",
      "Role-based workspace governance",
      "Custom usage quotas & rate limits",
      "PostgreSQL & Redis self-hosted architecture",
      "Dedicated engineering onboarding",
      "Custom deployment options",
    ],
    ctaLabel: "Contact Sales",
    ctaHref: "/contact",
  },
];

export function ArchitectureAndPricingSection({
  capabilities,
}: {
  capabilities: Capabilities | null;
}) {
  const [selectedStage, setSelectedStage] = useState(ARCH_STAGES[0].id);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const activeStage = ARCH_STAGES.find((s) => s.id === selectedStage) || ARCH_STAGES[0];
  const providers = capabilities?.llm_providers ?? [];
  const configuredCount = providers.filter((p) => p.configured).length;
  const billingConfigured = Boolean(
    capabilities?.stripe_configured || capabilities?.razorpay_configured
  );

  return (
    <>
      {/* How SURaj AI Works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-300">
            <Workflow className="h-3.5 w-3.5" /> End-to-End Execution Pipeline
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            From Question to Intelligence
          </h2>
          <p className="mx-auto mt-2.5 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Every turn follows an inspectable five-stage pipeline grounded in real backend services.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {WORKFLOW_STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                className="glass-card group relative flex flex-col justify-between rounded-2xl p-5 transition hover:-translate-y-1 hover:border-cyan-400/40"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold tracking-wider text-cyan-500">
                      {item.step}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-cyan-400 ring-1 ring-cyan-400/25">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Multi-Provider AI Architecture */}
      <section id="architecture" className="relative isolate overflow-hidden mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <AnimatedBackground variant="architecture" className="rounded-3xl opacity-65" />
        <div className="relative z-10">
          <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
            <Cpu className="h-3.5 w-3.5" /> Live Backend Telemetry
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            One Workspace. Multiple AI Engines.
          </h2>
          <p className="mx-auto mt-2.5 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Server-side adapters route requests across OpenAI, Google Gemini, and Anthropic Claude based on your live environment configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Interactive Architecture Flow */}
          <div className="glass-card rounded-3xl p-6 lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Layers className="h-4 w-4 text-cyan-400" />
                Interactive Architecture Inspector
              </span>
              <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:text-slate-300">
                {capabilities
                  ? `DB: ${capabilities.database_type} • ${configuredCount}/${providers.length} LLMs Ready`
                  : "Loading live backend capabilities..."}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ARCH_STAGES.map((stage) => {
                const active = stage.id === selectedStage;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setSelectedStage(stage.id)}
                    className={`rounded-2xl border p-3.5 text-left transition ${
                      active
                        ? "border-cyan-400/60 bg-cyan-500/10 shadow-md shadow-cyan-500/10"
                        : "border-slate-200/80 bg-white/50 hover:border-cyan-400/30 dark:border-white/10 dark:bg-white/[0.02]"
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{stage.label}</p>
                    <p className="mt-1 truncate font-mono text-[10px] text-cyan-500">{stage.endpoint}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-[#050918]">
              <p className="font-mono text-[11px] font-semibold text-cyan-500">{activeStage.endpoint}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {activeStage.summary}
              </p>
              {capabilities && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="rounded-md bg-slate-200/70 px-2 py-0.5 dark:bg-white/5">
                    Rate Limit: {capabilities.rate_limit_rpm} req/min
                  </span>
                  <span className="rounded-md bg-slate-200/70 px-2 py-0.5 dark:bg-white/5">
                    Daily Cap: {capabilities.rate_limit_daily_tokens.toLocaleString()} tokens
                  </span>
                  <span className="rounded-md bg-slate-200/70 px-2 py-0.5 dark:bg-white/5">
                    Memory: {capabilities.memory_enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Live Provider Capability Matrix */}
          <div className="glass-card flex flex-col justify-between rounded-3xl p-6 lg:col-span-5">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Server className="h-4 w-4 text-violet-400" />
                  Live Provider Status
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  From /settings/capabilities
                </span>
              </div>

              <div className="space-y-3">
                {(providers.length > 0
                  ? providers
                  : [
                      {
                        id: "openai",
                        name: "OpenAI",
                        configured: false,
                        models: ["gpt-4o-mini"],
                        supports_vision: true,
                        supports_streaming: true,
                        required_env_var: "OPENAI_API_KEY",
                      },
                      {
                        id: "gemini",
                        name: "Google Gemini",
                        configured: false,
                        models: ["gemini-2.5-flash"],
                        supports_vision: true,
                        supports_streaming: true,
                        required_env_var: "GEMINI_API_KEY",
                      },
                      {
                        id: "anthropic",
                        name: "Anthropic Claude",
                        configured: false,
                        models: ["claude-3-5-sonnet-latest"],
                        supports_vision: true,
                        supports_streaming: true,
                        required_env_var: "ANTHROPIC_API_KEY",
                      },
                    ]
                ).map((prov) => (
                  <div
                    key={prov.id}
                    className="rounded-2xl border border-slate-200/80 bg-white/60 p-3.5 dark:border-white/10 dark:bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            prov.configured
                              ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                              : "bg-amber-400"
                          }`}
                        />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {prov.name}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          prov.configured
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {prov.configured ? "Configured & Ready" : `Requires ${prov.required_env_var}`}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {prov.configured ? `Model: ${prov.models[0]}` : "Not configured in environment"}
                      </span>
                      {prov.supports_streaming && (
                        <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-400">
                          SSE Streaming
                        </span>
                      )}
                      {prov.supports_vision && (
                        <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">
                          Vision Ready
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-100/70 px-3.5 py-2.5 text-xs dark:border-white/10 dark:bg-white/[0.03]">
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                Zero client-side key exposure
              </span>
              <Link href="/chat" className="font-semibold text-cyan-400 hover:underline">
                Test in Workspace →
              </Link>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Transparent Pricing Preview */}
      <section id="pricing" className="relative isolate overflow-hidden mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <AnimatedBackground variant="pricing" className="rounded-3xl opacity-80" />
        <div className="relative z-10">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-2.5 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Choose the workspace that fits your intelligence needs.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.04]">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                billingCycle === "monthly"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                billingCycle === "yearly"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Yearly (Save 17%)
            </button>
          </div>

          <p className="mx-auto mt-3 max-w-2xl text-xs text-amber-600 dark:text-amber-300">
            {billingConfigured
              ? "Billing gateway is configured on the backend. Visit /pricing to manage your live subscription."
              : "Transparency note: Listed paid tiers reflect proposed product pricing and are not active purchasable checkouts until Stripe or Razorpay credentials are configured."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {HOMEPAGE_PLANS.map((plan) => {
            const isPopular = Boolean(plan.badge);
            const displayPrice =
              billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            return (
              <div
                key={plan.id}
                className={`glass-card relative flex flex-col justify-between rounded-3xl p-6 transition hover:-translate-y-1 ${
                  isPopular
                    ? "border-cyan-400/50 ring-1 ring-cyan-400/30 shadow-[0_0_45px_-16px_rgba(34,211,238,0.45)]"
                    : "hover:border-cyan-400/35"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                    {plan.badge && (
                      <span className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {displayPrice}
                    </span>
                    {displayPrice !== "Custom" && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        /month
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {plan.description}
                  </p>

                  <ul className="mt-5 space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={plan.ctaHref}
                  className={`mt-7 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    isPopular
                      ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110"
                      : "border border-slate-300 text-slate-800 hover:border-cyan-400/60 dark:border-white/15 dark:text-white"
                  }`}
                >
                  <span>{plan.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
        </div>
      </section>
    </>
  );
}

