
"use client";

import React from "react";

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-stone-50 via-white to-orange-50/40 dark:from-[#07090e] dark:via-[#0b0f18] dark:to-[#111524]" />
      <div className="animate-aurora-slow absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-amber-400/20 via-orange-500/15 to-rose-500/10 blur-[110px] dark:from-amber-500/12 dark:via-orange-500/10 dark:to-indigo-500/15" />
      <div
        className="animate-aurora-slow absolute -bottom-48 right-1/5 h-[480px] w-[480px] rounded-full bg-gradient-to-tr from-sky-400/15 via-indigo-400/10 to-amber-300/15 blur-[120px] dark:from-sky-500/10 dark:via-violet-500/10 dark:to-orange-500/10"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}

