export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

let seq = 0;
/** Client-side temporary id for optimistic inserts (server assigns the real one). */
export function uid(prefix = "tmp") {
  seq += 1;
  return `${prefix}-${seq}-${Math.floor(performance.now())}`;
}

/** Wall-clock time for event handlers. */
export const nowMs = () => Date.now();
