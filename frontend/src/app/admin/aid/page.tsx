"use client";

import { useState } from "react";
import { Check, CheckCheck, X } from "lucide-react";
import { Cell, DataTable, FilterSelect, IconAction, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage } from "@/components/admin/widgets";
import { useAdmin, useResource } from "@/components/admin/store";
import { AidStatusPill, aidPreview, type Aid } from "@/components/admin/res/aid";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/api";
import { formatDate, money } from "@/lib/bn";

const editHref = (a: Aid) => `/admin/aid/edit?id=${a.id}`;
const MSG = { approve: "আবেদন অনুমোদিত — পাবলিক তহবিল চালু হলো, আবেদনকারীকে SMS গেছে", reject: "আবেদন বাতিল — আবেদনকারীকে জানানো হয়েছে", complete: "সহায়তা সম্পন্ন হিসেবে চিহ্নিত" };

export default function AdminAid() {
  const { flash, fail, refreshBadges } = useAdmin();
  const reqs = useResource<Aid>("/admin/aid/");
  const preview = usePreview<Aid>();
  const [status, setStatus] = useState("");
  const rows = (reqs.items ?? []).filter((a) => !status || a.status === status);
  const p = preview.item;

  const act = async (a: Aid, action: keyof typeof MSG) => {
    try {
      reqs.replace(await post<Aid>(`/admin/aid/${a.id}/${action}/`, {}));
      preview.close();
      flash(MSG[action]);
      refreshBadges();
    } catch (err) {
      fail(err);
    }
  };

  const actionsFor = (a: Aid) => (
    <>
      {a.status === "pending" && (
        <>
          <IconAction label="অনুমোদন (পাবলিক তহবিল চালু)" tone="brand" icon={<Check className="size-5" aria-hidden />} onClick={() => act(a, "approve")} />
          <IconAction label="বাতিল" tone="danger" icon={<X className="size-5" aria-hidden />} onClick={() => act(a, "reject")} />
        </>
      )}
      {a.status === "approved" && <IconAction label="সহায়তা হস্তান্তর — সম্পন্ন" tone="gold" icon={<CheckCheck className="size-5" aria-hidden />} onClick={() => act(a, "complete")} />}
    </>
  );

  return (
    <AdminPage slug="aid">
      <Toolbar
        filters={
          <FilterSelect label="অবস্থা" value={status} onChange={setStatus}>
            <option value="">সব আবেদন</option>
            <option value="pending">অপেক্ষমাণ</option>
            <option value="approved">অনুমোদিত</option>
            <option value="done">সম্পন্ন</option>
            <option value="rejected">বাতিল</option>
          </FilterSelect>
        }
      >
        <span className="self-center text-[15px] text-muted">অনুমোদনের আগে ✎ চেপে লক্ষ্য টাকা ও পাবলিক শিরোনাম ঠিক করুন</span>
      </Toolbar>
      <DataTable
        title="সাহায্যের আবেদন"
        count={rows.length}
        rows={reqs.items ? rows : null}
        loading={reqs.loading}
        error={reqs.error}
        empty="কোনো আবেদন নেই।"
        onPreview={preview.open}
        editHref={(a) => (a.status === "rejected" ? null : editHref(a))}
        rowClassName={(a) => (a.status === "pending" ? "bg-gold-25" : undefined)}
        columns={[
          { label: "আবেদন", render: (a) => <Cell main={a.public_title || a.beneficiary} sub={`${a.type_label} · ${a.applicant_name}`} /> },
          { label: "চাওয়া", render: (a) => money(a.amount_needed), hideOnMobile: true },
          { label: "উঠেছে", render: (a) => (a.status === "pending" ? "—" : `${money(a.raised)} / ${money(a.target_amount ?? a.amount_needed)}`), hideOnMobile: true },
          { label: "তারিখ", render: (a) => formatDate(a.created_at, { year: false }), hideOnMobile: true },
          { label: "অবস্থা", render: (a) => <AidStatusPill a={a} /> },
        ]}
        actions={actionsFor}
      />
      <PreviewDrawer
        data={p ? aidPreview(p) : null}
        onClose={preview.close}
        editHref={p && p.status !== "rejected" ? editHref(p) : null}
        actions={
          p?.status === "pending" ? (
            <>
              <Button className="flex-1 text-[16px]" onClick={() => act(p, "approve")}>অনুমোদন</Button>
              <Button variant="neutral" className="text-[16px]" onClick={() => act(p, "reject")}>বাতিল</Button>
            </>
          ) : p?.status === "approved" ? (
            <Button variant="outline" className="text-[16px]" onClick={() => act(p, "complete")}>সম্পন্ন করুন</Button>
          ) : undefined
        }
      />
    </AdminPage>
  );
}
