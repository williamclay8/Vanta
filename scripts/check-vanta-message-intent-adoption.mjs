import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const swapSource = readFileSync(resolve(repoRoot, "src/pages/SwapPage.tsx"), "utf8");
const unshieldSource = readFileSync(resolve(repoRoot, "src/pages/UnshieldPage.tsx"), "utf8");
const unshieldExecutionSource = readFileSync(
  resolve(repoRoot, "src/components/unshield/useUnshieldExecution.ts"),
  "utf8",
);
const unshieldWorkspaceSource = readFileSync(
  resolve(repoRoot, "src/components/UnshieldWorkspaceCard.tsx"),
  "utf8",
);
const unshieldSurfaceSource = `${unshieldSource}\n${unshieldExecutionSource}\n${unshieldWorkspaceSource}`;

assert.ok(
  swapSource.includes("signWalletMessageIntentWithSafety"),
  "Swap must wrap signed operator intents with wallet message-intent safety.",
);
assert.ok(
  unshieldSurfaceSource.includes("signUnshieldIntent") &&
    unshieldSurfaceSource.includes("signSolUnshieldIntent") &&
    unshieldSurfaceSource.includes("signWalletMessageIntentWithSafety"),
  "Unshield must keep token and SOL typed message-intent release boundaries.",
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
  "signUnshieldIntent",
  "signSolUnshieldIntent",
  'intentKind: "unshield-intent"',
  'intentKind: "sol-unshield-intent"',
  'setStatus("operator_ready")',
  "Ready for operator release",
  "Release through operator",
]) {
  assert.ok(unshieldSurfaceSource.includes(phrase), `Unshield message-intent adoption missing phrase: ${phrase}`);
}

for (const forbiddenPhrase of [
  "createOperatorDirectUnshieldIntent",
  'signature: "operator-direct"',
]) {
  assert.ok(
    !unshieldSurfaceSource.includes(forbiddenPhrase),
    `Unshield must not keep unauthenticated operator-direct token release behavior: ${forbiddenPhrase}`,
  );
}

console.log("Vanta message-intent adoption check: PASS");
