"use client";

import { useState } from "react";
import { Cell, DataTable, FilterSelect, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage } from "@/components/admin/widgets";
import { useAdmin, useResource } from "@/components/admin/store";
import { EventStatus, eventPreview, eventWhenLabel, type AdminEvent } from "@/components/admin/res/events";
import { bn } from "@/lib/bn";

const editHref = (e: AdminEvent) => `/admin/events/edit?id=${e.id}`;

export default function AdminEvents() {
  const { role } = useAdmin();
  const events = useResource<AdminEvent>("/admin/events/");
  const preview = usePreview<AdminEvent>();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const rows = (events.items ?? []).filter((e) => (!status || e.status === status) && (!q || e.title.includes(q) || e.venue.includes(q)));
  const p = preview.item;

  const remove = (e: AdminEvent) => {
    preview.close();
    events.remove(e, e.title, e.status === "upcoming" ? 'যারা "আমি আসছি" দিয়েছেন তাদের তালিকাও মুছে যাবে।' : "রিপোর্ট মুছে যাবে। খরচের এন্ট্রি থেকে যাবে।");
  };

  return (
    <AdminPage slug="events">
      <Toolbar
        search={q}
        onSearch={setQ}
        placeholder="শিরোনাম বা স্থান দিয়ে খুঁজুন"
        addHref="/admin/events/edit"
        addLabel="নতুন ইভেন্ট"
        filters={
          <FilterSelect label="অবস্থা" value={status} onChange={setStatus}>
            <option value="">সব ইভেন্ট</option>
            <option value="upcoming">আসন্ন</option>
            <option value="completed">সম্পন্ন</option>
          </FilterSelect>
        }
      />
      <DataTable
        title="ইভেন্ট"
        count={rows.length}
        rows={events.items ? rows : null}
        loading={events.loading}
        error={events.error}
        empty="কোনো ইভেন্ট নেই।"
        onPreview={preview.open}
        editHref={editHref}
        onDelete={role === "admin" ? remove : undefined}
        columns={[
          { label: "ইভেন্ট", render: (e) => <Cell image={e.cover_src || null} main={e.title} sub={e.category ?? ""} /> },
          { label: "তারিখ ও সময়", render: (e) => eventWhenLabel(e), hideOnMobile: true },
          { label: "স্থান", render: (e) => e.venue, hideOnMobile: true },
          { label: "অবস্থা", render: (e) => <EventStatus e={e} /> },
          { label: "সাড়া / রিপোর্ট", render: (e) => (e.status === "upcoming" ? `${bn(e.going_count)} জন আসছেন` : e.beneficiaries_count ? "রিপোর্ট ✓" : <span className="text-gold-800">রিপোর্ট বাকি</span>), hideOnMobile: true },
        ]}
      />
      <PreviewDrawer data={p ? eventPreview(p) : null} onClose={preview.close} editHref={p ? editHref(p) : null} onDelete={p && role === "admin" ? () => remove(p) : undefined} />
    </AdminPage>
  );
}
