"use client";

import type { ReactNode } from "react";
import { LoginRequired, MembersOnly } from "@/components/site/members-only";

export function MemberGate({ children }: { children: ReactNode }) {
  return (
    <MembersOnly
      fallback={
        <div className="wrap py-[clamp(28px,5vw,64px)]">
          <LoginRequired />
        </div>
      }
    >
      {children}
    </MembersOnly>
  );
}
