"use client";

import { Download } from "lucide-react";
import { Img, Skeleton } from "@/components/ui/primitives";
import { MembersOnly } from "@/components/site/members-only";
import { api } from "@/lib/api";
import type { NoticeDetail } from "@/lib/api-types";
import { bn } from "@/lib/bn";
import { useSession } from "@/lib/session";
import { useQuery } from "@/lib/use-query";

export function NoticeBody({ notice: n }: { notice: NoticeDetail }) {
  return (
    <>
      {n.image && <Img src={n.image} alt={n.image_alt || n.title} loading="eager" className="aspect-video w-full rounded-xl" />}
      <div className="mt-5 flex flex-col gap-3.5 text-[18px] leading-[1.75] text-body-2">
        {n.body.map((p, i) => (
          <p key={i} className="m-0 whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
      {n.attachment && (
        <a href={n.attachment.url} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-3.5 rounded-xl border border-line bg-white px-4 py-3.5 text-ink hover:border-brand-200 hover:no-underline">
          <span className="flex size-12 flex-none items-center justify-center rounded-[10px] bg-blood-50 font-mono text-[13px] font-bold text-blood-700">{n.attachment.kind}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">{n.attachment.name}</span>
            <span className="block text-[15px] text-muted">{bn(n.attachment.size_kb)} KB · চাপলে খুলবে</span>
          </span>
          <Download className="size-[22px] text-brand" aria-hidden />
        </a>
      )}
    </>
  );
}

/** Members-only notice: the cached page never contains the body; fetch it with the member's token. */
export function PrivateNoticeBody({ slug }: { slug: string }) {
  return (
    <MembersOnly>
      <Loader slug={slug} />
    </MembersOnly>
  );
}

function Loader({ slug }: { slug: string }) {
  const { session } = useSession();
  const { data, error } = useQuery(`notice:${slug}:${session?.memberId}`, () => api.notice(slug));
  if (error) return <p className="text-[17px] text-blood-700">{error}</p>;
  if (!data) return <Skeleton className="h-40 w-full" />;
  return <NoticeBody notice={data} />;
}
