import type { Metadata } from "next";
import { getNotices, getSite } from "@/lib/server-api";
import { NoticeBoard } from "./notice-board";

export const metadata: Metadata = { title: "নোটিশ বোর্ড" };

export default async function NoticesPage() {
  const [notices, site] = await Promise.all([getNotices(), getSite()]);
  return <NoticeBoard notices={notices} categories={site.lists.noticeCat.map((c) => c.name)} />;
}
