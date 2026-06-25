import {
  ingestVantaPrivatePoolV2NativeSolShieldDeposit,
  resolveVantaPrivatePoolV2IndexerBaseUrl,
  VANTA_PRIVATE_POOL_V2_INDEXER_CLIENT_VERSION,
  VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID,
} from "./privatePoolV2IndexerClient";

export const VANTA_PRIVATE_POOL_V2_SHARED_COHORT_SHIELD_HANDOFF_VERSION =
  "vanta-private-pool-v2-shared-cohort-shield-handoff-0.1" as const;

export type VantaPrivatePoolV2SharedCohortShieldHandoffRequest = {
  amount: string;
  commitment: string;
  depositMemo: string;
  depositSignature: string;
  indexerBaseUrl?: string | null;
  owner: string;
  treeId?: string;
  vaultOwner: string;
};

export type VantaPrivatePoolV2SharedCohortShieldHandoffResult = {
  error?: string;
  indexerBaseUrl?: string;
  isTransientNetworkError?: boolean;
  onChainAppendRequested: boolean;
  phase: "indexer-ingest" | "indexer-ingest-skipped";
  responseStatus?: number;
  success: boolean;
  version: typeof VANTA_PRIVATE_POOL_V2_SHARED_COHORT_SHIELD_HANDOFF_VERSION;
};

function readViteEnv(name: string): string | null {
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  const value = meta.env?.[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function isVantaPrivatePoolV2OnChainTreeAppendEnabled() {
  const flag = readViteEnv("VITE_VANTA_PRIVATE_POOL_V2_ON_CHAIN_TREE_APPEND_ENABLED");
  return flag === "1" || flag === "true";
}

export function getVantaPrivatePoolV2SharedCohortShieldHandoffPolicy() {
  return {
    version: VANTA_PRIVATE_POOL_V2_SHARED_COHORT_SHIELD_HANDOFF_VERSION,
    indexerClientVersion: VANTA_PRIVATE_POOL_V2_INDEXER_CLIENT_VERSION,
    unifiedTreeId: VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID,
    productionSharedCohortReady: false,
    onChainTreeAppendClientEnabled: isVantaPrivatePoolV2OnChainTreeAppendEnabled(),
    onChainTreeAppendProductionReady: false,
    privacyClaimAllowed: false,
    truthBoundary:
      "Indexer ingest appends commitments to the unified Private Pool v2 tree snapshot. On-chain TAG_APPEND_TREE_LEAF remains operator/relayer-submitted and is not production-ready until live spend-program lineage and reviewed settlement evidence exist.",
    ingestionEndpoint: "POST /v1/ingest-native-sol-shield-deposit",
    guardCommand: "npm run private-pool-v2:shared-cohort-shield-handoff-check",
  };
}

/**
 * Phase 2 shared-cohort handoff: submit sentinel-based native SOL shield deposits to the
 * Private Pool v2 indexer unified tree. Non-blocking callers may fire-and-forget this helper.
 * On-chain append-tree-leaf submission remains operator-side until Tier 0 live settlement lands.
 */
export async function submitVantaPrivatePoolV2SharedCohortShieldHandoff(
  request: VantaPrivatePoolV2SharedCohortShieldHandoffRequest,
): Promise<VantaPrivatePoolV2SharedCohortShieldHandoffResult> {
  const indexerBaseUrl = resolveVantaPrivatePoolV2IndexerBaseUrl(request.indexerBaseUrl);
  if (!indexerBaseUrl) {
    return {
      success: false,
      error: "Private Pool v2 indexer base URL is not configured.",
      onChainAppendRequested: false,
      phase: "indexer-ingest-skipped",
      version: VANTA_PRIVATE_POOL_V2_SHARED_COHORT_SHIELD_HANDOFF_VERSION,
    };
  }

  const ingest = await ingestVantaPrivatePoolV2NativeSolShieldDeposit({
    amount: request.amount,
    commitment: request.commitment,
    depositMemo: request.depositMemo,
    depositSignature: request.depositSignature,
    indexerBaseUrl,
    owner: request.owner,
    treeId: request.treeId,
    vaultOwner: request.vaultOwner,
  });

  const onChainAppendRequested =
    ingest.success && isVantaPrivatePoolV2OnChainTreeAppendEnabled();

  return {
    success: ingest.success,
    error: ingest.error,
    indexerBaseUrl: ingest.indexerBaseUrl,
    isTransientNetworkError: ingest.isTransientNetworkError,
    onChainAppendRequested,
    phase: ingest.success ? "indexer-ingest" : "indexer-ingest-skipped",
    responseStatus: ingest.responseStatus,
    version: VANTA_PRIVATE_POOL_V2_SHARED_COHORT_SHIELD_HANDOFF_VERSION,
  };
}
