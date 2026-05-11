"use client";

import { useQuery } from "@tanstack/react-query";
import { OtpData } from "@/types";

async function fetchOtp(): Promise<OtpData> {
  const res = await fetch("/api/buyer/otp");
  if (!res.ok) throw new Error("Failed to fetch OTP");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

export function useOtpPoll() {
  return useQuery({
    queryKey: ["buyer-otp"],
    queryFn: fetchOtp,
    refetchInterval: 5000, // Poll every 5 seconds — no WebSocket needed
    refetchIntervalInBackground: false, // Stop polling when tab not focused
    staleTime: 4000,
    retry: 2,
  });
}
