"use client";

import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, Terminal } from "lucide-react";

interface CodeBlockProps {
  language: string;
  value: string;
  isDark: boolean;
}

export function CodeBlock({ language, value, isDark }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-950 shadow-sm dark:border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5 font-mono uppercase tracking-wider text-slate-400">
          <Terminal className="h-3.5 w-3.5 text-cyan-400" />
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <div className="overflow-x-auto text-[13px]">
        <SyntaxHighlighter
          language={language || "text"}
          style={isDark ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: "0.95rem 1rem",
            background: isDark ? "#090d16" : "#f8fafc",
            fontSize: "0.82rem",
          }}
          wrapLongLines={false}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

