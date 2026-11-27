"use client";

import { RecordEditor, type SectionDef } from "@/components/admin/crud";
import { useAdmin } from "@/components/admin/store";
import type { AdminEvent } from "@/components/admin/res/events";
import { api } from "@/lib/api";
import type { Site } from "@/lib/api-types";
import { useQuery } from "@/lib/use-query";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (iso: string) => {
  const d = new Date(iso);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};
const done = (v: Record<string, unknown>) => v.status === "completed";

export default function EditEvent() {
  const { role } = useAdmin();
  const site = useQuery<Site>("site", () => api.site());
  const cats = [{ value: "", label: "—" }, ...(site.data?.lists.eventCat ?? []).map((c) => ({ value: c.name, label: c.name }))];

  const sections: SectionDef[] = [
    {
      title: "ইভেন্টের তথ্য",
      fields: [
        { name: "title", label: "শিরোনাম", required: "শিরোনাম লিখুন", wide: true, placeholder: "যেমন: শীতবস্ত্র বিতরণ ২০২৬" },
        { name: "category", label: "ক্যাটাগরি", type: "select", options: cats },
        { name: "status", label: "অবস্থা", type: "select", options: [{ value: "upcoming", label: "আসন্ন" }, { value: "completed", label: "সম্পন্ন" }] },
        { name: "venue", label: "স্থান", required: "স্থান লিখুন", wide: true },
        { name: "date", label: "তারিখ", type: "date", required: "তারিখ দিন" },
        { name: "time", label: "সময়", type: "time" },
        { name: "time_note", label: "সময়ের নোট", hint: "যেমন: বাদ জুমা — সময়ের বদলে দেখাবে" },
        { name: "meta_note", label: "বিশেষ নোট", hint: "কার্ডে 'কতজন আসছেন'-এর বদলে দেখাবে" },
        { name: "description", label: "বিবরণ", type: "textarea", rows: 5 },
        { name: "cover", label: "কভার ছবি", type: "image", current: "cover_src", hint: "WebP-তে ছোট হয়ে যাবে" },
      ],
    },
    {
      title: "অংশগ্রহণ",
      description: "সাইটের বাইরে (ফোনে বা সরাসরি) যারা নাম দিয়েছেন — 'আমি আসছি' সংখ্যার সাথে যোগ হবে।",
      fields: [
        { name: "offline_going", label: "সাইটের বাইরে আসছেন", type: "number" },
        { name: "offline_volunteers", label: "সাইটের বাইরে স্বেচ্ছাসেবক", type: "number" },
      ],
    },
    {
      title: "রিপোর্ট (সম্পন্ন হলে)",
      fields: [
        { name: "beneficiaries_count", label: "উপকৃত (সংখ্যা)", type: "number", show: done },
        { name: "beneficiary_label", label: "উপকৃতের লেবেল", show: done, placeholder: "পরিবার উপকৃত" },
        { name: "report_volunteers", label: "স্বেচ্ছাসেবক", type: "number", show: done },
        { name: "report_cost", label: "মোট খরচ (৳)", type: "number", show: done, hint: "ফাঁকা রাখলে লিংক করা খরচ যোগ হবে" },
        { name: "report", label: "রিপোর্টের লেখা", type: "textarea", show: done },
      ],
    },
  ];

  return (
    <RecordEditor<AdminEvent>
      slug="events"
      base="/admin/events/"
      backHref="/admin/events"
      noun="ইভেন্ট"
      sections={sections}
      titleOf={(e) => e.title}
      canDelete={role === "admin"}
      deleteWarn='যারা "আমি আসছি" দিয়েছেন তাদের তালিকাও মুছে যাবে।'
      defaults={{ status: "upcoming", time: "10:00", offline_going: "0", offline_volunteers: "0", beneficiary_label: "পরিবার উপকৃত", category: "" }}
      fromRecord={(e) => ({ ...toLocal(e.start_at), category: e.category ?? "" })}
      toBody={(v) => {
        const { date, time, ...rest } = v;
        return {
          ...rest,
          category: rest.category || null,
          offline_going: rest.offline_going ?? 0,
          offline_volunteers: rest.offline_volunteers ?? 0,
          start_at: new Date(`${date}T${time || "10:00"}`).toISOString(),
        };
      }}
    />
  );
}
