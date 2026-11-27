"use client";

import { useEffect, useState } from "react";
import { Pill } from "@/components/ui/primitives";
import { get } from "@/lib/api";
import { bn, formatDate, formatPhone, formatTime, money } from "@/lib/bn";
import { LongText, type PreviewData } from "../crud";

export interface AdminEvent {
  id: number;
  slug: string;
  title: string;
  category: string | null;
  cover_src: string;
  description: string;
  venue: string;
  start_at: string;
  end_at: string | null;
  time_note: string;
  status: "upcoming" | "completed";
  meta_note: string;
  offline_going: number;
  offline_volunteers: number;
  beneficiaries_count: number | null;
  beneficiary_label: string;
  report_volunteers: number | null;
  report_cost: number | null;
  report: string;
  going_count: number;
  volunteer_count: number;
  photo_count: number;
}

export const eventWhenLabel = (e: Pick<AdminEvent, "start_at" | "time_note">) => `${formatDate(e.start_at)} · ${e.time_note || formatTime(e.start_at)}`;

export function EventStatus({ e }: { e: AdminEvent }) {
  return (
    <Pill tone={e.status === "upcoming" ? "gold" : "neutral"} className="px-2.5 text-[14px]">
      {e.status === "upcoming" ? "আসন্ন" : "সম্পন্ন"}
    </Pill>
  );
}

function Attendees({ id }: { id: number }) {
  const [rows, setRows] = useState<{ name: string; para: string; phone: string; is_volunteer: boolean }[] | null>(null);
  useEffect(() => {
    let alive = true;
    get<typeof rows>(`/admin/events/${id}/attendees/`).then((r) => alive && setRows(r ?? []), () => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!rows) return <span className="text-muted">লোড হচ্ছে…</span>;
  if (!rows.length) return <span className="text-muted">সাইট থেকে এখনো কেউ নাম দেননি।</span>;
  return (
    <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5">
      {rows.map((a) => (
        <li key={a.phone}>
          <span className="font-semibold">{a.name}</span>
          {a.is_volunteer && <span className="text-brand"> · স্বেচ্ছাসেবক</span>}
          <span className="text-muted"> · {a.para || "—"} · </span>
          <a href={`tel:${a.phone}`}>{formatPhone(a.phone)}</a>
        </li>
      ))}
    </ol>
  );
}

export function eventPreview(e: AdminEvent): PreviewData {
  const up = e.status === "upcoming";
  return {
    title: e.title,
    subtitle: eventWhenLabel(e),
    image: e.cover_src || null,
    badges: (
      <>
        <EventStatus e={e} />
        {e.category && (
          <Pill tone="green" className="px-2.5 text-[14px]">
            {e.category}
          </Pill>
        )}
      </>
    ),
    sections: [
      {
        title: "ইভেন্টের তথ্য",
        rows: [
          ["তারিখ ও সময়", eventWhenLabel(e)],
          ["স্থান", e.venue],
          ["ক্যাটাগরি", e.category],
          ["আসছেন", `${bn(e.going_count)} জন (সাইটের বাইরে ${bn(e.offline_going)} জন)`],
          ["স্বেচ্ছাসেবক", `${bn(e.volunteer_count)} জন`],
          ["ছবি", `${bn(e.photo_count)}টি`],
        ],
      },
      { title: "বিবরণ", content: <LongText text={e.description} /> },
      ...(!up
        ? [
            {
              title: "রিপোর্ট",
              rows: [
                ["উপকৃত", e.beneficiaries_count ? `${bn(e.beneficiaries_count)} ${e.beneficiary_label}` : ""],
                ["স্বেচ্ছাসেবক", e.report_volunteers ? `${bn(e.report_volunteers)} জন` : ""],
                ["মোট খরচ", e.report_cost ? money(e.report_cost) : ""],
              ] as [string, string][],
              content: e.report ? <LongText text={e.report} /> : undefined,
            },
          ]
        : []),
      { title: "যারা আসছেন (সাইট থেকে)", content: <Attendees id={e.id} /> },
    ],
  };
}
