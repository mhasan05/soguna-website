"use client";

import { useState, type ChangeEvent } from "react";
import { errorMessage } from "./api";

type Values = Record<string, string | boolean>;
type Errors<T> = Partial<Record<keyof T, string>>;
export type FormStatus = "idle" | "loading" | "error" | "success";

/**
 * Minimal form state:
 *  - errors appear after the first submit attempt (E3), then update live
 *  - while submitting the button is disabled (L3)
 *  - on failure the values are kept and a retry is offered (E5)
 */
export function useForm<T extends Values>(initial: T, validate: (v: T) => Errors<T> = () => ({})) {
  const [values, setValues] = useState<T>(initial);
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const errors: Errors<T> = tried ? validate(values) : {};
  const errorCount = Object.values(errors).filter(Boolean).length;

  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value }));

  /** Spread onto <Input>/<Select>/<Textarea>. */
  const bind = (key: keyof T & string) => ({
    name: key,
    value: String(values[key] ?? ""),
    invalid: !!errors[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(key, e.target.value as T[typeof key]),
  });

  const submit = async (action: (v: T) => Promise<unknown>) => {
    setTried(true);
    if (Object.values(validate(values)).some(Boolean)) {
      if (typeof document !== "undefined") {
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      }
      return false;
    }
    setStatus("loading");
    setServerError(null);
    try {
      await action(values);
      setStatus("success");
      return true;
    } catch (err) {
      setServerError(errorMessage(err));
      setStatus("error");
      return false;
    }
  };

  const reset = () => {
    setValues(initial);
    setTried(false);
    setStatus("idle");
    setServerError(null);
  };

  /** Hide errors again (e.g. when a multi-step form moves to the next step). */
  const clearErrors = () => {
    setTried(false);
    setStatus("idle");
  };

  return { values, set, bind, errors, errorCount, submit, status, serverError, reset, clearErrors, loading: status === "loading" };
}

export const required = (v: string | boolean | undefined, msg: string) => (typeof v === "string" ? (v.trim() ? undefined : msg) : v ? undefined : msg);
