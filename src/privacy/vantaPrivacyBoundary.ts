export const VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION =
  "vanta-privacy-boundary-contract-0.1" as const;

export type VantaPrivacyTier =
  | "v1-public-economic-terms"
  | "v1.5-hash-bound-public-request-terms"
  | "v2-hidden-economic-terms";

export type VantaPrivacyLane =
  | "private-core-send"
  | "private-core-swap"
  | "private-core-unshield"
  | "private-pool-v2-shield"
  | "private-pool-v2-claim";

export type VantaPrivacyDisclosureField =
  | "state-root"
  | "nullifier"
  | "asset"
  | "amount"
  | "change-amount"
  | "input-asset"
  | "output-asset"
  | "input-amount"
  | "output-amount"
  | "release-destination"
  | "recipient-commitment"
  | "change-commitment"
  | "output-commitment"
  | "note-version"
  | "context-tag"
  | "source-mint"
  | "target-mint"
  | "owner-commitment"
  | "route-commitment"
  | "tree-id"
  | "leaf-index"
  | "input-commitment"
  | "output-root"
  | "previous-root"
  | "relayer"
  | "relayer-fee"
  | "quote-expiry"
  | "economic-terms-hash";

export type VantaPrivacyBoundaryDescriptor = {
  blockersToHiddenEconomicTerms: readonly string[];
  contractVersion: typeof VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION;
  hiddenWitnessMaterial: readonly string[];
  lane: VantaPrivacyLane;
  laneLabel: string;
  publicDisclosure: readonly VantaPrivacyDisclosureField[];
  publicRequestDisclosure: readonly VantaPrivacyDisclosureField[];
  tier: VantaPrivacyTier;
  truthLabel: string;
};

const noteWitnessMaterial = [
  "note-secret",
  "blinding",
  "owner-secret-key",
  "private-merkle-path",
  "encrypted-note-payload",
] as const;

const hiddenEconomicTermBlockers = [
  "hidden asset and amount commitments",
  "multi-asset conservation circuit",
  "production root history and nullifier set",
  "relayer-separated execution",
  "audited prover/verifier key boundary",
] as const;

export const VANTA_PRIVACY_BOUNDARY_DESCRIPTORS = [
  {
    blockersToHiddenEconomicTerms: hiddenEconomicTermBlockers,
    contractVersion: VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION,
    hiddenWitnessMaterial: noteWitnessMaterial,
    lane: "private-core-send",
    laneLabel: "Private Core Send",
    publicDisclosure: [
      "state-root",
      "nullifier",
      "recipient-commitment",
      "change-commitment",
      "economic-terms-hash",
      "note-version",
      "context-tag",
    ],
    publicRequestDisclosure: ["asset", "amount", "change-amount"],
    tier: "v1.5-hash-bound-public-request-terms",
    truthLabel:
      "Private Core Send hides note witness material and exposes a public economic-terms hash instead of raw asset and amounts.",
  },
  {
    blockersToHiddenEconomicTerms: hiddenEconomicTermBlockers,
    contractVersion: VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION,
    hiddenWitnessMaterial: noteWitnessMaterial,
    lane: "private-core-swap",
    laneLabel: "Private Core Swap",
    publicDisclosure: [
      "state-root",
      "nullifier",
      "output-commitment",
      "economic-terms-hash",
      "note-version",
      "context-tag",
    ],
    publicRequestDisclosure: ["input-asset", "output-asset", "input-amount", "output-amount"],
    tier: "v1.5-hash-bound-public-request-terms",
    truthLabel:
      "Private Core Swap hides note witness material and exposes a public economic-terms hash instead of raw pair and amounts.",
  },
  {
    blockersToHiddenEconomicTerms: hiddenEconomicTermBlockers,
    contractVersion: VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION,
    hiddenWitnessMaterial: noteWitnessMaterial,
    lane: "private-core-unshield",
    laneLabel: "Private Core Unshield",
    publicDisclosure: [
      "state-root",
      "nullifier",
      "economic-terms-hash",
      "note-version",
      "context-tag",
    ],
    publicRequestDisclosure: ["release-destination", "asset", "amount"],
    tier: "v1.5-hash-bound-public-request-terms",
    truthLabel:
      "Private Core Unshield hides note witness material and exposes a public economic-terms hash instead of raw destination, asset, and amount at the proof boundary.",
  },
  {
    blockersToHiddenEconomicTerms: hiddenEconomicTermBlockers,
    contractVersion: VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION,
    hiddenWitnessMaterial: [
      "shield-witness-secret",
      "private-output-note-material",
      "route-witness-material",
    ],
    lane: "private-pool-v2-shield",
    laneLabel: "Private Pool v2 Shield",
    publicDisclosure: ["context-tag"],
    publicRequestDisclosure: [
      "source-mint",
      "target-mint",
      "asset",
      "amount",
      "owner-commitment",
      "route-commitment",
      "tree-id",
      "leaf-index",
      "output-commitment",
      "previous-root",
      "output-root",
    ],
    tier: "v1.5-hash-bound-public-request-terms",
    truthLabel:
      "Private Pool v2 Shield hash-binds public request terms in-circuit; the request/operator layer still sees them.",
  },
  {
    blockersToHiddenEconomicTerms: hiddenEconomicTermBlockers,
    contractVersion: VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION,
    hiddenWitnessMaterial: ["claim-witness-secret", "private-membership-path"],
    lane: "private-pool-v2-claim",
    laneLabel: "Private Pool v2 Claim",
    publicDisclosure: ["context-tag"],
    publicRequestDisclosure: [
      "asset",
      "amount",
      "owner-commitment",
      "tree-id",
      "leaf-index",
      "input-commitment",
      "state-root",
      "nullifier",
      "release-destination",
      "relayer",
      "relayer-fee",
      "quote-expiry",
    ],
    tier: "v1.5-hash-bound-public-request-terms",
    truthLabel:
      "Private Pool v2 Claim hash-binds public request terms in-circuit; the request/operator layer still sees them.",
  },
] as const satisfies readonly VantaPrivacyBoundaryDescriptor[];

export function listVantaPrivacyBoundaryDescriptors() {
  return VANTA_PRIVACY_BOUNDARY_DESCRIPTORS;
}

export function getVantaPrivacyBoundaryDescriptor(lane: VantaPrivacyLane) {
  const descriptor = VANTA_PRIVACY_BOUNDARY_DESCRIPTORS.find(
    (candidate) => candidate.lane === lane,
  );

  if (!descriptor) {
    throw new Error(`Unknown Vanta privacy lane: ${lane}`);
  }

  return descriptor;
}

export function laneHidesEconomicTerms(lane: VantaPrivacyLane) {
  const tier = getVantaPrivacyBoundaryDescriptor(lane).tier as VantaPrivacyTier;
  return tier === "v2-hidden-economic-terms";
}
