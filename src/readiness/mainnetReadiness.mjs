import { createVantaPrivacyRailContract } from "./privacyRailContract.mjs";

const blockers = [
  {
    id: "real-mainnet-private-settlement",
    severity: "critical",
    summary: "Replace local Private Pool v2 benchmark settlement with deployed mainnet-compatible private settlement.",
  },
  {
    id: "deployed-indexer-relayer-prover-operator",
    severity: "critical",
    summary: "Deploy durable indexer, relayer, prover, verifier, and operator services with production storage.",
  },
  {
    id: "final-nullifier-replay-enforcement",
    severity: "critical",
    summary: "Move the reusable nullifier replay guard from local operator enforcement into the final deployed protocol enforcement layer.",
  },
  {
    id: "secure-key-secret-handling",
    severity: "critical",
    summary: "Add production secret storage, key rotation, auth boundaries, and incident controls.",
  },
  {
    id: "wallet-backed-browser-signing-safety",
    severity: "critical",
    summary: "Require browser simulation and explicit wallet approval before any real transaction signature.",
  },
  {
    id: "third-party-security-audit",
    severity: "critical",
    summary: "Complete independent review of circuits, operators, custody assumptions, and web app boundaries.",
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
    id: "legal-compliance-custody-review",
    severity: "high",
    summary: "Complete legal, compliance, custody, and merchant-processing review before real funds.",
  },
  {
    id: "no-mainnet-funds-without-explicit-approval",
    severity: "critical",
    summary: "Keep all mainnet transactions and real-fund movement blocked without explicit human approval.",
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
    readiness: 48,
    status: "staging-render-postgres",
    truth: "Private Pool v2 has local indexer/relayer/prover/verifier/operator seams plus a Render staging deployment at https://vanta-staging-private-pool-v2.onrender.com with postgres-jsonb-snapshot-store persistence, but it is still a benchmark rail and not a deployed shared anonymity set or audited mainnet privacy pool.",
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
  "npm run mainnet:production-db-refs-check",
  "npm run storage:adapter-check",
  "npm run mainnet:abuse-observability-check",
  "npm run ops:rate-limit-check",
  "npm run mainnet:production-service-setup-check",
  "npm run privacy-rail:contract-check",
  "npm run ops:safe-telemetry-check",
  "npm run mainnet:observability-sink-check",
  "npm run nullifier:replay-guard-check",
  "npm run mainnet:deployment-manifest-check",
  "npm run mainnet:private-pool-v2-production-smoke-check",
  "npm run private-pool-v2:role-storage-check",
  "npm run wallet:signing-safety-check",
  "npm run wallet:browser-signing-safety-check",
  "npm run wallet:transaction-safety-check",
  "npm run mainnet:secret-handling-check",
  "npm run mainnet:approval-gates-check",
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
  "Fill the external gates packet with real deployed service refs, secret-manager refs, audit/legal/custody refs, and explicit mainnet approval artifacts without committing secrets.",
  "Replace templated Private Pool v2 service topology with real deployed service URLs, mutual-auth credentials, and production smoke targets.",
  "Attach real production database refs to the checked Pay, Private Pool v2 role, Strategy, and Operator storage adapters, then capture backup/restore evidence.",
  "Create the actual Better Stack production log sources, metrics dashboards, alert policies, incident routing, and retention-policy refs named by the production observability template.",
  "Move nullifier replay guard persistence behind the production storage adapter and final deployed enforcement layer.",
  "Add a checked mainnet deployment runbook with rollback, monitoring, rate limits, and incident response.",
  "Add wallet-backed transaction simulation surfaces before any live signing path.",
  "Prepare audit package for circuits, operators, browser flows, and custody assumptions.",
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
    lanes,
    mainnetReady: false,
    nextActions,
    privacyRail,
    productionReady: false,
    requiredCommands,
    score,
  };
}
