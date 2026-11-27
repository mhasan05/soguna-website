import { LinkButton } from "@/components/ui/button";

export function NotFoundContent() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-3 px-site py-[clamp(48px,8vw,96px)] text-center">
      <div className="text-[72px] leading-none font-bold text-brand-100">৪০৪</div>
      <h1 className="m-0 text-[clamp(24px,3vw,32px)] font-bold">এই পাতাটি পাওয়া যায়নি</h1>
      <p className="m-0 text-[17px] text-muted">লিংকটি পুরনো হতে পারে, বা নোটিশটি সরিয়ে ফেলা হয়েছে।</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <LinkButton href="/">হোমে যান</LinkButton>
        <LinkButton href="/notices" variant="outline">
          সব নোটিশ
        </LinkButton>
      </div>
    </div>
  );
}
