import type { Site } from "@/lib/api-types";

/** Logos uploaded in admin → সেটিংস → লোগো; bundled files in /public/brand are the fallback. */
export interface Brand {
  /** Horizontal logo for light backgrounds. */
  logo: string;
  /** Horizontal logo for dark / green backgrounds (white text). */
  logoDark: string;
  /** Square emblem — favicon, small spaces. */
  icon: string;
  name: string;
}

export const DEFAULT_BRAND: Brand = {
  logo: "/brand/logo-horizontal-light.png",
  logoDark: "/brand/logo-horizontal-dark.png",
  icon: "/brand/logo-icon.png",
  name: "সগুনা আদর্শ যুব সমাজ",
};

export function brandFrom(site: Partial<Pick<Site, "logo" | "logo_dark" | "logo_icon" | "org_name">> | null | undefined): Brand {
  return {
    logo: site?.logo || DEFAULT_BRAND.logo,
    logoDark: site?.logo_dark || DEFAULT_BRAND.logoDark,
    icon: site?.logo_icon || DEFAULT_BRAND.icon,
    name: site?.org_name || DEFAULT_BRAND.name,
  };
}
