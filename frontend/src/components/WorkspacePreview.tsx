"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, FileText, RefreshCw, Sparkles, Terminal } from "lucide-react";
import type { Capabilities } from "@/types";

const SAMPLE_PROMPT =
  "Analyze our financial report PDF, check our quarterly KPI target, and format the key variance metrics.";

const SAMPLE_CHUNKS = [
  "### Sample Financial Analysis (Extracted Document Context)",
  "",
  "**Source References:** `[Source: Q3-Financial-Summary.pdf | Section 1]` & `[Source: Q3-Financial-Summary.pdf | Section 3]`",
  "",
  "| KPI Metric | Quarterly Target | Actual Result | Variance |",
  "| :--- | :---: | :---: | :---: |",
  "| Quarterly Revenue | $1,250,000 | $1,342,500 | +$92,500 (+7.4%) |",
  "| Operating Margin | 24.0% | 26.2% | +2.2 pts |",
  "| Net Retention Rate | 112.0% | 116.5% | +4.5 pts |",
  "| Cloud Inference Cost / 1M Tokens | $1.80 | $1.42 | -$0.38 (-21.1%) |",
  "",
  "**Summary:** Revenue exceeded the quarterly target by 7.4% while token unit cost declined by 21.1% after model routing optimization. *(Explicit sample preview — upload your own PDF in the live Workspace to analyze real documents.)*",
];

export function WorkspacePreview({ capabilities }: { capabilities: Capabilities | null }) {
  const fullSampleText = SAMPLE_CHUNKS.join("\n");
  const [visibleLines, setVisibleLines] = useState<number>(SAMPLE_CHUNKS.length);
  const [isReplaying, setIsReplaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeProviders = capabilities?.llm_providers.filter((p) => p.configured) ?? [];
  const primaryProvider = activeProviders[0];

  useEffect(() => {
    if (!isReplaying) return;
    if (visibleLines >= SAMPLE_CHUNKS.length) {
      setIsReplaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setVisibleLines((prev) => prev + 1);
    }, 140);
    return () => clearTimeout(timer);
  }, [isReplaying, visibleLines]);

  const handleReplay = () => {
    setVisibleLines(1);
    setIsReplaying(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullSampleText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-300">
          <Sparkles className="h-3.5 w-3.5" /> Live Product Interface Preview
        </span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Meet Your Intelligent Workspace
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          One workspace. Multiple AI capabilities. Unlimited possibilities.
        </p>
      </div>

      {/* Glassmorphic Workspace Frame */}
      <div className="glass-card overflow-hidden rounded-3xl border border-slate-200/80 dark:border-cyan-400/20">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-100/80 px-4 py-3 dark:border-white/10 dark:bg-[#070c1d]/90 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              SURajAI Workspace v1.0
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              Sample Demonstration Output
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-0.5 text-[11px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  primaryProvider ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {primaryProvider
                ? `Active Engine: ${primaryProvider.name} (${primaryProvider.models[0]})`
                : "Backend Status: No Provider Key Configured in Environment"}
            </span>
          </div>
        </div>

        {/* Workspace Content */}
        <div className="space-y-5 p-4 sm:p-7">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
                <FileText className="h-3.5 w-3.5" />
                Q3-Financial-Summary.pdf (Sample Attachment)
              </div>
              <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 px-4 py-3 text-sm text-white shadow-md">
                {SAMPLE_PROMPT}
              </div>
            </div>
          </div>

          {/* Assistant Structured Output */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3 dark:border-white/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 text-[10px] font-extrabold text-white">
                  AI
                </span>
                <span>SURaj AI Analysis Preview</span>
                {isReplaying && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
                    Streaming sample...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-cyan-400/50 dark:border-white/10 dark:text-slate-300"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy response"}
                </button>
                <button
                  type="button"
                  onClick={handleReplay}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-cyan-400/50 dark:border-white/10 dark:text-slate-300"
                >
                  <RefreshCw className={`h-3 w-3 ${isReplaying ? "animate-spin" : ""}`} />
                  Regenerate preview
                </button>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
              {visibleLines >= 1 && (
                <p className="font-semibold text-slate-900 dark:text-white">
                  Sample Financial Analysis (Extracted Document Context)
                </p>
              )}
              {visibleLines >= 3 && (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-cyan-700 dark:text-cyan-300">
                    Source: Q3-Financial-Summary.pdf §1
                  </span>
                  <span className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-cyan-700 dark:text-cyan-300">
                    Source: Q3-Financial-Summary.pdf §3
                  </span>
                </div>
              )}
              {visibleLines >= 5 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full min-w-[460px] text-left text-xs">
                    <thead className="bg-slate-100/90 dark:bg-white/[0.04]">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">KPI Metric</th>
                        <th className="px-3.5 py-2.5 font-semibold">Quarterly Target</th>
                        <th className="px-3.5 py-2.5 font-semibold">Actual Result</th>
                        <th className="px-3.5 py-2.5 font-semibold">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                      <tr>
                        <td className="px-3.5 py-2 font-medium">Quarterly Revenue</td>
                        <td className="px-3.5 py-2">$1,250,000</td>
                        <td className="px-3.5 py-2">$1,342,500</td>
                        <td className="px-3.5 py-2 font-semibold text-emerald-500">+$92,500 (+7.4%)</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-medium">Operating Margin</td>
                        <td className="px-3.5 py-2">24.0%</td>
                        <td className="px-3.5 py-2">26.2%</td>
                        <td className="px-3.5 py-2 font-semibold text-emerald-500">+2.2 pts</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-medium">Net Retention Rate</td>
                        <td className="px-3.5 py-2">112.0%</td>
                        <td className="px-3.5 py-2">116.5%</td>
                        <td className="px-3.5 py-2 font-semibold text-emerald-500">+4.5 pts</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-medium">Inference Cost / 1M Tokens</td>
                        <td className="px-3.5 py-2">$1.80</td>
                        <td className="px-3.5 py-2">$1.42</td>
                        <td className="px-3.5 py-2 font-semibold text-cyan-400">-$0.38 (-21.1%)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {visibleLines >= 10 && (
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  <strong>Analytical Summary:</strong> Revenue outperformed target by 7.4% while token unit cost fell 21.1%. Note: The table above is clearly labeled sample demonstration data. Upload your real PDF, CSV, or XLSX files in the workspace to analyze live documents using your configured AI provider.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real Knowledge RAG, streaming SSE, Markdown, KaTeX, Recharts & Mermaid ready inside `/chat`.
              </p>
              <Link
                href="/chat?tool=rag"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
              >
                Open Live Workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

