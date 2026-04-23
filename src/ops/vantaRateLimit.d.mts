export type VantaRateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export type VantaRateLimiter = {
  check(key: string): Promise<VantaRateLimitDecision>;
  kind: "in-memory-rate-limiter" | "postgres-rate-limiter";
  productionReady: boolean;
  reset(): Promise<void>;
};

export function createVantaRateLimiterCatalog(): {
  availableKinds: ["in-memory-rate-limiter", "postgres-rate-limiter"];
  defaultFallbackKind: "in-memory-rate-limiter";
  preferredProductionKind: "postgres-rate-limiter";
};

export function createInMemoryRateLimiter(options?: {
  limit?: number;
  now?: () => number;
  windowMs?: number;
}): VantaRateLimiter;

export function createPostgresRateLimiter(options: {
  client: { query: (...args: any[]) => Promise<{ rows?: unknown[] }> };
  limit?: number;
  now?: () => number;
  service?: string;
  tableName?: string;
  windowMs?: number;
}): VantaRateLimiter;

export function createPostgresRateLimiterFromDatabaseUrl(options: {
  databaseUrl: string;
  limit?: number;
  now?: () => number;
  service?: string;
  tableName?: string;
  windowMs?: number;
}): Promise<VantaRateLimiter>;
