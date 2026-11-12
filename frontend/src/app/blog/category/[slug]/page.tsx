import React from "react";
import type { Metadata } from "next";
import { BlogListClient } from "@/components/BlogListClient";
import type { BlogPost } from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, " ")} Articles`,
    description: "Browse SURaj AI engineering articles filtered by technical category.",
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [postsRes, catsRes] = await Promise.allSettled([
    fetch(`${API_BASE}/blog/posts?limit=60`, { cache: "no-store" }),
    fetch(`${API_BASE}/blog/categories`, { cache: "no-store" }),
  ]);

  const posts: BlogPost[] =
    postsRes.status === "fulfilled" && postsRes.value.ok ? await postsRes.value.json() : [];
  const categories: string[] =
    catsRes.status === "fulfilled" && catsRes.value.ok ? await catsRes.value.json() : [];

  const matchedCategory = categories.find((c) => toSlug(c) === slug);

  return (
    <BlogListClient
      posts={Array.isArray(posts) ? posts : []}
      categories={Array.isArray(categories) ? categories : []}
      activeCategory={matchedCategory || "All"}
    />
  );
}

