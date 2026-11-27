"use client";

import { nowMs } from "@/lib/cn";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrefixInput } from "@/components/ui/form";
import { Input } from "@/components/ui/form";
import { ApiError, api, errorMessage } from "@/lib/api";
import { bn, digitsOnly, formatPhone, normalisePhone } from "@/lib/bn";
import { cn } from "@/lib/cn";
import { login } from "@/lib/session";

/** Shown only in local development builds when the backend uses OTP_DEV_CODE. */
const DEV_HINT = process.env.NEXT_PUBLIC_OTP_HINT;

function safeNext(raw: string | null | undefined) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

export function LoginFlow() {
  const router = useRouter();
  const next = safeNext(useSearchParams()?.get("next"));
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<{ msg: string; left?: number; code?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [expired, setExpired] = useState(false);
  const [screenCode, setScreenCode] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const expiresAt = useRef(0);

  useEffect(() => {
    if (step !== "otp") return;
    const t = setInterval(() => {
      setResendIn((s) => Math.max(0, s - 1));
      if (nowMs() > expiresAt.current) setExpired(true);
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  const phone = normalisePhone(phoneRaw);

  const sendCode = async () => {
    if (!phone) {
      setPhoneError("১১ সংখ্যার নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮");
      return;
    }
    setPhoneError(null);
    setSending(true);
    try {
      const r = await api.sendOtp(phone);
      expiresAt.current = nowMs() + r.expires_in * 1000;
      setResendIn(r.resend_in);
      setScreenCode(r.screen_code ?? null);
      setExpired(false);
      setOtp("");
      setOtpError(null);
      setStep("otp");
      setTimeout(() => otpRef.current?.focus(), 50);
    } catch (err) {
      if (err instanceof ApiError && err.code === "otp_too_soon" && step === "otp") {
        setResendIn(Number(err.data.retry_in ?? 45));
      } else if (err instanceof ApiError && err.code === "otp_rate_limited") {
        const mins = Math.ceil(Number(err.data.retry_in ?? 3600) / 60);
        setPhoneError(`এক ঘণ্টায় ৫ বার কোড চাওয়া হয়েছে। ${bn(mins)} মিনিট পর আবার চেষ্টা করুন, অথবা পাড়ার স্বেচ্ছাসেবকের সাহায্য নিন।`);
        setStep("phone");
      } else {
        setPhoneError(errorMessage(err));
        setStep("phone");
      }
    } finally {
      setSending(false);
    }
  };

  const digits = digitsOnly(otp).slice(0, 6);
  const locked = otpError?.left === 0;

  const verify = async () => {
    if (digits.length !== 6 || !phone || locked) return;
    setVerifying(true);
    setOtpError(null);
    try {
      const r = await api.verifyOtp(phone, digits);
      login(r.access, r.refresh, r.member);
      router.push(next.startsWith("/admin") && r.member.role === "member" ? "/dashboard" : next);
    } catch (err) {
      if (err instanceof ApiError && err.code === "pending") {
        router.push("/register?step=pending");
        return;
      }
      if (err instanceof ApiError && err.code === "otp_expired") {
        setExpired(true);
      } else if (err instanceof ApiError && err.code === "otp_invalid") {
        const left = Number(err.data?.attempts_left ?? 0);
        setOtpError({ msg: left > 0 ? `কোডটি মেলেনি। আবার চেষ্টা করুন — আর ${bn(left)} বার সুযোগ আছে।` : "অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।", left });
        setOtp("");
        otpRef.current?.focus();
      } else {
        setOtpError({ msg: errorMessage(err), code: err instanceof ApiError ? err.code : undefined });
      }
    } finally {
      setVerifying(false);
    }
  };

  if (step === "phone") {
    return (
      <form
        noValidate
        className="flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          sendCode();
        }}
      >
        <div>
          <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.3] font-bold">লগইন করুন</h1>
          <p className="mt-1.5 mb-0 text-[17px] text-muted">আপনার ফোন নম্বর দিন। একটি ৬ সংখ্যার কোড SMS-এ যাবে — কোনো পাসওয়ার্ড লাগবে না।</p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="login-phone" className="text-[17px] font-semibold">
            ফোন নম্বর
          </label>
          <PrefixInput
            id="login-phone"
            prefix="+৮৮"
            strong
            invalid={!!phoneError}
            value={phoneRaw}
            onChange={(e) => setPhoneRaw(e.target.value)}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="০১৭XXXXXXXX"
            inputClassName="text-[22px] tracking-[1px]"
          />
          {phoneError ? (
            <span role="alert" className="text-[15px] font-semibold text-blood-700">
              {phoneError}
            </span>
          ) : (
            <span className="text-[15px] text-muted">বাংলা বা ইংরেজি — যেকোনো সংখ্যায় লিখতে পারেন।</span>
          )}
        </div>
        <Button type="submit" size="xl" loading={sending} loadingText="কোড পাঠানো হচ্ছে…">
          কোড পাঠান
        </Button>
        <div className="text-center text-[17px] text-muted">
          নতুন?{" "}
          <Link href="/register" className="font-semibold">
            সদস্য হওয়ার আবেদন করুন
          </Link>
        </div>
      </form>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-[18px]"
      onSubmit={(e) => {
        e.preventDefault();
        verify();
      }}
    >
      <button type="button" onClick={() => setStep("phone")} className="inline-flex min-h-11 items-center gap-1.5 self-start text-[16px] font-semibold text-brand">
        <ArrowLeft className="size-5" aria-hidden />
        নম্বর বদলান
      </button>
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.3] font-bold">কোড লিখুন</h1>
        <p className="mt-1.5 mb-0 text-[17px] text-muted">{formatPhone(phone ?? "")} নম্বরে ৬ সংখ্যার কোড পাঠানো হয়েছে।</p>
      </div>

      <div className="grid grid-cols-6 gap-2" onClick={() => otpRef.current?.focus()} aria-hidden>
        {Array.from({ length: 6 }, (_, i) => {
          const d = digits[i];
          return (
            <div
              key={i}
              className={cn(
                "flex h-16 items-center justify-center rounded-xl border-2 bg-white text-[28px] font-bold text-ink",
                otpError && !locked ? "border-blood bg-error-field" : i === digits.length ? "border-brand" : d ? "border-brand-200" : "border-field",
              )}
            >
              {d ? bn(d) : ""}
            </div>
          );
        })}
      </div>
      <Input
        ref={otpRef}
        value={otp}
        onChange={(e) => {
          setOtp(digitsOnly(e.target.value).slice(0, 6));
          if (otpError && !locked) setOtpError(null);
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="OTP কোড"
        placeholder="এখানে কোড টাইপ করুন"
        maxLength={12}
        className="text-[18px]"
      />

      {otpError && (
        <div role="alert" className="flex items-start gap-2 rounded-[10px] bg-blood-50 px-3.5 py-3 text-[16px] font-semibold text-blood-800">
          <AlertCircle className="mt-0.5 size-5 flex-none" aria-hidden />
          <span>
            {otpError.msg}
            {otpError.code === "not_registered" && (
              <>
                {" "}
                <Link href="/register" className="underline">
                  আবেদন করুন →
                </Link>
              </>
            )}
          </span>
        </div>
      )}
      {expired && !locked && (
        <div role="alert" className="rounded-[10px] bg-gold-50 px-3.5 py-3 text-[16px] text-gold-800">
          <strong>কোডের মেয়াদ শেষ।</strong> কোড ৫ মিনিট কাজ করে। নতুন কোড নিন।
        </div>
      )}

      <Button type="submit" size="xl" disabled={digits.length !== 6 || locked || expired} loading={verifying} loadingText="যাচাই হচ্ছে…">
        লগইন করুন
      </Button>
      <div className="text-center text-[16px] text-muted">
        {resendIn > 0 ? (
          <>কোড আসেনি? {bn(resendIn)} সেকেন্ড পর আবার পাঠাতে পারবেন</>
        ) : (
          <button type="button" onClick={sendCode} disabled={sending} className="min-h-12 font-semibold text-brand underline">
            {sending ? "পাঠানো হচ্ছে…" : "নতুন কোড পাঠান"}
          </button>
        )}
      </div>
      {screenCode ? (
        <div role="status" className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-gold-200 bg-gold-25 px-4 py-3 text-center">
          <span className="text-[14px] font-semibold text-gold-800">SMS চালু না হওয়া পর্যন্ত আপনার কোড এখানে দেখানো হচ্ছে</span>
          <span className="font-mono text-[32px] leading-none font-bold tracking-[0.3em] text-ink">{bn(screenCode)}</span>
          <button type="button" onClick={() => setOtp(screenCode)} className="mt-1 text-[15px] font-semibold text-brand underline-offset-2 hover:underline">
            কোডটি বসিয়ে দিন
          </button>
        </div>
      ) : (
        DEV_HINT && <p className="m-0 rounded-lg bg-pill px-3 py-2 text-center text-[14px] text-muted">{DEV_HINT}</p>
      )}
    </form>
  );
}
