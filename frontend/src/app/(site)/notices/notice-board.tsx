"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { ChipTabs } from "@/components/ui/form";
import { Breadcrumb, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { NoticeCard } from "@/components/site/cards";
import type { NoticeItem } from "@/lib/api-types";

type Filter = string;

export function NoticeBoard({ notices, categories }: { notices: NoticeItem[]; categories: string[] }) {
  const [cat, setCat] = useState<Filter>("সব");
  const items = notices.filter((n) => cat === "সব" || n.category === cat);
  return (
    <>
      <section className="wrap pt-page">
        <Breadcrumb current="নোটিশ" />
        <h1 className="mt-1 mb-4 text-h1">নোটিশ বোর্ড</h1>
        <ChipTabs<Filter> label="নোটিশের বিভাগ" bleed value={cat} onChange={setCat} options={["সব", ...categories].map((c) => ({ value: c, label: c }))} />
      </section>
      <section className="wrap pt-[18px] pb-page">
        {items.length ? (
          <div className="grid-fit-360 gap-3.5">
            {items.map((n) => (
              <NoticeCard key={n.slug} notice={n} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Bell className="size-7" aria-hidden />}
            title="এই বিভাগে এখন কোনো নোটিশ নেই"
            sub="নতুন নোটিশ এলে এখানে দেখাবে।"
            action={
              <Button variant="outline" onClick={() => setCat("সব")}>
                সব নোটিশ দেখুন
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}
