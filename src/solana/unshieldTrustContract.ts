export const VANTA_UNSHIELD_TRUST_CONTRACT_VERSION =
  "vanta-unshield-trust-contract-0.1" as const;

export type UnshieldTrustContract = {
  version: typeof VANTA_UNSHIELD_TRUST_CONTRACT_VERSION;
  currentTruth: "operator-release Unshield beta";
  currentReleaseModel: "operator-keypair-public-exit";
  claimControls: {
    fullyPrivateUnshieldClaim: false;
    liveProductionClaim: false;
    mainnetReady: false;
    productionPrivacyClaimsLocked: true;
  };
  custodyBoundary: {
    productionCustodyReady: false;
    programOwnedVaultReady: false;
    onchainUnshieldInstructionReady: false;
    blockerIds: readonly [
      "program-owned-vault-pda-not-deployed",
      "tag-unshield-not-implemented",
    ];
    guardCommand: "npm run private-pool-v2:onchain-unshield-custody-check";
  };
  visibleStatusCopy: string;
  verificationSurfaces: readonly string[];
};

export function getUnshieldTrustContract(): UnshieldTrustContract {
  return {
    version: VANTA_UNSHIELD_TRUST_CONTRACT_VERSION,
    currentTruth: "operator-release Unshield beta",
    currentReleaseModel: "operator-keypair-public-exit",
    claimControls: {
      fullyPrivateUnshieldClaim: false,
      liveProductionClaim: false,
      mainnetReady: false,
      productionPrivacyClaimsLocked: true,
    },
    custodyBoundary: {
      productionCustodyReady: false,
      programOwnedVaultReady: false,
      onchainUnshieldInstructionReady: false,
      blockerIds: [
        "program-owned-vault-pda-not-deployed",
        "tag-unshield-not-implemented",
      ],
      guardCommand: "npm run private-pool-v2:onchain-unshield-custody-check",
    },
    visibleStatusCopy:
      "Unshield currently uses an operator-keypair public exit. Production custody claims stay locked until a program-owned vault + on-chain TAG_UNSHIELD proof-verified release exists.",
    verificationSurfaces: [
      "npm run private-core:check",
      "npm run private-core:verify",
      "npm run actions:memo-encryption-check",
      "npm run unshield:balance-ledger-check",
      "npm run private-pool-v2:onchain-unshield-custody-check",
      "npm run truth:privacy-claim-gate",
    ],
  };
}
