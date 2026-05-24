import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const templatePath = resolve(repoRoot, "ops/mainnet/production-secret-manager.template.json");
const manifestPath = resolve(repoRoot, "ops/mainnet/secret-references.manifest.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(templatePath), "Missing ops/mainnet/production-secret-manager.template.json.");
assert.ok(existsSync(manifestPath), "Missing ops/mainnet/secret-references.manifest.json.");

const template = JSON.parse(readFileSync(templatePath, "utf8"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(template.version, "vanta-production-secret-manager-template-0.1");
assert.equal(template.provider, "doppler");
assert.equal(template.mainnetReady, false);
assert.equal(template.productionReady, false);
assert.equal(template.secretPolicy, "references-only-no-secret-values");
assert.equal(template.status, "doppler-created-not-production-integrated");
assert.equal(template.providerEvidence.serviceTokensCreated, false);
assert.equal(template.providerEvidence.accessLogsVerified, false);
assert.equal(template.providerEvidence.productionConfigConfigured, "pending-human-confirmation");

assert.ok(Array.isArray(template.serviceIdentities) && template.serviceIdentities.length >= 4);
assert.ok(Array.isArray(template.secretMappings) && template.secretMappings.length >= 20);
assert.ok(Array.isArray(template.productionBlockers) && template.productionBlockers.length >= 4);

for (const identity of template.serviceIdentities) {
  assert.ok(identity.id, "Service identity must have an id.");
  assert.ok(identity.scope, `${identity.id} must have a scope.`);
  assert.ok(
    String(identity.dopplerServiceTokenRef).endsWith("_REF"),
    `${identity.id} service token must be a reference name.`,
  );
  assert.ok(
    String(identity.productionBlocker).endsWith("service-token-ref-not-provisioned"),
    `${identity.id} production blocker must require a service token ref.`,
  );
}

for (const mapping of template.secretMappings) {
  assert.ok(String(mapping.ref).endsWith("_REF"), `${mapping.dopplerSecretName} ref must be a reference name.`);
  assert.ok(/^[A-Z0-9_]+$/.test(mapping.dopplerSecretName), `${mapping.ref} must use a Doppler secret name.`);
  assert.ok(mapping.owner, `${mapping.ref} must name an owner.`);
  assert.ok(Number.isInteger(mapping.rotation?.cadenceDays), `${mapping.ref} must include rotation cadence.`);
  assert.ok(mapping.revocation?.runbookRef, `${mapping.ref} must include revocation runbook.`);
  assert.ok(String(mapping.audit?.accessLogRef).endsWith("_REF"), `${mapping.ref} audit log must be a ref.`);
}

assert.equal(manifest.secretPolicy, "references-only-no-secret-values");

const source = JSON.stringify({ template, manifest });
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "sk_live_",
]) {
  assert.ok(!source.includes(forbidden), `Secret-manager evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:production-secret-manager-evidence-check"],
  "node scripts/check-vanta-production-secret-manager-evidence.mjs",
  "package.json must expose mainnet:production-secret-manager-evidence-check.",
);

console.log("Vanta production secret-manager evidence check: PASS");
