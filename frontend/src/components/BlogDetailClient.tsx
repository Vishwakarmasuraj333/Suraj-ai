"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag, User } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useTheme } from "@/components/ThemeProvider";
import type { BlogDetailResponse } from "@/types";

export function BlogDetailClient({ detail }: { detail: BlogDetailResponse }) {
  const { resolvedTheme } = useTheme();
  const { post, related, previous_post, next_post } = detail;

  const headings = useMemo(() => {
    return post.content
      .split("\n")
      .filter((line) => line.startsWith("## ") || line.startsWith("### "))
      .map((line) => line.replace(/^#{2,3}\s+/, "").trim());
  }, [post.content]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
        </Link>

        <article className="mt-6 glass-card rounded-3xl p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-full bg-cyan-500/15 px-3 py-0.5 font-semibold text-cyan-400">
              {post.category}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {post.reading_time_minutes} min read
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {post.author_name}
            </span>
            {post.published_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.published_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {post.excerpt}
          </p>

          {headings.length > 0 && (
            <div className="my-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Article Outline
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {headings.map((h) => (
                  <li key={h} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 border-t border-slate-200/70 pt-8 dark:border-white/10">
            <MarkdownRenderer content={post.content} isDark={resolvedTheme === "dark"} />
          </div>

          {post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-200/70 pt-6 dark:border-white/10">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-white/5 dark:text-slate-300"
                >
                  <Tag className="h-3 w-3" /> {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Previous / Next Post Navigation */}
        {(previous_post || next_post) && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {previous_post ? (
              <Link
                href={`/blog/${previous_post.slug}`}
                className="glass-card rounded-2xl p-4 hover:border-cyan-400/40"
              >
                <span className="text-[11px] font-semibold text-slate-500">← Previous Article</span>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {previous_post.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
            {next_post && (
              <Link
                href={`/blog/${next_post.slug}`}
                className="glass-card rounded-2xl p-4 text-right hover:border-cyan-400/40"
              >
                <span className="text-[11px] font-semibold text-slate-500">Next Article →</span>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {next_post.title}
                </p>
              </Link>
            )}
          </div>
        )}

        {/* Related Articles */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
              Related Engineering Articles
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${item.slug}`}
                  className="glass-card rounded-2xl p-4 hover:border-cyan-400/40"
                >
                  <span className="text-[11px] font-semibold text-cyan-400">{item.category}</span>
                  <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400">
                    Read <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
