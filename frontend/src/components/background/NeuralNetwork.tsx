"use client";

import React, { useEffect, useRef } from "react";
import type { DeviceTier } from "./useMotionEnvironment";

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface SignalPulse {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: string;
}

export type NeuralVariant = "hero" | "features" | "rag" | "memory" | "architecture";

interface NeuralNetworkProps {
  variant?: NeuralVariant;
  paused?: boolean;
  deviceTier?: DeviceTier;
  pointerRef?: React.MutableRefObject<{ nx: number; ny: number }>;
}

export const NeuralNetwork = React.memo(function NeuralNetwork({
  variant = "hero",
  paused = false,
  deviceTier = "desktop",
  pointerRef,
}: NeuralNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;

    const nodeCount =
      deviceTier === "mobile"
        ? 10
        : deviceTier === "tablet"
          ? 14
          : variant === "hero"
            ? 22
            : 16;

    const connectDistance =
      deviceTier === "mobile" ? 120 : deviceTier === "tablet" ? 145 : 170;

    let nodes: NetworkNode[] = [];
    const pulses: SignalPulse[] = [];

    const seed = () => {
      const palette =
        variant === "memory"
          ? ["#a78bfa", "#c084fc", "#22d3ee"]
          : variant === "rag"
            ? ["#22d3ee", "#38bdf8", "#8b5cf6"]
            : ["#22d3ee", "#3b82f6", "#8b5cf6", "#e879f9"];

      nodes = Array.from({ length: nodeCount }, (_, idx) => {
        // Keep neural nodes gently biased toward peripheral zones so typography remains razor-clean
        let x = Math.random() * width;
        const y = Math.random() * height;
        if ((variant === "hero" || variant === "features") && width > 700 && idx % 4 !== 0) {
          x = idx % 2 === 0 ? Math.random() * (width * 0.24) : width * (0.74 + Math.random() * 0.24);
        }
        return {
          x,
          y,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.18,
          radius: 1.3 + Math.random() * 1.0,
          color: palette[idx % palette.length],
        };
      });

      pulses.length = 0;
      const pulseCount = deviceTier === "mobile" ? 3 : 7;
      for (let i = 0; i < pulseCount; i++) {
        pulses.push({
          fromIdx: i % Math.max(1, nodeCount),
          toIdx: (i + 3) % Math.max(1, nodeCount),
          progress: Math.random(),
          speed: 0.004 + Math.random() * 0.005,
          color: i % 2 === 0 ? "#22d3ee" : "#e879f9",
        });
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const render = (now: number, advance: boolean) => {
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      const px = (pointerRef?.current.nx ?? 0) * 16;
      const py = (pointerRef?.current.ny ?? 0) * 12;

      if (advance) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 12 || n.x > width - 12) n.vx *= -1;
          if (n.y < 12 || n.y > height - 12) n.vy *= -1;
        }
      }

      const edges: Array<[number, number, number]> = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < connectDistance) {
            const strength = (1 - dist / connectDistance) * (0.18 + 0.06 * Math.sin(now * 0.001 + i));
            edges.push([i, j, Math.max(0.03, strength)]);
          }
        }
      }

      // Connection lines
      for (const [i, j, alpha] of edges) {
        const a = nodes[i];
        const b = nodes[j];
        const grad = ctx.createLinearGradient(a.x + px, a.y + py, b.x + px, b.y + py);
        grad.addColorStop(0, "rgba(34, 211, 238, 0.7)");
        grad.addColorStop(1, "rgba(139, 92, 246, 0.7)");
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x + px, a.y + py);
        ctx.lineTo(b.x + px, b.y + py);
        ctx.stroke();
        ctx.restore();
      }

      // Traveling energy pulses along active edges
      if (edges.length > 0) {
        for (const p of pulses) {
          if (advance) {
            p.progress += p.speed;
            if (p.progress >= 1) {
              const edge = edges[Math.floor(Math.random() * edges.length)];
              p.fromIdx = edge[0];
              p.toIdx = edge[1];
              p.progress = 0;
            }
          }
          const a = nodes[p.fromIdx % nodes.length];
          const b = nodes[p.toIdx % nodes.length];
          const sx = a.x + (b.x - a.x) * p.progress + px;
          const sy = a.y + (b.y - a.y) * p.progress + py;

          ctx.save();
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 12;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Nodes
      for (const n of nodes) {
        ctx.save();
        ctx.globalAlpha = 0.48;
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = n.color;
        ctx.beginPath();
        ctx.arc(n.x + px, n.y + py, n.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    resize();
    render(performance.now(), false);

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    if (!paused) {
      const tick = (now: number) => {
        render(now, true);
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      observer.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [variant, paused, deviceTier, pointerRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
});

