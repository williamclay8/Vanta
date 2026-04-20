export function createInMemoryRateLimiter({
  limit = 600,
  now = () => Date.now(),
  windowMs = 60_000,
} = {}) {
  const buckets = new Map();

  return {
    kind: "in-memory-rate-limiter",
    productionReady: false,

    check(key) {
      const normalizedKey = String(key || "anonymous");
      const currentTime = now();
      const existing = buckets.get(normalizedKey);
      const bucket =
        existing && existing.resetAt > currentTime
          ? existing
          : {
              count: 0,
              resetAt: currentTime + windowMs,
            };

      if (bucket.count >= limit) {
        buckets.set(normalizedKey, bucket);
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetAt: bucket.resetAt,
        };
      }

      bucket.count += 1;
      buckets.set(normalizedKey, bucket);

      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - bucket.count),
        resetAt: bucket.resetAt,
      };
    },

    reset() {
      buckets.clear();
    },
  };
}
