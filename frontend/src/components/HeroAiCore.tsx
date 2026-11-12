"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
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
    accent: "text-cyan-700 border-cyan-500/45 bg-white/90 dark:text-cyan-300 dark:border-cyan-400/40 dark:bg-[#071127]/85",
  },
  {
    label: "Coding",
    detail: "Syntax-highlighted developer studio",
    icon: Code2,
    position: "top-[24%] right-1 sm:right-2",
    accent: "text-blue-700 border-blue-500/45 bg-white/90 dark:text-blue-300 dark:border-blue-400/40 dark:bg-[#071127]/85",
  },
  {
    label: "Automation",
    detail: "Document RAG & structured outputs",
    icon: Workflow,
    position: "bottom-[26%] right-1 sm:right-2",
    accent: "text-violet-700 border-violet-500/45 bg-white/90 dark:text-violet-300 dark:border-violet-400/40 dark:bg-[#071127]/85",
  },
  {
    label: "Security",
    detail: "JWT, Bcrypt & Redis rate control",
    icon: ShieldCheck,
    position: "bottom-9 left-1/2 -translate-x-1/2",
    accent: "text-fuchsia-700 border-fuchsia-500/45 bg-white/90 dark:text-fuchsia-300 dark:border-fuchsia-400/40 dark:bg-[#071127]/85",
  },
  {
    label: "Computing",
    detail: "Data parsing, Recharts & AST math",
    icon: Cpu,
    position: "bottom-[26%] left-1 sm:left-2",
    accent: "text-indigo-700 border-indigo-500/45 bg-white/90 dark:text-indigo-300 dark:border-indigo-400/40 dark:bg-[#071127]/85",
  },
  {
    label: "Conversation",
    detail: "Persistent memory & multilingual QA",
    icon: MessageSquare,
    position: "top-[24%] left-1 sm:left-2",
    accent: "text-sky-700 border-sky-500/45 bg-white/90 dark:text-sky-300 dark:border-sky-400/40 dark:bg-[#071127]/85",
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

      {/* Central Holographic Neural AI Core Bust */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={
          prefersReducedMotion
            ? { scale: 1, opacity: 1 }
            : { scale: [1, 1.022, 1], opacity: 1 }
        }
        transition={{
          opacity: { duration: 0.55 },
          scale: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
        }}
        className="relative z-10 flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-400/70 bg-[#020511] shadow-[0_0_88px_-4px_rgba(34,211,238,0.75)] ring-1 ring-violet-400/40 sm:h-56 sm:w-56"
      >
        <Image
          src="/images/hero-ai-hologram.jpg"
          alt="SURAJ AI Holographic Neural Core"
          fill
          sizes="(max-width: 640px) 176px, 224px"
          priority
          className="object-cover object-center brightness-110 contrast-105"
        />
        {/* Holographic glass sheen + rim glow overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(34,211,238,0.2),transparent_55%),radial-gradient(circle_at_center,transparent_58%,rgba(2,5,17,0.72)_100%)]" />
        {/* Crisp AI • SURAJ AI CORE label anchored along lower arc */}
        <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-400/50 bg-[#020614]/85 px-2.5 py-0.5 backdrop-blur-md shadow-[0_0_18px_rgba(34,211,238,0.35)]">
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.18em] text-transparent">
            AI
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-100">
            SURAJ AI CORE
          </span>
        </div>
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
            <span className="whitespace-nowrap text-slate-900 dark:text-white">{item.label}</span>
          </motion.button>
        );
      })}

      {/* Bottom Live Telemetry Readout Pill */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-20 flex max-w-[94%] -translate-x-1/2 items-center gap-2 rounded-full border border-cyan-500/35 bg-white/90 px-3 py-1 text-[10px] font-medium text-slate-800 shadow-lg backdrop-blur-md dark:border-cyan-400/30 dark:bg-[#04091b]/90 dark:text-slate-200">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
        <span className="shrink-0 font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
          {activeNode.label}
        </span>
        <span className="shrink-0 text-slate-400">•</span>
        <span className="truncate text-slate-600 dark:text-slate-300">{activeNode.detail}</span>
      </div>
    </div>
  );
}
