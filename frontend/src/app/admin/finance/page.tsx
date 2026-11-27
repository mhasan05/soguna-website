"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { Cell, DataTable, FilterSelect, IconAction, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage, Panel } from "@/components/admin/widgets";
import { useAdmin, useResource } from "@/components/admin/store";
import type { Entry } from "@/components/admin/res/finance";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Img, Pill } from "@/components/ui/primitives";
import { post } from "@/lib/api";
import { formatDate, money } from "@/lib/bn";
import { cn } from "@/lib/cn";

const editHref = (e: Entry) => (e.is_void ? null : `/admin/finance/edit?id=${e.id}`);

export default function AdminFinance() {
  const { flash, fail } = useAdmin();
  const entries = useResource<Entry>("/admin/finance/entries/", { idPath: (id) => `/admin/finance/entries/${id}/` });
  const preview = usePreview<Entry>();
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [voiding, setVoiding] = useState<Entry | null>(null);
  const [reason, setReason] = useState("");
  const rows = (entries.items ?? []).filter((e) => (!kind || e.kind === kind) && (!q || e.description.includes(q) || e.category.includes(q)));
  const p = preview.item;

  const startVoid = (e: Entry) => {
    preview.close();
    setReason("");
    setVoiding(e);
  };
  const confirmVoid = async () => {
    if (!voiding || !reason.trim()) return;
    try {
      entries.replace(await post<Entry>(`/admin/finance/entries/${voiding.id}/void/`, { reason: reason.trim() }));
      flash("এন্ট্রি বাতিল হয়েছে · কারণসহ অডিট লগে রাখা হলো");
      setVoiding(null);
    } catch (err) {
      fail(err);
    }
  };

  const income = rows.filter((e) => e.kind === "income" && !e.is_void).reduce((s, e) => s + e.amount, 0);
  const expense = rows.filter((e) => e.kind === "expense" && !e.is_void).reduce((s, e) => s + e.amount, 0);

  return (
    <AdminPage slug="finance">
      <Toolbar
        search={q}
        onSearch={setQ}
        placeholder="বিবরণ বা খাত দিয়ে খুঁজুন"
        addHref="/admin/finance/edit"
        addLabel="নতুন আয়/ব্যয় এন্ট্রি"
        filters={
          <FilterSelect label="ধরন" value={kind} onChange={setKind}>
            <option value="">আয় ও ব্যয়</option>
            <option value="income">শুধু আয়</option>
            <option value="expense">শুধু ব্যয়</option>
          </FilterSelect>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel className="p-4"><div className="text-[14px] text-muted">আয় (তালিকায়)</div><div className="text-[24px] font-bold text-brand">{money(income)}</div></Panel>
        <Panel className="p-4"><div className="text-[14px] text-muted">ব্যয় (তালিকায়)</div><div className="text-[24px] font-bold text-gold-700">{money(expense)}</div></Panel>
        <Panel className="p-4"><div className="text-[14px] text-muted">পার্থক্য</div><div className="text-[24px] font-bold">{money(income - expense)}</div></Panel>
      </div>

      {voiding && (
        <Panel accent className="flex flex-wrap items-end gap-2.5 border-blood! bg-blood-50 p-4" role="alertdialog" aria-label="এন্ট্রি বাতিল">
          <div className="w-full text-[17px] font-bold">
            &quot;{voiding.description || voiding.category}&quot; ({money(voiding.amount)}) বাতিল করবেন?
          </div>
          <Field label="বাতিলের কারণ (বাধ্যতামূলক)" htmlFor="void-reason" className="min-w-0 flex-[1_1_280px]">
            <Input id="void-reason" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="যেমন: ভুল টাকার পরিমাণ লেখা হয়েছিল" />
          </Field>
          <Button variant="danger" disabled={!reason.trim()} onClick={confirmVoid}>
            বাতিল নিশ্চিত
          </Button>
          <Button variant="neutral" onClick={() => setVoiding(null)}>
            থাক
          </Button>
        </Panel>
      )}

      <DataTable
        title="আয়-ব্যয়ের এন্ট্রি"
        count={rows.length}
        rows={entries.items ? rows : null}
        loading={entries.loading}
        error={entries.error}
        empty="এখনো কোনো এন্ট্রি নেই।"
        onPreview={preview.open}
        editHref={editHref}
        rowClassName={(e) => (e.is_void ? "opacity-55" : undefined)}
        columns={[
          { label: "তারিখ", render: (e) => formatDate(e.date, { year: false }) },
          { label: "ধরন", render: (e) => <Pill tone={e.kind === "income" ? "green" : "gold"} className="px-2.5 text-[14px]">{e.kind === "income" ? "আয়" : "ব্যয়"}</Pill> },
          { label: "বিবরণ", render: (e) => <Cell main={<span className={cn(e.is_void && "line-through")}>{e.description || e.category}</span>} sub={[e.category, e.event].filter(Boolean).join(" · ")} /> },
          { label: "টাকা", className: "text-right", render: (e) => <span className={cn("font-bold", e.is_void ? "text-muted line-through" : e.kind === "income" ? "text-brand" : "text-gold-700")}>{e.kind === "income" ? "+" : "−"}{money(e.amount)}</span> },
          { label: "অবস্থা", hideOnMobile: true, render: (e) => (e.is_void ? <span className="text-blood-700">বাতিল</span> : e.voucher ? "ভাউচার ✓" : e.kind === "income" ? "যাচাইকৃত" : "—") },
        ]}
        actions={(e) => (!e.is_void ? <IconAction label="বাতিল করুন (কারণসহ)" tone="danger" icon={<Ban className="size-[18px]" aria-hidden />} onClick={() => startVoid(e)} /> : null)}
      />
      <p className="m-0 text-[14px] text-muted">আর্থিক এন্ট্রি মুছে ফেলা যায় না — শুধু কারণসহ বাতিল করা যায়, যাতে হিসাব স্বচ্ছ থাকে। চাঁদা ও অনলাইন দান &quot;চাঁদা&quot; পাতায় যাচাই হয়।</p>

      <PreviewDrawer
        data={
          p
            ? {
                title: `${p.kind === "income" ? "আয়" : "ব্যয়"} · ${money(p.amount)}`,
                subtitle: p.description || p.category,
                badges: p.is_void ? <Pill tone="red" className="px-2.5 text-[14px]">বাতিল</Pill> : <Pill tone="success" className="px-2.5 text-[14px]">বৈধ</Pill>,
                sections: [
                  { title: "এন্ট্রি", rows: [["ধরন", p.kind === "income" ? "আয়" : "ব্যয়"], ["খাত", p.category], ["টাকা", money(p.amount)], ["তারিখ", formatDate(p.date)], ["বিবরণ", p.description], ["লিংক করা ইভেন্ট", p.event], ["লিখেছেন", p.created_by]] },
                  ...(p.is_void ? [{ title: "বাতিল", rows: [["কারণ", p.void_reason]] as [string, string][] }] : []),
                  ...(p.voucher ? [{ title: "ভাউচার", content: <a href={p.voucher} target="_blank" rel="noreferrer"><Img src={p.voucher} alt="ভাউচারের ছবি" className="w-full rounded-lg" /></a> }] : []),
                ],
              }
            : null
        }
        onClose={preview.close}
        editHref={p ? editHref(p) : null}
        actions={
          p && !p.is_void ? (
            <Button variant="dangerOutline" className="text-[16px]" onClick={() => startVoid(p)} icon={<Ban className="size-[18px]" aria-hidden />}>
              বাতিল করুন
            </Button>
          ) : undefined
        }
      />
    </AdminPage>
  );
}
