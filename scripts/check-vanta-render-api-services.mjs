import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const expectedWorkspaceId = "tea-d7j37af7f7vs739ii8rg";

const token = process.env.RENDER_API_KEY;

assert.ok(token, "RENDER_API_KEY is required for the Render API service check.");

const manifest = JSON.parse(readFileSync(resolve(repoRoot, "ops/mainnet/private-pool-v2-services.manifest.json"), "utf8"));
assert.equal(manifest.renderWorkspace?.workspaceId, expectedWorkspaceId);

const expectedServices = [
  ...manifest.stagingDeployments.map((service) => ({
    id: service.serviceId,
    name: service.serviceName,
    environment: service.environment,
  })),
  ...manifest.services.map((service) => ({
    id: service.deployedService.serviceId,
    name: service.deployedService.serviceName,
    environment: service.deployedService.environment,
  })),
];

const response = await fetch("https://api.render.com/v1/services?limit=100", {
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  },
});

assert.equal(response.status, 200, `Render services API must return 200, got ${response.status}.`);

const body = await response.json();
const rows = Array.isArray(body) ? body : [];
const services = rows.map((row) => row.service).filter(Boolean);

const missing = [];
const wrongWorkspace = [];

for (const expected of expectedServices) {
  const service = services.find((candidate) => candidate.id === expected.id);

  if (!service) {
    missing.push(expected);
    continue;
  }

  if (service.ownerId !== expectedWorkspaceId) {
    wrongWorkspace.push({
      id: expected.id,
      name: expected.name,
      ownerId: service.ownerId,
    });
  }
}

assert.deepEqual(missing, [], "Render API service check must find every expected Vanta service id.");
assert.deepEqual(wrongWorkspace, [], "Every expected Vanta service must belong to William's workspace.");

console.log(
  JSON.stringify(
    {
      ok: true,
      workspaceId: expectedWorkspaceId,
      expectedServiceCount: expectedServices.length,
      matchedServiceCount: expectedServices.length,
      services: expectedServices.map((service) => ({
        id: service.id,
        name: service.name,
        environment: service.environment,
      })),
    },
    null,
    2,
  ),
);
