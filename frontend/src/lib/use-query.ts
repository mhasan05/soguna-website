"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "./api";

/**
 * Minimal data hook: fetches when `key` changes (pass null to skip), exposes
 * loading / error / reload and a setter for optimistic updates.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>) {
  const [state, setState] = useState<{ key: string | null; data?: T; error?: string }>({ key: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    fetcher().then(
      (data) => alive && setState({ key, data }),
      (err) => alive && setState({ key, error: errorMessage(err) }),
    );
    return () => {
      alive = false;
    };
    // fetcher is intentionally keyed by `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((fn: (d: T) => T) => setState((s) => (s.data === undefined ? s : { ...s, data: fn(s.data) })), []);

  const fresh = state.key === key;
  return {
    data: fresh ? state.data : undefined,
    error: fresh ? state.error : undefined,
    loading: !!key && (!fresh || (state.data === undefined && !state.error)),
    reload,
    setData,
  };
}
