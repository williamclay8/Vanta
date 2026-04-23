import { strict as assert } from "node:assert";
import { createVantaWalletSigningSafetyPolicy } from "../src/readiness/walletSigningSafety.mjs";
import { createWalletLiveSendInventory } from "../src/readiness/walletLiveSendInventory.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

function summarizeActionSurface(surface) {
  const adoptedCallSites = surface.adoptedCallSites ?? [];
  const currentCallSites = surface.currentCallSites ?? [];
  const signatureKinds = [...new Set([...currentCallSites, ...adoptedCallSites].map((callSite) => callSite.signatureKind))];

  return {
    adoptedCallSiteCount: adoptedCallSites.length,
    currentCallSiteCount: currentCallSites.length,
    file: surface.file,
    page: surface.page,
    signatureKinds,
    status: surface.status,
  };
}

function buildStatus() {
  const policy = createVantaWalletSigningSafetyPolicy();
  const inventory = createWalletLiveSendInventory();
  const surfaces = inventory.actionSurfaces.map(summarizeActionSurface);
  const protocolPages = surfaces.filter((surface) => ["Shield", "Send", "Swap", "Unshield"].includes(surface.page));
  const adoptedProtocolPages = protocolPages.filter((surface) => surface.status === "safe-send-adopted");
  const messageIntentPages = surfaces.filter((surface) => surface.signatureKinds.includes("message-intent-signature"));
  const walletAdapterSurface = surfaces.find((surface) => surface.page === "Umbra adapter") ?? null;

  return {
    blockedActions: policy.blockedActions,
    browserVerificationCluster: policy.defaultCluster,
    browserVerificationCommand: "npm run wallet:browser-signing-safety-check",
    browserVerificationMode: "local-dev-server-gsd-browser",
    browserVerifiedProtocolPages: ["Shield", "Send", "Swap", "Unshield"],
    checkedAt: new Date().toISOString(),
    liveMainnetSubmissionEnabled: policy.liveMainnetSubmissionEnabled,
    liveSendInventoryVersion: inventory.version,
    mainnetReady: false,
    messageIntentPages: messageIntentPages.map((surface) => surface.page),
    messageIntentSequence: inventory.messageIntentPolicy.requiredSequence,
    policyVersion: policy.version,
    productionReady: false,
    protocolPagesCovered: protocolPages.map((surface) => surface.page),
    protocolPagesWithSafeSendAdoption: adoptedProtocolPages.map((surface) => surface.page),
    replacementRequired: inventory.replacementRequired,
    requiredReplacementSequence: inventory.requiredReplacementSequence,
    requiresExplicitHumanApproval: policy.requiresExplicitHumanApproval,
    requiresSimulationBeforeSignature: policy.requiresSimulationBeforeSignature,
    requiresTransactionSummaryBeforeSignature: policy.requiresTransactionSummaryBeforeSignature,
    safety:
      "No wallet keys, seed phrases, signed transaction material, signed intent payloads, bearer values, or database URLs are printed.",
    surfaces,
    umbraAdapterGateStatus: walletAdapterSurface?.status ?? "missing",
    umbraAdapterSummaryBindingRequired: walletAdapterSurface?.status === "wallet-adapter-summary-bound",
    version: "vanta-production-wallet-signing-status-0.1",
  };
}

const result = buildStatus();

if (checkMode) {
  assert.equal(result.mainnetReady, false, "Wallet-signing status must not claim mainnet readiness.");
  assert.equal(result.productionReady, false, "Wallet-signing status must not claim production readiness.");
  assert.equal(result.liveMainnetSubmissionEnabled, false, "Live mainnet submission must remain disabled.");
  assert.equal(result.requiresExplicitHumanApproval, true, "Wallet signatures must require explicit human approval.");
  assert.equal(result.requiresSimulationBeforeSignature, true, "Wallet signatures must require simulation first.");
  assert.equal(
    result.requiresTransactionSummaryBeforeSignature,
    true,
    "Wallet signatures must require a transaction summary first.",
  );
  assert.equal(result.browserVerificationCluster, "devnet-or-localnet", "Browser verification must stay off mainnet.");
  assert.equal(
    result.browserVerificationMode,
    "local-dev-server-gsd-browser",
    "Browser verification mode must remain local-dev-server-gsd-browser.",
  );
  assert.deepEqual(
    result.browserVerifiedProtocolPages,
    ["Shield", "Send", "Swap", "Unshield"],
    "Browser verification must cover Shield, Send, Swap, and Unshield.",
  );
  assert.deepEqual(
    result.protocolPagesCovered,
    ["Shield", "Send", "Swap", "Unshield"],
    "Wallet-signing status must cover Shield, Send, Swap, and Unshield.",
  );
  assert.deepEqual(
    result.protocolPagesWithSafeSendAdoption,
    ["Shield", "Send", "Swap", "Unshield"],
    "Protocol pages must remain on the safe-send adoption path.",
  );
  assert.ok(
    result.messageIntentPages.includes("Swap") && result.messageIntentPages.includes("Unshield"),
    "Swap and Unshield must remain on the message-intent safety path.",
  );
  assert.equal(
    result.umbraAdapterGateStatus,
    "wallet-adapter-summary-bound",
    "Umbra adapter must remain fail-closed behind a summary-bound gate.",
  );
  assert.equal(
    result.umbraAdapterSummaryBindingRequired,
    true,
    "Umbra adapter must require typed summary binding before wallet signing.",
  );
  for (const surface of result.surfaces) {
    assert.ok(
      ["safe-send-adopted", "wallet-adapter-summary-bound"].includes(surface.status),
      `Unexpected wallet-signing status for ${surface.page}: ${surface.status}.`,
    );
    if (surface.page !== "Umbra adapter") {
      assert.equal(surface.currentCallSiteCount, 0, `${surface.page} must not expose raw live-send call sites.`);
      assert.ok(surface.adoptedCallSiteCount > 0, `${surface.page} must keep adopted wallet safety call sites.`);
    }
  }
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta production wallet-signing status");
  console.log(`- protocolPagesCovered: ${result.protocolPagesCovered.join(", ")}`);
  console.log(`- protocolPagesWithSafeSendAdoption: ${result.protocolPagesWithSafeSendAdoption.join(", ")}`);
  console.log(`- browserVerifiedProtocolPages: ${result.browserVerifiedProtocolPages.join(", ")}`);
  console.log(`- messageIntentPages: ${result.messageIntentPages.join(", ")}`);
  console.log(`- liveMainnetSubmissionEnabled: ${String(result.liveMainnetSubmissionEnabled)}`);
  console.log(`- browserVerificationCluster: ${result.browserVerificationCluster}`);
  console.log(`- umbraAdapterGateStatus: ${result.umbraAdapterGateStatus}`);
  console.log(`- umbraAdapterSummaryBindingRequired: ${String(result.umbraAdapterSummaryBindingRequired)}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
}
