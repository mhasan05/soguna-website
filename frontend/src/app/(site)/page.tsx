import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, Droplet, HeartHandshake, MapPin, UserRound, UsersRound } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Avatar, Card, Img, Pill, SectionHeader, SeeAllLink } from "@/components/ui/primitives";
import { EventRsvpCard, NoticeCard } from "@/components/site/cards";
import { AidFundCard } from "@/components/site/aid-card";
import { WhatsAppShare } from "@/components/site/share";
import { HeroSlideshow } from "@/components/site/hero-slideshow";
import { getAidFunds, getCommittee, getEvents, getNotices, getSite } from "@/lib/server-api";
import { photo } from "@/lib/content";
import { eventMeta, eventWhen } from "@/lib/format";
import { avatarInitials, bn, formatDate } from "@/lib/bn";
import { BLOOD_GROUPS } from "@/lib/types";

export default async function HomePage() {
  const [site, notices, upcomingAll, completed, allFunds, committee] = await Promise.all([getSite(), getNotices(), getEvents("upcoming"), getEvents("completed"), getAidFunds(), getCommittee()]);
  const urgent = notices.find((n) => n.is_urgent);
  const latest = notices.filter((n) => !n.is_urgent && !n.members_only).slice(0, 3);
  const upcoming = upcomingAll.filter((e) => !e.meta_note).slice(0, 2);
  const works = completed.slice(0, 3);
  const funds = allFunds.slice(0, 2);
  const next = upcomingAll[0];
  // "আমরা সগুনার তরুণ, আমরা এক সাথে" → white first line, gold second line
  const cut = site.hero_title.search(/[,،।]/);
  const heroLead = cut > 0 ? site.hero_title.slice(0, cut + 1) : site.hero_title;
  const heroRest = cut > 0 ? site.hero_title.slice(cut + 1).trim() : "";
  const leaders = (committee.current?.members ?? []).filter((c) => ["সভাপতি", "সাধারণ সম্পাদক", "কোষাধ্যক্ষ"].includes(c.title));
  const stats = [
    { value: site.stats.members, label: "মোট সদস্য" },
    { value: site.stats.donors, label: "রক্তদাতা" },
    { value: site.stats.completed_events, label: "সম্পন্ন কার্যক্রম" },
    { value: site.stats.families_helped, label: "সাহায্য পেয়েছেন এমন পরিবার" },
  ];

  return (
    <>
      {/* 01 Hero */}
      <section className="relative isolate overflow-hidden bg-brand-dark">
        <HeroSlideshow slides={site.hero_slides?.length ? site.hero_slides : [{ image: site.hero_image || photo("Village_river.jpg", 1920), alt: "সগুনার পাশ দিয়ে বয়ে যাওয়া গ্রামের নদী" }]} />
        <div className="wrap relative grid min-h-[max(540px,calc(100svh-136px))] items-center gap-10 pt-[clamp(48px,7vw,96px)] pb-[clamp(96px,9vw,128px)] nav:min-h-[max(600px,calc(100svh-68px))] lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="max-w-[760px] text-white">
            <div className="inline-flex animate-hero-in items-center gap-2.5 rounded-full border border-white/20 bg-white/10 py-1.5 pr-4 pl-3 text-[15px] backdrop-blur-sm">
              <span className="relative flex size-2.5">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-gold-300" />
                <span className="relative size-2.5 rounded-full bg-gold-300" />
              </span>
              <MapPin className="size-4 opacity-90" aria-hidden />
              সগুনা, বেলকুচি, সিরাজগঞ্জ
              <span className="opacity-60">·</span>
              প্রতিষ্ঠা {bn(site.founded_year)}
            </div>

            <h1 className="mt-6 mb-0 animate-hero-in text-[clamp(38px,6.2vw,84px)] leading-[1.15] font-bold tracking-[-0.01em] text-balance [animation-delay:120ms] [text-shadow:0_2px_24px_rgba(0,0,0,.35)]">
              {heroLead}
              {heroRest && (
                <>
                  <br />
                  <span className="bg-[linear-gradient(90deg,#fcd34d,#f59e0b)] bg-clip-text text-transparent">{heroRest}</span>
                </>
              )}
            </h1>
            <div aria-hidden className="mt-6 h-1.5 w-24 animate-hero-in rounded-full bg-[linear-gradient(90deg,#f59e0b,#fcd34d)] [animation-delay:220ms]" />
            <p className="mt-6 mb-0 max-w-[600px] animate-hero-in text-[clamp(18px,1.7vw,22px)] leading-[1.65] text-white/90 [animation-delay:300ms]">{site.hero_subtitle}</p>

            <div className="mt-9 flex animate-hero-in flex-wrap gap-3 [animation-delay:420ms]">
              <LinkButton href="/register" variant="gold" size="lg" className="h-14 px-7 text-[18px] shadow-[0_10px_30px_rgba(217,119,6,.45)] transition-transform hover:-translate-y-0.5" icon={<UserRound className="size-5" aria-hidden />}>
                সদস্য হোন
              </LinkButton>
              <LinkButton href="/donate" variant="white" size="lg" className="h-14 px-7 text-[18px] transition-transform hover:-translate-y-0.5" icon={<HeartHandshake className="size-5" aria-hidden />}>
                দান করুন
              </LinkButton>
            </div>

            <div className="mt-9 flex animate-hero-in flex-wrap items-center gap-x-6 gap-y-3 text-[16px] text-white/85 [animation-delay:540ms]">
              <span className="flex items-center gap-2">
                <UsersRound className="size-5 text-gold-300" aria-hidden />
                <strong className="text-white">{bn(site.stats.members)}</strong> জন সদস্য
              </span>
              <span aria-hidden className="hidden h-5 w-px bg-white/25 sm:block" />
              <span className="flex items-center gap-2">
                <Droplet className="size-5 text-gold-300" aria-hidden />
                <strong className="text-white">{bn(site.stats.donors)}</strong> জন রক্তদাতা
              </span>
              <span aria-hidden className="hidden h-5 w-px bg-white/25 sm:block" />
              <Link href="/blood" className="flex items-center gap-1.5 font-semibold text-white underline-offset-4 hover:underline">
                জরুরি রক্ত খুঁজুন
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>

          {next && (
            <Link
              href={`/events/${next.slug}`}
              className="group hidden animate-hero-in self-center rounded-2xl border border-white/20 bg-white/10 p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,.3)] backdrop-blur-md transition-colors [animation-delay:650ms] hover:bg-white/15 hover:no-underline lg:block"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-2.5 py-0.5 text-[13px] font-bold">
                <CalendarDays className="size-3.5" aria-hidden />
                পরবর্তী কার্যক্রম
              </span>
              {next.cover && <Img src={next.cover} alt="" className="mt-4 aspect-[16/9] w-full rounded-xl" />}
              <div className="mt-4 text-[21px] leading-[1.35] font-bold">{next.title}</div>
              <div className="mt-2 flex flex-col gap-1 text-[15px] text-white/85">
                <span>{eventWhen(next)}</span>
                {next.venue && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 flex-none" aria-hidden />
                    {next.venue}
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3.5 text-[15px]">
                <span className="text-white/85">{eventMeta(next)}</span>
                <span className="flex items-center gap-1 font-semibold text-gold-300">
                  বিস্তারিত
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* 02 Stats */}
      <section className="bg-brand-50" aria-labelledby="stats-h">
        <div className="wrap py-[clamp(36px,5vw,56px)]">
          <h2 id="stats-h" className="mt-0 mb-[18px] text-h2-sm">
            সংখ্যায় আমরা
          </h2>
          <div className="grid-fit-150 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-brand-100 bg-white px-4 py-[18px] shadow-card">
                <div className="text-stat text-brand">{bn(s.value)}</div>
                <div className="mt-1.5 text-[16px] leading-[1.4] text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 Urgent notice — hidden when none */}
      {urgent && (
        <section aria-label="জরুরি নোটিশ">
          <div className="wrap pt-[clamp(28px,4vw,44px)]">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border-[1.5px] border-blood bg-blood-50 p-[18px]">
              <div className="min-w-0 flex-[1_1_420px]">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="redSolid">
                    <AlertTriangle className="size-4" aria-hidden />
                    জরুরি · {urgent.category}
                  </Pill>
                  <span className="text-[15px] text-muted">{formatDate(urgent.published_at)}</span>
                </div>
                <p className="mt-2.5 mb-0 text-[18px] text-ink">
                  {urgent.highlight && <strong>{urgent.highlight} </strong>}
                  {urgent.summary || urgent.preview}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <WhatsAppShare title={urgent.title} path={`/notices/${urgent.slug}`} variant="bloodOutline" size="md" />
                <LinkButton href={`/notices/${urgent.slug}`} variant="blood">
                  বিস্তারিত
                </LinkButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 04 Latest notices */}
      <section className="wrap pt-section">
        <SectionHeader title="সর্বশেষ নোটিশ" href="/notices" linkLabel="সব দেখুন" />
        <div className="grid-fit-300 gap-3.5">
          {latest.map((n) => (
            <NoticeCard key={n.slug} notice={n} showPin={false} />
          ))}
        </div>
      </section>

      {/* 05 Upcoming events */}
      <section className="wrap pt-section">
        <SectionHeader title="আসন্ন ইভেন্ট" href="/events" linkLabel="সব কার্যক্রম" />
        <div className="grid-fit-320 gap-3.5">
          {upcoming.map((e) => (
            <EventRsvpCard key={e.slug} event={e} />
          ))}
        </div>
      </section>

      {/* 06 Blood quick search */}
      <section className="wrap pt-section">
        <Card className="p-[clamp(18px,2.6vw,32px)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-11 flex-none items-center justify-center rounded-full bg-blood-50 text-blood">
              <Droplet className="size-6" aria-hidden />
            </span>
            <h2 className="m-0 text-h2">রক্তদাতা খুঁজুন</h2>
          </div>
          <p className="mt-2.5 mb-[18px] text-[17px] text-muted">রক্তের গ্রুপ চাপুন — সগুনার রক্তদাতাদের তালিকা খুলবে।</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(68px,1fr))] gap-2.5">
            {BLOOD_GROUPS.map((g) => (
              <Link
                key={g}
                href={`/blood?group=${encodeURIComponent(g)}`}
                className="flex h-[60px] items-center justify-center rounded-[10px] border-[1.5px] border-blood bg-white text-[22px] font-bold text-blood transition-colors hover:bg-blood hover:text-white hover:no-underline"
              >
                {g}
              </Link>
            ))}
          </div>
          <div className="mt-[18px] flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-divider pt-4">
            <span className="text-[16px] text-muted">জরুরি রক্ত দরকার? কোনো অনুমোদন লাগে না।</span>
            <SeeAllLink href="/blood#request" tone="red">
              রক্তের অনুরোধ পাঠান
            </SeeAllLink>
          </div>
        </Card>
      </section>

      {/* 07 Our work */}
      <section className="wrap pt-section">
        <SectionHeader title="আমাদের কাজ" href="/events?tab=completed" linkLabel="সব দেখুন" />
        <div className="grid-fit-300 gap-3.5">
          {works.map((w) => (
            <Link key={w.slug} href={`/events/${w.slug}`} className="block overflow-hidden rounded-xl border border-line bg-white text-ink shadow-card hover:border-brand-200 hover:no-underline">
              <Img src={w.cover.replace("width=1400", "width=800")} alt={w.title} className="aspect-[16/10] w-full" />
              <div className="px-[18px] pt-4 pb-[18px]">
                <Pill tone="green">{w.category}</Pill>
                <h3 className="mt-2.5 mb-1 text-[19px] leading-[1.45] font-semibold">{w.title}</h3>
                <div className="text-[16px] text-muted">{eventMeta(w)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 08 Running aid funds — hidden when none */}
      {funds.length > 0 && (
        <section className="wrap pt-section">
          <SectionHeader title="চলমান সাহায্য তহবিল" href="/aid" linkLabel="সব আবেদন" />
          <div className="grid-fit-340 gap-3.5">
            {funds.map((f) => (
              <AidFundCard key={f.id} fund={f} />
            ))}
          </div>
        </section>
      )}

      {/* 09 Committee preview */}
      <section className="wrap pt-section">
        <SectionHeader title="কার্যনির্বাহী কমিটি" href="/committee" linkLabel="পুরো কমিটি" />
        <div className="grid-fit-260 gap-3.5">
          {leaders.map((c) => (
            <Card key={c.id} className="flex items-center gap-4 p-[18px]">
              {c.photo ? <Img src={c.photo} alt={c.name} className="size-20 flex-none rounded-full" /> : <Avatar label={avatarInitials(c.name)} size={80} tone="photo" />}
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-brand">{c.title}</div>
                <div className="text-[19px] leading-[1.4] font-semibold">{c.name}</div>
                <div className="text-[15px] text-muted">{c.para}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 10 Join CTA */}
      <section className="wrap py-section">
        <div className="overflow-hidden rounded-2xl bg-brand text-white">
          <Img src={photo("A_conversation_session_of_village_people.jpg", 1000)} alt="গ্রামের মানুষের আড্ডা" className="h-[clamp(180px,22vw,280px)] w-full" />
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 p-[clamp(24px,4vw,48px)]">
            <div className="min-w-0 flex-[1_1_420px]">
              <h2 className="m-0 text-[clamp(26px,3vw,38px)] leading-[1.3] font-bold">সগুনার জন্য কিছু করতে চান? আমাদের সাথে যোগ দিন।</h2>
              <p className="mt-2.5 mb-0 text-[18px] opacity-95">ইতিমধ্যে {bn(site.stats.members)} জন যুক্ত আছেন। শুধু ফোন নম্বর দিয়ে নিবন্ধন — কোনো পাসওয়ার্ড লাগবে না।</p>
            </div>
            <LinkButton href="/register" variant="gold" size="xl" className="h-14 px-8 text-[20px]" iconRight={<ArrowRight className="size-5" aria-hidden />}>
              সদস্য হোন
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
