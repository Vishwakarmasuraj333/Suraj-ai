export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
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

