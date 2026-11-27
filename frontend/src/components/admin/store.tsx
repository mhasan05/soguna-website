"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { del, errorMessage, get, patch, post } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/api-types";

export type AdminRole = Exclude<Role, "member">;

export const ADMIN_PAGES = [
  { slug: "", label: "ড্যাশবোর্ড", phase: "১", roles: ["admin", "cashier", "volunteer"] },
  { slug: "members", label: "সদস্য ব্যবস্থাপনা", phase: "১", roles: ["admin", "volunteer"] },
  { slug: "committee", label: "কমিটি", phase: "১", roles: ["admin"] },
  { slug: "notices", label: "নোটিশ", phase: "১", roles: ["admin", "volunteer"] },
  { slug: "emergency", label: "জরুরি নম্বর", phase: "১", roles: ["admin"] },
  { slug: "events", label: "ইভেন্ট", phase: "২", roles: ["admin", "volunteer"] },
  { slug: "gallery", label: "গ্যালারি", phase: "২", roles: ["admin", "volunteer"] },
  { slug: "dues", label: "চাঁদা", phase: "২", roles: ["admin", "cashier"] },
  { slug: "finance", label: "আয়-ব্যয়", phase: "২", roles: ["admin", "cashier"] },
  { slug: "aid", label: "সাহায্যের আবেদন", phase: "৩", roles: ["admin"] },
  { slug: "services", label: "সেবা ডিরেক্টরি", phase: "৩", roles: ["admin"] },
  { slug: "messages", label: "যোগাযোগের বার্তা", phase: "১", roles: ["admin"] },
  { slug: "reports", label: "রিপোর্ট", phase: "২", roles: ["admin", "cashier"] },
  { slug: "lists", label: "তালিকা ও ক্যাটাগরি", phase: "১", roles: ["admin"] },
  { slug: "settings", label: "সেটিংস", phase: "১", roles: ["admin"] },
] as const satisfies readonly { slug: string; label: string; phase: string; roles: readonly AdminRole[] }[];

export type AdminSlug = (typeof ADMIN_PAGES)[number]["slug"];

export const ROLE_LABEL: Record<AdminRole, string> = { admin: "অ্যাডমিন", cashier: "ক্যাশিয়ার", volunteer: "স্বেচ্ছাসেবক" };

interface Confirm {
  text: string;
  warn: string;
  onYes: () => void;
}

/** Sidebar badges (pending counts) — refreshed after relevant actions. */
export interface Badges {
  members?: number;
  notices?: number;
  dues?: number;
  aid?: number;
  messages?: number;
}

