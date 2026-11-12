"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Edit3,
  Image as ImageIcon,
  MessageSquarePlus,
  PanelLeftClose,
  Pin,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { SurajLogo } from "./SurajLogo";
import type { Conversation, User } from "@/types";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  onTogglePin: (id: string, isPinned: boolean) => Promise<void>;
  onOpenSettings: () => void;
  onOpenImageStudio: () => void;
  onOpenAuth: () => void;
  user: User | null;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar = React.memo(function Sidebar({
  conversations,
  activeConversationId,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onTogglePin,
  onOpenSettings,
  onOpenImageStudio,
  onOpenAuth,
  user,
  isOpen,
  onCloseMobile,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setDraftTitle(conv.title);
  };

  const commitEdit = async (id: string) => {
    const trimmed = draftTitle.trim();
    setEditingId(null);
    if (trimmed) {
      await onRenameConversation(id, trimmed);
    }
  };

  const pinned = conversations.filter((c) => c.is_pinned);
  const recent = conversations.filter((c) => !c.is_pinned);

  const renderItem = (conv: Conversation) => {
    const isActive = conv.id === activeConversationId;
    const isEditing = editingId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => {
          if (!isEditing) {
            onSelectConversation(conv.id);
            onCloseMobile();
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isEditing) {
            onSelectConversation(conv.id);
            onCloseMobile();
          }
        }}
        className={`group relative flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all ${
          isActive
            ? "bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-violet-500/15 font-medium text-slate-900 ring-1 ring-cyan-400/35 dark:text-white"
            : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
        }`}
      >
        {isEditing ? (
          <div className="flex w-full items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit(conv.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-full rounded-md border border-cyan-400/45 bg-white px-2 py-1 text-xs text-slate-900 outline-none dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => commitEdit(conv.id)}
              aria-label="Save title"
              className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              aria-label="Cancel rename"
              className="rounded p-1 text-slate-400 hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 truncate">{conv.title}</span>
            <div
              className={`flex items-center gap-0.5 transition-opacity duration-150 ${
                isActive
                  ? "opacity-100"
                  : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100"
              }`}
            >
              <button
                type="button"
                title={conv.is_pinned ? "Unpin" : "Pin"}
                aria-label={conv.is_pinned ? "Unpin conversation" : "Pin conversation"}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(conv.id, !conv.is_pinned);
                }}
                className={`rounded-md p-1 transition hover:bg-black/5 dark:hover:bg-white/10 ${
                  conv.is_pinned ? "text-cyan-500" : "text-slate-400"
                }`}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Rename"
                aria-label="Rename conversation"
                onClick={(e) => startEditing(conv, e)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-black/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Delete"
                aria-label="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
                className="rounded-md p-1 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex h-full w-72 flex-col border-r border-slate-200/80 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-[#05091a]/85">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <SurajLogo size={34} />
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10 lg:hidden"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      {/* Primary Actions */}
      <div className="space-y-2 px-3 pb-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition hover:brightness-110 active:scale-[0.99]"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenImageStudio();
            onCloseMobile();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-cyan-400/50 hover:bg-cyan-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
        >
          <ImageIcon className="h-4 w-4 text-cyan-500" />
          <span>Image Studio</span>
          <span className="ml-auto rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-600 dark:text-cyan-300">
            API
          </span>
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversation history"
            className="w-full rounded-xl border border-slate-200/80 bg-slate-100/70 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:focus:bg-[#070b1a]"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {pinned.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Pinned
            </p>
            <div className="space-y-0.5">{pinned.map(renderItem)}</div>
          </div>
        )}

        <div>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Recent Conversations
          </p>
          {recent.length === 0 && pinned.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200/80 px-3 py-6 text-center text-xs text-slate-400 dark:border-white/10">
              {user
                ? searchQuery
                  ? "No conversations match your search."
                  : "Start a new chat to build your history."
                : "Sign in to save & search conversation history."}
            </div>
          ) : (
            <div className="space-y-0.5">{recent.map(renderItem)}</div>
          )}
        </div>
      </div>

      {/* User Footer */}
      <div className="border-t border-slate-200/80 p-3 dark:border-white/10">
        {user ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-100/80 p-2 dark:bg-white/[0.04]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 text-xs font-bold text-white">
              {user.full_name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                {user.full_name}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings and usage"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-300"
          >
            Sign In / Create Account
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden h-full shrink-0 lg:block">{sidebarContent}</aside>

      {/* Mobile animated drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -290 }}
              animate={{ x: 0 }}
              exit={{ x: -290 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative z-50 h-full"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

