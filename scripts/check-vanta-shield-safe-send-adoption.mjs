import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const shieldPath = resolve(import.meta.dirname, "../src/pages/ShieldPage.tsx");
const source = readFileSync(shieldPath, "utf8");

assert.ok(source.includes("useVantaSafeSendTransaction"), "Shield must import the Vanta safe-send hook.");
assert.ok(!source.includes("useSendTransaction"), "Shield must not use raw useSendTransaction for generic transactions.");

for (const phrase of [
  "const publicRouteTransaction = useVantaSafeSendTransaction();",
  "const nativeSolShieldTransaction = useVantaSafeSendTransaction();",
  "const stateTransaction = useVantaSafeSendTransaction();",
  "summaryInstructions",
  "transactionFingerprint",
  "shield-native-sol",
  "shield-state",
  "shield-public-route",
]) {
  assert.ok(source.includes(phrase), `Shield safe-send adoption missing phrase: ${phrase}`);
}

console.log("Vanta Shield safe-send adoption check: PASS");
