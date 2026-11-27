"use client";

import { useState } from "react";
import { HeartHandshake, Phone } from "lucide-react";
import { ChipTabs } from "@/components/ui/form";
import { EmptyState, Pill } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { AidFundCard } from "@/components/site/aid-card";
import type { AidFund, JobItem, ServiceItem } from "@/lib/api-types";
import { formatDate } from "@/lib/bn";

type Tab = "fund" | "service" | "jobs";

export function AidTabs({ funds, services, categories, jobs }: { funds: AidFund[]; services: ServiceItem[]; categories: string[]; jobs: JobItem[] }) {
  const [tab, setTab] = useState<Tab>("fund");
  const [cat, setCat] = useState("সব");
  const shown = services.filter((s) => cat === "সব" || s.category === cat);

  return (
    <>
      <ChipTabs<Tab>
        label="বিভাগ"
        value={tab}
        onChange={setTab}
        options={[
          { value: "fund", label: "সাহায্য তহবিল" },
          { value: "service", label: "গ্রামের সেবা" },
          { value: "jobs", label: "চাকরি ও শিক্ষা" },
        ]}
      />

      {tab === "fund" &&
        (funds.length ? (
          <>
            <div className="mt-[18px] grid-fit-340 gap-3.5">
              {funds.map((f) => (
                <AidFundCard key={f.id} fund={f} withImage />
              ))}
            </div>
            <p className="mt-3.5 mb-0 text-[15px] text-muted">আবেদনকারীর গোপনীয়তার জন্য নাম ও ছবি দেখানো হয় না, যদি না তিনি নিজে অনুমতি দেন।</p>
          </>
        ) : (
          <EmptyState
            className="mt-[18px]"
            tone="gold"
            icon={<HeartHandshake className="size-7" aria-hidden />}
            title="এখন কোনো চলমান তহবিল নেই"
            sub="সাধারণ তহবিলে দান করলে দরকারের সময় কাজে লাগবে।"
            action={<LinkButton href="/donate">সাধারণ তহবিলে দান</LinkButton>}
          />
        ))}

      {tab === "service" && (
        <>
          <div className="mt-3.5">
            <ChipTabs size="sm" label="সেবার ক্যাটাগরি" value={cat} onChange={setCat} options={["সব", ...categories].map((c) => ({ value: c, label: c }))} />
          </div>
          <div className="mt-3.5 grid-fit-300 gap-3">
            {shown.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-brand">{s.category}</div>
                  <div className="text-[18px] leading-[1.4] font-semibold">{s.name}</div>
                  <div className="text-[15px] text-muted">{s.para}</div>
                </div>
                <a href={`tel:${s.phone}`} aria-label={`${s.name}-কে কল করুন`} className="flex size-[52px] flex-none items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-dark">
                  <Phone className="size-6" aria-hidden />
                </a>
              </div>
            ))}
          </div>
          {!shown.length && <p className="mt-4 text-[17px] text-muted">এই ক্যাটাগরিতে এখনো কেউ নেই।</p>}
        </>
      )}

      {tab === "jobs" && (
        <div className="mt-[18px] grid-fit-340 gap-3">
          {jobs.map((j) => (
            <article key={j.id} className="rounded-xl border border-line bg-white p-[18px]">
              <div className="flex flex-wrap justify-between gap-2">
                <Pill tone={j.kind === "চাকরি" ? "green" : "gold"}>{j.kind}</Pill>
                <span className="text-[15px] text-muted">{formatDate(j.published_at, { year: false })}</span>
              </div>
              <h3 className="mt-2.5 mb-1 text-[19px] leading-[1.45] font-semibold">{j.title}</h3>
              <p className="m-0 text-[16px] text-muted">{j.description}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
