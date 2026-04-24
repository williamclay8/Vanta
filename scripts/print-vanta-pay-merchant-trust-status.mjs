import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getVantaPayMerchantTrustStatus } from "../src/pay/vantaPayMerchantTrustStatus.ts";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");
const repoRoot = resolve(import.meta.dirname, "..");

const result = getVantaPayMerchantTrustStatus();

if (checkMode) {
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

  assert.equal(result.version, "vanta-pay-merchant-trust-status-0.1");
  assert.equal(result.privacyMode, "controlled-privacy");
  assert.equal(result.policyMode, "legible-trust");
  assert.equal(result.productionReady, false);
  assert.equal(
    packageJson.scripts["pay:merchant-trust-status"],
    "node scripts/print-vanta-pay-merchant-trust-status.mjs",
    "package.json must expose the human-readable Vanta Pay merchant trust status.",
  );
  assert.equal(
    packageJson.scripts["pay:merchant-trust-status-json"],
    "node scripts/print-vanta-pay-merchant-trust-status.mjs --json",
    "package.json must expose the machine-readable Vanta Pay merchant trust status.",
  );
  assert.ok(
    packageJson.scripts["pay:verify"].includes("npm run pay:merchant-trust-status"),
    "pay:verify must include the human-readable Vanta Pay merchant trust status.",
  );
  assert.ok(
    packageJson.scripts["pay:verify"].includes("npm run pay:merchant-trust-status-json"),
    "pay:verify must include the machine-readable Vanta Pay merchant trust status.",
  );
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta Pay Merchant Trust Status");
  console.log(`- privacy mode: ${result.privacyMode}`);
  console.log(`- policy mode: ${result.policyMode}`);
  console.log(`- settlement model: ${result.settlementModel}`);
}
