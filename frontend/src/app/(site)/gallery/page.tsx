import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { Breadcrumb, Img } from "@/components/ui/primitives";
import { getAlbums, getVideos } from "@/lib/server-api";
import { cn } from "@/lib/cn";
import { bn } from "@/lib/bn";

export const metadata: Metadata = { title: "গ্যালারি" };

export default async function GalleryPage() {
  const [albums, videos] = await Promise.all([getAlbums(), getVideos()]);
  return (
    <div className="wrap pt-page pb-page">
      <Breadcrumb current="গ্যালারি" />
      <h1 className="mt-1 mb-[18px] text-h1">গ্যালারি</h1>
      <div className="grid-fit-280 gap-3.5">
        {albums.map((a) => (
          <Link
            key={a.id}
            href={`/gallery/${a.slug}`}
            className={cn("flex flex-col overflow-hidden rounded-xl border bg-white text-ink hover:border-brand-200 hover:no-underline", a.is_memory ? "border-gold-200" : "border-line")}
          >
            <div className="grid aspect-[16/10] w-full grid-cols-[2fr_1fr] grid-rows-2 gap-[3px]">
              <Img src={a.covers[0]} alt="" className="row-span-2 size-full" />
              <Img src={a.covers[1] ?? a.covers[0]} alt="" className="size-full" />
              <Img src={a.covers[2] ?? a.covers[0]} alt="" className="size-full" />
            </div>
            <div className="px-4 py-3.5">
              <div className="text-[19px] leading-[1.4] font-semibold">{a.title}</div>
              <div className="text-[15px] text-muted">
                {a.description}
                {a.photo_count > 0 && ` · ${bn(a.photo_count)}টি ছবি`}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {videos.length > 0 && <h2 className="mt-[clamp(36px,5vw,56px)] mb-3.5 text-[clamp(22px,2.4vw,30px)] font-bold">ভিডিও</h2>}
      <div className="grid-fit-380 gap-3.5">
        {videos.map((v) => (
          <a key={v.id} href={v.youtube_url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-line bg-white text-ink hover:border-brand-200 hover:no-underline">
            <div className="relative aspect-video bg-brand-dark">
              {v.thumbnail_url && <Img src={v.thumbnail_url} alt="" className="size-full opacity-75" />}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-[68px] items-center justify-center rounded-full bg-white/95 text-blood">
                  <Play className="ml-1 size-8 fill-current" aria-hidden />
                </span>
              </div>
            </div>
            <div className="px-4 py-3.5">
              <div className="text-[18px] font-semibold">{v.title}</div>
              <div className="text-[15px] text-muted">YouTube{v.duration_label && ` · ${v.duration_label}`}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
