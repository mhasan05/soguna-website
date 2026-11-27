"use client";

import { RecordEditor, type SectionDef } from "@/components/admin/crud";
import type { Service } from "@/components/admin/res/services";
import { api } from "@/lib/api";
import type { Site } from "@/lib/api-types";
import { normalisePhone } from "@/lib/bn";
import { useQuery } from "@/lib/use-query";

export default function EditService() {
  const site = useQuery<Site>("site", () => api.site());
  const cats = (site.data?.lists.serviceCat ?? []).map((c) => ({ value: c.name, label: c.name }));
  const paras = [{ value: "", label: "—" }, ...(site.data?.lists.para ?? []).map((p) => ({ value: p.name, label: p.name }))];
  const sections: SectionDef[] = [
    {
      title: "সেবাদাতার তথ্য",
      fields: [
        { name: "name", label: "নাম", required: "নাম লিখুন", placeholder: "যেমন: মোঃ কামাল (ইলেকট্রিশিয়ান)" },
        { name: "category", label: "ক্যাটাগরি", type: "select", options: cats, required: "ক্যাটাগরি বাছুন" },
        { name: "phone", label: "ফোন", type: "tel", required: "ফোন নম্বর দিন", placeholder: "০১৭XXXXXXXX" },
        { name: "para", label: "পাড়া", type: "select", options: paras },
        { name: "approved", label: "সেবা ডিরেক্টরিতে প্রকাশ করুন", type: "checkbox", wide: true },
      ],
    },
  ];
  return (
    <RecordEditor<Service>
      slug="services"
      base="/admin/services/"
      backHref="/admin/services"
      noun="সেবাদাতা"
      sections={sections}
      titleOf={(s) => s.name}
      defaults={{ approved: true, category: "", para: "" }}
      fromRecord={(s) => ({ category: s.category ?? "" })}
      toBody={(v) => ({ ...v, category: v.category || cats[0]?.value || null, phone: normalisePhone(String(v.phone)) || v.phone })}
    />
  );
}
