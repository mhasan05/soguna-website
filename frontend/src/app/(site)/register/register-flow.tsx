"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Clock } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { ErrorSummary, Field, Input, OptionButton, Select, SubmitError, Toggle } from "@/components/ui/form";
import { EDUCATION } from "@/lib/content";
import { RESIDENCE_LABEL, type Residence } from "@/lib/api-types";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/types";
import { normalisePhone } from "@/lib/bn";
import { cn } from "@/lib/cn";
import { ApiError, api, form as toForm } from "@/lib/api";
import { required, useForm } from "@/lib/use-form";

const STEPS = ["মৌলিক তথ্য", "ঠিকানা ও পেশা", "রক্তদান"];

const RESIDENCES = Object.keys(RESIDENCE_LABEL) as Residence[];

export function RegisterFlow({ paras, professions, phone }: { paras: string[]; professions: string[]; phone: string }) {
  const pendingFromUrl = useSearchParams()?.get("step") === "pending";
  const [step, setStep] = useState(1);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [group, setGroup] = useState<BloodGroup | null>("B+");
  const [donor, setDonor] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (photoUrl && URL.revokeObjectURL(photoUrl)), [photoUrl]);

  const form = useForm(
    { name: "", father: "", phone: "", dob: "", para: "", residence: "village", country: "", profession: "", education: "", lastDonation: "" },
    (v) =>
      step === 1
        ? { name: required(v.name, "নাম লিখুন"), phone: normalisePhone(v.phone) ? undefined : "১১ সংখ্যার নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮" }
        : step === 2
          ? { para: required(v.para, "পাড়া বাছাই করুন"), country: v.residence === "abroad" ? required(v.country, "দেশের নাম লিখুন") : undefined }
          : {},
  );

  if (pendingFromUrl || step === 4) return <Pending />;

  const next = async () => {
    if (step < 3) {
      const ok = await form.submit(async () => {});
      if (ok) {
        form.clearErrors();
        setStep(step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    setServerFields({});
    const ok = await form.submit(async (v) => {
      try {
        await api.register(
          toForm({
            name: v.name,
            father_name: v.father,
            phone: normalisePhone(v.phone),
            dob: v.dob || null,
            para: v.para,
            residence: v.residence,
            country: v.country,
            profession: v.profession,
            education: v.education,
            blood_group: group ?? "",
            wants_to_donate: donor,
            last_donation_date: v.lastDonation || null,
            photo,
          }),
        );
      } catch (err) {
        if (err instanceof ApiError && Object.keys(err.fields).length) {
          setServerFields(err.fields);
          // Send the member back to the step that has the problem.
          if (err.fields.phone || err.fields.name) setStep(1);
          else if (err.fields.para || err.fields.country) setStep(2);
        }
        throw err;
      }
    });
    if (ok) setStep(4);
  };

  return (
    <>
      <h1 className="mt-0 mb-1 text-h1-sm">সদস্য নিবন্ধন</h1>
      <p className="mt-0 mb-[18px] text-[17px] text-muted">
        ধাপ {"০১২৩"[step]} / ৩ · {STEPS[step - 1]}
      </p>
      <ol className="mb-[22px] grid list-none grid-cols-3 gap-1.5 p-0" aria-label="ধাপ">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-col gap-1.5" aria-current={i + 1 === step ? "step" : undefined}>
            <div className={cn("h-2 rounded-full", i < step ? "bg-brand" : "bg-line")} />
            <span className={cn("text-[14px] font-semibold", i < step ? "text-brand-dark" : "text-subtle")}>{label}</span>
          </li>
        ))}
      </ol>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[clamp(18px,3vw,28px)]"
      >
        <ErrorSummary count={form.errorCount} />
        {form.status === "error" && <SubmitError onRetry={next} phone={phone} message={form.serverError ?? "আবেদন জমা দেওয়া যায়নি"} />}

        {step === 1 && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex size-[88px] flex-none items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-brand-200 bg-brand-50 text-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photoUrl ? <img src={photoUrl} alt="আপনার ছবি" className="size-full object-cover" /> : <Camera className="size-8" aria-hidden />}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="user"
                className="sr-only"
                aria-label="ছবি বাছুন"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setPhoto(f);
                    setPhotoUrl(URL.createObjectURL(f));
                  }
                }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                {photoUrl ? "ছবি বদলান" : "ছবি তুলুন / বাছুন"}
              </Button>
            </div>
            <Field label="আপনার নাম" htmlFor="r-name" required error={form.errors.name ?? serverFields.name}>
              <Input id="r-name" size="lg" autoComplete="name" placeholder="যেমন: মোঃ রাকিব হাসান" {...form.bind("name")} />
            </Field>
            <Field label="বাবার নাম" htmlFor="r-father">
              <Input id="r-father" size="lg" {...form.bind("father")} />
            </Field>
            <Field label="ফোন নম্বর" htmlFor="r-phone" required error={form.errors.phone ?? serverFields.phone} hint="এই নম্বরে লগইনের কোড যাবে">
              <Input id="r-phone" size="lg" inputMode="tel" autoComplete="tel" placeholder="০১৭XXXXXXXX" {...form.bind("phone")} />
            </Field>
            <Field label="জন্ম তারিখ" htmlFor="r-dob">
              <Input id="r-dob" size="lg" type="date" {...form.bind("dob")} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="পাড়া / মহল্লা" htmlFor="r-para" required error={form.errors.para}>
              <Select id="r-para" size="lg" {...form.bind("para")}>
                <option value="">পাড়া বাছাই করুন</option>
                {paras.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-[17px] font-semibold">বর্তমানে থাকেন</legend>
              <div className="grid grid-cols-2 gap-2">
                {RESIDENCES.map((r) => (
                  <OptionButton key={r} selected={form.values.residence === r} onClick={() => form.set("residence", r)} className="h-[52px]">
                    {RESIDENCE_LABEL[r]}
                  </OptionButton>
                ))}
              </div>
              {form.values.residence === "abroad" && (
                <>
                  <Input size="lg" aria-label="দেশের নাম" placeholder="দেশের নাম (যেমন: সৌদি আরব)" {...form.bind("country")} />
                  {form.errors.country && <span className="text-[15px] font-semibold text-blood-700">{form.errors.country}</span>}
                </>
              )}
            </fieldset>
            <Field label="পেশা" htmlFor="r-job">
              <Select id="r-job" size="lg" {...form.bind("profession")}>
                <option value="">বাছাই করুন</option>
                {professions.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="শিক্ষাগত যোগ্যতা" htmlFor="r-edu">
              <Select id="r-edu" size="lg" {...form.bind("education")}>
                <option value="">বাছাই করুন</option>
                {EDUCATION.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-[17px] font-semibold">রক্তের গ্রুপ</legend>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={group === g}
                    onClick={() => setGroup(g)}
                    className={cn("h-14 rounded-[10px] border-[1.5px] border-blood text-[20px] font-bold", group === g ? "bg-blood text-white" : "bg-white text-blood")}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setGroup(null)} aria-pressed={group === null} className={cn("min-h-11 self-start text-[16px] underline", group === null ? "font-bold text-ink" : "text-muted")}>
                আমি জানি না
              </button>
            </fieldset>
            <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-blood-50 px-4 py-2">
              <span className="text-[17px] font-semibold">আমি রক্ত দিতে ইচ্ছুক</span>
              <Toggle checked={donor} onChange={setDonor} label="রক্ত দিতে ইচ্ছুক" />
            </div>
            <Field label="শেষ রক্তদানের তারিখ" optional="যদি দিয়ে থাকেন" htmlFor="r-last">
              <Input id="r-last" size="lg" type="date" {...form.bind("lastDonation")} />
            </Field>
          </>
        )}

        <div className="mt-1.5 flex gap-2.5">
          {step > 1 && (
            <Button variant="neutral" size="xl" className="text-[18px] font-semibold" onClick={() => {
                form.clearErrors();
                setStep(step - 1);
              }}
            >
              পেছনে
            </Button>
          )}
          <Button type="submit" size="xl" className="flex-1" loading={form.loading} loadingText="জমা হচ্ছে…">
            {step === 3 ? "আবেদন জমা দিন" : "পরের ধাপ"}
          </Button>
        </div>
      </form>
    </>
  );
}

