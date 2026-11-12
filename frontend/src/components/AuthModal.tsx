"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Lock, Mail, User as UserIcon, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PasswordInput } from "./PasswordInput";
import { SurajLogo } from "./SurajLogo";
import type { AuthResponse } from "@/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAuthenticated: (auth: AuthResponse) => void;
  allowClose?: boolean;
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-slate-600" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: "Weak — add letters & digits (8+ chars)", color: "bg-rose-500" };
  if (score === 2) return { score: 2, label: "Good", color: "bg-amber-400" };
  return { score: 3, label: "Strong", color: "bg-emerald-400" };
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthenticated,
  allowClose = true,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setAcceptTerms(true);
      setError(null);
    }
  }, [isOpen]);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Password and confirm password do not match.");
        return;
      }
      if (!acceptTerms) {
        setError("Please accept the Terms of Service and Privacy Policy.");
        return;
      }
    }

    setLoading(true);
    try {
      const res =
        mode === "signup"
          ? await api.signup(email, fullName, password, {
              confirm_password: confirmPassword,
              accept_terms: acceptTerms,
            })
          : await api.login(email, password);
      onAuthenticated(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to reach backend server. Ensure FastAPI is running on port 8000.");
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
            onClick={allowClose ? onClose : undefined}
            className="fixed inset-0 bg-black/65 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl dark:border-cyan-400/20 dark:bg-[#070b18]/95 sm:p-8"
          >
            {allowClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close authentication modal"
                className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <div className="mb-6 flex flex-col items-center text-center">
              <SurajLogo size={42} showWordmark={false} />
              <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                {mode === "login" ? "Sign in to SURaj AI" : "Create your SURaj AI account"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Persist conversations, Knowledge RAG uploads, long-term memory, and usage securely.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`rounded-lg py-2 transition ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`rounded-lg py-2 transition ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "signup" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-slate-200 bg-white/70 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full rounded-xl border border-slate-200 bg-white/70 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Password
                </label>
                <PasswordInput
                  required
                  minLength={mode === "signup" ? 8 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  placeholder={mode === "signup" ? "At least 8 chars (letter + digit)" : "Enter your password"}
                />
                {mode === "signup" && password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`h-1 flex-1 rounded-full ${
                            strength.score >= step ? strength.color : "bg-slate-200 dark:bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{strength.label}</p>
                  </div>
                )}
              </div>

              {mode === "signup" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Confirm Password
                    </label>
                    <PasswordInput
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={<Check className="h-4 w-4" />}
                      placeholder="Re-enter password"
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>
                      I accept the{" "}
                      <Link href="/legal#terms" className="text-cyan-400 underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/legal#privacy" className="text-cyan-400 underline">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "Sign In" : "Create Account"}
              </button>

              <div className="pt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                <Link href="/auth" className="text-cyan-400 hover:underline">
                  Need Email OTP Verification or Forgot Password?
                </Link>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
