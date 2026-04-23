import { strict as assert } from "node:assert";
import {
  createInMemoryRateLimiter,
  createPostgresRateLimiter,
  createVantaRateLimiterCatalog,
} from "../src/ops/vantaRateLimit.mjs";

const limiter = createInMemoryRateLimiter({
  limit: 2,
  now: () => currentTime,
  windowMs: 1000,
});

let currentTime = 0;
const catalog = createVantaRateLimiterCatalog();

assert.equal(limiter.kind, "in-memory-rate-limiter");
assert.equal(limiter.productionReady, false);
assert.deepEqual(catalog.availableKinds, ["in-memory-rate-limiter", "postgres-rate-limiter"]);
assert.equal(catalog.defaultFallbackKind, "in-memory-rate-limiter");
assert.equal(catalog.preferredProductionKind, "postgres-rate-limiter");

assert.deepEqual(await limiter.check("merchant-a"), {
  allowed: true,
  limit: 2,
  remaining: 1,
  resetAt: 1000,
});
assert.deepEqual(await limiter.check("merchant-a"), {
  allowed: true,
  limit: 2,
  remaining: 0,
  resetAt: 1000,
});

const blocked = await limiter.check("merchant-a");
assert.equal(blocked.allowed, false);
assert.equal(blocked.limit, 2);
assert.equal(blocked.remaining, 0);
assert.equal(blocked.resetAt, 1000);

assert.equal((await limiter.check("merchant-b")).allowed, true);

currentTime = 1001;
const reset = await limiter.check("merchant-a");
assert.equal(reset.allowed, true);
assert.equal(reset.remaining, 1);
assert.equal(reset.resetAt, 2001);

function createFakePostgresClient() {
  const buckets = new Map();

  return {
    async query(sql, params = []) {
      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX")) {
        return { rows: [] };
      }

      if (sql.startsWith("DELETE FROM")) {
        if (sql.includes("reset_at <=")) {
          const [service, cutoffIso] = params;
          const cutoff = Date.parse(cutoffIso);
          for (const [key, value] of buckets.entries()) {
            if (value.service === service && value.resetAt <= cutoff) {
              buckets.delete(key);
            }
          }
          return { rows: [] };
        }

        const [service] = params;
        for (const [key, value] of buckets.entries()) {
          if (value.service === service) {
            buckets.delete(key);
          }
        }
        return { rows: [] };
      }

      if (sql.includes("INSERT INTO") && sql.includes("RETURNING hit_count, reset_at")) {
        const [service, bucketKey, bucketStartIso, resetIso] = params;
        const storageKey = `${service}:${bucketKey}:${bucketStartIso}`;
        const existing = buckets.get(storageKey);
        const nextCount = existing ? existing.hitCount + 1 : 1;
        const record = {
          bucketKey,
          bucketStart: Date.parse(bucketStartIso),
          hitCount: nextCount,
          resetAt: Date.parse(resetIso),
          service,
        };
        buckets.set(storageKey, record);
        return {
          rows: [
            {
              hit_count: record.hitCount,
              reset_at: new Date(record.resetAt).toISOString(),
            },
          ],
        };
      }

      throw new Error(`Unhandled fake Postgres query: ${sql}`);
    },
  };
}

let postgresNow = 0;
const postgresLimiter = createPostgresRateLimiter({
  client: createFakePostgresClient(),
  limit: 2,
  now: () => postgresNow,
  service: "test-service",
  windowMs: 1000,
});

assert.equal(postgresLimiter.kind, "postgres-rate-limiter");
assert.equal(postgresLimiter.productionReady, true);

assert.deepEqual(await postgresLimiter.check("merchant-a"), {
  allowed: true,
  limit: 2,
  remaining: 1,
  resetAt: 1000,
});
assert.deepEqual(await postgresLimiter.check("merchant-a"), {
  allowed: true,
  limit: 2,
  remaining: 0,
  resetAt: 1000,
});

const postgresBlocked = await postgresLimiter.check("merchant-a");
assert.equal(postgresBlocked.allowed, false);
assert.equal(postgresBlocked.remaining, 0);
assert.equal(postgresBlocked.resetAt, 1000);

postgresNow = 1001;
const postgresReset = await postgresLimiter.check("merchant-a");
assert.equal(postgresReset.allowed, true);
assert.equal(postgresReset.remaining, 1);
assert.equal(postgresReset.resetAt, 2000);

console.log("Vanta rate-limit middleware check: PASS");
