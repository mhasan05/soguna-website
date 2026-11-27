"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, OptionButton, SubmitError } from "@/components/ui/form";
import { BackLink, EmptyState, Skeleton } from "@/components/ui/primitives";
import { MONTHS_SHORT, bn, formatDate, formatPhone, money } from "@/lib/bn";
import { cn } from "@/lib/cn";
import { ApiError, api, errorMessage } from "@/lib/api";
import type { DuesState, Site } from "@/lib/api-types";
import { METHOD_LABEL } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useQuery } from "@/lib/use-query";

const METHODS = ["bkash", "nagad", "cash"] as const;
type Method = (typeof METHODS)[number];

const STYLE: Record<DuesState, { cls: string; label: string }> = {
  paid: { cls: "border-[1.5px] border-brand-200 bg-success text-brand-dark", label: "পরিশোধিত" },
  due: { cls: "border-[1.5px] border-blood bg-blood-100 text-blood-800", label: "বাকি" },
  pending: { cls: "border-[1.5px] border-gold bg-gold-50 text-gold-800", label: "যাচাই চলছে" },
  future: { cls: "border-[1.5px] border-dashed border-field bg-white text-muted", label: "আগাম দিন" },
  na: { cls: "border-[1.5px] border-line bg-pill text-faint", label: "সদস্য ছিলেন না" },
};

const HISTORY_STATUS = { pending: "যাচাই চলছে", verified: "যাচাইকৃত", rejected: "মেলেনি" } as const;

