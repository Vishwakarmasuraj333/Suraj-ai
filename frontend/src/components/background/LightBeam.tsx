"use client";

import React from "react";
import type { DeviceTier } from "./useMotionEnvironment";

interface LightBeamProps {
  variant?: "hero" | "section" | "rag" | "subtle";
  paused?: boolean;
  deviceTier?: DeviceTier;
}

export const LightBeam = React.memo(function LightBeam({
  variant = "hero",
  paused = false,
  deviceTier = "desktop",
}: LightBeamProps) {
  const isCompact = deviceTier === "mobile";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Primary Diagonal Cyan Light Beam */}
      <div
        className="suraj-motion-el absolute -top-24 left-0 h-[150%] w-[240px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent blur-xl dark:via-cyan-400/20 sm:w-[320px]"
        style={{
          animation: paused ? "none" : "neonBeamSweep 11s ease-in-out infinite",
        }}
      />

      {/* Secondary Diagonal Violet/Magenta Light Beam */}
      {!isCompact && (
        <div
          className="suraj-motion-el absolute -top-24 left-0 h-[150%] w-[200px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent blur-2xl dark:via-fuchsia-500/15 sm:w-[260px]"
          style={{
            animation: paused ? "none" : "neonBeamSweep 15s ease-in-out 4.5s infinite",
          }}
        />
      )}

      {/* Horizontal Light Sweep */}
      <div
        className="suraj-motion-el absolute left-0 top-[28%] h-[1.5px] w-2/3 bg-gradient-to-r from-transparent via-cyan-600/50 dark:via-cyan-300/35 to-transparent shadow-[0_0_12px_rgba(8,145,178,0.4)] dark:shadow-[0_0_12px_rgba(34,211,238,0.45)]"
        style={{
          animation: paused ? "none" : "neonLineHorizontal 9.5s cubic-bezier(0.4,0,0.2,1) 1s infinite",
        }}
      />

      {/* Second Lower Horizontal Magenta/Blue Sweep */}
      {variant !== "subtle" && (
        <div
          className="suraj-motion-el absolute left-0 top-[72%] h-[1.5px] w-1/2 bg-gradient-to-r from-transparent via-fuchsia-600/45 dark:via-fuchsia-400/30 to-transparent shadow-[0_0_10px_rgba(192,38,211,0.35)] dark:shadow-[0_0_10px_rgba(217,70,239,0.35)]"
          style={{
            animation: paused ? "none" : "neonLineHorizontal 13.5s cubic-bezier(0.4,0,0.2,1) 3.5s infinite",
          }}
        />
      )}

      {/* Vertical Light Streak */}
      {!isCompact && variant === "hero" && (
        <div
          className="suraj-motion-el absolute left-[76%] top-0 h-[55%] w-[2px] bg-gradient-to-b from-transparent via-blue-600/50 dark:via-blue-400/60 to-transparent blur-[0.5px]"
          style={{
            animation: paused ? "none" : "neonBeamVerticalSweep 12s ease-in-out 2s infinite",
          }}
        />
      )}

      {/* RAG Scanning Horizontal Line */}
      {variant === "rag" && (
        <div
          className="suraj-motion-el absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cyan-400/15 via-cyan-400/5 to-transparent border-t border-cyan-400/35"
          style={{
            animation: paused ? "none" : "ragScanLine 7.5s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
});

