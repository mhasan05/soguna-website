"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, ToggleRow } from "@/components/ui/form";
import { BackLink } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { EDUCATION } from "@/lib/content";
import { BLOOD_GROUPS } from "@/lib/types";
import { RESIDENCE_LABEL, type Me, type Residence, type Site } from "@/lib/api-types";
import { avatarInitials, bn, formatDate, formatPhone } from "@/lib/bn";
import { ApiError, api, errorMessage } from "@/lib/api";
import { logout, setMe, useSession } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/cn";

type Draft = Pick<Me, "name" | "father_name" | "dob" | "para_id" | "residence" | "country" | "profession" | "education" | "blood_group" | "wants_to_donate" | "last_donation_date">;
type Row = { key: keyof Draft | "phone"; label: string; display: string; locked?: boolean; options?: { value: string; label: string }[]; type?: string };

const draftOf = (m: Me): Draft => ({
  name: m.name,
  father_name: m.father_name,
  dob: m.dob,
  para_id: m.para_id,
  residence: m.residence,
  country: m.country,
  profession: m.profession,
  education: m.education,
  blood_group: m.blood_group,
  wants_to_donate: m.wants_to_donate,
  last_donation_date: m.last_donation_date,
});

export function ProfileView() {
  const { session } = useSession();
  const me = session?.me;
  return me ? <ProfileInner key={me.id} me={me} /> : null;
}

