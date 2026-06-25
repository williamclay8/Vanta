export const VANTA_PRIVACY_POOLS_ASSOCIATION_SET_POLICY_VERSION =
  "vanta-privacy-pools-association-set-policy-0.1" as const;

export type VantaPrivacyPoolsAssociationSetStatus = "blocked" | "scaffolded";

export type VantaPrivacyPoolsAssociationSetPolicy = {
  version: typeof VANTA_PRIVACY_POOLS_ASSOCIATION_SET_POLICY_VERSION;
  associationSetReady: false;
  privacyClaimAllowed: false;
  merchantCounterpartyReady: false;
  status: VantaPrivacyPoolsAssociationSetStatus;
  guardCommand: "npm run privacy:association-set-policy-check";
  truthBoundary: string;
  requiredEvidenceRefs: readonly string[];
};

export function getVantaPrivacyPoolsAssociationSetPolicy(): VantaPrivacyPoolsAssociationSetPolicy {
  return {
    version: VANTA_PRIVACY_POOLS_ASSOCIATION_SET_POLICY_VERSION,
    associationSetReady: false,
    privacyClaimAllowed: false,
    merchantCounterpartyReady: false,
    status: "scaffolded",
    guardCommand: "npm run privacy:association-set-policy-check",
    truthBoundary:
      "Privacy Pools-style association-set membership proofs are not integrated. Merchant and exchange counterparties cannot yet verify deposit provenance membership without revealing account graphs.",
    requiredEvidenceRefs: [
      "zk/noir/vanta_clean_provenance_disclosure/README.md",
      "docs/zk/phase2-june16-research-circuit-specs.md",
      "npm run privacy:association-set-policy-check",
    ],
  };
}
