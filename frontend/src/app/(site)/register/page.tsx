import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { getSite } from "@/lib/server-api";
import { RegisterFlow } from "./register-flow";

export const metadata: Metadata = { title: "সদস্য নিবন্ধন" };

export default async function RegisterPage() {
  const site = await getSite();
  return (
    <div className="mx-auto max-w-[640px] px-site pt-[clamp(24px,4vw,48px)] pb-page">
      <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-2xl" />}>
        <RegisterFlow paras={site.lists.para.map((p) => p.name)} professions={site.lists.profession.map((p) => p.name)} phone={site.phone} />
      </Suspense>
    </div>
  );
}
