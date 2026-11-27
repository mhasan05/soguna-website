"use client";

import { RecordEditor, useEditId, type SectionDef } from "@/components/admin/crud";
import type { Entry } from "@/components/admin/res/finance";
import { api } from "@/lib/api";
import type { AidFund, EventItem, Site } from "@/lib/api-types";
import { useQuery } from "@/lib/use-query";

const isExp = (v: Record<string, unknown>) => v.kind === "expense";

export default function EditEntry() {
  const isNew = !useEditId();
  const site = useQuery<Site>("site", () => api.site());
  const events = useQuery<EventItem[]>("events:all", () => api.events());
  const funds = useQuery<AidFund[]>("aid-funds", () => api.aidFunds());
  const opts = (xs?: { name: string }[]) => (xs ?? []).map((c) => ({ value: c.name, label: c.name }));

  const sections: SectionDef[] = [
    {
      title: "এন্ট্রি",
      description: isNew ? undefined : "ধরন ও লিংক বদলানো যায় না। ভুল হলে এন্ট্রিটি কারণসহ বাতিল করে নতুন এন্ট্রি দিন।",
      fields: [
        ...(isNew ? [{ name: "kind", label: "ধরন", type: "select" as const, options: [{ value: "expense", label: "ব্যয়" }, { value: "income", label: "আয়" }] }] : []),
        { name: "cat_expense", label: "খাত", type: "select", options: opts(site.data?.lists.expenseCat), show: isExp },
        { name: "cat_income", label: "খাত", type: "select", options: opts(site.data?.lists.incomeCat), show: (v) => !isExp(v) },
        { name: "amount", label: "টাকা (৳)", type: "number", required: "টাকার পরিমাণ লিখুন", placeholder: "যেমন: ৫০০০" },
        { name: "date", label: "তারিখ", type: "date", required: "তারিখ দিন" },
        { name: "description", label: "বিবরণ", wide: true, placeholder: "যেমন: ৩০০ কম্বল ক্রয়" },
      ],
    },
    ...(isNew
      ? [
          {
            title: "লিংক ও ভাউচার",
            fields: [
              {
                name: "link",
                label: "ইভেন্ট / আবেদনের সাথে লিংক",
                type: "select" as const,
                wide: true,
                options: [
                  { value: "", label: "কোনোটি না" },
                  ...(events.data ?? []).map((e) => ({ value: `event:${e.slug}`, label: `ইভেন্ট: ${e.title}` })),
                  ...(funds.data ?? []).map((f) => ({ value: `aid:${f.id}`, label: `আবেদন: ${f.title}` })),
                ],
              },
              { name: "voucher_image", label: "ভাউচারের ছবি", type: "image" as const, required: "খরচের জন্য ভাউচারের ছবি বাধ্যতামূলক", show: isExp, hint: "ক্যাশ মেমো বা রসিদের ছবি তুলুন" },
            ],
          },
        ]
      : []),
  ];

  return (
    <RecordEditor<Entry>
      slug="finance"
      base="/admin/finance/entries/"
      backHref="/admin/finance"
      noun="এন্ট্রি"
      createLabel="নতুন আয়/ব্যয় এন্ট্রি"
      sections={sections}
      titleOf={(e) => e.description || e.category}
      canDelete={false}
      defaults={{ kind: "expense", date: new Date().toISOString().slice(0, 10), link: "" }}
      fromRecord={(e) => ({ kind: e.kind, cat_expense: e.category, cat_income: e.category, amount: String(e.amount) })}
      toBody={(v, fresh) => {
        const { cat_expense, cat_income, link, kind, ...rest } = v;
        const category = (kind ?? (cat_expense !== undefined ? "expense" : "income")) === "expense" ? cat_expense : cat_income;
        const l = String(link ?? "");
        return fresh
          ? { ...rest, kind, category, event: l.startsWith("event:") ? l.slice(6) : null, aid_request: l.startsWith("aid:") ? l.slice(4) : null }
          : { amount: rest.amount, date: rest.date, description: rest.description, category };
      }}
    />
  );
}
