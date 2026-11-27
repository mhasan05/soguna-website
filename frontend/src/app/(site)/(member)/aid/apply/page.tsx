import type { Metadata } from "next";
import { AidApplyForm } from "./aid-apply-form";

export const metadata: Metadata = { title: "সাহায্যের আবেদন" };

export default function AidApplyPage() {
  return <AidApplyForm />;
}
