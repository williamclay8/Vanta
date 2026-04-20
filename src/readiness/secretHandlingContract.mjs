const forbiddenValues = [
  "private-key",
  "seed-phrase",
  "keypair-file",
  "raw-secret-value",
  "rpc-credential-value",
];

const sharedRotationRequirements = [
  "rotation-runbook-required",
  "emergency-revocation-required",
  "last-rotated-at-tracked",
  "owner-team-tracked",
  "least-privilege-access",
];

const scopes = [
  {
    id: "pay",
    label: "Vanta Pay",
    status: "contracted-not-provisioned",
    allowedSecretRefs: [
      "VANTA_PAY_SECRET_KEY_REF",
      "VANTA_PAY_WEBHOOK_SECRET_REF",
      "VANTA_PAY_DATABASE_URL_REF",
      "VANTA_PAY_PRIVATE_POOL_OPERATOR_TOKEN_REF",
    ],
    forbiddenValues,
    rotationRequirements: sharedRotationRequirements,
  },
  {
    id: "privatePoolV2",
    label: "Private Pool v2",
    status: "contracted-not-provisioned",
    allowedSecretRefs: [
      "VANTA_PRIVATE_POOL_V2_OPERATOR_TOKEN_REF",
      "VANTA_PRIVATE_POOL_V2_DATABASE_URL_REF",
      "VANTA_PRIVATE_POOL_V2_PROVER_ARTIFACT_REF",
      "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET_REF",
    ],
    forbiddenValues,
    rotationRequirements: sharedRotationRequirements,
  },
  {
    id: "strategy",
    label: "Strategy",
    status: "contracted-not-provisioned",
    allowedSecretRefs: [
      "VANTA_STRATEGY_DATABASE_URL_REF",
      "VANTA_STRATEGY_JUPITER_API_KEY_REF",
      "VANTA_STRATEGY_JITO_AUTH_TOKEN_REF",
      "VANTA_STRATEGY_OPERATOR_TOKEN_REF",
    ],
    forbiddenValues,
    rotationRequirements: sharedRotationRequirements,
  },
  {
    id: "operator",
    label: "Operator Control Plane",
    status: "contracted-not-provisioned",
    allowedSecretRefs: [
      "VANTA_OPERATOR_DATABASE_URL_REF",
      "VANTA_OPERATOR_AUTH_TOKEN_REF",
      "VANTA_OPERATOR_OBSERVABILITY_TOKEN_REF",
      "VANTA_OPERATOR_INCIDENT_WEBHOOK_REF",
    ],
    forbiddenValues,
    rotationRequirements: sharedRotationRequirements,
  },
  {
    id: "wallet",
    label: "Browser Wallet Boundary",
    status: "contracted-not-provisioned",
    allowedSecretRefs: ["none-browser-wallet-signing-only"],
    forbiddenValues,
    rotationRequirements: ["no-server-wallet-custody", "no-private-key-ingestion", "wallet-standard-only"],
  },
];

const globalRequirements = [
  "secret-manager-required",
  "least-privilege-service-identities",
  "no-secrets-in-repo",
  "no-secrets-in-client-bundles",
  "names-only-in-manifests",
  "rotation-runbook-required",
  "incident-revocation-required",
  "audit-log-secret-access",
  "break-glass-access-reviewed",
  "production-env-values-provisioned-outside-git",
];

export function createVantaSecretHandlingContract() {
  return {
    version: "vanta-secret-handling-contract-0.1",
    secretReferenceManifestPath: "ops/mainnet/secret-references.manifest.json",
    globalRequirements,
    mainnetReady: false,
    nextImplementationStep:
      "Provision a real production secret manager, map every manifest ref to that manager, and keep staging Render env vars as staging-only references.",
    privateKeyHandling: "never-request-store-or-load-private-keys",
    productionReady: false,
    requiredVerificationCommands: [
      "npm run mainnet:secret-handling-check",
      "npm run mainnet:preflight",
      "npm run wallet:signing-safety-check",
    ],
    scopes,
  };
}
