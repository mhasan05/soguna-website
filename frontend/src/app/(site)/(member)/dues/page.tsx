import type { Metadata } from "next";
import { DuesView } from "./dues-view";

export const metadata: Metadata = { title: "আমার চাঁদা" };

export default function DuesPage() {
  return <DuesView />;
}
