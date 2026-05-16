"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Global poll interval: 500ms when online for real-time consistency ────────
const DEFAULT_POLL_MS = 500;

interface UseDataSyncOptions<T> {
  /** Direct URL — hook will fetch and store the raw JSON response */
  url?: string | null;
  /** Custom fetcher — use when you need to transform the response before storing */
  fetcher?: () => Promise<T>;
  /** Reads cached data from IndexedDB on mount (instant render) */
  cacheFetcher?: () => Promise<T | null>;
  /** Writes fresh data back to IndexedDB after each successful network fetch */
  cacheUpdater?: (data: T) => Promise<void>;
  /** Polling interval in ms (default 500). Set 0 to disable polling. */
  pollInterval?: number;
}

interface UseDataSyncReturn<T> {
  data: T | null;
  /** True ONLY when there is zero data (not even cached). False once anything loads. */
  loading: boolean;
  /** True while a background network fetch is in progress. */
  isValidating: boolean;
  error: Error | null;
  /** Optimistically update local state + cache without a network round-trip. */
  mutate: (newData: T, updateCache?: boolean) => void;
  /** Force an immediate network re-fetch. */
  revalidate: () => Promise<void>;
}

export function useDataSync<T>({
  url,
  fetcher,
  cacheFetcher,
  cacheUpdater,
  pollInterval = DEFAULT_POLL_MS,
}: UseDataSyncOptions<T>): UseDataSyncReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // ── Refs for everything used inside callbacks / intervals ──────────────────
  const dataRef = useRef<T | null>(null);
  const urlRef = useRef(url);
  const fetcherRef = useRef(fetcher);
  const cacheFetcherRef = useRef(cacheFetcher);
  const cacheUpdaterRef = useRef(cacheUpdater);
  const isMounted = useRef(true);
  const isRevalidating = useRef(false);
  const initDone = useRef(false);

  // Keep refs in sync every render (cheap, no effect overhead)
  urlRef.current = url;
  fetcherRef.current = fetcher;
  cacheFetcherRef.current = cacheFetcher;
  cacheUpdaterRef.current = cacheUpdater;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Core revalidation ─────────────────────────────────────────────────────
  const revalidate = useCallback(async () => {
    if ((!urlRef.current && !fetcherRef.current) || !navigator.onLine) return;
    if (isRevalidating.current) return;
    isRevalidating.current = true;

    if (isMounted.current) setIsValidating(true);
    try {
      let newData: T;
      if (fetcherRef.current) {
        newData = await fetcherRef.current();
      } else {
        const res = await fetch(urlRef.current!, {
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        newData = await res.json();
      }

      // Only update React state if data actually changed
      const oldStr = JSON.stringify(dataRef.current);
      const newStr = JSON.stringify(newData);

      if (oldStr !== newStr && isMounted.current) {
        setData(newData);
        dataRef.current = newData;
        cacheUpdaterRef.current?.(newData).catch(() => {});
      }
      if (isMounted.current) {
        setError(null);
        setLoading(false);
      }
    } catch (err: any) {
      if (isMounted.current) setError(err);
    } finally {
      isRevalidating.current = false;
      if (isMounted.current) setIsValidating(false);
    }
  }, []);

  // ── Determine if we have a data source ────────────────────────────────────
  const hasSource = !!(url || fetcher);

  // ── Init: load cache → first revalidation → start polling ─────────────────
  useEffect(() => {
    if (!hasSource) return;

    let interval: ReturnType<typeof setInterval>;
    let cancelled = false;

    const init = async () => {
      // 1. Serve from cache instantly (always try, never skip)
      if (cacheFetcherRef.current) {
        try {
          const cached = await cacheFetcherRef.current();
          if (cached != null && !cancelled && isMounted.current) {
            setData(cached);
            dataRef.current = cached;
            setLoading(false); // We have data from cache — no spinner
          }
        } catch (_) {}
      }

      // 2. Immediately revalidate from network
      if (!cancelled) await revalidate();

      // 3. Start fast polling
      if (pollInterval > 0 && !cancelled) {
        interval = setInterval(revalidate, pollInterval);
      }
      initDone.current = true;
    };

    init();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [hasSource, pollInterval, revalidate]);

  // ── Re-validate immediately when coming back online ───────────────────────
  useEffect(() => {
    const h = () => revalidate();
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [revalidate]);

  // ── Optimistic mutate ─────────────────────────────────────────────────────
  const mutate = useCallback((newData: T, updateCache = true) => {
    setData(newData);
    dataRef.current = newData;
    setLoading(false);
    if (updateCache) cacheUpdaterRef.current?.(newData).catch(() => {});
  }, []);

  return { data, loading, isValidating, error, mutate, revalidate };
}
