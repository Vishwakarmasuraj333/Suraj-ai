import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnimatedBackground } from "@/components/background";
import { FaqSection } from "@/components/landing/FaqSection";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about SURaj AI architecture, Knowledge RAG, persistent AI memory, provider integrations, security, and plans.",
};

export default function FaqPage() {
  return (
    <div className="relative isolate min-h-screen flex flex-col">
      <AnimatedBackground variant="faq" fixed />
      <Navbar />
      <main className="relative z-10 flex-1 pt-8">
        <FaqSection showHeading />
      </main>
      <Footer />
    </div>
  );
}

