"use client";

import { useState } from "react";
import { Cell, DataTable, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage, Reorder } from "@/components/admin/widgets";
import { useAdmin, useResource } from "@/components/admin/store";
import type { Position, Term } from "@/components/admin/res/committee";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Pill } from "@/components/ui/primitives";

const editHref = (p: Position) => `/admin/committee/edit?id=${p.id}`;
const REORDER = "/admin/committee/positions/reorder/";

export default function AdminCommittee() {
  const { flash, fail } = useAdmin();
  const terms = useResource<Term>("/admin/committee/terms/");
  const [termId, setTermId] = useState<number | null>(null);
  const term = termId ?? terms.items?.find((t) => t.is_current)?.id ?? terms.items?.[0]?.id ?? null;
  const positions = useResource<Position>(term ? `/admin/committee/positions/?term=${term}` : null);
  const preview = usePreview<Position>();
  const all = positions.items ?? [];
  const p = preview.item;

  const newTerm = async () => {
    const name = window.prompt("নতুন সেশনের নাম (যেমন: ২০২৮–২০২৯)");
    if (!name?.trim()) return;
    try {
      const t = await terms.create({ name: name.trim(), start_date: new Date().toISOString().slice(0, 10), is_current: false });
      setTermId(t.id);
      flash("নতুন সেশন তৈরি হয়েছে");
    } catch (err) {
      fail(err);
    }
  };

  const makeCurrent = async (t: Term) => {
    try {
      await terms.update(t.id, { is_current: true });
      terms.reload();
      flash(`"${t.name}" এখন বর্তমান কমিটি`);
    } catch (err) {
      fail(err);
    }
  };

  const remove = (x: Position) => {
    preview.close();
    positions.remove(x, x.title);
  };

  const currentTerm = terms.items?.find((t) => t.id === term);
  const columns = [
    { label: "ক্রম", className: "w-14", render: (x: Position) => <span onClick={(e) => e.stopPropagation()}><Reorder label={x.title} onUp={() => positions.move(all.indexOf(x), -1, REORDER)} onDown={() => positions.move(all.indexOf(x), 1, REORDER)} /></span> },
    { label: "পদবি", render: (x: Position) => <span className="font-semibold">{x.title}</span> },
    { label: "নাম", render: (x: Position) => <Cell main={x.member_name ?? x.person_name ?? ""} sub={x.member ? "সদস্য" : x.person_name ? "বাইরের ব্যক্তি" : <span className="text-gold-800">খালি পদ</span>} /> },
    { label: "পাড়া", render: (x: Position) => x.para_name || "—", hideOnMobile: true },
    { label: "ফোন সাইটে", render: (x: Position) => (x.show_phone ? "দেখাবে" : "লুকানো"), hideOnMobile: true },
  ];

  const committee = all.filter((x) => !x.is_advisor);
  const advisors = all.filter((x) => x.is_advisor);

  return (
    <AdminPage slug="committee">
      <Toolbar addHref={term ? `/admin/committee/edit?term=${term}` : undefined} addLabel="পদ যোগ করুন"
        filters={
          <>
            <Select aria-label="সেশন" value={term ?? ""} onChange={(e) => setTermId(Number(e.target.value))} className="h-12 w-auto text-[16px]">
              {(terms.items ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  সেশন {t.name}
                  {t.is_current ? " (বর্তমান)" : ""}
                </option>
              ))}
            </Select>
            {currentTerm && !currentTerm.is_current && (
              <Button variant="soft" className="text-[16px]" onClick={() => makeCurrent(currentTerm)}>
                বর্তমান কমিটি করুন
              </Button>
            )}
            <Button variant="outline" className="text-[16px]" onClick={newTerm}>
              + নতুন সেশন
            </Button>
          </>
        }
      />
      <DataTable title="কার্যনির্বাহী কমিটি" count={committee.length} rows={positions.items ? committee : null} loading={positions.loading} error={positions.error} empty="এই সেশনে এখনো কোনো পদ যোগ হয়নি।" onPreview={preview.open} editHref={editHref} onDelete={remove} columns={columns} />
      {advisors.length > 0 && <DataTable title="উপদেষ্টা পরিষদ" count={advisors.length} rows={advisors} onPreview={preview.open} editHref={editHref} onDelete={remove} columns={columns} />}
      <p className="m-0 text-[15px] text-muted">▲▼ দিয়ে সাজালে কমিটি পাতায় একই ক্রমে দেখাবে। পদবির তালিকা বদলাতে &quot;তালিকা ও ক্যাটাগরি&quot; পাতায় যান।</p>
      <PreviewDrawer
        data={
          p
            ? {
                title: p.member_name ?? (p.person_name || "খালি পদ"),
                subtitle: `${p.title} · সেশন ${currentTerm?.name ?? ""}`,
                badges: p.is_advisor ? <Pill tone="gold" className="px-2.5 text-[14px]">উপদেষ্টা</Pill> : undefined,
                sections: [
                  { title: "পদ", rows: [["পদবি", p.title], ["সেশন", currentTerm?.name], ["ধরন", p.is_advisor ? "উপদেষ্টা পরিষদ" : "কার্যনির্বাহী কমিটি"]] },
                  { title: "ব্যক্তি", rows: [["নাম", p.member_name ?? p.person_name], ["সদস্য?", p.member ? "হ্যাঁ — সদস্য তালিকা থেকে" : "না — বাইরের ব্যক্তি"], ["পাড়া", p.para_name], ["ফোন সাইটে", p.show_phone ? "দেখাবে" : "লুকানো"]] },
                ],
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
