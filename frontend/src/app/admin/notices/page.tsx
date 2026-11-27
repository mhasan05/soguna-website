"use client";

import { useState } from "react";
import { Check, Pin, PinOff } from "lucide-react";
import { Cell, DataTable, FilterSelect, IconAction, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage } from "@/components/admin/widgets";
import { useAdmin, useResource } from "@/components/admin/store";
import { NoticeStatus, noticePreview, type AdminNotice } from "@/components/admin/res/notices";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/api";
import { formatDate } from "@/lib/bn";

const editHref = (n: AdminNotice) => `/admin/notices/edit?id=${n.id}`;

export default function AdminNotices() {
  const { role, flash, fail, refreshBadges } = useAdmin();
  const volunteer = role === "volunteer";
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const notices = useResource<AdminNotice>(`/admin/notices/${status ? `?status=${status}` : ""}`);
  const preview = usePreview<AdminNotice>();
  const p = preview.item;

  const rows = (notices.items ?? []).filter((n) => !q || n.title.includes(q) || n.category.includes(q));

  const approve = async (n: AdminNotice) => {
    try {
      const saved = await post<AdminNotice>(`/admin/notices/${n.id}/publish/`);
      notices.replace(saved);
      preview.close();
      flash("নোটিশ অনুমোদিত ও প্রকাশিত হয়েছে");
      refreshBadges();
    } catch (err) {
      fail(err);
    }
  };

  const togglePin = (n: AdminNotice) =>
    notices
      .update(n.id, { is_pinned: !n.is_pinned, is_urgent: !n.is_pinned })
      .then(() => flash(n.is_pinned ? "পিন সরানো হয়েছে" : "হোম পেজের উপরে পিন করা হয়েছে"))
      .catch(fail);

  const canDelete = (n: AdminNotice) => !volunteer || n.status !== "published";
  const remove = (n: AdminNotice) => {
    preview.close();
    notices.remove(n, n.title);
  };

  return (
    <AdminPage slug="notices">
      <Toolbar
        search={q}
        onSearch={setQ}
        placeholder="শিরোনাম দিয়ে খুঁজুন"
        addHref="/admin/notices/edit"
        addLabel={volunteer ? "নতুন খসড়া" : "নতুন নোটিশ"}
        filters={
          <FilterSelect label="অবস্থা" value={status} onChange={setStatus}>
            <option value="">সব নোটিশ</option>
            <option value="published">প্রকাশিত</option>
            <option value="pending">অনুমোদনের অপেক্ষায়</option>
            <option value="draft">খসড়া</option>
          </FilterSelect>
        }
      />
      <DataTable
        title={volunteer ? "আমার নোটিশ" : "নোটিশ"}
        count={rows.length}
        rows={notices.items ? rows : null}
        loading={notices.loading}
        error={notices.error}
        empty="কোনো নোটিশ নেই।"
        onPreview={preview.open}
        editHref={(n) => (volunteer && n.status === "published" ? null : editHref(n))}
        onDelete={remove}
        canDelete={canDelete}
        rowClassName={(n) => (n.status === "pending" ? "bg-gold-25" : undefined)}
        columns={[
          { label: "শিরোনাম", render: (n) => <Cell main={<>{n.is_pinned && <Pin className="mr-1 inline size-4 text-blood" aria-label="পিন করা" />}{n.title}</>} sub={n.category} /> },
          { label: "কারা দেখবে", render: (n) => (n.visibility === "members" ? "সদস্য-কেবল" : "পাবলিক"), hideOnMobile: true },
          { label: "অবস্থা", render: (n) => <NoticeStatus n={n} /> },
          { label: "তারিখ", render: (n) => formatDate(n.published_at, { year: false }), hideOnMobile: true },
          { label: "লেখক", render: (n) => n.created_by_name ?? "—", hideOnMobile: true },
        ]}
        actions={(n) =>
          volunteer ? null : (
            <>
              {n.status === "pending" && <IconAction label="অনুমোদন ও প্রকাশ" tone="brand" icon={<Check className="size-5" aria-hidden />} onClick={() => approve(n)} />}
              {n.status === "published" && (
                <IconAction label={n.is_pinned ? "পিন সরান" : "হোম পেজে পিন করুন"} tone="gold" icon={n.is_pinned ? <PinOff className="size-[18px]" aria-hidden /> : <Pin className="size-[18px]" aria-hidden />} onClick={() => togglePin(n)} />
              )}
            </>
          )
        }
      />
      <PreviewDrawer
        data={p ? noticePreview(p) : null}
        onClose={preview.close}
        editHref={p && !(volunteer && p.status === "published") ? editHref(p) : null}
        onDelete={p && canDelete(p) ? () => remove(p) : undefined}
        actions={
          p && !volunteer && p.status === "pending" ? (
            <Button className="flex-1 text-[16px]" onClick={() => approve(p)}>
              অনুমোদন ও প্রকাশ
            </Button>
          ) : undefined
        }
      />
    </AdminPage>
  );
}
