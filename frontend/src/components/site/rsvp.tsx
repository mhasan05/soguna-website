"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { useSession } from "@/lib/session";
import { bn } from "@/lib/bn";
import { api } from "@/lib/api";
import type { EventDetail } from "@/lib/api-types";
import { useQuery } from "@/lib/use-query";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

/** Loads the member's own RSVP + live counts (logged-in only). */
export function useEventRsvp(slug: string, enabled = true) {
  const { session } = useSession();
  const q = useQuery<EventDetail>(session && enabled ? `rsvp:${slug}:${session.memberId}` : null, () => api.event(slug));
  return { ...q, loggedIn: !!session };
}

export type RsvpState = ReturnType<typeof useEventRsvp>;

/** "আমি আসছি" — optimistic toggle; visitors are sent to login first. */
export function RsvpButton({ slug, baseCount, size = "md", showCount = true, state }: { slug: string; baseCount: number; size?: "md" | "xl"; showCount?: boolean; state?: RsvpState }) {
  const router = useRouter();
  const toast = useToast();
  const own = useEventRsvp(slug, !state);
  const { data, setData, loggedIn } = state ?? own;
  const [busy, setBusy] = useState(false);
  const going = !!data?.my_rsvp.going;
  const count = data?.going_count ?? baseCount;

  const onClick = async () => {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/events/${slug}`)}`);
      return;
    }
    if (!data || busy) return;
    const next = !going;
    setData((d) => ({ ...d, my_rsvp: { ...d.my_rsvp, going: next }, going_count: d.going_count + (next ? 1 : -1) }));
    setBusy(true);
    try {
      const fresh = await api.rsvp(slug, { going: next, ...(next ? {} : { is_volunteer: false }) });
      setData(() => fresh);
    } catch {
      setData((d) => ({ ...d, my_rsvp: { ...d.my_rsvp, going: !next }, going_count: d.going_count + (next ? -1 : 1) }));
      toast.error("সংরক্ষণ হয়নি — আবার চেষ্টা করুন");
    } finally {
      setBusy(false);
    }
  };

  const big = size === "xl";
  return (
    <div className="flex flex-wrap items-center gap-3">
      {going ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-brand font-semibold text-brand",
            big ? "h-14 bg-white px-6 text-[19px] font-bold" : "h-12 bg-brand-50 px-[18px] text-[17px]",
          )}
        >
          <Check className="size-5" aria-hidden />
          আপনি আসছেন
        </button>
      ) : (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={false}
          className={cn("rounded-[10px] bg-brand font-semibold text-white hover:bg-brand-dark", big ? "h-14 px-7 text-[19px] font-bold" : "h-12 px-5 text-[17px]")}
        >
          আমি আসছি
        </button>
      )}
      {showCount && <span className={cn("text-muted", big ? "text-[17px] text-body" : "text-[15px]")}>{bn(count)} জন আসছেন</span>}
    </div>
  );
}
