import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password too long"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ─── Email Generation ────────────────────────────────────────────────────────

export const GenerateEmailSchema = z.object({
  mode: z.enum(["random", "custom"]),
  customEmail: z
    .string()
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
      "Only alphanumeric, dots, dashes, underscores allowed"
    )
    .min(3)
    .max(40)
    .optional(),
  buyerId: z.string().uuid("Invalid buyer ID").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export type GenerateEmailInput = z.infer<typeof GenerateEmailSchema>;

// ─── Password Reset ──────────────────────────────────────────────────────────

export const ResetPasswordSchema = z.object({
  emailId: z.string().uuid("Invalid email ID"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// ─── Search ──────────────────────────────────────────────────────────────────

export const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  page: z.coerce.number().int().positive().default(1),
});

export type SearchInput = z.infer<typeof SearchSchema>;

// ─── Pagination ──────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;
