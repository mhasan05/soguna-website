"use client";

import { useRef, useState } from "react";
import { HeartHandshake, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, ErrorSummary, Field, Input, OptionButton, PrefixInput, SubmitError, Textarea } from "@/components/ui/form";
import { BackLink, EmptyState, ListSkeleton, Pill, type PillTone } from "@/components/ui/primitives";
import { bn, digitsOnly, formatDate } from "@/lib/bn";
import { api, form as toForm } from "@/lib/api";
import type { MyAidRequest, Site } from "@/lib/api-types";
import { required, useForm } from "@/lib/use-form";
import { useSession } from "@/lib/session";
import { useQuery } from "@/lib/use-query";

const TYPES = [
  { value: "medical", label: "চিকিৎসা" },
  { value: "education", label: "শিক্ষা" },
  { value: "disaster", label: "দুর্যোগ" },
  { value: "other", label: "অন্যান্য" },
];
const MAX_MB = 10;

const STATUS: Record<MyAidRequest["status"], { label: string; tone: PillTone }> = {
  pending: { label: "অপেক্ষমাণ", tone: "gold" },
  approved: { label: "অনুমোদিত", tone: "success" },
  rejected: { label: "বাতিল", tone: "neutral" },
  done: { label: "সম্পন্ন", tone: "done" },
};

interface Doc {
  name: string;
  sizeKb: number;
  kind: string;
  error?: string;
  file: File;
}

