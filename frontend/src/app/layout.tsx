import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SURaj AI — Future of Intelligence | Intelligent AI Workspace",
    template: "%s | SURaj AI",
  },
  description:
    "SURaj AI is an intelligent multi-provider AI workspace for real-time streaming conversations, coding assistance, document Knowledge RAG, persistent AI memory, multimodal vision, diagrams, charts, and image generation.",
  keywords: [
    "SURaj AI",
    "AI workspace",
    "Knowledge RAG",
    "Persistent AI Memory",
    "Multi-provider AI",
    "FastAPI AI SaaS",
  ],
  openGraph: {
    title: "SURaj AI — Your Intelligent AI Workspace for Modern Innovation",
    description:
      "Powered by AI. Built for You. Unified workspace for real-time AI chat, Knowledge RAG, persistent memory, coding tools, and image generation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased selection:bg-cyan-500/30`}
      >
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
