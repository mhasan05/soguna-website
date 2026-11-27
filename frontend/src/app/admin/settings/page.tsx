"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AdminPage, Panel, Reorder } from "@/components/admin/widgets";
import { IconAction, icons } from "@/components/admin/crud";
import { useAdmin, useResource } from "@/components/admin/store";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Img, Skeleton } from "@/components/ui/primitives";
import { ApiError, form, get, patch, post } from "@/lib/api";
import { bn } from "@/lib/bn";
import { DEFAULT_BRAND } from "@/lib/brand";
import { useQuery } from "@/lib/use-query";

type Settings = Record<string, string | number>;

const GROUPS: { title: string; fields: [string, string][] }[] = [
  { title: "সংগঠনের তথ্য", fields: [["org_name", "নাম"], ["address", "ঠিকানা"], ["office", "অফিস"], ["phone", "ফোন"], ["founded_year", "প্রতিষ্ঠার সাল"], ["families_helped", "সাহায্য পেয়েছে এমন পরিবার (হোমের সংখ্যা)"]] },
  { title: "পেমেন্ট নম্বর", fields: [["bkash", "bKash (মার্চেন্ট/পার্সোনাল)"], ["nagad", "Nagad"], ["treasurer_name", "কোষাধ্যক্ষের নাম"]] },
  { title: "সোশ্যাল লিংক", fields: [["whatsapp_url", "WhatsApp গ্রুপ"], ["facebook_url", "Facebook পেজ"], ["youtube_url", "YouTube চ্যানেল"]] },
  { title: "SMS সেটিংস", fields: [["sms_gateway", "SMS গেটওয়ে"], ["sms_sender_id", "সেন্ডার আইডি"]] },
];

