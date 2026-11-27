"use client";

import { useState } from "react";

export function ConstitutionAccordion({ rules }: { rules: { title: string; points: string[] }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="flex flex-col gap-2.5">
      {rules.map((r, i) => {
        const on = open === i;
        return (
          <div key={r.title} className="overflow-hidden rounded-xl border border-line bg-white">
            <button
              type="button"
              aria-expanded={on}
              aria-controls={`rule-${i}`}
              onClick={() => setOpen(on ? -1 : i)}
              className="flex min-h-[60px] w-full items-center justify-between gap-3 bg-white px-[18px] py-3 text-left text-[19px] font-semibold text-ink hover:bg-page"
            >
              {r.title}
              <span aria-hidden className="text-[24px] leading-none text-brand">
                {on ? "−" : "+"}
              </span>
            </button>
            {on && (
              <ul id={`rule-${i}`} className="m-0 flex flex-col gap-1.5 pt-0 pr-[18px] pb-4 pl-10 text-[17px] text-body">
                {r.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
