"use client";

import { useState } from "react";
import { AdminPage, Panel } from "@/components/admin/widgets";
import { useAdmin } from "@/components/admin/store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/primitives";
import { download, get } from "@/lib/api";
import { MONTHS, bn, money } from "@/lib/bn";
import { useQuery } from "@/lib/use-query";
import { useNow } from "@/lib/session";

interface Reports {
  by_para: { name: string; count: number }[];
  by_blood: { name: string; count: number }[];
  abroad: number;
  dhaka: number;
  totals: { income: number; expense: number; balance: number };
}

export default function AdminReports() {
  const { fail, flash } = useAdmin();
  const now = new Date(useNow());
  const { data } = useQuery("admin:reports", () => get<Reports>("/admin/reports/"));
  const [busy, setBusy] = useState<string | null>(null);
  const y = now.getFullYear();
  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${MONTHS[d.getMonth()]} ${bn(d.getFullYear())}` };
  });
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState(String(y));
  const [dues, setDues] = useState("");

  const get2 = (v: string, fallback: string) => (v || fallback).split("-");

  const run = async (key: string, path: string, name: string) => {
    setBusy(key);
    try {
      await download(path, name);
      flash("রিপোর্ট ডাউনলোড হয়েছে (CSV — Excel-এ খোলা যাবে)");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const cards = [
    {
      key: "monthly",
      title: "মাসিক আয়-ব্যয় রিপোর্ট",
      value: monthly || recentMonths[0].value,
      set: setMonthly,
      options: recentMonths,
      go: () => {
        const [yy, mm] = get2(monthly, recentMonths[0].value);
        run("monthly", `/admin/reports/finance.csv?year=${yy}&month=${mm}`, `finance-${yy}-${mm}.csv`);
      },
    },
    {
      key: "yearly",
      title: "বার্ষিক আয়-ব্যয় রিপোর্ট",
      value: yearly,
      set: setYearly,
      options: [y, y - 1, y - 2].map((v) => ({ value: String(v), label: bn(v) })),
      go: () => run("yearly", `/admin/reports/finance.csv?year=${yearly}`, `finance-${yearly}.csv`),
    },
    {
      key: "dues",
      title: "চাঁদা আদায় রিপোর্ট",
      value: dues || recentMonths[0].value,
      set: setDues,
      options: recentMonths,
      go: () => {
        const [yy, mm] = get2(dues, recentMonths[0].value);
        run("dues", `/admin/reports/dues.csv?year=${yy}&month=${mm}`, `dues-${yy}-${mm}.csv`);
      },
    },
  ];

  const maxPara = Math.max(1, ...(data?.by_para.map((p) => p.count) ?? [1]));
  const maxBlood = Math.max(1, ...(data?.by_blood.map((p) => p.count) ?? [1]));

  return (
    <AdminPage slug="reports">
      <div className="grid-fit-260 gap-3">
        {cards.map((c) => (
          <Panel key={c.key} className="flex flex-col gap-2.5 p-4">
            <div className="text-[18px] font-semibold">{c.title}</div>
            <Select aria-label="সময়কাল" value={c.value} onChange={(e) => c.set(e.target.value)} className="h-12 text-[16px]">
              {c.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button className="text-[16px]" loading={busy === c.key} loadingText="তৈরি হচ্ছে…" onClick={c.go}>
              ডাউনলোড (CSV)
            </Button>
          </Panel>
        ))}
      </div>
      {!data ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <>
          <Panel className="grid-fit-200 gap-3 p-4">
            <div>
              <div className="text-[15px] text-muted">মোট আয়</div>
              <div className="text-[24px] font-bold text-brand">{money(data.totals.income)}</div>
            </div>
            <div>
              <div className="text-[15px] text-muted">মোট ব্যয়</div>
              <div className="text-[24px] font-bold text-gold-700">{money(data.totals.expense)}</div>
            </div>
            <div>
              <div className="text-[15px] text-muted">ব্যালেন্স</div>
              <div className="text-[24px] font-bold text-brand-dark">{money(data.totals.balance)}</div>
            </div>
          </Panel>
          <div className="grid-fit-360 gap-3">
            <Panel className="p-4">
              <h2 className="mt-0 mb-3 text-[19px] font-bold">পাড়া অনুযায়ী সদস্য</h2>
              {data.by_para.map((p) => (
                <div key={p.name} className="mb-2 grid grid-cols-[100px_1fr_40px] items-center gap-2.5 text-[15px]">
                  <span>{p.name}</span>
                  <div className="h-3 rounded-full bg-brand-50">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(p.count / maxPara) * 100}%` }} />
                  </div>
                  <span className="text-right font-bold">{bn(p.count)}</span>
                </div>
              ))}
            </Panel>
            <Panel className="p-4">
              <h2 className="mt-0 mb-3 text-[19px] font-bold">রক্তের গ্রুপ</h2>
              {data.by_blood.map((b) => (
                <div key={b.name} className="mb-2 grid grid-cols-[60px_1fr_40px] items-center gap-2.5 text-[15px]">
                  <span className="font-bold text-blood">{b.name}</span>
                  <div className="h-3 rounded-full bg-blood-50">
                    <div className="h-full rounded-full bg-blood" style={{ width: `${(b.count / maxBlood) * 100}%` }} />
                  </div>
                  <span className="text-right font-bold">{bn(b.count)}</span>
                </div>
              ))}
              <div className="mt-2.5 text-[15px] text-muted">
                প্রবাসী সদস্য: {bn(data.abroad)} জন · ঢাকায়: {bn(data.dhaka)} জন
              </div>
            </Panel>
          </div>
        </>
      )}
    </AdminPage>
  );
}
