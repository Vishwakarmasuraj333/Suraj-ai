"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError } from "@/lib/api";

type AuthTab = "login" | "signup" | "verify-otp" | "forgot" | "reset";

function getPasswordStrength(pw: string) {
  if (!pw) return { score: 0, label: "", bar: "bg-slate-600" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: "Weak — use 8+ chars with letters & digits", bar: "bg-rose-500" };
  if (score === 2) return { score: 2, label: "Moderate", bar: "bg-amber-400" };
  return { score: 3, label: "Strong", bar: "bg-emerald-400" };
}

export default function AuthPage() {
  const router = useRouter();
  const { user, loading: authLoading, setAuthenticatedUser, refreshUser, logout } = useAuth();

  const [tab, setTab] = useState<AuthTab>("login");
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(false);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [requestOtp, setRequestOtp] = useState(false);

  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Change password (logged in)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api
      .capabilities()
      .then((cap) => setSmtpConfigured(Boolean(cap.smtp_configured)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const strength = getPasswordStrength(password || newPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await api.login(email, password);
      setAuthenticatedUser(res.access_token, res.user);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }
    if (!acceptTerms) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.signup(email, fullName, password, {
        confirm_password: confirmPassword,
        accept_terms: acceptTerms,
        request_otp: requestOtp && smtpConfigured,
      });
      setAuthenticatedUser(res.access_token, res.user);
      if (res.email_verification_status === "otp_sent") {
        setCooldown(60);
        setTab("verify-otp");
        setNotice("Account created. Enter the 6-digit OTP sent to your email address.");
      } else {
        setNotice("Account created and signed in cleanly.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (purpose: "verify_email" | "reset_password") => {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await api.sendOtp(email.trim(), purpose);
      setCooldown(res.cooldown_seconds || 60);
      setNotice("Verification code dispatched to your inbox.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await api.verifyOtp(email.trim(), otp.trim(), "verify_email");
      await refreshUser();
      setNotice("Email verified successfully.");
      setOtp("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await api.forgotPassword(email.trim());
      setNotice(res.message);
      setCooldown(60);
      setTab("reset");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Password reset request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.resetPassword(email.trim(), otp.trim(), newPassword, confirmNewPassword);
      setNotice(res.message);
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTab("login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword !== confirmNewPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword, confirmNewPassword);
      setNotice(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        {!smtpConfigured && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">SMTP Email Delivery Not Configured</p>
              <p className="mt-0.5 opacity-90">
                Sign-in and account registration work directly today. Real email OTP delivery (`verify_email` / `reset_password`) returns `503 EMAIL_PROVIDER_NOT_CONFIGURED` until `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL` are configured in `backend/.env` — SURaj AI never fabricates OTP codes.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {!authLoading && user ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Account Profile Card */}
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    {user.full_name}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Role</span>
                  <span className="font-bold uppercase text-cyan-400">{user.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Email Verification</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      user.is_email_verified
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {user.is_email_verified ? "Verified" : "Unverified"}
                  </span>
                </div>
              </div>

              {!user.is_email_verified && (
                <div className="space-y-2.5 rounded-2xl border border-cyan-400/25 bg-cyan-500/5 p-4">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Verify Email with OTP
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!smtpConfigured || cooldown > 0 || submitting}
                      onClick={() => {
                        setEmail(user.email);
                        handleSendOtp("verify_email");
                      }}
                      className="rounded-xl border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-400 disabled:opacity-50"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Send OTP"}
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      setEmail(user.email);
                      handleVerifyOtp(e);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit OTP"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-white/10 dark:bg-slate-950"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-slate-950"
                    >
                      Verify
                    </button>
                  </form>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white"
                >
                  Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-300"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Admin Console
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-xl border border-rose-500/30 px-4 py-2 text-xs font-semibold text-rose-400"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="glass-card rounded-3xl p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Change Password
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Requires your current password and minimum 8 characters with letters and digits.
              </p>
              <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-md glass-card rounded-3xl p-6 sm:p-8">
            <h1 className="text-center text-2xl font-extrabold text-slate-900 dark:text-white">
              {tab === "login"
                ? "Sign In to SURaj AI"
                : tab === "signup"
                  ? "Create Your Account"
                  : tab === "verify-otp"
                    ? "Verify Email OTP"
                    : tab === "forgot"
                      ? "Forgot Password"
                      : "Reset Password"}
            </h1>

            <div className="my-5 grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-semibold dark:bg-white/[0.06]">
              {(["login", "signup", "forgot"] as AuthTab[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setTab(item);
                    setError(null);
                  }}
                  className={`rounded-lg py-2 capitalize transition ${
                    tab === item || (tab === "reset" && item === "forgot")
                      ? "bg-white text-slate-900 shadow dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {item === "forgot" ? "Reset" : item === "signup" ? "Sign Up" : "Sign In"}
                </button>
              ))}
            </div>

            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-950/70"
                  />
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-950/70"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-2.5 text-sm font-bold text-white"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign In
                </button>
              </form>
            )}

            {tab === "signup" && (
              <form onSubmit={handleSignup} className="space-y-3.5">
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-950/70"
                  />
                </div>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-950/70"
                  />
                </div>
                <div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (8+ chars, letter & digit)"
                      className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-950/70"
                    />
                  </div>
                  {password && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`h-1 flex-1 rounded-full ${
                              strength.score >= step ? strength.bar : "bg-slate-300 dark:bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500">{strength.label}</p>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-950/70"
                  />
                </div>
                {smtpConfigured && (
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={requestOtp}
                      onChange={(e) => setRequestOtp(e.target.checked)}
                    />
                    <span>Send 6-digit email verification OTP immediately</span>
                  </label>
                )}
                <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5"
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
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-2.5 text-sm font-bold text-white"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </button>
              </form>
            )}

            {tab === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your account email to receive a 6-digit password reset OTP via configured SMTP.
                </p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-2.5 text-sm font-bold text-white"
                >
                  Send Reset Code
                </button>
              </form>
            )}

            {tab === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
                />
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP code"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-slate-950/70"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-2.5 text-sm font-bold text-white"
                >
                  Confirm Password Reset
                </button>
              </form>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
