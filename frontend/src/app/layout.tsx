import type { Metadata, Viewport } from "next";
import { Hind_Siliguri } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineBanner } from "@/components/site/offline-banner";
import { ORG_NAME, ORG_PLACE, SITE_URL } from "@/lib/content";
import { BrandProvider } from "@/components/brand";
import { brandFrom } from "@/lib/brand";
import { getSite } from "@/lib/server-api";
import "./globals.css";

const hind = Hind_Siliguri({
  variable: "--font-hind",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Site settings, or null when the API is unreachable (bundled logo is used then). */
async function siteOrNull() {
  try {
    return await getSite();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = brandFrom(await siteOrNull());
  return {
    icons: { icon: brand.icon, apple: brand.icon },
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${ORG_NAME} — ${ORG_PLACE}`,
      template: `%s · ${ORG_NAME}`,
    },
    description:
      "সগুনা গ্রামের তরুণদের সামাজিক সংগঠন — রক্তদান, সমাজসেবা, স্বচ্ছ হিসাব আর বিপদে মানুষের পাশে।",
    openGraph: {
      type: "website",
      locale: "bn_BD",
      siteName: ORG_NAME,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#15803D",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const brand = brandFrom(await siteOrNull());
  return (
    <html lang="bn" className={`${hind.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <BrandProvider brand={brand}>
          <ToastProvider>
            <OfflineBanner />
            {children}
          </ToastProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
