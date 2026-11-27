"use client";

import { Button } from "@/components/ui/button";
import { ErrorSummary, Field, Input, SubmitError, Textarea } from "@/components/ui/form";
import { api } from "@/lib/api";
import { normalisePhone } from "@/lib/bn";
import { required, useForm } from "@/lib/use-form";

export function ContactForm({ phone }: { phone: string }) {
  const form = useForm({ name: "", phone: "", subject: "", message: "" }, (v) => ({
    name: required(v.name, "নাম লিখুন"),
    phone: normalisePhone(v.phone) ? undefined : "১১ সংখ্যার নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮",
    message: required(v.message, "বার্তা লিখুন"),
  }));
  const send = () => form.submit((v) => api.contact({ ...v, phone: normalisePhone(v.phone) }));

  return (
    <div className="rounded-xl border border-line bg-white p-[22px]">
      <h2 className="mt-0 mb-3.5 text-h2-sm">বার্তা পাঠান</h2>
      {form.status === "success" ? (
        <div role="status" className="rounded-[10px] bg-brand-50 p-[18px] text-[18px]">
          <strong className="text-brand">ধন্যবাদ, বার্তা পেয়েছি।</strong> কমিটির কেউ শিগগিরই আপনাকে ফোন করবেন।
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <ErrorSummary count={form.errorCount} />
          {form.status === "error" && <SubmitError onRetry={send} phone={phone} message={form.serverError ?? "বার্তা পাঠানো যায়নি"} />}
          <Field label="আপনার নাম" htmlFor="c-name" error={form.errors.name}>
            <Input id="c-name" autoComplete="name" {...form.bind("name")} />
          </Field>
          <Field label="ফোন নম্বর" htmlFor="c-phone" error={form.errors.phone} hint="বাংলা বা ইংরেজি — যেকোনো সংখ্যায় লিখতে পারেন।">
            <Input id="c-phone" placeholder="০১৭XXXXXXXX" inputMode="tel" autoComplete="tel" {...form.bind("phone")} />
          </Field>
          <Field label="বিষয়" htmlFor="c-subject">
            <Input id="c-subject" placeholder="যেমন: সদস্য হতে চাই" {...form.bind("subject")} />
          </Field>
          <Field label="বার্তা" htmlFor="c-msg" error={form.errors.message}>
            <Textarea id="c-msg" rows={4} {...form.bind("message")} />
          </Field>
          <Button type="submit" size="xl" loading={form.loading} loadingText="পাঠানো হচ্ছে…">
            বার্তা পাঠান
          </Button>
        </form>
      )}
    </div>
  );
}
