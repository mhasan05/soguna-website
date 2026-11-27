"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Phone, Search } from "lucide-react";
import { AnchorButton, Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Avatar, EmptyState, ListSkeleton, Pill } from "@/components/ui/primitives";
import { BLOOD_GROUPS } from "@/lib/types";
import { RESIDENCE_LABEL, type DirectoryMember, type Residence } from "@/lib/api-types";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { bn, digitsOnly, initialOf } from "@/lib/bn";

const EMPTY = { q: "", para: "", job: "", blood: "", loc: "" };

export function Directory({ paras, professions }: { paras: string[]; professions: string[] }) {
  const [f, setF] = useState(EMPTY);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<DirectoryMember | null>(null);

  // Return to the list when this page is hidden by a navigation.
  useLayoutEffect(() => () => setOpen(null), []);

  // Debounce the search box so typing doesn't fire a request per key.
  useEffect(() => {
    const t = setTimeout(() => setQ(f.q.trim()), 300);
    return () => clearTimeout(t);
  }, [f.q]);

  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (f.para) params.para = f.para;
  if (f.job) params.profession = f.job;
  if (f.blood) params.blood_group = f.blood;
  if (f.loc) params.residence = f.loc;
  const key = `members:${new URLSearchParams(params)}`;
  const { data, error } = useQuery(key, () => api.directory(params));
  const rows = data?.results ?? [];

  if (open) {
    return (
      <div className="wrap flex flex-col gap-3.5 pt-[clamp(20px,3vw,40px)] pb-page">
        <button type="button" onClick={() => setOpen(null)} className="inline-flex min-h-12 items-center gap-1.5 self-start text-[17px] font-semibold text-brand">
          <ArrowLeft className="size-5" aria-hidden />
          সদস্য তালিকা
        </button>
        <div className="flex w-full max-w-[560px] flex-col items-center gap-1.5 rounded-2xl border border-line bg-white p-6 text-center">
          <Avatar label={initialOf(open.name)} size={96} />
          <h1 className="mt-1.5 mb-0 text-[24px] font-bold">{open.name}</h1>
          <div className="text-[16px] text-muted">
            {open.para} · {open.profession} · {open.residence_label}
            {open.country ? ` (${open.country})` : ""}
          </div>
          <div className="font-mono text-[14px] text-muted">{open.member_no}</div>
          {open.blood_group && (
            <Pill tone="red" className="mt-1 text-[15px] font-bold">
              রক্ত {open.blood_group}
            </Pill>
          )}
          {open.phone ? (
            <div className="mt-3.5 grid w-full grid-cols-2 gap-2">
              <AnchorButton href={`tel:${open.phone}`} size="lg" icon={<Phone className="size-5" aria-hidden />}>
                কল করুন
              </AnchorButton>
              <AnchorButton href={`https://wa.me/88${digitsOnly(open.phone)}`} target="_blank" rel="noreferrer" variant="outline" size="lg" icon={<MessageCircle className="size-5" aria-hidden />}>
                WhatsApp
              </AnchorButton>
            </div>
          ) : (
            <div className="mt-3.5 w-full rounded-[10px] bg-pill p-3 text-[16px] text-muted">এই সদস্য ফোন নম্বর গোপন রেখেছেন।</div>
          )}
        </div>
      </div>
    );
  }

  const filters = [
    { key: "para", label: "পাড়া", all: "সব পাড়া", options: paras.map((p) => ({ value: p, label: p })) },
    { key: "job", label: "পেশা", all: "সব পেশা", options: professions.map((p) => ({ value: p, label: p })) },
    { key: "blood", label: "রক্তের গ্রুপ", all: "সব গ্রুপ", options: BLOOD_GROUPS.map((p) => ({ value: p, label: p })) },
    { key: "loc", label: "বর্তমান অবস্থান", all: "সব জায়গা", options: (Object.keys(RESIDENCE_LABEL) as Residence[]).map((r) => ({ value: r, label: RESIDENCE_LABEL[r] })) },
  ] as const;

  return (
    <div className="wrap flex flex-col gap-3.5 pt-[clamp(20px,3vw,40px)] pb-page">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="m-0 text-h1-sm">সদস্য তালিকা</h1>
        <span className="text-[16px] text-muted">
          {data ? `${bn(rows.length)} জন দেখানো হচ্ছে · মোট ${bn(data.total)}` : "…"}
        </span>
      </div>
      <label className="flex h-14 items-center gap-2.5 rounded-xl border-[1.5px] border-field bg-white px-3.5 focus-within:border-brand">
        <Search className="size-[22px] flex-none text-muted" aria-hidden />
        <span className="sr-only">খুঁজুন</span>
        <input
          type="search"
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
          placeholder="নাম বা ফোন দিয়ে খুঁজুন"
          className="min-w-0 flex-1 border-none bg-transparent text-[18px] outline-none"
        />
      </label>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,46%),1fr))] gap-2">
        {filters.map((fl) => (
          <Select key={fl.key} aria-label={fl.label} value={f[fl.key]} active={!!f[fl.key]} onChange={(e) => setF({ ...f, [fl.key]: e.target.value })} className="px-2.5 text-[16px]">
            <option value="">{fl.all}</option>
            {fl.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ))}
      </div>
      {error ? (
        <p className="text-[17px] text-blood-700">{error}</p>
      ) : !data ? (
        <ListSkeleton count={4} min={260} />
      ) : rows.length ? (
        <div className="grid-fit-260 gap-2.5">
          {rows.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpen(m)}
              className="flex min-h-20 items-center gap-3 rounded-xl border border-line bg-white p-3.5 text-left text-ink hover:border-brand-200"
            >
              <Avatar label={initialOf(m.name)} size={52} />
              <div className="min-w-0 flex-1">
                <div className="text-[17px] leading-[1.4] font-semibold">{m.name}</div>
                <div className="text-[15px] text-muted">
                  {m.para} · {m.profession}
                </div>
              </div>
              <span className="flex-none text-[14px] font-bold text-blood">{m.blood_group}</span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search className="size-7" aria-hidden />}
          title={q ? `"${q}" নামে কাউকে পাওয়া যায়নি` : "কাউকে পাওয়া যায়নি"}
          sub="বানান দেখুন, বা ফিল্টার মুছে আবার খুঁজুন।"
          action={
            <Button variant="outline" onClick={() => setF(EMPTY)}>
              ফিল্টার মুছুন
            </Button>
          }
        />
      )}
    </div>
  );
}
