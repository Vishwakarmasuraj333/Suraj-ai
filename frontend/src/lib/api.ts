import type {
  AdminLogEntry,
  AdminOverview,
  AttachmentSummary,
  AuthResponse,
  BillingStatusResponse,
  BlogDetailResponse,
  BlogPost,
  Capabilities,
  ContactSubmission,
  Conversation,
  ConversationDetail,
  ImageGenerateResponse,
  PlanTierInfo,
  UsageSummary,
  User,
  UserMemory,
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
  signup: (
    email: string,
    full_name: string,
    password: string,
    options?: { confirm_password?: string; accept_terms?: boolean; request_otp?: boolean }
  ) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        full_name,
        password,
        ...(options || {}),
      }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  sendOtp: (email: string, purpose: "verify_email" | "reset_password" = "verify_email") =>
    request<{ sent: boolean; expires_in_seconds: number; cooldown_seconds: number }>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email, purpose }),
    }),

  verifyOtp: (email: string, otp: string, purpose: "verify_email" | "reset_password" = "verify_email") =>
    request<{ verified: boolean; email: string }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp, purpose }),
    }),

  forgotPassword: (email: string) =>
    request<{ sent: boolean; message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, otp: string, new_password: string, confirm_password: string) =>
    request<{ reset: boolean; message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, new_password, confirm_password }),
    }),

  changePassword: (current_password: string, new_password: string, confirm_password: string) =>
    request<{ changed: boolean; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password, confirm_password }),
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

  // Files & Knowledge RAG Document Manager
  listFiles: () => request<AttachmentSummary[]>("/files"),
  deleteFile: (attachmentId: string) =>
    request<void>(`/files/${attachmentId}`, { method: "DELETE" }),

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

  // Tools
  toolsStatus: () =>
    request<Array<{ id: string; name: string; status: string; implemented: boolean }>>(
      "/tools/status"
    ),
  calculate: (expression: string) =>
    request<{ expression: string; result: number }>("/tools/calculate", {
      method: "POST",
      body: JSON.stringify({ expression }),
    }),

  // Persistent AI Memory
  listMemories: () => request<UserMemory[]>("/memories"),
  createMemory: (payload: {
    title: string;
    content: string;
    category: "preference" | "project" | "fact" | "instruction";
  }) =>
    request<UserMemory>("/memories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateMemory: (
    id: string,
    patch: Partial<Pick<UserMemory, "title" | "content" | "category" | "is_active">>
  ) =>
    request<UserMemory>(`/memories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteMemory: (id: string) =>
    request<void>(`/memories/${id}`, { method: "DELETE" }),

  // Blog (Public)
  listBlogCategories: () => request<string[]>("/blog/categories"),
  listBlogPosts: (params?: {
    category?: string;
    search?: string;
    featured?: boolean;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.search) qs.set("search", params.search);
    if (params?.featured !== undefined) qs.set("featured", String(params.featured));
    if (params?.limit) qs.set("limit", String(params.limit));
    const qStr = qs.toString();
    return request<BlogPost[]>(`/blog/posts${qStr ? `?${qStr}` : ""}`);
  },
  getBlogPost: (slug: string) => request<BlogDetailResponse>(`/blog/posts/${encodeURIComponent(slug)}`),

  // Billing & Pricing
  listPlans: () =>
    request<{ plans: PlanTierInfo[]; stripe_configured: boolean; razorpay_configured: boolean }>(
      "/billing/plans"
    ),
  billingStatus: () => request<BillingStatusResponse>("/billing/status"),
  createCheckout: (payload: {
    plan_tier: "free" | "pro" | "premium" | "enterprise";
    billing_cycle: "monthly" | "yearly";
    provider?: "stripe" | "razorpay";
  }) =>
    request<{
      status: string;
      plan_tier: string;
      checkout_url?: string;
      message?: string;
    }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Contact
  submitContact: (payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
    website?: string;
  }) =>
    request<ContactSubmission>("/contact", {
      method: "POST",
      body: JSON.stringify({ website: "", ...payload }),
    }),

  // Newsletter
  newsletterSubscribe: (payload: { email: string; consent: boolean; website?: string }) =>
    request<{
      subscribed: boolean;
      email: string;
      email_sent: boolean;
      email_status: string;
      message: string;
    }>("/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ website: "", ...payload }),
    }),

  newsletterUnsubscribe: (payload: { email: string; token?: string }) =>
    request<{ unsubscribed: boolean; email: string; message: string }>("/newsletter/unsubscribe", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Admin Console
  adminOverview: () => request<AdminOverview>("/admin/overview"),
  adminListUsers: () => request<User[]>("/admin/users"),
  adminUpdateUser: (id: string, patch: { is_active?: boolean; role?: "user" | "admin" }) =>
    request<User>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  adminLogs: (limit = 50) => request<AdminLogEntry[]>(`/admin/logs?limit=${limit}`),
  adminContacts: () => request<ContactSubmission[]>("/admin/contacts"),
  adminListBlogPosts: () => request<BlogPost[]>("/admin/blog/posts"),
  adminCreateBlogPost: (payload: {
    title: string;
    slug?: string;
    excerpt: string;
    content: string;
    cover_image_url?: string | null;
    category: string;
    tags: string[];
    author_name?: string;
    status: "draft" | "published";
    is_featured?: boolean;
    seo_title?: string;
    seo_description?: string;
  }) =>
    request<BlogPost>("/admin/blog/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminUpdateBlogPost: (id: string, patch: Partial<BlogPost>) =>
    request<BlogPost>(`/admin/blog/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  adminDeleteBlogPost: (id: string) =>
    request<void>(`/admin/blog/posts/${id}`, { method: "DELETE" }),
  adminUploadBlogCover: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ cover_image_url: string }>("/admin/blog/upload-cover", {
      method: "POST",
      body: form,
    });
  },
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

