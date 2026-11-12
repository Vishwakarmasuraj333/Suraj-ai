"use client";

import React from "react";
import { AuroraLayer } from "./AuroraLayer";
import { LightBeam } from "./LightBeam";
import { NeonGrid } from "./NeonGrid";
import { NeuralNetwork } from "./NeuralNetwork";
import { ParticleField } from "./ParticleField";
import { StarField } from "./StarField";
import { useMotionEnvironment, useSmoothPointer } from "./useMotionEnvironment";

export type BackgroundVariant =
  | "home"
  | "global"
  | "features"
  | "rag"
  | "memory"
  | "tools"
  | "architecture"
  | "pricing"
  | "faq"
  | "blog"
  | "footer";

interface AnimatedBackgroundProps {
  variant?: BackgroundVariant;
  fixed?: boolean;
  className?: string;
}

export const AnimatedBackground = React.memo(function AnimatedBackground({
  variant = "home",
  fixed = false,
  className = "",
}: AnimatedBackgroundProps) {
  const { paused, deviceTier, isTouchDevice } = useMotionEnvironment();
  const interactive =
    !paused &&
    !isTouchDevice &&
    deviceTier === "desktop" &&
    (variant === "home" || variant === "global" || variant === "features" || variant === "architecture");

  const { targetElementRef, pointerRef } = useSmoothPointer(interactive);

  const positioning = fixed ? "fixed inset-0 z-0" : "absolute inset-0 z-0";
  const isHome = variant === "home" || variant === "global";

  return (
    <div
      ref={targetElementRef}
      aria-hidden="true"
      data-bg-variant={variant}
      className={`pointer-events-none select-none overflow-hidden ${positioning} ${
        paused ? "bg-paused" : ""
      } ${className}`}
    >
      {/* Base midnight cosmic atmosphere (dark mode) / whisper-clean wash (light mode) */}
      {isHome && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_115%_80%_at_50%_-10%,rgba(6,182,212,0.08),transparent_55%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] dark:bg-[radial-gradient(ellipse_115%_80%_at_50%_-10%,rgba(14,116,144,0.18),transparent_58%),linear-gradient(180deg,#020511_0%,#05091a_48%,#030612_100%)]" />
      )}

      {/* Layer 1: Ambient Aurora */}
      {(isHome || variant === "pricing" || variant === "blog" || variant === "footer") && (
        <AuroraLayer
          variant={
            variant === "pricing"
              ? "pricing"
              : variant === "blog"
                ? "blog"
                : variant === "footer"
                  ? "footer"
                  : "hero"
          }
          paused={paused}
          interactive={interactive}
        />
      )}

      {/* Layer 4: Drifting Star Field + Shooting Stars */}
      {(isHome || variant === "blog") && (
        <StarField
          paused={paused}
          deviceTier={deviceTier}
          density={variant === "blog" ? "light" : "full"}
          enableShootingStars={variant !== "blog"}
          pointerRef={interactive ? pointerRef : undefined}
        />
      )}

      {/* Layer 2 & 3: Moving Neon Lines + Futuristic Perspective Grid */}
      {(isHome || variant === "tools" || variant === "architecture") && (
        <NeonGrid
          variant={
            variant === "tools"
              ? "tools"
              : variant === "architecture"
                ? "architecture"
                : "hero"
          }
          paused={paused}
          deviceTier={deviceTier}
          showPerspectiveFloor={isHome || variant === "tools"}
        />
      )}

      {/* Layer 6: Connected Neural Intelligence Network */}
      {(isHome ||
        variant === "features" ||
        variant === "rag" ||
        variant === "memory" ||
        variant === "architecture") && (
        <NeuralNetwork
          variant={
            variant === "features"
              ? "features"
              : variant === "rag"
                ? "rag"
                : variant === "memory"
                  ? "memory"
                  : variant === "architecture"
                    ? "architecture"
                    : "hero"
          }
          paused={paused}
          deviceTier={deviceTier}
          pointerRef={interactive ? pointerRef : undefined}
        />
      )}

      {/* Layer 5: Floating Luminous Digital Particles */}
      {(isHome ||
        variant === "rag" ||
        variant === "memory" ||
        variant === "pricing" ||
        variant === "faq" ||
        variant === "footer") && (
        <ParticleField
          paused={paused}
          deviceTier={deviceTier}
          density={
            isHome
              ? "medium"
              : "minimal"
          }
          direction={
            variant === "footer" || variant === "rag"
              ? "up"
              : variant === "faq"
                ? "drift"
                : "diagonal"
          }
          pointerRef={interactive ? pointerRef : undefined}
        />
      )}

      {/* Subtle architectural vignette so typography and UI cards remain crisp */}
      {isHome && (
        <div className="pointer-events-none absolute inset-0 dark:bg-[radial-gradient(ellipse_62%_50%_at_30%_34%,rgba(2,5,17,0.42),transparent_72%)]" />
      )}

      {/* Cinematic Moving Light Beams */}
      {(isHome ||
        variant === "features" ||
        variant === "rag" ||
        variant === "tools" ||
        variant === "architecture" ||
        variant === "faq") && (
        <LightBeam
          variant={
            isHome
              ? "hero"
              : variant === "rag"
                ? "rag"
                : "subtle"
          }
          paused={paused}
          deviceTier={deviceTier}
        />
      )}

      {/* Dedicated Memory Concentric Slow Glow Rings */}
      {variant === "memory" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="suraj-motion-el h-[260px] w-[260px] rounded-full border border-violet-400/20 sm:h-[340px] sm:w-[340px]"
            style={{ animation: paused ? "none" : "pulseRingExpand 9s ease-out infinite" }}
          />
          <div
            className="suraj-motion-el absolute h-[200px] w-[200px] rounded-full border border-cyan-400/20 sm:h-[270px] sm:w-[270px]"
            style={{ animation: paused ? "none" : "pulseRingExpand 9s ease-out 4.5s infinite" }}
          />
        </div>
      )}
    </div>
  );
});

