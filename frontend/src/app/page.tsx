"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ChevronDown,
  Languages,
  Menu,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Composer } from "@/components/Composer";
import { MessageBubble } from "@/components/MessageBubble";
import { Sidebar } from "@/components/Sidebar";
import { SurajLogo } from "@/components/SurajLogo";
import { WelcomeScreen } from "@/components/WelcomeScreen";

const AuthModal = dynamic(
  () => import("@/components/AuthModal").then((mod) => mod.AuthModal),
  { ssr: false }
);
const ImageStudioModal = dynamic(
  () => import("@/components/ImageStudioModal").then((mod) => mod.ImageStudioModal),
  { ssr: false }
);
const SettingsModal = dynamic(
  () => import("@/components/SettingsModal").then((mod) => mod.SettingsModal),
  { ssr: false }
);
import { api, getStoredToken, setStoredToken, streamSSE } from "@/lib/api";
import type {
  AttachmentSummary,
  AuthResponse,
  Capabilities,
  ChatMessage,
  Conversation,
  User,
  UserPreferences,
} from "@/types";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [language, setLanguage] = useState("auto");
  const [isDark, setIsDark] = useState(true);

  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentSummary[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [imageStudioOpen, setImageStudioOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const showErrorToast = (msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError((prev) => (prev === msg ? null : prev)), 5000);
  };

  const resolveIsDark = useCallback((themeVal?: string) => {
    if (themeVal === "light") return false;
    if (themeVal === "system" && typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  // Listen to OS theme changes when preference is set to "system"
  useEffect(() => {
    if (preferences?.theme !== "system" || typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
    setIsDark(mql.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [preferences?.theme]);

  const loadConversations = useCallback(async (q?: string) => {
    try {
      const list = await api.listConversations(q);
      setConversations(list);
    } catch {
      // ignore if unauthenticated
    }
  }, []);

  // Bootstrap session & capabilities
  useEffect(() => {
    api
      .capabilities()
      .then((cap) => {
        setCapabilities(cap);
        const configured = cap.llm_providers.find((p) => p.configured);
        if (configured) {
          setProvider(configured.id);
          setModel(configured.models[0]);
        }
      })
      .catch(() => {});

    const token = getStoredToken();
    if (!token) return;

    Promise.all([api.me(), api.getPreferences()])
      .then(([me, prefs]) => {
        setUser(me);
        setPreferences(prefs);
        setIsDark(resolveIsDark(prefs.theme));
        setProvider(prefs.default_provider);
        setModel(prefs.default_model);
        setLanguage(prefs.preferred_language);
        loadConversations();
      })
      .catch(() => {
        setStoredToken(null);
      });
  }, [loadConversations, resolveIsDark]);

  // Search debounce
  useEffect(() => {
    if (!user) return;
    const handle = setTimeout(() => {
      loadConversations(searchQuery);
    }, 220);
    return () => clearTimeout(handle);
  }, [searchQuery, user, loadConversations]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 180);
  };

  const handleAuthenticated = async (auth: AuthResponse) => {
    setStoredToken(auth.access_token);
    setUser(auth.user);
    setAuthModalOpen(false);
    try {
      const prefs = await api.getPreferences();
      setPreferences(prefs);
      setIsDark(resolveIsDark(prefs.theme));
      setProvider(prefs.default_provider);
      setModel(prefs.default_model);
      setLanguage(prefs.preferred_language);
    } catch {
      // ignore
    }
    loadConversations();
  };

  const handleLogout = () => {
    api.logout().catch(() => {});
    setStoredToken(null);
    setUser(null);
    setPreferences(null);
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setSettingsModalOpen(false);
  };

  const handleSelectConversation = async (id: string) => {
    if (isStreaming) {
      abortRef.current?.abort();
    }
    try {
      const detail = await api.getConversation(id);
      setActiveConversationId(detail.id);
      setMessages(detail.messages);
      setProvider(detail.provider);
      setModel(detail.model);
      setTimeout(() => scrollToBottom(false), 40);
    } catch {
      showErrorToast("Could not load conversation.");
    }
  };

  const handleNewChat = () => {
    if (isStreaming) {
      abortRef.current?.abort();
    }
    setActiveConversationId(null);
    setMessages([]);
    setPendingAttachments([]);
    setInput("");
  };

  const handleRenameConversation = async (id: string, title: string) => {
    try {
      const updated = await api.updateConversation(id, { title });
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch {
      showErrorToast("Failed to rename conversation.");
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch {
      showErrorToast("Failed to delete conversation.");
    }
  };

  const handleTogglePin = async (id: string, is_pinned: boolean) => {
    try {
      await api.updateConversation(id, { is_pinned });
      await loadConversations(searchQuery);
    } catch {
      showErrorToast("Failed to update pin state.");
    }
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setIsUploading(true);
    try {
      const uploaded: AttachmentSummary[] = [];
      for (const file of Array.from(files)) {
        const res = await api.uploadFile(file, activeConversationId || undefined);
        uploaded.push(res);
      }
      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "File upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const runStreamTurn = async (
    endpoint: string,
    payload: Record<string, unknown>,
    optimisticUserContent?: string,
    optimisticAttachments: AttachmentSummary[] = []
  ) => {
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-ai-${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (optimisticUserContent !== undefined) {
      setMessages((prev) => [
        ...prev,
        {
          id: tempUserId,
          conversation_id: activeConversationId || "pending",
          role: "user",
          content: optimisticUserContent,
          status: "completed",
          token_count: 0,
          metadata_json: {},
          attachments: optimisticAttachments,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: tempAssistantId,
          conversation_id: activeConversationId || "pending",
          role: "assistant",
          content: "",
          provider,
          model,
          status: "streaming",
          token_count: 0,
          metadata_json: {},
          attachments: [],
          created_at: nowIso,
          updated_at: nowIso,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: tempAssistantId,
          conversation_id: activeConversationId || "pending",
          role: "assistant",
          content: "",
          provider,
          model,
          status: "streaming",
          token_count: 0,
          metadata_json: {},
          attachments: [],
          created_at: nowIso,
          updated_at: nowIso,
        },
      ]);
    }

    setIsStreaming(true);
    setStreamingMsgId(tempAssistantId);
    setTimeout(() => scrollToBottom(true), 40);

    const controller = new AbortController();
    abortRef.current = controller;
    let activeConvId = activeConversationId;
    let currentAiId = tempAssistantId;

    try {
      await streamSSE(
        endpoint,
        payload,
        {
          onMeta: (meta) => {
            activeConvId = meta.conversation_id;
            setActiveConversationId(meta.conversation_id);
            currentAiId = meta.assistant_message_id;
            setStreamingMsgId(meta.assistant_message_id);

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === tempUserId && meta.user_message_id) {
                  return {
                    ...m,
                    id: meta.user_message_id,
                    conversation_id: meta.conversation_id,
                  };
                }
                if (m.id === tempAssistantId) {
                  return {
                    ...m,
                    id: meta.assistant_message_id,
                    conversation_id: meta.conversation_id,
                    provider: meta.provider,
                    model: meta.model,
                  };
                }
                return m;
              })
            );
          },
          onDelta: (text) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAiId ? { ...m, content: m.content + text } : m
              )
            );
          },
          onDone: (done) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAiId
                  ? {
                      ...m,
                      status: (done.status as ChatMessage["status"]) || "completed",
                    }
                  : m
              )
            );
          },
          onError: (err) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAiId
                  ? {
                      ...m,
                      status: "error",
                      error_message: err.message,
                      error_code: err.code,
                      required_env_var: err.required_env_var,
                    }
                  : m
              )
            );
          },
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) => (m.id === currentAiId ? { ...m, status: "stopped" } : m))
        );
      } else {
        const msg = err instanceof Error ? err.message : "Streaming connection failed.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === currentAiId ? { ...m, status: "error", error_message: msg } : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingMsgId(null);
      abortRef.current = null;
      if (activeConvId) {
        loadConversations(searchQuery);
      }
    }
  };

  const handleSend = async (overridePrompt?: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const content = (overridePrompt ?? input).trim();
    if (!content && pendingAttachments.length === 0) return;

    const finalContent =
      content || `Analyze attached file(s): ${pendingAttachments.map((a) => a.filename).join(", ")}`;
    const attachmentsToSend = [...pendingAttachments];

    if (!overridePrompt) setInput("");
    setPendingAttachments([]);

    await runStreamTurn(
      "/chat/stream",
      {
        conversation_id: activeConversationId,
        content: finalContent,
        provider,
        model,
        language,
        attachment_ids: attachmentsToSend.map((a) => a.id),
      },
      finalContent,
      attachmentsToSend
    );
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleEditResend = async (messageId: string, newContent: string) => {
    if (!activeConversationId || isStreaming) return;
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    setMessages((prev) =>
      prev.slice(0, idx + 1).map((m) => (m.id === messageId ? { ...m, content: newContent } : m))
    );
    await runStreamTurn(
      `/chat/conversations/${activeConversationId}/messages/${messageId}/edit-resend`,
      { content: newContent, provider, model }
    );
  };

  const handleRegenerate = async (assistantMessageId: string) => {
    if (!activeConversationId || isStreaming) return;
    const idx = messages.findIndex((m) => m.id === assistantMessageId);
    if (idx === -1) return;
    setMessages((prev) => prev.slice(0, idx));
    await runStreamTurn(
      `/chat/conversations/${activeConversationId}/messages/${assistantMessageId}/regenerate`,
      { provider, model }
    );
  };

  const handleRetryMessage = async (failedMsg: ChatMessage) => {
    if (isStreaming) return;
    if (activeConversationId && !failedMsg.id.startsWith("temp-")) {
      await handleRegenerate(failedMsg.id);
      return;
    }
    const idx = messages.findIndex((m) => m.id === failedMsg.id);
    if (idx <= 0) return;
    const prevUserMsg = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!prevUserMsg) return;

    // Resend unsaved pre-meta turn cleanly without duplicating the temp user bubble
    setMessages((prev) => prev.slice(0, idx));
    await runStreamTurn(
      "/chat/stream",
      {
        conversation_id: activeConversationId,
        content: prevUserMsg.content,
        provider,
        model,
        language,
        attachment_ids: prevUserMsg.attachments.map((a) => a.id),
      }
    );
  };

  const handleUpdatePreferences = async (patch: Partial<UserPreferences>) => {
    const updated = await api.updatePreferences(patch);
    setPreferences(updated);
    setIsDark(resolveIsDark(updated.theme));
    setProvider(updated.default_provider);
    setModel(updated.default_model);
    setLanguage(updated.preferred_language);
  };

  const handleToggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (user) {
      api
        .updatePreferences({ theme: nextDark ? "dark" : "light" })
        .then(setPreferences)
        .catch(() => {});
    }
  };

  const providerList = capabilities?.llm_providers || [
    {
      id: "openai",
      name: "OpenAI",
      configured: false,
      models: ["gpt-4o-mini", "gpt-4o"],
      supports_vision: true,
      supports_streaming: true,
      required_env_var: "OPENAI_API_KEY",
    },
    {
      id: "gemini",
      name: "Google Gemini",
      configured: false,
      models: ["gemini-2.5-flash", "gemini-2.5-pro"],
      supports_vision: true,
      supports_streaming: true,
      required_env_var: "GEMINI_API_KEY",
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      configured: false,
      models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
      supports_vision: true,
      supports_streaming: true,
      required_env_var: "ANTHROPIC_API_KEY",
    },
  ];
  const currentProviderCap = providerList.find((p) => p.id === provider) || providerList[0];

  const handleOpenSettings = useCallback(() => setSettingsModalOpen(true), []);
  const handleOpenAuth = useCallback(() => setAuthModalOpen(true), []);
  const handleCloseMobile = useCallback(() => setSidebarOpen(false), []);
  const handleOpenImageStudio = useCallback(() => {
    if (!user) setAuthModalOpen(true);
    else setImageStudioOpen(true);
  }, [user]);

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      <AnimatedBackground />

      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onTogglePin={handleTogglePin}
        onOpenSettings={handleOpenSettings}
        onOpenImageStudio={handleOpenImageStudio}
        onOpenAuth={handleOpenAuth}
        user={user}
        isOpen={sidebarOpen}
        onCloseMobile={handleCloseMobile}
      />

      {/* Main Workspace */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/60 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#090c14]/65 sm:px-5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="lg:hidden">
              <SurajLogo size={28} showWordmark={false} />
            </div>

            {/* Provider & Model selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-2.5 py-1.5 text-xs shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <span
                title={currentProviderCap.configured ? "API Key Configured" : "API Key Required"}
                className={`h-2 w-2 rounded-full ${
                  currentProviderCap.configured ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <select
                aria-label="Select AI provider"
                value={provider}
                onChange={(e) => {
                  const next = e.target.value;
                  setProvider(next);
                  const found = providerList.find((p) => p.id === next);
                  if (found?.models[0]) setModel(found.models[0]);
                }}
                className="bg-transparent font-semibold text-slate-800 outline-none dark:text-slate-100"
              >
                {providerList.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                    {p.id.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3 w-3 text-slate-400" />
              <select
                aria-label="Select AI model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="max-w-[140px] truncate bg-transparent font-mono text-[11px] text-slate-600 outline-none dark:text-slate-300 sm:max-w-none"
              >
                {currentProviderCap.models.map((m) => (
                  <option key={m} value={m} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language quick switcher */}
            <div className="hidden items-center gap-1 rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-white/[0.04] sm:flex">
              <Languages className="h-3.5 w-3.5 text-orange-500" />
              <select
                aria-label="Response language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none dark:text-slate-200"
              >
                <option value="auto" className="bg-white dark:bg-slate-900">Auto</option>
                <option value="English" className="bg-white dark:bg-slate-900">English</option>
                <option value="Hindi" className="bg-white dark:bg-slate-900">हिन्दी</option>
                <option value="Hinglish" className="bg-white dark:bg-slate-900">Hinglish</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label="Toggle dark or light theme"
              className="rounded-xl border border-slate-200/80 bg-white/70 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              aria-label="Open settings"
              className="rounded-xl border border-slate-200/80 bg-white/70 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Settings className="h-4 w-4" />
            </button>

            {!user && (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-105"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Error Toast */}
        <AnimatePresence>
          {toastError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto mt-3 rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-xs font-medium text-rose-600 backdrop-blur-md dark:text-rose-200"
            >
              {toastError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Scroll Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto scroll-smooth"
        >
          {messages.length === 0 ? (
            <WelcomeScreen
              onSelectPrompt={(p) => {
                setInput(p);
                if (user) handleSend(p);
                else setAuthModalOpen(true);
              }}
              capabilities={capabilities}
              onOpenSettings={() => setSettingsModalOpen(true)}
            />
          ) : (
            <div className="mx-auto max-w-4xl py-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isDark={isDark}
                  isStreamingThis={isStreaming && msg.id === streamingMsgId}
                  isAnyStreaming={isStreaming}
                  onEditResend={handleEditResend}
                  onRegenerate={handleRegenerate}
                  onRetry={handleRetryMessage}
                  onOpenSettings={handleOpenSettings}
                />
              ))}
            </div>
          )}
        </div>

        {/* Scroll-to-bottom button */}
        <AnimatePresence>
          {showScrollBottom && messages.length > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => scrollToBottom(true)}
              aria-label="Scroll to bottom"
              className="absolute bottom-36 right-6 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur-md transition hover:scale-105 dark:border-white/15 dark:bg-slate-800/90 dark:text-white"
            >
              <ArrowDown className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bottom Composer */}
        <Composer
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onStop={handleStop}
          onUploadFiles={handleUploadFiles}
          attachments={pendingAttachments}
          onRemoveAttachment={(id) =>
            setPendingAttachments((prev) => prev.filter((a) => a.id !== id))
          }
          isStreaming={isStreaming}
          isUploading={isUploading}
          onOpenImageStudio={() => {
            if (!user) setAuthModalOpen(true);
            else setImageStudioOpen(true);
          }}
        />
      </main>

      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthenticated={handleAuthenticated}
        />
      )}

      {settingsModalOpen && (
        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          user={user}
          preferences={preferences}
          capabilities={capabilities}
          onUpdatePreferences={handleUpdatePreferences}
          onLogout={handleLogout}
        />
      )}

      {imageStudioOpen && (
        <ImageStudioModal
          isOpen={imageStudioOpen}
          onClose={() => setImageStudioOpen(false)}
          capabilities={capabilities}
          activeConversationId={activeConversationId}
        />
      )}
    </div>
  );
}

