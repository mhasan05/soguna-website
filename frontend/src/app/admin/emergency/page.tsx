"use client";

import { DataTable, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage, Reorder } from "@/components/admin/widgets";
import { useResource } from "@/components/admin/store";
import { formatPhone } from "@/lib/bn";

interface Contact {
  id: number;
  title: string;
  phone: string;
  order: number;
}

const editHref = (c: Contact) => `/admin/emergency/edit?id=${c.id}`;

export default function AdminEmergency() {
  const list = useResource<Contact>("/admin/emergency/");
  const preview = usePreview<Contact>();
  const items = list.items ?? [];
  const p = preview.item;
  const remove = (c: Contact) => {
    preview.close();
    list.remove(c, c.title || "এই নম্বর");
  };

  return (
    <AdminPage slug="emergency">
      <Toolbar addHref="/admin/emergency/edit" addLabel="নম্বর যোগ করুন">
        <span className="self-center text-[15px] text-muted">▲▼ দিয়ে সাজালে সাইটে একই ক্রমে দেখাবে</span>
      </Toolbar>
      <DataTable
        title="জরুরি নম্বর"
        count={items.length}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        onPreview={preview.open}
        editHref={editHref}
        onDelete={remove}
        columns={[
          { label: "ক্রম", className: "w-14", render: (c) => <span onClick={(e) => e.stopPropagation()}><Reorder label={c.title} onUp={() => list.move(items.indexOf(c), -1)} onDown={() => list.move(items.indexOf(c), 1)} /></span> },
          { label: "নাম", render: (c) => <span className="font-semibold">{c.title}</span> },
          { label: "নম্বর", render: (c) => <span className="font-mono text-[15px]">{c.phone || "—"}</span> },
        ]}
      />
      <PreviewDrawer
        data={p ? { title: p.title, sections: [{ title: "তথ্য", rows: [["নাম", p.title], ["নম্বর", <a key="t" href={`tel:${p.phone}`}>{formatPhone(p.phone)}</a>], ["ক্রম", String(items.indexOf(p) + 1)]] }] } : null}
        onClose={preview.close}
        editHref={p ? editHref(p) : null}
        onDelete={p ? () => remove(p) : undefined}
      />
    </AdminPage>
  );
}
