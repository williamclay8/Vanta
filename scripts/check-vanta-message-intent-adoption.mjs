import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const swapSource = readFileSync(resolve(repoRoot, "src/pages/SwapPage.tsx"), "utf8");
const unshieldSource = readFileSync(resolve(repoRoot, "src/pages/UnshieldPage.tsx"), "utf8");

assert.ok(
  swapSource.includes("signWalletMessageIntentWithSafety"),
  "Swap must wrap signed operator intents with wallet message-intent safety.",
);
assert.ok(
  unshieldSource.includes("signWalletMessageIntentWithSafety"),
  "Unshield must wrap signed operator intents with wallet message-intent safety.",
);

for (const phrase of [
  'intentKind: "swap-intent"',
  "VANTA_SWAP_INTENT_TTL_MS",
  "messageIntentSignature.signatureBytes",
  "message-intent-ready-for-wallet-approval",
]) {
  assert.ok(swapSource.includes(phrase), `Swap message-intent adoption missing phrase: ${phrase}`);
}

for (const phrase of [
  'intentKind: "unshield-intent"',
  'intentKind: "sol-unshield-intent"',
  "VANTA_UNSHIELD_INTENT_TTL_MS",
  "VANTA_SOL_UNSHIELD_INTENT_TTL_MS",
  "messageIntentSignature.signatureBytes",
  "message-intent-ready-for-wallet-approval",
  'setStatus("operator_ready")',
  'setStatus("release_ready")',
  "Ready for release approval",
  "Approve release in wallet",
  "Ready to finalize",
  "Finalize in wallet",
]) {
  assert.ok(unshieldSource.includes(phrase), `Unshield message-intent adoption missing phrase: ${phrase}`);
}

console.log("Vanta message-intent adoption check: PASS");
