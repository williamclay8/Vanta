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
    requiredEndpoints: ["/health", "/v1/commitments", "/v1/roots/latest", "/v1/nullifiers/:nullifier"],
    requiredEnv: [
      "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL",
      "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
      "VANTA_PRIVATE_POOL_V2_INDEXER_NETWORK",
    ],
    securityRequirements: commonSecurityRequirements,
  },
  {
    id: "relayer",
    label: "Private Pool v2 Relayer",
    deploymentStatus: "not-deployed",
    requiredChecks: ["quote-expiry", "quote-replay-rejection", "submission-idempotency"],
    requiredEndpoints: ["/health", "/v1/claims/quote", "/v1/claims/submit"],
    requiredEnv: [
      "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL",
      "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
      "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET",
    ],
    securityRequirements: commonSecurityRequirements,
  },
  {
    id: "prover",
    label: "Private Pool v2 Prover",
    deploymentStatus: "not-deployed",
    requiredChecks: ["verifying-key-match", "public-input-binding", "proof-artifact-reproducibility"],
    requiredEndpoints: ["/health", "/v1/proofs", "/v1/proofs/health", "/v1/proofs/verify"],
    requiredEnv: [
      "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
      "VANTA_PRIVATE_POOL_V2_PROVER_ARTIFACT_PATH",
      "VANTA_PRIVATE_POOL_V2_PROVER_WORKER_COUNT",
    ],
    securityRequirements: commonSecurityRequirements,
  },
  {
    id: "verifier",
    label: "Private Pool v2 Verifier Registry",
    deploymentStatus: "not-deployed",
    requiredChecks: ["proof-rejection", "receipt-idempotency", "verifier-key-registry"],
    requiredEndpoints: ["/health", "/v1/proofs/accept"],
    requiredEnv: [
      "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL",
      "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
      "VANTA_PRIVATE_POOL_V2_VERIFIER_KEYSET",
    ],
    securityRequirements: commonSecurityRequirements,
  },
  {
    id: "operator",
    label: "Vanta Operator Gateway",
    deploymentStatus: "not-deployed",
    requiredChecks: ["service-auth", "settlement-idempotency", "conflicting-replay-rejection"],
    requiredEndpoints: ["/health", "/state/private-pool-v2-status", "/private-pool-v2/protocol-settlements", "/private-pool-v2/pay-settlements"],
    requiredEnv: [
      "VANTA_PRIVATE_POOL_V2_DATABASE_URL",
      "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
      "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE",
    ],
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
      "Update durable deployment manifests, then deploy the checked indexer, relayer, prover, verifier, and operator service entrypoints with durable storage, secret-manager refs, and production smoke evidence.",
    productionReady: false,
    requiredVerificationCommands: [
      "npm run mainnet:service-contract-check",
      "npm run private-pool-v2:service-network-check",
      "npm run mainnet:readiness-check",
      "npm run private-pool-v2:verify",
    ],
    services,
  };
}
