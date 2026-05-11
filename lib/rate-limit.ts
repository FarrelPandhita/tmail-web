import { LRUCache } from "lru-cache";

type RateLimitOptions = {
  limit: number;
  windowMs: number; // milliseconds
};

type TokenData = {
  count: number;
  resetAt: number;
};

// Per-IP login rate limiter (5 attempts / 15 min)
const loginCache = new LRUCache<string, TokenData>({
  max: 10000,
  ttl: 15 * 60 * 1000, // 15 minutes
});

// Per-session API rate limiter (60 req / 1 min)
const apiCache = new LRUCache<string, TokenData>({
  max: 10000,
  ttl: 60 * 1000, // 1 minute
});

function checkRate(
  cache: LRUCache<string, TokenData>,
  key: string,
  { limit, windowMs }: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = cache.get(key);

  if (!existing) {
    const resetAt = now + windowMs;
    cache.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  cache.set(key, existing);
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export function checkLoginRate(ip: string) {
  return checkRate(loginCache, `login:${ip}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
}

export function resetLoginRate(ip: string) {
  loginCache.delete(`login:${ip}`);
}

export function checkApiRate(sessionId: string) {
  return checkRate(apiCache, `api:${sessionId}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });
}
