"use client";

import { BrandLogo } from "@/components/brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { LoginRequired } from "@/components/site/members-only";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { ADMIN_PAGES, AdminProvider, ROLE_LABEL, useAdmin, type Badges } from "./store";
import { bn } from "@/lib/bn";

export function AdminShell({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  if (!ready) return <div className="min-h-dvh bg-admin" />;
  if (!session)
    return (
      <div className="flex min-h-dvh items-center bg-admin px-4">
        <LoginRequired title="অ্যাডমিন প্যানেলে ঢুকতে লগইন করুন" next="/admin" />
      </div>
    );
  if (session.role === "member")
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-admin px-4 text-center">
        <div className="text-[20px] font-bold">অ্যাডমিন প্যানেল শুধু কমিটির জন্য</div>
        <Link href="/dashboard">আমার পাতায় ফিরে যান →</Link>
      </div>
    );
  return (
    <AdminProvider>
      <Frame>{children}</Frame>
    </AdminProvider>
  );
}

function useMenu() {
  const { role, badges } = useAdmin();
  const pathname = usePathname();
  const current = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  return ADMIN_PAGES.filter((p) => (p.roles as readonly string[]).includes(role)).map((p) => {
    const n = badges[p.slug as keyof Badges];
    return { ...p, href: p.slug ? `/admin/${p.slug}` : "/admin", active: p.slug === current, badge: n ? bn(n) : undefined };
  });
}

function Frame({ children }: { children: ReactNode }) {
  const { role, confirm, closeConfirm } = useAdmin();
  const { session } = useSession();
  const menu = useMenu();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);


  return (
    <div className="flex min-h-dvh flex-col bg-admin">
      {/* Mobile bar */}
      <div className="sticky top-0 z-30 bg-brand-dark text-white nav:hidden">
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <BrandLogo variant="icon" alt="" className="size-10" />
          <div className="min-w-0 flex-1 leading-[1.25]">
            <div className="text-[16px] font-bold">অ্যাডমিন প্যানেল</div>
            <div className="text-[13px] opacity-85">{ROLE_LABEL[role]}</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="মেনু"
            aria-expanded={open}
            className="flex size-12 flex-none items-center justify-center rounded-[10px] border-[1.5px] border-white/50"
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
        {open && (
          <nav aria-label="অ্যাডমিন মেনু" className="absolute inset-x-0 top-full flex max-h-[calc(100dvh-68px)] flex-col gap-0.5 overflow-y-auto scrollbar-none bg-brand-dark px-3 pt-1 pb-3.5 shadow-[0_10px_24px_rgba(0,0,0,.25)]">
            {menu.map((m) => (
              <Link
                key={m.slug}
                href={m.href}
                onClick={() => setOpen(false)}
                aria-current={m.active ? "page" : undefined}
                className={cn("flex min-h-12 items-center justify-between rounded-[10px] px-3.5 text-[17px] text-white hover:no-underline", m.active ? "bg-white/16 font-bold" : "font-medium")}
              >
                {m.label}
                {m.badge && <span className="text-[13px] opacity-70">{m.badge}</span>}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-[264px] flex-none flex-col bg-brand-dark text-white nav:flex">
          <div className="sticky top-0 flex max-h-dvh flex-col">
            <Link href="/admin" className="flex items-center gap-2.5 px-[18px] pt-[18px] pb-3.5 text-white hover:no-underline">
              <div className="flex min-w-0 flex-col gap-1.5">
                <BrandLogo className="h-[44px]" />
                <div className="text-[13px] opacity-85">অ্যাডমিন প্যানেল</div>
              </div>
            </Link>
            <div aria-hidden className="mx-[18px] h-px bg-white/15" />
            <nav aria-label="অ্যাডমিন মেনু" className="flex flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-none p-3">
              {menu.map((m) => (
                <Link
                  key={m.slug}
                  href={m.href}
                  aria-current={m.active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[46px] items-center justify-between rounded-[10px] px-3.5 text-[16px] text-white hover:bg-white/8 hover:no-underline",
                    m.active ? "bg-white/16 font-bold" : "font-medium",
                  )}
                >
                  {m.label}
                  {m.badge && <span className="rounded-full bg-gold px-2 text-[13px] font-bold">{m.badge}</span>}
                </Link>
              ))}
            </nav>
            <div className="border-t border-white/12 px-[18px] py-3.5 text-[15px]">
              <div className="font-semibold">{session?.name}</div>
              <div className="opacity-80">{ROLE_LABEL[role]}</div>
              <Link href="/dashboard" className="mt-1 inline-block text-[14px] text-gold-300">আমার পাতা →</Link>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-[18px] p-[clamp(16px,2.4vw,32px)]">
          {confirm && (
            <div role="alertdialog" aria-labelledby="confirm-title" className="sticky top-[76px] z-20 flex flex-wrap items-center gap-2.5 rounded-xl border-2 border-blood bg-white px-4 py-3.5 shadow-[0_10px_30px_rgba(28,25,23,.18)] nav:top-2">
              <div className="min-w-0 flex-[1_1_240px]">
                <div id="confirm-title" className="text-[17px] font-bold">
                  {confirm.text}
                </div>
                <div className="text-[15px] text-muted">{confirm.warn}</div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={closeConfirm} className="h-12 rounded-[10px] border-[1.5px] border-field bg-white px-4 text-[16px] font-semibold text-body">
                  না, থাক
                </button>
                <button type="button" onClick={confirm.onYes} autoFocus className="h-12 rounded-[10px] bg-blood px-4 text-[16px] font-bold text-white hover:bg-blood-700">
                  হ্যাঁ, মুছুন
                </button>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
