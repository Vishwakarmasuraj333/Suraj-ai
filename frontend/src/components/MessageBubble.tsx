"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Copy,
  Edit3,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Send,
  User as UserIcon,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { SurajLogo } from "./SurajLogo";
import type { AttachmentSummary, ChartPayload, ChatMessage } from "@/types";

const ChartBlock = dynamic(() => import("./ChartBlock").then((mod) => mod.ChartBlock), {
  ssr: false,
  loading: () => (
    <div className="my-3 flex h-48 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/60 text-xs text-slate-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-400">
      Loading chart...
    </div>
  ),
});

interface MessageBubbleProps {
  message: ChatMessage;
  isDark: boolean;
  isStreamingThis: boolean;
  isAnyStreaming?: boolean;
  onEditResend: (messageId: string, newContent: string) => void;
  onRegenerate: (messageId: string) => void;
  onRetry: (message: ChatMessage) => void;
  onOpenSettings: () => void;
}

function AttachmentBadge({ att }: { att: AttachmentSummary }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);

  const chartPayload = (att.analysis_json?.chart as ChartPayload | undefined) || null;

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    if (att.kind === "image" || att.kind === "generated_image") {
      api
        .fetchAttachmentBlobUrl(att.id)
        .then((url) => {
          createdUrl = url;
          if (active) setImgUrl(url);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [att.id, att.kind]);

  const Icon =
    att.kind === "image" || att.kind === "generated_image"
      ? ImageIcon
      : att.kind === "data"
        ? FileSpreadsheet
        : att.kind === "pdf"
          ? FileText
          : FileCode2;

  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
        <Icon className="h-3.5 w-3.5 text-orange-500" />
        <span className="max-w-[200px] truncate font-medium">{att.filename}</span>
        <span className="text-[10px] text-slate-400">
          {(att.file_size / 1024).toFixed(1)} KB
        </span>
        {chartPayload && (
          <button
            type="button"
            onClick={() => setShowChart((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-600 transition hover:bg-orange-500/25 dark:text-orange-300"
          >
            <BarChart3 className="h-3 w-3" />
            {showChart ? "Hide Chart" : "Preview Chart"}
          </button>
        )}
      </div>

      {imgUrl && (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt={att.filename}
            loading="lazy"
            decoding="async"
            className="max-h-64 max-w-full rounded-xl object-contain"
          />
        </div>
      )}

      {showChart && chartPayload && <ChartBlock payload={chartPayload} />}
    </div>
  );
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  isDark,
  isStreamingThis,
  isAnyStreaming = false,
  onEditResend,
  onRegenerate,
  onRetry,
  onOpenSettings,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setEditing(false);
    onEditResend(message.id, trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`group flex w-full gap-3.5 px-4 py-4 sm:px-6 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="mt-0.5 shrink-0">
          <SurajLogo size={32} showWordmark={false} />
        </div>
      )}

      <div
        className={`flex min-w-0 max-w-full flex-col sm:max-w-3xl ${
          isUser ? "items-end" : "w-full items-start"
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <span>{isUser ? "You" : "SURaj AI"}</span>
          {!isUser && message.model && (
            <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {message.provider ? `${message.provider} · ` : ""}
              {message.model}
            </span>
          )}
          {message.status === "stopped" && (
            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-500">
              Stopped
            </span>
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <AttachmentBadge key={att.id} att={att} />
            ))}
          </div>
        )}

        {/* Message Body */}
        {isUser ? (
          editing ? (
            <div className="w-full max-w-lg rounded-2xl border border-orange-500/40 bg-white/90 p-3 shadow-md dark:bg-slate-900/90 sm:min-w-[420px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full resize-y bg-transparent text-sm text-slate-900 outline-none dark:text-slate-100"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditText(message.content);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
                >
                  <Send className="h-3.5 w-3.5" /> Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-cyan-600 via-blue-600 to-violet-600 px-4 py-3 text-sm leading-relaxed text-white shadow-md dark:from-cyan-500/25 dark:via-blue-500/20 dark:to-violet-500/25 dark:text-slate-100 dark:ring-1 dark:ring-cyan-400/35">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          )
        ) : (
          <div className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#070b1a]/85 sm:px-5 sm:py-4">
            {/* Typing indicator before first token */}
            {isStreamingThis && !message.content && (
              <div className="flex items-center gap-2 py-1 text-xs text-slate-400">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-500 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500" />
                </span>
                <span>Thinking & streaming response...</span>
              </div>
            )}

            {message.content && (
              <MarkdownRenderer content={message.content} isDark={isDark} />
            )}

            {Array.isArray((message.metadata_json as { rag_sources?: Array<{ filename: string; section: number }> })?.rag_sources) &&
              ((message.metadata_json as { rag_sources?: Array<{ filename: string; section: number }> }).rag_sources?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-200/70 pt-2.5 dark:border-white/10">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Sources:
                  </span>
                  {(
                    message.metadata_json as { rag_sources: Array<{ filename: string; section: number }> }
                  ).rag_sources.map((src, idx) => (
                    <span
                      key={`${src.filename}-${src.section}-${idx}`}
                      className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-700 dark:text-cyan-300"
                    >
                      {src.filename} §{src.section}
                    </span>
                  ))}
                </div>
              )}

            {isStreamingThis && message.content && (
              <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-cyan-400 align-middle" />
            )}

            {/* Honest API key / error state */}
            {message.status === "error" && (
              <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  {message.error_code === "API_KEY_NOT_CONFIGURED" ? (
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <div className="flex-1 space-y-1.5">
                    <p className="font-semibold">
                      {message.error_code === "API_KEY_NOT_CONFIGURED"
                        ? "Real AI Integration Pending — API Key Required"
                        : "Response Failed"}
                    </p>
                    <p className="leading-relaxed opacity-90">
                      {message.error_message ||
                        "Could not complete request. Check provider configuration and retry."}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isAnyStreaming}
                        onClick={() => onRetry(message)}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-900 transition hover:bg-amber-500/30 disabled:opacity-50 dark:text-amber-100"
                      >
                        <RotateCcw className="h-3 w-3" /> Retry
                      </button>
                      {message.error_code === "API_KEY_NOT_CONFIGURED" && (
                        <button
                          type="button"
                          onClick={onOpenSettings}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 px-2.5 py-1 font-medium transition hover:bg-amber-500/15"
                        >
                          View Integration Status
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Toolbar */}
        {!editing && !isStreamingThis && (
          <div className="mt-1.5 flex items-center gap-1 opacity-75 transition-opacity group-hover:opacity-100">
            {message.content && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            )}

            {isUser && !isAnyStreaming && (
              <button
                type="button"
                onClick={() => {
                  setEditText(message.content);
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Edit3 className="h-3 w-3" /> Edit
              </button>
            )}

            {!isUser && message.status !== "error" && !isAnyStreaming && (
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <RefreshCw className="h-3 w-3" /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200">
          <UserIcon className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
});

