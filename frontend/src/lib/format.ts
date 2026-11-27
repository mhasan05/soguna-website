import { WEEKDAYS, bn, formatDate, formatTime, money } from "./bn";
import type { EventItem } from "./api-types";

/** "শনিবার, সকাল ৯টা" (or the event's time note, e.g. "বাদ জুমা") */
export function eventTime(e: Pick<EventItem, "start_at" | "time_note">) {
  const d = new Date(e.start_at);
  return `${WEEKDAYS[d.getDay()]}, ${e.time_note || formatTime(d)}`;
}

/** "১৩ ডিসেম্বর, শনিবার · সকাল ৯টা" — year shown only when it isn't the current one. */
export function eventWhen(e: Pick<EventItem, "start_at" | "time_note">, currentYear = 2026) {
  const d = new Date(e.start_at);
  return `${formatDate(d, { year: d.getFullYear() !== currentYear })}, ${WEEKDAYS[d.getDay()]} · ${e.time_note || formatTime(d)}`;
}

/** Card footer line: upcoming → "৪২ জন আসছেন"; completed → beneficiaries + cost. */
export function eventMeta(e: EventItem) {
  if (e.status === "upcoming") return e.meta_note || `${bn(e.going_count)} জন আসছেন`;
  if (!e.report) return "";
  const parts = [];
  if (e.report.beneficiaries) parts.push(`${bn(e.report.beneficiaries)} ${e.report.beneficiary_label}`);
  if (e.report.cost) parts.push(`খরচ ${money(e.report.cost)}`);
  return parts.join(" · ");
}

export const METHOD_LABEL: Record<string, string> = { bkash: "bKash", nagad: "Nagad", cash: "নগদ ক্যাশিয়ারকে" };
