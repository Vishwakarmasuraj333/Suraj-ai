"use client";

import React from "react";
import type { DeviceTier } from "./useMotionEnvironment";

export type NeonGridVariant = "hero" | "tools" | "architecture" | "subtle";

interface NeonGridProps {
  variant?: NeonGridVariant;
  paused?: boolean;
  deviceTier?: DeviceTier;
  showPerspectiveFloor?: boolean;
}

const HORIZONTAL_TRACKS = [
  { top: "14%", color: "via-cyan-400/75", glow: "shadow-[0_0_12px_rgba(34,211,238,0.65)]", duration: "10s", delay: "0s", width: "42%" },
  { top: "31%", color: "via-blue-500/70", glow: "shadow-[0_0_10px_rgba(59,130,246,0.55)]", duration: "13s", delay: "2.4s", width: "52%" },
  { top: "52%", color: "via-violet-400/75", glow: "shadow-[0_0_12px_rgba(139,92,246,0.6)]", duration: "11.5s", delay: "5s", width: "38%" },
  { top: "68%", color: "via-cyan-300/70", glow: "shadow-[0_0_10px_rgba(34,211,238,0.5)]", duration: "14.5s", delay: "1.2s", width: "46%" },
  { top: "84%", color: "via-fuchsia-400/65", glow: "shadow-[0_0_12px_rgba(217,70,239,0.5)]", duration: "12.5s", delay: "3.8s", width: "36%" },
];

const VERTICAL_TRACKS = [
  { left: "12%", color: "via-cyan-400/70", duration: "11s", delay: "0.8s", height: "38%" },
  { left: "34%", color: "via-violet-400/65", duration: "14s", delay: "3.2s", height: "44%" },
  { left: "64%", color: "via-blue-400/70", duration: "12.2s", delay: "1.6s", height: "36%" },
  { left: "86%", color: "via-fuchsia-400/65", duration: "15s", delay: "4.6s", height: "42%" },
];

const INTERSECTION_NODES = [
  { top: "14%", left: "34%", color: "bg-cyan-300 shadow-[0_0_14px_#22d3ee]" },
  { top: "31%", left: "64%", color: "bg-blue-400 shadow-[0_0_14px_#60a5fa]" },
  { top: "52%", left: "12%", color: "bg-violet-400 shadow-[0_0_14px_#a78bfa]" },
  { top: "68%", left: "86%", color: "bg-fuchsia-400 shadow-[0_0_14px_#e879f9]" },
];

export const NeonGrid = React.memo(function NeonGrid({
  variant = "hero",
  paused = false,
  deviceTier = "desktop",
  showPerspectiveFloor = true,
}: NeonGridProps) {
  const isMobile = deviceTier === "mobile";
  const hTracks = isMobile ? HORIZONTAL_TRACKS.slice(0, 3) : HORIZONTAL_TRACKS;
  const vTracks = isMobile ? VERTICAL_TRACKS.slice(0, 2) : VERTICAL_TRACKS;
  const baseLineOpacity = variant === "subtle" ? "opacity-20 dark:opacity-28" : "opacity-40 dark:opacity-55";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Subtle architectural micro-grid overlay */}
      <div
        className={`absolute inset-0 ${variant === "subtle" ? "opacity-20 dark:opacity-25" : "opacity-35 dark:opacity-45"}`}
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,92,246,0.06) 1px, transparent 1px)",
          backgroundSize: isMobile ? "72px 72px" : "64px 64px",
        }}
      />

      {/* Moving Horizontal Neon Lines & Traveling Energy Signals */}
      <div className={`absolute inset-0 ${baseLineOpacity}`}>
        {hTracks.map((track, idx) => (
          <div key={track.top} className="absolute inset-x-0" style={{ top: track.top }}>
            {/* Faint guide rail */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/12 to-transparent dark:via-cyan-400/16" />
            {/* Moving neon energy trace + leading packet node */}
            <div
              className="suraj-motion-el relative -mt-[1px] flex items-center"
              style={{
                width: track.width,
                animation: paused ? "none" : `neonLineHorizontal ${track.duration} linear ${track.delay} infinite`,
              }}
            >
              <div className={`h-[1.5px] w-full bg-gradient-to-r from-transparent ${track.color} to-transparent ${track.glow}`} />
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  idx % 2 === 0
                    ? "bg-cyan-300 shadow-[0_0_10px_#22d3ee]"
                    : "bg-fuchsia-300 shadow-[0_0_10px_#e879f9]"
                }`}
              />
            </div>
          </div>
        ))}

        {/* Moving Vertical Neon Lines */}
        {vTracks.map((track, idx) => (
          <div key={track.left} className="absolute inset-y-0" style={{ left: track.left }}>
            <div className="h-full w-[1px] bg-gradient-to-b from-transparent via-violet-500/10 to-transparent dark:via-violet-400/16" />
            <div
              className="suraj-motion-el relative -ml-[1px] flex flex-col items-center"
              style={{
                height: track.height,
                animation: paused ? "none" : `neonLineVertical ${track.duration} linear ${track.delay} infinite`,
              }}
            >
              <div className={`h-full w-[1.5px] bg-gradient-to-b from-transparent ${track.color} to-transparent`} />
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  idx % 2 === 0
                    ? "bg-blue-300 shadow-[0_0_10px_#60a5fa]"
                    : "bg-cyan-300 shadow-[0_0_10px_#22d3ee]"
                }`}
              />
            </div>
          </div>
        ))}

        {/* Glowing Intersection Pulses */}
        {!isMobile &&
          INTERSECTION_NODES.map((node, idx) => (
            <span
              key={`${node.top}-${node.left}`}
              className={`suraj-motion-el absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${node.color}`}
              style={{
                top: node.top,
                left: node.left,
                animation: paused ? "none" : `pulseSoft ${3.2 + idx * 0.7}s ease-in-out ${idx * 0.6}s infinite`,
              }}
            />
          ))}
      </div>

      {/* 3D Futuristic Perspective Floor Grid (visible especially toward Hero/Tools bottom) */}
      {showPerspectiveFloor && (
        <div
          className={`absolute inset-x-[-15%] bottom-[-4%] h-[230px] sm:h-[300px] ${
            variant === "hero" ? "opacity-80 dark:opacity-100" : "opacity-55 dark:opacity-75"
          }`}
        >
          {/* Horizon Neon Rim */}
          <div className="mx-auto h-[1px] w-4/5 bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.45)]" />
          <div
            className="suraj-motion-el h-full w-full perspective-grid-floor"
            style={
              paused
                ? { animationPlayState: "paused" }
                : isMobile
                  ? { animationDuration: "20s" }
                  : undefined
            }
          />
          {/* Deep horizon fade mask */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
        </div>
      )}
    </div>
  );
});

