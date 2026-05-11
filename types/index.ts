// Shared TypeScript types for TMail Web

export type UserRole = "buyer" | "generator_admin" | "superadmin";

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  sub: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

// ─── API Response Wrapper ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── OTP ─────────────────────────────────────────────────────────────────────

export interface OtpData {
  latest_otp: string | null;
  source: string | null;
  updated_at: string;
  email: string;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface InboxMessage {
  id: number;
  sender: string | null;
  subject: string | null;
  otp_code: string | null;
  received_at: string;
  has_body: boolean;
}

export interface InboxMessageFull extends InboxMessage {
  raw_body: string | null;
  recipient: string | null;
}

// ─── Generated Email ─────────────────────────────────────────────────────────

export interface GeneratedEmailSummary {
  id: number;
  generated_email: string;
  is_active: boolean | null;
  created_at: string;
  buyer_username: string | null;
  latest_otp: string | null;
  message_count: number;
}

// ─── Buyer ───────────────────────────────────────────────────────────────────

export interface BuyerSummary {
  id: number;
  username: string;
  is_active: boolean | null;
  created_at: string;
  email_count: number;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: number;
  admin_email: string;
  action: string;
  target_email: string | null;
  created_at: string;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface SuperadminStats {
  total_emails: number;
  active_emails: number;
  total_buyers: number;
  total_messages_today: number;
}
