import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaPrivacyRailContract } from "./privacyRailContract.mjs";
import { createVantaAbuseObservabilityRuntimeStatus } from "./abuseObservabilityRuntimeStatus.mjs";
import { createVantaNullifierReplayStatus } from "./nullifierReplayStatus.mjs";
import { createVantaMainnetPrivateSettlementStatus } from "./mainnetPrivateSettlementStatus.mjs";
import { createVantaMainnetRealFundsApprovalStatus } from "./mainnetRealFundsApprovalStatus.mjs";
import { createVantaWalletSigningStatus } from "./walletSigningStatus.mjs";
import { createVantaPrivatePoolV2ProductionSmokeStatus } from "./privatePoolV2ProductionSmokeStatus.mjs";
import { createVantaProductionServiceDeploymentStatus } from "./productionServiceDeploymentStatus.mjs";
import { createVantaTurnkeyIntegrationContract } from "./turnkeyIntegrationContract.mjs";

const blockerDefinitions = [
  {
    id: "real-mainnet-private-settlement",
    severity: "critical",
    buildSummary: (snapshot) =>
      `Graduate the no-real-funds Private Pool v2 production smoke path into audited mainnet-compatible private settlement while the checked meaningful-privacy blockers remain ${snapshot.privateSettlement.meaningfulPrivacyBlockedBy.join(", ")}.`,
  },
  {
    id: "deployed-indexer-relayer-prover-operator",
    severity: "critical",
    buildSummary:
      "Keep the service-deployment status/evidence surface fresh while deployed production indexer, relayer, prover, verifier, and operator services continue to show green route-health, replay, and no-real-funds smoke evidence, while restore readback remains explicitly passed for Private Pool v2 core, role-service storage, Strategy, and operator storage, while incident workflow evidence is configured, and while the checked pending production controls remain observability-provider-controls and real-funds-readiness.",
  },
  {
    id: "final-nullifier-replay-enforcement",
    severity: "critical",
    buildSummary: (snapshot) =>
      `Keep the deployed Postgres-backed operator replay guard, verified role-service replay barrier, local actual-private protocol replay regression, production replay probe/reconciliation commands, and no-real-funds production smoke replay rejection fresh while the checked replay blockers remain ${snapshot.nullifierReplay.productionReplayBlockedBy.join(", ")}.`,
  },
  {
    id: "wallet-backed-browser-signing-safety",
    severity: "critical",
    buildSummary:
      "Keep the wallet-signing status/evidence surface fresh while Shield, Send, Swap, and Unshield remain frozen behind safe-send or typed message-intent boundaries, deployed production browser proof stays green, and any real-funds mainnet action remains bounded by explicit approval.",
  },
  {
    id: "abuse-rate-limit-observability",
    severity: "high",
    buildSummary:
      "Keep the abuse/observability status/evidence surface fresh while Pay and Private Pool v2 are the next services ready for Render-native observability wiring, while Strategy and operator control plane still lack production service refs, while incident workflow runbook refs are configured, and while the checked pending provider controls remain render-native-log-sink, metrics-dashboards, alert-policies, and retention-policy.",
  },
  {
    id: "no-mainnet-funds-without-explicit-approval",
    severity: "critical",
    buildSummary: (snapshot) =>
      `Allow only the bounded action currently approved in the real-funds packet (${snapshot.realFundsApproval.approvalActionRef}) while the checked funds blockers remain ${snapshot.realFundsApproval.mainnetFundsBlockedBy.join(", ")}.`,
  },
];

const operatorSkippedControls = [
  {
    id: "pay-restore-readback-skipped",
    severity: "high",
    summary: "Pay restore readback was skipped by operator decision; this is not restore evidence.",
  },
  {
    id: "provider-backup-pitr-encryption-access-audit-least-privilege-skipped",
    severity: "high",
    summary: "Provider backup/PITR/encryption/access-audit/least-privilege evidence was skipped by operator decision.",
  },
  {
    id: "secret-manager-audit-rotation-evidence-skipped",
    severity: "critical",
    summary: "Secret-manager audit and rotation evidence was skipped by operator decision; this is not a secret-handling maturity claim.",
  },
  {
    id: "third-party-security-audit-skipped",
    severity: "critical",
    summary: "Third-party security audit was skipped by operator decision; this is not an audit claim.",
  },
  {
    id: "legal-compliance-custody-skipped",
    severity: "high",
    summary: "Legal, compliance, and custody review was skipped by operator decision; this is not legal or custody approval.",
  },
];

