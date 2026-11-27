"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, IconCircle, Skeleton } from "@/components/ui/primitives";
import { useSession } from "@/lib/session";

/** E7 — lock card; after login the user returns to this same page. */
export function LoginRequired({ title = "এটি শুধু সদস্যদের জন্য", sub = "লগইন করলে এখানেই ফিরে আসবেন।", next }: { title?: string; sub?: string; next?: string }) {
  const pathname = usePathname();
  return (
    <Card className="mx-auto flex max-w-[520px] flex-col items-center gap-2.5 px-5 py-10 text-center">
      <IconCircle size={68}>
        <Lock className="size-7" aria-hidden />
      </IconCircle>
      <div className="text-[19px] font-semibold">{title}</div>
      <p className="m-0 text-[16px] text-muted">{sub}</p>
      <LinkButton href={`/login?next=${encodeURIComponent(next ?? pathname)}`} className="mt-1.5 px-7">
        লগইন করুন
      </LinkButton>
    </Card>
  );
}

/** Renders children only for logged-in members; otherwise the lock state. */
export function MembersOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { session, ready } = useSession();
  if (!ready)
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  if (!session) return <>{fallback ?? <LoginRequired />}</>;
  return <>{children}</>;
}
