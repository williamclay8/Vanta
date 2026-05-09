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
    deploymentStatus: "deployed-render-verified-pending-controls",
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
    deploymentStatus: "deployed-render-verified-pending-controls",
    requiredChecks: ["quote-expiry", "quote-replay-rejection", "submission-idempotency"],
    requiredEndpoints: ["/health", "/v1/claims/quote", "/v1/claims/submit"],
    requiredEnv: [
      "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL",
      "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
      "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET",
      "VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL",
      "VANTA_PRIVATE_POOL_V2_RELAYER_SOLANA_SUBMISSION_MODE",
      "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_PAYER_KEYPAIR_JSON",
      "VANTA_PRIVATE_POOL_V2_RELAYER_SOLANA_SUBMIT_ACK",
      "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID",
      "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE",
      "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET",
      "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE",
      "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY",
    ],
    securityRequirements: commonSecurityRequirements,
  },
  {
    id: "prover",
    label: "Private Pool v2 Prover",
    deploymentStatus: "deployed-render-verified-pending-controls",
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
    deploymentStatus: "deployed-render-verified-pending-controls",
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
    deploymentStatus: "deployed-render-verified-pending-controls",
    requiredChecks: ["service-auth", "settlement-idempotency", "conflicting-replay-rejection"],
    requiredEndpoints: ["/health", "/state/private-pool-v2-status", "/private-pool-v2/protocol-settlements"],
    requiredEnv: [
      "VANTA_PRIVATE_POOL_V2_DATABASE_URL",
      "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
      "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE",
      "VANTA_PRIVATE_POOL_V2_REQUIRE_RELAYER_SERIALIZED_TRANSACTION",
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
      "Keep the deployed Render production role services verified with durable storage, authenticated readiness, fresh smoke evidence, and truthful non-ready operator surfaces.",
    productionReady: false,
    requiredVerificationCommands: [
      "npm run mainnet:service-contract-check",
      "npm run mainnet:service-deployment-status",
      "npm run mainnet:service-deployment-evidence-check",
      "npm run mainnet:role-service-replay-status",
      "npm run mainnet:role-service-replay-evidence-check",
      "npm run private-pool-v2:service-network-check",
      "npm run mainnet:readiness-check",
      "npm run private-pool-v2:verify",
    ],
    services,
  };
}