const lanes = {
  pay: {
    readiness: 62,
    status: "staging-render-pay",
    truth: "Pay has local merchant API coverage plus a Render staging deployment at https://vanta-0wwi.onrender.com with postgres-jsonb-snapshot-store persistence and Private Pool v2 operator wiring, but it is not a production processor, audited settlement system, or mainnet-ready service.",
  },
  privateCore: {
    readiness: 45,
    status: "verified-local",
    truth: "Private Core has executable local proof lanes and operator checks, but remains intentionally narrow and not audited.",
  },
  privatePoolV2: {
    readiness: 58,
    status: "production-smoke-render-postgres",
    truth: "Private Pool v2 has local indexer/relayer/prover/verifier/operator seams, Render staging coverage, fresh no-real-funds production smoke evidence across deployed Render indexer, prover, relayer, verifier, and operator services with postgres-jsonb-snapshot-store persistence, a production operator guard that requires Postgres-backed nullifier replay storage, a verified role-service replay barrier covering duplicate verifier receipt rejection and indexer nullifier registration, and a sanitized production replay-status evidence surface proving the deployed operator now exposes the final replay protocol layer through verifier receipt idempotency plus indexer nullifier registration. It is still not an audited shared anonymity set or mainnet privacy pool, and must not move real funds.",
  },
  protocolTabs: {
    readiness: 50,
    status: "browser-verified-local",
    truth: "Shield, Send, Swap, Strategy, and Unshield have browser checks, and the protocol wallet-signing lane now has a sanitized production status/evidence surface proving Shield, Send, Swap, and Unshield live call sites stay behind safe-send or message-intent boundaries with the Umbra adapter fail-closed behind a summary-bound approval gate while browser-backed signing verification explicitly covers Shield, Send, Swap, and Unshield on both the local/mainnet lane and the deployed public app. It is still not production-ready because real-funds actions remain bounded by explicit approval and meaningful-privacy blockers remain unresolved.",
  },
  strategy: {
    readiness: 42,
    status: "local-private-rail-operator-queue",
    truth: "Strategy has planner, execution preview, local runtime, redacted private-rail handoff, committed-economics request packets, commitment-only route/quote request-shape evidence, fail-closed readiness, and a local operator queue/drain preview. It still has no live Jupiter/Jito/private-settlement execution, production scheduler, durable production service, live venue route/quote privacy, audit, anonymity evidence, or mainnet-ready settlement.",
  },
};

