"use client";

import { Cell, DataTable, PreviewDrawer, Toolbar, usePreview } from "@/components/admin/crud";
import { AdminPage } from "@/components/admin/widgets";
import { useResource } from "@/components/admin/store";
import { thumb, type Album, type Video } from "@/components/admin/res/gallery";
import { LinkButton } from "@/components/ui/button";
import { Img } from "@/components/ui/primitives";
import { bn } from "@/lib/bn";

export default function AdminGallery() {
  const albums = useResource<Album>("/admin/albums/");
  const videos = useResource<Video>("/admin/videos/");
  const pa = usePreview<Album>();
  const pv = usePreview<Video>();
  const a = pa.item;
  const v = pv.item;
  const albumHref = (x: Album) => `/admin/gallery/edit?id=${x.id}`;
  const videoHref = (x: Video) => `/admin/gallery/video?id=${x.id}`;
  const removeAlbum = (x: Album) => {
    pa.close();
    albums.remove(x, x.title, "অ্যালবামের সব ছবিও মুছে যাবে।");
  };
  const removeVideo = (x: Video) => {
    pv.close();
    videos.remove(x, x.title);
  };

  return (
    <AdminPage slug="gallery">
      <Toolbar addHref="/admin/gallery/edit" addLabel="নতুন অ্যালবাম">
        <LinkButton href="/admin/gallery/video" variant="outline" className="text-[16px]">
          + ভিডিও যোগ
        </LinkButton>
      </Toolbar>
      <DataTable
        title="অ্যালবাম"
        count={albums.items?.length}
        rows={albums.items}
        loading={albums.loading}
        error={albums.error}
        empty="কোনো অ্যালবাম নেই।"
        onPreview={pa.open}
        editHref={albumHref}
        onDelete={removeAlbum}
        columns={[
          { label: "অ্যালবাম", render: (x) => <Cell image={x.photos[0] ? thumb(x.photos[0].src, 200) : null} main={x.title} sub={x.description} /> },
          { label: "ছবি", render: (x) => `${bn(x.photos.length)}টি` },
          { label: "ধরন", render: (x) => (x.is_memory ? "পুরনো স্মৃতি" : x.event ? "ইভেন্টের ছবি" : "সাধারণ"), hideOnMobile: true },
        ]}
      />
      <DataTable
        title="ভিডিও"
        count={videos.items?.length}
        rows={videos.items}
        loading={videos.loading}
        empty="কোনো ভিডিও নেই।"
        onPreview={pv.open}
        editHref={videoHref}
        onDelete={removeVideo}
        columns={[
          { label: "ভিডিও", render: (x) => <Cell image={x.thumbnail_url || null} main={x.title} sub={x.duration_label} /> },
          { label: "লিংক", render: (x) => <a href={x.youtube_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="break-all">{x.youtube_url}</a>, hideOnMobile: true },
        ]}
      />
      <PreviewDrawer
        data={
          a
            ? {
                title: a.title,
                subtitle: `${bn(a.photos.length)}টি ছবি`,
                sections: [
                  { title: "তথ্য", rows: [["নাম", a.title], ["বিবরণ", a.description], ["ধরন", a.is_memory ? "পুরনো স্মৃতি" : a.event ? "ইভেন্টের ছবি" : "সাধারণ"]] },
                  {
                    title: "ছবি",
                    content: a.photos.length ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {a.photos.map((p) => (
                          <Img key={p.id} src={thumb(p.src, 240)} alt={p.caption} className="aspect-square w-full rounded-md" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">এখনো ছবি নেই — এডিট পাতা থেকে আপলোড করুন।</span>
                    ),
                  },
                ],
              }
            : null
        }
        onClose={pa.close}
        editHref={a ? albumHref(a) : null}
        onDelete={a ? () => removeAlbum(a) : undefined}
      />
      <PreviewDrawer
        data={v ? { title: v.title, image: v.thumbnail_url || null, sections: [{ title: "তথ্য", rows: [["নাম", v.title], ["দৈর্ঘ্য", v.duration_label], ["লিংক", <a key="l" href={v.youtube_url} target="_blank" rel="noreferrer" className="break-all">{v.youtube_url}</a>]] }] } : null}
        onClose={pv.close}
        editHref={v ? videoHref(v) : null}
        onDelete={v ? () => removeVideo(v) : undefined}
      />
    </AdminPage>
  );
}
