"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Search, Tag } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnimatedBackground } from "@/components/background";
import type { BlogPost } from "@/types";

function slugifyCategory(cat: string): string {
  return cat
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BlogListClient({
  posts,
  categories,
  activeCategory,
}: {
  posts: BlogPost[];
  categories: string[];
  activeCategory?: string;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(activeCategory || "All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      const catOk = selectedCategory === "All" || p.category === selectedCategory;
      const qOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return catOk && qOk;
    });
  }, [posts, search, selectedCategory]);

  const featuredPost = filtered.find((p) => p.is_featured) || filtered[0];

  return (
    <div className="relative isolate min-h-screen flex flex-col">
      <AnimatedBackground variant="blog" fixed />
      <Navbar />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-400/30 dark:text-cyan-400">
              <BookOpen className="h-3.5 w-3.5" /> Engineering & AI Architecture Blog
            </span>
            <h1 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-5xl">
              SURAJ AI Insights
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Deep dives on Knowledge RAG systems, persistent memory isolation, multi-provider SSE routing, and production backend security.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles or tags..."
              className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950/70"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "All"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                : "border border-slate-200 text-slate-600 hover:border-cyan-400/40 dark:border-white/10 dark:text-slate-300"
            }`}
          >
            All Topics ({posts.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                selectedCategory === cat
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:border-cyan-400/40 dark:border-white/10 dark:text-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured Post Banner */}
        {featuredPost && !search && selectedCategory === "All" && (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="glass-card group mb-10 block rounded-3xl p-6 transition hover:border-cyan-400/50 sm:p-8"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 font-bold text-cyan-700 dark:text-cyan-400">
                Featured
              </span>
              <span className="font-semibold text-violet-700 dark:text-violet-400">{featuredPost.category}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {featuredPost.reading_time_minutes} min read
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-900 group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400 sm:text-3xl">
              {featuredPost.title}
            </h2>
            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {featuredPost.excerpt}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-400">
              Read full article <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        )}

        {/* Articles Grid */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No articles match your filter. Try selecting All Topics or clearing search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <article
                key={post.id}
                className="glass-card flex flex-col justify-between rounded-2xl p-5 transition hover:-translate-y-1 hover:border-cyan-400/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <Link
                      href={`/blog/category/${slugifyCategory(post.category)}`}
                      className="font-semibold text-cyan-700 dark:text-cyan-400 hover:underline"
                    >
                      {post.category}
                    </Link>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {post.reading_time_minutes}m
                    </span>
                  </div>
                  <Link href={`/blog/${post.slug}`}>
                    <h3 className="mt-2.5 text-lg font-bold text-slate-900 hover:text-cyan-600 dark:text-white dark:hover:text-cyan-400">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {post.excerpt}
                  </p>
                  {post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300"
                        >
                          <Tag className="h-2.5 w-2.5" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-200/70 pt-3.5 text-xs dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400">{post.author_name}</span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 font-semibold text-cyan-700 dark:text-cyan-400 hover:underline"
                  >
                    Read <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

