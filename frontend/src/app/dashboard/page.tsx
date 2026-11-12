"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Brain,
  Calculator,
  CreditCard,
  FileText,
  Loader2,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnimatedBackground } from "@/components/background";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError } from "@/lib/api";
import type {
  AttachmentSummary,
  BillingStatusResponse,
  UsageSummary,
  UserMemory,
} from "@/types";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [files, setFiles] = useState<AttachmentSummary[]>([]);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [tools, setTools] = useState<
    Array<{ id: string; name: string; status: string; implemented: boolean }>
  >([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AST Calculator widget state
  const [expr, setExpr] = useState("sqrt(144) + (25 * 4)");
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    api
      .toolsStatus()
      .then(setTools)
      .catch(() => {});

    if (authLoading) return;
    if (!user) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    Promise.all([
      api.usageSummary(),
      api.billingStatus(),
      api.listFiles(),
      api.listMemories(),
    ])
      .then(([u, b, f, m]) => {
        setUsage(u);
        setBilling(b);
        setFiles(f);
        setMemories(m);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load dashboard telemetry.");
      })
      .finally(() => setLoadingData(false));
  }, [user, authLoading]);

  const handleDeleteFile = async (id: string, filename: string) => {
    if (!window.confirm(`Delete uploaded document "${filename}" permanently?`)) return;
    try {
      await api.deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete file.");
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalcError(null);
    setCalcResult(null);
    setCalculating(true);
    try {
      const res = await api.calculate(expr);
      setCalcResult(`${res.expression} = ${res.result}`);
    } catch (err) {
      setCalcError(err instanceof ApiError ? err.message : "Calculation failed.");
    } finally {
      setCalculating(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LoadingScreen label="Loading User Workspace Dashboard..." />
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative isolate min-h-screen flex flex-col">
        <AnimatedBackground variant="global" fixed />
        <Navbar />
        <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-16">
          <div className="glass-card max-w-md rounded-3xl p-8 text-center">
            <UserIcon className="mx-auto h-10 w-10 text-cyan-400" />
            <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              Sign In to View Your Dashboard
            </h1>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Inspect real token usage, uploaded RAG documents, active memory items, and subscription quotas.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/auth"
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white"
              >
                Sign In / Create Account
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold dark:border-white/15"
              >
                Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const quotaPct = usage
    ? Math.min(100, Math.round((usage.today_tokens / Math.max(1, usage.daily_token_limit)) * 100))
    : 0;

  return (
    <div className="relative isolate min-h-screen flex flex-col">
      <AnimatedBackground variant="global" fixed />
      <Navbar />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 py-10 space-y-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              Welcome back, {user.full_name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user.email} • Email Status:{" "}
              <strong className={user.is_email_verified ? "text-emerald-400" : "text-amber-400"}>
                {user.is_email_verified ? "Verified" : "Pending OTP Verification"}
              </strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 py-2 text-xs font-bold text-white"
            >
              Open AI Workspace <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/auth"
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-white/15"
            >
              Security & Password
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Usage & Subscription KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Active Subscription</span>
              <CreditCard className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold uppercase text-slate-900 dark:text-white">
              {billing?.subscription.plan_tier || "free"}
            </p>
            <Link href="/pricing" className="mt-1 inline-block text-[11px] font-semibold text-cyan-400 hover:underline">
              Manage Plan →
            </Link>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Today Token Quota</span>
              <Activity className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {(usage?.today_tokens ?? 0).toLocaleString()}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${quotaPct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {quotaPct}% of {(usage?.daily_token_limit ?? 0).toLocaleString()} daily tokens
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Uploaded RAG Files</span>
              <FileText className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {files.length}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">User-isolated document store</p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Persistent Memories</span>
              <Brain className="h-4 w-4 text-violet-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {memories.filter((m) => m.is_active).length} / {memories.length}
            </p>
            <Link href="/chat?tool=memory" className="mt-1 inline-block text-[11px] font-semibold text-cyan-400 hover:underline">
              Edit Memories in Workspace →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Knowledge RAG Document Management */}
          <div className="glass-card rounded-3xl p-6 lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Knowledge RAG Documents ({files.length})
              </h2>
              <Link href="/chat?tool=rag" className="text-xs font-semibold text-cyan-400 hover:underline">
                Upload New Document →
              </Link>
            </div>
            {files.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-white/10">
                No documents uploaded yet. Upload PDF, CSV, XLSX, JSON, TXT, or code files in `/chat` to query them with RAG citations.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {f.filename}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {f.kind.toUpperCase()} • {(f.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(f.id, f.filename)}
                      aria-label={`Delete ${f.filename}`}
                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/15"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validated AST Math Calculator + Real Tool Status */}
          <div className="glass-card rounded-3xl p-6 space-y-5 lg:col-span-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Calculator className="h-4 w-4 text-cyan-400" />
                AST Math Calculator Tool
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Validated backend expression evaluator (`POST /api/v1/tools/calculate`).
              </p>
              <form onSubmit={handleCalculate} className="mt-3 flex gap-2">
                <input
                  type="text"
                  required
                  value={expr}
                  onChange={(e) => setExpr(e.target.value)}
                  placeholder="e.g. sqrt(144) + 2**5"
                  className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  disabled={calculating}
                  className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs font-bold text-white"
                >
                  {calculating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Eval
                </button>
              </form>
              {calcResult && (
                <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-mono text-xs text-emerald-400">
                  {calcResult}
                </div>
              )}
              {calcError && (
                <div className="mt-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                  {calcError}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200/70 pt-4 dark:border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tool Availability Matrix
              </h3>
              <div className="mt-2.5 space-y-1.5 text-xs">
                {tools.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        t.status === "configured"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : t.status === "blocked_missing_api_key"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-slate-500/15 text-slate-400"
                      }`}
                    >
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

