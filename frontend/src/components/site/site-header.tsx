"use client";

import { BrandLogo } from "@/components/brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Droplet, Menu, UserRound, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";

export const NAV_LINKS = [
  { href: "/", label: "হোম", match: (p: string) => p === "/" },
  { href: "/about", label: "আমাদের কথা" },
  { href: "/committee", label: "কমিটি" },
  { href: "/notices", label: "নোটিশ" },
  { href: "/events", label: "কার্যক্রম" },
  { href: "/gallery", label: "গ্যালারি" },
  { href: "/donate", label: "দান ও হিসাব", match: (p: string) => p.startsWith("/donate") || p.startsWith("/finance") },
  { href: "/contact", label: "যোগাযোগ" },
] as const;

function isActive(link: (typeof NAV_LINKS)[number], pathname: string) {
  if ("match" in link && link.match) return link.match(pathname);
  return pathname === link.href || pathname.startsWith(link.href + "/");
}

export function SiteHeader() {
  const pathname = usePathname();
  return <SiteHeaderView pathname={pathname} />;
}

export function SiteHeaderView({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const account = session ? { href: "/dashboard", label: "আমার পাতা" } : { href: "/login", label: "লগইন" };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-30 bg-brand text-white">
      <div className="wrap flex items-center gap-3 py-2.5">
        <Link href="/" onClick={close} className="flex min-w-0 flex-1 items-center gap-2.5 text-white hover:no-underline">
          <BrandLogo className="h-[42px] nav:h-[44px] xl:h-[48px]" />
        </Link>

        {/* Desktop */}
        <nav aria-label="প্রধান মেনু" className="ml-auto hidden items-center gap-0.5 nav:flex">
          {NAV_LINKS.slice(1).map((l) => {
            const on = isActive(l, pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "border-b-2 px-1.5 py-2.5 text-[14px] text-white hover:no-underline lg:px-2 lg:text-[15px] xl:px-[11px] xl:text-[16px]",
                  on ? "border-gold font-bold" : "border-transparent hover:border-white/40",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-1 hidden gap-2 nav:flex lg:ml-2 lg:gap-2.5">
          <Link href="/blood" className="flex h-12 items-center gap-2 rounded-[10px] bg-blood px-4 text-[17px] font-semibold text-white hover:bg-blood-700 hover:no-underline xl:px-[18px]">
            <Droplet className="size-5" aria-hidden />
            রক্ত<span className="hidden xl:inline"> খুঁজুন</span>
          </Link>
          <Link
            href={account.href}
            className="flex h-12 items-center gap-2 rounded-[10px] border-[1.5px] border-white/80 px-4 text-[17px] font-semibold text-white hover:bg-white/10 hover:no-underline xl:px-[18px]"
          >
            <UserRound className="size-5" aria-hidden />
            {account.label}
          </Link>
        </div>

        {/* Mobile */}
        <Link href="/blood" onClick={close} className="flex h-12 flex-none items-center gap-1.5 rounded-[10px] bg-blood px-3 text-[16px] font-semibold text-white hover:no-underline nav:hidden">
          <Droplet className="size-[18px]" aria-hidden />
          রক্ত
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="মেনু"
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex size-12 flex-none items-center justify-center rounded-[10px] border-[1.5px] border-white/60 text-white nav:hidden"
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full flex flex-col border-b border-line bg-white px-4 pt-2 pb-4 text-ink shadow-menu nav:hidden">
          {NAV_LINKS.map((l) => {
            const on = isActive(l, pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                aria-current={on ? "page" : undefined}
                className={cn("border-b border-divider px-1 py-3 text-[18px] text-ink hover:no-underline", on && "font-bold text-brand")}
              >
                {l.label}
              </Link>
            );
          })}
          <Link href="/aid" onClick={close} className="border-b border-divider px-1 py-3 text-[18px] text-ink hover:no-underline">
            সাহায্য ও সেবা
          </Link>
          <Link href={account.href} onClick={close} className="mt-3.5 flex h-[52px] items-center justify-center rounded-[10px] bg-brand text-[18px] font-semibold text-white hover:no-underline">
            {account.label}
          </Link>
        </div>
      )}
    </header>
  );
}
