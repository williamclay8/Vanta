import { strict as assert } from "node:assert";
import { createInMemoryRateLimiter } from "../src/ops/vantaRateLimit.mjs";

const limiter = createInMemoryRateLimiter({
  limit: 2,
  now: () => currentTime,
  windowMs: 1000,
});

let currentTime = 0;

assert.equal(limiter.kind, "in-memory-rate-limiter");
assert.equal(limiter.productionReady, false);

assert.deepEqual(limiter.check("merchant-a"), {
  allowed: true,
  limit: 2,
  remaining: 1,
  resetAt: 1000,
});
assert.deepEqual(limiter.check("merchant-a"), {
  allowed: true,
  limit: 2,
  remaining: 0,
  resetAt: 1000,
});

const blocked = limiter.check("merchant-a");
assert.equal(blocked.allowed, false);
assert.equal(blocked.limit, 2);
assert.equal(blocked.remaining, 0);
assert.equal(blocked.resetAt, 1000);

assert.equal(limiter.check("merchant-b").allowed, true);

currentTime = 1001;
const reset = limiter.check("merchant-a");
assert.equal(reset.allowed, true);
assert.equal(reset.remaining, 1);
assert.equal(reset.resetAt, 2001);

console.log("Vanta rate-limit middleware check: PASS");
