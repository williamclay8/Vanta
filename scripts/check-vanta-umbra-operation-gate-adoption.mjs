import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const operationsSource = readFileSync(resolve(repoRoot, "src/privacy/umbraOperations.ts"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

for (const phrase of [
  "type UmbraWalletAdapterGate",
  "walletAdapterGate?: UmbraWalletAdapterGate",
  "createUmbraOperationWalletAdapterGate",
  "resolveUmbraClient(args)",
  "walletAdapterGate: args.walletAdapterGate",
  'intentKind: "message" | "transaction"',
  "messageIntentApproved: intentKind === \"message\"",
  "transactionIntentApproved: intentKind === \"transaction\"",
]) {
  assert.ok(operationsSource.includes(phrase), `Umbra operation gate adoption missing phrase: ${phrase}`);
}

assert.ok(
  !operationsSource.includes("createUmbraClientFromWalletSession({\n    config: args.config,\n    walletSession: args.walletSession"),
  "Umbra operations must not create a wallet-session client without passing the adapter gate.",
);
assert.ok(
  packageSource.includes('"umbra:operation-gate-adoption-check"'),
  "package.json must expose umbra:operation-gate-adoption-check.",
);

console.log("Vanta Umbra operation gate adoption check: PASS");
