"use client";

import Link from "next/link";
import { AdminPage, Panel, PanelTitle } from "@/components/admin/widgets";
import { useAdmin } from "@/components/admin/store";
import { ProgressBar, Skeleton } from "@/components/ui/primitives";
import { get } from "@/lib/api";
import { bn, formatDate, formatTime, money } from "@/lib/bn";
import { cn } from "@/lib/cn";
import { useQuery } from "@/lib/use-query";

interface Dashboard {
  members: number;
  new_this_month: number;
  pending_members: number;
  dues_collected: number;
  dues_paid_members: number;
  dues_due_members: number;
  dues_pct: number;
  monthly_dues: number;
  balance: number;
  pending_verify: number;
  activity: { id: number; text: string; user: string | null; action: string; timestamp: string }[];
}

const DOT: Record<string, string> = { create: "bg-brand", approve: "bg-brand", verify: "bg-brand", void: "bg-muted", delete: "bg-blood", reject: "bg-muted", update: "bg-gold" };

export default function AdminDashboard() {
  const { canAccess } = useAdmin();
  const { data, error } = useQuery("admin:dashboard", () => get<Dashboard>("/admin/dashboard/"));

  if (error) return <AdminPage slug="">{<p className="text-blood-700">{error}</p>}</AdminPage>;
  if (!data)
    return (
      <AdminPage slug="">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-60 w-full" />
      </AdminPage>
    );

  const stats = [
    { label: "মোট সদস্য", value: bn(data.members), sub: `এ মাসে নতুন ${bn(data.new_this_month)} জন`, color: "text-brand", to: "members" },
    { label: "অনুমোদনের অপেক্ষায়", value: bn(data.pending_members), sub: "নতুন আবেদন", color: "text-gold-700", to: "members" },
    { label: "এ মাসের চাঁদা", value: money(data.dues_collected), sub: `${bn(data.dues_pct)}% আদায়`, color: "text-brand", to: "dues" },
    { label: "ব্যালেন্স", value: money(data.balance), sub: "যাচাইকৃত হিসাব", color: "text-brand-dark", to: "finance" },
    { label: "পেমেন্ট যাচাই বাকি", value: bn(data.pending_verify), sub: "Transaction ID মেলাতে হবে", color: "text-gold-700", to: "dues" },
  ];

  return (
    <AdminPage slug="">
      <div className="grid-fit-200 gap-3">
        {stats
          .filter((s) => canAccess(s.to))
          .map((s) => (
            <Link key={s.label} href={`/admin/${s.to}`} className="rounded-xl border border-line bg-white p-4 text-ink hover:border-brand-200 hover:no-underline">
              <div className="text-[15px] text-muted">{s.label}</div>
              <div className={cn("text-[30px] leading-[1.25] font-bold", s.color)}>{s.value}</div>
              <div className="text-[14px] text-muted">{s.sub}</div>
            </Link>
          ))}
      </div>
      {canAccess("dues") && (
        <Panel className="px-[18px] py-4">
          <div className="mb-2 flex justify-between gap-2">
            <h2 className="m-0 text-[19px] font-bold">এ মাসের চাঁদা আদায়</h2>
            <span className="text-[16px] font-bold text-gold-700">{bn(data.dues_pct)}%</span>
          </div>
          <ProgressBar value={data.dues_pct} height={14} />
          <div className="mt-1.5 text-[15px] text-muted">
            {money(data.dues_collected)} আদায় · {bn(data.dues_paid_members)} জন দিয়েছেন · {bn(data.dues_due_members)} জন বাকি
          </div>
        </Panel>
      )}
      <Panel className="px-[18px] py-1.5">
        <PanelTitle>সাম্প্রতিক কার্যকলাপ</PanelTitle>
        {!data.activity.length && <p className="py-4 text-muted">এখনো কোনো কার্যকলাপ নেই।</p>}
        {data.activity.map((a, i) => (
          <div key={a.id} className={cn("flex items-start gap-3 py-3", i < data.activity.length - 1 && "border-b border-divider")}>
            <span className={cn("mt-2 size-2.5 flex-none rounded-full", DOT[a.action] ?? "bg-faint")} />
            <div className="min-w-0 flex-1">
              <div className="text-[16px]">{a.text}</div>
              <div className="text-[14px] text-muted">
                {formatDate(a.timestamp, { year: false })} · {formatTime(a.timestamp)}
                {a.user ? ` · ${a.user}` : ""}
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </AdminPage>
  );
}
