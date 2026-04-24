import { strict as assert } from "node:assert";
import { createVantaMainnetReadinessSnapshot } from "../src/readiness/mainnetReadiness.mjs";

const snapshot = createVantaMainnetReadinessSnapshot();

assert.equal(snapshot.version, "vanta-mainnet-readiness-0.1");
assert.equal(snapshot.mainnetReady, false, "Vanta must not report mainnet readiness while blockers remain.");
assert.equal(snapshot.productionReady, false, "Top-level productionReady must remain false before audit/mainnet gates.");
assert.equal(snapshot.decision, "blocked");
assert.equal(snapshot.privacyRail.activeRailId, "alpha-public-warning");
assert.equal(snapshot.privacyRail.meaningfulPrivacyReady, false);
assert.equal(snapshot.privacyRail.activeRail.canClaimMeaningfulPrivacy, false);
assert.ok(snapshot.privacyRail.userFacingRule.includes("Do not claim meaningful privacy"));
assert.equal(snapshot.abuseObservability.payRuntimeStatus, "staging-or-local-only");
assert.equal(snapshot.abuseObservability.privatePoolV2RuntimeMode, "remote-services");
assert.equal(snapshot.abuseObservability.privatePoolV2RateLimiter, "postgres-durable-shared-window");
assert.equal(snapshot.abuseObservability.privatePoolV2PreferredRateLimiterKind, "postgres-durable-shared-window");
assert.equal(snapshot.abuseObservability.privatePoolV2RuntimeMatchesPreferredRateLimiter, true);
assert.equal(snapshot.abuseObservability.providerBackedLogSinkAvailable, false);
assert.equal(snapshot.abuseObservability.metricsDashboardsAvailable, false);
assert.equal(snapshot.abuseObservability.alertsConfigured, false);
assert.equal(snapshot.abuseObservability.retentionPolicyConfigured, false);
assert.equal(snapshot.abuseObservability.incidentWorkflowReady, false);
assert.equal(snapshot.nullifierReplay.runtimeMode, "remote-services");
assert.equal(
  snapshot.nullifierReplay.layeredReplayStatus,
  "operator-enforced-plus-role-network-verified-plus-production-smoke-simulated",
);
assert.equal(
  snapshot.nullifierReplay.nullifierReplayGuardMode,
  "postgres-durable-claim-preflight-and-accepted-reservation",
);
assert.equal(
  snapshot.nullifierReplay.protocolEnforcementLayer,
  "operator-claim-preflight-plus-verifier-receipt-idempotency-plus-indexer-nullifier-registration",
);
assert.equal(snapshot.nullifierReplay.protocolEnforcementFinalLayerImplemented, true);
assert.equal(snapshot.nullifierReplay.protocolEnforcementFinalLayerProductionReady, false);
assert.equal(snapshot.nullifierReplay.roleServiceNetworkReplayVerified, true);
assert.equal(snapshot.realFundsApproval.realFundsApprovalRecorded, true);
assert.equal(snapshot.realFundsApproval.approvalRecordStatus, "approved");
assert.equal(snapshot.realFundsApproval.approvalActionRef, "launch-runbook/vanta-mainnet-beta-001");
assert.equal(
  snapshot.realFundsApproval.approvalActionSummary,
  "Enable beta mainnet private-pool smoke with maximum 0.05 SOL at risk",
);
assert.equal(snapshot.realFundsApproval.approvalEnvironment, "mainnet-beta");
assert.equal(snapshot.realFundsApproval.feePayerRef, "wallet/public-fee-payer-vanta-beta");
assert.equal(snapshot.realFundsApproval.rollbackPlanRef, "runbook/disable-private-pool-v2-services-and-beta-actions");
assert.equal(snapshot.realFundsApproval.stopLossPlanRef, "max-0.05-sol-or-first-failed-settlement");
assert.equal(snapshot.realFundsApproval.maximumFundsAtRiskRef, "0.05 SOL");
assert.equal(snapshot.realFundsApproval.approvedByRef, "Clay / founder approval / 2026-04-22");
assert.equal(snapshot.realFundsApproval.liveMainnetActionsAllowedNow, false);
assert.equal(snapshot.realFundsApproval.approvalWindowStatus, "expired");
assert.ok(snapshot.realFundsApproval.requiredNextStep.includes("Record a new bounded approval window"));
assert.equal(snapshot.privateSettlement.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(snapshot.privateSettlement.settlementReadiness, "no-real-funds-production-smoke-only");
assert.equal(snapshot.privateSettlement.routeHealthPublicPassed, true);
assert.equal(snapshot.privateSettlement.routeHealthAuthenticatedPassed, true);
assert.equal(snapshot.privateSettlement.productionSmokeHealthPassed, true);
assert.equal(snapshot.privateSettlement.productionSmokeTargetsPassed, true);
assert.equal(snapshot.privateSettlement.replayProtocolLayerImplemented, true);
assert.equal(snapshot.privateSettlement.realFundsApprovalRecorded, true);
assert.equal(snapshot.privateSettlement.realFundsAllowedNow, false);
assert.equal(snapshot.privateSettlement.privacyClaimAllowed, false);
assert.equal(snapshot.privateSettlement.noRealFundsSmokeOnly, true);
assert.equal(snapshot.privateSettlement.productionReady, false);
assert.equal(snapshot.privateSettlement.mainnetReady, false);
assert.ok(
  snapshot.privateSettlement.deploymentTruth.includes("must not be presented as live mainnet private settlement"),
);
assert.equal(snapshot.walletSigning.checkedEvidenceRef, "ops/mainnet/wallet-signing-safety.evidence.json");
assert.equal(snapshot.walletSigning.mainnetReady, false);
assert.equal(snapshot.walletSigning.productionReady, false);
assert.equal(snapshot.walletSigning.liveMainnetSubmissionEnabled, false);
assert.equal(snapshot.walletSigning.localBrowserVerificationOnly, true);
assert.equal(snapshot.walletSigning.productionBrowserVerificationAvailable, false);
assert.equal(snapshot.walletSigning.productionBrowserVerificationStatus, "pending");
assert.equal(snapshot.walletSigning.mainnetSubmissionExplicitlyBlocked, true);
assert.equal(snapshot.walletSigning.browserVerificationCluster, "devnet-or-localnet");
assert.equal(snapshot.walletSigning.browserVerificationMode, "local-dev-server-gsd-browser");
assert.deepEqual(snapshot.walletSigning.browserVerifiedProtocolPages, ["Shield", "Send", "Swap", "Unshield"]);
assert.deepEqual(snapshot.walletSigning.protocolPagesWithSafeSendAdoption, ["Shield", "Send", "Swap", "Unshield"]);
assert.deepEqual(snapshot.walletSigning.messageIntentPages, ["Swap", "Unshield"]);
assert.equal(snapshot.walletSigning.requiresExplicitHumanApproval, true);
assert.equal(snapshot.walletSigning.requiresSimulationBeforeSignature, true);
assert.equal(snapshot.walletSigning.requiresTransactionSummaryBeforeSignature, true);
assert.equal(snapshot.walletSigning.umbraAdapterGateStatus, "wallet-adapter-summary-bound");
assert.equal(snapshot.walletSigning.umbraAdapterSummaryBindingRequired, true);
assert.equal(snapshot.walletSigning.statusRef, "npm run mainnet:wallet-signing-status-check");
assert.equal(snapshot.walletSigning.signingSafetyPolicyRef, "npm run wallet:signing-safety-check");
assert.equal(snapshot.walletSigning.liveSendInventoryRef, "npm run wallet:live-send-inventory-check");
assert.ok(
  snapshot.walletSigning.deploymentTruth.includes("must still not be presented as a production browser-signing readiness claim"),
);
assert.ok(snapshot.walletSigning.deploymentTruth.includes("live mainnet submission remains explicitly blocked"));
assert.ok(snapshot.walletSigning.nextOperatorAction.includes("wallet-signing status"));
assert.equal(
  snapshot.privatePoolV2ProductionSmoke.checkedEvidenceRef,
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
);
assert.equal(snapshot.privatePoolV2ProductionSmoke.mainnetReady, false);
assert.equal(snapshot.privatePoolV2ProductionSmoke.productionReady, false);
assert.equal(snapshot.privatePoolV2ProductionSmoke.realFundsAllowed, false);
assert.ok(String(snapshot.privatePoolV2ProductionSmoke.runId).startsWith("prod-smoke-"));
assert.deepEqual(snapshot.privatePoolV2ProductionSmoke.serviceIds, [
  "indexer",
  "prover",
  "relayer",
  "verifier",
  "operator",
]);
for (const service of snapshot.privatePoolV2ProductionSmoke.serviceReadinessStatuses) {
  assert.equal(service.healthOk, true, `${service.id} production smoke health must stay green.`);
  assert.equal(service.readinessOk, true, `${service.id} production smoke readiness must stay green.`);
  assert.equal(
    service.readinessProductionReady,
    false,
    `${service.id} production smoke must not overstate production readiness.`,
  );
}
const smokeTargets = new Map(
  snapshot.privatePoolV2ProductionSmoke.smokeTargetStatuses.map((target) => [target.id, target]),
);
for (const targetId of [
  "service-health",
  "remote-runtime-readiness",
  "proof-roundtrip-simulation",
  "nullifier-replay-simulation",
  "relayer-claim-submit-simulation",
  "operator-pay-settlement-simulation",
]) {
  assert.equal(smokeTargets.get(targetId)?.status, "pass", `Missing passing smoke target ${targetId}.`);
}
assert.equal(smokeTargets.get("nullifier-replay-simulation")?.replayStatus, 400);
assert.equal(snapshot.productionServiceDeployment.checkedEvidenceRef, "ops/mainnet/service-deployment.evidence.json");
assert.equal(snapshot.productionServiceDeployment.mainnetReady, false);
assert.equal(snapshot.productionServiceDeployment.productionReady, false);
assert.equal(snapshot.productionServiceDeployment.lastStatusRef, "npm run mainnet:service-deployment-status-check");
assert.equal(
  snapshot.productionServiceDeployment.manifestRef,
  "ops/mainnet/private-pool-v2-services.manifest.json",
);
assert.equal(
  snapshot.productionServiceDeployment.roleServiceReplayEvidenceRef,
  "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
);
assert.equal(snapshot.productionServiceDeployment.roleServiceNetworkRef, "npm run private-pool-v2:service-network-check");
assert.equal(
  snapshot.productionServiceDeployment.productionSmokeEvidenceRef,
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
);
assert.equal(snapshot.productionServiceDeployment.routeHealthPublicPassed, true);
assert.equal(snapshot.productionServiceDeployment.routeHealthAuthenticatedPassed, true);
assert.equal(snapshot.productionServiceDeployment.roleServiceReplayVerified, true);
assert.equal(snapshot.productionServiceDeployment.productionSmokeHealthPassed, true);
assert.equal(snapshot.productionServiceDeployment.productionSmokeTargetsPassed, true);
assert.equal(
  snapshot.productionServiceDeployment.routeHealthEvidenceRef,
  "ops/mainnet/private-pool-v2-route-health.evidence.json",
);
assert.match(
  snapshot.productionServiceDeployment.routeHealthLastCheckedAt,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
);
assert.deepEqual(
  snapshot.productionServiceDeployment.serviceDeploymentStatuses.map((service) => service.id),
  ["indexer", "relayer", "prover", "verifier", "operator"],
);
for (const service of snapshot.productionServiceDeployment.serviceDeploymentStatuses) {
  assert.equal(service.deploymentStatus, "deployed-render-production-not-ready");
}
assert.ok(snapshot.productionServiceDeployment.nextOperatorAction.includes("route-health"));
assert.ok(snapshot.productionServiceDeployment.nextOperatorAction.includes("production smoke"));
assert.ok(snapshot.score >= 0 && snapshot.score <= 100, "Readiness score must be a percentage.");
assert.ok(snapshot.blockers.length >= 6, "Mainnet readiness must enumerate concrete blockers.");
assert.ok(
  snapshot.blockers.some((blocker) => blocker.id === "real-mainnet-private-settlement"),
  "Missing private-settlement blocker.",
);
assert.ok(
  snapshot.blockers.some((blocker) => blocker.id === "no-mainnet-funds-without-explicit-approval"),
  "Missing mainnet funds approval blocker.",
);
const operatorSkippedControlIds = new Set((snapshot.operatorSkippedControls ?? []).map((risk) => risk.id));
for (const riskId of [
  "pay-restore-readback-skipped",
  "provider-backup-pitr-encryption-access-audit-least-privilege-skipped",
  "secret-manager-audit-rotation-evidence-skipped",
  "third-party-security-audit-skipped",
  "legal-compliance-custody-skipped",
]) {
  assert.ok(operatorSkippedControlIds.has(riskId), `Mainnet readiness missing operator-skipped control: ${riskId}.`);
}
assert.ok(
  snapshot.blockers
    .find((blocker) => blocker.id === "no-mainnet-funds-without-explicit-approval")
    ?.summary.includes("bounded beta mainnet private-pool smoke"),
  "Funds blocker must preserve bounded approval language.",
);
assert.ok(
  snapshot.lanes.privateCore.status === "verified-local",
  "Private Core should be represented as locally verified, not mainnet complete.",
);
assert.ok(
  snapshot.lanes.privatePoolV2.status === "production-smoke-render-postgres",
  "Private Pool v2 should be represented as production smoke Render/Postgres infrastructure.",
);
assert.ok(
    snapshot.lanes.privatePoolV2.truth.includes("Render") &&
    snapshot.lanes.privatePoolV2.truth.includes("postgres-jsonb-snapshot-store") &&
    snapshot.lanes.privatePoolV2.truth.includes("Postgres-backed nullifier replay storage") &&
    snapshot.lanes.privatePoolV2.truth.includes("no-real-funds production smoke evidence") &&
    snapshot.lanes.privatePoolV2.truth.includes("not an audited shared anonymity set") &&
    snapshot.lanes.privatePoolV2.truth.includes("must not move real funds"),
  "Private Pool v2 truth must mention production smoke Render/Postgres and preserve non-production limits.",
);
assert.ok(
  snapshot.lanes.pay.status === "staging-render-pay",
  "Pay should be represented as a staging Render Pay deployment.",
);
assert.ok(
  snapshot.lanes.pay.truth.includes("Render") &&
    snapshot.lanes.pay.truth.includes("postgres-jsonb-snapshot-store") &&
    snapshot.lanes.pay.truth.includes("not a production processor"),
  "Pay truth must mention staging Render/Postgres and preserve non-production limits.",
);
assert.ok(
  snapshot.lanes.strategy.status === "local-planning-runtime",
  "Strategy should be represented as a local planning/runtime lane.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run private-core:verify"),
  "Missing private-core verification command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run private-pool-v2:verify"),
  "Missing private-pool-v2 verification command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run private-pool-v2:role-storage-check"),
  "Missing Private Pool v2 role storage verification command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:service-contract-check"),
  "Missing production service contract command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:service-topology-check"),
  "Missing production service topology command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:service-deployment-status"),
  "Missing production service deployment status command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:service-deployment-evidence-check"),
  "Missing production service deployment evidence command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:storage-contract-check"),
  "Missing production storage contract command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:storage-migration-check"),
  "Missing production storage migration command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:production-db-refs-check"),
  "Missing production DB refs runbook command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:production-db-migration-harness-check"),
  "Missing production DB migration harness check command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:production-db-migration-dry-run"),
  "Missing production DB migration dry-run command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:production-migration-evidence-check"),
  "Missing production migration evidence command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:staging-smoke-evidence-check"),
  "Missing staging smoke evidence command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:backup-restore-check"),
  "Missing production backup/restore check command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run storage:adapter-check"), "Missing storage adapter command.");
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:abuse-observability-check"),
  "Missing abuse/observability contract command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:abuse-observability-status"),
  "Missing abuse/observability status command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:abuse-observability-evidence-check"),
  "Missing abuse/observability evidence command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run ops:operator-event-sink-check"),
  "Missing operator event sink command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run ops:rate-limit-check"), "Missing rate-limit check command.");
