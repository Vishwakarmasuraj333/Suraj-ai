"use client";

import React, { useEffect, useRef } from "react";
import type { DeviceTier } from "./useMotionEnvironment";

interface DigitalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  depth: number;
  alpha: number;
  color: string;
}

interface ParticleFieldProps {
  paused?: boolean;
  isDark?: boolean;
  deviceTier?: DeviceTier;
  density?: "full" | "medium" | "minimal";
  direction?: "up" | "diagonal" | "drift";
  pointerRef?: React.MutableRefObject<{ nx: number; ny: number }>;
}

const DARK_PARTICLE_COLORS = ["#22d3ee", "#3b82f6", "#8b5cf6", "#e879f9", "#38bdf8"];
const LIGHT_PARTICLE_COLORS = ["#0891b2", "#2563eb", "#7c3aed", "#c026d3", "#0284c7"];

export const ParticleField = React.memo(function ParticleField({
  paused = false,
  isDark = true,
  deviceTier = "desktop",
  density = "full",
  direction = "diagonal",
  pointerRef,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = isDark ? DARK_PARTICLE_COLORS : LIGHT_PARTICLE_COLORS;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;

    const count =
      deviceTier === "mobile"
        ? density === "minimal"
          ? 8
          : 12
        : deviceTier === "tablet"
          ? density === "minimal"
            ? 10
            : 18
          : density === "minimal"
            ? 12
            : density === "medium"
              ? 18
              : 26;

    let particles: DigitalParticle[] = [];

    const seed = () => {
      particles = Array.from({ length: count }, (_, idx) => {
        const depth = 0.4 + Math.random() * 0.85;
        const speedBase = (0.12 + Math.random() * 0.24) * depth;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx:
            direction === "up"
              ? (Math.random() - 0.5) * 0.12
              : direction === "drift"
                ? (Math.random() > 0.5 ? 1 : -1) * speedBase * 0.65
                : speedBase * 0.5,
          vy: -speedBase,
          size: 0.8 + depth * 0.9,
          depth,
          alpha: (isDark ? 0.16 : 0.28) + depth * 0.22,
          color: palette[idx % palette.length],
        };
      });
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

    const draw = (advance: boolean) => {
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      const px = (pointerRef?.current.nx ?? 0) * 14;
      const py = (pointerRef?.current.ny ?? 0) * 12;

      for (const p of particles) {
        if (advance) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -12) {
            p.y = height + 12;
            p.x = Math.random() * width;
          }
          if (p.x > width + 12) p.x = -12;
          if (p.x < -12) p.x = width + 12;
        }

        const drawX = p.x + px * p.depth;
        const drawY = p.y + py * p.depth;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 5 * p.depth;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    resize();
    draw(false);

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    if (!paused) {
      const tick = () => {
        draw(true);
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      observer.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [paused, isDark, deviceTier, density, direction, pointerRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
});

