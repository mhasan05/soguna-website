/**
 * Server-side, cached reads for public pages (Cache Components).
 * Each function is a `use cache` scope so pages prerender into the static shell and
 * refresh in the background every few minutes. Requires the API at build time.
 * API_URL (server) falls back to NEXT_PUBLIC_API_URL.
 */
import { cacheLife, cacheTag } from "next/cache";
import type { AidFund, AlbumDetail, AlbumItem, Committee, EventDetail, EventItem, FinanceSummary, JobItem, NoticeDetail, NoticeItem, ServiceItem, Site, VideoItem } from "./api-types";

const BASE = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

class NotFound extends Error {}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  if (res.status === 404) throw new NotFound(path);
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof NotFound) return null;
    throw e;
  }
}

export async function getSite() {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return getJson<Site>("/site/");
}

export async function getCommittee() {
  "use cache";
  cacheLife("hours");
  cacheTag("committee");
  return getJson<Committee>("/committee/");
}

export async function getNotices(params: { limit?: number; category?: string; urgent?: boolean } = {}) {
  "use cache";
  cacheLife("minutes");
  cacheTag("notices");
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.category) q.set("category", params.category);
  if (params.urgent) q.set("urgent", "1");
  return getJson<NoticeItem[]>(`/notices/?${q}`);
}

export async function getNotice(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("notices", `notice:${slug}`);
  return orNull(getJson<NoticeDetail>(`/notices/${encodeURIComponent(slug)}/`));
}

export async function getEvents(status?: "upcoming" | "completed") {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  return getJson<EventItem[]>(`/events/${status ? `?status=${status}` : ""}`);
}

export async function getEvent(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("events", `event:${slug}`);
  return orNull(getJson<EventDetail>(`/events/${encodeURIComponent(slug)}/`));
}

export async function getAlbums() {
  "use cache";
  cacheLife("hours");
  cacheTag("gallery");
  return getJson<AlbumItem[]>("/albums/");
}

export async function getAlbum(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("gallery", `album:${slug}`);
  return orNull(getJson<AlbumDetail>(`/albums/${encodeURIComponent(slug)}/`));
}

export async function getVideos() {
  "use cache";
  cacheLife("hours");
  cacheTag("gallery");
  return getJson<VideoItem[]>("/videos/");
}

export async function getFinanceSummary() {
  "use cache";
  cacheLife("minutes");
  cacheTag("finance");
  return getJson<FinanceSummary>("/finance/summary/");
}

export async function getAidFunds() {
  "use cache";
  cacheLife("minutes");
  cacheTag("aid");
  return getJson<AidFund[]>("/aid-funds/");
}

export async function getServices() {
  "use cache";
  cacheLife("hours");
  cacheTag("services");
  return getJson<ServiceItem[]>("/services/");
}

export async function getJobs() {
  "use cache";
  cacheLife("hours");
  cacheTag("jobs");
  return getJson<JobItem[]>("/jobs/");
}

export async function getVerify(memberNo: string) {
  "use cache";
  cacheLife("minutes");
  try {
    const res = await fetch(`${BASE}/members/verify/${encodeURIComponent(memberNo)}/`);
    return (await res.json()) as { valid: boolean; member_no: string; name?: string; since?: number };
  } catch {
    return { valid: false, member_no: memberNo };
  }
}

/** generateStaticParams must return at least one entry under Cache Components. */
export function atLeastOne<T>(list: T[], placeholder: T): T[] {
  return list.length ? list : [placeholder];
}
