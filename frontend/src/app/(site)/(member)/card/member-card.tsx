"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  BadgeCheck,
  Copy,
  Download,
  Droplet,
  MessageCircle,
  Share2,
} from "lucide-react";
import { BrandLogo, useBrand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { Site } from "@/lib/api-types";
import { SITE_URL } from "@/lib/content";
import { useSession } from "@/lib/session";
import { avatarInitials, bn } from "@/lib/bn";
import { useQuery } from "@/lib/use-query";

/** Exported image width — 1080×1350 (4:5) fits Facebook, Instagram and WhatsApp status. */
const EXPORT_WIDTH = 1080;

export function MemberCardView() {
  const { session } = useSession();
  const m = session?.me;
  return m ? <Card m={m} /> : null;
}

function Card({
  m,
}: {
  m: NonNullable<ReturnType<typeof useSession>["session"]>["me"];
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const brand = useBrand();
  const site = useQuery<Site>("site", () => api.site());
  const no = m.member_no ?? "";
  const verifyUrl = `${SITE_URL}/verify/${no}`;
  const shortUrl = verifyUrl.replace(/^https?:\/\//, "");
  const tagline = site.data?.hero_title ?? "আমরা সগুনার তরুণ, আমরা এক সাথে";
  const hashtag = `#${brand.name.replace(/\s+/g, "_")}`;
  const caption = `আমি ${brand.name}-এর গর্বিত সদস্য! 💚\n${tagline}\n\nসদস্য নম্বর: ${no}\nযাচাই করুন: ${verifyUrl}\n\n${hashtag} #সগুনা`;

  const toPng = async () => {
    const { toPng } = await import("html-to-image");
    const el = cardRef.current!;
    return toPng(el, {
      pixelRatio: EXPORT_WIDTH / el.offsetWidth,
      cacheBust: true,
    });
  };

  const download = async () => {
    setBusy(true);
    try {
      const url = await toPng();
      const a = document.createElement("a");
      a.href = url;
      a.download = `${no || "member-card"}.png`;
      a.click();
      toast.success("কার্ডের ছবি ডাউনলোড হয়েছে — ফেসবুক বা হোয়াটসঅ্যাপে পোস্ট করুন");
    } catch {
      toast.error("ছবি তৈরি করা যায়নি — স্ক্রিনশট নিন");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      if (navigator.share) {
        const blob = await (await fetch(await toPng())).blob();
        const file = new File([blob], `${no || "member-card"}.png`, {
          type: "image/png",
        });
        if (navigator.canShare?.({ files: [file] }))
          await navigator.share({
            files: [file],
            title: "সদস্য কার্ড",
            text: caption,
          });
        else
          await navigator.share({
            title: "সদস্য কার্ড",
            text: caption,
            url: verifyUrl,
          });
      } else {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(caption)}`,
          "_blank",
        );
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error("শেয়ার করা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("ক্যাপশন কপি হয়েছে — পোস্টে পেস্ট করুন");
    } catch {
      toast.error("কপি করা যায়নি");
    }
  };

  return (
    <div className="mx-auto flex max-w-[460px] flex-col gap-[18px] px-site pt-[clamp(20px,3vw,40px)] pb-page">
      <BackLink href="/dashboard">ড্যাশবোর্ড</BackLink>
      <div>
        <h1 className="m-0 text-[clamp(24px,3vw,32px)] font-bold">
          আমার সদস্য কার্ড
        </h1>
        <p className="mt-1 mb-0 text-[16px] text-muted">
          ছবিটি ডাউনলোড করে ফেসবুক, হোয়াটসঅ্যাপ স্ট্যাটাস বা ইনস্টাগ্রামে শেয়ার করুন।
        </p>
      </div>

      {/* ── The card (exported as a 1080×1350 PNG) ── */}
      <div ref={cardRef} className="w-full [container-type:inline-size]">
        <div className="relative isolate flex aspect-[4/5] w-full flex-col items-center overflow-hidden rounded-[7cqw] bg-[radial-gradient(120%_75%_at_50%_0%,#1f8f4e_0%,#14532d_48%,#052e16_100%)] px-[6cqw] pt-[5cqw] pb-[5cqw] text-center text-white shadow-[0_24px_60px_rgba(5,46,22,.45)]">
          {/* sunburst behind the photo — the logo's rising sun */}
          <div
            aria-hidden
            className="absolute top-[4%] left-1/2 -z-10 aspect-square w-[150%] -translate-x-1/2 bg-[repeating-conic-gradient(from_0deg,rgba(252,211,77,.16)_0deg_5deg,transparent_5deg_15deg)] [mask-image:radial-gradient(circle,#000_8%,transparent_58%)]"
          />
          <div
            aria-hidden
            className="absolute top-[16%] left-1/2 -z-10 size-[62%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,.38)_0%,transparent_65%)]"
          />
          {/* fields / river waves */}
          <svg
            aria-hidden
            viewBox="0 0 400 120"
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-0 -z-10 h-[30%] w-full"
          >
            <path
              d="M0 50 Q100 20 200 45 T400 35 V120 H0Z"
              fill="rgba(255,255,255,.05)"
            />
            <path
              d="M0 75 Q110 50 210 72 T400 62 V120 H0Z"
              fill="rgba(255,255,255,.06)"
            />
            <path
              d="M0 98 Q120 80 220 96 T400 88 V120 H0Z"
              fill="rgba(0,0,0,.18)"
            />
          </svg>

          <BrandLogo className="h-[10cqw]" />

          {/* photo */}
          <div className="relative mt-[3.5cqw]">
            <div className="rounded-full bg-[conic-gradient(from_180deg,#fcd34d,#f59e0b,#fde68a,#d97706,#fcd34d)] p-[1.3cqw] shadow-[0_0_10cqw_rgba(251,191,36,.45)]">
              <div className="rounded-full bg-[#14532d] p-[1cqw]">
                {m.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photo}
                    alt=""
                    crossOrigin="anonymous"
                    className="block size-[25cqw] rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-[25cqw] items-center justify-center rounded-full bg-[linear-gradient(135deg,#f0fdf4,#bbf7d0)] text-[10cqw] font-bold text-brand-dark">
                    {avatarInitials(m.name)}
                  </div>
                )}
              </div>
            </div>
            <span className="absolute -bottom-[2.8cqw] left-1/2 inline-flex -translate-x-1/2 items-center gap-[1cqw] rounded-full bg-[linear-gradient(90deg,#f59e0b,#fbbf24)] px-[3cqw] py-[0.8cqw] text-[3.8cqw] font-bold whitespace-nowrap text-[#052e16] shadow-[0_4px_14px_rgba(0,0,0,.3)]">
              <BadgeCheck className="size-[4.4cqw]" aria-hidden />
              গর্বিত সদস্য
            </span>
          </div>

          <div className="mt-[4.5cqw] text-[7.4cqw] leading-[1.25] font-bold [text-shadow:0_2px_12px_rgba(0,0,0,.3)]">
            {m.name}
          </div>
          <div className="mt-[1.5cqw] rounded-full border border-gold-300/50 bg-black/20 px-[3cqw] py-[0.4cqw] font-mono text-[4cqw] tracking-[0.08em] text-gold-300">
            {no}
          </div>

          {/* chips */}
          <div className="mt-[3.5cqw] grid w-full grid-cols-3 gap-[2cqw]">
            {[
              { k: "রক্তের গ্রুপ", v: m.blood_group || "—", red: true },
              { k: "পাড়া", v: m.para || "—" },
              { k: "সদস্য", v: `${bn(m.since)} থেকে` },
            ].map((c) => (
              <div
                key={c.k}
                className="flex flex-col items-center justify-center rounded-[3.5cqw] border border-white/15 bg-white/10 px-[1cqw] py-[1.8cqw]"
              >
                <span className="text-[3.3cqw] leading-tight opacity-75">
                  {c.k}
                </span>
                <span
                  className={
                    c.red
                      ? "flex items-center gap-[0.5cqw] text-[5.2cqw] leading-tight font-bold text-[#fecaca]"
                      : "max-w-full truncate text-[4.6cqw] leading-tight font-bold"
                  }
                >
                  {c.red && (
                    <Droplet
                      className="size-[3.6cqw] fill-current"
                      aria-hidden
                    />
                  )}
                  {c.v}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-[3.5cqw] mb-0 bg-[linear-gradient(90deg,#fde68a,#fbbf24)] bg-clip-text text-[4.9cqw] leading-[1.4] font-bold text-transparent">
            &ldquo;{tagline}&rdquo;
          </p>

          {/* verify strip */}
          <div aria-hidden className="min-h-[3cqw] flex-1" />
          <div className="flex w-full items-center gap-[3cqw] rounded-[3.5cqw] bg-white/95 p-[2cqw] text-left text-[#14532d]">
            <div className="w-[13cqw] flex-none rounded-[1.5cqw] bg-white">
              <QRCodeSVG
                value={verifyUrl}
                size={256}
                level="M"
                aria-label="যাচাই QR কোড"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <div className="min-w-0 leading-[1.3]">
              <div className="truncate text-[4cqw] font-bold">
                QR স্ক্যান করে যাচাই করুন
              </div>
              <div className="truncate font-mono text-[3.4cqw] text-[#44403c]">
                {shortUrl}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          size="xl"
          className="text-[17px]"
          loading={busy}
          loadingText="তৈরি হচ্ছে…"
          icon={<Download className="size-5" aria-hidden />}
          onClick={download}
        >
          ছবি ডাউনলোড
        </Button>
        <Button
          variant="gold"
          size="xl"
          className="text-[17px]"
          disabled={busy}
          icon={<Share2 className="size-5" aria-hidden />}
          onClick={share}
        >
          শেয়ার করুন
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(caption)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#25d366] text-[17px] font-bold text-white hover:bg-[#1ebe5b] hover:no-underline"
        >
          <MessageCircle className="size-5" aria-hidden />
          WhatsApp
        </a>
        <Button
          variant="outline"
          size="xl"
          className="text-[17px]"
          icon={<Copy className="size-5" aria-hidden />}
          onClick={copyCaption}
        >
          ক্যাপশন কপি
        </Button>
      </div>
      <p className="m-0 text-center text-[14px] text-muted">
        শেয়ার করা কার্ডের QR স্ক্যান করলে যে কেউ দেখতে পারবেন আপনি সত্যিই সদস্য।
      </p>
    </div>
  );
}
