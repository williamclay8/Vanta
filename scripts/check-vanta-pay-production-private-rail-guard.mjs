import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const payServerSource = readFileSync(resolve(repoRoot, "operator/pay-server.mjs"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");
const readinessSource = readFileSync(resolve(repoRoot, "src/readiness/mainnetReadiness.mjs"), "utf8");
const runbookSource = readFileSync(resolve(repoRoot, "docs/operator-runbook.md"), "utf8");

for (const phrase of [
  "Vanta Pay production mode requires VANTA_PAY_DATABASE_URL for durable storage and rate limiting.",
  "Vanta Pay production mode requires the Postgres-backed rate limiter.",
  "Vanta Pay production mode requires VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL.",
  "Vanta Pay production mode requires VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN.",
  "privatePoolOperatorUrl",
  "privatePoolOperatorAuthToken",
]) {
  assert.ok(payServerSource.includes(phrase), `Pay production private rail guard missing phrase: ${phrase}`);
}

assert.ok(
  packageSource.includes('"pay:production-private-rail-guard-check"'),
  "package.json must expose pay:production-private-rail-guard-check.",
);
assert.ok(
  packageSource.includes("npm run pay:production-private-rail-guard-check"),
  "mainnet:preflight must include pay:production-private-rail-guard-check.",
);
assert.ok(
  readinessSource.includes('"npm run pay:production-private-rail-guard-check"'),
  "mainnet readiness required commands must include pay:production-private-rail-guard-check.",
);
assert.ok(
  runbookSource.includes("VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL") &&
    runbookSource.includes("VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN"),
  "operator runbook must document Pay private rail production requirements.",
);

console.log("Vanta Pay production private rail guard check: PASS");
