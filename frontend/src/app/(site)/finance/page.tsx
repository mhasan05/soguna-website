import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { Breadcrumb, Card } from "@/components/ui/primitives";
import { getFinanceSummary } from "@/lib/server-api";
import { MONTHS, MONTHS_SHORT, bn, money, percent } from "@/lib/bn";
import { Transactions } from "./transactions";

export const metadata: Metadata = { title: "ফান্ডের হিসাব", description: "সগুনা আদর্শ যুব সমাজের স্বচ্ছ আয়-ব্যয়ের হিসাব।" };

export default async function FinancePage() {
  const summary = await getFinanceSummary();
  const months = summary.months.map((m) => ({ ...m, name: MONTHS_SHORT[m.month - 1] }));
  const cats = summary.expense_by_category;
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense])) * 1.05;
  const totalExpense = cats.reduce((s, c) => s + c.amount, 0);
  const topExpense = cats[0]?.amount || 1;
  const from = new Date(summary.period.from);
  const to = new Date(summary.period.to);
  const period = `${MONTHS[from.getMonth()]} – ${MONTHS[to.getMonth()]} ${bn(to.getFullYear())}`;

  return (
    <div className="wrap flex flex-col gap-[clamp(24px,3vw,36px)] pt-page pb-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Breadcrumb current="ফান্ডের হিসাব" />
          <h1 className="mt-1 mb-1 text-h1">ফান্ডের হিসাব</h1>
          <p className="m-0 text-[17px] text-muted">{period} · কোষাধ্যক্ষ যাচাই করা হিসাব</p>
        </div>
        <LinkButton href="/donate" variant="gold" size="lg" className="text-[18px]">
          দান করুন
        </LinkButton>
      </div>

      <div className="grid-fit-240 gap-3">
        <Card className="p-[18px] shadow-none">
          <div className="text-[16px] text-muted">মোট আয়</div>
          <div className="text-[clamp(28px,3vw,36px)] leading-[1.2] font-bold text-brand">{money(summary.income)}</div>
        </Card>
        <Card className="p-[18px] shadow-none">
          <div className="text-[16px] text-muted">মোট ব্যয়</div>
          <div className="text-[clamp(28px,3vw,36px)] leading-[1.2] font-bold text-gold-700">{money(summary.expense)}</div>
        </Card>
        <div className="rounded-xl bg-brand-dark p-[18px] text-white">
          <div className="text-[16px] opacity-90">বর্তমান ব্যালেন্স</div>
          <div className="text-[clamp(28px,3vw,36px)] leading-[1.2] font-bold">{money(summary.balance)}</div>
        </div>
      </div>

      <div className="grid-fit-440 items-start gap-4">
        <Card className="p-[18px] shadow-none">
          <div className="mb-3.5 flex flex-wrap justify-between gap-2">
            <h2 className="m-0 text-[20px] font-bold">মাসিক আয়-ব্যয়</h2>
            <div className="flex gap-3.5 text-[15px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-brand" />
                আয়
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-gold" />
                ব্যয়
              </span>
            </div>
          </div>
          <div role="img" aria-label="গত ছয় মাসের আয় ও ব্যয়ের চার্ট" className="grid h-[200px] grid-cols-6 items-end gap-2 border-b border-line">
            {months.map((m) => (
              <div key={`${m.year}-${m.month}`} className="flex h-full items-end justify-center gap-[3px]">
                <div title={`আয় ${money(m.income)}`} className="w-[42%] max-w-[22px] rounded-t bg-brand" style={{ height: `${(m.income / max) * 100}%` }} />
                <div title={`ব্যয় ${money(m.expense)}`} className="w-[42%] max-w-[22px] rounded-t bg-gold" style={{ height: `${(m.expense / max) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-6 gap-2">
            {months.map((m) => (
              <div key={`${m.year}-${m.month}`} className="text-center text-[14px] text-muted">
                {m.name}
              </div>
            ))}
          </div>
          <table className="sr-only">
            <caption>মাসিক আয়-ব্যয়</caption>
            <tbody>
              {months.map((m) => (
                <tr key={`${m.year}-${m.month}`}>
                  <th>{m.name}</th>
                  <td>আয় {money(m.income)}</td>
                  <td>ব্যয় {money(m.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-[18px] shadow-none">
          <h2 className="mt-0 mb-3.5 text-[20px] font-bold">খরচ কোন খাতে</h2>
          <div className="flex flex-col gap-3.5">
            {!cats.length && <p className="m-0 text-[16px] text-muted">এখনো কোনো খরচের এন্ট্রি নেই।</p>}
            {cats.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between gap-2 text-[16px]">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-muted">
                    {money(c.amount)} · {bn(percent(c.amount, totalExpense))}%
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-progress">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${(c.amount / topExpense) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mt-0 mb-3 text-[clamp(22px,2.4vw,28px)] font-bold">সাম্প্রতিক লেনদেন</h2>
        <Transactions />
      </div>
    </div>
  );
}
