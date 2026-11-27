import type { Metadata } from "next";
import { Suspense } from "react";
import { Img, Skeleton } from "@/components/ui/primitives";
import { photo } from "@/lib/content";
import { getSite } from "@/lib/server-api";
import { bn } from "@/lib/bn";
import { LoginFlow } from "./login-flow";

export const metadata: Metadata = { title: "লগইন" };

export default async function LoginPage() {
  const site = await getSite();
  return (
    <div className="wrap grid-fit-420 items-center gap-x-14 gap-y-8 py-[clamp(28px,5vw,64px)]">
      <div className="relative hidden min-h-[480px] overflow-hidden rounded-2xl nav:block">
        <Img src={photo("A_conversation_session_of_village_people.jpg", 1200)} alt="গ্রামের মানুষের আড্ডা" loading="eager" className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,83,45,0)_30%,rgba(20,83,45,.9))]" />
        <div className="absolute inset-x-7 bottom-7 text-white">
          <div className="text-[30px] leading-[1.3] font-bold">{bn(site.stats.members)} জন সদস্য, এক পরিবার</div>
          <div className="mt-1 text-[18px] opacity-95">লগইন করে রক্তদাতার তালিকা, চাঁদার হিসাব আর সদস্য কার্ড দেখুন।</div>
        </div>
      </div>
      <div className="w-full max-w-[480px] justify-self-center rounded-2xl border border-line bg-white p-[clamp(22px,3vw,36px)]">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <LoginFlow />
        </Suspense>
      </div>
    </div>
  );
}
