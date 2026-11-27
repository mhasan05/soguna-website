import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = { title: { default: "অ্যাডমিন প্যানেল", template: "%s · অ্যাডমিন" }, robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-admin" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
