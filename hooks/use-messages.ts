"use client";

import { useQuery } from "@tanstack/react-query";
import { InboxMessage } from "@/types";

interface MessagesResponse {
  messages: InboxMessage[];
  email: string;
}

async function fetchMessages(): Promise<MessagesResponse> {
  const res = await fetch("/api/buyer/messages");
  if (!res.ok) throw new Error("Failed to fetch messages");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

export function useMessages() {
  return useQuery({
    queryKey: ["buyer-messages"],
    queryFn: fetchMessages,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 4000,
    retry: 2,
  });
}