function ProfileInner({ me }: { me: Me }) {
  const router = useRouter();
  const toast = useToast();
  const site = useQuery<Site>("site", () => api.site());
  const [draft, setDraft] = useState<Draft>(() => draftOf(me));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const paras = site.data?.lists.para ?? [];
  const professions = site.data?.lists.profession ?? [];
  const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "মৌলিক তথ্য",
      rows: [
        { key: "name", label: "নাম", display: me.name },
        { key: "father_name", label: "বাবার নাম", display: me.father_name },
        { key: "phone", label: "ফোন", display: formatPhone(me.phone), locked: true },
        { key: "dob", label: "জন্ম তারিখ", display: me.dob ? formatDate(me.dob) : "—", type: "date" },
      ],
    },
    {
      title: "ঠিকানা ও পেশা",
      rows: [
        { key: "para_id", label: "পাড়া", display: me.para, options: paras.map((p) => ({ value: String(p.id), label: p.name })) },
        { key: "residence", label: "বর্তমানে থাকেন", display: me.residence_label + (me.country ? ` (${me.country})` : ""), options: (Object.keys(RESIDENCE_LABEL) as Residence[]).map((r) => ({ value: r, label: RESIDENCE_LABEL[r] })) },
        ...(draft.residence === "abroad" ? [{ key: "country" as const, label: "দেশ", display: me.country }] : []),
        { key: "profession", label: "পেশা", display: me.profession, options: opts(Array.from(new Set([...professions.map((p) => p.name), me.profession].filter(Boolean)))) },
        { key: "education", label: "শিক্ষা", display: me.education, options: opts(EDUCATION) },
      ],
    },
    {
      title: "রক্তদান",
      rows: [
        { key: "blood_group", label: "রক্তের গ্রুপ", display: me.blood_group || "জানা নেই", options: [{ value: "", label: "জানা নেই" }, ...opts(BLOOD_GROUPS)] },
        { key: "wants_to_donate", label: "রক্ত দিতে ইচ্ছুক", display: me.wants_to_donate ? "হ্যাঁ" : "না", options: [{ value: "true", label: "হ্যাঁ" }, { value: "false", label: "না" }] },
        { key: "last_donation_date", label: "শেষ রক্তদান", display: me.last_donation_date ? formatDate(me.last_donation_date) : "—", type: "date" },
      ],
    },
  ];

  const valueOf = (k: keyof Draft) => {
    const v = draft[k];
    return v === null || v === undefined ? "" : String(v);
  };
  const setValue = (k: keyof Draft, raw: string) => {
    const v = k === "para_id" ? (raw ? Number(raw) : null) : k === "wants_to_donate" ? raw === "true" : (k === "dob" || k === "last_donation_date") && !raw ? null : raw;
    setDraft({ ...draft, [k]: v });
  };

  const save = async () => {
    setSaving(true);
    setFieldErr({});
    try {
      setMe(await api.updateMe(draft));
      setEditing(false);
      toast.success("প্রোফাইল সংরক্ষণ হয়েছে");
    } catch (err) {
      if (err instanceof ApiError) setFieldErr(err.fields);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onPrivacy = async (v: boolean) => {
    try {
      setMe(await api.updateMe({ show_phone: v }));
      toast.success(v ? "সদস্যরা আপনার ফোন নম্বর দেখতে পাবেন" : "ফোন নম্বর শুধু কমিটি দেখবে");
    } catch {
      toast.error("সংরক্ষণ হয়নি — আবার চেষ্টা করুন");
    }
  };

  const onPhoto = async (f: File) => {
    try {
      setMe(await api.uploadPhoto(f));
      toast.success("ছবি বদলানো হয়েছে");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-site pt-[clamp(20px,3vw,40px)] pb-page">
      <BackLink href="/dashboard">ড্যাশবোর্ড</BackLink>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative size-24 flex-none">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-[3px] border-brand-100 bg-brand-50 text-[36px] font-bold text-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {me.photo ? <img src={me.photo} alt="প্রোফাইল ছবি" className="size-full object-cover" /> : avatarInitials(me.name)}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="ছবি বাছুন" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          <button
            type="button"
            aria-label="ছবি বদলান"
            onClick={() => fileRef.current?.click()}
            className="absolute -right-1 -bottom-1 flex size-11 items-center justify-center rounded-full border-[3px] border-page bg-brand text-white"
          >
            <Camera className="size-5" aria-hidden />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[clamp(24px,3vw,32px)] leading-[1.3] font-bold">{me.name}</h1>
          <div className="text-[16px] text-muted">
            {me.member_no} · সদস্য {bn(me.since)} থেকে
          </div>
        </div>
        {!editing && (
          <Button variant="outline" className="px-5" onClick={() => setEditing(true)}>
            এডিট করুন
          </Button>
        )}
      </div>

      {sections.map((s) => (
        <section key={s.title} className="rounded-xl border border-line bg-white px-[18px] pt-1.5 pb-2.5">
          <h2 className="mt-3 mb-1 text-[18px] font-bold text-brand-dark">{s.title}</h2>
          {s.rows.map((r, i) =>
            editing ? (
              <label key={r.key} className="flex flex-col gap-1 py-2">
                <span className="text-[16px] font-semibold">
                  {r.label}
                  {r.locked && <span className="font-normal text-muted"> (বদলাতে কমিটির সাথে যোগাযোগ করুন)</span>}
                </span>
                {r.locked || r.key === "phone" ? (
                  <Input value={r.display} readOnly />
                ) : r.options ? (
                  <Select value={valueOf(r.key)} onChange={(e) => setValue(r.key as keyof Draft, e.target.value)} invalid={!!fieldErr[r.key]}>
                    {r.key === "para_id" && !draft.para_id && <option value="">পাড়া বাছাই করুন</option>}
                    {r.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input type={r.type ?? "text"} value={valueOf(r.key)} invalid={!!fieldErr[r.key]} onChange={(e) => setValue(r.key as keyof Draft, e.target.value)} />
                )}
                {fieldErr[r.key] && <span className="text-[15px] font-semibold text-blood-700">{fieldErr[r.key]}</span>}
              </label>
            ) : (
              <div key={r.key} className={cn("flex flex-wrap justify-between gap-3 py-2.5", i < s.rows.length - 1 && "border-b border-divider")}>
                <span className="text-[16px] text-muted">{r.label}</span>
                <span className="text-right text-[17px] font-semibold">{r.display || "—"}</span>
              </div>
            ),
          )}
        </section>
      ))}

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-white p-[18px]">
        <h2 className="m-0 text-[18px] font-bold text-brand-dark">প্রাইভেসি</h2>
        <ToggleRow title="আমার ফোন নম্বর সদস্যরা দেখবে" sub="বন্ধ করলে শুধু কমিটি দেখতে পাবে। ভিজিটর কখনো দেখে না।" checked={me.show_phone} onChange={onPrivacy} />
      </section>

      {editing && (
        <div className="sticky bottom-[76px] z-10 flex gap-2.5 bg-page py-2 nav:bottom-0">
          <Button
            variant="neutral"
            size="xl"
            className="text-[18px] font-semibold"
            onClick={() => {
              setDraft(draftOf(me));
              setFieldErr({});
              setEditing(false);
            }}
          >
            বাতিল
          </Button>
          <Button size="xl" className="flex-1" loading={saving} loadingText="সংরক্ষণ হচ্ছে…" onClick={save}>
            সংরক্ষণ করুন
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          logout();
          router.push("/");
        }}
        className="min-h-12 self-center text-[17px] text-muted underline"
      >
        লগআউট
      </button>
    </div>
  );
}
