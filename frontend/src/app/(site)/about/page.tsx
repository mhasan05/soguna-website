import type { Metadata } from "next";
import { BookOpen, Droplet, Flag, LifeBuoy, Moon, Users } from "lucide-react";
import { Card, Img, Pill } from "@/components/ui/primitives";
import { ConstitutionAccordion } from "./constitution";
import { CONSTITUTION, MAP_EMBED, TIMELINE, VILLAGE_PLACES, photo } from "@/lib/content";
import { getSite } from "@/lib/server-api";
import { bn } from "@/lib/bn";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "আমাদের কথা" };

const GOALS = [
  { Icon: Users, tone: "green", title: "সমাজসেবা", text: "গ্রামের রাস্তা, মসজিদ-মাদ্রাসা ও স্কুলের কাজে স্বেচ্ছাশ্রম।" },
  { Icon: Droplet, tone: "red", title: "রক্তদান", text: "জরুরি সময়ে দ্রুত রক্তদাতা খুঁজে দেওয়া ও রক্তদান ক্যাম্প।" },
  { Icon: BookOpen, tone: "green", title: "শিক্ষা", text: "মেধাবী শিক্ষার্থীদের বৃত্তি, বই ও সংবর্ধনা।" },
  { Icon: Flag, tone: "green", title: "খেলাধুলা", text: "বার্ষিক ফুটবল ও ক্রিকেট টুর্নামেন্ট, তরুণদের মাঠে রাখা।" },
  { Icon: Moon, tone: "green", title: "ধর্মীয় কাজ", text: "ইফতার মাহফিল, ঈদে দুস্থদের সহায়তা ও জানাজার আয়োজন।" },
  { Icon: LifeBuoy, tone: "gold", title: "দুর্যোগে সহায়তা", text: "বন্যা ও নদীভাঙনে ত্রাণ, শীতে কম্বল বিতরণ।" },
] as const;

const toneClass = { green: "bg-brand-50 text-brand", red: "bg-blood-50 text-blood", gold: "bg-gold-50 text-gold-700" };

export default async function AboutPage() {
  const site = await getSite();
  return (
    <>
      <section className="relative overflow-hidden bg-brand-dark text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo("Bangladesh_Village_Landscape_(36143248590).jpg", 1400)} alt="সবুজ মাঠ ও গ্রাম" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,83,45,.4),rgba(20,83,45,.9))]" />
        <div className="wrap relative pt-[clamp(64px,8vw,104px)] pb-[clamp(36px,5vw,56px)]">
          <div className="text-[16px] opacity-90">হোম / আমাদের কথা</div>
          <h1 className="mt-1.5 mb-0 text-[clamp(30px,4vw,48px)] leading-[1.3] font-bold">আমাদের কথা</h1>
          <p className="mt-2 mb-0 max-w-[620px] text-lead opacity-95">সগুনার তরুণদের হাতে গড়া একটি অরাজনৈতিক সামাজিক সংগঠন।</p>
        </div>
      </section>

      <section className="wrap grid-fit-360 items-start gap-x-12 gap-y-6 pt-section">
        <div>
          <div className="text-[15px] font-semibold text-gold-700">প্রতিষ্ঠা {bn(site.founded_year)}</div>
          <h2 className="mt-1 mb-3 text-h2">যেভাবে শুরু হলো</h2>
          <p className="mt-0 mb-3 text-[17px] text-body">
            ২০১৮ সালের বর্ষায় যমুনার পানিতে সগুনার কয়েকটি পাড়া ডুবে যায়। তখন গ্রামের কয়েকজন তরুণ নিজেরা চাঁদা তুলে নৌকায় করে শুকনো খাবার আর ওষুধ পৌঁছে দেন। সেই কাজ থেকেই সগুনা আদর্শ যুব সমাজের জন্ম।
          </p>
          <p className="m-0 text-[17px] text-body">
            আজ {bn(site.stats.members)} জন সদস্য নিয়ে আমরা রক্তদান, শিক্ষা সহায়তা, খেলাধুলা আর বিপদে মানুষের পাশে থাকার কাজ করি। গ্রামের মুরুব্বি, ইমাম ও শিক্ষকেরা আমাদের পরামর্শ দেন।
          </p>
        </div>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {TIMELINE.map((t) => (
            <li key={t.year} className="flex items-start gap-3.5 rounded-xl border border-line bg-white px-4 py-3.5">
              <span className="min-w-16 flex-none text-[20px] font-bold text-brand">{bn(t.year)}</span>
              <span className="text-[16px] text-body">{t.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap pt-section">
        <h2 className="mt-0 mb-[18px] text-h2">লক্ষ্য ও উদ্দেশ্য</h2>
        <div className="grid-fit-300 gap-3.5">
          {GOALS.map(({ Icon, tone, title, text }) => (
            <Card key={title} className="flex gap-3.5 p-[18px] shadow-none">
              <span className={cn("flex size-12 flex-none items-center justify-center rounded-xl", toneClass[tone])}>
                <Icon className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="m-0 text-[19px] font-semibold">{title}</h3>
                <p className="mt-1 mb-0 text-muted">{text}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="wrap pt-section">
        <h2 className="mt-0 mb-[18px] text-h2">গ্রাম সগুনা</h2>
        <div className="grid-fit-360 items-start gap-x-8 gap-y-5">
          <div className="flex flex-col gap-3.5">
            <Img src={photo("Paddy_Field_Of_A_Village.jpg", 1000)} alt="গ্রামের ধানক্ষেত" className="aspect-[16/10] w-full rounded-xl" />
            <p className="m-0 text-[17px] text-body">
              সগুনা সিরাজগঞ্জ জেলার বেলকুচি উপজেলার একটি গ্রাম, যমুনা নদীর কাছে। বেলকুচি তাঁতশিল্পের জন্য পরিচিত — গ্রামের অনেক পরিবার তাঁত, কৃষি আর ছোট ব্যবসায় জীবিকা চালান। অনেকে ঢাকা ও বিদেশে কাজ করেন।
            </p>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="rounded-xl border border-line bg-white px-[18px] py-1.5">
              {VILLAGE_PLACES.map((p, i) => (
                <div key={p.name} className={cn("flex justify-between gap-3 py-3", i < VILLAGE_PLACES.length - 1 && "border-b border-divider")}>
                  <span className="text-[17px] font-semibold">{p.name}</span>
                  <span className="text-right text-[15px] text-muted">{p.kind}</span>
                </div>
              ))}
            </div>
            <iframe title="সগুনা, বেলকুচির মানচিত্র" src={MAP_EMBED} loading="lazy" className="h-[260px] w-full rounded-xl border border-line" />
          </div>
        </div>
      </section>

      <section className="wrap py-section">
        <div className="mb-[18px] flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="m-0 text-h2">গঠনতন্ত্রের মূল নিয়ম</h2>
          <Pill tone="gold">খসড়া — কমিটি চূড়ান্ত করবে</Pill>
        </div>
        <ConstitutionAccordion rules={CONSTITUTION} />
      </section>
    </>
  );
}
