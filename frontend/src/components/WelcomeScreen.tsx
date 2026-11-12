"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Code2,
  FileText,
  GitBranch,
  Languages,
  Sparkles,
} from "lucide-react";
import { SurajLogo } from "./SurajLogo";
import type { Capabilities } from "@/types";

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  capabilities: Capabilities | null;
  onOpenSettings: () => void;
}

const SUGGESTIONS = [
  {
    icon: Code2,
    title: "Production TypeScript + Python",
    subtitle: "Design a rate-limited FastAPI endpoint with async tests",
    prompt:
      "Explain step by step how to implement a sliding-window rate limiter in Python FastAPI and show clean production code with unit tests.",
  },
  {
    icon: Languages,
    title: "हिन्दी & Multilingual Support",
    subtitle: "Explain quantum computing in simple Hindi with examples",
    prompt:
      "क्वांटम कंप्यूटिंग (Quantum Computing) को सरल हिन्दी में उदाहरणों के साथ चरण-दर-चरण समझाइए।",
  },
  {
    icon: GitBranch,
    title: "Architecture & Flowcharts",
    subtitle: "Generate a Mermaid diagram for a RAG pipeline",
    prompt:
      "Create a detailed Mermaid flowchart for an enterprise RAG (Retrieval-Augmented Generation) pipeline with vector search, reranking, and citations, then explain each stage.",
  },
  {
    icon: BarChart3,
    title: "Interactive Data Charts",
    subtitle: "Visualize quarterly growth metrics or uploaded CSVs",
    prompt:
      "Compare cloud AI inference latency vs throughput across 4 batch sizes and include an interactive chart block plus a summary Markdown table.",
  },
  {
    icon: FileText,
    title: "PDF, CSV & Vision Analysis",
    subtitle: "Upload a PDF, image, Excel, or CSV file in the composer",
    prompt:
      "Summarize the key insights, metrics, and anomalies from the file I attach, and highlight anything uncertain or missing.",
  },
  {
    icon: Sparkles,
    title: "Mathematical & Step-by-Step",
    subtitle: "Derive Bayes' theorem with LaTeX & numerical intuition",
    prompt:
      "Derive Bayes' theorem step by step using LaTeX formulas and walk through a real medical diagnostic example.",
  },
];

export function WelcomeScreen({
  onSelectPrompt,
  capabilities,
  onOpenSettings,
}: WelcomeScreenProps) {
  const anyLlmConfigured = capabilities?.llm_providers.some((p) => p.configured) ?? false;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-6 flex flex-col items-center text-center"
      >
        <div className="mb-4 rounded-2xl border border-orange-500/25 bg-white/80 p-3 shadow-xl shadow-orange-500/15 backdrop-blur-xl dark:bg-white/[0.04]">
          <SurajLogo size={48} showWordmark={false} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            SURaj AI
          </span>
        </h1>
        <p className="mt-2.5 max-w-xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Your professional multimodal workspace for real-time streaming chat, code generation,
          Mermaid diagrams, interactive data charts, PDF/vision understanding, and image creation.
        </p>

        {capabilities && !anyLlmConfigured && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-300"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            LLM API Key Required — Configure OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY in backend/.env
          </button>
        )}
      </motion.div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.title}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.25, delay: 0.04 * idx }}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex flex-col items-start rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-left shadow-sm backdrop-blur-xl transition-colors hover:border-orange-500/50 hover:bg-white hover:shadow-lg hover:shadow-orange-500/10 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-orange-400/40 dark:hover:bg-white/[0.07]"
            >
              <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 transition group-hover:scale-105 dark:text-orange-400">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {item.subtitle}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

