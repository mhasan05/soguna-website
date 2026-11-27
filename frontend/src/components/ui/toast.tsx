"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  undo?: () => void;
}
interface ToastApi {
  show: (message: string, opts?: { kind?: ToastKind; undo?: () => void }) => void;
  success: (message: string, undo?: () => void) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** T1 — dark toast above the bottom nav, 7 seconds, optional undo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);

  const show = useCallback<ToastApi["show"]>((message, opts = {}) => {
    clearTimeout(timer.current);
    seq.current += 1;
    setToast({ id: seq.current, message, kind: opts.kind ?? "info", undo: opts.undo });
    timer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const api: ToastApi = {
    show,
    success: (m, undo) => show(m, { kind: "success", undo }),
    error: (m) => show(m, { kind: "error" }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[84px] z-50 flex justify-center px-4 nav:bottom-6">
        {toast && (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-[520px] items-center gap-3 rounded-xl py-2.5 pr-2.5 pl-4 text-[16px] text-white shadow-menu",
              toast.kind === "error" ? "bg-blood-900" : "bg-ink",
            )}
          >
            {toast.kind === "success" && <span className="font-bold text-success-ink">✓</span>}
            {toast.kind === "error" && <span className="font-bold text-blood-300">!</span>}
            <span className="flex-1">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="h-10 rounded-lg bg-gold-300 px-3 text-[15px] font-bold text-ink"
              >
                ফিরিয়ে আনুন
              </button>
            )}
            <button type="button" aria-label="বন্ধ" onClick={() => setToast(null)} className="flex size-10 items-center justify-center rounded-lg bg-white/12">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
