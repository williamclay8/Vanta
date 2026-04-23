import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const sendPath = resolve(import.meta.dirname, "../src/pages/SendPage.tsx");
const source = readFileSync(sendPath, "utf8");

assert.ok(source.includes("useVantaSafeSendTransaction"), "Send must import the Vanta safe-send hook.");
assert.ok(!source.includes("useSendTransaction"), "Send must not use raw useSendTransaction for generic transactions.");

for (const phrase of [
  "const sendNoteTransaction = useVantaSafeSendTransaction();",
  "const spentMarkerTransaction = useVantaSafeSendTransaction();",
  "summaryInstructions",
  "transactionFingerprint",
  "send-note-transition",
  "send-spent-marker",
]) {
  assert.ok(source.includes(phrase), `Send safe-send adoption missing phrase: ${phrase}`);
}

console.log("Vanta Send safe-send adoption check: PASS");
