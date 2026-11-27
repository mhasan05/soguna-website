"use client";

import { formatDate } from "@/lib/bn";
import { useNow } from "@/lib/session";

export function VerifiedAt() {
  const now = useNow();
  return <div className="text-[15px] text-muted">যাচাইয়ের সময়: {formatDate(new Date(now))}</div>;
}