const requiredCommands = [
  "npm run mainnet:readiness-check",
  "npm run mainnet:preflight",
  "npm run mainnet:external-gates-check",
  "npm run mainnet:service-contract-check",
  "npm run mainnet:service-topology-check",
  "npm run mainnet:service-deployment-status",
  "npm run mainnet:service-deployment-evidence-check",
  "npm run mainnet:storage-contract-check",
  "npm run mainnet:storage-migration-check",
  "npm run mainnet:backup-restore-check",
  "npm run mainnet:backup-restore-evidence-check",
  "npm run mainnet:backup-restore-status",
  "npm run mainnet:production-db-refs-check",
  "npm run mainnet:production-db-migration-harness-check",
  "npm run mainnet:production-db-migration-dry-run",
  "npm run mainnet:production-migration-evidence-check",
  "npm run mainnet:staging-smoke-evidence-check",
  "npm run storage:adapter-check",
  "npm run mainnet:abuse-observability-check",
  "npm run mainnet:abuse-observability-status",
  "npm run mainnet:abuse-observability-evidence-check",
  "npm run ops:rate-limit-check",
  "npm run ops:operator-event-sink-check",
  "npm run mainnet:production-service-setup-check",
  "npm run mainnet:deployment-runbook-check",
  "npm run privacy-rail:contract-check",
  "npm run private-pool-v2:anonymity-set-readiness-check",
  "npm run shield:privacy-readiness-check",
  "npm run shield:verify",
  "npm run ops:safe-telemetry-check",
  "npm run mainnet:observability-sink-check",
  "npm run nullifier:replay-guard-check",
  "npm run mainnet:nullifier-replay-status",
  "npm run mainnet:nullifier-replay-evidence-check",
  "npm run mainnet:actual-private-replay-probe-check",
  "npm run mainnet:actual-private-replay-reconcile-check",
  "npm run mainnet:actual-private-shared-cohort-deposit-review-check",
  "npm run mainnet:role-service-replay-status",
  "npm run mainnet:role-service-replay-evidence-check",
  "npm run mainnet:deployment-manifest-check",
  "npm run mainnet:private-rail-route-status-check",
  "npm run mainnet:private-rail-route-health",
  "npm run mainnet:private-rail-route-health-evidence-check",
  "npm run mainnet:private-pool-v2-production-smoke-check",
  "npm run private-pool-v2:role-storage-check",
  "npm run wallet:signing-safety-check",
  "npm run turnkey:integration-contract-check",
  "npm run swap:turnkey-liquidity-signer-dry-run-check",
  "npm run mainnet:wallet-signing-status",
  "npm run mainnet:wallet-production-browser-check",
  "npm run mainnet:wallet-signing-evidence-check",
  "npm run wallet:browser-signing-safety-check",
  "npm run wallet:fresh-wallet-check",
  "npm run wallet:fresh-wallet-browser-check",
  "npm run wallet:transaction-safety-check",
  "npm run wallet:backed-simulation-check",
  "npm run wallet:message-intent-safety-check",
  "npm run wallet:message-intent-adoption-check",
  "npm run umbra:wallet-adapter-gate-check",
  "npm run umbra:operation-gate-adoption-check",
  "npm run umbra:operation-summary-check",
  "npm run umbra:operation-client-summary-gate-check",
  "npm run umbra:operation-summary-builders-check",
  "npm run umbra:operation-summary-display-check",
  "npm run umbra:benchmark-approval-samples-check",
  "npm run umbra:approval-review-page-check",
  "npm run umbra:approval-review-page-browser-check",
  "npm run umbra:shield-action-review-check",
  "npm run umbra:unshield-action-review-check",
  "npm run wallet:live-send-inventory-check",
  "npm run wallet:safe-send-boundary-check",
  "npm run wallet:safe-send-hook-check",
  "npm run shield:safe-send-adoption-check",
  "npm run send:safe-send-adoption-check",
  "npm run swap:safe-send-adoption-check",
  "npm run unshield:safe-send-adoption-check",
  "npm run mainnet:secret-handling-check",
  "npm run mainnet:approval-gates-check",
  "npm run mainnet:approval-gates-evidence-check",
  "npm run mainnet:approval-gates-status",
  "npm run mainnet:approval-gates-status-json",
  "npm run mainnet:real-funds-approval-check",
  "npm run mainnet:real-funds-approval-status",
  "npm run mainnet:private-settlement-status",
  "npm run mainnet:private-settlement-check",
  "npm run mainnet:send-production-status",
  "npm run mainnet:send-production-check",
  "npm run mainnet:swap-production-status",
  "npm run mainnet:swap-production-check",
  "npm run mainnet:unshield-production-status",
  "npm run mainnet:unshield-production-check",
  "npm run private-pool-v2:anonymity-set-readiness",
  "npm run private-pool-v2:anonymity-set-readiness-json",
  "npm run pay:production-private-rail-guard-check",
  "npm run audit:package-check",
  "npm run security:limitations-check",
  "npm run operator:runbook-check",
  "npm run private-core:verify",
  "npm run private-pool-v2:verify",
  "npm run pay:verify",
  "npm run protocol:browser-check",
  "npm run mainnet:external-gates-production-claim-check",
  "npm run mainnet:production-restore-drill-evidence-check",
  "npm run mainnet:production-incident-workflow-evidence-check",
  "npm run mainnet:production-secret-manager-evidence-check",
  "npm run mainnet:asset-registry-check",
  "npm run shield:production-assets-check",
  "npm run private-pool-v2:anonymity-set-evidence-check",
  "npm run private-pool-v2:relayer-separation-evidence-check",
  "npm run private-pool-v2:production-relayer-review-check",
  "npm run private-pool-v2:production-privacy-reviewer-packet-check",
  "npm run mainnet:actual-private-hard-blockers-check",
  "npm run mainnet:actual-private-external-artifact-acquisition-check",
  "npm run mainnet:production-smoke-evidence-check",
  "npm run mainnet:actual-private-production-evidence-check",
  "npm run mainnet:actual-private-production-capability-check",
  "npm run mainnet:actual-private-settlement-evidence-check",
  "npm run mainnet:actual-private-settlement-review-check",
  "npm run mainnet:actual-private-settlement-executor-check",
  "npm run mainnet:actual-private-settlement-operator-packet-check",
  "npm run mainnet:actual-private-settlement-browser-handoff-check",
  "npm run mainnet:actual-private-settlement-evidence-writer-check",
  "npm run mainnet:actual-private-settlement-plan-check",
  "npm run mainnet:actual-private-settlement-plan-json-check",
  "npm run mainnet:actual-private-settlement-relayer-caller-check",
  "npm run private-pool-v2:solana-spend-transaction-builder-check",
  "npm run private-pool-v2:solana-spend-transaction-check",
  "npm run private-pool-v2:solana-relayer-submission-check",
  "npm run private-pool-v2:service-network-check",
  "npm run wallet:manager-check",
  "npm run mainnet:real-funds-approval-status-check",
  "npm run pay:production-readiness-contract-check",
  "npm run truth:transaction-check",
  "npm run truth:privacy-claim-gate",
  "npm run mainnet:transaction-evidence-check",
  "npm run build",
];

