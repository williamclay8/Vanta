import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const shieldPath = resolve(import.meta.dirname, "../src/pages/ShieldPage.tsx");
const source = readFileSync(shieldPath, "utf8");
const directShieldSymbols = ["USDC", "JTO", "BONK", "JUP", "PYUSD", "WIF", "KMNO"];

assert.ok(source.includes("useVantaSafeSendTransaction"), "Shield must import the Vanta safe-send hook.");
assert.ok(!source.includes("useSendTransaction"), "Shield must not use raw useSendTransaction for generic transactions.");

for (const phrase of [
  "const publicRouteTransaction = useVantaSafeSendTransaction();",
  "const splShieldTransferTransaction = useVantaSafeSendTransaction();",
  "const nativeSolShieldTransaction = useVantaSafeSendTransaction();",
  "summaryInstructions",
  "transactionFingerprint",
  "shield-spl-token-transfer",
  "shield-native-sol",
  "shield-state-memo",
  "shield-public-route",
]) {
  assert.ok(source.includes(phrase), `Shield safe-send adoption missing phrase: ${phrase}`);
}

assert.ok(
  !source.includes("const stateTransaction = useVantaSafeSendTransaction();"),
  "Direct token Shield must not ask Phantom for a second memo-only shield-state transaction.",
);

for (const symbol of directShieldSymbols) {
  assert.ok(
    source.includes("asset: selectedShieldAsset.assetKey"),
    `Direct ${symbol} Shield must use the selected shield asset key in the same transaction memo.`,
  );
  assert.ok(
    source.includes("VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE"),
    `Direct ${symbol} Shield must use the same-transaction token deposit sentinel.`,
  );
}

assert.ok(
  !source.includes('asset: "BONK"') && !source.includes('pendingShieldAsset === "BONK"'),
  "Direct Shield safe-send must stay generic across all shield-family tokens, not only BONK.",
);

assert.ok(
  !source.includes("supportedToken.send({"),
  "Shield SPL token transfer must not bypass the Vanta safe-send boundary.",
);

console.log("Vanta Shield safe-send adoption check: PASS");
