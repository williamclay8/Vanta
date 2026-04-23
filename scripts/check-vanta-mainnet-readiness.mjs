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
assert.ok(snapshot.requiredCommands.includes("npm run ops:rate-limit-check"), "Missing rate-limit check command.");
assert.ok(snapshot.requiredCommands.includes("npm run ops:safe-telemetry-check"), "Missing safe telemetry check command.");
assert.ok(
  snapshot.requiredCommands.includes("npm run mainnet:production-service-setup-check"),
  "Missing production service setup check command.",
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
  snapshot.requiredCommands.includes("npm run mainnet:private-pool-v2-production-smoke-check"),
  "Missing Private Pool v2 production smoke template command.",
);
assert.ok(
  snapshot.requiredCommands.includes("npm run wallet:signing-safety-check"),
  "Missing wallet signing safety command.",
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
assert.ok(snapshot.requiredCommands.includes("npm run audit:package-check"), "Missing audit package command.");
assert.ok(snapshot.nextActions[0]?.includes("approved bounded beta mainnet private-pool smoke"), "First next action should preserve bounded approval.");
assert.ok(
  snapshot.nextActions.some((action) => action.includes("operator-skipped controls")),
  "Next actions must preserve operator-skipped control visibility.",
);
assert.ok(
  snapshot.nextActions.some((action) => action.includes("Postgres-backed nullifier replay guard")),
  "Next actions must point to final protocol-layer nullifier enforcement.",
);
assert.ok(
  snapshot.nextActions.some((action) => action.includes("provider-neutral production observability")),
  "Next actions must include provider-neutral production observability setup.",
);

console.log("Vanta mainnet readiness check: PASS");
