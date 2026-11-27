import { MessageCircle } from "lucide-react";
import { buttonClass, type ButtonVariant } from "@/components/ui/button";
import { SITE_URL } from "@/lib/content";
import { cn } from "@/lib/cn";

export function whatsappShareUrl(title: string, path: string) {
  return `https://wa.me/?text=${encodeURIComponent(title)}%0A${encodeURIComponent(SITE_URL + path)}`;
}

export function facebookShareUrl(path: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL + path)}`;
}

export function WhatsAppShare({
  title,
  path,
  variant = "primary",
  size = "lg",
  className,
  label = "WhatsApp-এ শেয়ার",
}: {
  title: string;
  path: string;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  className?: string;
  label?: string;
}) {
  return (
    <a href={whatsappShareUrl(title, path)} target="_blank" rel="noreferrer" className={buttonClass(variant, size, cn("hover:no-underline", className))}>
      <MessageCircle className="size-5" aria-hidden />
      {label}
    </a>
  );
}

export function ShareRow({ title, path, primary = true }: { title: string; path: string; primary?: boolean }) {
  return (
    <div className="grid-fit-200 gap-2.5">
      <WhatsAppShare title={title} path={path} variant={primary ? "primary" : "outline"} />
      <a href={facebookShareUrl(path)} target="_blank" rel="noreferrer" className={buttonClass("outline", "lg", "hover:no-underline")}>
        Facebook-এ শেয়ার
      </a>
    </div>
  );
}
