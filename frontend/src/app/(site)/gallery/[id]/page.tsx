import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ImageIcon } from "lucide-react";
import { BackLink, EmptyState, Skeleton } from "@/components/ui/primitives";
import { atLeastOne, getAlbum, getAlbums } from "@/lib/server-api";
import { AlbumGrid } from "./album-grid";

export async function generateStaticParams() {
  return atLeastOne(
    (await getAlbums()).map((a) => ({ id: a.slug })),
    { id: "__none__" },
  );
}

export async function generateMetadata({ params }: PageProps<"/gallery/[id]">): Promise<Metadata> {
  const { id } = await params;
  const a = await getAlbum(decodeURIComponent(id));
  return { title: a ? a.title : "অ্যালবাম পাওয়া যায়নি" };
}

export default function AlbumPage({ params }: PageProps<"/gallery/[id]">) {
  return (
    <div className="wrap pt-page pb-page">
      <BackLink href="/gallery" className="min-h-12 text-[17px]">
        সব অ্যালবাম
      </BackLink>
      <Suspense fallback={<Skeleton className="mt-4 h-64 w-full" />}>
        <Album params={params} />
      </Suspense>
    </div>
  );
}

async function Album({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = await getAlbum(decodeURIComponent(id));
  if (!album) notFound();
  return (
    <>
      <h1 className="mt-1 mb-0.5 text-[clamp(26px,3.2vw,38px)] leading-[1.3] font-bold">{album.title}</h1>
      <p className="mt-0 mb-[18px] text-[16px] text-muted">{album.description}</p>
      {album.photos.length ? (
        <AlbumGrid title={album.title} photos={album.photos} />
      ) : (
        <EmptyState icon={<ImageIcon className="size-7" aria-hidden />} title="এই অ্যালবামে এখনো ছবি তোলা হয়নি" sub="ইভেন্টের পর স্বেচ্ছাসেবকেরা ছবি যোগ করবেন।" />
      )}
    </>
  );
}
