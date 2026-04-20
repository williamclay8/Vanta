import {
  VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
  type VantaPrivatePoolV2Commitment,
  type VantaPrivatePoolV2Nullifier,
  type VantaPrivatePoolV2Protocol,
} from "./privatePoolV2Types";
import {
  VANTA_PRIVATE_POOL_V2_BENCHMARK_ASSETS,
  getVantaPrivatePoolV2CapabilityProfile,
} from "./privatePoolV2CapabilityProfile";
import { createVantaPrivatePoolV2LocalIndexer } from "./privatePoolV2LocalIndexer";
import { createVantaPrivatePoolV2LocalProver } from "./privatePoolV2LocalProver";
import { createVantaPrivatePoolV2LocalRelayer } from "./privatePoolV2LocalRelayer";
import {
  createVantaPrivatePoolV2LocalVerifierRegistry,
  type VantaPrivatePoolV2ProofReceipt,
} from "./privatePoolV2LocalVerifierRegistry";

export type VantaPrivatePoolV2MockRuntimeArgs = {
  commitments?: readonly VantaPrivatePoolV2Commitment[];
  nullifiers?: readonly VantaPrivatePoolV2Nullifier[];
  receipts?: readonly VantaPrivatePoolV2ProofReceipt[];
};

export function createVantaPrivatePoolV2MockRuntime({
  commitments = [],
  nullifiers = [],
  receipts = [],
}: VantaPrivatePoolV2MockRuntimeArgs = {}): VantaPrivatePoolV2Protocol {
  const profile = getVantaPrivatePoolV2CapabilityProfile();
  const indexer = createVantaPrivatePoolV2LocalIndexer({ commitments, nullifiers });
  const prover = createVantaPrivatePoolV2LocalProver();
  const relayer = createVantaPrivatePoolV2LocalRelayer();
  const verifierRegistry = createVantaPrivatePoolV2LocalVerifierRegistry({
    indexer,
    prover,
    receipts,
  });

  return {
    assets: VANTA_PRIVATE_POOL_V2_BENCHMARK_ASSETS,
    contractVersion: VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
    indexer,
    infrastructure: profile.infrastructure,
    network: profile.network,
    prover,
    readiness() {
      return {
        blockers: [],
        ready: true,
        warnings: [
          "Mock Private Pool v2 runtime is deterministic test infrastructure, not a live privacy pool.",
        ],
      };
    },
    relayer,
    verifierRegistry,
  };
}
