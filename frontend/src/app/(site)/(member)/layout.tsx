import { Suspense } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { MemberGate } from "./member-gate";

/** Every page in this group needs a logged-in member (E7 lock state otherwise). */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="wrap py-10">
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <MemberGate>{children}</MemberGate>
    </Suspense>
  );
}
