"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";

/** E9 — server / unexpected error. */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-3 px-site py-[clamp(48px,8vw,96px)] text-center">
      <span className="flex size-[68px] items-center justify-center rounded-full bg-gold-50 text-gold-700">
        <AlertTriangle className="size-8" aria-hidden />
      </span>
      <h1 className="m-0 text-[clamp(24px,3vw,32px)] font-bold">কিছু একটা সমস্যা হয়েছে</h1>
      <p className="m-0 text-[17px] text-muted">আমাদের দিকে সমস্যা, আপনার কিছু করার দরকার নেই। একটু পর আবার চেষ্টা করুন।</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <Button onClick={() => retry()}>আবার চেষ্টা করুন</Button>
        <LinkButton href="/" variant="outline">
          হোমে যান
        </LinkButton>
      </div>
    </div>
  );
}
