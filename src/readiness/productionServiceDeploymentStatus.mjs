import { readFileSync } from "node:fs";

const evidencePath = new URL("../../ops/mainnet/service-deployment.evidence.json", import.meta.url);

export function createVantaProductionServiceDeploymentStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

  return {
    checkedEvidenceRef: "ops/mainnet/service-deployment.evidence.json",
    lastStatusRef: evidence.lastStatusRef,
    mainnetReady: false,
    manifestRef: evidence.manifestRef,
    nextOperatorAction: evidence.nextOperatorAction,
    productionReady: false,
    productionSmokeEvidenceRef: evidence.productionSmokeEvidenceRef,
    roleServiceNetworkRef: evidence.roleServiceNetworkRef,
    roleServiceReplayEvidenceRef: evidence.roleServiceReplayEvidenceRef,
    routeHealthEvidenceRef: evidence.routeHealthEvidenceRef,
    routeHealthLastCheckedAt: evidence.routeHealthLastCheckedAt,
    serviceDeploymentStatuses: evidence.services.map((service) => ({
      deploymentStatus: service.deploymentStatus,
      id: service.id,
    })),
    version: "vanta-production-service-deployment-summary-0.1",
  };
}
