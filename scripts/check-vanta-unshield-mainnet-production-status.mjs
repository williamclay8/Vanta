import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaUnshieldMainnetProductionStatus } from "../src/readiness/unshieldMainnetProductionStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const unshieldPageSource = readFileSync(resolve(repoRoot, "src/pages/UnshieldPage.tsx"), "utf8");
const solHealthSource = readFileSync(resolve(repoRoot, "src/solana/solUnshieldOperatorHealth.ts"), "utf8");
const publicExitCheckSource = readFileSync(
  resolve(repoRoot, "scripts/check-vanta-unshield-public-exit-surface.mjs"),
  "utf8",
);

const status = createVantaUnshieldMainnetProductionStatus();

assert.equal(status.version, "vanta-unshield-mainnet-production-status-0.1");
assert.equal(status.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(status.mainnetReady, false);
assert.equal(status.productionReady, false);
assert.equal(status.privacyClaimAllowed, false);
assert.equal(status.status, "blocked");
assert.equal(status.localLaneCovered, true);
assert.equal(status.actualPrivateUnshieldPlan.localPlanCovered, true);
assert.equal(status.actualPrivateUnshieldPlan.action, "unshield");
assert.equal(status.actualPrivateUnshieldPlan.operatorEndpoint, "/private-pool-v2/protocol-settlements");
assert.equal(
  status.actualPrivateUnshieldPlan.requiredOperatorProofMode,
  "committed_unshield_or_claim_circuit_request",
);
assert.equal(status.runtimeProductionControls.covered, false);
assert.equal(status.runtimeProductionControls.privatePoolV2RuntimeMode, "remote-services");
assert.equal(
  status.runtimeProductionControls.privatePoolV2StorageKind,
  "postgres-jsonb-snapshot-store",
);
assert.equal(status.runtimeProductionControls.operatorEventSinkProductionReady, false);
assert.equal(status.onchainUnshieldCustody.version, "vanta-onchain-unshield-custody-status-0.1");
assert.equal(status.onchainUnshieldCustody.status, "blocked");
assert.equal(status.onchainUnshieldCustody.currentReleaseModel, "operator-keypair-public-exit");
assert.equal(status.onchainUnshieldCustody.productionCustodyReady, false);
assert.equal(status.onchainUnshieldCustody.programOwnedVaultReady, false);
assert.equal(status.onchainUnshieldCustody.onchainUnshieldInstructionReady, false);
assert.equal(
  status.onchainUnshieldCustody.onchainUnshieldInstructionStatus,
  "reserved-fail-closed-source-only",
);
assert.equal(status.onchainUnshieldCustody.onchainProofVerifierReady, false);
for (const blocker of [
  "observability-provider-controls-pending",
  "real-funds-readiness-pending",
  "operator-event-sink-not-production-ready",
]) {
  assert.ok(
    status.runtimeProductionControls.pending.includes(blocker),
    `Unshield runtime production controls missing blocker: ${blocker}`,
  );
}
assert.equal(status.noFundsOperatorEndpointCovered, true);
assert.equal(status.liveSettlementProven, false);
assert.equal(status.exactUnshieldApprovalScoped, false);
assert.equal(status.boundedApprovalActive, false);

const expectedBlockers = [
  "no-reviewed-live-mainnet-unshield-settlement-evidence",
  "no-exact-unshield-bounded-approval-window",
  "observability-provider-controls-pending",
  "operator-event-sink-not-production-ready",
  "program-owned-vault-pda-not-deployed",
  "tag-unshield-reserved-fail-closed",
  "onchain-unshield-proof-verifier-not-wired",
  "operator-vault-keypair-env-release-still-active",
  ...(status.currentApproval.approvalWindowStatus === "active" ? [] : ["bounded-approval-window-expired"]),
  "no-proven-audited-shared-anonymity-set",
  "no-proven-live-mainnet-private-settlement-evidence",
  "no-third-party-audit",
];
for (const blocker of expectedBlockers) {
  assert.ok(status.blockers.includes(blocker), `Unshield mainnet production status missing blocker: ${blocker}`);
}

for (const [key, command] of Object.entries({
  mainnetPreflight: "npm run mainnet:preflight",
	  privateCoreVerify: "npm run private-core:verify",
	  privateSettlementStatus: "npm run --silent mainnet:private-settlement-status-json",
	  realFundsApprovalStatus: "npm run --silent mainnet:real-funds-approval-status-json",
	  unshieldBalanceLedger: "npm run unshield:balance-ledger-check",
	  unshieldNoFundsEndpoint: "npm run unshield:sol-operator-endpoint-check",
  unshieldPublicExitSurface: "npm run unshield:public-exit-surface-check",
  unshieldActualPrivatePlan: "npm run mainnet:actual-private-settlement-plan-check",
  unshieldActualPrivatePlanJson: "npm run mainnet:actual-private-settlement-plan-json-check",
  onchainUnshieldCustody: "npm run private-pool-v2:onchain-unshield-custody-check",
  runtimeProductionControls: "npm run mainnet:abuse-observability-runtime-status-auth",
  serviceDeploymentStatus: "npm run mainnet:service-deployment-status-check",
  walletSigningStatus: "npm run mainnet:wallet-signing-status-check",
})) {
  assert.equal(status.evidenceRefs[key], command, `Unshield status evidence ref mismatch for ${key}.`);
}

for (const phrase of [
  "solUnshieldOperatorHealth === \"ready\"",
  "fetchSolUnshieldOperatorHealth",
  "requestOperatorSolUnshield",
  "signSolUnshieldIntent",
]) {
  assert.ok(unshieldPageSource.includes(phrase), `Unshield page must preserve ${phrase}.`);
}

for (const phrase of [
  "vanta-sol-unshield-operator-health",
  "replace(/\\/+$",
  "await response.text()",
  "../../health/sol-unshield",
  "operator health payload was invalid",
]) {
  assert.ok(solHealthSource.includes(phrase), `SOL unshield health client must preserve ${phrase}.`);
}

for (const phrase of [
  "VITE_VANTA_SOL_UNSHIELD_OPERATOR_URL",
  "solUnshieldOperatorHealth === \"ready\"",
]) {
  assert.ok(publicExitCheckSource.includes(phrase), `Public-exit guard must preserve ${phrase}.`);
}

assert.ok(
  packageJson.scripts["unshield:sol-operator-endpoint-check"],
  "package.json must expose unshield:sol-operator-endpoint-check.",
);

assert.equal(
  packageJson.scripts["mainnet:unshield-production-status"],
  "node scripts/print-vanta-unshield-mainnet-production-status.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:unshield-production-status-json"],
  "node scripts/print-vanta-unshield-mainnet-production-status.mjs --json",
);
assert.equal(
  packageJson.scripts["mainnet:unshield-production-status-check"],
  "node scripts/print-vanta-unshield-mainnet-production-status.mjs --check",
);
assert.equal(
  packageJson.scripts["mainnet:unshield-production-check"],
  "node scripts/check-vanta-unshield-mainnet-production-status.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:unshield-production-check"),
  "mainnet:preflight must include the Unshield production status check.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:onchain-unshield-custody-check"],
  "node scripts/check-vanta-private-pool-v2-onchain-unshield-custody.mjs",
);
assert.ok(
  packageJson.scripts["zk:review-guards-check"].includes(
    "npm run private-pool-v2:onchain-unshield-custody-check",
  ),
  "zk:review-guards-check must include the Unshield custody guard.",
);

const serialized = JSON.stringify(status);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "signedTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Unshield production status must not contain ${forbidden}.`);
}

console.log("Vanta Unshield mainnet production status check: PASS");
