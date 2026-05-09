import {
  VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
  type VantaPrivatePoolV2Protocol,
} from "./privatePoolV2Types";
import { planShieldRoute } from "./privacyRoutePlanner";
import {
  VANTA_PRIVATE_POOL_V2_BENCHMARK_ASSETS,
  createVantaPrivatePoolV2PrivacyAdapter,
  getVantaPrivatePoolV2CapabilityProfile,
  getVantaPrivatePoolV2Readiness,
} from "./privatePoolV2CapabilityProfile";
import { createVantaPrivatePoolV2MockRuntime } from "./privatePoolV2MockRuntime";
import { createVantaPrivatePoolV2ShieldProofRequest } from "./privatePoolV2ProofRequests";

export function getVantaPrivatePoolV2BenchmarkSnapshot() {
  const profile = getVantaPrivatePoolV2CapabilityProfile();
  const readiness = getVantaPrivatePoolV2Readiness();
  const adapter = createVantaPrivatePoolV2PrivacyAdapter();
  const mockRuntime = createVantaPrivatePoolV2MockRuntime();
  const benchmarkAsset = VANTA_PRIVATE_POOL_V2_BENCHMARK_ASSETS[0]!;
  const benchmarkCommitment = mockRuntime.indexer
    ? {
        assetId: benchmarkAsset.mintAddress,
        commitment: "0xbenchmark-shield-output-commitment",
        leafIndex: 0,
        merkleRoot: "0xbenchmark-shield-root",
        treeId: "vanta-private-pool-v2-benchmark-tree",
      }
    : null;
  const shieldProofRequest = benchmarkCommitment
    ? createVantaPrivatePoolV2ShieldProofRequest({
        amountBaseUnits: 1n,
        economicsCommitment: "0xbenchmark-shield-economics-commitment",
        ownerCommitment: "0xbenchmark-owner-commitment",
        sourceMintAddress: benchmarkAsset.mintAddress,
        targetAssetId: benchmarkAsset.mintAddress,
        targetMintAddress: benchmarkAsset.mintAddress,
        treeCommitment: benchmarkCommitment,
      })
    : null;

  const protocolContract = {
    assets: VANTA_PRIVATE_POOL_V2_BENCHMARK_ASSETS,
    contractVersion: VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
    indexer: null,
    infrastructure: profile.infrastructure,
    network: profile.network,
    prover: null,
    readiness: getVantaPrivatePoolV2Readiness,
    relayer: null,
  } satisfies VantaPrivatePoolV2Protocol;

  return {
    benchmark: "vanta-private-pool-v2-option-b-benchmark",
    contractVersion: VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
    nextBestStep:
      "Implement local mock indexer/relayer/prover adapters against this contract, then replace each mock with production-backed services without changing the app UX.",
    profile,
    protocolContract: {
      assets: protocolContract.assets,
      contractVersion: protocolContract.contractVersion,
      infrastructure: protocolContract.infrastructure,
      network: protocolContract.network,
      readiness: protocolContract.readiness(),
    },
    readiness,
    shieldProofRequest,
    mockRuntime: {
      contractVersion: mockRuntime.contractVersion,
      readiness: mockRuntime.readiness(),
      warning:
        "Mock runtime is only the first replaceable Option B harness; production privacy still requires real tree, nullifier, prover, and relayer services.",
    },
    routeSamples: profile.assets.map((asset) =>
      adapter.assessRoute({
        amountBaseUnits: 1n,
        fromMintAddress: asset.mintAddress,
        network: profile.network,
        toMintAddress: asset.mintAddress,
      }),
    ),
    shieldPlannerSamples: profile.assets.map((asset) =>
      planShieldRoute({
        amountBaseUnits: 1n,
        fromMintAddress: asset.mintAddress,
        network: profile.network,
        preferPrivatePoolV2: true,
        toMintAddress: asset.mintAddress,
      }),
    ),
  };
}
