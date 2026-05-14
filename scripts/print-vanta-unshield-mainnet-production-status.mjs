import { strict as assert } from "node:assert";

import { createVantaUnshieldMainnetProductionStatus } from "../src/readiness/unshieldMainnetProductionStatus.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

const status = createVantaUnshieldMainnetProductionStatus();

if (checkMode) {
  assert.equal(status.version, "vanta-unshield-mainnet-production-status-0.1");
  assert.equal(status.activePrivacyRailId, "vanta-private-pool-v2");
  assert.equal(status.status, "blocked");
  assert.equal(status.mainnetReady, false);
  assert.equal(status.productionReady, false);
  assert.equal(status.privacyClaimAllowed, false);
  assert.equal(status.localLaneCovered, true);
  assert.equal(status.noFundsOperatorEndpointCovered, true);
  assert.equal(status.liveSettlementProven, false);
  assert.equal(status.boundedApprovalActive, false);
  assert.equal(status.onchainUnshieldCustody.productionCustodyReady, false);
  assert.equal(status.onchainUnshieldCustody.currentReleaseModel, "operator-keypair-public-exit");
  assert.equal(status.onchainUnshieldCustody.sourceOnlyVaultAuthorityPreflightReady, true);
  assert.equal(status.onchainUnshieldCustody.sourceOnlyRootPreflightReady, true);
  assert.equal(
    status.onchainUnshieldCustody.onchainUnshieldInstructionStatus,
    "reserved-fail-closed-vault-asset-preflight-source-only",
  );
  assert.equal(status.onchainUnshieldCustody.sourceOnlyVaultAssetRegistryReady, true);
  assert.equal(status.onchainUnshieldCustody.sourceOnlyVaultTokenAccountPreflightReady, true);
  assert.equal(status.onchainUnshieldCustody.tagUnshieldVaultAssetRegistryReleaseEnabled, false);
  assert.equal(status.onchainUnshieldCustody.tokenCpiReleaseReady, false);
  assert.ok(
    status.blockers.includes("program-owned-vault-pda-not-deployed"),
    "Unshield production status must expose the missing program-owned vault blocker.",
  );
  assert.ok(
    status.blockers.includes("tag-unshield-reserved-fail-closed"),
    "Unshield production status must expose the reserved fail-closed TAG_UNSHIELD blocker.",
  );
  assert.ok(
    status.blockers.includes("tag-unshield-token-cpi-release-not-wired"),
    "Unshield production status must expose the missing token-CPI release blocker.",
  );
  assert.ok(
    status.blockers.includes("no-reviewed-live-mainnet-unshield-settlement-evidence"),
    "Unshield production status must expose the missing reviewed live settlement blocker.",
  );
  assert.ok(
    status.blockers.includes("bounded-approval-window-expired") ||
      status.blockers.includes("bounded-approval-window-scheduled") ||
      status.blockers.includes("stop-condition-already-fired-for-approval-window") ||
      status.boundedApprovalActive,
    "Unshield production status must expose current bounded approval truth.",
  );
  assert.ok(
    status.blockers.includes("no-proven-audited-shared-anonymity-set"),
    "Unshield production status must preserve audited/shared anonymity-set truth.",
  );
  assert.equal(status.evidenceRefs.unshieldNoFundsEndpoint, "npm run unshield:sol-operator-endpoint-check");
  assert.equal(status.evidenceRefs.privateCoreVerify, "npm run private-core:verify");
  assert.equal(
    status.evidenceRefs.onchainUnshieldCustody,
    "npm run private-pool-v2:onchain-unshield-custody-check",
  );
  assert.ok(status.truth.includes("must not be called mainnet-production-ready"));
  assert.ok(status.safety.includes("No auth tokens"));
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(status, null, 2));
} else {
  console.log("Vanta Unshield mainnet production status");
  console.log(`- status: ${status.status}`);
  console.log(`- localLaneCovered: ${String(status.localLaneCovered)}`);
  console.log(`- noFundsOperatorEndpointCovered: ${String(status.noFundsOperatorEndpointCovered)}`);
  console.log(`- liveSettlementProven: ${String(status.liveSettlementProven)}`);
  console.log(`- boundedApprovalActive: ${String(status.boundedApprovalActive)}`);
  console.log(
    `- onchainUnshieldCustody: ${status.onchainUnshieldCustody.currentReleaseModel} (${status.onchainUnshieldCustody.status})`,
  );
  console.log(`- productionReady: ${String(status.productionReady)}`);
  console.log(`- blockers: ${status.blockers.join(", ")}`);
}
