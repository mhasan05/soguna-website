import type { Metadata } from "next";
import { getSite } from "@/lib/server-api";
import { Directory } from "./directory";

export const metadata: Metadata = { title: "সদস্য তালিকা" };

export default async function MembersPage() {
  const site = await getSite();
  return <Directory paras={site.lists.para.map((p) => p.name)} professions={site.lists.profession.map((p) => p.name)} />;
}
