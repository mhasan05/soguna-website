import { HeartHandshake } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, Img, Pill, ProgressBar } from "@/components/ui/primitives";
import { bn, formatDate, money, percent } from "@/lib/bn";
import type { AidFund } from "@/lib/api-types";

export function AidFundCard({ fund, withImage = false, compactDesc }: { fund: AidFund; withImage?: boolean; compactDesc?: boolean }) {
  const pct = percent(fund.raised, fund.target);
  return (
    <Card className="flex flex-col overflow-hidden">
      {withImage && fund.image && <Img src={fund.image} alt={fund.title} className="aspect-[2/1] w-full" />}
      <div className="flex flex-1 flex-col gap-2.5 p-[18px]">
        <div className="flex flex-wrap justify-between gap-2">
          <Pill tone="gold">{fund.type}</Pill>
          {withImage && fund.deadline && <span className="text-[15px] text-muted">শেষ তারিখ {formatDate(fund.deadline, { year: false })}</span>}
        </div>
        <h3 className="m-0 text-[19px] leading-[1.45] font-semibold">{fund.title}</h3>
        <p className={compactDesc ? "m-0 line-clamp-2 text-[16px] text-muted" : "m-0 text-[16px] text-muted"}>{fund.description}</p>
        {fund.applicant_name && <p className="m-0 text-[15px] text-muted">আবেদনকারী: {fund.applicant_name}</p>}
        <div className="mt-auto pt-1">
          <ProgressBar value={pct} />
          <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-[16px]">
            <span>
              <strong className="text-[18px] text-gold-700">{money(fund.raised)}</strong> <span className="text-muted">উঠেছে</span>
            </span>
            <span className="text-muted">
              লক্ষ্য {money(fund.target)} · {bn(pct)}%
            </span>
          </div>
        </div>
        <LinkButton href={`/donate?purpose=${fund.id}`} block icon={<HeartHandshake className="size-5" aria-hidden />} className="mt-1">
          দান করুন
        </LinkButton>
      </div>
    </Card>
  );
}
