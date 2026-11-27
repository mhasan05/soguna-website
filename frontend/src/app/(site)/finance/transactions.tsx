"use client";

import { Lock } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { MembersOnly } from "@/components/site/members-only";
import { Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { formatDate, money } from "@/lib/bn";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { useQuery } from "@/lib/use-query";

export function Transactions() {
  return (
    <MembersOnly
      fallback={
        <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-xl border border-brand-100 bg-brand-50 p-5">
          <div className="flex flex-[1_1_300px] items-start gap-3">
            <Lock className="mt-1 size-5 flex-none text-brand" aria-hidden />
            <span className="text-[17px]">প্রতিটি লেনদেন ও ভাউচারের ছবি সদস্যরা লগইন করে দেখতে পারেন।</span>
          </div>
          <LinkButton href="/login?next=/finance" className="px-[22px]">
            লগইন করুন
          </LinkButton>
        </div>
      }
    >
      <List />
    </MembersOnly>
  );
}

function List() {
  const { session } = useSession();
  const { data, error } = useQuery(`tx:${session?.memberId}`, () => api.transactions());
  if (error) return <p className="text-[17px] text-blood-700">{error}</p>;
  if (!data) return <Skeleton className="h-64 w-full" />;
  const items = data;
  if (!items.length) return <p className="text-[17px] text-muted">এখনো কোনো লেনদেন নেই।</p>;
  return (
    <>
      <div className="rounded-xl border border-line bg-white px-[18px] py-1">
        {items.map((t, i) => {
          const income = t.kind === "income";
          return (
            <div key={t.id} className={cn("flex items-center gap-3 py-3.5", i < items.length - 1 && "border-b border-divider")}>
              <span className={cn("flex size-11 flex-none items-center justify-center rounded-full text-[22px] font-bold", income ? "bg-success text-brand" : "bg-gold-50 text-gold-700")}>
                {income ? "+" : "−"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[17px] leading-[1.4] font-semibold">{t.title}</div>
                <div className="text-[15px] text-muted">
                  {formatDate(t.date, { year: false })}
                  {t.meta && ` · ${t.meta}`}
                </div>
              </div>
              <div className="flex-none text-right">
                <div className={cn("text-[18px] font-bold", income ? "text-brand" : "text-gold-700")}>
                  {income ? "+" : "−"}
                  {money(t.amount)}
                </div>
                {t.voucher && (
                  <a href={t.voucher} target="_blank" rel="noreferrer" className="text-[14px]">
                    ভাউচার
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
