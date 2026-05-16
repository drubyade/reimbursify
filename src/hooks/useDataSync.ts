"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useDataSync — Offline-first SWR hook for Reimbursify PWA.
 *
 * Data flow:
 *   1. Mount → read IndexedDB cache → render instantly
 *   2. Fire network fetch → compare → update state only if changed
 *   3. Poll every 500ms (when online) for real-time consistency
 *   4. On reconnect → immediate revalidation
 */

const DEFAULT_POLL_MS = 500;

interface UseDataSyncOptions<T> {
  url?: string | null;
  fetcher?: () => Promise<T>;
  cacheFetcher?: () => Promise<T | null>;
  cacheUpdater?: (data: T) => Promise<void>;
  pollInterval?: number;
}

interface UseDataSyncReturn<T> {
  data: T | null;
  loading: boolean;
  isValidating: boolean;
  error: Error | null;
  mutate: (newData: T, updateCache?: boolean) => void;
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
  const [loading, setLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ── Stable refs — assigned synchronously every render ─────────────────────
  const dataStrRef = useRef("");
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const urlRef = useRef(url);
  const fetcherRef = useRef(fetcher);
  const cacheFetcherRef = useRef(cacheFetcher);
  const cacheUpdaterRef = useRef(cacheUpdater);

  // Sync refs every render (zero cost, no useEffect needed)
  urlRef.current = url;
  fetcherRef.current = fetcher;
  cacheFetcherRef.current = cacheFetcher;
  cacheUpdaterRef.current = cacheUpdater;

  // Track mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Stable fetch function (never changes identity) ────────────────────────
  const doFetch = useCallback(async () => {
    const fn = fetcherRef.current;
    const u = urlRef.current;
    if (!fn && !u) return;
    if (!navigator.onLine) return;
    if (busyRef.current) return; // skip if previous fetch still in-flight
    busyRef.current = true;

    if (mountedRef.current) setIsValidating(true);
    try {
      let result: T;
      if (fn) {
        result = await fn();
      } else {
        const res = await fetch(u!, { headers: { "Cache-Control": "no-cache" } });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        result = await res.json();
      }

      // Deep-compare: only update React state when payload actually changed
      const newStr = JSON.stringify(result);
      if (newStr !== dataStrRef.current && mountedRef.current) {
        dataStrRef.current = newStr;
        setData(result);
        cacheUpdaterRef.current?.(result).catch(() => {});
      }

      if (mountedRef.current) {
        setError(null);
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current) setError(err);
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setIsValidating(false);
    }
  }, []); // stable — reads from refs only

  // ── Track whether a data source exists (stable boolean trigger) ───────────
  const hasSource = !!(url || fetcher);

  // ── Main lifecycle: cache → fetch → poll ──────────────────────────────────
  useEffect(() => {
    if (!hasSource) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    // 1. Read from cache IMMEDIATELY for instant render
    const cf = cacheFetcherRef.current;
    if (cf) {
      cf().then((cached) => {
        if (cached != null && !cancelled && mountedRef.current) {
          const cachedStr = JSON.stringify(cached);
          dataStrRef.current = cachedStr;
          setData(cached);
          setLoading(false);
        }
      }).catch(() => {});
    }

    // 2. Fire first network fetch (does not block polling start)
    doFetch();

    // 3. Start 500ms polling unconditionally
    if (pollInterval > 0) {
      intervalId = setInterval(doFetch, pollInterval);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [hasSource, pollInterval, doFetch]);

  // ── Reconnect handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => { busyRef.current = false; doFetch(); };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [doFetch]);

  // ── Optimistic mutate ─────────────────────────────────────────────────────
  const mutate = useCallback((newData: T, updateCache = true) => {
    const newStr = JSON.stringify(newData);
    dataStrRef.current = newStr;
    setData(newData);
    setLoading(false);
    if (updateCache) cacheUpdaterRef.current?.(newData).catch(() => {});
  }, []);

  return { data, loading, isValidating, error, mutate, revalidate: doFetch };
}
