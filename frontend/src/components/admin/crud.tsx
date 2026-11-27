"use client";

/**
 * Admin CRUD kit — one pattern for every list in the admin panel:
 *   list page  → <DataTable> rows with 👁 preview · ✎ edit · 🗑 delete icons
 *   preview    → <PreviewDrawer> (organised sections, slides in from the right)
 *   edit / new → its own page: <RecordEditor> (form sections + sticky save bar + delete)
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, ErrorSummary, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Img, Skeleton } from "@/components/ui/primitives";
import { ApiError, del, form, get, patch, post } from "@/lib/api";
import { digitsOnly } from "@/lib/bn";
import { cn } from "@/lib/cn";
import { useAdmin, type AdminSlug } from "./store";
import { AdminPage, Panel } from "./widgets";

type Id = number | string;

/* ───────────── Icon actions ───────────── */

const ICON_TONES = {
  neutral: "border-field text-body hover:bg-page hover:text-ink",
  brand: "border-brand-200 text-brand hover:bg-brand-50",
  danger: "border-blood-200 text-blood-700 hover:bg-blood-50",
  gold: "border-gold-200 text-gold-800 hover:bg-gold-50",
};

/** 40px square icon button (or link) with a tooltip and an accessible name. */
export function IconAction({
  label,
  icon,
  tone = "neutral",
  href,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  tone?: keyof typeof ICON_TONES;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const cls = cn(
    "inline-flex size-10 flex-none items-center justify-center rounded-lg border-[1.5px] bg-white transition-colors hover:no-underline disabled:cursor-not-allowed disabled:opacity-40",
    ICON_TONES[tone],
  );
  if (href)
    return (
      <Link href={href} title={label} aria-label={label} className={cls}>
        {icon}
      </Link>
    );
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className={cls}>
      {icon}
    </button>
  );
}

export const icons = {
  preview: <Eye className="size-[18px]" aria-hidden />,
  edit: <Pencil className="size-[17px]" aria-hidden />,
  delete: <Trash2 className="size-[18px]" aria-hidden />,
};

/* ───────────── Toolbar ───────────── */

/** Search box + filters + "নতুন" button above a table. */
export function Toolbar({ search, onSearch, placeholder = "খুঁজুন…", filters, addHref, addLabel, children }: { search?: string; onSearch?: (v: string) => void; placeholder?: string; filters?: ReactNode; addHref?: string; addLabel?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onSearch && (
        <label className="relative min-w-0 flex-[1_1_240px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            aria-label="খুঁজুন"
            className="h-12 w-full rounded-[10px] border-[1.5px] border-field bg-white pr-3 pl-11 text-[16px] outline-none focus:border-brand"
          />
        </label>
      )}
      {filters}
      <div className="ml-auto flex flex-wrap gap-2">
        {children}
        {addHref && (
          <LinkButton href={addHref} className="text-[16px]" icon={<Plus className="size-5" aria-hidden />}>
            {addLabel ?? "নতুন যোগ করুন"}
          </LinkButton>
        )}
      </div>
    </div>
  );
}

/** Compact filter select for toolbars. */
export function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} active={!!value} className="h-12 w-auto text-[16px]">
      {children}
    </Select>
  );
}

/* ───────────── Table ───────────── */

export interface Column<T> {
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hide on narrow screens to keep the table readable. */
  hideOnMobile?: boolean;
}

