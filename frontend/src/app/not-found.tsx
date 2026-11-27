import type { Metadata } from "next";
import { SiteHeaderView } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { NotFoundContent } from "@/components/site/status-pages";

export const metadata: Metadata = { title: "পাতা পাওয়া যায়নি" };

export default function GlobalNotFound() {
  return (
    <>
      <SiteHeaderView pathname="" />
      <main className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
