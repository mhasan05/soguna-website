"use client";

/**
 * Client session: JWT tokens (api.ts) + the member profile from /me/.
 * useSyncExternalStore keeps the server render logged-out and hydrates without mismatches.
 */
import { useSyncExternalStore } from "react";
import type { Me, Role } from "./api-types";
import { api, setAuthLostHandler, tokens } from "./api";

export interface Session {
  phone: string;
  role: Role;
  memberId: number;
  name: string;
  no: string | null;
  me: Me;
}

type Listener = () => void;
const KEY = "sajs.session";
const listeners = new Set<Listener>();
let cache: { raw: string | null; value: Session | null } | null = null;

function read(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (cache && cache.raw === raw) return cache.value;
  let value: Session | null = null;
  try {
    value = raw && tokens.access ? (JSON.parse(raw) as Session) : null;
  } catch {}
  cache = { raw, value };
  return value;
}

function write(s: Session | null) {
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => (e.key === KEY || e.key === null) && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const noop = () => () => {};

export function useSession() {
  const session = useSyncExternalStore(subscribe, read, () => null);
  const ready = useSyncExternalStore(noop, () => true, () => false);
  return { session, ready };
}

function fromMe(me: Me): Session {
  return { phone: me.phone, role: me.role, memberId: me.id, name: me.name, no: me.member_no, me };
}

export function login(access: string, refresh: string, me: Me) {
  tokens.set(access, refresh);
  write(fromMe(me));
}

/** Update the cached profile after a PATCH. */
export function setMe(me: Me) {
  write(fromMe(me));
}

/** Re-fetch /me/ (role or status may have changed on the server). */
export async function refreshMe() {
  if (!tokens.access) return null;
  try {
    const me = await api.me();
    setMe(me);
    return me;
  } catch {
    return null;
  }
}

export function logout() {
  tokens.clear();
  write(null);
}

if (typeof window !== "undefined") {
  setAuthLostHandler(() => write(null));
  // Validate a stored session once per page load.
  if (tokens.access) void refreshMe();
}

/* ───────────── Clock ───────────── */
/** Server-render reference time; the client switches to the real clock after hydration. */
export const REFERENCE_NOW = Date.parse("2026-11-26T08:00:00+06:00");
let nowCache = typeof window === "undefined" ? REFERENCE_NOW : Date.now();
const nowListeners = new Set<Listener>();
let nowTimer: ReturnType<typeof setInterval> | undefined;

function subscribeNow(l: Listener) {
  nowListeners.add(l);
  if (!nowTimer) {
    nowTimer = setInterval(() => {
      nowCache = Date.now();
      nowListeners.forEach((fn) => fn());
    }, 30_000);
  }
  return () => {
    nowListeners.delete(l);
    if (!nowListeners.size && nowTimer) {
      clearInterval(nowTimer);
      nowTimer = undefined;
    }
  };
}

export function useNow() {
  return useSyncExternalStore(subscribeNow, () => nowCache, () => REFERENCE_NOW);
}

export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
