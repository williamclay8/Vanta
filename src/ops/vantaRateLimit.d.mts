export type VantaRateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export type VantaRateLimiter = {
  check(key: string): VantaRateLimitDecision;
  kind: "in-memory-rate-limiter";
  productionReady: false;
  reset(): void;
};

export function createInMemoryRateLimiter(options?: {
  limit?: number;
  now?: () => number;
  windowMs?: number;
}): VantaRateLimiter;
