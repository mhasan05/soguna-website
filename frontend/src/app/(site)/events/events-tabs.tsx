"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Segmented } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { EventCoverCard } from "@/components/site/cards";
import type { EventItem } from "@/lib/api-types";

type Tab = "upcoming" | "completed";

export function EventsTabs({ upcoming, done }: { upcoming: EventItem[]; done: EventItem[] }) {
  const router = useRouter();
  const tab: Tab = useSearchParams()?.get("tab") === "completed" ? "completed" : "upcoming";
  const setTab = (t: Tab) => router.replace(t === "completed" ? "/events?tab=completed" : "/events", { scroll: false });
  const items = tab === "upcoming" ? upcoming : done;

  return (
    <>
      <div className="wrap">
        <Segmented<Tab>
          full
          label="ইভেন্টের ধরন"
          className="max-w-[420px]"
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: "আসন্ন" },
            { value: "completed", label: "সম্পন্ন" },
          ]}
        />
      </div>
      <section className="wrap pt-5 pb-page">
        {items.length ? (
          <div className="grid-fit-340 gap-4">
            {items.map((e) => (
              <EventCoverCard key={e.slug} event={e} />
            ))}
          </div>
        ) : (
          <EmptyState
            tone="gold"
            icon={<CalendarDays className="size-7" aria-hidden />}
            title="সামনে কোনো ইভেন্ট ঠিক হয়নি"
            sub='আগের কাজগুলো "সম্পন্ন" ট্যাবে দেখুন।'
            action={
              <Button variant="outline" onClick={() => setTab("completed")}>
                সম্পন্ন কার্যক্রম
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}
