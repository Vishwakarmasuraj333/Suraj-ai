"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Database,
  KeyRound,
  LogOut,
  Save,
  Sliders,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Capabilities, UsageSummary, User, UserPreferences } from "@/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  preferences: UserPreferences | null;
  capabilities: Capabilities | null;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  onLogout: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  user,
  preferences,
  capabilities,
  onUpdatePreferences,
  onLogout,
}: SettingsModalProps) {
  const [tab, setTab] = useState<"general" | "integrations" | "usage">("general");
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [theme, setTheme] = useState<"dark" | "light" | "system">(
    preferences?.theme || "dark"
  );
  const [preferredLanguage, setPreferredLanguage] = useState(
    preferences?.preferred_language || "auto"
  );
  const [defaultProvider, setDefaultProvider] = useState(
    preferences?.default_provider || "openai"
  );
  const [defaultModel, setDefaultModel] = useState(
    preferences?.default_model || "gpt-4o-mini"
  );
  const [temperature, setTemperature] = useState(preferences?.temperature ?? 0.7);
  const [systemInstructions, setSystemInstructions] = useState(
    preferences?.system_instructions || ""
  );

  useEffect(() => {
    if (preferences) {
      setTheme(preferences.theme);
      setPreferredLanguage(preferences.preferred_language);
      setDefaultProvider(preferences.default_provider);
      setDefaultModel(preferences.default_model);
      setTemperature(preferences.temperature);
      setSystemInstructions(preferences.system_instructions || "");
    }
  }, [preferences]);

  useEffect(() => {
    if (isOpen && tab === "usage" && user) {
      api
        .usageSummary()
        .then(setUsage)
        .catch(() => {});
    }
  }, [isOpen, tab, user]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdatePreferences({
        theme,
        preferred_language: preferredLanguage,
        default_provider: defaultProvider,
        default_model: defaultModel,
        temperature,
        system_instructions: systemInstructions,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const selectedProviderModels =
    capabilities?.llm_providers.find((p) => p.id === defaultProvider)?.models ||
    (defaultProvider === "gemini"
      ? ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"]
      : defaultProvider === "anthropic"
        ? ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"]
        : ["gpt-4o-mini", "gpt-4o"]);

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
            className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0e131f]/95"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Workspace Settings & Integrations
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage preferences, inspect real backend API integrations, and track token usage.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200/80 px-6 py-2.5 text-xs font-semibold dark:border-white/10">
              {[
                { id: "general", label: "Preferences", icon: Sliders },
                { id: "integrations", label: "API Integrations", icon: KeyRound },
                { id: "usage", label: "Usage & Limits", icon: Activity },
              ].map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id as typeof tab)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 transition ${
                      active
                        ? "bg-orange-500/15 text-orange-600 dark:text-orange-300"
                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === "general" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Theme
                      </label>
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value as "dark" | "light" | "system")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="system">System</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Preferred Response Language
                      </label>
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="auto">Auto (Match User Language)</option>
                        <option value="English">English</option>
                        <option value="Hindi">हिन्दी (Hindi)</option>
                        <option value="Hinglish">Hinglish</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Default LLM Provider
                      </label>
                      <select
                        value={defaultProvider}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDefaultProvider(next);
                          const models =
                            capabilities?.llm_providers.find((p) => p.id === next)?.models || [];
                          if (models[0]) setDefaultModel(models[0]);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="openai">OpenAI / Compatible</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="anthropic">Anthropic Claude</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Default Model
                      </label>
                      <select
                        value={defaultModel}
                        onChange={(e) => setDefaultModel(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      >
                        {selectedProviderModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>Creativity (Temperature)</span>
                      <span className="font-mono text-orange-500">{temperature.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Custom System Instructions
                    </label>
                    <textarea
                      rows={3}
                      value={systemInstructions}
                      onChange={(e) => setSystemInstructions(e.target.value)}
                      placeholder="Optional persistent instructions (e.g., 'Always include TypeScript types and time complexity analysis')."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {!user && (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-700 dark:text-amber-300">
                      Sign in to save preferences to your account.
                    </p>
                  )}

                  {saveError && (
                    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-300">
                      {saveError}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {user && (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Sign Out
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !user}
                      className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/20 hover:brightness-105 disabled:opacity-50"
                    >
                      {savedNotice ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {savedNotice ? "Saved" : saving ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </div>
              )}

              {tab === "integrations" && capabilities && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Database ({capabilities.database_type.toUpperCase()})
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Stores Users, Conversations, Messages, Attachments, Preferences & Usage
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        capabilities.database_connected
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-rose-500/15 text-rose-500"
                      }`}
                    >
                      {capabilities.database_connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      LLM Providers (Configured via backend/.env)
                    </h3>
                    <div className="space-y-2.5">
                      {capabilities.llm_providers.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200/80 p-3.5 dark:border-white/10"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Env var:{" "}
                              <code className="font-mono text-orange-500">
                                {p.required_env_var}
                              </code>{" "}
                              · Models: {p.models.join(", ")}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              p.configured
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-amber-500/15 text-amber-500"
                            }`}
                          >
                            {p.configured ? "Active" : "API Key Required"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Image Generation Providers
                    </h3>
                    <div className="space-y-2">
                      {capabilities.image_providers.map((ip) => (
                        <div
                          key={ip.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200/80 p-3.5 dark:border-white/10"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {ip.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Env var:{" "}
                              <code className="font-mono text-orange-500">
                                {ip.required_env_var}
                              </code>
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              ip.configured
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-amber-500/15 text-amber-500"
                            }`}
                          >
                            {ip.configured ? "Active" : "API Key Required"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "usage" && (
                <div className="space-y-4">
                  {!user ? (
                    <p className="text-sm text-slate-500">Sign in to view your usage records.</p>
                  ) : !usage ? (
                    <p className="text-sm text-slate-400">Loading usage summary...</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          { label: "Total Requests", value: usage.total_requests },
                          { label: "Total Tokens", value: usage.total_tokens.toLocaleString() },
                          {
                            label: "Today's Tokens",
                            value: `${usage.today_tokens.toLocaleString()} / ${usage.daily_token_limit.toLocaleString()}`,
                          },
                          { label: "Generated Images", value: usage.total_images },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {stat.label}
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Recent Usage Records
                        </h3>
                        {usage.recent_records.length === 0 ? (
                          <p className="text-xs text-slate-400">No API calls recorded yet.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100/80 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                                <tr>
                                  <th className="px-3 py-2">Action</th>
                                  <th className="px-3 py-2">Model</th>
                                  <th className="px-3 py-2">Tokens</th>
                                  <th className="px-3 py-2">Latency</th>
                                  <th className="px-3 py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {usage.recent_records.map((r) => (
                                  <tr
                                    key={r.id}
                                    className="border-t border-slate-200/60 dark:border-white/5"
                                  >
                                    <td className="px-3 py-2 font-medium">{r.action_type}</td>
                                    <td className="px-3 py-2 font-mono text-[11px]">
                                      {r.provider}/{r.model}
                                    </td>
                                    <td className="px-3 py-2">{r.total_tokens}</td>
                                    <td className="px-3 py-2">{r.latency_ms}ms</td>
                                    <td className="px-3 py-2">{r.status}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

