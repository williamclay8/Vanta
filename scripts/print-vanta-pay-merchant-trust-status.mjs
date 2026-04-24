import { strict as assert } from "node:assert";

import { getVantaPayMerchantTrustStatus } from "../src/pay/vantaPayMerchantTrustStatus.ts";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

const result = getVantaPayMerchantTrustStatus();

if (checkMode) {
  assert.equal(result.version, "vanta-pay-merchant-trust-status-0.1");
  assert.equal(result.privacyMode, "controlled-privacy");
  assert.equal(result.policyMode, "legible-trust");
  assert.equal(result.productionReady, false);
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta Pay Merchant Trust Status");
  console.log(`- privacy mode: ${result.privacyMode}`);
  console.log(`- policy mode: ${result.policyMode}`);
  console.log(`- settlement model: ${result.settlementModel}`);
}
