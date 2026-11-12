"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, KeyRound, Loader2, Sparkles, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Capabilities, ImageGenerateResponse } from "@/types";

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  capabilities: Capabilities | null;
  activeConversationId: string | null;
}

export function ImageStudioModal({
  isOpen,
  onClose,
  capabilities,
  activeConversationId,
}: ImageStudioModalProps) {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [size, setSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; missingKey?: boolean } | null>(null);
  const [result, setResult] = useState<ImageGenerateResponse | null>(null);

  const selectedProviderCap = capabilities?.image_providers.find((p) => p.id === provider);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.generateImage({
        prompt: prompt.trim(),
        provider,
        size,
        quality,
        conversation_id: activeConversationId || undefined,
      });
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.detail as Record<string, unknown> | null;
        const missingKey = detail?.code === "API_KEY_NOT_CONFIGURED";
        setError({ message: err.message, missingKey });
      } else {
        setError({ message: "Failed to generate image. Check backend connectivity." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0e131f]/95"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    SURaj AI Image Studio
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real API-backed image generation via OpenAI DALL-E 3 or Google Imagen 3.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Image Studio"
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedProviderCap && !selectedProviderCap.configured && (
              <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold">API Integration Pending ({selectedProviderCap.name})</p>
                  <p className="mt-0.5 opacity-90">
                    Set <code className="font-mono font-bold">{selectedProviderCap.required_env_var}</code> in{" "}
                    <code className="font-mono">backend/.env</code> to enable real image generation. No simulated images are used.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-3.5">
              <textarea
                rows={3}
                required
                minLength={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to create (e.g., 'Architectural render of a sunlit solar-powered glass library overlooking misty Himalayan mountains, photorealistic')"
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 outline-none focus:border-orange-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Provider
                  </label>
                  <select
                    aria-label="Image provider"
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value as "openai" | "gemini");
                      setError(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="openai">OpenAI DALL-E 3</option>
                    <option value="gemini">Google Imagen 3</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Aspect Ratio / Size
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as typeof size)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="1024x1024">Square (1024×1024)</option>
                    <option value="1792x1024">Landscape (1792×1024)</option>
                    <option value="1024x1792">Portrait (1024×1792)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Quality
                  </label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as typeof quality)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="standard">Standard</option>
                    <option value="hd">HD</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:brightness-105 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Generating Image..." : "Generate Image"}
              </button>
            </form>

            {error && (
              <div
                className={`mt-4 rounded-xl border p-3 text-xs ${
                  error.missingKey
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                }`}
              >
                {error.message}
              </div>
            )}

            {result?.image_base64 && (
              <div className="mt-5 space-y-2">
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.image_base64}
                    alt={result.prompt}
                    className="max-h-80 w-full bg-black/5 object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate">
                    {result.provider}/{result.model}
                  </span>
                  <a
                    href={result.image_base64}
                    download={`suraj-ai-${result.attachment_id || "generated"}.png`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-white"
                  >
                    <Download className="h-3.5 w-3.5" /> Download PNG
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

