"use client";

import React, { useRef, useState } from "react";
import {
  ArrowUp,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import type { AttachmentSummary } from "@/types";

interface ComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  onUploadFiles: (files: FileList | File[]) => Promise<void>;
  attachments: AttachmentSummary[];
  onRemoveAttachment: (id: string) => void;
  isStreaming: boolean;
  isUploading: boolean;
  onOpenImageStudio: () => void;
  disabled?: boolean;
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  onUploadFiles,
  attachments,
  onRemoveAttachment,
  isStreaming,
  isUploading,
  onOpenImageStudio,
  disabled = false,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && (value.trim() || attachments.length > 0)) {
        onSend();
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isStreaming || isUploading) return;
    if (e.dataTransfer.files?.length) {
      await onUploadFiles(e.dataTransfer.files);
    }
  };

  const getIcon = (kind: string) => {
    if (kind === "image" || kind === "generated_image") return ImageIcon;
    if (kind === "data") return FileSpreadsheet;
    if (kind === "pdf") return FileText;
    return FileCode2;
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-4 pt-2 sm:px-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border bg-white/85 p-3 shadow-xl shadow-slate-900/5 backdrop-blur-2xl transition-all duration-200 dark:bg-[#070b1a]/90 dark:shadow-black/40 ${
          isDragging
            ? "scale-[1.01] border-cyan-500 ring-2 ring-cyan-500/30"
            : "border-slate-200/90 hover:border-cyan-400/35 focus-within:border-cyan-500/55 focus-within:shadow-cyan-500/10 dark:border-white/10 dark:hover:border-cyan-400/25"
        }`}
      >
        {/* Attached files strip */}
        {attachments.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {attachments.map((att) => {
              const Icon = getIcon(att.kind);
              return (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-100/80 px-2.5 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                >
                  <Icon className="h-3.5 w-3.5 text-cyan-500" />
                  <span className="max-w-[160px] truncate font-medium">{att.filename}</span>
                  <span className="text-[10px] uppercase text-slate-400">{att.kind}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(att.id)}
                    aria-label={`Remove ${att.filename}`}
                    className="rounded p-0.5 text-slate-400 hover:bg-black/10 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          placeholder="Message SURAJ AI... (Ask in English or हिन्दी, paste code, or drop PDF / CSV / Images)"
          className="max-h-44 w-full resize-none bg-transparent px-1 py-1 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.csv,.tsv,.xlsx,.json,.txt,.md,.py,.js,.ts,.tsx,.jsx,.html,.css,.sql"
              onChange={(e) => {
                if (e.target.files?.length) {
                  onUploadFiles(e.target.files);
                  e.target.value = "";
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isStreaming}
              title="Attach PDF, Image, CSV, Excel, JSON, or Code"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition duration-150 hover:scale-[1.02] hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-slate-900 active:scale-[0.98] disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-500" />
              ) : (
                <Paperclip className="h-3.5 w-3.5 text-cyan-500" />
              )}
              <span className="hidden sm:inline">Attach</span>
            </button>

            <button
              type="button"
              onClick={onOpenImageStudio}
              title="Open AI Image Studio"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition duration-150 hover:scale-[1.02] hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-slate-900 active:scale-[0.98] dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              <span className="hidden sm:inline">Generate Image</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-slate-400 md:inline">
              Enter to send · Shift+Enter for new line
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generation"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 text-xs font-semibold text-white shadow-md shadow-rose-500/20 transition duration-150 hover:scale-[1.03] hover:bg-rose-600 active:scale-[0.97]"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={onSend}
                disabled={disabled || (!value.trim() && attachments.length === 0)}
                aria-label="Send message"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-white shadow-md shadow-cyan-500/25 transition duration-150 hover:scale-[1.05] hover:brightness-110 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        SURAJ AI can make mistakes. Verify important facts, code, and financial or medical guidance.
      </p>
    </div>
  );
}

