import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { NOTICE_CATEGORY_TONE } from "@/lib/content";

/* ───────────── Pills ───────────── */
export type PillTone = "green" | "success" | "gold" | "red" | "redSolid" | "neutral" | "done" | "white" | "goldSolid" | "greySolid";

const pillTones: Record<PillTone, string> = {
  green: "bg-brand-50 text-brand",
  success: "bg-success text-brand-dark",
  gold: "bg-gold-50 text-gold-800",
  red: "bg-blood-50 text-blood-700",
  redSolid: "bg-blood text-white",
  neutral: "bg-pill text-body",
  done: "bg-done text-done-ink",
  white: "bg-white text-brand-dark",
  goldSolid: "bg-gold text-white",
  greySolid: "bg-muted text-white",
};

export function Pill({ tone = "green", className, children, ...rest }: ComponentProps<"span"> & { tone?: PillTone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[14px] font-semibold leading-[1.6]", pillTones[tone], className)}
      {...rest}
    >
      {children}
    </span>
  );
}

export function CategoryPill({ category }: { category: string }) {
  return <Pill tone={NOTICE_CATEGORY_TONE[category] ?? "neutral"}>{category}</Pill>;
}

/* ───────────── Surfaces ───────────── */
export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-line bg-white shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function Stripe({ className, dark }: { className?: string; dark?: boolean }) {
  return <div aria-hidden className={cn("h-1.5", dark ? "stripe-dark" : "stripe", className)} />;
}

export function Avatar({
  label,
  size = 52,
  tone = "green",
  className,
}: {
  label: string;
  size?: number;
  tone?: "green" | "red" | "gold" | "white" | "photo";
  className?: string;
}) {
  const tones = {
    green: "bg-brand-50 text-brand",
    red: "bg-blood-50 text-blood",
    gold: "bg-gold-50 text-gold-700",
    white: "bg-white text-brand border-2 border-brand-100",
    photo: "photo-placeholder text-brand border-[3px] border-brand-50",
  };
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={cn("inline-flex flex-none items-center justify-center rounded-full font-bold", tones[tone], className)}
    >
      {label}
    </span>
  );
}

export function IconCircle({ tone = "green", size = 44, className, children }: { tone?: "green" | "red" | "gold"; size?: number; className?: string; children: ReactNode }) {
  const tones = { green: "bg-brand-50 text-brand", red: "bg-blood-50 text-blood", gold: "bg-gold-50 text-gold-700" };
  return (
    <span style={{ width: size, height: size }} className={cn("inline-flex flex-none items-center justify-center rounded-full", tones[tone], className)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, className, tone = "gold", height = 12 }: { value: number; className?: string; tone?: "gold" | "green" | "red"; height?: number }) {
  const fill = { gold: "bg-gold", green: "bg-brand", red: "bg-blood" }[tone];
  const track = { gold: "bg-progress", green: "bg-brand-50", red: "bg-blood-50" }[tone];
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      style={{ height }}
      className={cn("overflow-hidden rounded-full", track, className)}
    >
      <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ───────────── Headings ───────────── */
export function SeeAllLink({ href, children, tone = "green" }: { href: string; children: ReactNode; tone?: "green" | "red" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center gap-1.5 text-[17px] font-semibold hover:underline",
        tone === "red" ? "text-blood" : "text-brand",
      )}
    >
      {children}
      <ArrowRight className="size-[18px]" aria-hidden />
    </Link>
  );
}

export function SectionHeader({ title, href, linkLabel, className }: { title: ReactNode; href?: string; linkLabel?: string; className?: string }) {
  return (
    <div className={cn("mb-[18px] flex items-end justify-between gap-3", className)}>
      <h2 className="m-0 text-h2">{title}</h2>
      {href && linkLabel && <SeeAllLink href={href}>{linkLabel}</SeeAllLink>}
    </div>
  );
}

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="অবস্থান" className="text-[15px] text-muted">
      <Link href="/" className="text-muted hover:text-brand">
        হোম
      </Link>{" "}
      / <span aria-current="page">{current}</span>
    </nav>
  );
}

export function PageHeader({ crumb, title, subtitle, children, className }: { crumb?: string; title: ReactNode; subtitle?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {crumb && <Breadcrumb current={crumb} />}
      <h1 className="mt-1 mb-1.5 text-h1">{title}</h1>
      {subtitle && <p className="m-0 text-[17px] text-muted">{subtitle}</p>}
      {children}
    </div>
  );
}

export function BackLink({ href, children, className, light }: { href: string; children: ReactNode; className?: string; light?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 self-start text-[16px] font-semibold hover:underline",
        light ? "text-white" : "text-brand",
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden />
      {children}
    </Link>
  );
}

/* ───────────── States ───────────── */
export function EmptyState({
  icon,
  tone = "green",
  title,
  sub,
  action,
  className,
}: {
  icon: ReactNode;
  tone?: "green" | "red" | "gold";
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-field bg-white px-5 py-12 text-center", className)}>
      <IconCircle tone={tone} size={68}>
        {icon}
      </IconCircle>
      <div className="text-[18px] font-semibold">{title}</div>
      {sub && <p className="m-0 max-w-md text-[16px] text-muted">{sub}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse-soft rounded-md bg-track", className)} />;
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <Card className="flex flex-col gap-3 p-[18px]">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 bg-line" />
      </div>
      <Skeleton className="h-6 w-4/5 bg-line" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </Card>
  );
}

export function ListSkeleton({ count = 3, min = 300 }: { count?: number; min?: number }) {
  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: `repeat(auto-fit,minmax(min(${min}px,100%),1fr))` }} aria-busy aria-label="লোড হচ্ছে">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Info box variants used for success / pending / instructions. */
export function Notice({ tone = "green", className, children }: { tone?: "green" | "gold" | "red" | "neutral" | "goldLight"; className?: string; children: ReactNode }) {
  const tones = {
    green: "bg-brand-50",
    gold: "bg-gold-50",
    goldLight: "bg-gold-25 border border-gold-150 text-body",
    red: "bg-blood-50 border border-blood-200",
    neutral: "bg-pill text-muted",
  };
  return <div className={cn("rounded-[10px] px-4 py-3.5 text-[17px]", tones[tone], className)}>{children}</div>;
}

export function Img({ className, alt, ...rest }: ComponentProps<"img">) {
  // Plain <img>: photos are served as pre-sized WebP from the backend/CDN.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} loading="lazy" decoding="async" className={cn("block bg-photo object-cover", className)} {...rest} />;
}
