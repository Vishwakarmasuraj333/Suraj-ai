"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { User, UserMemory } from "@/types";

interface MemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onOpenAuth: () => void;
}

const CATEGORIES: Array<{ id: UserMemory["category"]; label: string }> = [
  { id: "preference", label: "Preference" },
  { id: "project", label: "Project" },
  { id: "fact", label: "Fact" },
  { id: "instruction", label: "Instruction" },
];

export function MemoryDrawer({ isOpen, onClose, user, onOpenAuth }: MemoryDrawerProps) {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<UserMemory["category"]>("preference");

  useEffect(() => {
    if (!isOpen || !user) return;
    setLoading(true);
    setError(null);
    api
      .listMemories()
      .then(setMemories)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load memories."))
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.createMemory({
        title: title.trim(),
        content: content.trim(),
        category,
      });
      setMemories((prev) => [created, ...prev]);
      setTitle("");
      setContent("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save memory.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (mem: UserMemory) => {
    try {
      const updated = await api.updateMemory(mem.id, { is_active: !mem.is_active });
      setMemories((prev) => prev.map((m) => (m.id === mem.id ? updated : m)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update memory.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete memory.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#070c1b]/95"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-400/30">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Persistent AI Memory
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Active items are injected into your assistant system prompt.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close memory panel"
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!user ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <Brain className="h-10 w-10 text-cyan-400/70" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sign in to manage long-term memory
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Memories are stored per user account with strict privacy isolation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleCreate}
                  className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Add New Memory
                    </span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as UserMemory["category"])}
                      aria-label="Memory category"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (e.g. Coding stack preference)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
                  />
                  <textarea
                    required
                    minLength={2}
                    maxLength={2000}
                    rows={2}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Memory detail (e.g. Prefer TypeScript examples and concise architecture notes)"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Save Memory Item
                  </button>
                </form>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Saved Memories ({memories.length})</span>
                    <span>Toggle active state anytime</span>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8 text-xs text-slate-400">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading memories...
                    </div>
                  ) : memories.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                      No saved memory entries yet. Create one above to personalize AI conversations across sessions.
                    </p>
                  ) : (
                    memories.map((mem) => (
                      <div
                        key={mem.id}
                        className={`rounded-2xl border p-3 transition ${
                          mem.is_active
                            ? "border-cyan-500/30 bg-cyan-500/[0.04]"
                            : "border-slate-200/70 opacity-65 dark:border-white/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                {mem.title}
                              </span>
                              <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                {mem.category}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                              {mem.content}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggle(mem)}
                              title={mem.is_active ? "Disable memory" : "Enable memory"}
                              className={`rounded-lg p-1.5 text-xs transition ${
                                mem.is_active
                                  ? "bg-cyan-500/20 text-cyan-400"
                                  : "bg-slate-200 text-slate-500 dark:bg-white/10"
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(mem.id)}
                              title="Delete memory"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
