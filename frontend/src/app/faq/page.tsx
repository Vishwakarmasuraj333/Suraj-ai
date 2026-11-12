import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FaqSection } from "@/components/landing/FaqSection";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about SURaj AI architecture, Knowledge RAG, persistent AI memory, provider integrations, security, and plans.",
};

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-8">
        <FaqSection showHeading />
      </main>
      <Footer />
    </div>
  );
}

