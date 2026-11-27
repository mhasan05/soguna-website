"use client";

import { useState } from "react";
import { Check, CheckCircle2, X } from "lucide-react";
import { Cell, DataTable, IconAction, PreviewDrawer } from "@/components/admin/crud";
import { AdminPage, Panel } from "@/components/admin/widgets";
import { useAdmin } from "@/components/admin/store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Pill, Skeleton } from "@/components/ui/primitives";
import { get, post } from "@/lib/api";
import type { DuesState } from "@/lib/api-types";
import { MONTHS_SHORT, bn, digitsOnly, formatDate, money } from "@/lib/bn";
import { cn } from "@/lib/cn";
import { useQuery } from "@/lib/use-query";

interface Pending {
  kind: "dues" | "donation";
  id: string;
  name: string;
  amount: number;
  months?: number[];
  year?: number;
  target?: string;
  method: string;
  trx_id: string;
  created_at: string;
}
interface Overview {
  monthly_amount: number;
  effective_from: string | null;
  year: number;
  defaulters: number;
  pending: Pending[];
  grid: { member_id: number; name: string; member_no: string; months: DuesState[] }[];
}

const CELL: Record<DuesState, [string, string, string]> = {
  paid: ["bg-success text-brand", "✓", "পরিশোধিত"],
  due: ["bg-blood-100 text-blood-700", "!", "বাকি"],
  pending: ["bg-gold-50 text-gold-800", "?", "যাচাই বাকি"],
  future: ["bg-pill text-faint", "", "আসেনি"],
  na: ["bg-white text-faint", "–", "সদস্য ছিলেন না"],
};

