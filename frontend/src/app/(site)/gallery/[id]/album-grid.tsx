"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Img } from "@/components/ui/primitives";
import { bn } from "@/lib/bn";

type Photo = { id: number; src: string; caption: string };
const sized = (src: string, w: number) => src.replace(/width=\d+/, `width=${w}`);

export function AlbumGrid({ title, photos }: { title: string; photos: Photo[] }) {
  const [index, setIndex] = useState(-1);
  const n = photos.length;
  const open = index >= 0;

  // Close the viewer when this page is hidden by a navigation (Activity).
  useLayoutEffect(() => () => setIndex(-1), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(-1);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % n);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + n) % n);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, n]);

  const caption = (i: number) => photos[i]?.caption || `${title} — ${bn(i + 1)}`;

  return (
    <>
      <div className="grid-fill-160 gap-2">
        {photos.map((p, i) => (
          <button key={p.id} type="button" onClick={() => setIndex(i)} aria-label={`ছবি ${bn(i + 1)} বড় করে দেখুন`} className="aspect-square overflow-hidden rounded-[10px] bg-photo">
            <Img src={sized(p.src, 400)} alt={caption(i)} className="size-full transition-transform hover:scale-[1.03]" />
          </button>
        ))}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="ছবি দেখুন" className="fixed inset-0 z-50 flex flex-col bg-ink text-white">
          <div className="flex items-center justify-between py-2 pr-2 pl-4">
            <span className="text-[16px]">
              {bn(index + 1)} / {bn(n)}
            </span>
            <button type="button" onClick={() => setIndex(-1)} aria-label="বন্ধ করুন" className="flex size-12 items-center justify-center rounded-[10px] bg-white/12">
              <X className="size-7" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0C0A09]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sized(photos[index].src, 1600)} alt={caption(index)} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex items-center justify-between gap-3 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setIndex((i) => (i - 1 + n) % n)} aria-label="আগের ছবি" className="flex size-14 flex-none items-center justify-center rounded-xl bg-white/12">
              <ChevronLeft className="size-7" aria-hidden />
            </button>
            <span className="text-center text-[17px]">{caption(index)}</span>
            <button type="button" onClick={() => setIndex((i) => (i + 1) % n)} aria-label="পরের ছবি" className="flex size-14 flex-none items-center justify-center rounded-xl bg-white/12">
              <ChevronRight className="size-7" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
