"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { bn } from "@/lib/bn";

/* ───────────── Field wrapper (label above, helper/error below) ───────────── */
export function Field({
  label,
  hint,
  error,
  valid,
  required,
  optional,
  children,
  className,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  valid?: boolean;
  required?: boolean;
  optional?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[16px] font-semibold sm:text-[17px]">
        {label}
        {required && <span className="text-blood"> *</span>}
        {optional && <span className="font-normal text-muted"> ({optional})</span>}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-[15px] font-semibold text-blood-700">
          {error}
        </span>
      ) : valid ? (
        <span className="inline-flex items-center gap-1 text-[15px] font-semibold text-brand">
          <Check className="size-4" aria-hidden /> ঠিক আছে
        </span>
      ) : hint ? (
        <span className="text-[15px] text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

const fieldBase =
  "min-w-0 rounded-[10px] border-[1.5px] border-field bg-white px-3.5 text-[17px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus-visible:outline-none";
/** Full width unless the caller sets its own width. */
const width = (className?: string) => (/(^|\s)(w-|flex-)/.test(className ?? "") ? "" : "w-full");
const fieldError = "border-2 border-blood bg-error-field focus:border-blood";
const fieldValid = "border-2 border-brand";

export function Input({
  invalid,
  valid,
  size = "md",
  className,
  ...rest
}: Omit<ComponentProps<"input">, "size"> & { invalid?: boolean; valid?: boolean; size?: "md" | "lg" }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, width(className), "read-only:bg-pill", size === "lg" ? "h-14 text-[18px]" : "h-[52px]", invalid && fieldError, valid && !invalid && fieldValid, className)}
      {...rest}
    />
  );
}

export function Textarea({ invalid, className, ...rest }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cn(fieldBase, "w-full resize-y py-3", invalid && fieldError, className)} {...rest} />;
}

export function Select({
  invalid,
  active,
  size = "md",
  className,
  children,
  ...rest
}: Omit<ComponentProps<"select">, "size"> & { invalid?: boolean; active?: boolean; size?: "sm" | "md" | "lg" }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        width(className),
        "select-chevron pr-10",
        size === "lg" ? "h-14 text-[18px]" : size === "sm" ? "h-10 rounded-lg px-2 pr-8 text-[15px]" : "h-[52px]",
        active && "border-brand",
        invalid && fieldError,
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

/** Input with a fixed prefix box (+৮৮, ৳). */
export function PrefixInput({
  prefix,
  strong,
  invalid,
  className,
  inputClassName,
  ...rest
}: ComponentProps<"input"> & { prefix: ReactNode; strong?: boolean; invalid?: boolean; inputClassName?: string }) {
  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-xl border-[1.5px] border-field bg-white focus-within:border-brand",
        strong && "h-[60px] border-2 border-brand",
        !strong && "h-14 rounded-[10px]",
        invalid && "border-2 border-blood bg-error-field",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center px-3.5 font-semibold",
          strong ? "border-r border-brand-100 bg-brand-50 text-[20px] text-brand-dark" : "bg-page text-[20px] font-bold text-muted",
        )}
      >
        {prefix}
      </span>
      <input aria-invalid={invalid || undefined} className={cn("min-w-0 flex-1 border-none bg-transparent px-3.5 outline-none", inputClassName)} {...rest} />
    </div>
  );
}

/* ───────────── Toggle switch (60×34) ───────────── */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[34px] w-[60px] flex-none rounded-full transition-colors disabled:opacity-60",
        checked ? "bg-brand" : "bg-field",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] size-7 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-[left]",
          checked ? "left-[29px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

