const rails = [
  {
    id: "alpha-public-warning",
    label: "Mainnet Alpha Warning Rail",
    mode: "mainnet-alpha",
    canClaimMeaningfulPrivacy: false,
    currentEvidenceRefs: [
      "docs/security-limitations.md",
      "npm run mainnet:readiness-check",
      "npm run privacy-rail:contract-check",
    ],
    requiredEvidence: [
      "VANTA_MAINNET_ALPHA_WARNING_COPY_REF",
      "VANTA_WALLET_SELF_CUSTODY_APPROVAL_REF",
      "VANTA_NO_PRIVACY_CLAIM_DISCLOSURE_REF",
    ],
    blockers: [
      "no real privacy rail selected",
      "public wallet submission can leak wallet, timing, amount, asset, and destination metadata",
      "no deployed shared anonymity set",
    ],
  },
  {
    id: "umbra-mainnet",
    label: "Umbra Mainnet Rail",
    mode: "external-privacy-rail",
    canClaimMeaningfulPrivacy: false,
    currentEvidenceRefs: [
      "npm run mainnet:wallet-signing-status",
      "npm run mainnet:wallet-signing-evidence-check",
      "docs/privacy-rail-contract.md",
    ],
    requiredEvidence: [
      "VANTA_UMBRA_MAINNET_CAPABILITY_REF",
      "VANTA_UMBRA_SUPPORTED_ASSET_REF",
      "VANTA_UMBRA_WALLET_SIGNING_EVIDENCE_REF",
      "VANTA_UMBRA_PRIVACY_LIMITATIONS_REF",
    ],
    blockers: [
      "Umbra mainnet support has not been proven through Vanta wallet flows",
      "supported asset and mixer/ETA route evidence is not filled",
      "privacy limitations must be disclosed before user-facing claims",
    ],
  },
  {
    id: "vanta-private-pool-v2",
    label: "Vanta Private Pool v2 Rail",
    mode: "vanta-operated-private-pool",
    canClaimMeaningfulPrivacy: false,
    currentEvidenceRefs: [
      "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
      "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json",
      "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
      "ops/mainnet/private-pool-v2-route-health.evidence.json",
      "ops/mainnet/service-deployment.evidence.json",
    ],
    requiredEvidence: [
      "VANTA_PRIVATE_POOL_V2_PRODUCTION_SMOKE_EVIDENCE_REF",
      "VANTA_PRIVATE_POOL_V2_AUDIT_REF",
      "VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF",
      "VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF",
      "VANTA_PRIVATE_POOL_V2_NULLIFIER_ENFORCEMENT_REF",
    ],
    blockers: [
      "production services have only no-real-funds smoke evidence",
      "shared anonymity set is not proven",
      "third-party audit and nullifier enforcement evidence are not complete",
    ],
  },
];

export function createVantaPrivacyRailContract(options = {}) {
  const activeRailId = options.activeRailId ?? "alpha-public-warning";
  const activeRail = rails.find((rail) => rail.id === activeRailId);

  if (!activeRail) {
    throw new Error(`Unknown Vanta privacy rail: ${activeRailId}`);
  }

  return {
    version: "vanta-privacy-rail-contract-0.1",
    activeRail,
    activeRailId,
    mainnetReady: false,
    meaningfulPrivacyReady: false,
    productionReady: false,
    rails,
    requiredVerificationCommands: [
      "npm run privacy-rail:contract-check",
      "npm run mainnet:wallet-signing-evidence-check",
      "npm run mainnet:nullifier-replay-evidence-check",
      "npm run mainnet:private-rail-route-health-evidence-check",
      "npm run mainnet:production-smoke-evidence-check",
      "npm run security:limitations-check",
      "npm run mainnet:preflight",
    ],
    userFacingRule:
      "Do not claim meaningful privacy unless the selected rail has live mainnet evidence, relayer separation, nullifier/replay enforcement, safe logging, and reviewed limitations.",
  };
}

export function createVantaPrivacyClaimDecision({ activeRailId, requestedClaim }) {
  const contract = createVantaPrivacyRailContract({ activeRailId });
  const allowed = contract.activeRail.canClaimMeaningfulPrivacy === true;
  const alphaCopy =
    "Vanta is running in experimental mainnet alpha mode. Do not treat this transaction as meaningfully private.";
  const blockedCopy =
    "This privacy rail is not ready to claim private transactions. Continue only with the documented limitations.";

  return {
    activeRailId: contract.activeRailId,
    allowed,
    blockers: allowed ? [] : contract.activeRail.blockers,
    requestedClaim,
    requiredEvidence: contract.activeRail.requiredEvidence,
    userFacingCopy: contract.activeRailId === "alpha-public-warning" ? alphaCopy : blockedCopy,
  };
}
