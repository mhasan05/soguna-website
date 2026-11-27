import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { BackLink, CategoryPill, Skeleton } from "@/components/ui/primitives";
import { ShareRow } from "@/components/site/share";
import { atLeastOne, getNotice, getNotices } from "@/lib/server-api";
import { formatDate } from "@/lib/bn";
import { NoticeBody, PrivateNoticeBody } from "./notice-body";

export async function generateStaticParams() {
  const list = await getNotices();
  return atLeastOne(
    list.map((n) => ({ id: n.slug })),
    { id: "__none__" },
  );
}

export async function generateMetadata({ params }: PageProps<"/notices/[id]">): Promise<Metadata> {
  const { id } = await params;
  const n = await getNotice(decodeURIComponent(id));
  if (!n) return { title: "নোটিশ পাওয়া যায়নি" };
  const description = n.members_only ? "সদস্য-কেবল নোটিশ" : n.preview;
  return { title: n.title, description, openGraph: { title: n.title, description, images: n.image ? [n.image] : undefined, type: "article" } };
}

export default function NoticeDetailPage({ params }: PageProps<"/notices/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-[800px] flex-col gap-3 px-site pt-8 pb-16" aria-busy>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-10 w-4/5 bg-line" />
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-5 w-full" />
        </div>
      }
    >
      <NoticeDetail params={params} />
    </Suspense>
  );
}

async function NoticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [n, all] = await Promise.all([getNotice(decodeURIComponent(id)), getNotices()]);
  if (!n) notFound();
  const more = all.filter((x) => x.slug !== n.slug && !x.members_only).slice(0, 2);

  return (
    <>
      <article className="mx-auto max-w-[800px] px-site pt-[clamp(20px,3vw,40px)]">
        <BackLink href="/notices" className="min-h-12 text-[17px]">
          সব নোটিশ
        </BackLink>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <CategoryPill category={n.category} />
          <span className="text-[15px] text-muted">
            {formatDate(n.published_at)}
            {n.author_label && ` · প্রকাশ করেছেন ${n.author_label}`}
          </span>
        </div>
        <h1 className="mt-2.5 mb-4 text-[clamp(26px,3.2vw,38px)] leading-[1.35] font-bold">{n.title}</h1>
        {n.locked ? <PrivateNoticeBody slug={n.slug} /> : <NoticeBody notice={n} />}
        <div className="mt-6 border-t border-line pt-5">
          <div className="mb-2.5 text-[17px] font-semibold">শেয়ার করুন</div>
          <ShareRow title={n.title} path={`/notices/${n.slug}`} />
        </div>
      </article>
      {more.length > 0 && (
        <section className="mx-auto max-w-[800px] px-site py-[clamp(36px,5vw,56px)]">
          <h2 className="mt-0 mb-3.5 text-h2-sm">আরও নোটিশ</h2>
          <div className="flex flex-col gap-2.5">
            {more.map((m) => (
              <Link key={m.slug} href={`/notices/${m.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-ink hover:border-brand-200 hover:no-underline">
                <div>
                  <div className="text-[15px] text-muted">
                    {m.category} · {formatDate(m.published_at)}
                  </div>
                  <div className="text-[18px] font-semibold">{m.title}</div>
                </div>
                <ChevronRight className="size-[22px] flex-none text-muted" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
