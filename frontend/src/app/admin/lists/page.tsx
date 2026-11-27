"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AdminPage, InlineEditor, Panel, Reorder, useEditing } from "@/components/admin/widgets";
import { IconAction, icons } from "@/components/admin/crud";
import { useAdmin, useResource } from "@/components/admin/store";
import { ChipTabs } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import type { ListKind } from "@/lib/api-types";
import { bn } from "@/lib/bn";

const META: Record<ListKind, { title: string; where: string; placeholder: string; unit: string }> = {
  para: { title: "পাড়া / মহল্লা", where: "নিবন্ধন, সদস্য তালিকা ও রক্তদাতা ফিল্টারে", placeholder: "নতুন পাড়ার নাম", unit: " জন সদস্যের তালিকায়" },
  noticeCat: { title: "নোটিশ ক্যাটাগরি", where: "নোটিশ বোর্ডের ট্যাব ও নোটিশ ফর্মে", placeholder: "যেমন: খেলার খবর", unit: "টি নোটিশে" },
  eventCat: { title: "ইভেন্ট ক্যাটাগরি", where: "কার্যক্রম কার্ড ও ইভেন্ট ফর্মে", placeholder: "যেমন: মেডিকেল ক্যাম্প", unit: "টি ইভেন্টে" },
  incomeCat: { title: "আয়ের খাত", where: "আয় এন্ট্রি ও রিপোর্টে", placeholder: "যেমন: প্রবাসী অনুদান", unit: "টি এন্ট্রিতে" },
  expenseCat: { title: "ব্যয়ের খাত", where: 'খরচ এন্ট্রি, পাবলিক হিসাবের "খরচ কোন খাতে" চার্টে', placeholder: "যেমন: মসজিদ সংস্কার", unit: "টি এন্ট্রিতে" },
  serviceCat: { title: "সেবার ক্যাটাগরি", where: "গ্রামের সেবা ডিরেক্টরিতে", placeholder: "যেমন: প্লাম্বার", unit: " জন সেবাদাতার তালিকায়" },
  profession: { title: "পেশা", where: "নিবন্ধন ফর্ম ও সদস্য তালিকার ফিল্টারে", placeholder: "যেমন: ড্রাইভার", unit: " জন সদস্যের তালিকায়" },
  position: { title: "কমিটির পদবি", where: "কমিটি পাতায় এই ক্রমে সাজানো থাকে", placeholder: "যেমন: শিক্ষা বিষয়ক সম্পাদক", unit: " জনের পদে" },
};
const KINDS = Object.keys(META) as ListKind[];

interface Item {
  id: number;
  kind: ListKind;
  name: string;
  order: number;
  usage: number;
}

export default function AdminListsPage() {
  return (
    <AdminPage slug="lists" intro={<p className="-mt-2 mb-0 text-[16px] text-muted">এখানে যোগ, এডিট বা মুছলে পুরো সাইটের ফর্ম ও ফিল্টারে বদলাবে (পাবলিক পাতায় ১ মিনিটের মধ্যে)।</p>}>
      <Suspense>
        <Lists />
      </Suspense>
    </AdminPage>
  );
}

