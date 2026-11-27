"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, ErrorSummary, Field, Input, Segmented, SubmitError } from "@/components/ui/form";
import { Pill } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import type { AidFund, EventItem, Site } from "@/lib/api-types";
import { bn, digitsOnly, formatDate, formatPhone, normalisePhone, percent } from "@/lib/bn";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { useForm } from "@/lib/use-form";

const AMOUNTS = [100, 500, 1000] as const;

/** Keyed by ?purpose= so a new link resets the preserved (Activity) form state. */
type Props = { site: Site; nextEvent: EventItem | null; funds: AidFund[] };

export function DonateForm(props: Props) {
  const fromUrl = useSearchParams()?.get("purpose") ?? "";
  return <DonateFormInner key={fromUrl} fromUrl={fromUrl} {...props} />;
}

function DonateFormInner({ fromUrl, site, nextEvent, funds }: Props & { fromUrl: string }) {
  const toast = useToast();

  const purposes = [
    { id: "general", label: "সাধারণ তহবিল", sub: "যেখানে সবচেয়ে বেশি দরকার" },
    ...(nextEvent ? [{ id: nextEvent.slug, label: nextEvent.title, sub: `নির্দিষ্ট ইভেন্ট · ${formatDate(nextEvent.start_at, { year: false })}` }] : []),
    ...funds.map((f) => ({ id: f.id, label: f.title, sub: `সাহায্যের আবেদন · ${bn(percent(f.raised, f.target))}% উঠেছে` })),
  ];
  const [purpose, setPurpose] = useState(purposes.some((p) => p.id === fromUrl) ? fromUrl : "general");
  const [amountIdx, setAmountIdx] = useState<number>(1);
  const [method, setMethod] = useState<"bKash" | "Nagad">("bKash");

  const form = useForm({ custom: "", name: "", phone: "", anonymous: false as boolean, trx: "" }, (v) => ({
    custom: amountIdx === 3 && !(Number(digitsOnly(v.custom)) > 0) ? "টাকার পরিমাণ লিখুন" : undefined,
    phone: normalisePhone(v.phone) ? undefined : "১১ সংখ্যার নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮",
    trx: v.trx.trim().length >= 8 ? undefined : "মেসেজে আসা Transaction ID লিখুন (৮–১০ অক্ষর)",
  }));

  const amount = amountIdx < 3 ? AMOUNTS[amountIdx] : Number(digitsOnly(form.values.custom)) || 0;
  const number = formatPhone(method === "bKash" ? site.bkash : site.nagad);

  const send = () =>
    form.submit((v) =>
      api.donate({
        purpose,
        amount,
        method: method === "bKash" ? "bkash" : "nagad",
        name: v.anonymous ? "" : v.name,
        anonymous: v.anonymous,
        phone: normalisePhone(v.phone),
        trx_id: v.trx.trim().toUpperCase(),
      }),
    );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(digitsOnly(number) || number);
      toast.success("নম্বর কপি হয়েছে");
    } catch {
      toast.error("কপি করা যায়নি — নম্বরটি লিখে নিন");
    }
  };

  if (form.status === "success") {
    return (
      <div className="rounded-xl border border-line bg-white p-[clamp(18px,2.4vw,28px)]">
        <div role="status" className="flex flex-col items-center gap-3 px-2 py-6 text-center">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-success text-brand">
            <Check className="size-9" aria-hidden />
          </span>
          <h2 className="m-0 text-[26px] font-bold">জাযাকাল্লাহ খাইরান!</h2>
          <p className="m-0 max-w-[380px] text-[17px] text-body">আপনার দান যাচাইয়ের অপেক্ষায় আছে। কোষাধ্যক্ষ মিলিয়ে নিলে SMS-এ রসিদ পাবেন।</p>
          <Pill tone="gold" className="text-[15px]">
            যাচাইয়ের অপেক্ষায়
          </Pill>
          <Button variant="outline" className="mt-2" onClick={form.reset}>
            আরেকটি দান করুন
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex flex-col gap-5 rounded-xl border border-line bg-white p-[clamp(18px,2.4vw,28px)]"
    >
      <ErrorSummary count={form.errorCount} />
      {form.status === "error" && <SubmitError onRetry={send} phone={site.phone} phoneLabel="সংগঠনে ফোন করুন" message={form.serverError ?? "জমা দেওয়া যায়নি"} />}

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 text-[18px] font-bold">১. কোথায় দান করবেন</legend>
        <div role="radiogroup" className="flex flex-col gap-2">
          {purposes.map((p) => {
            const on = p.id === purpose;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPurpose(p.id)}
                className={cn(
                  "flex min-h-[60px] items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-left text-ink",
                  on ? "border-2 border-brand bg-brand-50" : "border-[1.5px] border-line bg-white hover:border-brand-200",
                )}
              >
                <span className={cn("flex size-[22px] flex-none items-center justify-center rounded-full border-2", on ? "border-brand" : "border-faint")}>
                  <span className={cn("size-2.5 rounded-full", on ? "bg-brand" : "bg-transparent")} />
                </span>
                <span>
                  <span className="block text-[17px] font-semibold">{p.label}</span>
                  <span className="block text-[15px] text-muted">{p.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 text-[18px] font-bold">২. টাকার পরিমাণ</legend>
        <div className="grid grid-cols-4 gap-2">
          {[...AMOUNTS.map((a) => `৳${bn(a)}`), "অন্যান্য"].map((label, i) => {
            const on = amountIdx === i;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => setAmountIdx(i)}
                className={cn("h-14 rounded-[10px] text-[18px] font-bold", on ? "border-2 border-brand bg-brand text-white" : "border-[1.5px] border-line bg-white text-ink hover:border-brand-200")}
              >
                {label}
              </button>
            );
          })}
        </div>
        {amountIdx === 3 && (
          <div className="mt-2">
            <Input aria-label="টাকার পরিমাণ" placeholder="টাকার পরিমাণ লিখুন" inputMode="numeric" autoFocus {...form.bind("custom")} />
            {form.errors.custom && <span className="mt-1 block text-[15px] font-semibold text-blood-700">{form.errors.custom}</span>}
          </div>
        )}
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-3 text-[18px] font-bold">৩. আপনার তথ্য</legend>
        <Field label="নাম" htmlFor="d-name">
          <Input id="d-name" autoComplete="name" disabled={!!form.values.anonymous} {...form.bind("name")} />
        </Field>
        <Field label="ফোন নম্বর" htmlFor="d-phone" error={form.errors.phone} hint="রসিদ এই নম্বরে SMS-এ যাবে">
          <Input id="d-phone" placeholder="০১৭XXXXXXXX" inputMode="tel" autoComplete="tel" {...form.bind("phone")} />
        </Field>
        <Checkbox checked={!!form.values.anonymous} onChange={(e) => form.set("anonymous", e.target.checked)}>
          নাম গোপন রাখুন (তালিকায় &quot;নাম প্রকাশে অনিচ্ছুক&quot; দেখাবে)
        </Checkbox>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-3 text-[18px] font-bold">৪. টাকা পাঠান</legend>
        <Segmented<"bKash" | "Nagad">
          full
          label="পেমেন্টের মাধ্যম"
          value={method}
          onChange={setMethod}
          options={[
            { value: "bKash", label: "bKash" },
            { value: "Nagad", label: "Nagad" },
          ]}
        />
        <div className="rounded-[10px] border border-gold-150 bg-gold-25 px-4 py-3.5 text-[16px] text-body">
          <div>{method} &quot;Send Money&quot; করুন এই নম্বরে:</div>
          <div className="mt-1 flex items-center justify-between gap-2.5">
            <span className="text-[24px] font-bold tracking-[.5px] text-ink">{number}</span>
            <button type="button" onClick={copy} className="h-11 rounded-lg border-[1.5px] border-gold bg-white px-3.5 text-[15px] font-semibold text-gold-700 hover:bg-gold-25">
              কপি
            </button>
          </div>
          <div className="mt-1.5">টাকা পাঠানোর পর মেসেজে আসা Transaction ID নিচে লিখুন। কোষাধ্যক্ষ মিলিয়ে নিশ্চিত করবেন।</div>
        </div>
        <Field label="Transaction ID" htmlFor="d-trx" error={form.errors.trx}>
          <Input id="d-trx" placeholder="যেমন: 9K7X2M4QPL" autoCapitalize="characters" autoComplete="off" className="font-mono uppercase" {...form.bind("trx")} />
        </Field>
      </fieldset>

      <Button type="submit" size="xl" loading={form.loading} loadingText="জমা হচ্ছে…">
        {amount > 0 ? `৳${bn(amount.toLocaleString("en-IN"))} দান নিশ্চিত করুন` : "দান নিশ্চিত করুন"}
      </Button>
    </form>
  );
}
