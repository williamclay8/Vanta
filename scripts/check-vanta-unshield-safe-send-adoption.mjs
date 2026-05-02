import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const unshieldPath = resolve(import.meta.dirname, "../src/pages/UnshieldPage.tsx");
const source = readFileSync(unshieldPath, "utf8");

assert.ok(source.includes("useVantaSafeSendTransaction"), "Unshield must import the Vanta safe-send hook.");
assert.ok(!source.includes("useSendTransaction"), "Unshield must not use raw useSendTransaction for generic transactions.");
assert.ok(
  !source.includes("signUnshieldIntent(createUnshieldIntentPayload"),
  "Unshield must not pass signMessage directly to the SPL unshield intent signer.",
);
assert.ok(
  !source.includes("signSolUnshieldIntent(createSolUnshieldIntentPayload"),
  "Unshield must not pass signMessage directly to the SOL unshield intent signer.",
);

for (const phrase of [
  "const splitTransitionTransaction = useVantaSafeSendTransaction();",
  "const splitSpentMarkerTransaction = useVantaSafeSendTransaction();",
  "summaryInstructions",
  "transactionFingerprint",
  "unshield-split-transition",
  "unshield-split-spent-marker",
  "createOperatorDirectUnshieldIntent",
  "createOperatorDirectSolUnshieldIntent",
  "Release through operator",
]) {
  assert.ok(source.includes(phrase), `Unshield safe-send adoption missing phrase: ${phrase}`);
}

for (const forbiddenPhrase of [
  "signUnshieldIntent(unshieldPayload",
  "signSolUnshieldIntent(solUnshieldPayload",
  "signWalletMessageIntentWithSafety",
]) {
  assert.ok(
    !source.includes(forbiddenPhrase),
    `Unshield must not preserve the extra Phantom message-signing request: ${forbiddenPhrase}`,
  );
}

console.log("Vanta Unshield safe-send adoption check: PASS");
