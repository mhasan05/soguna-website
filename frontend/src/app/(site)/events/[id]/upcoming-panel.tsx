"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Checkbox } from "@/components/ui/form";
import { RsvpButton, useEventRsvp } from "@/components/site/rsvp";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { bn } from "@/lib/bn";
import { useNow } from "@/lib/session";

export function UpcomingPanel({ slug, start, going, volunteers }: { slug: string; start: string; going: number; volunteers: number }) {
  const now = useNow();
  const router = useRouter();
  const toast = useToast();
  const rsvp = useEventRsvp(slug);
  const { data, setData, loggedIn } = rsvp;
  const [busy, setBusy] = useState(false);

  const diff = Math.max(0, new Date(start).getTime() - now);
  const parts = [
    { v: Math.floor(diff / 86_400_000), l: "দিন" },
    { v: Math.floor(diff / 3_600_000) % 24, l: "ঘণ্টা" },
    { v: Math.floor(diff / 60_000) % 60, l: "মিনিট" },
  ];

  const isVol = !!data?.my_rsvp.is_volunteer;
  const onVolunteer = async () => {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/events/${slug}`)}`);
      return;
    }
    if (!data || busy) return;
    setBusy(true);
    try {
      const fresh = await api.rsvp(slug, { is_volunteer: !isVol });
      setData(() => fresh);
      if (!isVol) toast.success("স্বেচ্ছাসেবক তালিকায় নাম উঠেছে");
    } catch {
      toast.error("সংরক্ষণ হয়নি — আবার চেষ্টা করুন");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-brand-50 p-5">
      <div className="text-[17px] font-semibold text-brand-dark">শুরু হতে বাকি</div>
      <div className="grid max-w-[360px] grid-cols-3 gap-2" aria-live="off">
        {parts.map((p) => (
          <div key={p.l} className="rounded-[10px] bg-white px-1 py-2.5 text-center">
            <div className="text-[clamp(26px,3vw,34px)] leading-[1.1] font-bold text-brand">{bn(p.v)}</div>
            <div className="text-[14px] text-muted">{p.l}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <RsvpButton slug={slug} baseCount={going} size="xl" showCount={false} state={rsvp} />
        <span className="text-[17px] text-body">
          {bn(data?.going_count ?? going)} জন আসছেন · {bn(data?.volunteer_count ?? volunteers)} জন স্বেচ্ছাসেবক
        </span>
      </div>
      <Checkbox checked={isVol} disabled={busy} onChange={onVolunteer} className="items-center">
        আমি স্বেচ্ছাসেবক হিসেবে কাজ করতে চাই
      </Checkbox>
    </div>
  );
}
