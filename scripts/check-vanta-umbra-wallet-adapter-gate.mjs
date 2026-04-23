import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const clientSource = readFileSync(resolve(repoRoot, "src/privacy/umbraClient.ts"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

for (const phrase of [
  "UmbraWalletAdapterGate",
  "validateUmbraWalletAdapterGate",
  "walletAdapterGate",
  "umbra-message-intent-approved",
  "umbra-transaction-intent-approved",
  "wallet-requester-mismatch",
]) {
  assert.ok(clientSource.includes(phrase), `Umbra wallet adapter gate missing phrase: ${phrase}`);
}

assert.ok(
  !clientSource.includes("walletSession.signMessage!(message)"),
  "Umbra adapter must not call walletSession.signMessage directly without an adapter gate.",
);
assert.ok(
  !clientSource.includes("walletSession.signTransaction!(transaction as never)"),
  "Umbra adapter must not call walletSession.signTransaction directly without an adapter gate.",
);
assert.ok(
  packageSource.includes('"umbra:wallet-adapter-gate-check"'),
  "package.json must expose umbra:wallet-adapter-gate-check.",
);

console.log("Vanta Umbra wallet adapter gate check: PASS");