assert.ok(snapshot.requiredCommands.includes("npm run ops:safe-telemetry-check"), "Missing safe telemetry check command.");
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:production-service-setup-check"),
  "Missing production service setup check command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:deployment-runbook-check"),
  "Missing mainnet deployment runbook check command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run privacy-rail:contract-check"),
  "Missing privacy rail contract command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:observability-sink-check"),
  "Missing production observability sink check command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run nullifier:replay-guard-check"),
  "Missing nullifier replay guard command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:nullifier-replay-status"),
  "Missing production nullifier replay status command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:nullifier-replay-evidence-check"),
  "Missing production nullifier replay evidence command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run mainnet:preflight"), "Missing mainnet preflight command.");
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:external-gates-check"),
  "Missing external gates packet command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:deployment-manifest-check"),
  "Missing deployment manifest command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:private-rail-route-status-check"),
  "Missing production private rail route-status command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:private-rail-route-health"),
  "Missing production private rail route-health command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:private-rail-route-health-evidence-check"),
  "Missing production private rail route-health evidence command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:private-pool-v2-production-smoke-check"),
  "Missing Private Pool v2 production smoke template command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:signing-safety-check"),
  "Missing wallet signing safety command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:wallet-signing-status"),
  "Missing production wallet-signing status command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:wallet-signing-evidence-check"),
  "Missing production wallet-signing evidence command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:browser-signing-safety-check"),
  "Missing browser-backed wallet signing safety command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:fresh-wallet-check"),
  "Missing fresh wallet mode safety command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:fresh-wallet-browser-check"),
  "Missing browser-backed fresh wallet mode command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:transaction-safety-check"),
  "Missing transaction safety summary command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:backed-simulation-check"),
  "Missing wallet-backed transaction simulation command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:message-intent-safety-check"),
  "Missing wallet message-intent safety command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:message-intent-adoption-check"),
  "Missing wallet message-intent adoption command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:wallet-adapter-gate-check"),
  "Missing Umbra wallet adapter gate command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:operation-gate-adoption-check"),
  "Missing Umbra operation gate adoption command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:operation-summary-check"),
  "Missing Umbra operation summary command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:operation-client-summary-gate-check"),
  "Missing Umbra operation client summary gate command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:operation-summary-builders-check"),
  "Missing Umbra operation summary builders command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:operation-summary-display-check"),
  "Missing Umbra operation summary display command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:benchmark-approval-samples-check"),
  "Missing Umbra benchmark approval samples command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:approval-review-page-check"),
  "Missing Umbra approval review page command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:approval-review-page-browser-check"),
  "Missing Umbra approval review page browser command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:shield-action-review-check"),
  "Missing Umbra shield action review command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run umbra:unshield-action-review-check"),
  "Missing Umbra unshield action review command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run pay:production-private-rail-guard-check"),
  "Missing Pay production private rail guard command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:live-send-inventory-check"),
  "Missing wallet live send inventory command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:safe-send-boundary-check"),
  "Missing wallet safe send boundary command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:safe-send-hook-check"),
  "Missing wallet safe send hook command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run shield:safe-send-adoption-check"),
  "Missing Shield safe-send adoption command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run send:safe-send-adoption-check"),
  "Missing Send safe-send adoption command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run swap:safe-send-adoption-check"),
  "Missing Swap safe-send adoption command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run unshield:safe-send-adoption-check"),
  "Missing Unshield safe-send adoption command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:secret-handling-check"),
  "Missing secret handling contract command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:approval-gates-check"),
  "Missing approval gates command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:approval-gates-evidence-check"),
  "Missing approval gates evidence command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:approval-gates-status"),
  "Missing approval gates status command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:approval-gates-status-json"),
  "Missing approval gates status JSON command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:real-funds-approval-check"),
  "Missing real-funds approval command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:real-funds-approval-status"),
  "Missing real-funds approval status command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:private-settlement-status"),
  "Missing private-settlement status command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:private-settlement-check"),
  "Missing private-settlement check command.",
);
assert.ok(snapshot.requiredCommands.includes("npm run audit:package-check"), "Missing audit package command.");
assert.ok(snapshot.nextActions[0]?.includes("approval window"), "First next action should preserve the bounded approval window.");
assert.ok(
  snapshot.nextActions.some((action) => action.includes("operator-skipped controls")),
  "Next actions must preserve operator-skipped control visibility.",
);
assert.ok(
  snapshot.nextActions.some((action) => action.includes("Postgres-backed nullifier replay guard")),
  "Next actions must point to final protocol-layer nullifier enforcement.",
);
assert.ok(
  snapshot.nextActions.some((action) => action.includes("provider-backed log sink")),
  "Next actions must include the explicit pending observability controls.",
);

console.log("Vanta mainnet readiness check: PASS");
