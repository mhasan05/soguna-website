import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb, ListSkeleton } from "@/components/ui/primitives";
import { getEvents } from "@/lib/server-api";
import { EventsTabs } from "./events-tabs";

export const metadata: Metadata = { title: "কার্যক্রম ও ইভেন্ট" };

export default async function EventsPage() {
  const [upcoming, done] = await Promise.all([getEvents("upcoming"), getEvents("completed")]);
  return (
    <>
      <section className="wrap pt-page">
        <Breadcrumb current="কার্যক্রম" />
        <h1 className="mt-1 mb-4 text-h1">কার্যক্রম ও ইভেন্ট</h1>
      </section>
      <Suspense
        fallback={
          <div className="wrap pb-page">
            <ListSkeleton count={4} min={340} />
          </div>
        }
      >
        <EventsTabs upcoming={upcoming} done={done} />
      </Suspense>
    </>
  );
}
