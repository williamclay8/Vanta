import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const shieldPath = resolve(import.meta.dirname, "../src/pages/ShieldPage.tsx");
const source = readFileSync(shieldPath, "utf8");

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

assert.ok(
  !source.includes("supportedToken.send({"),
  "Shield SPL token transfer must not bypass the Vanta safe-send boundary.",
);

console.log("Vanta Shield safe-send adoption check: PASS");
