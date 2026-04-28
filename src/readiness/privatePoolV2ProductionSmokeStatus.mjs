import { readFileSync } from "node:fs";

const evidencePath = new URL("../../ops/mainnet/private-pool-v2-production-smoke.evidence.json", import.meta.url);

export function createVantaPrivatePoolV2ProductionSmokeStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

  return {
    checkedAt: evidence.checkedAt,
    checkedEvidenceRef: "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
    mainnetReady: false,
    productionReady: false,
    realFundsAllowed: evidence.realFundsAllowed,
    runId: evidence.runId,
    serviceIds: evidence.services.map((service) => service.id),
    serviceReadinessStatuses: evidence.services.map((service) => ({
      healthOk: service.health?.ok ?? false,
      id: service.id,
      readinessOk: service.readiness?.ok ?? false,
      readinessProductionReady: service.readiness?.productionReady ?? false,
      urlRef: service.urlRef,
    })),
    smokeTargetStatuses: evidence.smokeTargets.map((target) => ({
      id: target.id,
      replayStatus: target.replayStatus ?? null,
      rejectionStatus: target.rejectionStatus ?? null,
      status: target.status,
    })),
    version: "vanta-private-pool-v2-production-smoke-summary-0.1",
  };
}
