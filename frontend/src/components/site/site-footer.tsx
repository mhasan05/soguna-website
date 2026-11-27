import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { getSite } from "@/lib/server-api";
import { bn, formatPhone } from "@/lib/bn";

const QUICK_LINKS = [
  ["/about", "আমাদের কথা"],
  ["/committee", "কমিটি"],
  ["/notices", "নোটিশ বোর্ড"],
  ["/blood", "রক্তদাতা খুঁজুন"],
  ["/events", "কার্যক্রম"],
  ["/gallery", "গ্যালারি"],
  ["/donate", "দান ও হিসাব"],
  ["/contact", "যোগাযোগ"],
  ["/aid", "সাহায্য ও সেবা"],
  ["/finance", "ফান্ডের হিসাব"],
] as const;

export async function SiteFooter() {
  const site = await getSite();
  return (
    <footer className="bg-brand-dark text-[16px] text-footer-ink">
      <div className="wrap grid-fit-240 gap-7 pt-[clamp(36px,4.5vw,56px)] pb-6">
        <div className="flex flex-col gap-2.5">
          <BrandLogo className="mb-1 h-[52px]" />
          <div className="flex gap-2">
            <MapPin className="mt-1 size-[18px] flex-none" aria-hidden />
            {site.address}
          </div>
          <a href={`tel:${site.phone}`} className="flex items-center gap-2 text-footer-ink">
            <Phone className="size-[18px] flex-none" aria-hidden />
            {formatPhone(site.phone)}
          </a>
          <div className="mt-1.5 flex flex-wrap gap-2.5">
            <a href={site.whatsapp_url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-white/10 px-4 font-semibold text-white hover:bg-white/20 hover:no-underline">
              <MessageCircle className="size-5" aria-hidden />
              WhatsApp
            </a>
            <a href={site.facebook_url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-white/10 px-4 font-semibold text-white hover:bg-white/20 hover:no-underline">
              Facebook
            </a>
          </div>
        </div>
        <div>
          <div className="mb-2 text-[17px] font-bold text-white">দ্রুত লিংক</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {QUICK_LINKS.map(([href, label]) => (
              <Link key={href} href={href} className="py-1.5 text-footer-ink hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[17px] font-bold text-white">জরুরি নম্বর</div>
          <a href="tel:999" className="flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-white text-[18px] font-bold text-brand-dark hover:no-underline">
            <Phone className="size-5" aria-hidden />
            জাতীয় জরুরি সেবা ৯৯৯
          </a>
          <Link href="/contact" className="mt-1 inline-flex min-h-11 items-center text-gold-300">
            সব জরুরি নম্বর দেখুন →
          </Link>
        </div>
      </div>
      <div className="wrap flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-white/15 pt-4 pb-6 text-[15px] text-footer-muted">
        <span>© ২০২৬ {site.org_name} · একটি রাজনৈতিকভাবে নিরপেক্ষ সামাজিক সংগঠন</span>
        <span>প্রতিষ্ঠা {bn(site.founded_year)}</span>
      </div>
    </footer>
  );
}
