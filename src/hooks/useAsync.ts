import { useState, useEffect, useCallback, useRef } from "react";

// ── Module-level SWR cache ──────────────────────────────────────────

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const invalidationListeners = new Set<() => void>();

/** Clear cache entries and notify all mounted hooks to re-fetch. */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  }
  for (const fn of invalidationListeners) fn();
}

/** Read-only access to cache (for testing). */
export function getCacheEntry(key: string): CacheEntry | undefined {
  return cache.get(key);
}

// ── Hook ────────────────────────────────────────────────────────────

interface UseAsyncOptions {
  /** Cache TTL in ms. Default 30 000. */
  ttl?: number;
  /** Auto-refresh when cache expires. Default true. */
  autoRefresh?: boolean;
  /** Skip fetching when false. Default true. */
  enabled?: boolean;
}

export interface UseAsyncResult<T> {
  data: T | null;
  /** True only on first load (no cached data to show). */
  loading: boolean;
  /** True when refreshing in background (cached data still visible). */
  refreshing: boolean;
  error: string | null;
  /** Force a full re-fetch (clears cache for this key). */
  refresh: () => void;
  /** Epoch ms of last successful fetch, or null. */
  lastUpdated: number | null;
}

export function useAsync<T>(
  key: string,
  fn: () => Promise<T>,
  options?: UseAsyncOptions,
): UseAsyncResult<T> {
  const ttl = options?.ttl ?? 30_000;
  const autoRefresh = options?.autoRefresh ?? true;
  const enabled = options?.enabled ?? true;

  const cached = cache.get(key);

  const [data, setData] = useState<T | null>(
    cached ? (cached.data as T) : null,
  );
  const [loading, setLoading] = useState(!cached && enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(
    cached?.timestamp ?? null,
  );

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const keyRef = useRef(key);
  keyRef.current = key;
  const dataRef = useRef(data);
  dataRef.current = data;

  const execute = useCallback(async (background: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fnRef.current();
      if (!mountedRef.current) return;
      const now = Date.now();
      cache.set(keyRef.current, { data: result, timestamp: now });
      setData(result as T);
      setLastUpdated(now);
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // ── Initial + key-change fetch ──
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      setLoading(false);
      setRefreshing(false);
      return () => { mountedRef.current = false; };
    }

    const entry = cache.get(key);

    if (entry) {
      setData(entry.data as T);
      setLastUpdated(entry.timestamp);
      setLoading(false);
      setRefreshing(false);

      if (Date.now() - entry.timestamp > ttl) {
        execute(true);
      }
    } else {
      setData(null);
      setLastUpdated(null);
      setRefreshing(false);
      execute(false);
    }

    return () => { mountedRef.current = false; };
  }, [key, enabled]);

  // ── Auto-refresh timer ──
  useEffect(() => {
    if (!autoRefresh || !enabled || ttl <= 0) return;

    const checkMs = Math.min(ttl, 10_000);
    const interval = setInterval(() => {
      const entry = cache.get(key);
      const stale = !entry || Date.now() - entry.timestamp > ttl;
      if (stale && !fetchingRef.current) {
        execute(true);
      }
    }, checkMs);

    return () => clearInterval(interval);
  }, [key, ttl, autoRefresh, enabled, execute]);

  // ── Listen for external cache invalidation ──
  useEffect(() => {
    const handler = () => {
      if (!enabled) return;
      if (!cache.has(keyRef.current)) {
        execute(dataRef.current != null);
      }
    };
    invalidationListeners.add(handler);
    return () => { invalidationListeners.delete(handler); };
  }, [enabled, execute]);

  // ── Manual refresh ──
  const refresh = useCallback(() => {
    cache.delete(keyRef.current);
    fetchingRef.current = false;
    execute(dataRef.current != null);
  }, [execute]);

  return { data, loading, refreshing, error, refresh, lastUpdated };
}
