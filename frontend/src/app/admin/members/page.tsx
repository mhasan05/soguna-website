"use client";

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Cell, DataTable, FilterSelect, IconAction, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage } from "@/components/admin/widgets";
import { useAdmin, useResource } from "@/components/admin/store";
import { MemberStatus, memberPreview, roleLabel, type AdminMember } from "@/components/admin/res/members";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/primitives";
import { api, download, form, post } from "@/lib/api";
import type { Site } from "@/lib/api-types";
import { bn, formatDate, formatPhone, initialOf } from "@/lib/bn";
import { useQuery } from "@/lib/use-query";

const memberPath = (id: number | string) => `/admin/members/${id}/`;
const editHref = (m: AdminMember) => `/admin/members/edit?id=${m.id}`;

export default function AdminMembers() {
  const { role, flash, fail, refreshBadges } = useAdmin();
  const isAdmin = role === "admin";
  const [q, setQ] = useState("");
  const [para, setPara] = useState("");
  const [status, setStatus] = useState("");
  const qs = new URLSearchParams({ ...(q ? { q } : {}), ...(para ? { para } : {}), ...(status ? { status } : {}) });
  const members = useResource<AdminMember>(`/admin/members/?${qs}`, { idPath: memberPath });
  const applicants = useResource<AdminMember>("/admin/members/?status=pending", { idPath: memberPath });
  const site = useQuery<Site>("site", () => api.site());
  const paras = site.data?.lists.para ?? [];
  const preview = usePreview<AdminMember>();
  const fileRef = useRef<HTMLInputElement>(null);

  const decide = async (m: AdminMember, action: "approve" | "reject") => {
    try {
      await post(`/admin/members/${m.id}/${action}/`);
      applicants.removeLocal(m.id);
      preview.close();
      flash(action === "approve" ? `${m.name} অনুমোদিত · SMS পাঠানো হয়েছে` : `${m.name}-এর আবেদন বাতিল`);
      members.reload();
      refreshBadges();
    } catch (err) {
      fail(err);
    }
  };

  const importCsv = async (f: File) => {
    try {
      const r = await post<{ created: number; skipped: number; errors: string[] }>("/admin/members/import_csv/", form({ file: f }));
      flash(`${bn(r.created)} জন যোগ হয়েছে · ${bn(r.skipped)} জন আগে থেকেই ছিলেন${r.errors.length ? ` · ${bn(r.errors.length)}টি লাইনে সমস্যা` : ""}`);
      members.reload();
    } catch (err) {
      fail(err);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = (m: AdminMember) => {
    preview.close();
    members.remove(m, m.name, 'সাধারণত মুছে না ফেলে "নিষ্ক্রিয়" করাই ভালো — চাঁদার ইতিহাস থেকে যায়।');
  };

  const pending = applicants.items ?? [];
  const p = preview.item;

  return (
    <AdminPage slug="members">
      {pending.length > 0 && (
        <DataTable
          title={`নতুন আবেদন · অনুমোদনের অপেক্ষায়`}
          count={pending.length}
          rows={pending}
          onPreview={preview.open}
          columns={[
            { label: "আবেদনকারী", render: (a) => <div className="flex items-center gap-2.5"><Avatar label={initialOf(a.name)} size={40} tone="gold" /><Cell main={a.name} sub={formatPhone(a.phone)} /></div> },
            { label: "পাড়া", render: (a) => a.para || "—" },
            { label: "পেশা", render: (a) => a.profession || "—", hideOnMobile: true },
            { label: "রক্ত", render: (a) => a.blood_group || "—", hideOnMobile: true },
            { label: "থাকেন", render: (a) => a.residence_label + (a.country ? ` (${a.country})` : ""), hideOnMobile: true },
            { label: "আবেদন", render: (a) => formatDate(a.joined_at, { year: false }), hideOnMobile: true },
          ]}
          actions={(a) => (
            <>
              <IconAction label="অনুমোদন" tone="brand" icon={<Check className="size-5" aria-hidden />} onClick={() => decide(a, "approve")} />
              <IconAction label="বাতিল" tone="danger" icon={<X className="size-5" aria-hidden />} onClick={() => decide(a, "reject")} />
            </>
          )}
        />
      )}

      <Toolbar
        search={q}
        onSearch={setQ}
        placeholder="নাম, নম্বর বা ফোন দিয়ে খুঁজুন"
        addHref="/admin/members/edit"
        addLabel="সদস্য যোগ করুন"
        filters={
          <>
            <FilterSelect label="পাড়া" value={para} onChange={setPara}>
              <option value="">সব পাড়া</option>
              {paras.map((x) => (
                <option key={x.id}>{x.name}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="অবস্থা" value={status} onChange={setStatus}>
              <option value="">সক্রিয় ও নিষ্ক্রিয়</option>
              <option value="active">সক্রিয়</option>
              <option value="inactive">নিষ্ক্রিয়</option>
            </FilterSelect>
          </>
        }
      >
        {isAdmin && (
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="CSV ফাইল" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            <Button variant="outline" className="text-[16px]" onClick={() => fileRef.current?.click()} title="কলাম: নাম, ফোন, পাড়া, পেশা, রক্ত (প্রথম লাইনে শিরোনাম)">
              CSV ইমপোর্ট
            </Button>
            <Button variant="neutral" className="text-[16px]" onClick={() => download("/admin/members/export/", "members.csv").catch(fail)}>
              Excel এক্সপোর্ট
            </Button>
          </>
        )}
      </Toolbar>

      <DataTable
        title="সদস্য তালিকা"
        count={members.items?.length}
        rows={members.items}
        loading={members.loading}
        error={members.error}
        empty="কাউকে পাওয়া যায়নি।"
        onPreview={preview.open}
        editHref={editHref}
        onDelete={isAdmin ? remove : undefined}
        columns={[
          { label: "সদস্য", render: (m) => <Cell main={m.name} sub={m.member_no ?? "নম্বর বাকি"} /> },
          { label: "ফোন", render: (m) => <span className="font-mono text-[15px]">{m.phone}</span> },
          { label: "পাড়া", render: (m) => m.para || "—", hideOnMobile: true },
          { label: "রক্ত", render: (m) => m.blood_group || "—", hideOnMobile: true },
          { label: "রোল", render: (m) => roleLabel(m.role), hideOnMobile: true },
          { label: "অবস্থা", render: (m) => <MemberStatus status={m.status} /> },
        ]}
      />

      <PreviewDrawer
        data={p ? memberPreview(p) : null}
        onClose={preview.close}
        editHref={p ? editHref(p) : null}
        onDelete={p && isAdmin && p.status !== "pending" ? () => remove(p) : undefined}
        actions={
          p?.status === "pending" ? (
            <>
              <Button className="flex-1 text-[16px]" onClick={() => decide(p, "approve")}>
                অনুমোদন
              </Button>
              <Button variant="neutral" className="text-[16px]" onClick={() => decide(p, "reject")}>
                বাতিল
              </Button>
            </>
          ) : undefined
        }
      />
    </AdminPage>
  );
}
