import { createPostgresPoolOptions } from "../storage/vantaPostgresSnapshotStore.mjs";

export function createVantaRateLimiterCatalog() {
  return {
    availableKinds: ["in-memory-rate-limiter", "postgres-rate-limiter"],
    defaultFallbackKind: "in-memory-rate-limiter",
    preferredProductionKind: "postgres-rate-limiter",
  };
}

async function defaultClientFromDatabaseUrl(databaseUrl) {
  const { Pool } = await import("pg");
  return new Pool(createPostgresPoolOptions(databaseUrl));
}

export function createInMemoryRateLimiter({
  limit = 600,
  now = () => Date.now(),
  windowMs = 60_000,
} = {}) {
  const buckets = new Map();

  return {
    kind: "in-memory-rate-limiter",
    productionReady: false,

    async check(key) {
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

    async reset() {
      buckets.clear();
    },
  };
}

export async function createPostgresRateLimiterFromDatabaseUrl({
  databaseUrl,
  limit = 600,
  service = "unknown",
  tableName = "vanta_rate_limit_buckets",
  now = () => Date.now(),
  windowMs = 60_000,
} = {}) {
  if (!databaseUrl) {
    throw new Error("Vanta Postgres rate limiter requires databaseUrl.");
  }

  return createPostgresRateLimiter({
    client: await defaultClientFromDatabaseUrl(databaseUrl),
    limit,
    now,
    service,
    tableName,
    windowMs,
  });
}

export function createPostgresRateLimiter({
  client,
  limit = 600,
  now = () => Date.now(),
  service = "unknown",
  tableName = "vanta_rate_limit_buckets",
  windowMs = 60_000,
} = {}) {
  if (!client?.query) {
    throw new Error("Vanta Postgres rate limiter requires a Postgres client.");
  }

  async function ensureTable() {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        service TEXT NOT NULL,
        bucket_key TEXT NOT NULL,
        bucket_start TIMESTAMPTZ NOT NULL,
        reset_at TIMESTAMPTZ NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (service, bucket_key, bucket_start)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_service_reset
        ON ${tableName} (service, reset_at)
    `);
  }

  function computeWindow() {
    const currentTime = now();
    const bucketStart = currentTime - (currentTime % windowMs);

    return {
      bucketStart,
      currentTime,
      resetAt: bucketStart + windowMs,
    };
  }

  return {
    kind: "postgres-rate-limiter",
    productionReady: true,

    async check(key) {
      const normalizedKey = String(key || "anonymous");
      const { bucketStart, currentTime, resetAt } = computeWindow();
      await ensureTable();
      await client.query(`DELETE FROM ${tableName} WHERE service = $1 AND reset_at <= $2`, [
        service,
        new Date(currentTime).toISOString(),
      ]);
      const result = await client.query(
        `
          INSERT INTO ${tableName} (
            service,
            bucket_key,
            bucket_start,
            reset_at,
            hit_count
          )
          VALUES ($1, $2, $3, $4, 1)
          ON CONFLICT (service, bucket_key, bucket_start)
          DO UPDATE SET
            hit_count = ${tableName}.hit_count + 1,
            updated_at = NOW()
          RETURNING hit_count, reset_at
        `,
        [
          service,
          normalizedKey,
          new Date(bucketStart).toISOString(),
          new Date(resetAt).toISOString(),
        ],
      );
      const row = result.rows[0];
      const count = Number(row?.hit_count ?? limit);
      const parsedResetAt = row?.reset_at ? Date.parse(row.reset_at) : resetAt;
      const allowed = count <= limit;

      return {
        allowed,
        limit,
        remaining: allowed ? Math.max(0, limit - count) : 0,
        resetAt: Number.isFinite(parsedResetAt) ? parsedResetAt : resetAt,
      };
    },

    async reset() {
      await ensureTable();
      await client.query(`DELETE FROM ${tableName} WHERE service = $1`, [service]);
    },
  };
}
