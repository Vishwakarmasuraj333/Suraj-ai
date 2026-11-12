"use client";

import React from "react";

interface SurajLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function SurajLogo({ size = 32, showWordmark = true, className = "" }: SurajLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 shadow-lg shadow-orange-500/25 ring-1 ring-white/20"
        style={{ width: size, height: size }}
      >
        <svg
          width={Math.round(size * 0.64)}
          height={Math.round(size * 0.64)}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" fill="white" />
          <path
            d="M12 2.2V5.2M12 18.8V21.8M2.2 12H5.2M18.8 12H21.8M5.1 5.1L7.2 7.2M16.8 16.8L18.9 18.9M18.9 5.1L16.8 7.2M7.2 16.8L5.1 18.9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            SURaj <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">AI</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Multimodal Studio
          </span>
        </div>
      )}
    </div>
  );
}

