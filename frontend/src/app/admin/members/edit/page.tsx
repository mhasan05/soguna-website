"use client";

import { RecordEditor, type SectionDef } from "@/components/admin/crud";
import { useAdmin } from "@/components/admin/store";
import { BLOOD_OPTIONS, RESIDENCE_OPTIONS, ROLE_OPTIONS, STATUS_OPTIONS, type AdminMember } from "@/components/admin/res/members";
import { api } from "@/lib/api";
import type { Site } from "@/lib/api-types";
import { normalisePhone } from "@/lib/bn";
import { useQuery } from "@/lib/use-query";

export default function EditMember() {
  const { role } = useAdmin();
  const site = useQuery<Site>("site", () => api.site());
  const lists = site.data?.lists;
  const paras = [{ value: "", label: "— বাছাই করুন —" }, ...(lists?.para ?? []).map((p) => ({ value: String(p.id), label: p.name }))];

  const sections: SectionDef[] = [
    {
      title: "ব্যক্তিগত তথ্য",
      fields: [
        { name: "name", label: "নাম", required: "নাম লিখুন", placeholder: "যেমন: মোঃ রাকিব হাসান" },
        { name: "father_name", label: "পিতার নাম" },
        { name: "phone", label: "মোবাইল নম্বর", type: "tel", required: "১১ সংখ্যার মোবাইল নম্বর দিন", placeholder: "০১৭XXXXXXXX", hint: "এই নম্বর দিয়েই লগইন করবেন" },
        { name: "blood_group", label: "রক্তের গ্রুপ", type: "select", options: BLOOD_OPTIONS },
        { name: "profession", label: "পেশা", placeholder: (lists?.profession ?? []).slice(0, 3).map((p) => p.name).join(", ") },
      ],
    },
    {
      title: "ঠিকানা",
      fields: [
        { name: "para_id", label: "পাড়া", type: "select", options: paras },
        { name: "residence", label: "বর্তমানে থাকেন", type: "select", options: RESIDENCE_OPTIONS },
        { name: "country", label: "দেশ", placeholder: "যেমন: মালয়েশিয়া", show: (v) => v.residence === "abroad" },
      ],
    },
    {
      title: "সদস্যপদ",
      description: "নম্বর (SAJS-…) সক্রিয় করলে নিজে থেকেই দেওয়া হয়।",
      fields: [
        { name: "status", label: "অবস্থা", type: "select", options: STATUS_OPTIONS },
        { name: "role", label: "রোল", type: "select", options: ROLE_OPTIONS, disabled: role !== "admin", hint: role !== "admin" ? "রোল বদলাতে পারেন শুধু অ্যাডমিন" : undefined },
        { name: "joined_at", label: "যোগদানের তারিখ", type: "date" },
      ],
    },
  ];

  return (
    <RecordEditor<AdminMember>
      slug="members"
      base="/admin/members/"
      backHref="/admin/members"
      noun="সদস্য"
      sections={sections}
      titleOf={(m) => m.name}
      canDelete={role === "admin"}
      deleteWarn='সাধারণত মুছে না ফেলে "নিষ্ক্রিয়" করাই ভালো — চাঁদার ইতিহাস থেকে যায়।'
      defaults={{ status: "active", role: "member", residence: "village", blood_group: "", para_id: "", joined_at: new Date().toISOString().slice(0, 10) }}
      toBody={(v) => ({
        ...v,
        phone: normalisePhone(String(v.phone ?? "")) || v.phone,
        para_id: v.para_id ? Number(v.para_id) : null,
        ...(role !== "admin" ? { role: undefined } : {}),
      })}
    />
  );
}
