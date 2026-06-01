"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useDataSync — Offline-first SWR hook for Reimbursify PWA.
 *
 * Data flow:
 *   1. Mount → read IndexedDB cache → render instantly
 *   2. Fire network fetch → compare hash → update state only if changed
 *   3. Poll every 5s (when online/visible) for real-time consistency
 *   4. On reconnect or visibility gain → immediate revalidation
 */

const DEFAULT_POLL_MS = 5000;

// Fast string hash (djb2) to avoid keeping large JSON strings in memory
function fastHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

interface UseDataSyncOptions<T> {
  url?: string | null;
  fetcher?: () => Promise<T>;
  cacheFetcher?: () => Promise<T | null>;
  cacheUpdater?: (data: T) => Promise<void>;
  pollInterval?: number;
  focusRevalidate?: boolean;
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
  const dataHashRef = useRef<number | null>(null);
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

      // Hash comparison: only update React state when payload actually changed
      const newHash = fastHash(JSON.stringify(result));
      if (newHash !== dataHashRef.current && mountedRef.current) {
        dataHashRef.current = newHash;
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
          const cachedHash = fastHash(JSON.stringify(cached));
          dataHashRef.current = cachedHash;
          setData(cached);
          setLoading(false);
        }
      }).catch(() => {});
    }

    // 2. Fire first network fetch (does not block polling start)
    doFetch();

    // 3. Start polling conditionally
    const startPolling = () => {
      if (pollInterval > 0 && !intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            doFetch();
          }
        }, pollInterval);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        doFetch(); // Revalidate immediately on focus
        startPolling();
      } else {
        stopPolling(); // Pause polling when hidden
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
    const newHash = fastHash(JSON.stringify(newData));
    dataHashRef.current = newHash;
    setData(newData);
    setLoading(false);
    if (updateCache) cacheUpdaterRef.current?.(newData).catch(() => {});
  }, []);

  return { data, loading, isValidating, error, mutate, revalidate: doFetch };
}
