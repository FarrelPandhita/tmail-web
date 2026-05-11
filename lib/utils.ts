import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEmailAgeDetails(createdAt: string | Date) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let status: "fresh" | "aging" | "expiring" = "fresh";
  let color = "text-green-400 border-green-400/30 bg-green-400/10";
  
  if (diffDays > 35) {
    status = "expiring";
    color = "text-red-400 border-red-400/30 bg-red-400/10";
  } else if (diffDays >= 15) {
    status = "aging";
    color = "text-amber-400 border-amber-400/30 bg-amber-400/10";
  }

  return { days: diffDays, status, color };
}

export function detectProvider(sender: string | null, subject: string | null): string {
  if (!sender && !subject) return "Unknown";
  
  const textToSearch = `${sender || ""} ${subject || ""}`.toLowerCase();
  
  if (textToSearch.includes("netflix")) return "Netflix";
  if (textToSearch.includes("google") || sender?.includes("@google.com")) return "Google";
  if (textToSearch.includes("steam") || sender?.includes("steampowered")) return "Steam";
  if (textToSearch.includes("discord")) return "Discord";
  if (textToSearch.includes("facebook") || textToSearch.includes("meta")) return "Facebook";
  if (textToSearch.includes("microsoft") || sender?.includes("accountprotection.microsoft.com")) return "Microsoft";
  if (textToSearch.includes("openai") || textToSearch.includes("chatgpt")) return "OpenAI";
  if (textToSearch.includes("amazon")) return "Amazon";
  if (textToSearch.includes("apple") || sender?.includes("apple.com")) return "Apple";
  if (textToSearch.includes("instagram")) return "Instagram";
  if (textToSearch.includes("twitter") || textToSearch.includes("x.com")) return "Twitter / X";
  
  return "Unknown";
}

export function getHealthBadge(isActive: boolean | null, createdAt: string | Date | null, lastReceivedAt: string | Date | null) {
  if (!isActive) return { status: "Dead", color: "text-red-400 border-red-400/30 bg-red-400/10" };
  
  if (!createdAt) return { status: "Unknown", color: "text-muted-foreground border-border bg-muted" };
  
  const createdDate = new Date(createdAt);
  const now = new Date();
  
  if (lastReceivedAt) {
    const receivedDate = new Date(lastReceivedAt);
    const diffHours = Math.abs(now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60);
    if (diffHours <= 24) {
      return { status: "Receiving", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" };
    }
  }

  const createdDiffDays = Math.abs(now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
  if (!lastReceivedAt && createdDiffDays <= 7) {
    return { status: "Healthy", color: "text-green-400 border-green-400/30 bg-green-400/10" };
  }
  
  return { status: "Idle", color: "text-amber-400 border-amber-400/30 bg-amber-400/10" };
}

export function getOtpExpiryBadge(receivedAt: string | Date | null) {
  if (!receivedAt) return null;
  
  const receivedDate = new Date(receivedAt);
  const now = new Date();
  const diffDays = Math.abs(now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (diffDays > 35) {
    return { status: "Expired", color: "text-red-400 border-red-400/30 bg-red-400/10" };
  } else if (diffDays >= 15) {
    return { status: "Aging", color: "text-amber-400 border-amber-400/30 bg-amber-400/10" };
  }
  
  return { status: "Fresh", color: "text-green-400 border-green-400/30 bg-green-400/10" };
}

/**
 * Strip HTML tags from an email body and return clean readable text.
 * Handles entities, body tag extraction, and whitespace collapsing.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";

  let text = html;

  // Extract only the <body> content if present (skip <head> CSS/JS noise)
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    text = bodyMatch[1];
  }

  // Replace block-level elements with newlines for readability
  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n");

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // Collapse excessive blank lines (max 2 consecutive newlines)
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}
