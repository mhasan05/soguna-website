import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChartLine } from "lucide-react";
import { Breadcrumb, Img, Skeleton } from "@/components/ui/primitives";
import { photo } from "@/lib/content";
import { getAidFunds, getEvents, getFinanceSummary, getSite } from "@/lib/server-api";
import { money } from "@/lib/bn";
import { DonateForm } from "./donate-form";

export const metadata: Metadata = { title: "দান করুন", description: "bKash বা Nagad-এ দান করুন — প্রতিটি টাকার হিসাব সাইটে সবার জন্য খোলা।" };

export default async function DonatePage() {
  const [summary, site, upcoming, funds] = await Promise.all([getFinanceSummary(), getSite(), getEvents("upcoming"), getAidFunds()]);
  return (
    <div className="wrap grid-fit-420 items-start gap-x-10 gap-y-6 pt-page pb-page">
      <div className="flex flex-col gap-4">
        <div>
          <Breadcrumb current="দান করুন" />
          <h1 className="mt-1 mb-1.5 text-h1">দান করুন</h1>
          <p className="m-0 text-[17px] text-muted">আপনার প্রতিটি টাকার হিসাব সাইটে সবার জন্য খোলা থাকে।</p>
        </div>
        <Img src={photo("Village_children_in_Bangladesh.jpg", 1000)} alt="গ্রামের শিশুরা" loading="eager" className="aspect-video w-full rounded-xl" />
        <Link href="/finance" className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-[18px] py-4 text-ink hover:border-brand-200 hover:no-underline">
          <div>
            <div className="text-[15px] text-muted">তহবিলে বর্তমান ব্যালেন্স</div>
            <div className="text-[28px] leading-[1.2] font-bold text-brand">{money(summary.balance)}</div>
            <div className="mt-1 text-[16px] font-semibold text-brand">পুরো হিসাব দেখুন →</div>
          </div>
          <ChartLine className="size-10 text-brand" aria-hidden />
        </Link>
      </div>
      <Suspense fallback={<Skeleton className="h-[640px] w-full rounded-xl" />}>
        <DonateForm site={site} nextEvent={upcoming[0] ?? null} funds={funds} />
      </Suspense>
    </div>
  );
}
