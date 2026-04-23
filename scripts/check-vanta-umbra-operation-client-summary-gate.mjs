import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const operationsSource = readFileSync(resolve(repoRoot, "src/privacy/umbraOperations.ts"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");
const readinessSource = readFileSync(resolve(repoRoot, "src/readiness/mainnetReadiness.mjs"), "utf8");

for (const phrase of [
  "operationApprovalSummary?: UmbraOperationApprovalSummary",
  "humanApprovedOperationSummary?: boolean",
  "resolveUmbraOperationClient",
  "requireMatchingUmbraOperationApprovalSummary",
  "createUmbraOperationWalletAdapterGateFromSummary",
  "args.operationApprovalSummary",
  'operationKind: "register-user"',
  'operationKind: "query-encrypted-balances"',
  'operationKind: "deposit-public-to-encrypted-balance"',
  'operationKind: "withdraw-encrypted-to-public-balance"',
  'operationKind: "scan-claimable-utxos"',
]) {
  assert.ok(operationsSource.includes(phrase), `Umbra operation client summary gate missing phrase: ${phrase}`);
}

assert.ok(
  !operationsSource.includes("const client = await resolveUmbraClient(args);"),
  "Umbra operations must not resolve a wallet client without operation-specific summary gate adoption.",
);
assert.ok(
  packageSource.includes('"umbra:operation-client-summary-gate-check"'),
  "package.json must expose umbra:operation-client-summary-gate-check.",
);
assert.ok(
  packageSource.includes("npm run umbra:operation-client-summary-gate-check"),
  "mainnet:preflight must include umbra:operation-client-summary-gate-check.",
);
assert.ok(
  readinessSource.includes('"npm run umbra:operation-client-summary-gate-check"'),
  "mainnet readiness required commands must include umbra:operation-client-summary-gate-check.",
);

console.log("Vanta Umbra operation client summary gate check: PASS");
