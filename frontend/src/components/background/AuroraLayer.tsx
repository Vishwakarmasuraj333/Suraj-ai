"use client";

import React from "react";

export type AuroraVariant = "hero" | "section" | "pricing" | "minimal" | "footer" | "blog";

interface AuroraLayerProps {
  variant?: AuroraVariant;
  paused?: boolean;
  interactive?: boolean;
}

export const AuroraLayer = React.memo(function AuroraLayer({
  variant = "hero",
  paused = false,
  interactive = false,
}: AuroraLayerProps) {
  const opacityScale =
    variant === "minimal" || variant === "blog"
      ? "opacity-40 dark:opacity-50"
      : variant === "pricing"
        ? "opacity-65 dark:opacity-75"
        : variant === "footer"
          ? "opacity-55 dark:opacity-70"
          : "opacity-80 dark:opacity-100";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${opacityScale}`}
    >
      {/* Left Electric Cyan Aurora */}
      <div
        className="suraj-motion-el absolute -left-[12%] -top-[10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22)_0%,rgba(6,182,212,0.08)_45%,transparent_74%)] blur-[90px] dark:bg-[radial-gradient(circle,rgba(34,211,238,0.26)_0%,rgba(6,182,212,0.1)_48%,transparent_76%)] sm:h-[680px] sm:w-[680px]"
        style={{
          animation: paused ? "none" : "auroraDriftA 20s ease-in-out infinite alternate",
          transform: interactive ? "translate3d(var(--mx, 0px), var(--my, 0px), 0)" : undefined,
        }}
      />

      {/* Center Electric Blue Ambient Depth */}
      <div
        className="suraj-motion-el absolute left-[28%] top-[12%] h-[440px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16)_0%,rgba(37,99,235,0.06)_50%,transparent_75%)] blur-[110px] dark:bg-[radial-gradient(circle,rgba(37,99,235,0.22)_0%,rgba(59,130,246,0.08)_50%,transparent_76%)]"
        style={{
          animation: paused ? "none" : "auroraDriftB 26s ease-in-out infinite alternate",
        }}
      />

      {/* Right Violet & Purple Aurora */}
      <div
        className="suraj-motion-el absolute -right-[10%] top-[6%] h-[520px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18)_0%,rgba(139,92,246,0.07)_48%,transparent_76%)] blur-[100px] dark:bg-[radial-gradient(circle,rgba(124,58,237,0.28)_0%,rgba(91,33,182,0.11)_50%,transparent_76%)] sm:h-[680px] sm:w-[680px]"
        style={{
          animation: paused ? "none" : "auroraDriftB 22s ease-in-out infinite alternate-reverse",
        }}
      />

      {/* Subtle Magenta Horizon Highlight */}
      {variant !== "minimal" && variant !== "blog" && (
        <div
          className="suraj-motion-el absolute bottom-[-16%] left-[36%] h-[400px] w-[540px] rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.12)_0%,rgba(168,85,247,0.05)_48%,transparent_75%)] blur-[105px] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.2)_0%,rgba(168,85,247,0.08)_50%,transparent_78%)]"
          style={{
            animation: paused ? "none" : "auroraDriftA 17s ease-in-out infinite alternate",
          }}
        />
      )}

      {/* Interactive Cursor Ambient Spotlight (Desktop) */}
      {interactive && !paused && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(520px circle at var(--px, 50%) var(--py, 40%), rgba(34,211,238,0.11), rgba(124,58,237,0.05) 45%, transparent 72%)",
          }}
        />
      )}
    </div>
  );
});

