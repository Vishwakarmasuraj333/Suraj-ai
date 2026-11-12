"use client";

import React, { useId } from "react";

interface SurajLogoProps {
  size?: number;
  iconOnly?: boolean;
  showWordmark?: boolean;
  showSub?: boolean;
  variant?: "auto" | "light" | "dark";
  className?: string;
}

export function SurajLogo({
  size = 38,
  iconOnly = false,
  showWordmark = true,
  showSub = false,
  variant = "auto",
  className = "",
}: SurajLogoProps) {
  const hideWordmark = iconOnly || showWordmark === false;
  const uid = useId().replace(/:/g, "");
  const ringGradId = `suraj-ring-${uid}`;
  const coreGradId = `suraj-core-${uid}`;
  const badgeBg =
    variant === "light"
      ? "bg-white/95 ring-cyan-500/35"
      : variant === "dark"
        ? "bg-slate-950/90 ring-cyan-400/30"
        : "bg-white/90 dark:bg-slate-950/90 ring-cyan-500/30 dark:ring-cyan-400/30";
  const textTone =
    variant === "light"
      ? "text-slate-900"
      : variant === "dark"
        ? "text-white"
        : "text-slate-900 dark:text-white";

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-xl p-1 shadow-[0_0_24px_-6px_rgba(34,211,238,0.45)] ring-1 ${badgeBg}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 48 48" fill="none" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={ringGradId} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="38%" stopColor="#3B82F6" />
              <stop offset="72%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#E879F9" />
            </linearGradient>
            <radialGradient id={coreGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="55%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#7C3AED" />
            </radialGradient>
          </defs>
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke={`url(#${ringGradId})`}
            strokeWidth="2"
            strokeDasharray="7 4"
            opacity="0.9"
          />
          <polygon
            points="24,7.5 38.2,15.7 38.2,32.3 24,40.5 9.8,32.3 9.8,15.7"
            stroke={`url(#${ringGradId})`}
            strokeWidth="2"
            fill="rgba(6, 182, 212, 0.08)"
          />
          <path
            d="M24 7.5V16M38.2 15.7L30.8 20M38.2 32.3L30.8 28M24 40.5V32M9.8 32.3L17.2 28M9.8 15.7L17.2 20"
            stroke={`url(#${ringGradId})`}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.75"
          />
          <circle cx="24" cy="24" r="6" fill={`url(#${coreGradId})`} />
          <circle cx="24" cy="7.5" r="2" fill="#22D3EE" />
          <circle cx="38.2" cy="15.7" r="2" fill="#3B82F6" />
          <circle cx="38.2" cy="32.3" r="2" fill="#8B5CF6" />
          <circle cx="24" cy="40.5" r="2" fill="#E879F9" />
          <circle cx="9.8" cy="32.3" r="2" fill="#8B5CF6" />
          <circle cx="9.8" cy="15.7" r="2" fill="#22D3EE" />
        </svg>
      </div>

      {!hideWordmark && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`text-[17px] font-extrabold uppercase tracking-wider ${textTone}`}>
              SURAJ
            </span>
            <span className="rounded-md bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
              AI
            </span>
          </div>
          {showSub && (
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Neural SaaS Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
