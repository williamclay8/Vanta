import { createVantaProgrammaticProductionPrivacyContract } from "./programmaticProductionPrivacyContract.mjs";

export const VANTA_PROGRAMMATIC_PRIVACY_IMPLEMENTATION_LADDER_VERSION =
  "vanta-programmatic-privacy-implementation-ladder-0.1";

const tierWorkstreams = [
  {
    id: "tier-1-shared-cohort-ingest",
    tier: 1,
    title: "Shield → unified tree indexer ingest",
    status: "partially-implemented",
    moduleRef: "src/privacy/privatePoolV2SharedCohortShieldHandoff.ts",
    guardCommand: "npm run private-pool-v2:shared-cohort-shield-handoff-check",
    productionReady: false,
  },
  {
    id: "tier-1-on-chain-tree-append",
    tier: 1,
    title: "TAG_APPEND_TREE_LEAF client + operator submit path",
    status: "partially-implemented",
    moduleRef: "src/privacy/privatePoolV2SolanaAppendTreeLeafTransaction.mjs",
    guardCommand: "npm run private-pool-v2:solana-append-tree-leaf-transaction-check",
    productionReady: false,
  },
  {
    id: "tier-1-production-prover",
    tier: 1,
    title: "Production prover routing (remote > browser scaffold > explicit mock)",
    status: "partially-implemented",
    moduleRef: "src/privacy/privatePoolV2ProductionProverFactory.ts",
    guardCommand: "npm run private-pool-v2:production-prover-factory-check",
    productionReady: false,
  },
  {
    id: "tier-1-c01-verifier",
    tier: 1,
    title: "On-chain C01 verifier CPI acceptance",
    status: "partially-implemented",
    moduleRef: "programs/vanta_private_pool_v2_spend/src/lib.rs",
    guardCommand: "npm run private-pool-v2:c01-local-unsafe-verifier-cpi-acceptance-check",
    productionReady: false,
  },
  {
    id: "tier-2-vault-pda",
    tier: 2,
    title: "Program-owned vault PDA derivation + custody policy",
    status: "partially-implemented",
    moduleRef: "src/solana/vantaPrivatePoolV2VaultPdaDerivation.ts",
    guardCommand: "npm run private-pool-v2:vault-pda-derivation-check",
    productionReady: false,
  },
  {
    id: "tier-2-relayer-separation",
    tier: 2,
    title: "Production relayer separation review",
    status: "blocked",
    moduleRef: "ops/mainnet/private-pool-v2-relayer-separation.evidence.json",
    guardCommand: "npm run private-pool-v2:relayer-separation-evidence-check",
    productionReady: false,
  },
  {
    id: "tier-2-pay-customer-zk",
    tier: 2,
    title: "Pay customer-side ZK escrow binding scaffold",
    status: "partially-implemented",
    moduleRef: "src/pay/vantaPayCustomerSideZkEscrowBinding.ts",
    guardCommand: "npm run pay:customer-side-zk-escrow-binding-check",
    productionReady: false,
  },
  {
    id: "tier-3-forward-secret-keys",
    tier: 3,
    title: "Forward-secret viewing-key epoch scaffold",
    status: "scaffolded",
    moduleRef: "src/solana/vantaForwardSecretViewingKeyEpoch.ts",
    guardCommand: "npm run privacy:forward-secret-viewing-key-epoch-check",
    productionReady: false,
  },
  {
    id: "tier-3-association-sets",
    tier: 3,
    title: "Privacy Pools association-set policy scaffold",
    status: "scaffolded",
    moduleRef: "src/privacy/vantaPrivacyPoolsAssociationSetPolicy.ts",
    guardCommand: "npm run privacy:association-set-policy-check",
    productionReady: false,
  },
  {
    id: "tier-3-swap-internal-pricing",
    tier: 3,
    title: "Cross-asset swap privacy (internal pool pricing)",
    status: "blocked",
    moduleRef: "VANTA_ZK_REVIEW.md",
    guardCommand: "npm run swap:trust-packet-check",
    productionReady: false,
  },
];

export function createVantaProgrammaticPrivacyImplementationLadder() {
  const contract = createVantaProgrammaticProductionPrivacyContract();
  const tiers = [1, 2, 3].map((tier) => {
    const workstreams = tierWorkstreams.filter((entry) => entry.tier === tier);
    const productionReadyCount = workstreams.filter((entry) => entry.productionReady).length;
    return {
      tier,
      workstreams,
      productionReadyCount,
      productionReady: productionReadyCount === workstreams.length && workstreams.length > 0,
      status:
        productionReadyCount === 0
          ? "blocked-or-scaffolded"
          : productionReadyCount < workstreams.length
            ? "partially-implemented"
            : "production-ready",
    };
  });

  return {
    version: VANTA_PROGRAMMATIC_PRIVACY_IMPLEMENTATION_LADDER_VERSION,
    contractVersion: contract.version,
    productionPrivateReady: contract.productionPrivateReady,
    privacyClaimAllowed: contract.privacyClaimAllowed,
    mainnetReady: contract.mainnetReady,
    tiers,
    workstreams: tierWorkstreams,
    guardCommand: "npm run programmatic-privacy:implementation-ladder-check",
    truthBoundary:
      "Tier scaffolding advances typed boundaries and verification commands. It does not lift programmatic production-privacy claims without the contract's live evidence gates.",
  };
}
