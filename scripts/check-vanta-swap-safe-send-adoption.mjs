import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const swapPath = resolve(import.meta.dirname, "../src/pages/SwapPage.tsx");
const source = readFileSync(swapPath, "utf8");

assert.ok(source.includes("useVantaSafeSendTransaction"), "Swap must import the Vanta safe-send hook.");
assert.ok(!source.includes("useSendTransaction"), "Swap must not use raw useSendTransaction for generic transactions.");
assert.ok(
  !source.includes("signSwapIntent(payload, walletSession.signMessage)"),
  "Swap must not pass signMessage directly to the swap intent signer.",
);

for (const phrase of [
  "const swapTransaction = useVantaSafeSendTransaction();",
  "const spentMarkerTransaction = useVantaSafeSendTransaction();",
  "summaryInstructions",
  "transactionFingerprint",
  "swap-transition",
  "swap-spent-marker",
  "signSwapIntent(payload, async (message) => {",
  "signWalletMessageIntentWithSafety",
]) {
  assert.ok(source.includes(phrase), `Swap safe-send adoption missing phrase: ${phrase}`);
}

console.log("Vanta Swap safe-send adoption check: PASS");
