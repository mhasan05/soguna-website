import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { BackLink, Card, Img, Pill, Skeleton } from "@/components/ui/primitives";
import { ShareRow } from "@/components/site/share";
import { atLeastOne, getEvent, getEvents } from "@/lib/server-api";
import { bn, formatDate, money } from "@/lib/bn";
import { eventWhen } from "@/lib/format";
import { UpcomingPanel } from "./upcoming-panel";

export async function generateStaticParams() {
  return atLeastOne(
    (await getEvents()).map((e) => ({ id: e.slug })),
    { id: "__none__" },
  );
}

export async function generateMetadata({ params }: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  const e = await getEvent(decodeURIComponent(id));
  if (!e) return { title: "ইভেন্ট পাওয়া যায়নি" };
  return { title: e.title, description: e.description, openGraph: { title: e.title, description: e.description, images: e.cover ? [e.cover] : undefined } };
}

export default function EventDetailPage({ params }: PageProps<"/events/[id]">) {
  return (
    <Suspense
      fallback={
        <div aria-busy>
          <Skeleton className="h-[clamp(260px,30vw,380px)] w-full rounded-none bg-brand-dark/80" />
          <div className="mx-auto flex max-w-[1000px] flex-col gap-3 px-site py-8">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      }
    >
      <EventDetail params={params} />
    </Suspense>
  );
}

async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getEvent(decodeURIComponent(id));
  if (!e) notFound();
  const done = e.status === "completed";

  return (
    <>
      <section className="relative overflow-hidden bg-brand-dark text-white">
        {e.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.cover} alt={e.title} className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,83,45,.25),rgba(20,83,45,.92))]" />
        <div className="relative mx-auto max-w-[1000px] px-site pt-[clamp(100px,14vw,180px)] pb-[clamp(28px,4vw,44px)]">
          <BackLink href="/events" light>
            সব কার্যক্রম
          </BackLink>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {e.category && <Pill tone="white">{e.category}</Pill>}
            <Pill tone={done ? "greySolid" : "goldSolid"}>{done ? "সম্পন্ন" : "আসন্ন"}</Pill>
          </div>
          <h1 className="mt-2.5 mb-0 text-[clamp(28px,4vw,48px)] leading-[1.3] font-bold">{e.title}</h1>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1000px] flex-col gap-5 px-site pt-[clamp(20px,3vw,36px)] pb-page">
        <div className="grid-fit-260 gap-3">
          <Card className="flex gap-3 p-4 shadow-none">
            <CalendarDays className="size-6 flex-none text-brand" aria-hidden />
            <div>
              <div className="text-[15px] text-muted">তারিখ ও সময়</div>
              <div className="text-[18px] font-semibold">{done ? formatDate(e.start_at, { weekday: true }) : eventWhen(e)}</div>
            </div>
          </Card>
          <Card className="flex gap-3 p-4 shadow-none">
            <MapPin className="size-6 flex-none text-brand" aria-hidden />
            <div>
              <div className="text-[15px] text-muted">স্থান</div>
              <div className="text-[18px] font-semibold">{e.venue}</div>
            </div>
          </Card>
        </div>

        {!done && <UpcomingPanel slug={e.slug} start={e.start_at} going={e.going_count} volunteers={e.volunteer_count} />}

        {done && e.report && (
          <div className="flex flex-col gap-3.5">
            <h2 className="m-0 text-[clamp(22px,2.4vw,30px)] font-bold">কার্যক্রমের রিপোর্ট</h2>
            <div className="grid-fit-180 gap-3">
              {e.report.beneficiaries != null && (
                <Card className="p-4 shadow-none">
                  <div className="text-[32px] leading-[1.1] font-bold text-brand">{bn(e.report.beneficiaries)}</div>
                  <div className="text-muted">{e.report.beneficiary_label}</div>
                </Card>
              )}
              <Card className="p-4 shadow-none">
                <div className="text-[32px] leading-[1.1] font-bold text-gold-700">{money(e.report.cost)}</div>
                <div className="text-muted">মোট খরচ</div>
              </Card>
              {e.report.volunteers != null && (
                <Card className="p-4 shadow-none">
                  <div className="text-[32px] leading-[1.1] font-bold text-brand">{bn(e.report.volunteers)}</div>
                  <div className="text-muted">স্বেচ্ছাসেবক</div>
                </Card>
              )}
            </div>
            {e.report.text && <p className="m-0 text-[17px] text-body">{e.report.text}</p>}
            <Link href="/finance" className="inline-flex min-h-12 items-center self-start text-[17px] font-semibold hover:underline">
              খরচের পুরো হিসাব দেখুন →
            </Link>
          </div>
        )}

        {e.description && (
          <div>
            <h2 className="mt-0 mb-2 text-[clamp(22px,2.4vw,30px)] font-bold">বিবরণ</h2>
            <p className="m-0 text-[18px] leading-[1.75] whitespace-pre-line text-body-2">{e.description}</p>
          </div>
        )}

        {done && e.photos.length > 0 && (
          <div>
            <h2 className="mt-0 mb-3 text-[clamp(22px,2.4vw,30px)] font-bold">ছবি</h2>
            <div className="grid-fill-150 gap-2">
              {e.photos.map((p) => (
                <Img key={p} src={p.replace(/width=\d+/, "width=500")} alt="কার্যক্রমের ছবি" className="aspect-square w-full rounded-[10px]" />
              ))}
            </div>
          </div>
        )}

        <ShareRow title={e.title} path={`/events/${e.slug}`} primary={false} />
      </div>
    </>
  );
}
