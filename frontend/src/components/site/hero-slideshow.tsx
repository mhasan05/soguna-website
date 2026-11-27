"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { bn } from "@/lib/bn";

export interface HeroSlide {
  image: string;
  alt: string;
}

const INTERVAL = 6000;
const MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia(MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const prefersReduced = () => window.matchMedia(MOTION).matches;

/** Full-bleed, cross-fading background images for the home hero. Auto-advances unless paused, hovered or the user prefers reduced motion. */
export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, prefersReduced, () => false);
  const many = slides.length > 1;

  const go = useCallback((to: number) => setIndex(((to % slides.length) + slides.length) % slides.length), [slides.length]);

  const running = many && !paused && !hover && !reduced;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      if (!document.hidden) go(index + 1);
    }, INTERVAL);
    return () => clearTimeout(t);
  }, [running, index, go]);

  return (
    <div className="absolute inset-0" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {slides.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.image + i}
          src={s.image}
          alt={i === index ? s.alt : ""}
          aria-hidden={i !== index}
          fetchPriority={i === 0 ? "high" : "low"}
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "absolute inset-0 size-full object-cover transition-[opacity,transform] duration-[1200ms,7000ms] ease-out",
            i === index ? "scale-105 opacity-100" : "scale-100 opacity-0",
          )}
        />
      ))}
      {/* Readability: dark green from the text side, photo stays vivid on the right */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,46,22,.94)_0%,rgba(5,46,22,.78)_34%,rgba(5,46,22,.28)_68%,rgba(5,46,22,.08)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,46,22,.9)_0%,rgba(5,46,22,0)_38%),linear-gradient(180deg,rgba(5,46,22,.45)_0%,rgba(5,46,22,0)_22%)]" />
      <div className="absolute inset-0 bg-[rgba(5,46,22,.35)] lg:hidden" />

      {many && (
        <div className="wrap absolute inset-x-0 bottom-4 z-10 flex items-center justify-end gap-2 nav:bottom-6">
          <div className="flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-sm">
            <button type="button" onClick={() => go(index - 1)} aria-label="আগের ছবি" className="flex size-8 items-center justify-center rounded-full text-white hover:bg-white/15">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`ছবি ${bn(i + 1)}`}
                aria-current={i === index ? "true" : undefined}
                className="flex h-8 items-center px-0.5"
              >
                <span className={cn("block h-2 rounded-full bg-white transition-all", i === index ? "w-6" : "w-2 opacity-55 hover:opacity-90")} />
              </button>
            ))}
            <button type="button" onClick={() => go(index + 1)} aria-label="পরের ছবি" className="flex size-8 items-center justify-center rounded-full text-white hover:bg-white/15">
              <ChevronRight className="size-5" aria-hidden />
            </button>
            {!reduced && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "স্লাইডশো চালু করুন" : "স্লাইডশো থামান"}
                className="flex size-8 items-center justify-center rounded-full text-white hover:bg-white/15"
              >
                {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
