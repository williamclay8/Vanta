import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createVantaWalletSigningSafetyPolicy } from "../src/readiness/walletSigningSafety.mjs";
import { createWalletLiveSendInventory } from "../src/readiness/walletLiveSendInventory.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");
const walletSigningEvidencePath = new URL("../ops/mainnet/wallet-signing-safety.evidence.json", import.meta.url);

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
  const evidence = JSON.parse(readFileSync(walletSigningEvidencePath, "utf8"));
  const surfaces = inventory.actionSurfaces.map(summarizeActionSurface);
  const protocolPages = surfaces.filter((surface) => ["Shield", "Send", "Swap", "Unshield"].includes(surface.page));
  const adoptedProtocolPages = protocolPages.filter((surface) => surface.status === "safe-send-adopted");
  const messageIntentPages = surfaces.filter((surface) => surface.signatureKinds.includes("message-intent-signature"));
  const walletAdapterSurface = surfaces.find((surface) => surface.page === "Umbra adapter") ?? null;

  return {
    blockedActions: policy.blockedActions,
    browserVerificationCluster: evidence.browserVerificationCluster,
    browserVerificationCommand: "npm run wallet:browser-signing-safety-check",
    browserVerificationMode: evidence.browserVerificationMode,
    browserVerifiedProtocolPages: evidence.browserVerifiedProtocolPages,
    checkedAt: new Date().toISOString(),
    localBrowserVerificationOnly: evidence.localBrowserVerificationOnly,
    liveMainnetSubmissionEnabled: evidence.liveMainnetSubmissionEnabled,
    liveSendInventoryVersion: inventory.version,
    mainnetReady: false,
    mainnetSubmissionExplicitlyBlocked: evidence.mainnetSubmissionExplicitlyBlocked,
    messageIntentPages: messageIntentPages.map((surface) => surface.page),
    messageIntentSequence: inventory.messageIntentPolicy.requiredSequence,
    policyVersion: policy.version,
    productionReady: false,
    productionBrowserVerificationAvailable: evidence.productionBrowserVerificationAvailable,
    productionBrowserVerificationCoversRequiredPages: evidence.productionBrowserVerificationCoversRequiredPages,
    productionBrowserVerificationRef: evidence.productionBrowserVerificationRef,
    productionBrowserVerificationRequiredPages: evidence.productionBrowserVerificationRequiredPages,
    productionBrowserVerificationStatus: evidence.productionBrowserVerificationStatus,
    productionBrowserVerificationUrl: evidence.productionBrowserVerificationUrl,
    productionBrowserVerifiedPages: evidence.productionBrowserVerifiedPages,
    productionWalletSigningBlockedBy: evidence.productionWalletSigningBlockedBy,
    productionDeploymentModeBannerVisible: evidence.productionDeploymentModeBannerVisible,
    productionSettlementOfflineBannerVisible: evidence.productionSettlementOfflineBannerVisible,
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
    checkedEvidenceRef: "ops/mainnet/wallet-signing-safety.evidence.json",
    umbraAdapterGateStatus: walletAdapterSurface?.status ?? "missing",
    umbraAdapterSummaryBindingRequired: walletAdapterSurface?.status === "wallet-adapter-summary-bound",
    version: "vanta-production-wallet-signing-status-0.1",
  };
}

const result = buildStatus();

