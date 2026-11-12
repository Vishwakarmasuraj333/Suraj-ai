import React, { Suspense } from "react";
import type { Metadata } from "next";
import { ChatWorkspaceClient } from "@/components/ChatWorkspaceClient";
import { LoadingScreen } from "@/components/LoadingScreen";

export const metadata: Metadata = {
  title: "AI Workspace",
  description:
    "SURaj AI interactive multimodal workspace with real-time SSE streaming, Knowledge RAG document analysis, Persistent AI Memory, Mermaid diagrams, Recharts data charts, and Image Studio.",
};

export default function ChatPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading SURaj AI Workspace..." />}>
      <ChatWorkspaceClient />
    </Suspense>
  );
}

