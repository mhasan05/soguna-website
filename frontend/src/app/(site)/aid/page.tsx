import type { Metadata } from "next";
import { getAidFunds, getJobs, getServices, getSite } from "@/lib/server-api";
import { Breadcrumb } from "@/components/ui/primitives";
import { AidTabs } from "./aid-tabs";

export const metadata: Metadata = { title: "সাহায্য তহবিল ও গ্রামের সেবা" };

export default async function AidPage() {
  const [funds, services, jobs, site] = await Promise.all([getAidFunds(), getServices(), getJobs(), getSite()]);
  return (
    <div className="wrap pt-page pb-page">
      <Breadcrumb current="সাহায্য ও সেবা" />
      <h1 className="mt-1 mb-4 text-h1">সাহায্য তহবিল ও গ্রামের সেবা</h1>
      <AidTabs funds={funds} services={services} categories={site.lists.serviceCat.map((c) => c.name)} jobs={jobs} />
    </div>
  );
}
