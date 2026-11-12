"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CreditCard, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnimatedBackground } from "@/components/background";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError } from "@/lib/api";
import type { BillingStatusResponse, PlanTierInfo } from "@/types";

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanTierInfo[]>([]);
  const [stripeReady, setStripeReady] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api
      .listPlans()
      .then((res) => {
        setPlans(res.plans);
        setStripeReady(res.stripe_configured);
        setRazorpayReady(res.razorpay_configured);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    api
      .billingStatus()
      .then(setBillingStatus)
      .catch(() => {});
  }, [user]);

  const handleCheckout = async (planId: PlanTierInfo["id"]) => {
    setMessage(null);
    if (planId === "enterprise") {
      window.location.href = "/contact";
      return;
    }
    if (!user) {
      setMessage({ ok: false, text: "Please sign in first to select or manage a workspace plan." });
      return;
    }
    setLoadingPlan(planId);
    try {
      const res = await api.createCheckout({
        plan_tier: planId,
        billing_cycle: cycle,
        provider: stripeReady ? "stripe" : razorpayReady ? "razorpay" : undefined,
      });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      setMessage({ ok: true, text: res.message || `Plan updated to ${res.plan_tier}.` });
      const fresh = await api.billingStatus();
      setBillingStatus(fresh);
    } catch (err) {
      setMessage({
        ok: false,
        text:
          err instanceof ApiError
            ? err.message
            : "Payment checkout blocked until payment gateway credentials are configured.",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="relative isolate min-h-screen flex flex-col">
      <AnimatedBackground variant="pricing" fixed />
      <Navbar />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
            <CreditCard className="h-3.5 w-3.5" /> Subscription & Quotas
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Proposed workspace tiers aligned with enforceable server-side token and RPM quotas.
          </p>

          <div className="mt-6 inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.04]">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold ${
                cycle === "monthly" ? "bg-cyan-500 text-slate-950" : "text-slate-500 dark:text-slate-300"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("yearly")}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold ${
                cycle === "yearly" ? "bg-cyan-500 text-slate-950" : "text-slate-500 dark:text-slate-300"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {!stripeReady && !razorpayReady && (
          <div className="mx-auto mt-8 flex max-w-3xl items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">Payment Gateways Not Configured (Honest Status)</p>
              <p className="mt-0.5 opacity-90">
                Listed paid prices are proposed product tiers. Paid checkout requests return `503 PAYMENT_GATEWAY_NOT_CONFIGURED` until `STRIPE_SECRET_KEY` or `RAZORPAY_KEY_ID` is configured — we never simulate payment success.
              </p>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`mx-auto mt-5 max-w-3xl rounded-2xl border px-4 py-3 text-xs font-medium ${
              message.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {billingStatus && (
          <div className="mx-auto mt-6 max-w-3xl glass-card rounded-2xl p-4 text-xs flex flex-wrap items-center justify-between gap-2">
            <span>
              Current Active Plan:{" "}
              <strong className="uppercase text-cyan-400">
                {billingStatus.subscription.plan_tier}
              </strong>{" "}
              ({billingStatus.subscription.billing_cycle} • {billingStatus.subscription.status})
            </span>
            <Link href="/chat" className="font-semibold text-cyan-400 hover:underline">
              Launch Workspace →
            </Link>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const price =
              plan.monthly_price_usd === null
                ? "Custom"
                : cycle === "monthly"
                  ? `$${plan.monthly_price_usd}`
                  : `$${Math.round((plan.yearly_price_usd || 0) / 12)}`;
            const isCurrent = billingStatus?.subscription.plan_tier === plan.id;
            return (
              <div
                key={plan.id}
                className={`glass-card flex flex-col justify-between rounded-3xl p-6 ${
                  plan.id === "pro" ? "border-cyan-400/50 ring-1 ring-cyan-400/30" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h2>
                    {plan.id === "pro" && (
                      <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                        POPULAR
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {price}
                    </span>
                    {price !== "Custom" && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">/month</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{plan.tagline}</p>

                  <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2.5 text-[11px] dark:border-white/10 dark:bg-white/[0.03]">
                    <div>Daily Limit: {plan.daily_token_limit.toLocaleString()} tokens</div>
                    <div>Throughput: {plan.rpm_limit} requests/min</div>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-slate-700 dark:text-slate-200">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={loadingPlan === plan.id || isCurrent}
                  onClick={() => handleCheckout(plan.id)}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {loadingPlan === plan.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCurrent
                    ? "Current Plan"
                    : plan.id === "enterprise"
                      ? "Contact Sales"
                      : plan.id === "free"
                        ? "Activate Free Tier"
                        : `Select ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}

