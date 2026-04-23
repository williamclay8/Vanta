import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const operationsSource = readFileSync(resolve(repoRoot, "src/privacy/umbraOperations.ts"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

for (const phrase of [
  "createUmbraRegisterUserApprovalSummary",
  "createUmbraEncryptedBalanceQueryApprovalSummary",
  "createUmbraDepositApprovalSummary",
  "createUmbraWithdrawApprovalSummary",
  "createUmbraClaimableUtxoScanApprovalSummary",
  'operationKind: "register-user"',
  'operationKind: "query-encrypted-balances"',
  'operationKind: "deposit-public-to-encrypted-balance"',
  'operationKind: "withdraw-encrypted-to-public-balance"',
  'operationKind: "scan-claimable-utxos"',
  "formatUmbraOperationBaseUnitAmount",
  "formatUmbraQueryMintSummary",
]) {
  assert.ok(operationsSource.includes(phrase), `Umbra operation summary builder missing phrase: ${phrase}`);
}

assert.ok(
  packageSource.includes('"umbra:operation-summary-builders-check"'),
  "package.json must expose umbra:operation-summary-builders-check.",
);
assert.ok(
  packageSource.includes("npm run umbra:operation-summary-builders-check"),
  "mainnet:preflight must include umbra:operation-summary-builders-check.",
);

console.log("Vanta Umbra operation summary builders check: PASS");
