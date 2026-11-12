"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Brain, Code2, Cpu, MessageSquare, ShieldCheck, Workflow } from "lucide-react";

const ORBIT_BADGES = [
  {
    label: "AI Intelligence",
    icon: Brain,
    position: "top-3 left-1/2 -translate-x-1/2",
    accent: "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
  },
  {
    label: "Coding",
    icon: Code2,
    position: "top-[22%] -right-1 sm:right-2",
    accent: "text-blue-300 border-blue-400/30 bg-blue-500/10",
  },
  {
    label: "Automation",
    icon: Workflow,
    position: "bottom-[22%] -right-1 sm:right-2",
    accent: "text-violet-300 border-violet-400/30 bg-violet-500/10",
  },
  {
    label: "Security",
    icon: ShieldCheck,
    position: "bottom-3 left-1/2 -translate-x-1/2",
    accent: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10",
  },
  {
    label: "Computing",
    icon: Cpu,
    position: "bottom-[22%] -left-1 sm:left-2",
    accent: "text-indigo-300 border-indigo-400/30 bg-indigo-500/10",
  },
  {
    label: "Conversation",
    icon: MessageSquare,
    position: "top-[22%] -left-1 sm:left-2",
    accent: "text-sky-300 border-sky-400/30 bg-sky-500/10",
  },
];

export function HeroAiCore() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="relative mx-auto flex h-[340px] w-full max-w-[440px] items-center justify-center overflow-hidden sm:h-[420px] sm:max-w-[500px]">
      {/* Ambient radial lighting */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.22),rgba(124,58,237,0.14)_45%,transparent_72%)] blur-2xl" />

      {/* Perspective 3D grid floor */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-[130%] -translate-x-1/2 opacity-60 perspective-grid-floor"
      />

      {/* Neural connection ring SVG */}
      <svg
        viewBox="0 0 400 400"
        aria-hidden="true"
        className="pointer-events-none absolute h-[300px] w-[300px] sm:h-[360px] sm:w-[360px]"
      >
        <defs>
          <linearGradient id="neuralLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d946ef" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle
          cx="200"
          cy="200"
          r="158"
          fill="none"
          stroke="url(#neuralLineGrad)"
          strokeWidth="1"
          strokeDasharray="6 8"
        />
        <line x1="200" y1="42" x2="200" y2="358" stroke="url(#neuralLineGrad)" strokeWidth="0.9" strokeDasharray="3 6" />
        <line x1="63" y1="121" x2="337" y2="279" stroke="url(#neuralLineGrad)" strokeWidth="0.9" strokeDasharray="3 6" />
        <line x1="337" y1="121" x2="63" y2="279" stroke="url(#neuralLineGrad)" strokeWidth="0.9" strokeDasharray="3 6" />
      </svg>

      {/* Outer rotating orbital ring */}
      <div
        className={`pointer-events-none absolute h-[245px] w-[245px] rounded-full border border-cyan-400/25 sm:h-[296px] sm:w-[296px] ${
          prefersReduced ? "" : "animate-orbit-slow"
        }`}
      >
        <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
        <span className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-violet-400 shadow-[0_0_12px_#a78bfa]" />
      </div>

      {/* Inner reverse orbital ring */}
      <div
        className={`pointer-events-none absolute h-[182px] w-[182px] rounded-full border border-dashed border-fuchsia-400/30 sm:h-[218px] sm:w-[218px] ${
          prefersReduced ? "" : "animate-orbit-reverse"
        }`}
      >
        <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400 shadow-[0_0_10px_#e879f9]" />
      </div>

      {/* Central SURaj AI Core */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55 }}
        className="relative z-10 flex h-36 w-36 flex-col items-center justify-center rounded-full border border-cyan-400/40 bg-[#060b1d]/90 p-3 text-center shadow-[0_0_60px_-8px_rgba(34,211,238,0.55)] backdrop-blur-xl sm:h-44 sm:w-44"
      >
        <div className="pointer-events-none absolute inset-2 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-fuchsia-500/20" />
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
          <path d="M24 5V17.5M40 14.5L29.5 20.5M40 33.5L29.5 27.5M24 43V30.5M8 33.5L18.5 27.5M8 14.5L18.5 20.5" stroke="url(#heroCoreGrad)" strokeWidth="1.5" />
        </svg>
        <span className="relative mt-1.5 bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-sm font-extrabold tracking-widest text-transparent sm:text-base">
          AI
        </span>
        <span className="relative mt-0.5 text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-200/80 sm:text-[10px]">
          SURAJ AI CORE
        </span>
      </motion.div>

      {/* Floating capability nodes */}
      {ORBIT_BADGES.map((item, idx) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={
              prefersReduced
                ? { opacity: 1, scale: 1 }
                : { opacity: 1, scale: 1, y: [0, idx % 2 === 0 ? -5 : 5, 0] }
            }
            transition={{
              opacity: { duration: 0.4, delay: idx * 0.07 },
              y: { duration: 4 + (idx % 3), repeat: Infinity, ease: "easeInOut" },
            }}
            className={`absolute z-20 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur-md shadow-lg ${item.position} ${item.accent}`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap text-slate-900 dark:text-white">{item.label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

