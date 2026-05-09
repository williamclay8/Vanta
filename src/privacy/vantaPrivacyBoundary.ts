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
  | "private-pool-v2-send"
  | "private-pool-v2-swap"
  | "private-pool-v2-unshield"
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
  | "recipient-leaf-index"
  | "recipient-output-root"
  | "change-commitment"
  | "change-leaf-index"
  | "change-output-root"
  | "output-commitment"
  | "note-version"
  | "context-tag"
  | "shield-public-input-hash"
  | "source-mint"
  | "target-mint"
  | "target-asset"
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
  | "asset-commitment"
  | "economics-commitment"
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

const privateUnshieldBlockers = [
  "atomic nullifier registration and private exit settlement mutation",
  "relayer-separated exit execution",
  "safe private-exit logging and receipt redaction",
  ...hiddenEconomicTermBlockers,
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
      "raw source mint",
      "raw target mint",
      "raw target asset",
      "raw amount",
      "economics blinding",
      "private-output-note-material",
      "route-witness-material",
    ],
    lane: "private-pool-v2-shield",
    laneLabel: "Private Pool v2 Shield",
    publicDisclosure: ["shield-public-input-hash"],
    publicRequestDisclosure: [
      "economics-commitment",
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
      "Private Pool v2 Shield binds raw source/target asset and amount to an economics commitment at the local proof boundary; anonymity, deployment, route privacy, and audit gates remain blocked.",
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
  {
    blockersToHiddenEconomicTerms: [
      "production-deployed live private-send transition evidence",
      "recipient encrypted-note discovery",
      ...hiddenEconomicTermBlockers,
    ],
    contractVersion: VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION,
    hiddenWitnessMaterial: [
      "send-witness-secret",
      "private-membership-path",
      "raw asset",
      "raw amount",
      "raw recipient",
      "private recipient note material",
      "private change note material",
    ],
    lane: "private-pool-v2-send",
    laneLabel: "Private Pool v2 Send",
    publicDisclosure: [
      "state-root",
      "input-commitment",
      "nullifier",
      "recipient-commitment",
      "recipient-leaf-index",
      "recipient-output-root",
      "change-commitment",
      "change-leaf-index",
      "change-output-root",
      "asset-commitment",
      "economics-commitment",
      "owner-commitment",
      "context-tag",
    ],
    publicRequestDisclosure: [
      "state-root",
      "input-commitment",
      "nullifier",
      "recipient-commitment",
      "recipient-leaf-index",
      "recipient-output-root",
      "change-commitment",
      "change-leaf-index",
      "change-output-root",
      "asset-commitment",
      "economics-commitment",
      "owner-commitment",
      "context-tag",
    ],
    tier: "v1.5-hash-bound-public-request-terms",
    truthLabel:
      "Private Pool v2 Send has a local proof-request/circuit boundary plus checked local verifier/indexer mutation; recipient discovery, deployed enforcement, and production privacy remain blocked.",
  },
  {
    blockersToHiddenEconomicTerms: [
      "quote and route privacy before operator settlement",
      ...hiddenEconomicTermBlockers,
    ],
    contractVersion: VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION,
    hiddenWitnessMaterial: [
      "swap-witness-secret",
      "private-membership-path",
      "raw input asset",
      "raw output asset",
      "raw input amount",
      "raw output amount",
      "private route terms",
      "private output note material",
    ],
    lane: "private-pool-v2-swap",
    laneLabel: "Private Pool v2 Swap",
    publicDisclosure: [
      "state-root",
      "input-commitment",
      "nullifier",
      "output-commitment",
      "route-commitment",
      "economics-commitment",
      "owner-commitment",
      "context-tag",
    ],
    publicRequestDisclosure: [
      "state-root",
      "input-commitment",
      "nullifier",
      "output-commitment",
      "route-commitment",
      "economics-commitment",
      "owner-commitment",
      "context-tag",
    ],
    tier: "v1.5-hash-bound-public-request-terms",
    truthLabel:
      "Private Pool v2 Swap has a local proof-request boundary and circuit fixture plus checked local verifier/indexer mutation without raw input/output asset or amount disclosure at that typed layer; quote privacy, live venue privacy, and production privacy remain blocked.",
  },
  {
    blockersToHiddenEconomicTerms: privateUnshieldBlockers,
    contractVersion: VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION,
    hiddenWitnessMaterial: [
      "claim-witness-secret",
      "private-membership-path",
      "raw release destination",
      "raw asset",
      "raw amount",
      "private relayer quote terms",
    ],
    lane: "private-pool-v2-unshield",
    laneLabel: "Private Pool v2 Unshield",
    publicDisclosure: [
      "state-root",
      "input-commitment",
      "nullifier",
      "route-commitment",
      "economics-commitment",
      "owner-commitment",
      "context-tag",
    ],
    publicRequestDisclosure: [
      "state-root",
      "input-commitment",
      "nullifier",
      "route-commitment",
      "economics-commitment",
      "owner-commitment",
      "context-tag",
    ],
    tier: "v1.5-hash-bound-public-request-terms",
    truthLabel:
      "Private Pool v2 Unshield has a local proof-request boundary plus committed operator/protocol acceptance without raw destination, asset, or amount on that path; atomic exit mutation, relayer separation, and production privacy remain blocked.",
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
