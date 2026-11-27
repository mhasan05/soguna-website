"use client";

import { RecordEditor } from "@/components/admin/crud";
import type { Video } from "@/components/admin/res/gallery";

export default function EditVideo() {
  return (
    <RecordEditor<Video>
      slug="gallery"
      base="/admin/videos/"
      backHref="/admin/gallery"
      noun="ভিডিও"
      titleOf={(v) => v.title}
      sections={[
        {
          title: "YouTube ভিডিও",
          fields: [
            { name: "title", label: "ভিডিওর নাম", required: "নাম লিখুন", wide: true },
            { name: "youtube_url", label: "YouTube লিংক", required: "YouTube লিংক দিন", placeholder: "https://youtube.com/watch?v=...", wide: true },
            { name: "duration_label", label: "দৈর্ঘ্য", placeholder: "যেমন: ৩:২০" },
          ],
        },
      ]}
    />
  );
}
