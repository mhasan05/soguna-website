"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Droplet, House, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";

const ME_PATHS = ["/dashboard", "/profile", "/card", "/dues", "/members", "/login", "/register", "/aid/apply"];

export function BottomNav() {
  const pathname = usePathname();
  return <BottomNavView pathname={pathname} />;
}

export function BottomNavView({ pathname }: { pathname: string }) {
  const { session } = useSession();
  const items = [
    { id: "home", href: "/", label: "হোম", Icon: House, on: pathname === "/" },
    { id: "notices", href: "/notices", label: "নোটিশ", Icon: Bell, on: pathname.startsWith("/notices") },
    { id: "blood", href: "/blood", label: "রক্ত", Icon: Droplet, on: pathname.startsWith("/blood") },
    { id: "events", href: "/events", label: "কার্যক্রম", Icon: CalendarDays, on: pathname.startsWith("/events") },
    { id: "me", href: session ? "/dashboard" : "/login", label: "আমি", Icon: UserRound, on: ME_PATHS.some((p) => pathname.startsWith(p)) },
  ];
  return (
    <nav aria-label="নিচের মেনু" className="sticky bottom-0 z-30 grid h-[68px] grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-bottom nav:hidden">
      {items.map(({ id, href, label, Icon, on }) => (
        <Link
          key={id}
          href={href}
          aria-current={on ? "page" : undefined}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 text-[14px] hover:no-underline",
            id === "blood" ? "text-blood" : on ? "text-brand" : "text-muted",
            on ? "font-bold" : "font-normal",
          )}
        >
          <Icon className="size-6" strokeWidth={on ? 2.4 : 2} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
