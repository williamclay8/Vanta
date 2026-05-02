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
    [
      "private-core-active-legacy-safe-send-dormant",
      "requires-wallet-backed-simulation-gate",
      "safe-send-adopted",
      "wallet-adapter-summary-bound",
    ].includes(surface.status),
    `${surface.page} has unknown wallet-send adoption status: ${surface.status}`,
  );
  assert.ok(surface.file.startsWith("src/"), `${surface.page} inventory must use repo-relative source files.`);
  if (surface.status === "requires-wallet-backed-simulation-gate") {
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
assert.equal(shieldSurface.status, "safe-send-adopted", "Shield must reflect safe-send adoption.");
assert.ok(
  shieldSurface.adoptedCallSites?.length >= 4,
  "Shield must list SPL, same-transaction state memo, native SOL, and public-route transactions as safe-send adopted.",
);
assert.equal(
  shieldSurface.currentCallSites.length,
  0,
  "Shield must not keep raw transaction sends pending.",
);

const sendSurface = surfacesByPage.get("Send");
assert.equal(
  sendSurface.status,
  "private-core-active-legacy-safe-send-dormant",
  "Send must label the active Private Core proof lane separately from dormant legacy safe-send transactions.",
);
assert.ok(
  sendSurface.adoptedCallSites?.length >= 2,
  "Send must preserve legacy spent-marker and send-note safe-send call sites.",
);
assert.equal(sendSurface.currentCallSites.length, 0, "Send must not keep raw generic transaction sends pending.");

const swapSurface = surfacesByPage.get("Swap");
assert.equal(swapSurface.status, "safe-send-adopted", "Swap must reflect complete wallet-signing boundary adoption.");
assert.ok(
  swapSurface.adoptedCallSites?.length >= 3,
  "Swap must list message-intent, spent-marker, and swap-transition paths as adopted.",
);
assert.equal(swapSurface.currentCallSites.length, 0, "Swap must not keep raw wallet signing pending.");

const unshieldSurface = surfacesByPage.get("Unshield");
assert.equal(unshieldSurface.status, "safe-send-adopted", "Unshield must reflect complete wallet-signing boundary adoption.");
assert.ok(
  unshieldSurface.adoptedCallSites?.length >= 6,
  "Unshield must list transition-authorized handoff, spent-marker, transition, and split paths as adopted.",
);
assert.equal(unshieldSurface.currentCallSites.length, 0, "Unshield must not keep raw wallet signing pending.");

const umbraSurface = surfacesByPage.get("Umbra adapter");
assert.equal(
  umbraSurface.status,
  "wallet-adapter-summary-bound",
  "Umbra adapter must be fail-closed by a summary-bound adapter gate.",
);
assert.equal(umbraSurface.currentCallSites.length, 0, "Umbra adapter must not expose raw wallet signing call sites.");
assert.ok(
  umbraSurface.adoptedCallSites?.length >= 3,
  "Umbra adapter must list message, transaction, and validation gate call sites.",
);

const transactionCallSites = inventory.actionSurfaces.flatMap((surface) =>
  surface.currentCallSites.filter((callSite) => callSite.signatureKind === "transaction-signature"),
);
const adoptedTransactionCallSites = inventory.actionSurfaces.flatMap((surface) =>
  (surface.adoptedCallSites ?? []).filter((callSite) => callSite.signatureKind === "transaction-signature"),
);
const adoptedMessageIntentCallSites = inventory.actionSurfaces.flatMap((surface) =>
  (surface.adoptedCallSites ?? []).filter((callSite) => callSite.signatureKind === "message-intent-signature"),
);

assert.equal(transactionCallSites.length, 0, "Protocol tabs must not keep raw transaction send call sites.");
assert.ok(adoptedTransactionCallSites.length >= 12, "Expected adopted transaction safety boundaries.");
assert.ok(adoptedMessageIntentCallSites.length >= 1, "Expected adopted signed intent safety boundaries.");
assert.ok(
  unshieldSurface.adoptedCallSites?.some((callSite) =>
    callSite.snippet.includes("createTransitionAuthorizedUnshieldIntent"),
  ),
  "Unshield must use the transition-authorized token operator handoff.",
);
assert.ok(
  unshieldSurface.adoptedCallSites?.some((callSite) =>
    callSite.snippet.includes("createTransitionAuthorizedSolUnshieldIntent"),
  ),
  "Unshield must use the transition-authorized SOL operator handoff.",
);
assert.ok(
  inventory.messageIntentPolicy.requiredSequence.includes("typed-intent-summary") &&
    inventory.messageIntentPolicy.requiredSequence.includes("wallet-message-approval"),
  "Message-intent policy must require a typed summary and wallet approval.",
);

console.log("Vanta wallet live send inventory check: PASS");
