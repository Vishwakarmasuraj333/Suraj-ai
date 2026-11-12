"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Code2, Cpu, MessageSquare, ShieldCheck, Workflow } from "lucide-react";
import { AIOrbitalCore } from "@/components/background/AIOrbitalCore";
import { useMotionEnvironment, useSmoothPointer } from "@/components/background/useMotionEnvironment";

const ORBIT_BADGES = [
  {
    label: "AI Intelligence",
    detail: "SSE Multi-Provider Router",
    icon: Brain,
    position: "top-2 left-1/2 -translate-x-1/2",
    accent: "text-cyan-300 border-cyan-400/40 bg-[#071127]/85",
  },
  {
    label: "Coding",
    detail: "Syntax-highlighted developer studio",
    icon: Code2,
    position: "top-[24%] right-1 sm:right-2",
    accent: "text-blue-300 border-blue-400/40 bg-[#071127]/85",
  },
  {
    label: "Automation",
    detail: "Document RAG & structured outputs",
    icon: Workflow,
    position: "bottom-[26%] right-1 sm:right-2",
    accent: "text-violet-300 border-violet-400/40 bg-[#071127]/85",
  },
  {
    label: "Security",
    detail: "JWT, Bcrypt & Redis rate control",
    icon: ShieldCheck,
    position: "bottom-9 left-1/2 -translate-x-1/2",
    accent: "text-fuchsia-300 border-fuchsia-400/40 bg-[#071127]/85",
  },
  {
    label: "Computing",
    detail: "Data parsing, Recharts & AST math",
    icon: Cpu,
    position: "bottom-[26%] left-1 sm:left-2",
    accent: "text-indigo-300 border-indigo-400/40 bg-[#071127]/85",
  },
  {
    label: "Conversation",
    detail: "Persistent memory & multilingual QA",
    icon: MessageSquare,
    position: "top-[24%] left-1 sm:left-2",
    accent: "text-sky-300 border-sky-400/40 bg-[#071127]/85",
  },
];

export function HeroAiCore() {
  const { paused, prefersReducedMotion, deviceTier, isTouchDevice } = useMotionEnvironment();
  const interactive = !paused && !isTouchDevice && deviceTier === "desktop";
  const { targetElementRef } = useSmoothPointer(interactive);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverLocked, setHoverLocked] = useState(false);

  useEffect(() => {
    if (paused || hoverLocked) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % ORBIT_BADGES.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [paused, hoverLocked]);

  const activeNode = ORBIT_BADGES[activeIndex];

  return (
    <div
      ref={targetElementRef}
      onMouseLeave={() => setHoverLocked(false)}
      className="relative mx-auto flex h-[370px] w-full max-w-[460px] items-center justify-center overflow-hidden sm:h-[450px] sm:max-w-[520px]"
    >
      {/* Dedicated Multi-Ring AI Energy Core & Active Synapse Diagram */}
      <AIOrbitalCore
        paused={paused}
        interactive={interactive}
        activeNodeIndex={activeIndex}
      />

      {/* Central SURAJ AI CORE Logo Sphere */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55 }}
        className="relative z-10 flex h-36 w-36 flex-col items-center justify-center rounded-full border border-cyan-400/60 bg-[#04091b]/95 p-3 text-center shadow-[0_0_76px_-4px_rgba(34,211,238,0.68)] backdrop-blur-xl sm:h-44 sm:w-44"
      >
        <div className="pointer-events-none absolute inset-1.5 rounded-full border border-white/10 bg-gradient-to-br from-cyan-500/25 via-blue-600/20 to-fuchsia-500/25" />
        <svg viewBox="0 0 48 48" className="relative h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true">
          <defs>
            <linearGradient id="heroCoreGrad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#D946EF" />
            </linearGradient>
          </defs>
          <polygon
            points="24,5 40,14.5 40,33.5 24,43 8,33.5 8,14.5"
            stroke="url(#heroCoreGrad)"
            strokeWidth="2.2"
            fill="rgba(34, 211, 238, 0.08)"
          />
          <circle cx="24" cy="24" r="6.5" fill="url(#heroCoreGrad)" />
          <path
            d="M24 5V17.5M40 14.5L29.5 20.5M40 33.5L29.5 27.5M24 43V30.5M8 33.5L18.5 27.5M8 14.5L18.5 20.5"
            stroke="url(#heroCoreGrad)"
            strokeWidth="1.5"
          />
        </svg>
        <span className="relative mt-1.5 bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-sm font-extrabold uppercase tracking-[0.22em] text-transparent sm:text-base">
          AI
        </span>
        <span className="relative mt-0.5 text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-200/95 sm:text-[10px]">
          SURAJ AI CORE
        </span>
      </motion.div>

      {/* Interactive Orbiting Capability Nodes */}
      {ORBIT_BADGES.map((item, idx) => {
        const Icon = item.icon;
        const isActive = idx === activeIndex;
        return (
          <motion.button
            key={item.label}
            type="button"
            onMouseEnter={() => {
              setActiveIndex(idx);
              setHoverLocked(true);
            }}
            onClick={() => {
              setActiveIndex(idx);
              setHoverLocked(true);
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={
              prefersReducedMotion
                ? { opacity: 1, scale: isActive ? 1.05 : 1 }
                : { opacity: 1, scale: isActive ? 1.05 : 1, y: [0, idx % 2 === 0 ? -4 : 4, 0] }
            }
            transition={{
              opacity: { duration: 0.4, delay: idx * 0.07 },
              scale: { duration: 0.2 },
              y: { duration: 4 + (idx % 3), repeat: Infinity, ease: "easeInOut" },
            }}
            className={`absolute z-20 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur-md shadow-lg transition-shadow ${
              item.position
            } ${item.accent} ${
              isActive
                ? "ring-1 ring-cyan-400/70 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                : "opacity-90 hover:opacity-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap text-white">{item.label}</span>
          </motion.button>
        );
      })}

      {/* Bottom Live Telemetry Readout Pill */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-20 flex max-w-[94%] -translate-x-1/2 items-center gap-2 rounded-full border border-cyan-400/30 bg-[#04091b]/90 px-3 py-1 text-[10px] font-medium text-slate-200 shadow-lg backdrop-blur-md">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 animate-pulse" />
        <span className="shrink-0 font-bold uppercase tracking-wider text-cyan-300">
          {activeNode.label}
        </span>
        <span className="shrink-0 text-slate-400">•</span>
        <span className="truncate text-slate-300">{activeNode.detail}</span>
      </div>
    </div>
  );
}
