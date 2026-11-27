import { Pill } from "@/components/ui/primitives";
import type { Role } from "@/lib/api-types";
import { formatDate, formatPhone } from "@/lib/bn";
import { BLOOD_GROUPS } from "@/lib/types";
import type { PreviewData } from "../crud";

export interface AdminMember {
  id: number;
  member_no: string | null;
  name: string;
  father_name: string;
  phone: string;
  role: Role;
  para: string;
  para_id: number | null;
  profession: string;
  blood_group: string;
  residence: "village" | "dhaka" | "district" | "abroad";
  residence_label: string;
  country: string;
  status: "pending" | "active" | "inactive" | "rejected";
  joined_at: string;
}

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "member", label: "সদস্য" },
  { value: "volunteer", label: "স্বেচ্ছাসেবক" },
  { value: "cashier", label: "ক্যাশিয়ার" },
  { value: "admin", label: "অ্যাডমিন" },
];
export const roleLabel = (r: Role) => ROLE_OPTIONS.find((x) => x.value === r)?.label ?? r;

export const STATUS_OPTIONS = [
  { value: "active", label: "সক্রিয়" },
  { value: "inactive", label: "নিষ্ক্রিয়" },
  { value: "pending", label: "অপেক্ষমাণ" },
  { value: "rejected", label: "বাতিল" },
];
export const RESIDENCE_OPTIONS = [
  { value: "village", label: "গ্রামে" },
  { value: "dhaka", label: "ঢাকায়" },
  { value: "district", label: "অন্য জেলায়" },
  { value: "abroad", label: "প্রবাসে" },
];
export const BLOOD_OPTIONS = [{ value: "", label: "— জানা নেই —" }, ...BLOOD_GROUPS.map((g) => ({ value: g, label: g }))];

export function MemberStatus({ status }: { status: AdminMember["status"] }) {
  const tone = status === "active" ? "success" : status === "pending" ? "gold" : "neutral";
  return (
    <Pill tone={tone} className="px-2.5 text-[14px] font-semibold">
      {STATUS_OPTIONS.find((s) => s.value === status)?.label}
    </Pill>
  );
}

export function memberPreview(m: AdminMember): PreviewData {
  return {
    title: m.name,
    subtitle: m.member_no ? `সদস্য নম্বর ${m.member_no}` : "নম্বর এখনো দেওয়া হয়নি",
    badges: (
      <>
        <MemberStatus status={m.status} />
        <Pill tone="green" className="px-2.5 text-[14px]">
          {roleLabel(m.role)}
        </Pill>
        {m.blood_group && (
          <Pill tone="red" className="px-2.5 text-[14px]">
            রক্ত {m.blood_group}
          </Pill>
        )}
      </>
    ),
    sections: [
      {
        title: "ব্যক্তিগত তথ্য",
        rows: [
          ["নাম", m.name],
          ["পিতার নাম", m.father_name],
          ["ফোন", <a key="p" href={`tel:${m.phone}`}>{formatPhone(m.phone)}</a>],
          ["রক্তের গ্রুপ", m.blood_group],
          ["পেশা", m.profession],
        ],
      },
      {
        title: "ঠিকানা",
        rows: [
          ["পাড়া", m.para],
          ["বর্তমানে থাকেন", m.residence_label],
          ["দেশ", m.country],
        ],
      },
      {
        title: "সদস্যপদ",
        rows: [
          ["সদস্য নম্বর", m.member_no ?? "—"],
          ["রোল", roleLabel(m.role)],
          ["অবস্থা", STATUS_OPTIONS.find((s) => s.value === m.status)?.label],
          ["যোগদান", formatDate(m.joined_at)],
        ],
      },
    ],
  };
}
