"use client";

import { useEffect, useRef, useState } from "react";

export type DeviceTier = "desktop" | "tablet" | "mobile";

export interface MotionEnvironment {
  prefersReducedMotion: boolean;
  isPageVisible: boolean;
  deviceTier: DeviceTier;
  isTouchDevice: boolean;
  paused: boolean;
}

export function useMotionEnvironment(): MotionEnvironment {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [deviceTier, setDeviceTier] = useState<DeviceTier>("desktop");
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchMq = window.matchMedia("(pointer: coarse)");

    const updateTier = () => {
      const w = window.innerWidth;
      if (w < 768) {
        setDeviceTier("mobile");
      } else if (w < 1200) {
        setDeviceTier("tablet");
      } else {
        setDeviceTier("desktop");
      }
    };

    setPrefersReducedMotion(motionMq.matches);
    setIsTouchDevice(touchMq.matches);
    setIsPageVisible(document.visibilityState !== "hidden");
    updateTier();

    const onMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    const onTouchChange = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    const onVisibilityChange = () => setIsPageVisible(document.visibilityState !== "hidden");

    motionMq.addEventListener("change", onMotionChange);
    touchMq.addEventListener("change", onTouchChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", updateTier, { passive: true });

    return () => {
      motionMq.removeEventListener("change", onMotionChange);
      touchMq.removeEventListener("change", onTouchChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", updateTier);
    };
  }, []);

  return {
    prefersReducedMotion,
    isPageVisible,
    deviceTier,
    isTouchDevice,
    paused: prefersReducedMotion || !isPageVisible,
  };
}

/**
 * Smoothly tracks cursor position in normalized coordinates (-1..1) inside a ref
 * and optionally updates CSS custom properties (`--mx`, `--my`, `--px`, `--py`) on
 * a target DOM element via requestAnimationFrame with zero React re-renders.
 */
export function useSmoothPointer(enabled: boolean) {
  const targetElementRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({
    nx: 0,
    ny: 0,
    targetX: 0,
    targetY: 0,
    active: false,
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let rafId = 0;

    const onPointerMove = (e: PointerEvent) => {
      const vw = Math.max(window.innerWidth, 1);
      const vh = Math.max(window.innerHeight, 1);
      pointerRef.current.targetX = (e.clientX / vw) * 2 - 1;
      pointerRef.current.targetY = (e.clientY / vh) * 2 - 1;
      pointerRef.current.active = true;
    };

    const tick = () => {
      const p = pointerRef.current;
      p.nx += (p.targetX - p.nx) * 0.06;
      p.ny += (p.targetY - p.ny) * 0.06;

      const el = targetElementRef.current;
      if (el) {
        el.style.setProperty("--mx", `${(p.nx * 24).toFixed(2)}px`);
        el.style.setProperty("--my", `${(p.ny * 18).toFixed(2)}px`);
        el.style.setProperty("--px", `${(50 + p.nx * 22).toFixed(2)}%`);
        el.style.setProperty("--py", `${(42 + p.ny * 20).toFixed(2)}%`);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  return { targetElementRef, pointerRef };
}

