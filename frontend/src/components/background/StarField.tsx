"use client";

import React, { useEffect, useRef } from "react";
import type { DeviceTier } from "./useMotionEnvironment";

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
  color: string;
  glow: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  alpha: number;
  color: string;
}

interface StarFieldProps {
  paused?: boolean;
  isDark?: boolean;
  deviceTier?: DeviceTier;
  density?: "full" | "medium" | "light";
  enableShootingStars?: boolean;
  pointerRef?: React.MutableRefObject<{ nx: number; ny: number }>;
}

const DARK_STAR_COLORS = ["#e0f2fe", "#22d3ee", "#60a5fa", "#a78bfa", "#f8fafc"];
const LIGHT_STAR_COLORS = ["#0891b2", "#2563eb", "#7c3aed", "#0284c7", "#c026d3"];

export const StarField = React.memo(function StarField({
  paused = false,
  isDark = true,
  deviceTier = "desktop",
  density = "full",
  enableShootingStars = true,
  pointerRef,
}: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = isDark ? DARK_STAR_COLORS : LIGHT_STAR_COLORS;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let nextShootAt = performance.now() + 2600;

    const baseCount =
      deviceTier === "mobile"
        ? density === "light"
          ? 14
          : 22
        : deviceTier === "tablet"
          ? density === "light"
            ? 22
            : 36
          : density === "light"
            ? 28
            : density === "medium"
              ? 42
              : 58;

    let stars: Star[] = [];
    const shooters: ShootingStar[] = [];

    const seedStars = () => {
      stars = Array.from({ length: baseCount }, (_, idx) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: -(0.03 + Math.random() * 0.11),
        vy: -(0.015 + Math.random() * 0.07),
        radius: idx % 10 === 0 ? 1.35 + Math.random() * 0.35 : 0.55 + Math.random() * 0.75,
        baseAlpha: (isDark ? 0.18 : 0.34) + Math.random() * 0.38,
        twinkleSpeed: 0.0008 + Math.random() * 0.002,
        phase: Math.random() * Math.PI * 2,
        color: palette[idx % palette.length],
        glow: idx % 7 === 0,
      }));
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
      seedStars();
    };

    const spawnShooter = () => {
      if (width < 200 || height < 200) return;
      const fromRight = Math.random() > 0.35;
      shooters.push({
        x: fromRight ? width * (0.45 + Math.random() * 0.5) : width * (0.1 + Math.random() * 0.4),
        y: height * (0.04 + Math.random() * 0.35),
        vx: fromRight ? -(5.2 + Math.random() * 3.0) : 5.2 + Math.random() * 3.0,
        vy: 2.3 + Math.random() * 1.6,
        length: 64 + Math.random() * 52,
        alpha: 0.95,
        color: Math.random() > 0.4 ? (isDark ? "#22d3ee" : "#0891b2") : (isDark ? "#c084fc" : "#7c3aed"),
      });
    };

    const renderFrame = (now: number, advance: boolean) => {
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      const px = pointerRef?.current.nx ?? 0;
      const py = pointerRef?.current.ny ?? 0;

      for (const s of stars) {
        if (advance) {
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < -8) s.x = width + 8;
          if (s.x > width + 8) s.x = -8;
          if (s.y < -8) s.y = height + 8;
          if (s.y > height + 8) s.y = -8;
        }

        const twinkle = 0.55 + 0.45 * Math.sin(now * s.twinkleSpeed + s.phase);
        const alpha = Math.min(0.95, Math.max(0.1, s.baseAlpha * twinkle));
        const depthOffset = s.radius * 4.5;
        const drawX = s.x + px * depthOffset;
        const drawY = s.y + py * depthOffset;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        if (s.glow) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = s.color;
        }
        ctx.beginPath();
        ctx.arc(drawX, drawY, s.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (advance && enableShootingStars && now >= nextShootAt) {
        spawnShooter();
        nextShootAt = now + (deviceTier === "mobile" ? 7500 : 4200 + Math.random() * 4800);
      }

      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        if (advance) {
          sh.x += sh.vx;
          sh.y += sh.vy;
          sh.alpha -= 0.015;
        }
        if (sh.alpha <= 0.02 || sh.x < -120 || sh.x > width + 120 || sh.y > height + 120) {
          shooters.splice(i, 1);
          continue;
        }
        const mag = Math.hypot(sh.vx, sh.vy) || 1;
        const tailX = sh.x - (sh.vx / mag) * sh.length;
        const tailY = sh.y - (sh.vy / mag) * sh.length;
        const grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
        grad.addColorStop(0, isDark ? `rgba(248, 250, 252, ${sh.alpha})` : `rgba(8, 145, 178, ${sh.alpha})`);
        grad.addColorStop(0.3, sh.color);
        grad.addColorStop(1, "rgba(34, 211, 238, 0)");

        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        ctx.restore();
      }
    };

    resize();
    renderFrame(performance.now(), false);

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    if (!paused) {
      const loop = (now: number) => {
        renderFrame(now, true);
        rafId = window.requestAnimationFrame(loop);
      };
      rafId = window.requestAnimationFrame(loop);
    }

    return () => {
      observer.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [paused, isDark, deviceTier, density, enableShootingStars, pointerRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
});