export default function AdminSettings() {
  const q = useQuery("admin:settings", () => get<Settings>("/admin/settings/"));
  return <AdminPage slug="settings">{q.data ? <SettingsForm initial={q.data} /> : q.error ? <p className="text-blood-700">{q.error}</p> : <Skeleton className="h-96 w-full" />}</AdminPage>;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const { flash, fail } = useAdmin();
  const [values, setValues] = useState<Settings>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: { target: { value: string } }) => setValues({ ...values, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const keys = [...GROUPS.flatMap((g) => g.fields.map(([k]) => k)), "hero_title", "hero_subtitle"];
      const body = Object.fromEntries(keys.map((k) => [k, values[k] ?? ""]));
      const saved = await patch<Settings>("/admin/settings/", body);
      setValues(saved);
      flash("সব সেটিংস সংরক্ষণ হয়েছে · পাবলিক পাতায় ১ মিনিটের মধ্যে দেখাবে");
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      fail(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid-fit-400 items-start gap-4">
        {GROUPS.map((g) => (
          <Panel key={g.title} className="flex flex-col gap-3 p-[18px]">
            <h2 className="m-0 text-[19px] font-bold">{g.title}</h2>
            {g.fields.map(([k, label]) => (
              <Field key={k} label={label} htmlFor={`set-${k}`} error={errors[k]}>
                <Input id={`set-${k}`} value={String(values[k] ?? "")} invalid={!!errors[k]} onChange={set(k)} className="h-[50px] text-[16px]" />
              </Field>
            ))}
          </Panel>
        ))}
        <LogoPanel values={values} onSaved={setValues} />
        <Panel className="flex flex-col gap-3 p-[18px]">
          <h2 className="m-0 text-[19px] font-bold">হোম পেজের হিরো</h2>
          <HeroSlides />
          <Field label="শিরোনাম" htmlFor="set-hero">
            <Input id="set-hero" value={String(values.hero_title ?? "")} onChange={set("hero_title")} className="h-[50px] text-[16px]" />
          </Field>
          <Field label="উপশিরোনাম" htmlFor="set-hero-sub">
            <Input id="set-hero-sub" value={String(values.hero_subtitle ?? "")} onChange={set("hero_subtitle")} className="h-[50px] text-[16px]" />
          </Field>
          <Link href="/admin/lists" className="flex h-[52px] items-center justify-center rounded-[10px] border-[1.5px] border-brand bg-brand-50 text-[16px] font-bold text-brand-dark hover:no-underline">
            পাড়া, খাত ও ক্যাটাগরি সম্পাদনা →
          </Link>
        </Panel>
      </div>
      <Button size="lg" className="self-start px-7 text-[17px] font-bold" loading={saving} loadingText="সংরক্ষণ হচ্ছে…" onClick={save}>
        সব সেটিংস সংরক্ষণ
      </Button>
    </>
  );
}

type Slide = { id: number; image: string; alt: string; order: number };

/** Home hero slideshow: upload several images, ▲▼ order, edit alt text, delete. */
function HeroSlides() {
  const { flash, fail } = useAdmin();
  const slides = useResource<Slide>("/admin/hero-slides/");
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    const ok = list.filter((f) => f.size <= 10 * 1024 * 1024);
    if (ok.length < list.length) fail(new Error(`${bn(list.length - ok.length)}টি ছবি ১০ MB-এর বেশি — বাদ দেওয়া হলো`));
    if (!ok.length) return;
    setUploading(ok.length);
    try {
      const added: Slide[] = [];
      for (let i = 0; i < ok.length; i += 3) {
        added.push(...(await post<Slide[]>("/admin/hero-slides/", form({ images: ok.slice(i, i + 3) }))));
        setUploading(ok.length - added.length);
      }
      slides.setItems((cur) => [...(cur ?? []), ...added]);
      flash(`${bn(added.length)}টি হিরো ছবি যোগ হয়েছে · হোম পেজে ১ মিনিটের মধ্যে দেখাবে`);
    } catch (err) {
      fail(err);
      slides.reload();
    } finally {
      setUploading(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveAlt = async (s: Slide, alt: string) => {
    if (alt === s.alt) return;
    try {
      await slides.update(s.id, { alt });
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[16px] font-semibold">স্লাইডশোর ছবি</span>
        <span className="text-[14px] text-muted">{slides.items ? `${bn(slides.items.length)}টি` : ""} · প্রতি ৬ সেকেন্ডে বদলায়</span>
      </div>
      {slides.loading && <Skeleton className="h-24 w-full" />}
      {slides.error && <p className="m-0 text-blood-700">{slides.error}</p>}
      {slides.items?.length === 0 && <p className="m-0 rounded-[10px] bg-page p-3 text-[15px] text-muted">কোনো ছবি নেই — ডিফল্ট ছবি দেখাবে।</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {slides.items?.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2.5 rounded-[10px] border border-line bg-white p-2">
            <Reorder label={`ছবি ${bn(i + 1)}`} onUp={() => slides.move(i, -1)} onDown={() => slides.move(i, 1)} />
            <Img src={s.image} alt="" className="h-14 w-24 flex-none rounded-md" />
            <Input
              aria-label={`ছবি ${bn(i + 1)}-এর বর্ণনা`}
              defaultValue={s.alt}
              placeholder="ছবির বর্ণনা (ঐচ্ছিক)"
              onBlur={(e) => saveAlt(s, e.target.value.trim())}
              className="h-10 min-w-0 flex-1 text-[15px]"
            />
            <IconAction label="ছবি মুছুন" tone="danger" icon={icons.delete} onClick={() => slides.remove(s, s.alt || `ছবি ${bn(i + 1)}`)} />
          </li>
        ))}
      </ul>
      <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" aria-label="হিরো ছবি বাছুন" onChange={(e) => onFiles(e.target.files)} />
      <Button variant="outline" className="text-[16px]" loading={uploading > 0} loadingText={`আপলোড হচ্ছে… (${bn(uploading)}টি বাকি)`} onClick={() => fileRef.current?.click()}>
        + ছবি যোগ করুন (একাধিক বাছতে পারেন)
      </Button>
      <p className="m-0 text-[14px] text-muted">চওড়া (আড়াআড়ি) ছবি ভালো দেখায় — অন্তত ১৬০০ পিক্সেল চওড়া।</p>
    </div>
  );
}

const LOGOS = [
  { key: "logo_dark", label: "আড়াআড়ি লোগো — সবুজ/গাঢ় ব্যাকগ্রাউন্ড", hint: "হেডার, ফুটার, অ্যাডমিন, সদস্য কার্ড · সাদা লেখা", fallback: DEFAULT_BRAND.logoDark, bg: "bg-brand", box: "h-16" },
  { key: "logo", label: "আড়াআড়ি লোগো — সাদা/হালকা ব্যাকগ্রাউন্ড", hint: "হালকা পাতায় ও প্রিন্টে", fallback: DEFAULT_BRAND.logo, bg: "bg-white border border-line", box: "h-16" },
  { key: "logo_icon", label: "শুধু প্রতীক (বর্গাকার)", hint: "ব্রাউজার ট্যাবের আইকন, মোবাইল অ্যাডমিন বার", fallback: DEFAULT_BRAND.icon, bg: "bg-page border border-line", box: "size-16" },
] as const;

/** Logos used everywhere on the site; each upload saves immediately. */
function LogoPanel({ values, onSaved }: { values: Settings; onSaved: (s: Settings) => void }) {
  const { flash, fail } = useAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const send = async (key: string, body: Record<string, unknown>, msg: string) => {
    setBusy(key);
    try {
      onSaved(await patch<Settings>("/admin/settings/", form(body)));
      flash(`${msg} · সব পাতায় ১ মিনিটের মধ্যে দেখাবে`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
      const el = refs.current[key];
      if (el) el.value = "";
    }
  };

  return (
    <Panel className="flex flex-col gap-3.5 p-[18px]">
      <div>
        <h2 className="m-0 text-[19px] font-bold">লোগো</h2>
        <p className="mt-1 mb-0 text-[14px] text-muted">স্বচ্ছ ব্যাকগ্রাউন্ডের PNG সবচেয়ে ভালো। এখানে বদলালে সাইটের সব জায়গায় বদলাবে।</p>
      </div>
      {LOGOS.map((l) => {
        const current = String(values[l.key] || "");
        return (
          <div key={l.key} className="flex flex-col gap-2 border-t border-divider pt-3 first-of-type:border-t-0 first-of-type:pt-0">
            <div>
              <div className="text-[16px] font-semibold">{l.label}</div>
              <div className="text-[13px] text-muted">{l.hint}{current ? "" : " · এখন ডিফল্ট লোগো"}</div>
            </div>
            <div className={`flex items-center rounded-[10px] p-3 ${l.bg}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current || l.fallback} alt="" className={`${l.box} w-auto max-w-full object-contain`} />
            </div>
            <input
              ref={(el) => {
                refs.current[l.key] = el;
              }}
              type="file"
              accept="image/png,image/webp,image/jpeg"
              className="sr-only"
              aria-label={l.label}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) send(l.key, { [l.key]: f }, "লোগো বদলানো হয়েছে");
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="text-[15px]" loading={busy === l.key} loadingText="আপলোড হচ্ছে…" onClick={() => refs.current[l.key]?.click()}>
                ছবি বদলান
              </Button>
              {current && (
                <Button variant="neutral" className="text-[15px]" disabled={busy === l.key} onClick={() => send(l.key, { [`${l.key}_reset`]: "1" }, "ডিফল্ট লোগো ফিরিয়ে আনা হয়েছে")}>
                  ডিফল্টে ফেরান
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </Panel>
  );
}
