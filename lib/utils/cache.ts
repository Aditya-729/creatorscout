type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const globalCacheKey = "__creatorscout_cache__";

function getStore() {
  const globalAny = globalThis as typeof globalThis & {
    [globalCacheKey]?: Map<string, CacheEntry<unknown>>;
  };

  if (!globalAny[globalCacheKey]) {
    globalAny[globalCacheKey] = new Map();
  }

  return globalAny[globalCacheKey] as Map<string, CacheEntry<unknown>>;
}

export function cacheGet<T>(key: string): T | null {
  const store = getStore();
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number) {
  const store = getStore();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
