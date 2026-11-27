import { Suspense } from "react";
import { SiteHeader, SiteHeaderView } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { BottomNav, BottomNavView } from "@/components/site/bottom-nav";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<SiteHeaderView pathname="" />}>
        <SiteHeader />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Suspense fallback={<BottomNavView pathname="" />}>
        <BottomNav />
      </Suspense>
    </>
  );
}
