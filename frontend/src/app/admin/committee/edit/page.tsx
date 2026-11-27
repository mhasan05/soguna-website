"use client";

import { useSearchParams } from "next/navigation";
import { RecordEditor, type SectionDef } from "@/components/admin/crud";
import type { Position, Term } from "@/components/admin/res/committee";
import { api, get } from "@/lib/api";
import type { Site } from "@/lib/api-types";
import { useQuery } from "@/lib/use-query";

export default function EditPosition() {
  const termParam = useSearchParams().get("term");
  const site = useQuery<Site>("site", () => api.site());
  const terms = useQuery("admin:terms", () => get<Term[]>("/admin/committee/terms/"));
  const people = useQuery("admin:members:active", () => get<{ id: number; name: string; member_no: string | null }[]>("/admin/members/?status=active"));
  const titles = (site.data?.lists.position ?? []).map((p) => ({ value: p.name, label: p.name }));

  const sections: SectionDef[] = [
    {
      title: "পদ",
      fields: [
        { name: "term", label: "সেশন", type: "select", required: "সেশন বাছুন", options: (terms.data ?? []).map((t) => ({ value: String(t.id), label: `${t.name}${t.is_current ? " (বর্তমান)" : ""}` })) },
        { name: "title", label: "পদবি", type: "select", required: "পদবি বাছুন", options: [{ value: "", label: "— বাছাই করুন —" }, ...titles] },
        { name: "is_advisor", label: "উপদেষ্টা পরিষদের সদস্য", type: "checkbox", wide: true },
      ],
    },
    {
      title: "কে এই পদে আছেন",
      description: "সদস্য তালিকা থেকে বাছুন। সদস্য না হলে নিচে নাম লিখুন।",
      fields: [
        { name: "member", label: "সদস্য", type: "select", wide: true, options: [{ value: "", label: "— সদস্য নন / খালি পদ —" }, ...(people.data ?? []).map((m) => ({ value: String(m.id), label: `${m.name}${m.member_no ? ` (${m.member_no})` : ""}` }))] },
        { name: "person_name", label: "বাইরের ব্যক্তির নাম", show: (v) => !v.member },
        { name: "para_name", label: "পাড়া", show: (v) => !v.member },
        { name: "show_phone", label: "সাইটে ফোন নম্বর দেখাবে", type: "checkbox", wide: true },
      ],
    },
  ];

  return (
    <RecordEditor<Position>
      slug="committee"
      base="/admin/committee/positions/"
      backHref="/admin/committee"
      noun="পদ"
      sections={sections}
      titleOf={(p) => p.title}
      defaults={{ term: termParam ?? "", title: "", member: "", show_phone: false, is_advisor: false, order: 999 }}
      fromRecord={(p) => ({ term: String(p.term), member: p.member ? String(p.member) : "" })}
      toBody={(v) => ({ ...v, term: Number(v.term), member: v.member ? Number(v.member) : null })}
    />
  );
}
