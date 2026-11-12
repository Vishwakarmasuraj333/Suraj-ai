"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { ChatWorkspace } from "@/components/ChatWorkspace";

export function ChatWorkspaceClient() {
  const searchParams = useSearchParams();
  const initialTool = searchParams.get("tool") || undefined;
  return <ChatWorkspace initialTool={initialTool} />;
}

