/** Shapes returned by the Django REST API (backend/). Dates are ISO strings. */
import type { BloodGroup } from "./types";

export type ListKind = "para" | "noticeCat" | "eventCat" | "incomeCat" | "expenseCat" | "serviceCat" | "profession" | "position";
export type Role = "member" | "volunteer" | "cashier" | "admin";
export type Residence = "village" | "dhaka" | "district" | "abroad";

export const RESIDENCE_LABEL: Record<Residence, string> = { village: "গ্রামে", dhaka: "ঢাকায়", district: "অন্য জেলায়", abroad: "প্রবাসে" };

export interface Site {
  org_name: string;
  place: string;
  address: string;
  office: string;
  phone: string;
  bkash: string;
  nagad: string;
  treasurer_name: string;
  whatsapp_url: string;
  facebook_url: string;
  youtube_url: string;
  founded_year: number;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  hero_slides: { id: number; image: string; alt: string }[];
  logo: string;
  logo_dark: string;
  logo_icon: string;
  monthly_dues: number;
  stats: { members: number; donors: number; completed_events: number; families_helped: number };
  emergency: { id: number; title: string; phone: string }[];
  lists: Record<ListKind, { id: number; name: string }[]>;
}

export interface CommitteePerson {
  id: number;
  title: string;
  name: string;
  para: string;
  photo: string;
  phone: string | null;
  member_id: number | null;
}
export interface Committee {
  current: { id: number; name: string; members: CommitteePerson[] } | null;
  past: { id: number; name: string; members: CommitteePerson[] }[];
  advisors: CommitteePerson[];
}

export interface NoticeItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  published_at: string;
  preview: string;
  highlight: string;
  summary: string;
  is_pinned: boolean;
  is_urgent: boolean;
  members_only: boolean;
  image: string;
  author_label: string;
}
export interface NoticeDetail extends NoticeItem {
  body: string[];
  locked: boolean;
  image_alt: string;
  attachment: { url: string; name: string; size_kb: number; kind: "PDF" | "JPG" } | null;
}

export interface EventItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  status: "upcoming" | "completed";
  start_at: string;
  end_at: string | null;
  time_note: string;
  venue: string;
  cover: string;
  meta_note: string;
  going_count: number;
  volunteer_count: number;
  report: { beneficiaries: number | null; beneficiary_label: string; cost: number; volunteers: number | null; text: string } | null;
}
export interface EventDetail extends EventItem {
  description: string;
  photos: string[];
  my_rsvp: { going: boolean; is_volunteer: boolean };
}

export interface AlbumItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_memory: boolean;
  created_at: string;
  covers: string[];
  photo_count: number;
}
export interface AlbumDetail extends AlbumItem {
  photos: { id: number; src: string; caption: string; size_kb: number }[];
}
export interface VideoItem {
  id: number;
  title: string;
  youtube_url: string;
  thumbnail_url: string;
  duration_label: string;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  period: { from: string; to: string };
  months: { year: number; month: number; income: number; expense: number }[];
  expense_by_category: { name: string; amount: number }[];
}
export interface TransactionItem {
  id: string;
  kind: "income" | "expense";
  title: string;
  meta: string;
  date: string;
  amount: number;
  voucher: string | null;
}

export interface AidFund {
  id: string;
  type: string;
  title: string;
  description: string;
  applicant_name: string | null;
  raised: number;
  target: number;
  deadline: string | null;
  image: string;
}
export interface ServiceItem {
  id: number;
  category: string;
  name: string;
  para: string;
  phone: string;
}
export interface JobItem {
  id: number;
  kind: string;
  title: string;
  description: string;
  published_at: string;
}

export interface Me {
  id: number;
  member_no: string | null;
  name: string;
  father_name: string;
  phone: string;
  role: Role;
  photo: string;
  dob: string | null;
  para: string;
  para_id: number | null;
  residence: Residence;
  residence_label: string;
  country: string;
  profession: string;
  education: string;
  blood_group: BloodGroup | "";
  wants_to_donate: boolean;
  available: boolean;
  last_donation_date: string | null;
  show_phone: boolean;
  status: "pending" | "active" | "inactive";
  since: number;
  donor_ready: boolean;
}

export interface DirectoryMember {
  id: number;
  member_no: string;
  name: string;
  para: string;
  profession: string;
  blood_group: BloodGroup | "";
  residence: Residence;
  residence_label: string;
  country: string;
  phone: string | null;
  show_phone: boolean;
  photo: string;
  since: number;
}

export interface DonorsResult {
  blood_group: BloodGroup;
  total: number;
  ready: number;
  donors: { id: number; name: string; para: string; last_donation_date: string | null; ready: boolean; phone: string | null }[] | null;
}

export type DuesState = "paid" | "pending" | "due" | "future" | "na";
export interface MyDues {
  year: number;
  monthly_amount: number;
  months: { month: number; status: DuesState; rejected: boolean }[];
  history: { id: string; months: number[]; year: number; method: "bkash" | "nagad" | "cash"; amount: number; status: "pending" | "verified" | "rejected"; trx_id: string; created_at: string; verified_by: string | null }[];
}

export interface MyAidRequest {
  id: number;
  type: string;
  title: string;
  description: string;
  created_at: string;
  status: "pending" | "approved" | "rejected" | "done";
  note: string;
}