function Pending() {
  return (
    <div role="status" className="flex flex-col items-center gap-3.5 rounded-2xl border border-line bg-white p-[clamp(24px,4vw,40px)] text-center">
      <span className="flex size-[88px] items-center justify-center rounded-full bg-gold-50 text-gold-700">
        <Clock className="size-10" aria-hidden />
      </span>
      <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.3] font-bold">অনুমোদনের অপেক্ষায়</h1>
      <p className="m-0 max-w-[440px] text-[18px] text-body">আপনার আবেদন জমা হয়েছে। কমিটি যাচাই করে অনুমোদন দিলে আপনার ফোনে SMS যাবে। সাধারণত ১–২ দিন লাগে।</p>
      <ol className="mt-1.5 flex w-full max-w-[420px] list-none flex-col p-0 text-left">
        <li className="flex items-center gap-3 py-2.5">
          <span className="flex size-7 flex-none items-center justify-center rounded-full bg-brand text-white">
            <Check className="size-4" aria-hidden />
          </span>
          <span className="text-[17px]">আবেদন জমা — আজ</span>
        </li>
        <li className="flex items-center gap-3 py-2.5">
          <span className="size-7 flex-none rounded-full bg-gold" />
          <span className="text-[17px] font-semibold">কমিটির যাচাই চলছে</span>
        </li>
        <li className="flex items-center gap-3 py-2.5 text-subtle">
          <span className="size-7 flex-none rounded-full border-2 border-field" />
          <span className="text-[17px]">অনুমোদন ও SMS</span>
        </li>
      </ol>
      <LinkButton href="/" variant="outline" size="lg" className="mt-1.5 rounded-xl">
        হোমে ফিরে যান
      </LinkButton>
    </div>
  );
}
