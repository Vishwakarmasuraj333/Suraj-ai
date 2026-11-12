"use client";

import React from "react";

interface AIOrbitalCoreProps {
  paused?: boolean;
  interactive?: boolean;
  activeNodeIndex?: number;
}

const NODE_COORDS = [
  { x: 220, y: 46, color: "#22d3ee" }, // Top: AI Intelligence
  { x: 370, y: 132, color: "#3b82f6" }, // Top-Right: Coding
  { x: 370, y: 308, color: "#8b5cf6" }, // Bottom-Right: Automation
  { x: 220, y: 394, color: "#e879f9" }, // Bottom: Security
  { x: 70, y: 308, color: "#6366f1" }, // Bottom-Left: Computing
  { x: 70, y: 132, color: "#38bdf8" }, // Top-Left: Conversation
];

export const AIOrbitalCore = React.memo(function AIOrbitalCore({
  paused = false,
  interactive = false,
  activeNodeIndex = 0,
}: AIOrbitalCoreProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
      style={{
        transform: interactive
          ? "translate3d(calc(var(--mx, 0px) * 0.35), calc(var(--my, 0px) * 0.35), 0)"
          : undefined,
      }}
    >
      {/* Deep Multi-Spectrum Core Illumination */}
      <div className="absolute h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.3)_0%,rgba(59,130,246,0.2)_35%,rgba(124,58,237,0.16)_58%,transparent_76%)] blur-2xl sm:h-[420px] sm:w-[420px]" />

      {/* Subtle Holographic Radar Conic Sweep */}
      <div
        className="suraj-motion-el absolute h-[286px] w-[286px] rounded-full opacity-35 sm:h-[346px] sm:w-[346px]"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(34,211,238,0.34) 0deg, rgba(59,130,246,0.12) 48deg, transparent 108deg, transparent 360deg)",
          maskImage: "radial-gradient(circle, transparent 28%, #000 34%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 28%, #000 34%, transparent 72%)",
          animation: paused ? "none" : "spin 12s linear infinite",
        }}
      />

      {/* Expanding Sonar Energy Pulses */}
      <span
        className="suraj-motion-el absolute h-[190px] w-[190px] rounded-full border border-cyan-400/40 sm:h-[240px] sm:w-[240px]"
        style={{
          animation: paused ? "none" : "pulseRingExpand 4.8s cubic-bezier(0.2,0.7,0.3,1) infinite",
        }}
      />
      <span
        className="suraj-motion-el absolute h-[190px] w-[190px] rounded-full border border-fuchsia-400/35 sm:h-[240px] sm:w-[240px]"
        style={{
          animation: paused ? "none" : "pulseRingExpand 4.8s cubic-bezier(0.2,0.7,0.3,1) 2.4s infinite",
        }}
      />

      {/* Outermost Rotating Light Segment Ring */}
      <div
        className="suraj-motion-el absolute h-[300px] w-[300px] rounded-full opacity-85 sm:h-[374px] sm:w-[374px]"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(34,211,238,0.85) 0deg 58deg, transparent 58deg 145deg, rgba(139,92,246,0.8) 145deg 212deg, transparent 212deg 285deg, rgba(217,70,239,0.75) 285deg 338deg, transparent 338deg 360deg)",
          maskImage: "radial-gradient(circle, transparent 68.4%, #000 69.2%, #000 70.3%, transparent 71.2%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 68.4%, #000 69.2%, #000 70.3%, transparent 71.2%)",
          animation: paused ? "none" : "spin 30s linear infinite",
        }}
      />

      {/* Outer Cyan Orbital Ring + Orbiting Signal Spheres */}
      <div
        className="suraj-motion-el absolute h-[248px] w-[248px] rounded-full border border-cyan-400/40 shadow-[0_0_26px_rgba(34,211,238,0.2)] sm:h-[306px] sm:w-[306px]"
        style={{
          animation: paused ? "none" : "spin 22s linear infinite",
        }}
      >
        <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_14px_#22d3ee]" />
        <span className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-blue-400 shadow-[0_0_12px_#60a5fa]" />
        <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-violet-300 shadow-[0_0_10px_#a78bfa]" />
      </div>

      {/* Inner Counter-Rotating Violet/Magenta Orbital Ring */}
      <div
        className="suraj-motion-el absolute h-[188px] w-[188px] rounded-full border border-dashed border-violet-400/50 sm:h-[228px] sm:w-[228px]"
        style={{
          animation: paused ? "none" : "spinReverse 16s linear infinite",
        }}
      >
        <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400 shadow-[0_0_14px_#e879f9]" />
        <span className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]" />
      </div>

      {/* Active Synapse & Holographic Telemetry Diagram SVG */}
      <svg
        viewBox="0 0 440 440"
        className="relative h-[320px] w-[320px] sm:h-[410px] sm:w-[410px]"
      >
        <defs>
          <linearGradient id="aiCoreHexRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#e879f9" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Outer calibration ring & cardinal degree ticks */}
        <circle
          cx="220"
          cy="220"
          r="174"
          fill="none"
          stroke="url(#aiCoreHexRing)"
          strokeWidth="0.9"
          strokeDasharray="5 9"
          opacity="0.75"
        />
        <line x1="220" y1="30" x2="220" y2="46" stroke="#22d3ee" strokeWidth="1.5" opacity="0.6" />
        <line x1="220" y1="394" x2="220" y2="410" stroke="#e879f9" strokeWidth="1.5" opacity="0.6" />
        <line x1="30" y1="220" x2="46" y2="220" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
        <line x1="394" y1="220" x2="410" y2="220" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6" />

        {/* Live Data-Flow Synapses from all 6 nodes to Central SURAJ AI CORE */}
        {NODE_COORDS.map((node, idx) => {
          const isHighlighted = idx === activeNodeIndex;
          const pathD = `M ${node.x} ${node.y} L 220 220`;
          return (
            <g key={`${node.x}-${node.y}`}>
              <path
                d={pathD}
                fill="none"
                stroke={node.color}
                strokeWidth={isHighlighted ? "2" : "1"}
                strokeOpacity={isHighlighted ? "0.78" : "0.28"}
                strokeDasharray="6 6"
                style={{
                  animation: paused
                    ? "none"
                    : `synapseDashFlow ${isHighlighted ? "1.8s" : "3.6s"} linear infinite`,
                }}
              />
              {!paused && (
                <circle r={isHighlighted ? "3.4" : "2.2"} fill={node.color}>
                  <animateMotion
                    dur={isHighlighted ? "2s" : `${3.2 + (idx % 3) * 0.6}s`}
                    repeatCount="indefinite"
                    path={pathD}
                  />
                </circle>
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={isHighlighted ? "5.5" : "3.5"}
                fill={node.color}
                opacity={isHighlighted ? "0.95" : "0.55"}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
});