interface AdminCtx {
  role: AdminRole;
  confirm: Confirm | null;
  closeConfirm: () => void;
  ask: (c: Confirm) => void;
  flash: (msg: string, undo?: () => void) => void;
  fail: (err: unknown) => void;
  canAccess: (slug: string) => boolean;
  badges: Badges;
  refreshBadges: () => void;
}

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin outside AdminProvider");
  return c;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const role = (session?.role === "member" ? "admin" : session?.role) as AdminRole;
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [badges, setBadges] = useState<Badges>({});
  const toast = useToast();

  const canAccess = useCallback((slug: string) => {
    const p = ADMIN_PAGES.find((x) => x.slug === slug);
    return !!p && (p.roles as readonly string[]).includes(role);
  }, [role]);

  const refreshBadges = useCallback(() => {
    get<{ pending_members: number; pending_verify: number }>("/admin/dashboard/")
      .then(async (d) => {
        const next: Badges = { members: d.pending_members, dues: d.pending_verify };
        if (role === "admin") {
          const [n, a, m] = await Promise.all([get<unknown[]>("/admin/notices/?status=pending"), get<{ status: string }[]>("/admin/aid/"), get<{ handled: boolean }[]>("/admin/messages/")]);
          next.notices = n.length;
          next.aid = a.filter((x) => x.status === "pending").length;
          next.messages = m.filter((x) => !x.handled).length;
        }
        setBadges(next);
      })
      .catch(() => {});
  }, [role]);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  const value: AdminCtx = {
    role,
    confirm,
    closeConfirm: () => setConfirm(null),
    ask: setConfirm,
    flash: (m, undo) => toast.success(m, undo),
    fail: (err) => toast.error(errorMessage(err)),
    canAccess,
    badges,
    refreshBadges,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ───────────── Collection hook ───────────── */

type Id = number | string;
type WithId = { id: Id };

/**
 * Loads an admin collection and exposes CRUD that hits the API.
 * Deletes are delayed 7 s so "ফিরিয়ে আনুন" (undo) can cancel them before the request is sent.
 */
export function useResource<T extends WithId>(path: string | null, opts: { idPath?: (id: Id) => string } = {}) {
  const { ask, flash, fail } = useAdmin();
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const pending = useRef(new Map<Id, { t: ReturnType<typeof setTimeout>; run: () => void }>());
  const itemPath = useCallback((id: Id) => (opts.idPath ? opts.idPath(id) : `${path?.split("?")[0]}${id}/`), [opts, path]);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    get<T[]>(path).then(
      (d) => alive && (setItems(d), setError(null)),
      (e) => alive && setError(errorMessage(e)),
    );
    return () => {
      alive = false;
    };
  }, [path, nonce]);

  // Leaving the page commits any delete still waiting for its undo window.
  useEffect(() => {
    const map = pending.current;
    return () => {
      map.forEach(({ t, run }) => {
        clearTimeout(t);
        run();
      });
      map.clear();
    };
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const create = async (body: Record<string, unknown> | FormData, where: "start" | "end" = "start") => {
    const created = await post<T>(path!.split("?")[0], body);
    setItems((xs) => (where === "start" ? [created, ...(xs ?? [])] : [...(xs ?? []), created]));
    return created;
  };

  const update = async (id: Id, body: Record<string, unknown> | FormData) => {
    const updated = await patch<T>(itemPath(id), body);
    setItems((xs) => (xs ?? []).map((x) => (x.id === id ? updated : x)));
    return updated;
  };

  /** Replace an item locally (after a custom action endpoint). */
  const replace = (item: T) => setItems((xs) => (xs ?? []).map((x) => (x.id === item.id ? item : x)));
  const removeLocal = (id: Id) => setItems((xs) => (xs ?? []).filter((x) => x.id !== id));

  const remove = (item: T, label: string, warn = "এটি অডিট লগে লেখা থাকবে।") =>
    ask({
      text: `"${label}" মুছে ফেলবেন?`,
      warn,
      onYes: () => {
        const index = (items ?? []).findIndex((x) => x.id === item.id);
        removeLocal(item.id);
        const url = itemPath(item.id);
        const run = () => {
          pending.current.delete(item.id);
          del(url).catch((err) => {
            fail(err);
            reload();
          });
        };
        pending.current.set(item.id, { t: setTimeout(run, 7000), run });
        flash("মুছে ফেলা হয়েছে · অডিট লগে লেখা হলো", () => {
          clearTimeout(pending.current.get(item.id)?.t);
          pending.current.delete(item.id);
          setItems((xs) => {
            const a = [...(xs ?? [])];
            a.splice(Math.max(0, index), 0, item);
            return a;
          });
        });
      },
    });

  /** ▲▼ reorder: optimistic, then POST the new id order. */
  const move = (index: number, dir: -1 | 1, reorderPath?: string) => {
    if (!items) return;
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const a = [...items];
    [a[index], a[j]] = [a[j], a[index]];
    setItems(a);
    post(reorderPath ?? `${path!.split("?")[0]}reorder/`, { ids: a.map((x) => x.id) }).catch((err) => {
      fail(err);
      reload();
    });
  };

  return { items, error, loading: !items && !error, reload, create, update, replace, removeLocal, remove, move, setItems };
}
