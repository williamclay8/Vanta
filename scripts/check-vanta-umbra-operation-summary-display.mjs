import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const operationsSource = readFileSync(resolve(repoRoot, "src/privacy/umbraOperations.ts"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

for (const phrase of [
  "UmbraOperationApprovalDisplay",
  "createUmbraOperationApprovalDisplay",
  "Private balance registration",
  "Private balance lookup",
  "Shield into private balance",
  "Withdraw private balance",
  "Claimable private funds scan",
  "Wallet approval",
  "Transaction approval",
  "Message approval",
]) {
  assert.ok(operationsSource.includes(phrase), `Umbra operation summary display missing phrase: ${phrase}`);
}

assert.ok(
  packageSource.includes('"umbra:operation-summary-display-check"'),
  "package.json must expose umbra:operation-summary-display-check.",
);
assert.ok(
  packageSource.includes("npm run umbra:operation-summary-display-check"),
  "mainnet:preflight must include umbra:operation-summary-display-check.",
);

console.log("Vanta Umbra operation summary display check: PASS");