if (checkMode) {
  const evidence = JSON.parse(readFileSync(walletSigningEvidencePath, "utf8"));
  assert.equal(result.mainnetReady, false, "Wallet-signing status must not claim mainnet readiness.");
  assert.equal(result.productionReady, false, "Wallet-signing status must not claim production readiness.");
  assert.equal(
    result.liveMainnetSubmissionEnabled,
    evidence.liveMainnetSubmissionEnabled,
    "Wallet status must follow the checked live-mainnet submission truth.",
  );
  assert.equal(result.requiresExplicitHumanApproval, true, "Wallet signatures must require explicit human approval.");
  assert.equal(result.requiresSimulationBeforeSignature, true, "Wallet signatures must require simulation first.");
  assert.equal(
    result.requiresTransactionSummaryBeforeSignature,
    true,
    "Wallet signatures must require a transaction summary first.",
  );
  assert.equal(
    result.browserVerificationCluster,
    evidence.browserVerificationCluster,
    "Wallet status must follow the checked browser verification cluster truth.",
  );
  assert.equal(
    result.browserVerificationMode,
    evidence.browserVerificationMode,
    "Wallet status must follow the checked browser verification mode.",
  );
  assert.equal(
    result.localBrowserVerificationOnly,
    evidence.localBrowserVerificationOnly,
    "Wallet status must follow the checked local/deployed browser verification truth.",
  );
  assert.deepEqual(
    result.productionBrowserVerificationRequiredPages,
    evidence.productionBrowserVerificationRequiredPages,
    "Wallet status must follow the checked production required protocol page set.",
  );
  assert.deepEqual(
    result.productionBrowserVerifiedPages,
    evidence.productionBrowserVerifiedPages,
    "Wallet status must follow the checked production browser verified pages.",
  );
  assert.equal(
    result.productionBrowserVerificationCoversRequiredPages,
    evidence.productionBrowserVerificationCoversRequiredPages,
    "Wallet status must follow the checked production required-page coverage truth.",
  );
  assert.equal(
    result.productionBrowserVerificationAvailable,
    evidence.productionBrowserVerificationAvailable,
    "Wallet status must follow the checked production browser verification availability.",
  );
  assert.equal(
    result.productionBrowserVerificationStatus,
    evidence.productionBrowserVerificationStatus,
    "Wallet status must follow the checked production browser verification status.",
  );
  assert.deepEqual(
    result.productionWalletSigningBlockedBy,
    evidence.productionWalletSigningBlockedBy,
    "Wallet status must follow the checked remaining public-app wallet-signing blockers.",
  );
  assert.equal(
    result.productionBrowserVerificationRef,
    evidence.productionBrowserVerificationRef,
    "Wallet status must follow the checked deployed browser verification command.",
  );
  assert.equal(
    result.productionBrowserVerificationUrl,
    evidence.productionBrowserVerificationUrl,
    "Wallet status must follow the checked live public app URL.",
  );
  assert.equal(
    result.productionDeploymentModeBannerVisible,
    evidence.productionDeploymentModeBannerVisible,
    "Wallet status must follow the checked live beta-mode banner truth.",
  );
  assert.equal(
    result.productionSettlementOfflineBannerVisible,
    evidence.productionSettlementOfflineBannerVisible,
    "Wallet status must follow the checked live private-settlement offline banner truth.",
  );
  assert.equal(
    result.mainnetSubmissionExplicitlyBlocked,
    evidence.mainnetSubmissionExplicitlyBlocked,
    "Wallet status must follow the checked live mainnet submission block truth.",
  );
  assert.deepEqual(
    result.browserVerifiedProtocolPages,
    evidence.browserVerifiedProtocolPages,
    "Wallet status must follow the checked browser verified protocol pages.",
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
  console.log(`- localBrowserVerificationOnly: ${String(result.localBrowserVerificationOnly)}`);
  console.log(
    `- productionBrowserVerificationRequiredPages: ${result.productionBrowserVerificationRequiredPages.join(", ")}`,
  );
  console.log(`- productionBrowserVerifiedPages: ${result.productionBrowserVerifiedPages.join(", ") || "none"}`);
  console.log(
    `- productionBrowserVerificationCoversRequiredPages: ${String(result.productionBrowserVerificationCoversRequiredPages)}`,
  );
  console.log(
    `- productionBrowserVerificationAvailable: ${String(result.productionBrowserVerificationAvailable)}`,
  );
  console.log(`- productionBrowserVerificationStatus: ${result.productionBrowserVerificationStatus}`);
  console.log(`- productionBrowserVerificationUrl: ${result.productionBrowserVerificationUrl}`);
  console.log(`- productionWalletSigningBlockedBy: ${result.productionWalletSigningBlockedBy.join(", ")}`);
  console.log(`- productionDeploymentModeBannerVisible: ${String(result.productionDeploymentModeBannerVisible)}`);
  console.log(
    `- productionSettlementOfflineBannerVisible: ${String(result.productionSettlementOfflineBannerVisible)}`,
  );
  console.log(`- messageIntentPages: ${result.messageIntentPages.join(", ")}`);
  console.log(`- liveMainnetSubmissionEnabled: ${String(result.liveMainnetSubmissionEnabled)}`);
  console.log(`- mainnetSubmissionExplicitlyBlocked: ${String(result.mainnetSubmissionExplicitlyBlocked)}`);
  console.log(`- browserVerificationCluster: ${result.browserVerificationCluster}`);
  console.log(`- umbraAdapterGateStatus: ${result.umbraAdapterGateStatus}`);
  console.log(`- umbraAdapterSummaryBindingRequired: ${String(result.umbraAdapterSummaryBindingRequired)}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
}
