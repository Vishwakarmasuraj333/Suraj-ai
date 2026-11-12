import React from "react";
import { HomepageClient } from "@/components/landing/HomepageClient";
import { FAQ_ITEMS } from "@/data/faq";
import type { BlogPost } from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

async function fetchFeaturedBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_BASE}/blog/posts?limit=3`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const posts = await fetchFeaturedBlogPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "SURaj AI",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description:
          "SURaj AI is an intelligent multi-provider AI workspace featuring streaming SSE conversations, document Knowledge RAG, persistent memory controls, multimodal vision, diagrams, charts, and image generation.",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomepageClient initialFeaturedPosts={posts} />
    </>
  );
}