export function AidApplyForm() {
  const { session } = useSession();
  const mineQ = useQuery(session ? `aid:${session.memberId}` : null, () => api.myAid());
  const site = useQuery<Site>("site", () => api.site());
  const [type, setType] = useState(TYPES[0].value);
  const [docs, setDocs] = useState<Doc[]>([]);
  const mine = mineQ.data ?? [];
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm({ forWhom: "", description: "", amount: "", showName: false as boolean }, (v) => ({
    forWhom: required(v.forWhom, "কার জন্য আবেদন, লিখুন"),
    description: required(v.description, "কী হয়েছে, সংক্ষেপে লিখুন"),
    amount: Number(digitsOnly(v.amount)) > 0 ? undefined : "আনুমানিক টাকার পরিমাণ লিখুন",
  }));

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files).map((f) => ({
      name: f.name,
      sizeKb: Math.round(f.size / 1024),
      kind: (f.name.split(".").pop() ?? "").toUpperCase().slice(0, 4),
      error: f.size > MAX_MB * 1024 * 1024 ? `ফাইল অনেক বড় (${bn(Math.round(f.size / 1024 / 1024))} MB) — সর্বোচ্চ ${bn(MAX_MB)} MB` : undefined,
      file: f,
    }));
    setDocs((d) => [...d, ...added]);
  };

  const send = async () => {
    const ok = await form.submit((v) =>
      api.applyAid(
        toForm({
          type,
          for_whom: v.forWhom,
          description: v.description,
          amount: digitsOnly(v.amount),
          show_name: v.showName ? "true" : "false",
          documents: docs.filter((d) => !d.error).map((d) => d.file),
        }),
      ),
    );
    if (ok) {
      setDocs([]);
      mineQ.reload();
    }
  };

  return (
    <div className="wrap grid-fit-440 items-start gap-x-8 gap-y-5 pt-[clamp(20px,3vw,40px)] pb-page">
      <div className="flex flex-col gap-4">
        <BackLink href="/dashboard">ড্যাশবোর্ড</BackLink>
        <div>
          <h1 className="m-0 text-h1-sm">সাহায্যের আবেদন</h1>
          <p className="mt-1 mb-0 text-[17px] text-muted">কমিটি যাচাই করে লক্ষ্য টাকা ঠিক করবে। কাগজপত্র শুধু কমিটি দেখবে।</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-[clamp(18px,2.6vw,28px)]">
          {form.status === "success" ? (
            <div role="status" className="flex flex-col gap-3">
              <div className="rounded-xl bg-gold-50 p-[18px] text-[17px]">
                <strong className="text-gold-800">আবেদন জমা হয়েছে।</strong> কমিটি কাগজপত্র যাচাই করে আপনাকে ফোন করবে।
              </div>
              <Button variant="outline" onClick={form.reset}>
                আরেকটি আবেদন করুন
              </Button>
            </div>
          ) : (
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <ErrorSummary count={form.errorCount} />
              {form.status === "error" && <SubmitError onRetry={send} phone={site.data?.phone} message={form.serverError ?? "আবেদন জমা দেওয়া যায়নি"} />}
              <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-2 text-[17px] font-semibold">আবেদনের ধরন</legend>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map((t) => (
                    <OptionButton key={t.value} selected={type === t.value} onClick={() => setType(t.value)} className="h-[52px]">
                      {t.label}
                    </OptionButton>
                  ))}
                </div>
              </fieldset>
              <Field label="কার জন্য" htmlFor="aid-for" error={form.errors.forWhom}>
                <Input id="aid-for" size="lg" placeholder="যেমন: আমার বাবা, প্রতিবেশী পরিবার" {...form.bind("forWhom")} />
              </Field>
              <Field label="বিবরণ" htmlFor="aid-desc" error={form.errors.description}>
                <Textarea id="aid-desc" rows={4} placeholder="কী হয়েছে, কেন সাহায্য দরকার" {...form.bind("description")} />
              </Field>
              <Field label="প্রয়োজনীয় টাকা" htmlFor="aid-amount" error={form.errors.amount}>
                <PrefixInput id="aid-amount" prefix="৳" inputMode="numeric" placeholder="৫০,০০০" inputClassName="text-[18px]" {...form.bind("amount")} />
              </Field>
              <div className="flex flex-col gap-2">
                <span className="text-[17px] font-semibold">
                  কাগজপত্র <span className="font-normal text-muted">(প্রেসক্রিপশন, বিল)</span>
                </span>
                <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="sr-only" aria-label="কাগজপত্র বাছুন" onChange={(e) => addFiles(e.target.files)} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50 text-[17px] font-semibold text-brand-dark hover:bg-brand-100"
                >
                  <Upload className="size-6" aria-hidden />
                  ছবি তুলুন বা ফাইল বাছুন
                </button>
                {docs.map((d, i) => (
                  <div key={d.name + i} className={d.error ? "flex items-center gap-2.5 rounded-[10px] border-[1.5px] border-blood-300 bg-blood-50 px-3 py-2.5 text-[16px]" : "flex items-center gap-2.5 rounded-[10px] bg-page px-3 py-2.5 text-[16px]"}>
                    <span className="rounded-md bg-blood-50 px-1.5 py-1 font-mono text-[12px] font-bold text-blood-700">{d.kind || "FILE"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{d.name}</span>
                      {d.error && <span className="block text-[14px] font-semibold text-blood-700">{d.error}</span>}
                    </span>
                    {!d.error && <span className="text-[14px] text-muted">{bn(d.sizeKb)} KB</span>}
                    <button type="button" aria-label="সরান" onClick={() => setDocs(docs.filter((_, j) => j !== i))} className="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-white">
                      <X className="size-5" aria-hidden />
                    </button>
                  </div>
                ))}
                <span className="text-[15px] text-muted">ছবি হলে ফোনের ক্যামেরা দিয়ে তুলুন — নিজে থেকে ছোট হয়ে যাবে। সর্বোচ্চ {bn(MAX_MB)} MB।</span>
              </div>
              <Checkbox checked={!!form.values.showName} onChange={(e) => form.set("showName", e.target.checked)}>
                পাবলিক পাতায় আমার নাম দেখানো যাবে (ডিফল্ট গোপন)
              </Checkbox>
              <Button type="submit" size="xl" loading={form.loading} loadingText="জমা হচ্ছে…">
                আবেদন জমা দিন
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[clamp(22px,2.4vw,28px)] font-bold">আমার আবেদনগুলো</h2>
        {mineQ.loading ? (
          <ListSkeleton count={2} min={300} />
        ) : mine.length ? (
          mine.map((a) => (
            <div key={a.id} className="flex flex-col gap-1.5 rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[15px] text-muted">
                  {a.type} · {formatDate(a.created_at)}
                </span>
                <Pill tone={STATUS[a.status].tone} className="font-bold">
                  {STATUS[a.status].label}
                </Pill>
              </div>
              <div className="text-[18px] leading-[1.4] font-semibold">{a.title}</div>
              <div className="text-[16px] text-muted">{a.note}</div>
            </div>
          ))
        ) : (
          <EmptyState icon={<HeartHandshake className="size-7" aria-hidden />} title="আপনি কোনো সাহায্যের আবেদন করেননি" sub="চিকিৎসা, শিক্ষা বা দুর্যোগে সাহায্য দরকার হলে আবেদন করুন।" />
        )}
      </div>
    </div>
  );
}
