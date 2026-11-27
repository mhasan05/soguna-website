import { Paperclip } from "lucide-react";
import { Pill, type PillTone } from "@/components/ui/primitives";
import { formatDate, formatPhone, money } from "@/lib/bn";
import { LongText, type PreviewData } from "../crud";

export type AidStatus = "pending" | "approved" | "rejected" | "done";
export const AID_STATUS: Record<AidStatus, { label: string; tone: PillTone }> = {
  pending: { label: "অপেক্ষমাণ", tone: "gold" },
  approved: { label: "অনুমোদিত · তহবিল চালু", tone: "success" },
  rejected: { label: "বাতিল", tone: "neutral" },
  done: { label: "সম্পন্ন", tone: "done" },
};

export interface Aid {
  id: number;
  type_label: string;
  applicant_name: string;
  applicant_phone: string | null;
  beneficiary: string;
  description: string;
  amount_needed: number;
  target_amount: number | null;
  target_date: string | null;
  status: AidStatus;
  show_name_public: boolean;
  public_title: string;
  public_description: string;
  note: string;
  documents: { name: string; url: string; size_kb: number }[];
  raised: number;
  image_src: string;
  created_at: string;
}

export function AidStatusPill({ a }: { a: Aid }) {
  return (
    <Pill tone={AID_STATUS[a.status].tone} className="px-2.5 text-[14px]">
      {AID_STATUS[a.status].label}
    </Pill>
  );
}

export function aidPreview(a: Aid): PreviewData {
  return {
    title: a.public_title || `${a.type_label} সহায়তা`,
    subtitle: `${a.type_label} · ${formatDate(a.created_at)}`,
    image: a.image_src || null,
    badges: <AidStatusPill a={a} />,
    sections: [
      {
        title: "আবেদন",
        rows: [
          ["ধরন", a.type_label],
          ["কার জন্য", a.beneficiary],
          ["চাওয়া হয়েছে", money(a.amount_needed)],
          ["আবেদনকারী", a.applicant_name],
          ["ফোন", a.applicant_phone ? <a key="t" href={`tel:${a.applicant_phone}`}>{formatPhone(a.applicant_phone)}</a> : ""],
          ["তারিখ", formatDate(a.created_at)],
        ],
      },
      { title: "বিস্তারিত (গোপন — শুধু অ্যাডমিন দেখেন)", content: <LongText text={a.description} /> },
      {
        title: "কাগজপত্র",
        content: a.documents.length ? (
          <div className="flex flex-wrap gap-2">
            {a.documents.map((d) => (
              <a key={d.url} href={d.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-pill px-3 text-[15px] text-body hover:no-underline">
                <Paperclip className="size-4" aria-hidden />
                {d.name}
              </a>
            ))}
          </div>
        ) : (
          <span className="text-muted">কোনো কাগজপত্র দেওয়া হয়নি</span>
        ),
      },
      {
        title: "পাবলিক তহবিল",
        rows: [
          ["পাবলিক শিরোনাম", a.public_title],
          ["পাবলিক বিবরণ", a.public_description],
          ["লক্ষ্য", a.target_amount ? money(a.target_amount) : ""],
          ["উঠেছে", a.status !== "pending" ? money(a.raised) : ""],
          ["শেষ তারিখ", a.target_date ? formatDate(a.target_date) : ""],
          ["নাম দেখাবে", a.show_name_public ? "হ্যাঁ" : "না — গোপন"],
          ["নোট", a.note],
        ],
      },
    ],
  };
}