function getPreflightCommands() {
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
  return String(packageJson.scripts?.["mainnet:preflight"] ?? "")
    .split("&&")
    .map((command) => command.trim())
    .filter(Boolean);
}

function createPreflightCommandCoverage() {
  const preflightCommands = getPreflightCommands();
  const requiredSet = new Set(requiredCommands);
  const preflightSet = new Set(preflightCommands);

  return {
    status: "tracked-with-drift-report",
    preflightCommandCount: preflightCommands.length,
    missingFromRequiredCommands: preflightCommands.filter((command) => !requiredSet.has(command)),
    requiredButNotInPreflight: requiredCommands.filter((command) => !preflightSet.has(command)),
  };
}

export function createVantaMainnetReadinessSnapshot() {
  const score = Math.round(
    Object.values(lanes).reduce((sum, lane) => sum + lane.readiness, 0) / Object.keys(lanes).length,
  );
  const abuseObservability = createVantaAbuseObservabilityRuntimeStatus();
  const nullifierReplay = createVantaNullifierReplayStatus();
  const privacyRail = createVantaPrivacyRailContract();
  const realFundsApproval = createVantaMainnetRealFundsApprovalStatus();
  const privateSettlement = createVantaMainnetPrivateSettlementStatus();
  const walletSigning = createVantaWalletSigningStatus();
  const turnkeyIntegration = createVantaTurnkeyIntegrationContract();
  const privatePoolV2ProductionSmoke = createVantaPrivatePoolV2ProductionSmokeStatus();
  const productionServiceDeployment = createVantaProductionServiceDeploymentStatus();
  const preflightCommandCoverage = createPreflightCommandCoverage();
  const blockers = blockerDefinitions.map((blocker) => ({
    id: blocker.id,
    severity: blocker.severity,
    summary: typeof blocker.buildSummary === "function" ? blocker.buildSummary({
      abuseObservability,
      nullifierReplay,
      privateSettlement,
      productionServiceDeployment,
      realFundsApproval,
      turnkeyIntegration,
      walletSigning,
    }) : blocker.buildSummary,
  }));
  const nextActions = [
    realFundsApproval.liveMainnetActionsAllowedNow
      ? `Execute only the approved bounded action ${realFundsApproval.approvalActionRef} during the active approval window; record a new bounded approval packet before changing the action, launch window, fee payer, or maximum funds at risk.`
      : realFundsApproval.approvalWindowStatus === "scheduled"
        ? "Wait for the approved live mainnet launch window to open before attempting any real-funds action."
        : "Record a new bounded approval window before any live mainnet action or real-funds movement.",
    `Keep the service-deployment packet, green route-health, green replay verification, green no-real-funds production smoke evidence, and the checked restore-readback coverage fresh while the checked pending production controls remain ${productionServiceDeployment.pendingProductionControls.join(", ")}.`,
    "Keep operator-skipped controls visible in operator surfaces without presenting skipped audit, legal/custody, secret rotation, Pay readback, or provider backup controls as completed.",
    `Keep the abuse/observability status/evidence surface fresh while incident workflow runbook refs remain configured and the checked pending provider controls remain ${abuseObservability.pendingObservabilityControls.join(", ")}.`,
    `Keep the deployed operator replay-status evidence, the Postgres-backed nullifier replay guard, role-service replay verification, and production smoke replay simulation fresh while the checked replay blockers remain ${nullifierReplay.productionReplayBlockedBy.join(", ")}.`,
    `Keep the wallet-signing status/evidence surface, four-page local browser verification, deployed browser verification, and live-send inventory commands fresh while any real-funds action remains bounded by explicit approval.`,
    `Keep Turnkey as a governed SDK-only integration until ${turnkeyIntegration.nextSafeStep}`,
  ];

  return {
    version: "vanta-mainnet-readiness-0.1",
    blockers,
    decision: "blocked",
    generatedAt: new Date().toISOString(),
    operatorSkippedControls,
    lanes,
    mainnetReady: false,
    nextActions,
    abuseObservability,
    nullifierReplay,
    privateSettlement,
    preflightCommandCoverage,
    privacyRail,
    privatePoolV2ProductionSmoke,
    productionReady: false,
    productionServiceDeployment,
    realFundsApproval,
    requiredCommands,
    score,
    turnkeyIntegration,
    walletSigning,
  };
}
