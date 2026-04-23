import { createVantaPrivacyRailContract } from "./privacyRailContract.mjs";

const blockers = [
  {
    id: "real-mainnet-private-settlement",
    severity: "critical",
    summary: "Graduate the no-real-funds Private Pool v2 production smoke path into audited mainnet-compatible private settlement.",
  },
  {
    id: "deployed-indexer-relayer-prover-operator",
    severity: "critical",
    summary: "Keep production indexer, relayer, prover, verifier, and operator services deployed with durable storage, fresh smoke evidence, observability, and backup/restore evidence.",
  },
  {
    id: "final-nullifier-replay-enforcement",
    severity: "critical",
    summary: "Carry the Postgres-backed operator replay guard into the final deployed protocol enforcement layer.",
  },
  {
    id: "wallet-backed-browser-signing-safety",
    severity: "critical",
    summary: "Require browser simulation and explicit wallet approval before any real transaction signature.",
  },
  {
    id: "mainnet-deployment-runbook",
    severity: "high",
    summary: "Publish checked deployment, rollback, monitoring, backup, and incident-response runbooks.",
  },
  {
    id: "abuse-rate-limit-observability",
    severity: "high",
    summary: "Implement the checked abuse/observability contract with production rate limits, metrics, alerts, audit logs, and operator dashboards.",
  },
  {
    id: "no-mainnet-funds-without-explicit-approval",
    severity: "critical",
    summary: "Allow only the bounded beta mainnet private-pool smoke approved in the real-funds packet; keep all other mainnet transactions and real-fund movement blocked.",
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
    truth: "Private Pool v2 has local indexer/relayer/prover/verifier/operator seams, Render staging coverage, fresh no-real-funds production smoke evidence across deployed Render indexer, prover, relayer, verifier, and operator services with postgres-jsonb-snapshot-store persistence, and a production operator guard that requires Postgres-backed nullifier replay storage. It is still not an audited shared anonymity set or mainnet privacy pool, and must not move real funds.",
  },
  protocolTabs: {
    readiness: 50,
    status: "browser-verified-local",
    truth: "Shield, Send, Swap, Strategy, and Unshield have browser checks, but production wallet/funds safety is not complete.",
  },
  strategy: {
    readiness: 35,
    status: "local-planning-runtime",
    truth: "Strategy has planner, execution preview, and local runtime, but no live Jupiter/Jito/private-settlement execution.",
  },
};

const requiredCommands = [
  "npm run mainnet:readiness-check",
  "npm run mainnet:preflight",
  "npm run mainnet:external-gates-check",
  "npm run mainnet:service-contract-check",
  "npm run mainnet:service-topology-check",
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
  "npm run ops:rate-limit-check",
  "npm run mainnet:production-service-setup-check",
  "npm run privacy-rail:contract-check",
  "npm run ops:safe-telemetry-check",
  "npm run mainnet:observability-sink-check",
  "npm run nullifier:replay-guard-check",
  "npm run mainnet:deployment-manifest-check",
  "npm run mainnet:private-rail-route-status-check",
  "npm run mainnet:private-rail-route-health",
  "npm run mainnet:private-rail-route-health-evidence-check",
  "npm run mainnet:private-pool-v2-production-smoke-check",
  "npm run private-pool-v2:role-storage-check",
  "npm run wallet:signing-safety-check",
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
  "npm run pay:production-private-rail-guard-check",
  "npm run audit:package-check",
  "npm run security:limitations-check",
  "npm run operator:runbook-check",
  "npm run private-core:verify",
  "npm run private-pool-v2:verify",
  "npm run pay:verify",
  "npm run protocol:browser-check",
  "npm run build",
];

const nextActions = [
  "Execute only the approved bounded beta mainnet private-pool smoke, or return the real-funds approval packet to pending before changing the action, launch window, fee payer, or maximum funds at risk.",
  "Keep Private Pool v2 production smoke evidence fresh and require a new bounded approval before expanding live mainnet actions.",
  "Keep operator-skipped controls visible in operator surfaces without presenting skipped audit, legal/custody, secret rotation, Pay readback, or provider backup controls as completed.",
  "Use provider-neutral production observability evidence, existing platform logs, or a future provider instead of Better Stack production monitors.",
  "Carry the Postgres-backed nullifier replay guard into the final deployed protocol enforcement layer.",
  "Add a checked mainnet deployment runbook with rollback, monitoring, rate limits, and incident response.",
  "Replace every frozen live wallet send/sign call site with prepare, simulate, summary, wallet-backed gate validation, and wallet approval before expanding live signing paths.",
];

export function createVantaMainnetReadinessSnapshot() {
  const score = Math.round(
    Object.values(lanes).reduce((sum, lane) => sum + lane.readiness, 0) / Object.keys(lanes).length,
  );
  const privacyRail = createVantaPrivacyRailContract();

  return {
    version: "vanta-mainnet-readiness-0.1",
    blockers,
    decision: "blocked",
    generatedAt: new Date(0).toISOString(),
    operatorSkippedControls,
    lanes,
    mainnetReady: false,
    nextActions,
    privacyRail,
    productionReady: false,
    requiredCommands,
    score,
  };
}
