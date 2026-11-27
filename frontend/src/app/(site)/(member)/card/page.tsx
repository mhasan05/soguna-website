import type { Metadata } from "next";
import { MemberCardView } from "./member-card";

export const metadata: Metadata = { title: "আমার সদস্য কার্ড" };

export default function CardPage() {
  return <MemberCardView />;
}
