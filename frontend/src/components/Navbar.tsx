"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  LogOut,
  Menu,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  User as UserIcon,
  X,
} from "lucide-react";
import { SurajLogo } from "@/components/SurajLogo";
import { useAuth } from "@/components/AuthProvider";
import { useTheme, type ThemeMode } from "@/components/ThemeProvider";

interface NavItem {
  label: string;
  href: string;
  sectionId?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Features", href: "/#features", sectionId: "features" },
  { label: "Knowledge RAG", href: "/#knowledge-rag", sectionId: "knowledge-rag" },
  { label: "AI Memory", href: "/#ai-memory", sectionId: "ai-memory" },
  { label: "AI Tools", href: "/#ai-tools", sectionId: "ai-tools" },
  { label: "Blogs", href: "/blog" },
  { label: "Pricing", href: "/#pricing", sectionId: "pricing" },
  { label: "FAQ", href: "/#faq", sectionId: "faq" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 18);
      if (pathname !== "/") return;

      const ids = ["features", "knowledge-rag", "ai-memory", "ai-tools", "pricing", "faq"];
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160 && rect.bottom >= 120) {
            current = id;
          }
        }
      }
      setActiveSection(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const cycleTheme = () => {
    const order: ThemeMode[] = ["dark", "light", "system"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const isItemActive = (item: NavItem) => {
    if (item.href === "/blog" && pathname.startsWith("/blog")) return true;
    if (item.href === "/pricing" && pathname.startsWith("/pricing")) return true;
    if (pathname === "/" && item.sectionId && activeSection === item.sectionId) return true;
    return false;
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-lg shadow-slate-950/5 dark:border-cyan-400/15 dark:bg-[#040712]/85 dark:shadow-cyan-950/20"
          : "border-b border-transparent bg-transparent backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* LEFT: SURaj AI Logo */}
        <Link href="/" className="shrink-0 focus:outline-none">
          <SurajLogo size={36} />
        </Link>

        {/* CENTER: Primary Navigation */}
        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-cyan-600 dark:text-cyan-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-cyan-300"
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-transform duration-200 origin-left ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* RIGHT: Theme Toggle + Auth + Launch App */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            aria-label={`Switch theme (current: ${theme})`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-700 transition hover:border-cyan-400/40 hover:text-cyan-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300"
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : theme === "light" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
          </button>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1 rounded-xl border border-violet-500/35 bg-violet-500/10 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-500/20 dark:text-violet-300"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-500/20 dark:text-cyan-300"
              >
                Dashboard
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                <UserIcon className="h-3.5 w-3.5 text-cyan-400" />
                <span className="max-w-[96px] truncate">{user.full_name}</span>
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                title="Sign out"
                aria-label="Sign out"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-600 hover:text-rose-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="hidden rounded-xl border border-slate-300/80 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400/50 hover:text-cyan-600 dark:border-white/15 dark:text-slate-200 dark:hover:border-cyan-400/50 dark:hover:text-cyan-300 sm:inline-flex"
            >
              Sign In
            </Link>
          )}

          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 sm:px-4 sm:text-sm"
          >
            <span>Launch App</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Animated Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-[#050918]/95 lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-cyan-500/10 hover:text-cyan-600 dark:text-slate-200 dark:hover:text-cyan-300"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-cyan-500/10 dark:text-slate-200"
              >
                Full Billing & Plans
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-cyan-500/10 dark:text-slate-200"
              >
                Contact
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3 dark:border-white/10">
                {user ? (
                  <>
                    <Link
                      href="/auth"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold dark:border-white/15"
                    >
                      Account ({user.full_name})
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-xl bg-violet-600/20 px-3 py-2 text-sm font-semibold text-violet-300"
                      >
                        Admin
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="rounded-xl border border-rose-500/30 px-3 py-2 text-sm font-semibold text-rose-400"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold dark:border-white/15"
                  >
                    Sign In / Create Account
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