function Lists() {
  const router = useRouter();
  const fromUrl = useSearchParams()?.get("tab") as ListKind | null;
  const tab: ListKind = fromUrl && KINDS.includes(fromUrl) ? fromUrl : "para";
  const { flash, fail } = useAdmin();
  const list = useResource<Item>(`/admin/lists/?kind=${tab}`, { idPath: (id) => `/admin/lists/${id}/` });
  const [newItem, setNewItem] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const ed = useEditing();
  const meta = META[tab];
  const rows = list.items ?? [];

  const addItem = async () => {
    const v = newItem.trim();
    if (!v) return;
    if (rows.some((x) => x.name === v)) {
      setErr(`"${v}" আগে থেকেই আছে`);
      return;
    }
    try {
      await list.create({ kind: tab, name: v }, "end");
      setNewItem("");
      setErr(null);
      flash(`"${v}" যোগ হয়েছে`);
    } catch (e) {
      setErr(e instanceof ApiError ? (e.fields.name ?? e.message) : "যোগ করা যায়নি");
    }
  };

  return (
    <>
      <ChipTabs<ListKind>
        label="তালিকা"
        value={tab}
        onChange={(k) => {
          setNewItem("");
          setErr(null);
          ed.stop();
          router.replace(`/admin/lists?tab=${k}`, { scroll: false });
        }}
        options={KINDS.map((k) => ({ value: k, label: META[k].title, count: k === tab ? bn(rows.length) : undefined }))}
      />
      <Panel className="flex max-w-[760px] flex-col gap-3 p-[18px]">
        <div>
          <h2 className="m-0 text-[20px] font-bold">{meta.title}</h2>
          <div className="text-[15px] text-muted">কোথায় দেখায়: {meta.where}</div>
        </div>
        <form
          className="flex flex-col gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            addItem();
          }}
        >
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={(e) => {
                setNewItem(e.target.value);
                setErr(null);
              }}
              placeholder={meta.placeholder}
              aria-label={`নতুন ${meta.title}`}
              aria-invalid={!!err}
              className="h-[52px] min-w-0 flex-1 rounded-[10px] border-[1.5px] border-field px-3.5 text-[17px] outline-none focus:border-brand aria-invalid:border-blood"
            />
            <Button type="submit" size="lg" className="px-[18px] font-bold" disabled={!newItem.trim()}>
              + যোগ
            </Button>
          </div>
          {err && <span className="text-[15px] font-semibold text-blood-700">{err}</span>}
        </form>
        <div className="flex flex-col">
          {list.loading && <p className="py-4 text-muted">লোড হচ্ছে…</p>}
          {rows.map((it, i) => (
            <div key={it.id} className="flex flex-wrap items-center gap-2 border-b border-divider py-2.5 last:border-0">
              <Reorder label={it.name} onUp={() => list.move(i, -1, "/admin/lists/reorder/")} onDown={() => list.move(i, 1, "/admin/lists/reorder/")} />
              {ed.is(String(it.id)) ? (
                <InlineEditor
                  initial={it.name}
                  onCancel={ed.stop}
                  onSave={async (v) => {
                    if (rows.some((x) => x.name === v && x.id !== it.id)) {
                      fail(new Error(`"${v}" আগে থেকেই আছে`));
                      return;
                    }
                    ed.stop();
                    try {
                      await list.update(it.id, { name: v });
                      flash(`"${v}" সংরক্ষণ হয়েছে · অডিট লগে লেখা হলো`);
                    } catch (e) {
                      fail(e);
                    }
                  }}
                />
              ) : (
                <>
                  <div className="min-w-0 flex-[1_1_160px]">
                    <div className="text-[17px] font-semibold">{it.name}</div>
                    <div className="text-[14px] text-muted">{it.usage ? `${bn(it.usage)}${meta.unit} ব্যবহৃত` : "এখনো ব্যবহৃত হয়নি"}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <IconAction label={`${it.name} — নাম বদলান`} icon={icons.edit} onClick={() => ed.start(String(it.id))} />
                    <IconAction label={`${it.name} — মুছুন`} tone="danger" icon={icons.delete} onClick={() => list.remove(it, it.name, it.usage ? `এটি ${bn(it.usage)}${meta.unit} ব্যবহৃত। মুছলে সেগুলো "অন্যান্য"-তে চলে যাবে।` : "এটি কোথাও ব্যবহৃত হয়নি।")} />
                  </div>
                </>
              )}
            </div>
          ))}
          {list.items && !rows.length && <div className="px-2.5 py-7 text-center text-[17px] text-muted">এই তালিকা খালি। উপরে নতুন নাম লিখে যোগ করুন।</div>}
        </div>
      </Panel>
    </>
  );
}
