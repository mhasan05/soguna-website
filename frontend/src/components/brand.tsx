"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_BRAND, type Brand } from "@/lib/brand";
import { cn } from "@/lib/cn";

const BrandContext = createContext<Brand>(DEFAULT_BRAND);

export function BrandProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export const useBrand = () => useContext(BrandContext);

/**
 * The organisation logo from admin settings.
 * - `dark`: horizontal, for green/dark backgrounds (default)
 * - `light`: horizontal, for white/light backgrounds
 * - `icon`: square emblem only
 */
export function BrandLogo({ variant = "dark", className, alt }: { variant?: "dark" | "light" | "icon"; className?: string; alt?: string }) {
  const b = useBrand();
  const src = variant === "icon" ? b.icon : variant === "light" ? b.logo : b.logoDark;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? b.name}
      crossOrigin={src.startsWith("http") ? "anonymous" : undefined}
      decoding="async"
      className={cn("block w-auto max-w-full flex-none object-contain object-left", variant === "icon" && "aspect-square object-center", className)}
    />
  );
}
