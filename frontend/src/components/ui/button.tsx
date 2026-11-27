import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "outline"
  | "neutral"
  | "blood"
  | "bloodOutline"
  | "danger"
  | "dangerOutline"
  | "gold"
  | "goldOutline"
  | "white"
  | "ghostWhite"
  | "soft"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed aria-disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-disabled aria-disabled:bg-disabled",
  outline: "border-[1.5px] border-brand bg-white text-brand hover:bg-brand-50 disabled:border-line disabled:text-subtle",
  neutral: "border-[1.5px] border-field bg-white text-body hover:bg-page disabled:text-subtle",
  blood: "bg-blood text-white hover:bg-blood-700 disabled:bg-line disabled:text-subtle",
  bloodOutline: "border-[1.5px] border-blood bg-white text-blood-700 hover:bg-blood-50",
  danger: "bg-blood text-white font-bold hover:bg-blood-700",
  dangerOutline: "border-[1.5px] border-blood-300 bg-white text-blood-700 hover:bg-blood-50",
  gold: "bg-gold text-white font-bold hover:bg-gold-700",
  goldOutline: "border-[1.5px] border-gold bg-white text-gold-700 hover:bg-gold-25",
  white: "bg-white text-brand-dark font-bold hover:bg-brand-50",
  ghostWhite: "border-[1.5px] border-white/75 bg-transparent text-white hover:bg-white/10",
  soft: "border-[1.5px] border-brand bg-brand-50 text-brand hover:bg-brand-100",
  link: "min-h-12 px-0! text-brand hover:text-brand-dark hover:underline",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-3 rounded-lg text-[15px]",
  md: "h-12 px-[18px] rounded-[10px] text-[17px]",
  lg: "h-[52px] px-6 rounded-[10px] text-[17px]",
  xl: "h-14 px-7 rounded-xl text-[19px] font-bold",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, sizes[size], variants[variant], className);
}

export function Spinner({ className, light = true }: { className?: string; light?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-5 flex-none animate-spin-fast rounded-full border-[3px] border-t-transparent",
        light ? "border-white border-t-transparent" : "border-brand border-t-transparent",
        className,
      )}
    />
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
  loading?: boolean;
  loadingText?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  block,
  loading,
  loadingText,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const lightSpinner = ["primary", "blood", "danger", "gold"].includes(variant);
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, cn(block && "w-full", loading && "opacity-90", className))}
      {...rest}
    >
      {loading ? <Spinner light={lightSpinner} /> : icon}
      {loading && loadingText ? loadingText : children}
      {!loading && iconRight}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
};

export function LinkButton({ variant = "primary", size = "md", icon, iconRight, block, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, cn(block && "flex w-full", "no-underline hover:no-underline", className))} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

/** Plain anchor version (tel:, wa.me, external). */
export function AnchorButton({
  variant = "primary",
  size = "md",
  icon,
  block,
  className,
  children,
  ...rest
}: ComponentProps<"a"> & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; block?: boolean }) {
  return (
    <a className={buttonClass(variant, size, cn(block && "flex w-full", "hover:no-underline", className))} {...rest}>
      {icon}
      {children}
    </a>
  );
}
