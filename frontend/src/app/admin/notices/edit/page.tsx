"use client";

import { RecordEditor, type SectionDef } from "@/components/admin/crud";
import { useAdmin } from "@/components/admin/store";
import type { AdminNotice } from "@/components/admin/res/notices";
import { api } from "@/lib/api";
import type { Site } from "@/lib/api-types";
import { useQuery } from "@/lib/use-query";

export default function EditNotice() {
  const { role, refreshBadges } = useAdmin();
  const volunteer = role === "volunteer";
  const site = useQuery<Site>("site", () => api.site());
  const cats = (site.data?.lists.noticeCat ?? []).map((c) => ({ value: c.name, label: c.name }));

  const sections: SectionDef[] = [
    {
      title: "নোটিশ",
      fields: [
        { name: "title", label: "শিরোনাম", required: "শিরোনাম লিখুন", placeholder: "যেমন: ডিসেম্বর মাসের সাধারণ সভা", wide: true },
        { name: "category", label: "ক্যাটাগরি", type: "select", options: cats, required: "ক্যাটাগরি বাছুন" },
        { name: "visibility", label: "কারা দেখবে", type: "select", options: [{ value: "public", label: "পাবলিক — সবাই" }, { value: "members", label: "সদস্য-কেবল — লগইন লাগবে" }] },
        { name: "body", label: "লেখা", type: "textarea", rows: 8, required: "নোটিশের লেখা দিন", hint: "অনুচ্ছেদ আলাদা করতে ফাঁকা লাইন দিন" },
        { name: "highlight", label: "হাইলাইট", hint: "জরুরি ব্যানারে মোটা অক্ষরে দেখাবে", placeholder: "যেমন: আগামীকাল সকাল ১০টায়" },
        { name: "summary", label: "সারাংশ", hint: "তালিকায় ও শেয়ারে ছোট করে দেখাবে" },
      ],
    },
    {
      title: "ছবি ও সংযুক্তি",
      fields: [
        { name: "image", label: "ছবি", type: "image", current: "image_src", hint: "WebP-তে ছোট হয়ে যাবে" },
        { name: "attachment", label: "PDF / ফাইল সংযুক্তি", type: "file", current: "attachment_url", accept: "application/pdf,image/*" },
      ],
    },
    {
      title: "প্রকাশ",
      description: volunteer ? "আপনার নোটিশ অ্যাডমিন অনুমোদন দিলে প্রকাশ হবে।" : undefined,
      fields: [
        ...(volunteer ? [] : [{ name: "status", label: "অবস্থা", type: "select" as const, options: [{ value: "published", label: "প্রকাশিত" }, { value: "draft", label: "খসড়া (লুকানো)" }, { value: "pending", label: "অনুমোদনের অপেক্ষায়" }] }]),
        { name: "is_urgent", label: "জরুরি — হোম পেজের উপরে পিন করুন", type: "checkbox", wide: true },
      ],
    },
  ];

  return (
    <RecordEditor<AdminNotice>
      slug="notices"
      base="/admin/notices/"
      backHref="/admin/notices"
      noun="নোটিশ"
      createLabel={volunteer ? "নতুন নোটিশের খসড়া" : "নতুন নোটিশ"}
      sections={sections}
      titleOf={(n) => n.title}
      defaults={{ visibility: "public", status: "published", is_urgent: false, category: cats[0]?.value ?? "" }}
      toBody={(v) => ({ ...v, category: v.category || cats[0]?.value, is_pinned: !!v.is_urgent, ...(volunteer ? { status: "pending" } : {}) })}
      afterSave={() => refreshBadges()}
    />
  );
}
