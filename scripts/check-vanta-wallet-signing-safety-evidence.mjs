import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/wallet-signing-safety.evidence.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/wallet-signing-safety.evidence.json.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(evidence.version, "vanta-production-wallet-signing-safety-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.lastStatusRef, "npm run mainnet:wallet-signing-status-check");
assert.equal(evidence.browserVerificationRef, "npm run wallet:browser-signing-safety-check");
assert.equal(evidence.productionBrowserVerificationRef, "npm run mainnet:wallet-production-browser-check");
assert.equal(evidence.productionBrowserVerificationUrl, "https://vantaprivacy.xyz");
assert.equal(evidence.localBrowserVerificationOnly, false);
assert.deepEqual(evidence.productionBrowserVerificationRequiredPages, ["Shield", "Send", "Swap", "Unshield"]);
assert.deepEqual(evidence.productionBrowserVerifiedPages, ["Shield", "Send", "Swap", "Unshield"]);
assert.equal(evidence.productionBrowserVerificationCoversRequiredPages, true);
assert.equal(evidence.productionBrowserVerificationAvailable, true);
assert.equal(evidence.productionBrowserVerificationStatus, "recorded-live-submission-mode");
assert.deepEqual(evidence.productionWalletSigningBlockedBy, []);
assert.equal(evidence.productionDeploymentModeBannerVisible, false);
assert.equal(evidence.productionSettlementOfflineBannerVisible, false);
assert.equal(evidence.signingSafetyPolicyRef, "npm run wallet:signing-safety-check");
assert.equal(evidence.liveSendInventoryRef, "npm run wallet:live-send-inventory-check");
assert.equal(evidence.liveMainnetSubmissionEnabled, true);
assert.equal(evidence.mainnetSubmissionExplicitlyBlocked, false);
assert.equal(evidence.browserVerificationMode, "local-dev-server-gsd-browser");
assert.equal(evidence.browserVerificationCluster, "devnet-or-localnet");
assert.deepEqual(evidence.browserVerifiedProtocolPages, ["Shield", "Send", "Swap", "Unshield"]);
assert.equal(evidence.requiresExplicitHumanApproval, true);
assert.equal(evidence.requiresSimulationBeforeSignature, true);
assert.equal(evidence.requiresTransactionSummaryBeforeSignature, true);
assert.deepEqual(evidence.protocolPagesWithSafeSendAdoption, ["Shield", "Send", "Swap", "Unshield"]);
assert.deepEqual(evidence.messageIntentPages, ["Swap", "Unshield"]);
assert.equal(evidence.umbraAdapterGateStatus, "wallet-adapter-summary-bound");
assert.equal(evidence.umbraAdapterSummaryBindingRequired, true);
assert.ok(
  evidence.safety.includes("No wallet keys"),
  "Wallet-signing safety evidence must state the no-secret safety policy.",
);
assert.ok(
  evidence.deploymentTruth.includes("must not be presented as production-ready"),
  "Wallet-signing evidence must preserve the non-production truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("repo now targets live-submission mode by default"),
  "Wallet-signing evidence must preserve the repo-side live-submission posture truth.",
);
assert.ok(
  evidence.deploymentTruth.includes("deployed production browser verification is now green"),
  "Wallet-signing evidence must preserve the deployed production browser-proof scope.",
);
assert.ok(
  evidence.nextOperatorAction.includes("deployed browser verification"),
  "Wallet-signing evidence must preserve the fresh deployed-browser verification operator action truth.",
);

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  "postgres://",
  "postgresql://",
  "Bearer ",
  "DATABASE_URL=",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "sk_live_",
  "whsec_",
]) {
  assert.ok(!serialized.includes(forbidden), `Wallet-signing evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:wallet-signing-status"],
  "node scripts/print-vanta-production-wallet-signing-status.mjs",
  "package.json must expose mainnet:wallet-signing-status.",
);
assert.equal(
  packageJson.scripts["mainnet:wallet-signing-status-check"],
  "node scripts/print-vanta-production-wallet-signing-status.mjs --check",
  "package.json must expose mainnet:wallet-signing-status-check.",
);
assert.equal(
  packageJson.scripts["mainnet:wallet-production-browser-check"],
  "node scripts/check-vanta-production-wallet-browser-signing.mjs",
  "package.json must expose mainnet:wallet-production-browser-check.",
);
assert.equal(
  packageJson.scripts["mainnet:wallet-signing-evidence-check"],
  "node scripts/check-vanta-wallet-signing-safety-evidence.mjs",
  "package.json must expose mainnet:wallet-signing-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:wallet-signing-evidence-check"),
  "mainnet:preflight must include wallet-signing evidence check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:wallet-production-browser-check"),
  "mainnet:preflight must include deployed wallet browser verification.",
);

console.log("Vanta wallet-signing safety evidence check: PASS");
