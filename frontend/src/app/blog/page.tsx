import React from "react";
import type { Metadata } from "next";
import { BlogListClient } from "@/components/BlogListClient";
import type { BlogPost } from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Engineering articles on Knowledge RAG architecture, persistent AI memory, multi-provider AI routing, and backend security.",
};

export const dynamic = "force-dynamic";

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const [postsRes, catsRes] = await Promise.allSettled([
    fetch(`${API_BASE}/blog/posts?limit=60`, { cache: "no-store" }),
    fetch(`${API_BASE}/blog/categories`, { cache: "no-store" }),
  ]);

  const posts: BlogPost[] =
    postsRes.status === "fulfilled" && postsRes.value.ok ? await postsRes.value.json() : [];
  const categories: string[] =
    catsRes.status === "fulfilled" && catsRes.value.ok ? await catsRes.value.json() : [];

  return (
    <BlogListClient
      posts={Array.isArray(posts) ? posts : []}
      categories={Array.isArray(categories) ? categories : []}
      activeCategory={sp?.category}
    />
  );
}

