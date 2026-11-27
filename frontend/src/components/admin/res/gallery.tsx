"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Img } from "@/components/ui/primitives";
import { del, form, post } from "@/lib/api";
import { bn } from "@/lib/bn";
import { useAdmin } from "../store";
import { Panel } from "../widgets";

export interface Photo {
  id: number;
  src: string;
  caption: string;
  size_kb: number;
}
export interface Album {
  id: number;
  slug: string;
  title: string;
  description: string;
  event: number | null;
  is_memory: boolean;
  photos: Photo[];
}
export interface Video {
  id: number;
  title: string;
  youtube_url: string;
  thumbnail_url: string;
  duration_label: string;
}

export const thumb = (src: string, w = 300) => src.replace(/width=\d+/, `width=${w}`);

/** Bulk upload + delete photos of one album (edit page). */
export function PhotoManager({ album, onChange }: { album: Album; onChange: () => void }) {
  const { flash, fail, ask } = useAdmin();
  const [photos, setPhotos] = useState(album.photos);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    const ok = list.filter((f) => f.size <= 10 * 1024 * 1024);
    if (ok.length < list.length) fail(new Error(`${bn(list.length - ok.length)}টি ছবি ১০ MB-এর বেশি — বাদ দেওয়া হলো`));
    if (!ok.length) return;
    setUploading(ok.length);
    try {
      const added: Photo[] = [];
      for (let i = 0; i < ok.length; i += 4) {
        added.push(...(await post<Photo[]>(`/admin/albums/${album.id}/upload/`, form({ photos: ok.slice(i, i + 4) }))));
        setUploading(ok.length - added.length);
      }
      setPhotos((p) => [...p, ...added]);
      flash(`${bn(added.length)}টি ছবি "${album.title}" অ্যালবামে যোগ হয়েছে`);
      onChange();
    } catch (err) {
      fail(err);
    } finally {
      setUploading(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = (p: Photo) =>
    ask({
      text: "এই ছবি মুছে ফেলবেন?",
      warn: "ছবিটি অ্যালবাম থেকে স্থায়ীভাবে মুছে যাবে।",
      onYes: async () => {
        try {
          await del(`/admin/albums/${album.id}/photos/${p.id}/`);
          setPhotos((xs) => xs.filter((x) => x.id !== p.id));
          flash("ছবি মুছে ফেলা হয়েছে · অডিট লগে লেখা হলো");
        } catch (err) {
          fail(err);
        }
      },
    });

  return (
    <Panel className="flex flex-col gap-3 p-[clamp(16px,2vw,24px)]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="m-0 text-[19px] font-bold">ছবি</h2>
        <span className="text-[14px] text-muted">{bn(photos.length)}টি</span>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" aria-label="ছবি বাছুন" onChange={(e) => onFiles(e.target.files)} />
      <button
        type="button"
        disabled={uploading > 0}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
        className="flex min-h-[130px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50 text-[18px] font-semibold text-brand-dark hover:bg-brand-100 disabled:opacity-60"
      >
        <Upload className="size-7" aria-hidden />
        {uploading ? `আপলোড হচ্ছে… বাকি ${bn(uploading)}টি` : "একসাথে অনেক ছবি আপলোড করুন (টেনে এনেও দিতে পারেন)"}
        <span className="text-[15px] font-normal text-muted">ছবি নিজে থেকে ছোট (WebP) হয়ে যাবে · সর্বোচ্চ ১০ MB</span>
      </button>
      {photos.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(120px,30%),1fr))] gap-2">
          {photos.map((u) => (
            <div key={u.id} className="relative">
              <Img src={thumb(u.src)} alt={u.caption} className="aspect-square w-full rounded-[10px]" />
              {u.size_kb > 0 && <span className="absolute bottom-1.5 left-1.5 rounded-md bg-white/90 px-1.5 text-[12px]">{bn(u.size_kb)} KB</span>}
              <button type="button" aria-label="ছবি মুছুন" title="ছবি মুছুন" onClick={() => remove(u)} className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-blood">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="m-0 text-muted">এই অ্যালবামে এখনো ছবি নেই।</p>
      )}
    </Panel>
  );
}
