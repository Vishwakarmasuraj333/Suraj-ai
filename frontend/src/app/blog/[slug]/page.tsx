import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogDetailClient } from "@/components/BlogDetailClient";
import type { BlogDetailResponse } from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

export const dynamic = "force-dynamic";

async function getPostDetail(slug: string): Promise<BlogDetailResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/blog/posts/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getPostDetail(slug);
  if (!detail) return { title: "Article Not Found" };
  return {
    title: detail.post.seo_title || detail.post.title,
    description: detail.post.seo_description || detail.post.excerpt,
  };
}

export default async function BlogPostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getPostDetail(slug);
  if (!detail) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: detail.post.title,
    description: detail.post.excerpt,
    author: { "@type": "Person", name: detail.post.author_name },
    datePublished: detail.post.published_at || detail.post.created_at,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogDetailClient detail={detail} />
    </>
  );
}
