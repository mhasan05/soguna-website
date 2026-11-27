"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Cell, DataTable, FilterSelect, IconAction, LongText, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage } from "@/components/admin/widgets";
import { useAdmin, useResource } from "@/components/admin/store";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/primitives";
import { formatDate, formatPhone } from "@/lib/bn";

interface Message {
  id: number;
  name: string;
  phone: string;
  subject: string;
  message: string;
  handled: boolean;
  created_at: string;
}

export default function AdminMessages() {
  const { flash, fail, refreshBadges } = useAdmin();
  const msgs = useResource<Message>("/admin/messages/");
  const preview = usePreview<Message>();
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");
  const rows = (msgs.items ?? []).filter((m) => (filter === "" || (filter === "open" ? !m.handled : m.handled)) && (!q || m.name.includes(q) || m.subject.includes(q) || m.phone.includes(q)));
  const p = preview.item;

  const toggle = async (m: Message) => {
    try {
      await msgs.update(m.id, { handled: !m.handled });
      preview.close();
      flash(m.handled ? "আবার 'উত্তর বাকি' করা হলো" : "উত্তর দেওয়া হয়েছে হিসেবে চিহ্নিত");
      refreshBadges();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <AdminPage slug="messages">
      <Toolbar
        search={q}
        onSearch={setQ}
        placeholder="নাম, ফোন বা বিষয় দিয়ে খুঁজুন"
        filters={
          <FilterSelect label="অবস্থা" value={filter} onChange={setFilter}>
            <option value="open">উত্তর বাকি</option>
            <option value="done">উত্তর দেওয়া হয়েছে</option>
            <option value="">সব বার্তা</option>
          </FilterSelect>
        }
      />
      <DataTable
        title="যোগাযোগ পাতা থেকে আসা বার্তা"
        count={rows.length}
        rows={msgs.items ? rows : null}
        loading={msgs.loading}
        error={msgs.error}
        empty="কোনো বার্তা নেই।"
        onPreview={preview.open}
        rowClassName={(m) => (!m.handled ? "bg-gold-25" : undefined)}
        columns={[
          { label: "প্রেরক", render: (m) => <Cell main={m.name} sub={formatPhone(m.phone)} /> },
          { label: "বিষয়", render: (m) => <span className="line-clamp-1">{m.subject || m.message.slice(0, 60)}</span> },
          { label: "তারিখ", render: (m) => formatDate(m.created_at, { year: false }), hideOnMobile: true },
          { label: "অবস্থা", render: (m) => <Pill tone={m.handled ? "success" : "gold"} className="px-2.5 text-[14px]">{m.handled ? "উত্তর দেওয়া হয়েছে" : "উত্তর বাকি"}</Pill> },
        ]}
        actions={(m) => <IconAction label={m.handled ? "আবার উত্তর বাকি করুন" : "উত্তর দেওয়া হয়েছে"} tone={m.handled ? "neutral" : "brand"} icon={m.handled ? <RotateCcw className="size-[18px]" aria-hidden /> : <Check className="size-5" aria-hidden />} onClick={() => toggle(m)} />}
      />
      <PreviewDrawer
        data={
          p
            ? {
                title: p.subject || "বার্তা",
                subtitle: `${p.name} · ${formatDate(p.created_at)}`,
                badges: <Pill tone={p.handled ? "success" : "gold"} className="px-2.5 text-[14px]">{p.handled ? "উত্তর দেওয়া হয়েছে" : "উত্তর বাকি"}</Pill>,
                sections: [
                  { title: "প্রেরক", rows: [["নাম", p.name], ["ফোন", <a key="t" href={`tel:${p.phone}`}>{formatPhone(p.phone)}</a>], ["তারিখ", formatDate(p.created_at)]] },
                  { title: "বার্তা", content: <LongText text={p.message} /> },
                ],
              }
            : null
        }
        onClose={preview.close}
        actions={
          p ? (
            <>
              <a href={`tel:${p.phone}`} className="inline-flex h-12 flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-brand px-4 text-[16px] font-semibold text-brand hover:no-underline">
                ফোন করুন
              </a>
              <Button className="flex-1 text-[16px]" variant={p.handled ? "neutral" : "primary"} onClick={() => toggle(p)}>
                {p.handled ? "আবার উত্তর বাকি" : "উত্তর দেওয়া হয়েছে"}
              </Button>
            </>
          ) : undefined
        }
      />
    </AdminPage>
  );
}