export function DuesView() {
  const { session } = useSession();
  const id = session?.memberId;
  const dues = useQuery(id ? `dues:${id}` : null, () => api.myDues());
  const site = useQuery<Site>("site", () => api.site());
  const [selected, setSelected] = useState<number[] | null>(null);
  const [method, setMethod] = useState<Method>("bkash");
  const [trx, setTrx] = useState("");
  const [trxError, setTrxError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error" | "sent">("idle");
  const [err, setErr] = useState("");

  if (dues.error) return <div className="wrap py-10 text-[17px] text-blood-700">{dues.error}</div>;
  if (!dues.data) {
    return (
      <div className="wrap flex flex-col gap-3 py-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  const { months, monthly_amount: amount, year, history } = dues.data;
  // Default selection: every month that's still due.
  const chosen = selected ?? months.filter((m) => m.status === "due").map((m) => m.month);
  const rejected = months.filter((m) => m.rejected);

  const toggle = (month: number) => {
    const st = months[month - 1].status;
    if (st !== "due" && st !== "future") return;
    if (state === "sent") setState("idle");
    setSelected(chosen.includes(month) ? chosen.filter((x) => x !== month) : [...chosen, month].sort((a, b) => a - b));
  };

  const n = chosen.length;
  const total = n * amount;
  const online = method !== "cash";
  const number = site.data ? formatPhone(method === "nagad" ? site.data.nagad : site.data.bkash) : "…";

  const submit = async () => {
    if (!n) return;
    if (online && trx.trim().length < 8) {
      setTrxError("মেসেজে আসা Transaction ID লিখুন (৮–১০ অক্ষর)");
      return;
    }
    setTrxError(null);
    setState("loading");
    try {
      await api.payDues({ year, months: chosen, method, trx_id: online ? trx.trim().toUpperCase() : "" });
      setSelected([]);
      setTrx("");
      setState("sent");
      dues.reload();
    } catch (e) {
      if (e instanceof ApiError && e.fields.trx_id) setTrxError(e.fields.trx_id);
      setErr(errorMessage(e));
      setState("error");
    }
  };

  return (
    <div className="wrap grid-fit-440 items-start gap-x-8 gap-y-5 pt-[clamp(20px,3vw,40px)] pb-page">
      <div className="flex flex-col gap-4">
        <BackLink href="/dashboard">ড্যাশবোর্ড</BackLink>
        <div>
          <h1 className="m-0 text-h1-sm">আমার চাঁদা · {bn(year)}</h1>
          <p className="mt-1 mb-0 text-[17px] text-muted">মাসিক চাঁদা {money(amount)} · বাকি মাস চাপলে বাছাই হবে</p>
        </div>
        {rejected.length > 0 && (
          <div role="alert" className="rounded-xl border-[1.5px] border-blood-300 bg-blood-50 p-4 text-[16px]">
            <strong className="text-blood-800">{rejected.map((m) => MONTHS_SHORT[m.month - 1]).join(", ")} — পেমেন্ট মেলেনি।</strong> কোষাধ্যক্ষ Transaction ID খুঁজে পাননি। নম্বরটি আবার দেখে জমা দিন।
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(96px,30%),1fr))] gap-2">
          {months.map(({ month, status }) => {
            const on = chosen.includes(month);
            const selectable = status === "due" || status === "future";
            return (
              <button
                key={month}
                type="button"
                onClick={() => toggle(month)}
                disabled={!selectable}
                aria-pressed={selectable ? on : undefined}
                aria-label={`${MONTHS_SHORT[month - 1]} — ${on ? "বাছাই করা" : STYLE[status].label}`}
                className={cn("flex min-h-[72px] flex-col items-center justify-center gap-0.5 rounded-xl p-1.5 disabled:cursor-default", on ? "border-[2.5px] border-brand bg-brand text-white" : STYLE[status].cls)}
              >
                <span className="text-[17px] font-bold">{MONTHS_SHORT[month - 1]}</span>
                <span className="text-[13px] font-semibold">{on ? "✓ বাছাই" : STYLE[status].label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[15px] text-muted">
          <Legend cls="border-brand bg-success" label="পরিশোধিত" />
          <Legend cls="border-blood bg-blood-100" label="বাকি" />
          <Legend cls="border-gold bg-gold-50" label="যাচাইয়ের অপেক্ষায়" />
        </div>
        <div>
          <h2 className="mt-2 mb-2.5 text-[20px] font-bold">পেমেন্ট ইতিহাস</h2>
          {history.length ? (
            <div className="rounded-xl border border-line bg-white px-4 py-0.5">
              {history.map((h, i) => (
                <div key={h.id} className={cn("flex items-center gap-3 py-3", i < history.length - 1 && "border-b border-divider")}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] font-semibold">
                      {h.months.map((m) => MONTHS_SHORT[m - 1]).join(", ")} {bn(h.year)}
                    </div>
                    <div className="text-[15px] text-muted">
                      {formatDate(h.created_at, { year: false })} · {METHOD_LABEL[h.method]} · {HISTORY_STATUS[h.status]}
                      {h.verified_by && h.status === "verified" ? ` (${h.verified_by})` : ""}
                    </div>
                  </div>
                  <div className={cn("flex-none text-right text-[17px] font-bold", h.status === "rejected" && "text-muted line-through")}>{money(h.amount)}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState tone="gold" icon={<Wallet className="size-7" aria-hidden />} title="এখনো কোনো চাঁদা দেননি" sub="প্রথম মাসের চাঁদা দিয়ে শুরু করুন।" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[clamp(18px,2.6vw,28px)]">
        <h2 className="m-0 text-[clamp(22px,2.4vw,28px)] font-bold">চাঁদা দিন</h2>
        {state === "sent" ? (
          <div role="status" className="flex flex-col gap-3">
            <div className="rounded-xl bg-gold-50 p-[18px] text-[17px]">
              <strong className="text-gold-800">জমা হয়েছে — যাচাইয়ের অপেক্ষায়।</strong>{" "}
              {online ? "কোষাধ্যক্ষ Transaction ID মিলিয়ে নিলে মাসগুলো সবুজ হবে ও SMS-এ রসিদ যাবে।" : "কোষাধ্যক্ষ নগদ টাকা পেয়ে এন্ট্রি দিলে মাসগুলো সবুজ হবে।"}
            </div>
            <Button variant="outline" onClick={() => setState("idle")}>
              আরও মাস দিন
            </Button>
          </div>
        ) : (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {state === "error" && <SubmitError onRetry={submit} phone={site.data?.phone} phoneLabel="সংগঠনে ফোন করুন" message={err || "জমা দেওয়া যায়নি"} />}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-page px-4 py-3.5">
              <div>
                <div className="text-[15px] text-muted">বাছাই করা মাস</div>
                <div className="text-[18px] font-semibold">{n ? chosen.map((i) => MONTHS_SHORT[i - 1]).join(", ") : "কোনো মাস বাছাই হয়নি"}</div>
              </div>
              <div className="text-right">
                <div className="text-[15px] text-muted">মোট</div>
                <div className="text-[28px] leading-[1.2] font-bold text-brand">{money(total)}</div>
              </div>
            </div>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-[17px] font-semibold">কীভাবে দেবেন</legend>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <OptionButton key={m} selected={method === m} onClick={() => setMethod(m)} className="min-h-[52px] p-1 text-[16px] font-bold">
                    {METHOD_LABEL[m]}
                  </OptionButton>
                ))}
              </div>
            </fieldset>
            {online ? (
              <>
                <div className="rounded-[10px] border border-gold-150 bg-gold-25 px-3.5 py-3 text-[16px] text-body">
                  সংগঠনের নম্বরে <strong>{number}</strong> Send Money করে Transaction ID লিখুন।
                </div>
                <Field label="Transaction ID" htmlFor="dues-trx" error={trxError}>
                  <Input id="dues-trx" value={trx} onChange={(e) => setTrx(e.target.value)} invalid={!!trxError} placeholder="যেমন: 9K7X2M4QPL" autoComplete="off" className="font-mono uppercase" />
                </Field>
              </>
            ) : (
              <div className="rounded-[10px] bg-brand-50 px-3.5 py-3 text-[16px]">
                কোষাধ্যক্ষ <strong>{site.data?.treasurer_name ?? "…"}</strong>-কে নগদ দিন। তিনি এন্ট্রি দিলে এখানে সবুজ হয়ে যাবে।
              </div>
            )}
            {online || n === 0 ? (
              <Button type="submit" size="xl" disabled={!n} loading={state === "loading"} loadingText="জমা হচ্ছে…">
                {n ? `${money(total)} জমা দিন` : "মাস বাছাই করুন"}
              </Button>
            ) : (
              <Button type="submit" size="xl" loading={state === "loading"} loadingText="জমা হচ্ছে…">
                কোষাধ্যক্ষকে জানান ({money(total)})
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3.5 rounded border-[1.5px]", cls)} />
      {label}
    </span>
  );
}
