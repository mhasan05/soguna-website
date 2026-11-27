"use client";

import { RecordEditor } from "@/components/admin/crud";

export default function EditEmergency() {
  return (
    <RecordEditor<{ id: number; title: string }>
      slug="emergency"
      base="/admin/emergency/"
      backHref="/admin/emergency"
      noun="জরুরি নম্বর"
      titleOf={(c) => c.title}
      defaults={{ order: 999 }}
      sections={[
        {
          title: "জরুরি নম্বর",
          fields: [
            { name: "title", label: "নাম", required: "নাম লিখুন", placeholder: "যেমন: অ্যাম্বুলেন্স" },
            { name: "phone", label: "নম্বর", type: "tel", required: "নম্বর দিন", placeholder: "৯৯৯ বা ০১৭XXXXXXXX" },
          ],
        },
      ]}
    />
  );
}
