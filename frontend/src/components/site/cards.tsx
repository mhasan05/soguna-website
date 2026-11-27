import Link from "next/link";
import { CalendarDays, Clock, Lock, MapPin, Pin } from "lucide-react";
import { Card, CategoryPill, Img, Pill } from "@/components/ui/primitives";
import { formatDate, MONTHS, bn } from "@/lib/bn";
import type { EventItem, NoticeItem } from "@/lib/api-types";
import { eventMeta, eventTime, eventWhen } from "@/lib/format";
import { cn } from "@/lib/cn";
import { RsvpButton } from "./rsvp";

export function NoticeCard({ notice, showPin = true }: { notice: NoticeItem; showPin?: boolean }) {
  const pinned = showPin && notice.is_pinned;
  return (
    <Link
      href={`/notices/${notice.slug}`}
      className={cn(
        "flex flex-col rounded-xl border bg-white p-[18px] text-ink shadow-card transition-colors hover:border-brand-200 hover:no-underline",
        pinned ? "border-gold-200" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {pinned && (
            <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-gold-700">
              <Pin className="size-4" aria-hidden />
              পিন করা
            </span>
          )}
          <CategoryPill category={notice.category} />
        </div>
        <span className="text-[15px] text-muted">{formatDate(notice.published_at)}</span>
      </div>
      <h3 className="mt-3 mb-1.5 text-[19px] leading-[1.45] font-semibold">{notice.title}</h3>
      {notice.members_only ? (
        <div className="flex items-center gap-2 rounded-lg bg-pill px-3 py-2.5 text-[16px] text-muted">
          <Lock className="size-[18px] flex-none" aria-hidden />
          সদস্য-কেবল নোটিশ — লগইন করে পড়ুন
        </div>
      ) : (
        <p className="m-0 line-clamp-2 text-[16px] text-muted">{notice.preview}</p>
      )}
    </Link>
  );
}

export function EventDateBlock({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <div className="flex w-[72px] flex-none flex-col items-center justify-center self-start rounded-[10px] border border-brand-100 bg-brand-50 py-2.5">
      <span className="text-[30px] leading-[1.1] font-bold text-brand">{bn(d.getDate())}</span>
      <span className="text-[14px] font-semibold text-brand-dark">{MONTHS[d.getMonth()]}</span>
    </div>
  );
}

/** Compact upcoming event card with RSVP (home page). */
export function EventRsvpCard({ event }: { event: EventItem }) {
  return (
    <Card className="flex gap-4 p-[18px]">
      <EventDateBlock iso={event.start_at} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="m-0 text-[19px] leading-[1.45] font-semibold">
          <Link href={`/events/${event.slug}`} className="text-ink hover:text-brand">
            {event.title}
          </Link>
        </h3>
        <div className="flex items-center gap-2 text-[16px] text-muted">
          <Clock className="size-[18px] flex-none" aria-hidden />
          {eventTime(event)}
        </div>
        <div className="flex items-start gap-2 text-[16px] leading-normal text-muted">
          <MapPin className="mt-0.5 size-[18px] flex-none" aria-hidden />
          {event.venue}
        </div>
        <div className="mt-2">
          <RsvpButton slug={event.slug} baseCount={event.going_count} />
        </div>
      </div>
    </Card>
  );
}

/** Cover-image event card (events list). */
export function EventCoverCard({ event }: { event: EventItem }) {
  const upcoming = event.status === "upcoming";
  const meta = eventMeta(event);
  return (
    <Link href={`/events/${event.slug}`} className="flex flex-col overflow-hidden rounded-xl border border-line bg-white text-ink shadow-card hover:border-brand-200 hover:no-underline">
      <div className="relative">
        <Img src={event.cover.replace("width=1400", "width=800")} alt={event.title} className="aspect-video w-full" />
        <Pill tone="white" className="absolute top-3 left-3">
          {event.category}
        </Pill>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-[18px] pt-4 pb-[18px]">
        <h3 className="m-0 text-[20px] leading-[1.4] font-semibold">{event.title}</h3>
        <div className="flex items-center gap-2 text-[16px] text-muted">
          <CalendarDays className="size-[18px] flex-none" aria-hidden />
          {upcoming ? eventWhen(event) : formatDate(event.start_at)}
        </div>
        <div className="flex items-start gap-2 text-[16px] text-muted">
          <MapPin className="mt-0.5 size-[18px] flex-none" aria-hidden />
          {event.venue}
        </div>
        <div className={cn("mt-auto pt-2.5 text-[16px] font-semibold", upcoming ? "text-brand" : "text-muted")}>{meta}</div>
      </div>
    </Link>
  );
}
