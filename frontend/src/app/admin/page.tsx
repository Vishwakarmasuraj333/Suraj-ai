"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  FilePlus2,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import { LoadingScreen } from "@/components/LoadingScreen";
import { api, ApiError } from "@/lib/api";
import type {
  AdminLogEntry,
  AdminOverview,
  BlogPost,
  ContactSubmission,
  User,
} from "@/types";

type AdminTab = "overview" | "users" | "blog" | "contacts" | "logs";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("overview");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Blog CMS form
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("AI Engineering");
  const [tagsText, setTagsText] = useState("architecture, rag");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [savingPost, setSavingPost] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, usr, pst, cats, ctc, lgs] = await Promise.all([
        api.adminOverview(),
        api.adminListUsers(),
        api.adminListBlogPosts(),
        api.listBlogCategories(),
        api.adminContacts(),
        api.adminLogs(80),
      ]);
      setOverview(ov);
      setUsers(usr);
      setPosts(pst);
      setCategories(cats);
      if (cats[0]) setCategory(cats[0]);
      setContacts(ctc);
      setLogs(lgs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Admin verification failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") {
      setLoading(false);
      return;
    }
    loadAll();
  }, [user, authLoading]);

  const handleToggleUserActive = async (u: User) => {
    try {
      const updated = await api.adminUpdateUser(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update user.");
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPost(true);
    setError(null);
    try {
      const created = await api.adminCreateBlogPost({
        title,
        excerpt,
        content,
        category,
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status,
      });
      setPosts((prev) => [created, ...prev]);
      setTitle("");
      setExcerpt("");
      setContent("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish blog article.");
    } finally {
      setSavingPost(false);
    }
  };

  const handleTogglePostStatus = async (p: BlogPost) => {
    try {
      const updated = await api.adminUpdateBlogPost(p.id, {
        status: p.status === "published" ? "draft" : "published",
      });
      setPosts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update article status.");
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await api.adminDeleteBlogPost(id);
      setPosts((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete post.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LoadingScreen label="Verifying Admin RBAC Permissions..." />
        <Footer />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="glass-card max-w-md rounded-3xl p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" />
            <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              Admin Authorization Required
            </h1>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              All `/api/v1/admin/*` routes enforce server-side `user.role === &quot;admin&quot;` verification (`HTTP 403` for non-admin sessions).
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/auth"
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white"
              >
                Sign In
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-white/15"
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400 ring-1 ring-violet-400/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                SURaj AI Admin Console
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server-verified admin session: {user.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["overview", "users", "blog", "contacts", "logs"] as AdminTab[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition ${
                  tab === item
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "border border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        {tab === "overview" && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Total Users", value: overview.counts.users, icon: Users },
                { label: "Conversations", value: overview.counts.conversations, icon: Activity },
                { label: "Blog Articles", value: overview.counts.blog_posts, icon: FilePlus2 },
                { label: "Contact Inquiries", value: overview.counts.contact_submissions, icon: Mail },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{stat.label}</span>
                      <Icon className="h-4 w-4 text-cyan-400" />
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="glass-card rounded-3xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Real Integration Configuration Status
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
                  SMTP Email:{" "}
                  <strong className={overview.integrations.smtp_configured ? "text-emerald-400" : "text-amber-400"}>
                    {overview.integrations.smtp_configured ? "Configured" : "Not Configured"}
                  </strong>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
                  Stripe Checkout:{" "}
                  <strong className={overview.integrations.stripe_configured ? "text-emerald-400" : "text-amber-400"}>
                    {overview.integrations.stripe_configured ? "Configured" : "Not Configured"}
                  </strong>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
                  Razorpay:{" "}
                  <strong className={overview.integrations.razorpay_configured ? "text-emerald-400" : "text-amber-400"}>
                    {overview.integrations.razorpay_configured ? "Configured" : "Not Configured"}
                  </strong>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
                  Cache / Rate Limit:{" "}
                  <strong className="text-cyan-400">{overview.integrations.redis_status}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="glass-card overflow-x-auto rounded-3xl p-5">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-slate-200/70 text-slate-500 dark:border-white/10">
                <tr>
                  <th className="py-2.5">Name</th>
                  <th className="py-2.5">Email</th>
                  <th className="py-2.5">Role</th>
                  <th className="py-2.5">Verified</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 font-semibold">{u.full_name}</td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3 uppercase text-cyan-400">{u.role}</td>
                    <td className="py-3">{u.is_email_verified ? "Yes" : "No"}</td>
                    <td className="py-3">{u.is_active ? "Active" : "Disabled"}</td>
                    <td className="py-3 text-right">
                      {u.id !== user.id && (
                        <button
                          type="button"
                          onClick={() => handleToggleUserActive(u)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold dark:border-white/15"
                        >
                          {u.is_active ? "Disable" : "Enable"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "blog" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form onSubmit={handleCreatePost} className="glass-card rounded-3xl p-6 space-y-3 lg:col-span-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Create Blog Article
              </h2>
              <input
                type="text"
                required
                minLength={4}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-950"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-950"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="Comma-separated tags"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-950"
              />
              <textarea
                required
                minLength={10}
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short SEO excerpt (min 10 chars)"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-950"
              />
              <textarea
                required
                minLength={40}
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Markdown article body (min 40 chars)..."
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-slate-950"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-950"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <button
                type="submit"
                disabled={savingPost}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold text-white"
              >
                {savingPost && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Article
              </button>
            </form>

            <div className="space-y-3 lg:col-span-7">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase text-cyan-400">
                      {p.category} • {p.status}
                    </span>
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {p.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePostStatus(p)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold dark:border-white/15"
                    >
                      {p.status === "published" ? "Move to Draft" : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(p.id)}
                      aria-label={`Delete ${p.title}`}
                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/15"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "contacts" && (
          <div className="space-y-3">
            {contacts.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-xs text-slate-500">
                No contact submissions recorded yet.
              </div>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="glass-card rounded-2xl p-5 space-y-1.5">
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <strong className="text-slate-900 dark:text-white">{c.subject}</strong>
                    <span className="text-slate-500">{c.name} ({c.email})</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {c.message}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "logs" && (
          <div className="glass-card rounded-3xl p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-cyan-400">
              <Terminal className="h-4 w-4" />
              Redacted Application Logs (Secrets Masked)
            </div>
            <div className="max-h-[460px] space-y-1.5 overflow-y-auto rounded-2xl bg-slate-950 p-4 font-mono text-[11px] text-slate-300">
              {logs.map((entry, idx) => (
                <div key={`${entry.timestamp}-${idx}`} className="border-b border-white/5 pb-1">
                  <span className="text-cyan-400">{entry.timestamp}</span>{" "}
                  <span className="text-violet-400">[{entry.level}]</span>{" "}
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
