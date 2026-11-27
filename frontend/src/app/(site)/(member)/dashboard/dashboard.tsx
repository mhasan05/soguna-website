"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CreditCard, Droplet, HeartHandshake, LayoutDashboard, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Toggle } from "@/components/ui/form";
import { Pill, Skeleton, Stripe } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { MONTHS, avatarInitials, bn, daysBetween, formatDate, money } from "@/lib/bn";
import { api } from "@/lib/api";
import { setMe, useNow, useSession } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/cn";

export function Dashboard() {
  const { session } = useSession();
  const now = useNow();
  const toast = useToast();
  const me = session?.me;
  const id = session?.memberId;
  const dues = useQuery(id ? `dues:${id}` : null, () => api.myDues());
  const events = useQuery("events:upcoming", () => api.events("upcoming"));
  const notices = useQuery("notices", () => api.notices());
  const [busy, setBusy] = useState(false);

  if (!me) return null;

  const month = new Date(now).getMonth() + 1;
  const months = dues.data?.months ?? [];
  const dueCount = months.filter((m) => m.status === "due").length;
  const paid = months.filter((m) => m.status === "paid").length * (dues.data?.monthly_amount ?? 0);
  const monthStatus = months.find((m) => m.month === month)?.status;
  const nextEvent = events.data?.[0];
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();
  const newNotices = notices.data?.filter((n) => n.published_at >= weekAgo).length;

  const last = me.last_donation_date ? new Date(me.last_donation_date) : null;
  const daysSince = last ? daysBetween(last, new Date(now)) : null;
  const donatedToday = daysSince === 0;

  const onAvailability = async (v: boolean) => {
    setBusy(true);
    try {
      setMe(await api.setAvailability(v));
      toast.success(v ? "রক্তদাতার তালিকায় আপনাকে দেখানো হবে" : "আপাতত তালিকায় দেখানো হবে না");
    } catch {
      toast.error("সংরক্ষণ হয়নি — আবার চেষ্টা করুন");
    } finally {
      setBusy(false);
    }
  };

  const onDonated = async () => {
    setBusy(true);
    const previous = me.last_donation_date;
    try {
      const updated = await api.donatedToday(false);
      setMe(updated);
      toast.success("জাযাকাল্লাহ! ৯০ দিন পর আবার তালিকায় আসবেন", async () => {
        try {
          setMe(await api.donatedToday(true, previous));
        } catch {
          toast.error("ফিরিয়ে আনা যায়নি");
        }
      });
    } catch {
      toast.error("সংরক্ষণ হয়নি — আবার চেষ্টা করুন");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap flex flex-col gap-5 pt-[clamp(20px,3vw,40px)] pb-page">
      <div className="overflow-hidden rounded-2xl bg-brand text-white">
        <Stripe />
        <div className="flex flex-wrap items-center gap-4 p-[clamp(18px,2.6vw,28px)]">
          {me.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.photo} alt="" className="size-[76px] flex-none rounded-full border-[3px] border-gold-300 object-cover" />
          ) : (
            <span className="flex size-[76px] flex-none items-center justify-center rounded-full border-[3px] border-gold-300 bg-brand-dark text-[30px] font-bold">{avatarInitials(me.name)}</span>
          )}
          <div className="min-w-0 flex-[1_1_200px]">
            <div className="text-[16px] opacity-90">আসসালামু আলাইকুম,</div>
            <div className="text-[clamp(24px,2.8vw,32px)] leading-[1.3] font-bold">{me.name}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {me.member_no && <span className="rounded-md bg-white/15 px-2.5 py-0.5 font-mono text-[15px]">{me.member_no}</span>}
              {dueCount ? <Pill className="bg-blood-100 text-blood-800">চাঁদা বাকি</Pill> : <Pill tone="success">সক্রিয়</Pill>}
            </div>
          </div>
          <LinkButton href="/profile" variant="ghostWhite">
            প্রোফাইল
          </LinkButton>
        </div>
      </div>

      <div className="grid-fit-150 gap-3">
        <Link href="/dues" className="flex flex-col gap-1.5 rounded-xl border border-line bg-white p-4 text-ink hover:border-brand-200 hover:no-underline">
          <span className="text-[15px] text-muted">চাঁদা · {MONTHS[month - 1]}</span>
          {!dues.data ? (
            <Skeleton className="h-7 w-24" />
          ) : monthStatus === "paid" ? (
            <Pill tone="success" className="self-start text-[16px] font-bold text-brand">
              পরিশোধিত
            </Pill>
          ) : monthStatus === "pending" ? (
            <Pill tone="gold" className="self-start text-[16px] font-bold">
              যাচাই চলছে
            </Pill>
          ) : (
            <Pill className="self-start bg-blood-100 text-[16px] font-bold text-blood-700">বাকি {money(dues.data.monthly_amount)}</Pill>
          )}
          {dueCount > 0 && <span className="text-[14px] font-semibold text-blood-700">মোট {bn(dueCount)} মাস বাকি</span>}
        </Link>
        <Link href="/dues" className="rounded-xl border border-line bg-white p-4 text-ink hover:border-brand-200 hover:no-underline">
          <div className="text-[15px] text-muted">{bn(dues.data?.year ?? new Date(now).getFullYear())}-এ দেওয়া চাঁদা</div>
          <div className="text-[26px] leading-[1.3] font-bold text-brand">{dues.data ? money(paid) : "…"}</div>
        </Link>
        <Link href={nextEvent ? `/events/${nextEvent.slug}` : "/events"} className="rounded-xl border border-line bg-white p-4 text-ink hover:border-brand-200 hover:no-underline">
          <div className="text-[15px] text-muted">আসন্ন ইভেন্ট</div>
          <div className="text-[17px] leading-[1.4] font-semibold">{nextEvent ? `${nextEvent.title} · ${formatDate(nextEvent.start_at, { year: false })}` : events.data ? "এখন কিছু নেই" : "…"}</div>
        </Link>
        <Link href="/notices" className="rounded-xl border border-line bg-white p-4 text-ink hover:border-brand-200 hover:no-underline">
          <div className="text-[15px] text-muted">এ সপ্তাহের নোটিশ</div>
          <div className="text-[26px] leading-[1.3] font-bold text-gold-700">{newNotices === undefined ? "…" : `${bn(newNotices)}টি`}</div>
        </Link>
      </div>

      <div>
        <h2 className="mt-0 mb-3 text-[clamp(20px,2.2vw,26px)] font-bold">দ্রুত কাজ</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,46%),1fr))] gap-2.5">
          <QuickAction href="/dues" tone="gold" icon={<span className="text-[22px] font-bold">৳</span>} label="চাঁদা দিন" />
          <QuickAction href="/blood" tone="red" icon={<Droplet className="size-6" aria-hidden />} label="রক্তদাতা খুঁজুন" />
          <QuickAction href="/card" icon={<CreditCard className="size-6" aria-hidden />} label="সদস্য কার্ড" />
          <QuickAction href="/aid/apply" icon={<HeartHandshake className="size-6" aria-hidden />} label="সাহায্যের আবেদন" />
          <QuickAction href="/members" icon={<Users className="size-6" aria-hidden />} label="সদস্য তালিকা" />
          {me.role !== "member" && <QuickAction href="/admin" icon={<LayoutDashboard className="size-6" aria-hidden />} label="অ্যাডমিন প্যানেল" />}
        </div>
      </div>

      {me.wants_to_donate && me.blood_group && (
        <div className="flex flex-col gap-3.5 rounded-xl border-[1.5px] border-blood-200 bg-white p-[18px]">
          <div className="flex items-center gap-2.5">
            <Droplet className="size-6 text-blood" aria-hidden />
            <h2 className="m-0 text-[20px] font-bold">
              আমি রক্তদাতা · <span className="text-blood">{me.blood_group}</span>
            </h2>
          </div>
          <div className="text-[16px] text-muted">
            {donatedToday
              ? `শেষ রক্তদান: আজ, ${formatDate(new Date(now))} · ৯০ দিন পর আবার তালিকায় আসবেন`
              : last
                ? `শেষ রক্তদান: ${formatDate(last)} (${bn(daysSince ?? 0)} দিন আগে)`
                : "শেষ রক্তদানের তারিখ দেওয়া নেই"}
          </div>
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-[10px] bg-page px-3.5 py-2">
            <span>
              <span className="block text-[17px] font-semibold">আমি এখন রক্ত দিতে পারব</span>
              {me.available && !me.donor_ready && <span className="block text-[14px] text-muted">৩ মাস না হওয়া পর্যন্ত তালিকায় &quot;প্রস্তুত&quot; দেখাবে না</span>}
            </span>
            <Toggle checked={me.available} disabled={busy} onChange={onAvailability} label="রক্ত দিতে পারব" />
          </div>
          {!donatedToday && (
            <button type="button" disabled={busy} onClick={onDonated} className="h-[52px] rounded-[10px] border-[1.5px] border-blood bg-white text-[18px] font-bold text-blood-700 hover:bg-blood-50 disabled:opacity-60">
              আজ রক্ত দিয়েছি
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function QuickAction({ href, icon, label, tone = "green" }: { href: string; icon: ReactNode; label: string; tone?: "green" | "red" | "gold" }) {
  const tones = { green: "bg-brand-50 text-brand", red: "bg-blood-50 text-blood", gold: "bg-gold-50 text-gold-700" };
  return (
    <Link href={href} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-white p-3.5 text-center text-ink hover:border-brand-200 hover:no-underline">
      <span className={cn("flex size-11 items-center justify-center rounded-xl", tones[tone])}>{icon}</span>
      <span className="text-[17px] font-semibold">{label}</span>
    </Link>
  );
}
