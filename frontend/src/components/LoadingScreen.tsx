"use client";

import React from "react";
import { SurajLogo } from "@/components/SurajLogo";

export function LoadingScreen({ label = "Initializing SURaj AI Core..." }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 border-r-violet-500 animate-orbit-slow" />
        <div className="absolute inset-2.5 rounded-full border border-fuchsia-400/25 border-b-blue-500 animate-orbit-reverse" />
        <SurajLogo size={42} iconOnly />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Connecting modular intelligence runtime</p>
      </div>
    </div>
  );
}
