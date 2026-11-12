import type {
  AttachmentSummary,
  AuthResponse,
  Capabilities,
  Conversation,
  ConversationDetail,
  ImageGenerateResponse,
  UsageSummary,
  User,
  UserPreferences,
} from "@/types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

const TOKEN_KEY = "suraj_ai_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const detailObj = (json && typeof json === "object" ? (json as Record<string, unknown>).detail : null) ?? json;
    const msg =
      typeof detailObj === "string"
        ? detailObj
        : detailObj && typeof detailObj === "object" && "message" in detailObj
          ? String((detailObj as Record<string, unknown>).message)
          : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, detailObj);
  }
  return json as T;
}

export const api = {
  // Auth
  signup: (email: string, full_name: string, password: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, full_name, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>("/auth/me"),
  logout: () => request<{ status: string }>("/auth/logout", { method: "POST" }),

  // Capabilities & Settings
  capabilities: () => request<Capabilities>("/settings/capabilities"),
  getPreferences: () => request<UserPreferences>("/settings/preferences"),
  updatePreferences: (patch: Partial<UserPreferences>) =>
    request<UserPreferences>("/settings/preferences", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  // Conversations
  listConversations: (q?: string) =>
    request<Conversation[]>(`/conversations${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  createConversation: (payload: { title?: string; provider?: string; model?: string }) =>
    request<Conversation>("/conversations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getConversation: (id: string) => request<ConversationDetail>(`/conversations/${id}`),

  updateConversation: (id: string, patch: Partial<Pick<Conversation, "title" | "is_pinned" | "provider" | "model">>) =>
    request<Conversation>(`/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteConversation: (id: string) =>
    request<void>(`/conversations/${id}`, { method: "DELETE" }),

  // Files
  uploadFile: async (file: File, conversationId?: string): Promise<AttachmentSummary> => {
    const form = new FormData();
    form.append("file", file);
    if (conversationId) {
      form.append("conversation_id", conversationId);
    }
    return request<AttachmentSummary>("/files/upload", {
      method: "POST",
      body: form,
    });
  },

  fetchAttachmentBlobUrl: async (attachmentId: string): Promise<string> => {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/files/${attachmentId}/raw`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new ApiError("Could not load file preview", res.status);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Image Generation
  generateImage: (payload: {
    prompt: string;
    provider?: string;
    model?: string;
    size?: "1024x1024" | "1792x1024" | "1024x1792";
    quality?: "standard" | "hd";
    conversation_id?: string;
  }) =>
    request<ImageGenerateResponse>("/images/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Usage
  usageSummary: () => request<UsageSummary>("/usage/summary"),
};

export interface SSEHandlers {
  onMeta?: (data: {
    conversation_id: string;
    title: string;
    user_message_id?: string | null;
    assistant_message_id: string;
    provider: string;
    model: string;
  }) => void;
  onDelta?: (text: string) => void;
  onDone?: (data: {
    assistant_message_id: string;
    conversation_id: string;
    status: string;
    usage?: Record<string, number>;
  }) => void;
  onError?: (err: {
    code: string;
    message: string;
    provider?: string;
    required_env_var?: string;
    assistant_message_id?: string;
  }) => void;
}

export async function streamSSE(
  path: string,
  body: Record<string, unknown>,
  handlers: SSEHandlers,
  signal?: AbortSignal
): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text();
    let msg = `Stream request failed (${res.status})`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.detail) {
        msg = typeof parsed.detail === "string" ? parsed.detail : parsed.detail.message || msg;
      }
    } catch {
      // ignore
    }
    throw new ApiError(msg, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processBlock = (block: string) => {
    const lines = block.split("\n");
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (!dataLines.length) return;
    const payloadStr = dataLines.join("\n");
    try {
      const data = JSON.parse(payloadStr);
      if (eventName === "meta") handlers.onMeta?.(data);
      else if (eventName === "delta") handlers.onDelta?.(data.text || "");
      else if (eventName === "done") handlers.onDone?.(data);
      else if (eventName === "error") handlers.onError?.(data);
    } catch {
      // ignore malformed chunk
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      if (part.trim()) processBlock(part);
    }
  }
  if (buffer.trim()) {
    processBlock(buffer);
  }
}

