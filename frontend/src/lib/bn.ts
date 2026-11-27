/**
 * Bangla formatting helpers.
 * Rule from the design: every numeral the user sees is a Bangla digit (০–৯),
 * money uses Indian grouping (৳১,৫০,০০০) and inputs accept either digit set.
 */

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export const MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;

export const MONTHS_SHORT = [
  "জানু",
  "ফেব্রু",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টে",
  "অক্টো",
  "নভে",
  "ডিসে",
] as const;

export const WEEKDAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"] as const;

/** ASCII digits → Bangla digits. */
export function bn(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Bangla digits → ASCII digits (normalise before sending to the API). */
export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Keep digits only (either script) and return them as ASCII. */
export function digitsOnly(value: string): string {
  return toAsciiDigits(value).replace(/\D/g, "");
}

/** ৳ with Indian grouping and Bangla digits. */
export function money(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  return sign + "৳" + bn(Math.abs(amount).toLocaleString("en-IN"));
}

/** "২৬ নভেম্বর ২০২৬" */
export function formatDate(date: Date | string, opts: { year?: boolean; weekday?: boolean } = {}): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const { year = true, weekday = false } = opts;
  let s = `${bn(d.getDate())} ${MONTHS[d.getMonth()]}`;
  if (year) s += ` ${bn(d.getFullYear())}`;
  if (weekday) s += `, ${WEEKDAYS[d.getDay()]}`;
  return s;
}

/** "সকাল ৯টা", "বিকাল ৪টা ১৫ মিনিটে" style time */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const h = d.getHours();
  const m = d.getMinutes();
  const part = h < 5 ? "রাত" : h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 18 ? "বিকাল" : h < 20 ? "সন্ধ্যা" : "রাত";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${part} ${bn(h12)}টা${m ? ` ${bn(m)} মিনিট` : ""}`;
}

/** Phone for display: ০১৭১২-৩৪৫৬৭৮ */
export function formatPhone(raw: string): string {
  const d = digitsOnly(raw);
  if (d.length !== 11) return bn(raw);
  return bn(`${d.slice(0, 5)}-${d.slice(5)}`);
}

/** Valid BD mobile: 01[3-9]XXXXXXXX (accepts +88 / 88 prefix, either digit script). */
export function normalisePhone(raw: string): string | null {
  let d = digitsOnly(raw);
  if (d.startsWith("88")) d = d.slice(2);
  return /^01[3-9]\d{8}$/.test(d) ? d : null;
}

export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/** First letter of a Bangla name without the "মোঃ" style honorific. */
export function initialOf(name: string): string {
  const cleaned = name.replace(/^(মোঃ|মোছাঃ|মো\.|হাফেজ|মাওলানা|আলহাজ্ব|ডা\.)\s*/g, "").replace(/^(মোঃ|মোছাঃ)\s*/, "");
  return Array.from(cleaned.trim())[0] ?? "?";
}

/** Two-letter initials for avatars, e.g. "মোঃ রাকিব হাসান" → "রা" */
export function avatarInitials(name: string): string {
  const cleaned = name.replace(/^(মোঃ|মোছাঃ|হাফেজ মোঃ|ডা\. মোঃ)\s*/, "").trim();
  // Bangla letters can carry combining vowel signs, so take the first grapheme-ish pair.
  const chars = Array.from(cleaned);
  let out = chars[0] ?? "";
  if (chars[1] && /[া-ৌৗ]/.test(chars[1])) out += chars[1];
  return out;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}
