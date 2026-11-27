/**
 * Browser client for the Django REST API.
 * Base URL: NEXT_PUBLIC_API_URL (default http://localhost:8000/api).
 * Sends the JWT access token, refreshes it once on 401, normalises Bangla digits in JSON bodies,
 * and turns error responses into ApiError {message, code, fields, data}.
 */
import { toAsciiDigits } from "./bn";
import type { AidFund, DirectoryMember, DonorsResult, EventDetail, EventItem, Me, MyAidRequest, MyDues, NoticeDetail, NoticeItem, Site, TransactionItem } from "./api-types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

const ACCESS = "sajs.access";
const REFRESH = "sajs.refresh";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "",
    public fields: Record<string, string> = {},
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const tokens = {
  get access() {
    return typeof window === "undefined" ? null : localStorage.getItem(ACCESS);
  },
  get refresh() {
    return typeof window === "undefined" ? null : localStorage.getItem(REFRESH);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

/** Called when the session can't be refreshed (session.ts subscribes). */
let onAuthLost: () => void = () => {};
export function setAuthLostHandler(fn: () => void) {
  onAuthLost = fn;
}

function normalise<T>(body: T): T {
  if (typeof body === "string") return toAsciiDigits(body) as T;
  if (Array.isArray(body)) return body.map(normalise) as T;
  if (body && typeof body === "object") return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, normalise(v)])) as T;
  return body;
}

let refreshing: Promise<boolean> | null = null;
async function refreshAccess(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  refreshing ??= fetch(`${API_URL}/auth/refresh/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }) })
    .then(async (r) => {
      if (!r.ok) return false;
      const d = await r.json();
      tokens.set(d.access, d.refresh);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type Body = Record<string, unknown> | unknown[] | FormData | undefined;

export async function request<T>(method: string, path: string, body?: Body, retry = true): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new ApiError("ইন্টারনেট নেই", 0, "offline");
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(normalise(body)) });
  } catch {
    throw new ApiError("সার্ভারে পৌঁছানো যাচ্ছে না", 0, "network");
  }

  if (res.status === 401 && retry && tokens.refresh) {
    if (await refreshAccess()) return request<T>(method, path, body, false);
    tokens.clear();
    onAuthLost();
  }
  if (!res.ok) {
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {}
    throw new ApiError(String(data.detail ?? (res.status >= 500 ? "সার্ভার সমস্যা" : "অনুরোধ সফল হয়নি")), res.status, String(data.code ?? ""), (data.fields as Record<string, string>) ?? {}, data);
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get("content-type") ?? "";
  return (type.includes("json") ? res.json() : res.blob()) as Promise<T>;
}

export const get = <T>(path: string) => request<T>("GET", path);
export const post = <T>(path: string, body?: Body) => request<T>("POST", path, body ?? {});
export const patch = <T>(path: string, body: Body) => request<T>("PATCH", path, body);
export const del = (path: string) => request<void>("DELETE", path);

/** Build multipart form data; arrays become repeated fields, null/undefined are skipped. */
export function form(fields: Record<string, unknown>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, x instanceof Blob ? x : String(x)));
    else fd.append(k, v instanceof Blob ? v : typeof v === "string" ? toAsciiDigits(v) : String(v));
  }
  return fd;
}

/** Download a file (CSV export / report) with auth. */
export async function download(path: string, filename: string) {
  const blob = await request<Blob>("GET", path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ───────────── Typed endpoints ───────────── */
export const api = {
  site: () => get<Site>("/site/"),
  sendOtp: (phone: string) => post<{ expires_in: number; resend_in: number; registered: boolean; screen_code?: string }>("/auth/otp/send/", { phone }),
  verifyOtp: (phone: string, code: string) => post<{ access: string; refresh: string; member: Me }>("/auth/otp/verify/", { phone, code }),
  register: (data: FormData) => post<{ status: "pending" }>("/members/register/", data),
  me: () => get<Me>("/me/"),
  updateMe: (data: Partial<Me>) => patch<Me>("/me/", data as Record<string, unknown>),
  uploadPhoto: (file: File) => post<Me>("/me/photo/", form({ photo: file })),
  setAvailability: (available: boolean) => patch<Me>("/me/donor/", { available }),
  donatedToday: (undo = false, previous?: string | null) => post<Me>("/me/donor/donated-today/", { undo, previous }),
  directory: (params: Record<string, string>) => get<{ results: DirectoryMember[]; total: number }>(`/members/?${new URLSearchParams(params)}`),
  donors: (group: string, para?: string) => get<DonorsResult>(`/donors/?${new URLSearchParams({ blood_group: group, ...(para ? { para } : {}) })}`),
  notices: () => get<NoticeItem[]>("/notices/"),
  events: (status?: "upcoming" | "completed") => get<EventItem[]>(`/events/${status ? `?status=${status}` : ""}`),
  notice: (slug: string) => get<NoticeDetail>(`/notices/${encodeURIComponent(slug)}/`),
  event: (slug: string) => get<EventDetail>(`/events/${encodeURIComponent(slug)}/`),
  rsvp: (slug: string, body: { going?: boolean; is_volunteer?: boolean }) => post<EventDetail>(`/events/${encodeURIComponent(slug)}/rsvp/`, body),
  bloodRequest: (data: Record<string, unknown>) => post<{ status: string; notified: number }>("/blood-requests/", data),
  contact: (data: Record<string, unknown>) => post<void>("/contact/", data),
  donate: (data: Record<string, unknown>) => post<{ status: "pending" }>("/donations/", data),
  transactions: () => get<TransactionItem[]>("/finance/transactions/"),
  aidFunds: () => get<AidFund[]>("/aid-funds/"),
  myDues: (year?: number) => get<MyDues>(`/dues/me/${year ? `?year=${year}` : ""}`),
  payDues: (data: Record<string, unknown>) => post<{ status: "pending"; total: number }>("/dues/", data),
  myAid: () => get<MyAidRequest[]>("/aid-requests/"),
  applyAid: (data: FormData) => post<{ id: number }>("/aid-requests/", data),
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "offline") return "ইন্টারনেট নেই — সংযোগ ফিরলে আবার পাঠান";
    if (err.code === "network") return "সার্ভারে পৌঁছানো যাচ্ছে না — একটু পর আবার চেষ্টা করুন";
    return err.message;
  }
  return "কিছু একটা সমস্যা হয়েছে";
}

/** Field errors from the API (E3) keyed by API field name. */
export function fieldErrors(err: unknown): Record<string, string> {
  return err instanceof ApiError ? err.fields : {};
}
