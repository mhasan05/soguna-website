import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { getSite } from "@/lib/server-api";
import { BloodFinder } from "./blood-finder";

export const metadata: Metadata = {
  title: "রক্তদাতা খুঁজুন",
  description: "সগুনার রক্তদাতাদের তালিকা — রক্তের গ্রুপ ও পাড়া অনুযায়ী খুঁজুন, জরুরি অনুরোধ পাঠান।",
};

function BloodSkeleton() {
  return (
    <section className="border-b border-blood-200 bg-blood-50" aria-busy>
      <div className="wrap flex flex-col gap-4 py-10">
        <h1 className="m-0 text-h1">রক্তদাতা খুঁজুন</h1>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(68px,1fr))] gap-2.5">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[60px] rounded-[10px] bg-blood-100" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function BloodPage() {
  const site = await getSite();
  return (
    <Suspense fallback={<BloodSkeleton />}>
      <BloodFinder paras={site.lists.para.map((p) => p.name)} phone={site.phone} />
    </Suspense>
  );
}