export function DataTable<T extends { id: Id }>({
  rows,
  columns,
  loading,
  error,
  empty = "কিছু পাওয়া যায়নি।",
  onPreview,
  editHref,
  onDelete,
  canDelete = () => true,
  actions,
  rowClassName,
  title,
  count,
}: {
  rows: T[] | null | undefined;
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  empty?: ReactNode;
  onPreview?: (row: T) => void;
  editHref?: (row: T) => string | null;
  onDelete?: (row: T) => void;
  canDelete?: (row: T) => boolean;
  /** Extra icon actions shown before the standard ones (approve, verify, …). */
  actions?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
  title?: ReactNode;
  count?: number;
}) {
  const hasActions = !!(onPreview || editHref || onDelete || actions);
  return (
    <Panel className="overflow-hidden">
      {title && (
        <div className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="m-0 text-[18px] font-bold">{title}</h2>
          {count !== undefined && <span className="text-[14px] text-muted">মোট {count.toLocaleString("bn-BD")}টি</span>}
        </div>
      )}
      {error && <p className="m-0 px-4 py-3 text-blood-700">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[16px]">
          <thead>
            <tr className="bg-page text-left text-[14px] text-muted">
              {columns.map((c) => (
                <th key={c.label} scope="col" className={cn("border-b border-line px-3 py-2.5 font-semibold whitespace-nowrap first:pl-4", c.hideOnMobile && "max-md:hidden", c.className)}>
                  {c.label}
                </th>
              ))}
              {hasActions && (
                <th scope="col" className="border-b border-line px-3 py-2.5 pr-4 text-right font-semibold">
                  কাজ
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length + 1} className="border-b border-divider px-4 py-3">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))}
            {(rows ?? []).map((r) => (
              <tr key={r.id} className={cn("transition-colors hover:bg-brand-50/40", rowClassName?.(r))}>
                {columns.map((c, i) => (
                  <td
                    key={c.label}
                    onClick={onPreview ? () => onPreview(r) : undefined}
                    className={cn("border-b border-divider px-3 py-3 align-middle first:pl-4", onPreview && "cursor-pointer", c.hideOnMobile && "max-md:hidden", i === 0 && "font-semibold", c.className)}
                  >
                    {c.render(r)}
                  </td>
                ))}
                {hasActions && (
                  <td className="border-b border-divider px-3 py-2.5 pr-4">
                    <div className="flex justify-end gap-1.5">
                      {actions?.(r)}
                      {onPreview && <IconAction label="দেখুন" icon={icons.preview} tone="brand" onClick={() => onPreview(r)} />}
                      {editHref && editHref(r) && <IconAction label="এডিট" icon={icons.edit} href={editHref(r)!} />}
                      {onDelete && canDelete(r) && <IconAction label="মুছুন" icon={icons.delete} tone="danger" onClick={() => onDelete(r)} />}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && rows && rows.length === 0 && <p className="m-0 px-4 py-10 text-center text-[16px] text-muted">{empty}</p>}
    </Panel>
  );
}

/** Small helper for a two-line cell: bold main text + muted sub text. */
export function Cell({ main, sub, image }: { main: ReactNode; sub?: ReactNode; image?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {image !== undefined && (image ? <Img src={image} alt="" className="h-11 w-16 flex-none rounded-md" /> : <span className="h-11 w-16 flex-none rounded-md bg-photo" />)}
      <div className="min-w-0">
        <div className="font-semibold text-ink">{main}</div>
        {sub && <div className="text-[14px] font-normal text-muted">{sub}</div>}
      </div>
    </div>
  );
}

/* ───────────── Preview drawer ───────────── */

export interface PreviewSection {
  title: string;
  rows?: [string, ReactNode][];
  /** Free content (long text, photo grid, attendee list…). */
  content?: ReactNode;
}

export interface PreviewData {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  image?: string | null;
  sections: PreviewSection[];
}

export function usePreview<T>() {
  const [item, setItem] = useState<T | null>(null);
  return { item, open: (x: T) => setItem(x), close: () => setItem(null) };
}

const empty = (v: ReactNode) => v === null || v === undefined || v === "" || v === false;

export function PreviewDrawer({ data, onClose, editHref, onDelete, actions }: { data: PreviewData | null; onClose: () => void; editHref?: string | null; onDelete?: () => void; actions?: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = !!data;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!data) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="বন্ধ করুন" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[rgba(20,30,25,.45)] backdrop-blur-[2px]" />
      <aside role="dialog" aria-modal="true" aria-labelledby="preview-title" className="relative flex h-full w-[min(580px,100%)] flex-col bg-white shadow-[-20px_0_50px_rgba(0,0,0,.18)]">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold tracking-wide text-brand uppercase">বিস্তারিত</div>
            <h2 id="preview-title" className="m-0 text-[21px] leading-[1.35] font-bold">
              {data.title}
            </h2>
            {data.subtitle && <div className="mt-0.5 text-[15px] text-muted">{data.subtitle}</div>}
            {data.badges && <div className="mt-2 flex flex-wrap gap-1.5">{data.badges}</div>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="বন্ধ করুন" className="flex size-10 flex-none items-center justify-center rounded-lg text-muted hover:bg-page hover:text-ink">
            <X className="size-6" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {data.image && <Img src={data.image} alt="" className="mb-4 aspect-[16/9] w-full rounded-xl" />}
          <div className="flex flex-col gap-4">
            {data.sections.map((s) => {
              const rows = (s.rows ?? []).filter(([, v]) => !empty(v));
              if (!rows.length && !s.content) return null;
              return (
                <section key={s.title} className="rounded-xl border border-line">
                  <h3 className="m-0 border-b border-line bg-page px-4 py-2.5 text-[15px] font-bold text-body">{s.title}</h3>
                  {rows.length > 0 && (
                    <dl className="m-0 divide-y divide-divider">
                      {rows.map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[minmax(110px,38%)_1fr] gap-3 px-4 py-2.5">
                          <dt className="text-[15px] text-muted">{k}</dt>
                          <dd className="m-0 min-w-0 text-[16px] font-medium break-words text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {s.content && <div className="px-4 py-3 text-[16px]">{s.content}</div>}
                </section>
              );
            })}
          </div>
        </div>

        {(editHref || onDelete || actions) && (
          <footer className="flex flex-wrap gap-2 border-t border-line px-5 py-3.5">
            {actions}
            {editHref && (
              <LinkButton href={editHref} className="flex-1 text-[16px]" icon={<Pencil className="size-[18px]" aria-hidden />}>
                এডিট করুন
              </LinkButton>
            )}
            {onDelete && (
              <Button variant="dangerOutline" className="text-[16px]" onClick={onDelete} icon={<Trash2 className="size-[18px]" aria-hidden />}>
                মুছুন
              </Button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

/** Multi-line text with paragraph breaks preserved. */
export function LongText({ text }: { text?: string | null }) {
  if (!text) return <span className="text-muted">—</span>;
  return <div className="whitespace-pre-line leading-[1.7] text-body">{text}</div>;
}

/* ───────────── Record editor (new / edit page) ───────────── */

export type Values = Record<string, unknown>;

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "tel" | "date" | "time" | "select" | "checkbox" | "image" | "file";
  options?: { value: string; label: string }[];
  /** Error message when empty (makes the field required). */
  required?: string;
  hint?: ReactNode;
  placeholder?: string;
  /** Span the full row. */
  wide?: boolean;
  rows?: number;
  accept?: string;
  /** For image/file fields: the record key holding the current URL. */
  current?: string;
  show?: (v: Values) => boolean;
  disabled?: boolean;
}

export interface SectionDef {
  title: string;
  description?: ReactNode;
  fields: FieldDef[];
}

/** `?id=` → editing that record; no id → new record. */
export function useEditId() {
  const id = useSearchParams().get("id");
  return id && id !== "new" ? id : null;
}

type RecordEditorProps<T extends { id: Id }> = Parameters<typeof RecordEditorInner<T>>[0];

/** Remounts per record so going from "new" to "?id=…" (e.g. after creating an album) starts fresh. */
export function RecordEditor<T extends { id: Id }>(props: RecordEditorProps<T>) {
  const id = useEditId();
  return <RecordEditorInner<T> key={id ?? "new"} {...props} />;
}

function RecordEditorInner<T extends { id: Id }>({
  slug,
  base,
  backHref,
  noun,
  sections,
  fromRecord,
  toBody,
  defaults = {},
  titleOf,
  canDelete = true,
  deleteWarn = "এটি অডিট লগে লেখা থাকবে।",
  afterSave,
  children,
  createLabel,
  nextHref,
}: {
  slug: AdminSlug;
  /** Collection endpoint, e.g. "/admin/members/" */
  base: string;
  backHref: string;
  /** "সদস্য", "নোটিশ" … used in titles and messages. */
  noun: string;
  sections: SectionDef[];
  fromRecord?: (r: T) => Values;
  toBody?: (v: Values, isNew: boolean) => Values;
  defaults?: Values;
  titleOf?: (r: T) => string;
  canDelete?: boolean;
  deleteWarn?: string;
  afterSave?: (saved: T, isNew: boolean) => void | Promise<void>;
  /** Extra panels (shown only when editing an existing record), e.g. photo manager. */
  children?: (record: T, reload: () => void) => ReactNode;
  createLabel?: string;
  /** Where to go after saving (default: back to the list). */
  nextHref?: (saved: T, isNew: boolean) => string;
}) {
  const id = useEditId();
  const isNew = !id;
  const router = useRouter();
  const { flash, fail, ask } = useAdmin();
  const [record, setRecord] = useState<T | null>(null);
  const [values, setValues] = useState<Values | null>(isNew ? defaults : null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [nonce, setNonce] = useState(0);
  const allFields = sections.flatMap((s) => s.fields);

  const initial = (r: T): Values => {
    const base: Values = {};
    for (const f of allFields) {
      if (f.type === "image" || f.type === "file") continue;
      const v = (r as Record<string, unknown>)[f.name];
      base[f.name] = f.type === "checkbox" ? !!v : v === null || v === undefined ? "" : String(v);
    }
    return { ...base, ...fromRecord?.(r) };
  };

  useEffect(() => {
    if (!id) return;
    let alive = true;
    get<T>(`${base}${id}/`).then(
      (r) => {
        if (!alive) return;
        setRecord(r);
        setValues((v) => v ?? initial(r));
      },
      (err) => alive && setLoadError(err instanceof Error ? err.message : "লোড করা যায়নি"),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, base, nonce]);

  const set = (name: string, v: unknown) => setValues((cur) => ({ ...cur, [name]: v }));
  /** A select whose value isn't among its options (e.g. options loaded later) uses the first option — what the browser shows. */
  const effective = (f: FieldDef, v: Values) => {
    const x = v[f.name];
    if (f.type !== "select" || !f.options?.length || f.options.some((o) => o.value === String(x ?? ""))) return x;
    return f.options[0].value;
  };

  const validate = (v: Values) => {
    const errs: Record<string, string> = {};
    for (const f of allFields) {
      if (!f.required || (f.show && !f.show(v))) continue;
      const x = effective(f, v);
      const missing = f.type === "image" || f.type === "file" ? !x && !(record && (record as Record<string, unknown>)[f.current ?? ""]) : x === undefined || x === null || String(x).trim() === "";
      if (missing) errs[f.name] = f.required;
    }
    return errs;
  };

  const serialise = (v: Values) => {
    const body: Values = {};
    const files: Values = {};
    for (const f of allFields) {
      if (f.show && !f.show(v)) continue;
      const x = effective(f, v);
      if (f.type === "image" || f.type === "file") {
        if (x instanceof File) files[f.name] = x;
      } else if (f.type === "number") body[f.name] = digitsOnly(String(x ?? "")) || null;
      else if (f.type === "checkbox") body[f.name] = !!x;
      else body[f.name] = typeof x === "string" ? x.trim() : x;
    }
    return { body: toBody ? toBody({ ...body, ...pickExtra(v) }, isNew) : body, files };
  };

  const pickExtra = (v: Values) => Object.fromEntries(Object.entries(v).filter(([k]) => !allFields.some((f) => f.name === k)));

  const save = async () => {
    if (!values) return;
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const { body, files } = serialise(values);
    const hasFiles = Object.keys(files).length > 0;
    setSaving(true);
    try {
      let saved: T;
      if (isNew) {
        saved = await post<T>(base, hasFiles ? form({ ...body, ...files }) : body);
      } else {
        saved = await patch<T>(`${base}${id}/`, body);
        if (hasFiles) saved = await patch<T>(`${base}${id}/`, form(files));
      }
      await afterSave?.(saved, isNew);
      flash(isNew ? `নতুন ${noun} যোগ হয়েছে · অডিট লগে লেখা হলো` : `${noun} সংরক্ষণ হয়েছে · অডিট লগে লেখা হলো`);
      router.push(nextHref?.(saved, isNew) ?? backHref);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      fail(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    record &&
    ask({
      text: `"${titleOf?.(record) ?? noun}" মুছে ফেলবেন?`,
      warn: deleteWarn,
      onYes: async () => {
        try {
          await del(`${base}${record.id}/`);
          flash(`${noun} মুছে ফেলা হয়েছে · অডিট লগে লেখা হলো`);
          router.push(backHref);
        } catch (err) {
          fail(err);
        }
      },
    });

  const title = isNew ? (createLabel ?? `নতুন ${noun}`) : record ? `${noun} এডিট: ${titleOf?.(record) ?? ""}` : `${noun} এডিট`;
  const errorCount = Object.keys(errors).length;

  return (
    <AdminPage slug={slug} title={title} back={{ href: backHref, label: "তালিকায় ফিরুন" }}>
      {loadError && <Panel className="p-5 text-blood-700">{loadError}</Panel>}
      {!values && !loadError && <Skeleton className="h-96 w-full" />}
      {values && (
        <form
          noValidate
          className="flex flex-col gap-4 pb-24"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <ErrorSummary count={errorCount} />
          {sections.map((s) => {
            const visible = s.fields.filter((f) => !f.show || f.show(values));
            if (!visible.length) return null;
            return (
              <Panel key={s.title} className="p-[clamp(16px,2vw,24px)]">
                <h2 className="m-0 text-[19px] font-bold">{s.title}</h2>
                {s.description && <p className="mt-1 mb-0 text-[15px] text-muted">{s.description}</p>}
                <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
                  {visible.map((f) => (
                    <FieldInput key={f.name} f={f} value={effective(f, values)} error={errors[f.name]} current={record && f.current ? String((record as Record<string, unknown>)[f.current] ?? "") : ""} onChange={(v) => set(f.name, v)} />
                  ))}
                </div>
              </Panel>
            );
          })}
          {record && children?.(record, () => setNonce((n) => n + 1))}

          <div className="sticky bottom-0 z-10 -mx-[clamp(16px,2.4vw,32px)] flex flex-wrap items-center gap-2 border-t border-line bg-white/95 px-[clamp(16px,2.4vw,32px)] py-3 backdrop-blur">
            <Button type="submit" size="lg" className="px-7 text-[17px] font-bold" loading={saving} loadingText="সংরক্ষণ হচ্ছে…">
              {isNew ? "যোগ করুন" : "সংরক্ষণ করুন"}
            </Button>
            <LinkButton href={backHref} variant="neutral" size="lg" className="text-[16px]">
              বাতিল
            </LinkButton>
            {!isNew && canDelete && record && (
              <Button variant="dangerOutline" size="lg" className="ml-auto text-[16px]" onClick={remove} icon={<Trash2 className="size-[18px]" aria-hidden />}>
                মুছে ফেলুন
              </Button>
            )}
          </div>
        </form>
      )}
    </AdminPage>
  );
}

function FieldInput({ f, value, error, current, onChange }: { f: FieldDef; value: unknown; error?: string; current: string; onChange: (v: unknown) => void }) {
  const id = `f-${f.name}`;
  const wide = f.wide || f.type === "textarea" || f.type === "image" || f.type === "file";
  const common = { id, disabled: f.disabled, "aria-invalid": !!error || undefined };
  const str = value === undefined || value === null ? "" : String(value);

  if (f.type === "checkbox")
    return (
      <div className={cn(wide && "md:col-span-2")}>
        <Checkbox id={id} checked={!!value} disabled={f.disabled} onChange={(e) => onChange(e.target.checked)} className="rounded-[10px] border border-line bg-page px-3.5 py-1">
          <span>
            {f.label}
            {f.hint && <span className="block text-[14px] text-muted">{f.hint}</span>}
          </span>
        </Checkbox>
      </div>
    );

  let control: ReactNode;
  if (f.type === "textarea") control = <Textarea {...common} rows={f.rows ?? 5} value={str} invalid={!!error} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
  else if (f.type === "select")
    control = (
      <Select {...common} value={str} invalid={!!error} onChange={(e) => onChange(e.target.value)}>
        {(f.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  else if (f.type === "image" || f.type === "file") control = <FilePicker f={f} value={value instanceof File ? value : null} current={current} onChange={onChange} />;
  else
    control = (
      <Input
        {...common}
        type={f.type === "date" || f.type === "time" ? f.type : "text"}
        inputMode={f.type === "number" ? "numeric" : f.type === "tel" ? "tel" : undefined}
        value={str}
        invalid={!!error}
        placeholder={f.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );

  return (
    <Field label={f.label} htmlFor={id} error={error} hint={f.hint} optional={f.required ? undefined : "ঐচ্ছিক"} className={cn(wide && "md:col-span-2")}>
      {control}
    </Field>
  );
}

function FilePicker({ f, value, current, onChange }: { f: FieldDef; value: File | null; current: string; onChange: (v: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const blobUrl = useMemo(() => (value && f.type === "image" ? URL.createObjectURL(value) : null), [value, f.type]);
  useEffect(() => () => void (blobUrl && URL.revokeObjectURL(blobUrl)), [blobUrl]);
  const shown = value ? blobUrl : current;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[10px] border-2 border-dashed border-brand-200 bg-brand-50/50 p-3">
      {f.type === "image" && (shown ? <Img src={shown} alt="" className="h-24 w-36 rounded-lg" /> : <span className="flex h-24 w-36 items-center justify-center rounded-lg bg-photo text-[14px] text-muted">ছবি নেই</span>)}
      {f.type === "file" && current && !value && (
        <a href={current} target="_blank" rel="noreferrer" className="text-[15px] font-semibold">
          বর্তমান ফাইল দেখুন ↗
        </a>
      )}
      <div className="flex flex-col gap-1.5">
        <input id={`f-${f.name}`} ref={ref} type="file" accept={f.accept ?? (f.type === "image" ? "image/*" : undefined)} className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        <Button variant="outline" className="text-[15px]" onClick={() => ref.current?.click()}>
          {value ? "অন্য ফাইল বাছুন" : current ? "বদলান" : "ফাইল বাছুন"}
        </Button>
        {value && <span className="max-w-[240px] truncate text-[14px] text-muted">{value.name}</span>}
      </div>
    </div>
  );
}

/** Back link used on edit pages. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-10 items-center gap-1.5 self-start text-[16px] font-semibold">
      <ArrowLeft className="size-[18px]" aria-hidden />
      {label}
    </Link>
  );
}
