export const VANTA_UNSHIELD_TRUST_CONTRACT_VERSION =
  "vanta-unshield-trust-contract-0.1" as const;

export type UnshieldTrustContract = {
  version: typeof VANTA_UNSHIELD_TRUST_CONTRACT_VERSION;
  currentTruth: "program-relay Unshield beta";
  currentReleaseModel: "program-tag-unshield-pda-cpi-fail-closed";
  claimControls: {
    fullyPrivateUnshieldClaim: false;
    liveProductionClaim: false;
    mainnetReady: false;
    productionPrivacyClaimsLocked: true;
  };
  custodyBoundary: {
    productionCustodyReady: false;
    programOwnedVaultReady: false;
    sourceOnlyVaultAuthorityPreflightReady: true;
    sourceOnlyVaultAssetRegistryReady: true;
    sourceOnlyVaultTokenAccountPreflightReady: true;
    sourceOnlyRootPreflightReady: true;
    sourceOnlyVerifierKeyPreflightReady: true;
    onchainUnshieldInstructionReady: false;
    tagUnshieldVaultAssetRegistryReleaseEnabled: false;
    programPdaCustodyRequired: true;
    operatorKeypairReleaseRemoved: true;
    // Native SOL TAG6 / program-owned SOL vault PDA + system CPI boundary (per design doc 2026-05-14-native-sol-private-pool-v2-integration.md §11 + status note Recommended Next Actions #7 + VANTA_ZK_REVIEW.md U2.1)
    nativeSolProgramOwnedVaultPdaReady: false;
    nativeSolSystemCpiReleaseReady: false;
    nativeSolAssetIdSentinel: string;
    nativeSolV2IndexerIngestionPath: string;
    blockerIds: readonly [
      "program-owned-vault-pda-not-deployed",
      "tag-unshield-reserved-fail-closed",
      "tag-unshield-token-cpi-release-not-wired",
      "native-sol-program-owned-vault-pda-not-deployed",
      "tag-unshield-sol-kind-not-wired",
    ];
    guardCommand: "npm run private-pool-v2:onchain-unshield-custody-check";
  };
  // Native SOL long-term TAG6 boundary (program-owned custody + on-chain proof verification target)
  nativeSolLongTermBoundary: {
    targetReleaseModel: "program-owned-sol-vault-pda-system-cpi";
    productionCustodyReadyForSol: false;
    description: string;
    blockers: readonly string[];
  };
  visibleStatusCopy: string;
  verificationSurfaces: readonly string[];
};

export function getUnshieldTrustContract(): UnshieldTrustContract {
  return {
    version: VANTA_UNSHIELD_TRUST_CONTRACT_VERSION,
    currentTruth: "program-relay Unshield beta",
    currentReleaseModel: "program-tag-unshield-pda-cpi-fail-closed",
    claimControls: {
      fullyPrivateUnshieldClaim: false,
      liveProductionClaim: false,
      mainnetReady: false,
      productionPrivacyClaimsLocked: true,
    },
    custodyBoundary: {
      productionCustodyReady: false,
      programOwnedVaultReady: false,
      sourceOnlyVaultAuthorityPreflightReady: true,
      sourceOnlyVaultAssetRegistryReady: true,
      sourceOnlyVaultTokenAccountPreflightReady: true,
      sourceOnlyRootPreflightReady: true,
      sourceOnlyVerifierKeyPreflightReady: true,
      onchainUnshieldInstructionReady: false,
      tagUnshieldVaultAssetRegistryReleaseEnabled: false,
    programPdaCustodyRequired: true,
    operatorKeypairReleaseRemoved: true,
    // Long-term native SOL TAG6 boundary (program-owned SOL vault PDA + system_program::transfer CPI in TAG_UNSHIELD; asset_id=fixed sentinel). See extended wiring plan U2-NS.
    nativeSolProgramOwnedVaultPdaReady: false,
    nativeSolSystemCpiReleaseReady: false,
    nativeSolAssetIdSentinel: "fixed-32-byte-sentinel (distinct from SPL poseidon(mint); used in v2 note commitments, PDA seeds, exit_asset_id)",
    nativeSolV2IndexerIngestionPath: "Phase 1: strict memo parsing (v1/v2) + on-chain transfer validation + appendCommitment to unified tree using sentinel (see native-sol-private-pool-v2-integration.md)",
      blockerIds: [
        "program-owned-vault-pda-not-deployed",
        "tag-unshield-reserved-fail-closed",
        "tag-unshield-token-cpi-release-not-wired",
        "native-sol-program-owned-vault-pda-not-deployed",
        "tag-unshield-sol-kind-not-wired",
      ],
      guardCommand: "npm run private-pool-v2:onchain-unshield-custody-check",
    },
    visibleStatusCopy:
      "Unshield currently uses program-tag-unshield-pda-cpi-fail-closed source behavior. The operator no longer performs keypair public exits, and the local TAG_UNSHIELD source ABI preflights root, root-record, verifier-key, nullifier, vault-authority, vault-asset registry, and token-account shape but remains fail-closed and cannot release funds; production custody is not enabled until a program-owned vault + on-chain TAG_UNSHIELD proof-verified release exists. For native SOL: long-term boundary is program-owned SOL vault PDA (lamports) + system_program CPI in TAG6 (fixed asset_id sentinel); SPL release target is transfer_checked from a vault token account whose authority is the vanta2vault PDA.",
    // Native SOL TAG6 long-term boundary (fail-closed red-first; authoritative per 2026-05-14-native-sol-private-pool-v2-integration.md + status note)
    nativeSolLongTermBoundary: {
      targetReleaseModel: "program-owned-sol-vault-pda-system-cpi",
      productionCustodyReadyForSol: false,
      description: "Native SOL: program-owned SOL vault PDA (seeds: [\"vanta2solvault\", pool_state, NATIVE_SOL_ASSET_ID_SENTINEL]) registered as VAULT_ASSET_KIND_SOL (=2). TAG_UNSHIELD=6 generalized accounts include system_program; CPI uses system_instruction::transfer (PDA-signed). exit_asset_id = sentinel. Unified tree + indexer snapshot compatible. No operator keypair funds movement. See design doc §11, VANTA_ZK_REVIEW U2.1, sentinel-in-snapshot / unshield-proof-request / tag6-wiring checks. 2026-05-14: test helper in lane-trust-worker/programs/.../lib.rs (SOL_VAULT_SEED :42, kind=2 :39, branch :1071, CPI :1122, tests :2363) + three checks PASS per regression; fail-closed test helper only until live per §12.",
      blockers: ["native-sol-program-owned-vault-pda-not-deployed", "tag-unshield-sol-kind-not-wired", "native-sol-sentinel-asset-id-not-indexed-in-v2-tree"],
    },
    verificationSurfaces: [
      "npm run private-core:check",
      "npm run private-core:verify",
      "npm run actions:memo-encryption-check",
      "npm run unshield:balance-ledger-check",
      "npm run private-pool-v2:onchain-unshield-custody-check",
      "npm run private-pool-v2:pda-vault-custody-check",
      "npm run truth:privacy-claim-gate",
    ],
  };
}
