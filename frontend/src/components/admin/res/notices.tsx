import { MessageCircle } from "lucide-react";
import { whatsappShareUrl } from "@/components/site/share";
import { Pill } from "@/components/ui/primitives";
import { formatDate } from "@/lib/bn";
import { LongText, type PreviewData } from "../crud";

export interface AdminNotice {
  id: number;
  slug: string;
  title: string;
  category: string;
  body: string;
  highlight: string;
  summary: string;
  image_src: string;
  attachment_url: string;
  attachment_name: string;
  visibility: "public" | "members";
  is_urgent: boolean;
  is_pinned: boolean;
  status: "draft" | "pending" | "published";
  author_label: string;
  published_at: string;
  created_by_name: string | null;
}

export const NOTICE_STATUS = { published: "প্রকাশিত", pending: "অনুমোদনের অপেক্ষায়", draft: "খসড়া" } as const;

export function NoticeStatus({ n }: { n: AdminNotice }) {
  return (
    <Pill tone={n.status === "published" ? "success" : n.status === "pending" ? "gold" : "neutral"} className="px-2.5 text-[14px]">
      {NOTICE_STATUS[n.status]}
    </Pill>
  );
}

export function noticePreview(n: AdminNotice): PreviewData {
  return {
    title: n.title,
    subtitle: `${n.category} · ${formatDate(n.published_at)}`,
    image: n.image_src || null,
    badges: (
      <>
        <NoticeStatus n={n} />
        <Pill tone={n.visibility === "members" ? "gold" : "green"} className="px-2.5 text-[14px]">
          {n.visibility === "members" ? "সদস্য-কেবল" : "পাবলিক"}
        </Pill>
        {n.is_urgent && (
          <Pill tone="redSolid" className="px-2.5 text-[14px]">
            জরুরি · পিন করা
          </Pill>
        )}
      </>
    ),
    sections: [
      { title: "নোটিশের লেখা", content: <LongText text={n.body} /> },
      {
        title: "তথ্য",
        rows: [
          ["ক্যাটাগরি", n.category],
          ["হাইলাইট", n.highlight],
          ["সারাংশ", n.summary],
          ["লেখক", n.created_by_name ?? n.author_label],
          ["তারিখ", formatDate(n.published_at)],
          ["সংযুক্তি", n.attachment_url ? <a key="a" href={n.attachment_url} target="_blank" rel="noreferrer">{n.attachment_name || "ফাইল দেখুন"} ↗</a> : ""],
        ],
      },
      ...(n.status === "published"
        ? [
            {
              title: "শেয়ার",
              content: (
                <div className="flex flex-wrap gap-2">
                  <a href={whatsappShareUrl(n.title, `/notices/${n.slug}`)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-4 font-semibold text-white hover:no-underline">
                    <MessageCircle className="size-5" aria-hidden />
                    WhatsApp-এ শেয়ার
                  </a>
                  <a href={`/notices/${n.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center px-2 font-semibold">
                    সাইটে দেখুন ↗
                  </a>
                </div>
              ),
            },
          ]
        : []),
    ],
  };
}
