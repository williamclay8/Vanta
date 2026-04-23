import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";
import { createWalletLiveSendInventory } from "../src/readiness/walletLiveSendInventory.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const inventory = createWalletLiveSendInventory();

assert.equal(inventory.version, "vanta-wallet-live-send-inventory-0.1");
assert.equal(inventory.mainnetReady, false);
assert.equal(inventory.productionReady, false);
assert.equal(inventory.replacementRequired, true);
assert.deepEqual(inventory.requiredReplacementSequence, [
  "prepare-transaction",
  "simulate-transaction",
  "show-transaction-safety-summary",
  "validate-wallet-backed-simulation-gate",
  "request-wallet-approval",
  "submit-prepared-transaction",
]);
assert.ok(inventory.actionSurfaces.length >= 4, "Expected protocol tab wallet action inventory.");

const surfacesByPage = new Map(inventory.actionSurfaces.map((surface) => [surface.page, surface]));
for (const page of ["Shield", "Send", "Swap", "Unshield"]) {
  assert.ok(surfacesByPage.has(page), `Missing ${page} live-send inventory.`);
}

for (const surface of inventory.actionSurfaces) {
  assert.ok(
    ["requires-wallet-backed-simulation-gate", "partial-safe-send-adopted", "safe-send-adopted"].includes(surface.status),
    `${surface.page} has unknown wallet-send adoption status: ${surface.status}`,
  );
  assert.ok(surface.file.startsWith("src/"), `${surface.page} inventory must use repo-relative source files.`);
  if (surface.status !== "safe-send-adopted") {
    assert.ok(surface.currentCallSites.length > 0, `${surface.page} must list current call sites.`);
  }
  assert.ok(surface.replacement.includes("simulate"), `${surface.page} replacement guidance must include simulation.`);

  const source = readFileSync(resolve(repoRoot, surface.file), "utf8");
  for (const callSite of [...surface.currentCallSites, ...(surface.adoptedCallSites ?? [])]) {
    assert.ok(source.includes(callSite.snippet), `${surface.page} missing frozen call site: ${callSite.snippet}`);
    assert.ok(
      ["transaction-signature", "message-intent-signature", "wallet-adapter-boundary"].includes(callSite.signatureKind),
      `${surface.page} call site has unknown signature kind: ${callSite.signatureKind}`,
    );
  }
}

const shieldSurface = surfacesByPage.get("Shield");
assert.equal(shieldSurface.status, "partial-safe-send-adopted", "Shield must reflect partial safe-send adoption.");
assert.ok(
  shieldSurface.adoptedCallSites?.length >= 3,
  "Shield must list native SOL, state, and public-route transactions as safe-send adopted.",
);
assert.equal(
  shieldSurface.currentCallSites.length,
  1,
  "Shield must keep only the SPL token transfer call site in the pending live-send inventory.",
);

const sendSurface = surfacesByPage.get("Send");
assert.equal(sendSurface.status, "safe-send-adopted", "Send must reflect safe-send adoption.");
assert.ok(
  sendSurface.adoptedCallSites?.length >= 2,
  "Send must list spent-marker and send-note transactions as safe-send adopted.",
);
assert.equal(sendSurface.currentCallSites.length, 0, "Send must not keep raw generic transaction sends pending.");

const swapSurface = surfacesByPage.get("Swap");
assert.equal(swapSurface.status, "partial-safe-send-adopted", "Swap must reflect partial safe-send adoption.");
assert.ok(
  swapSurface.adoptedCallSites?.length >= 2,
  "Swap must list spent-marker and swap-transition transactions as safe-send adopted.",
);
assert.deepEqual(
  swapSurface.currentCallSites.map((callSite) => callSite.signatureKind),
  ["message-intent-signature"],
  "Swap must keep only the signed message intent pending in the live-send inventory.",
);

const unshieldSurface = surfacesByPage.get("Unshield");
assert.equal(unshieldSurface.status, "partial-safe-send-adopted", "Unshield must reflect partial safe-send adoption.");
assert.ok(
  unshieldSurface.adoptedCallSites?.length >= 4,
  "Unshield must list spent-marker, transition, and split transactions as safe-send adopted.",
);
assert.deepEqual(
  unshieldSurface.currentCallSites.map((callSite) => callSite.signatureKind),
  ["message-intent-signature", "message-intent-signature"],
  "Unshield must keep only signed message intents pending in the live-send inventory.",
);

const transactionCallSites = inventory.actionSurfaces.flatMap((surface) =>
  surface.currentCallSites.filter((callSite) => callSite.signatureKind === "transaction-signature"),
);
const messageIntentCallSites = inventory.actionSurfaces.flatMap((surface) =>
  surface.currentCallSites.filter((callSite) => callSite.signatureKind === "message-intent-signature"),
);

assert.ok(transactionCallSites.length >= 1, "Expected frozen transaction send call sites.");
assert.ok(messageIntentCallSites.length >= 3, "Expected frozen signed intent call sites.");
assert.ok(
  inventory.messageIntentPolicy.requiredSequence.includes("typed-intent-summary") &&
    inventory.messageIntentPolicy.requiredSequence.includes("wallet-message-approval"),
  "Message-intent policy must require a typed summary and wallet approval.",
);

console.log("Vanta wallet live send inventory check: PASS");
