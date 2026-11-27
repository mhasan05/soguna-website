import type { Metadata } from "next";
import { getCommittee } from "@/lib/server-api";
import { Avatar } from "@/components/ui/primitives";
import { initialOf } from "@/lib/bn";
import { CommitteeTabs } from "./committee-tabs";

export const metadata: Metadata = { title: "কার্যনির্বাহী কমিটি" };

export default async function CommitteePage() {
  const c = await getCommittee();
  return (
    <>
      <CommitteeTabs current={c.current} past={c.past[0] ?? null} />
      <section className="wrap py-[clamp(40px,5.5vw,64px)]">
        <h2 className="mt-0 mb-1 text-h2">উপদেষ্টা পরিষদ</h2>
        <p className="mt-0 mb-[18px] text-[17px] text-muted">গ্রামের মুরুব্বি, ইমাম ও শিক্ষকেরা সংগঠনকে পরামর্শ দেন।</p>
        <div className="grid-fit-260 gap-3.5">
          {c.advisors.map((a) => (
            <div key={a.id} className="flex items-center gap-3.5 rounded-xl border border-brand-100 bg-brand-50 p-4">
              <Avatar label={initialOf(a.name)} size={64} tone="white" />
              <div>
                <div className="text-[18px] leading-[1.4] font-semibold">{a.name}</div>
                <div className="text-[15px] text-muted">{a.title}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
