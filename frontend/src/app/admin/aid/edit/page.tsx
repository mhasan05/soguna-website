"use client";

import { useRef } from "react";
import { RecordEditor } from "@/components/admin/crud";
import { useAdmin } from "@/components/admin/store";
import type { Aid } from "@/components/admin/res/aid";
import { post } from "@/lib/api";

export default function EditAid() {
  const { refreshBadges } = useAdmin();
  const approve = useRef(false);
  return (
    <RecordEditor<Aid>
      slug="aid"
      base="/admin/aid/"
      backHref="/admin/aid"
      noun="আবেদন"
      titleOf={(a) => a.public_title || a.beneficiary}
      canDelete={false}
      fromRecord={(a) => ({ target_amount: String(a.target_amount ?? a.amount_needed), public_title: a.public_title || `${a.type_label} সহায়তা`, pending: a.status === "pending" })}
      sections={[
        {
          title: "পাবলিক তহবিল",
          description: "এই তথ্য সাইটের সাহায্য তহবিল কার্ডে দেখাবে। ব্যক্তিগত বা সংবেদনশীল তথ্য লিখবেন না।",
          fields: [
            { name: "public_title", label: "পাবলিক শিরোনাম", required: "শিরোনাম লিখুন", wide: true },
            { name: "public_description", label: "পাবলিক বিবরণ", type: "textarea", rows: 3 },
            { name: "target_amount", label: "লক্ষ্য টাকা (৳)", type: "number", required: "লক্ষ্য টাকা লিখুন" },
            { name: "target_date", label: "শেষ তারিখ", type: "date" },
            { name: "show_name_public", label: "পাবলিকে আবেদনকারীর নাম দেখাবে", type: "checkbox", wide: true },
          ],
        },
        {
          title: "অভ্যন্তরীণ",
          fields: [
            { name: "note", label: "নোট (শুধু অ্যাডমিন)", type: "textarea", rows: 2 },
            { name: "approve_now", label: "সংরক্ষণের সাথে অনুমোদন করুন — পাবলিক তহবিল চালু হবে, আবেদনকারী SMS পাবেন", type: "checkbox", wide: true, show: (v) => !!v.pending },
          ],
        },
      ]}
      toBody={(v) => {
        const { approve_now, pending, ...rest } = v;
        approve.current = !!approve_now && !!pending;
        return { ...rest, target_date: rest.target_date || null };
      }}
      afterSave={async (a) => {
        if (approve.current) {
          await post(`/admin/aid/${a.id}/approve/`, { target_amount: a.target_amount, target_date: a.target_date, show_name_public: a.show_name_public, public_title: a.public_title, public_description: a.public_description });
          refreshBadges();
        }
      }}
    />
  );
}
