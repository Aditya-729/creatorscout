type RateEntry = {
  count: number;
  resetAt: number;
};

const globalRateKey = "__creatorscout_rate_limit__";

function getStore() {
  const globalAny = globalThis as typeof globalThis & {
    [globalRateKey]?: Map<string, RateEntry>;
  };

  if (!globalAny[globalRateKey]) {
    globalAny[globalRateKey] = new Map();
  }

  return globalAny[globalRateKey] as Map<string, RateEntry>;
}

export function rateLimit(key: string, max: number, windowMs: number) {
  const store = getStore();
  const now = Date.now();
  const current = store.get(key);

  if (!current || now > current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  if (current.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true, remaining: max - current.count };
}
