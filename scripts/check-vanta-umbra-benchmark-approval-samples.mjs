import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const benchmarkSource = readFileSync(resolve(repoRoot, "src/privacy/umbraBenchmark.ts"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

for (const phrase of [
  "operationApprovalSamples",
  "createUmbraOperationApprovalDisplay",
  "createUmbraDepositApprovalSummary",
  "createUmbraEncryptedBalanceQueryApprovalSummary",
  "createUmbraWithdrawApprovalSummary",
  "createUmbraClaimableUtxoScanApprovalSummary",
  "benchmark-review-wallet",
]) {
  assert.ok(benchmarkSource.includes(phrase), `Umbra benchmark approval samples missing phrase: ${phrase}`);
}

assert.ok(
  packageSource.includes('"umbra:benchmark-approval-samples-check"'),
  "package.json must expose umbra:benchmark-approval-samples-check.",
);
assert.ok(
  packageSource.includes("npm run umbra:benchmark-approval-samples-check"),
  "mainnet:preflight must include umbra:benchmark-approval-samples-check.",
);

console.log("Vanta Umbra benchmark approval samples check: PASS");
