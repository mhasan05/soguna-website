"use client";

import { RecordEditor } from "@/components/admin/crud";
import { PhotoManager, type Album } from "@/components/admin/res/gallery";
import type { AdminEvent } from "@/components/admin/res/events";
import { get } from "@/lib/api";
import { useQuery } from "@/lib/use-query";

export default function EditAlbum() {
  const events = useQuery("admin:events", () => get<AdminEvent[]>("/admin/events/"));
  return (
    <RecordEditor<Album>
      slug="gallery"
      base="/admin/albums/"
      backHref="/admin/gallery"
      noun="অ্যালবাম"
      titleOf={(a) => a.title}
      deleteWarn="অ্যালবামের সব ছবিও মুছে যাবে।"
      defaults={{ event: "", is_memory: false }}
      fromRecord={(a) => ({ event: a.event ? String(a.event) : "" })}
      toBody={(v) => ({ ...v, event: v.event ? Number(v.event) : null })}
      nextHref={(a, isNew) => (isNew ? `/admin/gallery/edit?id=${a.id}` : "/admin/gallery")}
      sections={[
        {
          title: "অ্যালবাম",
          description: "নতুন অ্যালবাম তৈরি করলে এই পাতাতেই ছবি আপলোড করতে পারবেন।",
          fields: [
            { name: "title", label: "নাম", required: "অ্যালবামের নাম লিখুন", placeholder: "যেমন: শীতবস্ত্র বিতরণ ২০২৬" },
            { name: "event", label: "কোন ইভেন্টের ছবি", type: "select", options: [{ value: "", label: "কোনো ইভেন্ট নয়" }, ...(events.data ?? []).map((e) => ({ value: String(e.id), label: e.title }))] },
            { name: "description", label: "বিবরণ", type: "textarea", rows: 3 },
            { name: "is_memory", label: "পুরনো স্মৃতি — গ্যালারির 'স্মৃতি' অংশে দেখাবে", type: "checkbox", wide: true },
          ],
        },
      ]}
    >
      {(album, reload) => <PhotoManager album={album} onChange={reload} />}
    </RecordEditor>
  );
}
