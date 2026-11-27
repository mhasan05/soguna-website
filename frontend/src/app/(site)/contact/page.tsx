import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import { AnchorButton } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/primitives";
import { MAP_EMBED } from "@/lib/content";
import { getSite } from "@/lib/server-api";
import { bn, formatPhone } from "@/lib/bn";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "যোগাযোগ ও জরুরি নম্বর" };

export default async function ContactPage() {
  const site = await getSite();
  const primary = site.emergency.find((e) => e.phone === "999") ?? { id: 0, title: "জাতীয় জরুরি সেবা", phone: "999" };
  const rest = site.emergency.filter((e) => e.id !== primary.id);
  return (
    <>
      <section className="wrap pt-page">
        <Breadcrumb current="যোগাযোগ" />
        <h1 className="mt-1 mb-1.5 text-h1">জরুরি নম্বর</h1>
        <p className="mt-0 mb-[18px] text-[17px] text-muted">কার্ড চাপলেই কল যাবে।</p>
        <div className="grid-fit-260 gap-3">
          <a href={`tel:${primary.phone}`} className="flex min-h-20 items-center gap-3.5 rounded-xl bg-blood p-4 text-white hover:bg-blood-700 hover:no-underline">
            <span className="flex size-[52px] flex-none items-center justify-center rounded-full bg-white/18">
              <Phone className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block text-[18px] font-semibold">{primary.title}</span>
              <span className="block text-[28px] leading-[1.2] font-bold">{bn(primary.phone)}</span>
            </span>
          </a>
          {rest.map((c) => (
            <a key={c.id} href={`tel:${c.phone}`} className="flex min-h-20 items-center gap-3.5 rounded-xl border border-line bg-white p-4 text-ink hover:border-brand-200 hover:no-underline">
              <span className="flex size-[52px] flex-none items-center justify-center rounded-full bg-brand-50 text-brand">
                <Phone className="size-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[18px] leading-[1.4] font-semibold">{c.title}</span>
                <span className="block text-[17px] text-muted">{c.phone.includes("X") ? "০১৭XX-XXXXXX" : formatPhone(c.phone)}</span>
              </span>
            </a>
          ))}
        </div>
        <p className="mt-3 mb-0 text-[15px] text-muted">নম্বরগুলো কমিটি যাচাই করে হালনাগাদ করে।</p>
      </section>

      <section className="wrap grid-fit-380 items-start gap-6 py-section">
        <div className="flex flex-col gap-3.5">
          <h2 className="m-0 text-h2">সংগঠনের সাথে যোগাযোগ</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            <AnchorButton href={`tel:${site.phone}`} size="lg" icon={<Phone className="size-5" aria-hidden />}>
              ফোন
            </AnchorButton>
            <AnchorButton href={site.whatsapp_url} target="_blank" rel="noreferrer" variant="outline" size="lg" icon={<MessageCircle className="size-5" aria-hidden />}>
              WhatsApp
            </AnchorButton>
            <AnchorButton href={site.facebook_url} target="_blank" rel="noreferrer" variant="outline" size="lg">
              Facebook
            </AnchorButton>
          </div>
          <div className="text-[17px] text-body">
            {site.address} · অফিস: {site.office}
          </div>
          <iframe title="সগুনা, বেলকুচির মানচিত্র" src={MAP_EMBED} loading="lazy" className="h-[300px] w-full rounded-xl border border-line" />
        </div>
        <ContactForm phone={site.phone} />
      </section>
    </>
  );
}
