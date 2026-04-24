import { readFileSync } from "node:fs";

const evidencePath = new URL("../../ops/mainnet/private-pool-v2-nullifier-replay.evidence.json", import.meta.url);

export function createVantaNullifierReplayStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

  return {
    checkedEvidenceRef: "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json",
    layeredReplayStatus: evidence.layeredReplayStatus,
    nullifierReplayGuardMode: evidence.nullifierReplayGuardMode,
    nullifierReplayGuardProductionReady: evidence.nullifierReplayGuardProductionReady,
    productionSmokeReplaySimulationStatus: evidence.productionSmokeReplaySimulationStatus,
    protocolEnforcementFinalLayerImplemented: evidence.protocolEnforcementFinalLayerImplemented,
    protocolEnforcementFinalLayerProductionReady: evidence.protocolEnforcementFinalLayerProductionReady,
    protocolEnforcementLayer: evidence.protocolEnforcementLayer,
    roleServiceNetworkReplayBarrier: evidence.roleServiceNetworkReplayBarrier,
    roleServiceNetworkReplayVerified: evidence.roleServiceNetworkReplayVerified,
    runtimeMode: evidence.runtimeMode,
    version: "vanta-production-nullifier-replay-summary-0.1",
  };
}
