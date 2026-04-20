const commonSecurityRequirements = [
  "auth-required",
  "durable-storage-required",
  "secret-rotation-required",
  "rate-limits-required",
  "metrics-required",
  "structured-logs-required",
];

const services = [
  {
    id: "indexer",
    label: "Private Pool v2 Indexer",
    deploymentStatus: "not-deployed",
    requiredChecks: ["commitment-append-order", "merkle-root-reconstruction", "restart-restore"],
    requiredEndpoints: ["/health", "/v1/commitments", "/v1/roots/:root", "/v1/nullifiers/:nullifier"],
    requiredEnv: ["VANTA_INDEXER_DATABASE_URL", "VANTA_INDEXER_AUTH_TOKEN", "VANTA_INDEXER_NETWORK"],
    securityRequirements: commonSecurityRequirements,
  },
  {
    id: "relayer",
    label: "Private Pool v2 Relayer",
    deploymentStatus: "not-deployed",
    requiredChecks: ["quote-expiry", "quote-replay-rejection", "submission-idempotency"],
    requiredEndpoints: ["/health", "/v1/quotes", "/v1/claims", "/v1/submissions/:submissionId"],
    requiredEnv: ["VANTA_RELAYER_DATABASE_URL", "VANTA_RELAYER_AUTH_TOKEN", "VANTA_RELAYER_FEE_WALLET"],
    securityRequirements: commonSecurityRequirements,
  },
  {
    id: "prover",
    label: "Private Pool v2 Prover",
    deploymentStatus: "not-deployed",
    requiredChecks: ["verifying-key-match", "public-input-binding", "proof-artifact-reproducibility"],
    requiredEndpoints: ["/health", "/v1/proofs/shield", "/v1/proofs/claim", "/v1/verifying-keys"],
    requiredEnv: ["VANTA_PROVER_AUTH_TOKEN", "VANTA_PROVER_ARTIFACT_PATH", "VANTA_PROVER_WORKER_COUNT"],
    securityRequirements: commonSecurityRequirements,
  },
  {
    id: "verifier",
    label: "Private Pool v2 Verifier Registry",
    deploymentStatus: "not-deployed",
    requiredChecks: ["proof-rejection", "receipt-idempotency", "verifier-key-registry"],
    requiredEndpoints: ["/health", "/v1/verify/shield", "/v1/verify/claim", "/v1/receipts/:receiptId"],
    requiredEnv: ["VANTA_VERIFIER_DATABASE_URL", "VANTA_VERIFIER_AUTH_TOKEN", "VANTA_VERIFIER_KEYSET"],
    securityRequirements: commonSecurityRequirements,
  },
  {
    id: "operator",
    label: "Vanta Operator Gateway",
    deploymentStatus: "not-deployed",
    requiredChecks: ["service-auth", "settlement-idempotency", "conflicting-replay-rejection"],
    requiredEndpoints: ["/health", "/v1/status", "/private-pool-v2/protocol-settlements", "/private-pool-v2/pay-settlements"],
    requiredEnv: ["VANTA_OPERATOR_DATABASE_URL", "VANTA_OPERATOR_AUTH_TOKEN", "VANTA_OPERATOR_NETWORK"],
    securityRequirements: commonSecurityRequirements,
  },
];

const crossServiceRequirements = [
  "mutual-service-authentication",
  "centralized-observability",
  "durable-backups",
  "schema-migrations",
  "incident-response-runbook",
  "least-privilege-secrets",
  "production-rate-limits",
  "replay-safe-idempotency",
];

export function createVantaProductionServiceContract() {
  return {
    version: "vanta-production-service-contract-0.1",
    crossServiceRequirements,
    mainnetReady: false,
    nextImplementationStep:
      "Create durable deployment manifests and smoke checks for the indexer, relayer, prover, verifier, and operator services.",
    productionReady: false,
    requiredVerificationCommands: [
      "npm run mainnet:service-contract-check",
      "npm run mainnet:readiness-check",
      "npm run private-pool-v2:verify",
    ],
    services,
  };
}
