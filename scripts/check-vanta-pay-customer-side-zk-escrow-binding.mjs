import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const source = readFileSync(
  resolve(repoRoot, "src/pay/vantaPayCustomerSideZkEscrowBinding.ts"),
  "utf8",
);
const receiptSource = readFileSync(
  resolve(repoRoot, "src/pay/vantaPayReceiptPrivacyContract.ts"),
  "utf8",
);

assert.equal(
  packageJson.scripts["pay:customer-side-zk-escrow-binding-check"],
  "node scripts/check-vanta-pay-customer-side-zk-escrow-binding.mjs",
);

assert.match(source, /customerSideZkReady: false/);
assert.match(source, /productionPrivatePayReady: false/);
assert.match(source, /validateVantaPayCustomerSideZkEscrowBinding/);
assert.match(source, /bound: false/);
assert.match(receiptSource, /production_privacy_claims_locked: true/);

console.log("Vanta Pay customer-side ZK escrow binding check: PASS");
