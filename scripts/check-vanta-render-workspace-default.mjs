import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const expectedWorkspaceName = "William's workspace";
const expectedWorkspaceId = "tea-d7j37af7f7vs739ii8rg";
const expectedWorkspaceRef = `render:${expectedWorkspaceId}`;

const requiredFiles = [
  "VANTA_VAULT.md",
  ".env.example",
  "docs/mainnet-deployment-runbook.md",
  "docs/production-private-pool-v2-service-setup.md",
  "ops/mainnet/private-pool-v2-services.manifest.json",
];

for (const file of requiredFiles) {
  assert.ok(existsSync(resolve(repoRoot, file)), `Missing tracked Render workspace contract file: ${file}`);
}

const vaultPointer = readFileSync(resolve(repoRoot, "VANTA_VAULT.md"), "utf8");
const envExample = readFileSync(resolve(repoRoot, ".env.example"), "utf8");
const deploymentRunbook = readFileSync(resolve(repoRoot, "docs/mainnet-deployment-runbook.md"), "utf8");
const serviceSetupDoc = readFileSync(resolve(repoRoot, "docs/production-private-pool-v2-service-setup.md"), "utf8");
const manifest = JSON.parse(readFileSync(resolve(repoRoot, "ops/mainnet/private-pool-v2-services.manifest.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

for (const [label, source] of [
  ["VANTA_VAULT.md", vaultPointer],
  [".env.example", envExample],
  ["docs/mainnet-deployment-runbook.md", deploymentRunbook],
  ["docs/production-private-pool-v2-service-setup.md", serviceSetupDoc],
]) {
  assert.ok(source.includes(expectedWorkspaceName), `${label} must record ${expectedWorkspaceName}.`);
  assert.ok(source.includes(expectedWorkspaceId), `${label} must record ${expectedWorkspaceId}.`);
}

for (const [label, source] of [
  ["VANTA_VAULT.md", vaultPointer],
  ["docs/mainnet-deployment-runbook.md", deploymentRunbook],
  ["docs/production-private-pool-v2-service-setup.md", serviceSetupDoc],
]) {
  assert.ok(
    source.includes("Do not continue Render provider work while the selected workspace is empty or different"),
    `${label} must include the fail-closed Render workspace instruction.`,
  );
}

assert.equal(manifest.renderWorkspace?.provider, "render", "Manifest must record the Render provider.");
assert.equal(
  manifest.renderWorkspace?.workspaceName,
  expectedWorkspaceName,
  "Manifest must record the expected Render workspace name.",
);
assert.equal(
  manifest.renderWorkspace?.workspaceId,
  expectedWorkspaceId,
  "Manifest must record the expected Render workspace id.",
);
assert.ok(
  manifest.renderWorkspace?.failClosedInstruction?.includes("empty or different"),
  "Manifest must preserve the fail-closed workspace instruction.",
);

const deployedServices = manifest.services.map((service) => service.deployedService);
assert.equal(deployedServices.length, 5, "Manifest must still include five production Render role services.");

for (const service of deployedServices) {
  assert.equal(service.provider, "render", `${service.serviceName} provider must remain Render.`);
  assert.equal(
    service.lastVerifiedWorkspaceRef,
    `render:${expectedWorkspaceName}`,
    `${service.serviceName} must preserve the last verified workspace name.`,
  );
  assert.ok(
    service.lastVerifiedDeployRef.startsWith(expectedWorkspaceRef),
    `${service.serviceName} deploy ref must include the Render workspace id.`,
  );
}

assert.equal(
  packageJson.scripts["mainnet:render-workspace-check"],
  "node scripts/check-vanta-render-workspace-default.mjs",
  "package.json must expose mainnet:render-workspace-check.",
);

assert.equal(
  packageJson.scripts["mainnet:render-api-workspace-check"],
  "node scripts/check-vanta-render-api-workspace.mjs",
  "package.json must expose mainnet:render-api-workspace-check.",
);

assert.equal(
  packageJson.scripts["mainnet:render-api-services-check"],
  "node scripts/check-vanta-render-api-services.mjs",
  "package.json must expose mainnet:render-api-services-check.",
);

assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:render-workspace-check"),
  "mainnet:preflight must include the Render workspace check.",
);

for (const forbidden of ["Bearer ", "DATABASE_URL=", "PRIVATE KEY", "rnd_"]) {
  assert.ok(!deploymentRunbook.includes(forbidden), `Mainnet deployment runbook must not include ${forbidden}.`);
  assert.ok(!serviceSetupDoc.includes(forbidden), `Production service setup doc must not include ${forbidden}.`);
}

console.log("Vanta Render workspace default check: PASS");
