"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Droplet, Lock, MessageCircle, Phone } from "lucide-react";
import { Field, GroupButton, Input, Select, SubmitError, ErrorSummary } from "@/components/ui/form";
import { AnchorButton, Button, LinkButton } from "@/components/ui/button";
import { Avatar, Card, EmptyState, Pill, Skeleton } from "@/components/ui/primitives";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/types";
import { bn, digitsOnly, formatDate, initialOf, normalisePhone } from "@/lib/bn";
import { useSession } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { useForm, required } from "@/lib/use-form";
import { api } from "@/lib/api";

const ALL = "সব পাড়া";

export function BloodFinder({ paras, phone }: { paras: string[]; phone: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const fromUrl = params?.get("group") as BloodGroup | null;
  // Group lives in the URL so links like /blood?group=O− always win over preserved state.
  const group: BloodGroup = fromUrl && BLOOD_GROUPS.includes(fromUrl) ? fromUrl : "B+";
  const [para, setPara] = useState(ALL);
  const { session, ready } = useSession();

  const pick = (g: BloodGroup) => router.replace(`/blood?group=${encodeURIComponent(g)}`, { scroll: false });

  // Visitors get counts only; members also get names and phones. "Ready" is computed by the API (≥ 90 days).
  const paraParam = para === ALL ? "" : para;
  const { data, error } = useQuery(ready ? `donors:${group}:${paraParam}:${session?.memberId ?? "anon"}` : null, () => api.donors(group, paraParam));
  const donors = data?.donors ?? [];
  const total = data?.total ?? 0;
  const readyCount = data?.ready ?? 0;
  const loadingCounts = !data && !error;

  return (
    <>
      <section className="border-b border-blood-200 bg-blood-50">
        <div className="wrap py-[clamp(24px,3.5vw,44px)]">
          <div className="flex items-center gap-2.5">
            <Droplet className="size-8 text-blood" aria-hidden />
            <h1 className="m-0 text-h1">রক্তদাতা খুঁজুন</h1>
          </div>
          <p className="mt-1.5 mb-[18px] text-[17px] text-muted">রক্তের গ্রুপ বাছাই করুন। জরুরি সময়ে কোনো অনুমোদন লাগে না।</p>
          <div role="group" aria-label="রক্তের গ্রুপ" className="grid grid-cols-[repeat(auto-fit,minmax(68px,1fr))] gap-2.5">
            {BLOOD_GROUPS.map((g) => (
              <GroupButton key={g} selected={g === group} onClick={() => pick(g)}>
                {g}
              </GroupButton>
            ))}
          </div>
          <div className="mt-3.5 max-w-[360px]">
            <Field label="পাড়া" htmlFor="blood-para">
              <Select id="blood-para" value={para} onChange={(e) => setPara(e.target.value)}>
                {[ALL, ...paras].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </section>

      {error ? (
        <div className="wrap py-8 text-[17px] text-blood-700" role="alert">
          {error}
        </div>
      ) : !ready || loadingCounts ? (
        <div className="wrap grid gap-3 py-8" aria-busy>
          <Skeleton className="h-28 w-full max-w-[560px]" />
          <Skeleton className="h-28 w-full max-w-[560px]" />
        </div>
      ) : session && data?.donors ? (
        <section className="wrap py-[clamp(24px,3.5vw,40px)]">
          <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2">
            <h2 className="m-0 text-h2-sm">
              <span className="text-blood">{group}</span> রক্তদাতা · {bn(total)} জন
            </h2>
            <span className="text-[16px] text-muted">এখন প্রস্তুত {bn(readyCount)} জন</span>
          </div>
          {donors.length ? (
            <div className="grid-fit-340 gap-3">
              {donors.map((d) => (
                <Card key={d.id} className="flex flex-col gap-3 p-4 shadow-none">
                  <div className="flex items-center gap-3">
                    <Avatar label={initialOf(d.name)} size={56} tone="red" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[18px] leading-[1.4] font-semibold">{d.name}</div>
                      <div className="text-[15px] text-muted">
                        {d.para}
                        {d.last_donation_date ? ` · শেষ রক্তদান ${formatDate(d.last_donation_date)}` : ""}
                      </div>
                    </div>
                    {d.ready ? (
                      <Pill tone="success" className="flex-none px-2.5 text-brand">
                        প্রস্তুত
                      </Pill>
                    ) : (
                      <Pill tone="neutral" className="flex-none px-2.5 text-muted">
                        ৩ মাস হয়নি
                      </Pill>
                    )}
                  </div>
                  {d.phone ? (
                    <div className="grid grid-cols-2 gap-2">
                      <AnchorButton href={`tel:${d.phone}`} icon={<Phone className="size-5" aria-hidden />}>
                        কল করুন
                      </AnchorButton>
                      <AnchorButton href={`https://wa.me/88${digitsOnly(d.phone)}`} target="_blank" rel="noreferrer" variant="outline" icon={<MessageCircle className="size-5" aria-hidden />}>
                        WhatsApp
                      </AnchorButton>
                    </div>
                  ) : (
                    <div className="rounded-[10px] bg-pill px-3 py-2.5 text-[15px] text-muted">ফোন নম্বর গোপন — রক্তদান সম্পাদকের মাধ্যমে যোগাযোগ করুন</div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              tone="red"
              icon={<Droplet className="size-7" aria-hidden />}
              title={`${para}য় ${group} রক্তদাতা নেই`}
              sub="সব পাড়ায় খুঁজুন, বা জরুরি অনুরোধ পাঠান — সবার কাছে যাবে।"
              action={
                <Button variant="blood" onClick={() => setPara(ALL)}>
                  সব পাড়ায় খুঁজুন
                </Button>
              }
            />
          )}
          <div className="mt-8 max-w-[640px]">
            <BloodRequestForm group={group} phone={phone} />
          </div>
        </section>
      ) : (
        <section className="wrap grid-fit-380 items-start gap-5 py-[clamp(24px,3.5vw,40px)]">
          <div className="flex flex-col gap-3.5">
            <Card className="p-[22px] shadow-none">
              <div className="text-[16px] text-muted">{para === ALL ? "সগুনার সব পাড়া" : para}</div>
              <div className="mt-1 text-[clamp(24px,2.6vw,30px)] leading-[1.4] font-bold">
                <span className="text-blood">{group}</span> রক্তদাতা {bn(total)} জন
              </div>
              <div className="mt-0.5 text-[19px]">
                এখন দিতে পারবেন <strong className="text-brand">{bn(readyCount)} জন</strong>
              </div>
            </Card>
            <div className="flex flex-col gap-2.5 rounded-xl border border-brand-100 bg-brand-50 p-[18px]">
              <div className="flex items-start gap-2.5">
                <Lock className="mt-1 size-5 flex-none text-brand" aria-hidden />
                <span className="text-[17px]">দাতাদের নাম ও ফোন নম্বর শুধু সদস্যরা দেখতে পান। সদস্য হলে লগইন করুন।</span>
              </div>
              <LinkButton href="/login?next=/blood" block>
                লগইন করুন
              </LinkButton>
            </div>
          </div>
          <BloodRequestForm group={group} phone={phone} />
        </section>
      )}
    </>
  );
}

function BloodRequestForm({ group, phone }: { group: BloodGroup; phone: string }) {
  const form = useForm({ patient: "", bags: "", hospital: "", phone: "" }, (v) => ({
    patient: required(v.patient, "রোগীর নাম লিখুন"),
    bags: digitsOnly(v.bags) && Number(digitsOnly(v.bags)) > 0 ? undefined : "কত ব্যাগ লাগবে লিখুন",
    hospital: required(v.hospital, "হাসপাতালের নাম লিখুন"),
    phone: normalisePhone(v.phone) ? undefined : "১১ সংখ্যার নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮",
  }));
  const send = () => form.submit((v) => api.bloodRequest({ ...v, bags: digitsOnly(v.bags), blood_group: group, phone: normalisePhone(v.phone) }));

  return (
    <div id="request" className="scroll-mt-24 rounded-xl border-[1.5px] border-blood bg-white p-[22px]">
      <h2 className="mt-0 mb-1 text-h2-sm text-blood-700">জরুরি রক্তের অনুরোধ পাঠান</h2>
      <p className="mt-0 mb-4 text-[16px] text-muted">অনুরোধ সঙ্গে সঙ্গে রক্তদান বিষয়ক সম্পাদক ও মিলে যাওয়া দাতাদের কাছে যাবে।</p>
      {form.status === "success" ? (
        <div role="status" className="rounded-[10px] bg-brand-50 p-[18px] text-[18px]">
          <strong className="text-brand">অনুরোধ পাঠানো হয়েছে।</strong> কিছুক্ষণের মধ্যে একজন দাতা আপনাকে ফোন করবেন। খুব জরুরি হলে{" "}
          <a href="tel:999" className="font-semibold text-blood-700">
            ৯৯৯-এ কল করুন
          </a>
          ।
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex flex-col gap-3.5"
        >
          <ErrorSummary count={form.errorCount} />
          {form.status === "error" && <SubmitError onRetry={send} phone={phone} phoneLabel="সংগঠনে ফোন করুন" message={form.serverError ?? "অনুরোধ পাঠানো যায়নি"} />}
          <Field label="রোগীর নাম" htmlFor="br-patient" error={form.errors.patient}>
            <Input id="br-patient" placeholder="যেমন: মোছাঃ রহিমা বেগম" {...form.bind("patient")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="রক্তের গ্রুপ" htmlFor="br-group">
              <Input id="br-group" value={group} readOnly className="font-bold text-blood" />
            </Field>
            <Field label="কত ব্যাগ" htmlFor="br-bags" error={form.errors.bags}>
              <Input id="br-bags" placeholder="২" inputMode="numeric" {...form.bind("bags")} />
            </Field>
          </div>
          <Field label="হাসপাতাল" htmlFor="br-hospital" error={form.errors.hospital}>
            <Input id="br-hospital" placeholder="যেমন: বেলকুচি উপজেলা স্বাস্থ্য কমপ্লেক্স" {...form.bind("hospital")} />
          </Field>
          <Field label="যোগাযোগের ফোন" htmlFor="br-phone" error={form.errors.phone}>
            <Input id="br-phone" placeholder="০১৭XXXXXXXX" inputMode="tel" autoComplete="tel" {...form.bind("phone")} />
          </Field>
          <Button type="submit" variant="blood" size="xl" loading={form.loading} loadingText="অনুরোধ পাঠানো হচ্ছে…">
            অনুরোধ পাঠান
          </Button>
        </form>
      )}
    </div>
  );
}
