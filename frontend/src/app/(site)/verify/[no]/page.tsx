import type { Metadata } from "next";
import { Suspense } from "react";
import { Check, X } from "lucide-react";
import { Avatar, Skeleton } from "@/components/ui/primitives";
import { ORG_NAME } from "@/lib/content";
import { getVerify } from "@/lib/server-api";
import { avatarInitials } from "@/lib/bn";
import { VerifiedAt } from "./verified-at";

export const metadata: Metadata = { title: "সদস্য যাচাই", robots: { index: false } };

/** Any member number can be verified; one placeholder satisfies Cache Components' build check. */
export function generateStaticParams() {
  return [{ no: "SAJS-0001" }];
}

export default function VerifyPage({ params }: PageProps<"/verify/[no]">) {
  return (
    <div className="mx-auto max-w-[520px] px-site py-[clamp(28px,5vw,64px)]">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <Verify params={params} />
      </Suspense>
    </div>
  );
}

async function Verify({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  const memberNo = decodeURIComponent(no).toUpperCase();
  const r = await getVerify(memberNo);

  if (!r.valid || !r.name) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-blood-200 bg-white px-[22px] py-7 text-center">
        <span className="flex size-[84px] items-center justify-center rounded-full bg-blood-50 text-blood">
          <X className="size-10" aria-hidden />
        </span>
        <h1 className="m-0 text-[26px] leading-[1.3] font-bold">যাচাই করা যায়নি</h1>
        <p className="m-0 text-[18px]">
          <span className="font-mono">{memberNo}</span> নম্বরে {ORG_NAME}-এর কোনো সক্রিয় সদস্য পাওয়া যায়নি।
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-[22px] py-7 text-center">
      <span className="flex size-[84px] items-center justify-center rounded-full bg-success text-brand">
        <Check className="size-10" aria-hidden />
      </span>
      <div className="text-[15px] text-muted">যাচাই সম্পন্ন · {r.member_no}</div>
      <Avatar label={avatarInitials(r.name)} size={80} />
      <h1 className="m-0 text-[26px] leading-[1.3] font-bold">{r.name}</h1>
      <p className="m-0 text-[19px]">
        এই ব্যক্তি <strong className="text-brand">{ORG_NAME}ের সক্রিয় সদস্য</strong>।
      </p>
      <VerifiedAt />
    </div>
  );
}
