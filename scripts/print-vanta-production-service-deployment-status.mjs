import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const manifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const evidencePath = new URL("../ops/mainnet/service-deployment.evidence.json", import.meta.url);
const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

function buildStatus() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const services = manifest.services.map((service) => ({
    durableStoreConfigured: service.deployedService?.storage?.durableStoreConfigured ?? false,
    environment: service.deployedService?.environment ?? null,
    healthCheckCount: service.deployedService?.healthChecks?.length ?? 0,
    id: service.id,
    persistenceKind: service.persistence?.kind ?? null,
    productionReady: service.deployedService?.productionReady ?? false,
    readinessCheckCount: service.deployedService?.readinessChecks?.length ?? 0,
    serviceId: service.deployedService?.serviceId ?? null,
    urlHost: service.deployedService?.url ? new URL(service.deployedService.url).host : null,
  }));

  return {
    checkedAt: new Date().toISOString(),
    mainnetReady: false,
    manifestVersion: manifest.version,
    network: manifest.network,
    observabilityControlsPending: evidence.observabilityControlsPending,
    backupRestoreMaturityPending: evidence.backupRestoreMaturityPending,
    realFundsReadinessPending: evidence.realFundsReadinessPending,
    pendingProductionControls: evidence.pendingProductionControls,
    productionReady: false,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, or signed transaction material are printed.",
    services,
    stagingDeploymentIds: manifest.stagingDeployments.map((deployment) => deployment.id),
    version: "vanta-production-service-deployment-status-0.1",
  };
}

const result = buildStatus();

if (checkMode) {
  assert.equal(result.manifestVersion, "vanta-mainnet-services-manifest-0.1");
  assert.equal(result.network, "mainnet-beta");
  assert.equal(result.mainnetReady, false);
  assert.equal(result.productionReady, false);
  assert.equal(result.observabilityControlsPending, true);
  assert.equal(result.backupRestoreMaturityPending, true);
  assert.equal(result.realFundsReadinessPending, true);
  assert.deepEqual(result.pendingProductionControls, [
    "observability-controls",
    "backup-restore-maturity",
    "real-funds-readiness",
  ]);
  assert.deepEqual(result.stagingDeploymentIds, ["pay", "private-pool-v2"]);
  assert.equal(result.services.length, 5, "Expected all five production Private Pool v2 role services.");
  for (const service of result.services) {
    assert.equal(service.environment, "production", `${service.id} must remain a production deployment.`);
    assert.equal(service.productionReady, false, `${service.id} must not claim production readiness.`);
    assert.equal(service.durableStoreConfigured, true, `${service.id} must keep durable storage configured.`);
    assert.ok(service.serviceId, `${service.id} must keep a deployed service id.`);
    assert.ok(service.urlHost, `${service.id} must keep a deployed service host.`);
    assert.ok(service.healthCheckCount > 0, `${service.id} must keep health checks.`);
    assert.ok(service.readinessCheckCount > 0, `${service.id} must keep readiness checks.`);
  }
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta production service deployment status");
  console.log(`- network: ${result.network}`);
  console.log(`- services: ${result.services.map((service) => service.id).join(", ")}`);
  console.log(`- observabilityControlsPending: ${String(result.observabilityControlsPending)}`);
  console.log(`- backupRestoreMaturityPending: ${String(result.backupRestoreMaturityPending)}`);
  console.log(`- realFundsReadinessPending: ${String(result.realFundsReadinessPending)}`);
  console.log(`- pendingProductionControls: ${result.pendingProductionControls.join(", ")}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
}