export default function AdminDues() {
  const { flash, fail, refreshBadges } = useAdmin();
  const overview = useQuery("admin:dues", () => get<Overview>("/admin/dues/"));
  const [amount, setAmount] = useState<string | null>(null);
  const [decided, setDecided] = useState<Record<string, "ok" | "no">>({});
  const [reminded, setReminded] = useState(false);
  const [cash, setCash] = useState<{ member: string; months: number[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState<(Pending & { rawId: string }) | null>(null);

  const o = overview.data;
  if (overview.error) return <AdminPage slug="dues">{<p className="text-blood-700">{overview.error}</p>}</AdminPage>;
  if (!o)
    return (
      <AdminPage slug="dues">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-60 w-full" />
      </AdminPage>
    );

  const open = o.pending.filter((p) => !decided[`${p.kind}:${p.id}`]).length;
  const amountValue = amount ?? bn(o.monthly_amount);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const verify = (p: Pending, ok: boolean) =>
    run(`${p.kind}:${p.id}`, async () => {
      await post("/admin/dues/verify/", { kind: p.kind, id: p.id, ok });
      setDecided((d) => ({ ...d, [`${p.kind}:${p.id}`]: ok ? "ok" : "no" }));
      refreshBadges();
    });

  const saveAmount = () =>
    run("amount", async () => {
      const r = await post<{ monthly_amount: number }>("/admin/dues/setting/", { monthly_amount: digitsOnly(amountValue) });
      flash(`মাসিক চাঁদা ${money(r.monthly_amount)} সংরক্ষণ হয়েছে`);
      setAmount(null);
      overview.reload();
    });

  const remind = () =>
    run("remind", async () => {
      const r = await post<{ sent: number }>("/admin/dues/remind/");
      setReminded(true);
      flash(`${bn(r.sent)} জনকে SMS রিমাইন্ডার পাঠানো হয়েছে`);
    });

  const saveCash = () =>
    cash &&
    run("cash", async () => {
      const r = await post<{ created: number }>("/admin/dues/cash/", { member_id: cash.member, year: o.year, months: cash.months });
      flash(`নগদ চাঁদা এন্ট্রি হয়েছে · ${bn(r.created)} মাস`);
      setCash(null);
      overview.reload();
    });

  const cashRow = cash ? o.grid.find((g) => String(g.member_id) === cash.member) : null;

  return (
    <AdminPage slug="dues">
      <div className="grid-fit-300 gap-3">
        <Panel className="flex flex-col gap-2 p-4">
          <label htmlFor="dues-amount" className="text-[16px] font-semibold">
            মাসিক চাঁদা (৳)
          </label>
          <div className="flex gap-2">
            <input
              id="dues-amount"
              value={amountValue}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              className="h-12 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-field px-3 text-[18px] font-bold outline-none focus:border-brand"
            />
            <Button className="text-[16px]" disabled={amount === null || !Number(digitsOnly(amountValue))} loading={busy === "amount"} onClick={saveAmount}>
              সংরক্ষণ
            </Button>
          </div>
          <span className="text-[14px] text-muted">{o.effective_from ? `${formatDate(o.effective_from)} থেকে কার্যকর · নতুন পরিমাণ এ মাস থেকে` : "এ মাস থেকে কার্যকর হবে"}</span>
        </Panel>
        <Panel className="flex flex-col gap-2 p-4">
          <span className="text-[16px] font-semibold">বাকিদার · এ মাস</span>
          <div className="text-[28px] leading-[1.2] font-bold text-blood-700">{bn(o.defaulters)} জন</div>
          <Button variant="outline" className="text-[16px]" disabled={reminded || !o.defaulters} loading={busy === "remind"} loadingText="পাঠানো হচ্ছে…" onClick={remind}>
            {reminded ? "রিমাইন্ডার পাঠানো হয়েছে" : "সবাইকে SMS রিমাইন্ডার"}
          </Button>
        </Panel>
      </div>

      <DataTable
        title={`অনলাইন পেমেন্ট যাচাই · ${bn(open)}টি বাকি`}
        rows={o.pending.map((x) => ({ ...x, id: `${x.kind}:${x.id}`, rawId: x.id }))}
        empty={
          <span className="flex flex-col items-center gap-2">
            <CheckCircle2 className="size-8 text-brand" aria-hidden />
            <span className="text-[17px] font-semibold text-ink">যাচাইয়ের জন্য কোনো পেমেন্ট বাকি নেই</span>
            নতুন পেমেন্ট এলে এখানে আসবে।
          </span>
        }
        onPreview={(x) => setShown(x)}
        columns={[
          { label: "কে দিয়েছেন", render: (x) => <Cell main={x.name} sub={x.kind === "dues" ? "মাসিক চাঁদা" : "দান"} /> },
          { label: "টাকা", render: (x) => <span className="font-bold">{money(x.amount)}</span> },
          { label: "কিসের জন্য", render: (x) => (x.kind === "dues" ? x.months?.map((m) => MONTHS_SHORT[m - 1]).join("–") : x.target), hideOnMobile: true },
          { label: "মাধ্যম · TrxID", render: (x) => <span>{x.method} · <span className="font-mono text-[14px]">{x.trx_id || "—"}</span></span> },
          { label: "তারিখ", render: (x) => formatDate(x.created_at, { year: false }), hideOnMobile: true },
          { label: "অবস্থা", render: (x) => (decided[x.id] ? <Pill tone={decided[x.id] === "ok" ? "success" : "red"} className="px-2.5 text-[14px]">{decided[x.id] === "ok" ? "যাচাই হয়েছে" : "বাতিল — জানানো হয়েছে"}</Pill> : <Pill tone="gold" className="px-2.5 text-[14px]">যাচাই বাকি</Pill>) },
        ]}
        actions={(x) =>
          decided[x.id] ? null : (
            <>
              <IconAction label="মিলেছে — যাচাই করুন" tone="brand" disabled={busy === x.id} icon={<Check className="size-5" aria-hidden />} onClick={() => verify({ ...x, id: x.rawId }, true)} />
              <IconAction label="মেলেনি — বাতিল" tone="danger" disabled={busy === x.id} icon={<X className="size-5" aria-hidden />} onClick={() => verify({ ...x, id: x.rawId }, false)} />
            </>
          )
        }
      />
      <PreviewDrawer
        data={
          shown
            ? {
                title: `${shown.name} · ${money(shown.amount)}`,
                subtitle: shown.kind === "dues" ? "মাসিক চাঁদা" : "দান",
                sections: [
                  {
                    title: "পেমেন্ট",
                    rows: [
                      ["কে দিয়েছেন", shown.name],
                      ["টাকা", money(shown.amount)],
                      ["কিসের জন্য", shown.kind === "dues" ? `${shown.months?.map((m) => MONTHS_SHORT[m - 1]).join(", ")} ${bn(shown.year ?? "")}` : shown.target],
                      ["মাধ্যম", shown.method],
                      ["TrxID", <span key="t" className="font-mono">{shown.trx_id || "—"}</span>],
                      ["তারিখ", formatDate(shown.created_at)],
                    ],
                  },
                  { title: "কীভাবে যাচাই করবেন", content: <span className="text-body">bKash/Nagad অ্যাপে এই TrxID ও টাকার পরিমাণ মিলিয়ে দেখুন। মিললে &quot;মিলেছে&quot; চাপুন — সদস্যের হিসাবে যোগ হবে।</span> },
                ],
              }
            : null
        }
        onClose={() => setShown(null)}
        actions={
          shown && !decided[shown.id] ? (
            <>
              <Button className="flex-1 text-[16px]" onClick={() => { verify({ ...shown, id: shown.rawId }, true); setShown(null); }}>মিলেছে</Button>
              <Button variant="neutral" className="text-[16px]" onClick={() => { verify({ ...shown, id: shown.rawId }, false); setShown(null); }}>মেলেনি</Button>
            </>
          ) : undefined
        }
      />

      <Panel className="p-4">
        <div className="mb-2.5 flex flex-wrap justify-between gap-2">
          <h2 className="m-0 text-[19px] font-bold">সদস্য × মাস · {bn(o.year)}</h2>
          <Button variant="outline" className="h-11 text-[15px]" onClick={() => setCash(cash ? null : { member: String(o.grid[0]?.member_id ?? ""), months: [] })}>
            + নগদ এন্ট্রি
          </Button>
        </div>
        {cash && (
          <div className="mb-3 flex flex-col gap-2 rounded-[10px] bg-page p-3">
            <Select aria-label="সদস্য" value={cash.member} onChange={(e) => setCash({ member: e.target.value, months: [] })}>
              {o.grid.map((g) => (
                <option key={g.member_id} value={g.member_id}>
                  {g.name} ({g.member_no})
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap gap-1.5">
              {cashRow?.months.map((st, i) => {
                const m = i + 1;
                const selectable = st === "due" || st === "future";
                const on = cash.months.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={!selectable}
                    onClick={() => setCash({ ...cash, months: on ? cash.months.filter((x) => x !== m) : [...cash.months, m] })}
                    className={cn("h-10 min-w-14 rounded-lg px-2 text-[14px] font-semibold", on ? "bg-brand text-white" : selectable ? "border-[1.5px] border-field bg-white" : "bg-pill text-faint")}
                  >
                    {MONTHS_SHORT[i]}
                  </button>
                );
              })}
            </div>
            <Button className="self-start text-[16px]" disabled={!cash.months.length} loading={busy === "cash"} onClick={saveCash}>
              {money(cash.months.length * o.monthly_amount)} নগদ পেয়েছি
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-[700px] border-separate border-spacing-1 text-[14px]">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left font-semibold text-muted">সদস্য</th>
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="p-1 font-semibold text-muted">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {o.grid.map((g) => (
                <tr key={g.member_id}>
                  <td className="px-2 py-1 text-[15px] font-semibold whitespace-nowrap">{g.name}</td>
                  {g.months.map((c, i) => {
                    const [cls, t, label] = CELL[c];
                    return (
                      <td key={i} title={label} className={cn("h-9 w-10 rounded-md text-center font-bold", cls)}>
                        {t}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminPage>
  );
}
