"use client";

import Link from "next/link";
import { useState } from "react";
import { Cell, DataTable, FilterSelect, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage, StatusPill } from "@/components/admin/widgets";
import { useAdmin, useResource } from "@/components/admin/store";
import { Pill } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Site } from "@/lib/api-types";
import { formatPhone } from "@/lib/bn";
import { useQuery } from "@/lib/use-query";
import type { Service } from "@/components/admin/res/services";

const editHref = (s: Service) => `/admin/services/edit?id=${s.id}`;

export default function AdminServices() {
  const { flash, fail } = useAdmin();
  const services = useResource<Service>("/admin/services/");
  const site = useQuery<Site>("site", () => api.site());
  const cats = site.data?.lists.serviceCat ?? [];
  const preview = usePreview<Service>();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const rows = (services.items ?? []).filter((s) => (!cat || s.category === cat) && (!q || s.name.includes(q) || s.phone.includes(q)));
  const p = preview.item;

  const toggle = (s: Service) =>
    services
      .update(s.id, { approved: !s.approved })
      .then(() => flash(s.approved ? "লুকানো হয়েছে" : "সেবা ডিরেক্টরিতে প্রকাশিত"))
      .catch(fail);

  const remove = (s: Service) => {
    preview.close();
    services.remove(s, s.name);
  };

  return (
    <AdminPage slug="services">
      <Toolbar
        search={q}
        onSearch={setQ}
        placeholder="নাম বা ফোন দিয়ে খুঁজুন"
        addHref="/admin/services/edit"
        addLabel="সেবাদাতা যোগ"
        filters={
          <FilterSelect label="ক্যাটাগরি" value={cat} onChange={setCat}>
            <option value="">সব ক্যাটাগরি</option>
            {cats.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </FilterSelect>
        }
      >
        <Link href="/admin/lists?tab=serviceCat" className="inline-flex h-12 items-center rounded-[10px] border-[1.5px] border-brand bg-white px-4 text-[16px] font-semibold text-brand hover:no-underline">
          ক্যাটাগরি ব্যবস্থাপনা →
        </Link>
      </Toolbar>
      <DataTable
        title="সেবাদাতা"
        count={rows.length}
        rows={services.items ? rows : null}
        loading={services.loading}
        error={services.error}
        onPreview={preview.open}
        editHref={editHref}
        onDelete={remove}
        columns={[
          { label: "নাম", render: (s) => <Cell main={s.name} sub={s.category ?? ""} /> },
          { label: "ফোন", render: (s) => <span className="font-mono text-[15px]">{s.phone}</span> },
          { label: "পাড়া", render: (s) => s.para || "—", hideOnMobile: true },
          { label: "অবস্থা", render: (s) => <span onClick={(e) => e.stopPropagation()}><StatusPill on={s.approved} onLabel="প্রকাশিত" offLabel="অনুমোদনের অপেক্ষায়" offTone="gold" onClick={() => toggle(s)} /></span> },
        ]}
      />
      <PreviewDrawer
        data={
          p
            ? {
                title: p.name,
                subtitle: p.category ?? "",
                badges: <Pill tone={p.approved ? "success" : "gold"} className="px-2.5 text-[14px]">{p.approved ? "প্রকাশিত" : "অনুমোদনের অপেক্ষায়"}</Pill>,
                sections: [{ title: "তথ্য", rows: [["নাম", p.name], ["ক্যাটাগরি", p.category], ["ফোন", <a key="t" href={`tel:${p.phone}`}>{formatPhone(p.phone)}</a>], ["পাড়া", p.para]] }],
              }
            : null
        }
        onClose={preview.close}
        editHref={p ? editHref(p) : null}
        onDelete={p ? () => remove(p) : undefined}
      />
    </AdminPage>
  );
}
