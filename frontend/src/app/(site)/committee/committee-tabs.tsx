"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { Segmented } from "@/components/ui/form";
import { Avatar, Breadcrumb } from "@/components/ui/primitives";
import { AnchorButton } from "@/components/ui/button";
import { bn, initialOf } from "@/lib/bn";
import type { Committee } from "@/lib/api-types";
import { Img } from "@/components/ui/primitives";

type Term = Committee["current"];

/** The API only returns a phone for সভাপতি and সাধারণ সম্পাদক. */
export function CommitteeTabs({ current, past }: { current: Term; past: Term }) {
  const [tab, setTab] = useState<"current" | "past">("current");
  const term = tab === "current" ? current : past;
  const list = term?.members ?? [];
  return (
    <>
      <section className="wrap pt-page">
        <Breadcrumb current="কমিটি" />
        <h1 className="mt-1 mb-1.5 text-h1">কার্যনির্বাহী কমিটি</h1>
        <p className="mt-0 mb-5 text-[17px] text-muted">{term ? `সেশন ${term.name}${tab === "current" ? ` · মোট ${bn(list.length)} জন` : ""}` : "এখনো কমিটির তথ্য যোগ হয়নি"}</p>
        <Segmented
          label="কমিটির সেশন"
          value={tab}
          onChange={setTab}
          options={[
            { value: "current", label: "বর্তমান কমিটি" },
            { value: "past", label: "পূর্ববর্তী কমিটি" },
          ]}
        />
      </section>
      <section className="wrap grid-fit-260 gap-3.5 pt-6">
        {list.map((c) => (
          <div key={c.id} className="flex flex-col items-center gap-1 rounded-xl border border-line bg-white p-[18px] text-center shadow-card">
            {c.photo ? <Img src={c.photo} alt={c.name} className="mb-2 size-24 rounded-full" /> : <Avatar label={initialOf(c.name)} size={96} tone="photo" className="mb-2" />}
            <div className="text-[15px] font-semibold text-brand">{c.title}</div>
            <div className="text-[19px] leading-[1.4] font-semibold">{c.name}</div>
            <div className="text-[15px] text-muted">{c.para}</div>
            {c.phone && (
              <AnchorButton href={`tel:${c.phone}`} variant="outline" block className="mt-2.5" icon={<Phone className="size-5" aria-hidden />}>
                কল করুন
              </AnchorButton>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
