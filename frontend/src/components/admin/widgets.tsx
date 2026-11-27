"use client";

import Link from "next/link";
import { useState, type ComponentProps, type ReactNode } from "react";
import { ArrowLeft, Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ADMIN_PAGES, useAdmin } from "./store";

export function Panel({ className, children, accent, ...rest }: ComponentProps<"div"> & { accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-white", accent ? "border-[1.5px] border-gold-200" : "border-line", className)} {...rest}>
      {children}
    </div>
  );
}

export function PanelTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("mt-3 mb-1 text-[19px] font-bold", className)}>{children}</h2>;
}

/** Small row action buttons (40px). */
export function RowBtn({ tone = "neutral", className, ...rest }: ComponentProps<"button"> & { tone?: "neutral" | "danger" | "green" | "primary" }) {
  const tones = {
    neutral: "border-[1.5px] border-field bg-white text-body hover:bg-page",
    danger: "border-[1.5px] border-blood-300 bg-white text-blood-700 hover:bg-blood-50",
    green: "border-[1.5px] border-brand bg-white text-brand hover:bg-brand-50",
    primary: "bg-brand text-white hover:bg-brand-dark",
  };
  return <button type="button" className={cn("h-10 rounded-lg px-3 text-[15px] font-semibold whitespace-nowrap", tones[tone], className)} {...rest} />;
}

export function Reorder({ onUp, onDown, label }: { onUp: () => void; onDown: () => void; label?: string }) {
  return (
    <div className="flex flex-none flex-col">
      <button type="button" onClick={onUp} aria-label={`${label ?? ""} উপরে`} className="h-6 w-9 text-[14px] text-muted hover:text-ink">
        ▲
      </button>
      <button type="button" onClick={onDown} aria-label={`${label ?? ""} নিচে`} className="h-6 w-9 text-[14px] text-muted hover:text-ink">
        ▼
      </button>
    </div>
  );
}

/** Inline rename input with save / cancel. */
export function InlineEditor({ initial, onSave, onCancel }: { initial: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const save = () => v.trim() && onSave(v.trim());
  return (
    <div className="flex min-w-0 flex-[1_1_220px] gap-1.5">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onCancel();
        }}
        aria-label="নতুন নাম"
        className="h-11 min-w-0 flex-1 rounded-lg border-2 border-brand px-2.5 text-[16px] outline-none"
      />
      <button type="button" onClick={save} className="h-11 rounded-lg bg-brand px-3 text-[15px] font-semibold text-white">
        সংরক্ষণ
      </button>
      <button type="button" onClick={onCancel} aria-label="বাতিল" className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-field bg-white text-muted">
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

/** Which row is being renamed (one at a time per list). */
export function useEditing() {
  const [id, setId] = useState<string | null>(null);
  return { id, start: (x: string) => setId(x), stop: () => setId(null), is: (x: string) => id === x };
}

export function StatusPill({ on, onLabel, offLabel, onClick, offTone = "neutral" }: { on: boolean; onLabel: string; offLabel: string; onClick?: () => void; offTone?: "neutral" | "gold" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="চাপলে অবস্থা বদলাবে"
      className={cn(
        "h-[34px] rounded-full px-2.5 text-[14px] font-semibold whitespace-nowrap",
        on ? "bg-success text-brand-dark" : offTone === "gold" ? "bg-gold-50 text-gold-800" : "bg-pill text-muted",
      )}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}

/** Page frame: H1, "সাইট দেখুন →", optional back link, and role access check. */
export function AdminPage({ slug, children, intro, title, back }: { slug: (typeof ADMIN_PAGES)[number]["slug"]; children: ReactNode; intro?: ReactNode; title?: string; back?: { href: string; label: string } }) {
  const { canAccess } = useAdmin();
  const page = ADMIN_PAGES.find((p) => p.slug === slug)!;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          {back ? (
            <Link href={back.href} className="inline-flex min-h-8 items-center gap-1 text-[15px] font-semibold">
              <ArrowLeft className="size-4" aria-hidden />
              {page.label} · {back.label}
            </Link>
          ) : (
            <div className="text-[14px] text-muted">অ্যাডমিন প্যানেল</div>
          )}
          <h1 className="m-0 text-[clamp(24px,2.6vw,32px)] leading-[1.3] font-bold">{title ?? page.label}</h1>
        </div>
        <Link href="/" className="inline-flex min-h-11 items-center text-[16px] font-semibold">
          সাইট দেখুন →
        </Link>
      </div>
      {canAccess(slug) ? (
        <>
          {intro}
          {children}
        </>
      ) : (
        <Panel className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <Lock className="size-8 text-muted" aria-hidden />
          <div className="text-[18px] font-semibold">এই পাতা আপনার রোলের জন্য নয়</div>
          <p className="m-0 text-[16px] text-muted">দরকার হলে সভাপতি বা সাধারণ সম্পাদকের সাথে যোগাযোগ করুন।</p>
        </Panel>
      )}
    </>
  );
}

export function AdminTable({ children, minWidth = 760 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[16px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}
