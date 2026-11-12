"use client";

import React from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { ChartPayload } from "@/types";

const CodeBlock = dynamic(() => import("./CodeBlock").then((mod) => mod.CodeBlock), {
  ssr: false,
  loading: () => (
    <div className="my-3 h-24 animate-pulse rounded-xl border border-slate-200/80 bg-slate-900/70 dark:border-white/10" />
  ),
});

const ChartBlock = dynamic(() => import("./ChartBlock").then((mod) => mod.ChartBlock), {
  ssr: false,
  loading: () => (
    <div className="my-3 flex h-56 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/60 text-xs text-slate-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-400">
      Loading visualization...
    </div>
  ),
});

const MermaidBlock = dynamic(() => import("./MermaidBlock").then((mod) => mod.MermaidBlock), {
  ssr: false,
  loading: () => (
    <div className="my-3 flex h-36 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-950/70 text-xs text-slate-400 dark:border-white/10">
      Rendering diagram...
    </div>
  ),
});

interface MarkdownRendererProps {
  content: string;
  isDark?: boolean;
}

export const MarkdownRenderer = React.memo(function MarkdownRenderer({
  content,
  isDark = true,
}: MarkdownRendererProps) {
  return (
    <div className="suraj-prose text-slate-800 dark:text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-([a-zA-Z0-9_-]+)/.exec(className || "");
            const raw = String(children).replace(/\n$/, "");
            const lang = match?.[1]?.toLowerCase() || "";
            const isBlock =
              Boolean(match) ||
              raw.includes("\n") ||
              (node?.position && node.position.start.line !== node.position.end.line);

            if (!isBlock) {
              return (
                <code
                  className="rounded-md bg-slate-200/75 px-1.5 py-0.5 font-mono text-[0.84em] text-orange-700 dark:bg-white/10 dark:text-amber-300"
                  {...rest}
                >
                  {children}
                </code>
              );
            }

            if (lang === "mermaid") {
              return <MermaidBlock chart={raw} isDark={isDark} />;
            }

            if (lang === "chart") {
              try {
                const parsed = JSON.parse(raw) as ChartPayload;
                if (parsed && Array.isArray(parsed.data)) {
                  return <ChartBlock payload={parsed} />;
                }
              } catch {
                // fall back to code block while streaming incomplete JSON
              }
            }

            return <CodeBlock language={lang} value={raw} isDark={isDark} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
