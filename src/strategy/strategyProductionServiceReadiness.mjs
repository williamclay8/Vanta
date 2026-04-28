export const VANTA_STRATEGY_PRODUCTION_SERVICE_READINESS_VERSION =
  "vanta-strategy-production-service-readiness-0.1";

const REQUIRED_ENV_REFS = [
  "VANTA_STRATEGY_OPERATOR_AUTH_TOKEN_REF",
  "VANTA_STRATEGY_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_OPERATOR_URL_REF",
  "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN_REF",
  "VANTA_STRATEGY_JUPITER_API_REF",
  "VANTA_STRATEGY_JITO_AUTH_REF",
];

const REQUIRED_DURABLE_TABLES = [
  "strategies",
  "strategy_funding_events",
  "strategy_child_orders",
  "strategy_fills",
  "strategy_execution_attempts",
  "strategy_disclosures",
];

const REQUIRED_EVIDENCE_REFS = [
  "strategy-production-service-ref",
  "strategy-durable-storage-readback",
  "strategy-scheduler-restart-replay",
  "strategy-safe-telemetry-sink",
  "strategy-audit-event-sink",
  "strategy-live-submission-approval",
];

export function createStrategyProductionServiceReadiness(input = {}) {
  const envRefs = input.envRefs ?? {};
  const durableTables = new Set(input.durableTables ?? []);
  const evidenceRefs = input.evidenceRefs ?? {};

  const missingEnvRefs = REQUIRED_ENV_REFS.filter((ref) => typeof envRefs[ref] !== "string");
  const missingDurableTables = REQUIRED_DURABLE_TABLES.filter((table) => !durableTables.has(table));
  const missingEvidenceRefs = REQUIRED_EVIDENCE_REFS.filter(
    (ref) => typeof evidenceRefs[ref] !== "string",
  );
  const blockers = [
    ...missingEnvRefs.map((ref) => `missing-env-ref:${ref}`),
    ...missingDurableTables.map((table) => `missing-durable-table:${table}`),
    ...missingEvidenceRefs.map((ref) => `missing-evidence-ref:${ref}`),
  ];

  return {
    version: VANTA_STRATEGY_PRODUCTION_SERVICE_READINESS_VERSION,
    kind: "vanta-strategy-production-service-readiness",
    failClosed: true,
    gateCommand: "npm run strategy:production-service-readiness-check",
    currentTruth:
      "local Strategy operator queue and drain preview exist; production scheduler and durable service evidence remain blocked",
    requiredEnvRefs: REQUIRED_ENV_REFS,
    requiredDurableTables: REQUIRED_DURABLE_TABLES,
    requiredEvidenceRefs: REQUIRED_EVIDENCE_REFS,
    missingEnvRefs,
    missingDurableTables,
    missingEvidenceRefs,
    blockers,
    localOperatorQueueReady: input.localOperatorQueueReady === true,
    schedulerDrainPreviewReady: input.schedulerDrainPreviewReady === true,
    durableProductionServiceReady: false,
    liveStrategySchedulerReady: false,
    liveSubmissionAllowed: false,
    productionReady: false,
    mainnetReady: false,
  };
}
