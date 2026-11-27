"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** E4 — top banner when the connection drops; cached pages stay readable. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-[15px] font-semibold text-white">
      <span className="size-2.5 rounded-full bg-gold-300" aria-hidden />
      ইন্টারনেট নেই — আগে দেখা তথ্য দেখাচ্ছে
    </div>
  );
}