export function ToggleRow({
  title,
  sub,
  checked,
  onChange,
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-14 items-center justify-between gap-3", className)}>
      <div>
        <div className="text-[17px] font-semibold">{title}</div>
        {sub && <div className="text-[15px] text-muted">{sub}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={typeof title === "string" ? title : "টগল"} />
    </div>
  );
}

export function Checkbox({ children, className, tone = "green", ...rest }: ComponentProps<"input"> & { tone?: "green" | "red" }) {
  const id = useId();
  return (
    <label htmlFor={rest.id ?? id} className={cn("flex min-h-12 cursor-pointer items-start gap-3 text-[17px]", className)}>
      <input
        id={rest.id ?? id}
        type="checkbox"
        className={cn("mt-[3px] size-6 flex-none", tone === "red" ? "accent-blood" : "accent-brand")}
        {...rest}
      />
      <span>{children}</span>
    </label>
  );
}

/* ───────────── Segmented control ───────────── */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
  full,
  label,
  activeClassName,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  full?: boolean;
  label?: string;
  activeClassName?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(full ? "grid" : "inline-flex", "gap-1 rounded-xl bg-track p-1", className)}
      style={full ? { gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` } : undefined}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-12 rounded-[9px] px-[18px] text-[17px] transition-colors",
              on ? cn("bg-white font-bold text-brand-dark shadow-seg", activeClassName) : "bg-transparent font-medium text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Chip tabs (horizontal scroll on mobile) ───────────── */
export function ChipTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
  bleed,
  label,
}: {
  options: { value: T; label: ReactNode; count?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
  bleed?: boolean;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex gap-2 overflow-x-auto pb-1.5 scrollbar-none", bleed && "-mx-site px-site", size === "sm" && "flex-wrap overflow-visible", className)}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex flex-none items-center gap-1.5 border-[1.5px] font-semibold transition-colors",
              size === "md" ? "h-12 rounded-full px-[18px] text-[17px]" : "h-11 rounded-[10px] px-3.5 text-[16px]",
              on ? "border-brand bg-brand text-white" : "border-line bg-white text-body hover:border-brand-200",
              !on && size === "md" && "font-medium",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="text-[13px] opacity-80">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Selectable option tile (radio-like) used in register / donate / aid forms. */
export function OptionButton({
  selected,
  className,
  children,
  ...rest
}: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "rounded-[10px] text-[17px] font-semibold transition-colors",
        selected ? "border-2 border-brand bg-brand-50 text-brand-dark" : "border-[1.5px] border-line bg-white text-body hover:border-brand-200",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Blood group picker button (red outline / filled). */
export function GroupButton({ selected, className, children, ...rest }: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "h-[60px] rounded-[10px] border-[1.5px] border-blood text-[22px] font-bold transition-colors",
        selected ? "bg-blood text-white" : "bg-white text-blood hover:bg-blood hover:text-white",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** E3 — form-level summary banner. */
export function ErrorSummary({ count }: { count: number }) {
  if (!count) return null;
  return (
    <div role="alert" className="flex items-center gap-2 rounded-[10px] border border-blood-200 bg-blood-50 px-4 py-3 text-[17px] font-semibold text-blood-800">
      <AlertCircle className="size-5 flex-none" aria-hidden />
      {bn(count)}টি ঘর ঠিক করতে হবে
    </div>
  );
}

/** E5 — submit failed; values are preserved by the caller. */
export function SubmitError({ onRetry, phone, phoneLabel = "ফোন করুন", message }: { onRetry: () => void; phone?: string; phoneLabel?: string; message?: string }) {
  return (
    <div role="alert" className="rounded-xl border-[1.5px] border-blood-300 bg-blood-50 p-4">
      <div className="text-[17px] font-bold text-blood-800">{message ?? "পাঠানো যায়নি"}</div>
      <div className="mt-1 text-[16px] text-body">আপনার লেখা সব ঠিক আছে, শুধু আবার পাঠান।</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onRetry} className="h-12 rounded-[10px] bg-blood px-5 text-[17px] font-semibold text-white hover:bg-blood-700">
          আবার পাঠান
        </button>
        {phone && (
          <a href={`tel:${phone}`} className="inline-flex h-12 items-center rounded-[10px] border-[1.5px] border-blood bg-white px-5 text-[17px] font-semibold text-blood-700">
            {phoneLabel}
          </a>
        )}
      </div>
    </div>
  );
}
