"use client";

import React, { useEffect, useId, useState } from "react";
import { Check, Copy, GitBranch } from "lucide-react";

interface MermaidBlockProps {
  chart: string;
  isDark?: boolean;
}

export function MermaidBlock({ chart, isDark = true }: MermaidBlockProps) {
  const uniqueId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function renderDiagram() {
      const trimmed = chart.trim();
      if (!trimmed) return;
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "strict",
          suppressErrorRendering: true,
          fontFamily: "var(--font-sans), sans-serif",
        });
        await mermaid.parse(trimmed);
        const { svg: rendered } = await mermaid.render(`mermaid-${uniqueId}`, trimmed);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg("");
          setError(err instanceof Error ? err.message : "Diagram rendering error");
        }
      }
    }
    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [chart, isDark, uniqueId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-3.5 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <GitBranch className="h-3.5 w-3.5 text-orange-500" />
          Mermaid Diagram
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition hover:bg-slate-100 dark:hover:bg-white/10"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy source"}
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        {svg ? (
          <div
            className="flex justify-center [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : error ? (
          <div className="space-y-2">
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
              Could not render Mermaid diagram syntax. Showing raw diagram source:
            </p>
            <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600 dark:text-slate-300">
              {chart}
            </pre>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">Rendering diagram...</div>
        )}
      </div>
    </div>
  );
}

