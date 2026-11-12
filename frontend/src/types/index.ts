export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_email_verified?: boolean;
  is_active?: boolean;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  email_verification_status?: string | null;
}

export interface AttachmentSummary {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  kind: "image" | "pdf" | "data" | "document" | "generated_image" | string;
  extracted_text_preview?: string | null;
  analysis_json: Record<string, unknown>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  model?: string | null;
  provider?: string | null;
  status: "completed" | "streaming" | "stopped" | "error";
  error_message?: string | null;
  error_code?: string | null;
  required_env_var?: string | null;
  token_count: number;
  metadata_json: Record<string, unknown>;
  attachments: AttachmentSummary[];
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface UserPreferences {
  theme: "dark" | "light" | "system";
  preferred_language: string;
  default_provider: string;
  default_model: string;
  system_instructions?: string | null;
  stream_responses: boolean;
  temperature: number;
}

export interface ProviderCapability {
  id: string;
  name: string;
  configured: boolean;
  models: string[];
  supports_vision: boolean;
  supports_streaming: boolean;
  required_env_var: string;
}

export interface ImageProviderCapability {
  id: string;
  name: string;
  configured: boolean;
  required_env_var: string;
  default_model: string;
}

export interface Capabilities {
  database_type: string;
  database_connected: boolean;
  llm_providers: ProviderCapability[];
  image_generation_configured: boolean;
  image_providers: ImageProviderCapability[];
  file_processing: Record<string, boolean>;
  rate_limit_rpm: number;
  rate_limit_daily_tokens: number;
  smtp_configured?: boolean;
  stripe_configured?: boolean;
  razorpay_configured?: boolean;
  memory_enabled?: boolean;
  rag_enabled?: boolean;
}

export interface UsageRecord {
  id: string;
  conversation_id?: string | null;
  action_type: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  image_count: number;
  latency_ms: number;
  status: string;
  created_at: string;
}

export interface UsageSummary {
  total_requests: number;
  total_tokens: number;
  today_tokens: number;
  daily_token_limit: number;
  total_images: number;
  recent_records: UsageRecord[];
}

export interface ImageGenerateResponse {
  provider: string;
  model: string;
  prompt: string;
  revised_prompt?: string | null;
  image_url?: string | null;
  image_base64?: string | null;
  attachment_id?: string | null;
  conversation_id?: string | null;
}

export interface ChartPayload {
  type?: "bar" | "line" | "area" | "pie";
  title?: string;
  xKey?: string;
  series?: string[];
  data: Array<Record<string, string | number>>;
}

export interface UserMemory {
  id: string;
  title: string;
  content: string;
  category: "preference" | "project" | "fact" | "instruction";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url?: string | null;
  category: string;
  tags: string[];
  author_name: string;
  reading_time_minutes: number;
  status: "draft" | "published";
  is_featured: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogDetailResponse {
  post: BlogPost;
  related: BlogPost[];
  previous_post?: BlogPost | null;
  next_post?: BlogPost | null;
}

export interface PlanTierInfo {
  id: "free" | "pro" | "premium" | "enterprise";
  name: string;
  tagline: string;
  monthly_price_usd: number | null;
  yearly_price_usd: number | null;
  daily_token_limit: number;
  rpm_limit: number;
  features: string[];
}

export interface BillingHistoryItem {
  id: string;
  plan_tier: string;
  amount_cents: number;
  currency: string;
  status: string;
  provider?: string | null;
  description: string;
  created_at: string;
}

export interface BillingStatusResponse {
  subscription: {
    plan_tier: string;
    billing_cycle: string;
    status: string;
    provider?: string | null;
    current_period_end?: string | null;
    updated_at: string;
  };
  history: BillingHistoryItem[];
  stripe_configured: boolean;
  razorpay_configured: boolean;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface AdminOverview {
  admin_email: string;
  counts: {
    users: number;
    conversations: number;
    messages: number;
    blog_posts: number;
    published_posts: number;
    contact_submissions: number;
    ai_requests: number;
    total_tokens: number;
    total_images: number;
  };
  subscriptions_by_tier: Record<string, number>;
  integrations: {
    llm_providers: ProviderCapability[];
    image_providers: ImageProviderCapability[];
    smtp_configured: boolean;
    stripe_configured: boolean;
    razorpay_configured: boolean;
    redis_connected: boolean;
    redis_status: string;
  };
  metrics: Record<string, unknown>;
}

export interface AdminLogEntry {
  timestamp: string;
  level: string;
  logger: string;
  request_id?: string;
  message: string;
}

