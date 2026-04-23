import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const operationsSource = readFileSync(resolve(repoRoot, "src/privacy/umbraOperations.ts"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

for (const phrase of [
  "UmbraOperationKind",
  "vanta-umbra-operation-approval-summary",
  "createUmbraOperationApprovalSummary",
  "validateUmbraOperationApprovalSummary",
  "createUmbraOperationWalletAdapterGateFromSummary",
  "register-user",
  "query-encrypted-balances",
  "deposit-public-to-encrypted-balance",
  "withdraw-encrypted-to-public-balance",
  "scan-claimable-utxos",
  "umbra-operation-ready-for-wallet-approval",
  "umbra-operation-wallet-mismatch",
]) {
  assert.ok(operationsSource.includes(phrase), `Umbra operation summary missing phrase: ${phrase}`);
}

assert.ok(
  packageSource.includes('"umbra:operation-summary-check"'),
  "package.json must expose umbra:operation-summary-check.",
);

console.log("Vanta Umbra operation summary check: PASS");
