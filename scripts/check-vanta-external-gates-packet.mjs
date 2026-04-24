import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = resolve(repoRoot, "ops/mainnet/external-gates.packet.json");
const docsPath = resolve(repoRoot, "docs/mainnet-external-gates.md");
const worksheetPath = resolve(repoRoot, "docs/mainnet-launch-worksheet.md");
const productionServiceSetupPath = resolve(repoRoot, "docs/production-private-pool-v2-service-setup.md");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(packetPath), "Missing ops/mainnet/external-gates.packet.json.");
assert.ok(existsSync(docsPath), "Missing docs/mainnet-external-gates.md.");
assert.ok(existsSync(worksheetPath), "Missing docs/mainnet-launch-worksheet.md.");
assert.ok(existsSync(productionServiceSetupPath), "Missing docs/production-private-pool-v2-service-setup.md.");

const packet = JSON.parse(readFileSync(packetPath, "utf8"));
const docs = readFileSync(docsPath, "utf8");
const worksheet = readFileSync(worksheetPath, "utf8");
const productionServiceSetup = readFileSync(productionServiceSetupPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(packet.version, "vanta-mainnet-external-gates-packet-0.1");
assert.equal(packet.mainnetReady, false, "External gates packet must not claim mainnet readiness.");
assert.equal(packet.productionReady, false, "External gates packet must not claim production readiness.");
assert.equal(packet.secretPolicy, "references-only-no-secret-values");
assert.equal(packet.realFundsPolicy, "explicit-human-approval-required");

const requiredGates = [
  "deployed-services",
  "production-storage",
  "secret-manager",
  "wallet-signing-safety",
  "third-party-security-audit",
  "legal-compliance-custody",
  "mainnet-funds-approval",
  "monitoring-incident-response",
];

assert.ok(Array.isArray(packet.gates), "Packet gates must be an array.");
for (const gateId of requiredGates) {
  const gate = packet.gates.find((candidate) => candidate.id === gateId);
  assert.ok(gate, `Missing external gate: ${gateId}.`);
  assert.equal(gate.externalGate, true, `${gateId} must be marked as an external gate.`);
  assert.ok(["blocked", "not-provisioned"].includes(gate.status), `${gateId} must remain blocked or not-provisioned.`);
  assert.ok(gate.owner, `${gateId} must name an owner.`);
  assert.ok(Array.isArray(gate.requiredEvidence) && gate.requiredEvidence.length > 0, `${gateId} needs evidence.`);
  assert.ok(Array.isArray(gate.forbiddenInGit) && gate.forbiddenInGit.length > 0, `${gateId} needs forbidden values.`);
  assert.ok(
    Array.isArray(gate.verificationCommands) && gate.verificationCommands.length > 0,
    `${gateId} needs verification commands.`,
  );
}

const refs = JSON.stringify(packet.allowedReferenceNames ?? []);
for (const requiredRef of [
  "VANTA_INDEXER_URL_REF",
  "VANTA_RELAYER_URL_REF",
  "VANTA_PROVER_URL_REF",
  "VANTA_VERIFIER_URL_REF",
  "VANTA_OPERATOR_URL_REF",
  "VANTA_STAGING_PAY_URL_REF",
  "VANTA_STAGING_PRIVATE_POOL_V2_URL_REF",
  "VANTA_SECRET_MANAGER_REF",
  "VANTA_PRODUCTION_DATABASE_REF",
  "VANTA_PRODUCTION_SECRET_MANAGER_TEMPLATE_REF",
  "VANTA_PRODUCTION_BACKUP_RESTORE_TEMPLATE_REF",
  "VANTA_PRODUCTION_OBSERVABILITY_TEMPLATE_REF",
  "VANTA_PRIVATE_POOL_V2_PRODUCTION_SMOKE_TEMPLATE_REF",
  "VANTA_MAINNET_APPROVAL_GATES_TEMPLATE_REF",
  "VANTA_MAINNET_APPROVAL_GATES_EVIDENCE_REF",
  "VANTA_PAY_DOPPLER_SERVICE_TOKEN_REF",
  "VANTA_PRIVATE_POOL_V2_DOPPLER_SERVICE_TOKEN_REF",
  "VANTA_STRATEGY_DOPPLER_SERVICE_TOKEN_REF",
  "VANTA_OPERATOR_DOPPLER_SERVICE_TOKEN_REF",
  "VANTA_INDEXER_AUTH_TOKEN_REF",
  "VANTA_PROVER_AUTH_TOKEN_REF",
  "VANTA_RELAYER_AUTH_TOKEN_REF",
  "VANTA_VERIFIER_AUTH_TOKEN_REF",
  "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_PROVER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_VERIFIER_DATABASE_URL_REF",
  "VANTA_PRIVATE_POOL_V2_HEALTH_SMOKE_EVIDENCE_REF",
  "VANTA_PRIVATE_POOL_V2_REMOTE_RUNTIME_SMOKE_EVIDENCE_REF",
  "VANTA_PRIVATE_POOL_V2_PROOF_ROUNDTRIP_SMOKE_EVIDENCE_REF",
  "VANTA_PRIVATE_POOL_V2_NULLIFIER_REPLAY_SMOKE_EVIDENCE_REF",
  "VANTA_AUDIT_REPORT_REF",
  "VANTA_LEGAL_REVIEW_REF",
]) {
  assert.ok(refs.includes(requiredRef), `Missing allowed external reference: ${requiredRef}.`);
}

for (const requiredTemplate of [
  "ops/mainnet/production-secret-manager.template.json",
  "ops/mainnet/production-backup-restore.template.json",
  "ops/mainnet/production-observability.template.json",
  "ops/mainnet/private-pool-v2-production-smoke.template.json",
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
  "ops/mainnet/mainnet-approval-gates.template.json",
  "ops/mainnet/mainnet-approval-gates.evidence.json",
]) {
  assert.ok(existsSync(resolve(repoRoot, requiredTemplate)), `Missing production infrastructure template: ${requiredTemplate}.`);
}

function gateById(gateId) {
  return packet.gates.find((candidate) => candidate.id === gateId);
}

function assertGateIncludes(gateId, field, expected) {
  const gate = gateById(gateId);
  assert.ok(gate, `Missing gate ${gateId}.`);
  assert.ok(Array.isArray(gate[field]), `${gateId}.${field} must be an array.`);
  assert.ok(
    gate[field].some((entry) => String(entry).includes(expected)),
    `${gateId}.${field} must include ${expected}.`,
  );
}

assertGateIncludes("production-storage", "requiredEvidence", "ops/mainnet/production-backup-restore.template.json");
assertGateIncludes("production-storage", "requiredEvidence", "ops/mainnet/production-migration-evidence.manifest.json");
assertGateIncludes("production-storage", "requiredEvidence", "role-specific Private Pool v2 database refs");
assertGateIncludes("production-storage", "verificationCommands", "npm run mainnet:backup-restore-check");
assertGateIncludes("production-storage", "verificationCommands", "npm run mainnet:production-db-migration-harness-check");
assertGateIncludes("production-storage", "verificationCommands", "npm run mainnet:production-db-migration-dry-run");
assertGateIncludes("production-storage", "verificationCommands", "npm run mainnet:production-migration-evidence-check");
assertGateIncludes("secret-manager", "requiredEvidence", "ops/mainnet/production-secret-manager.template.json");
assertGateIncludes("secret-manager", "requiredEvidence", "Doppler service token reference names");
assertGateIncludes("monitoring-incident-response", "requiredEvidence", "ops/mainnet/production-observability.template.json");
assertGateIncludes("monitoring-incident-response", "verificationCommands", "npm run ops:safe-telemetry-check");
assertGateIncludes("monitoring-incident-response", "verificationCommands", "npm run mainnet:observability-sink-check");
assertGateIncludes("wallet-signing-safety", "verificationCommands", "npm run wallet:browser-signing-safety-check");
assertGateIncludes("deployed-services", "requiredEvidence", "ops/mainnet/private-pool-v2-production-smoke.template.json");
assertGateIncludes("deployed-services", "requiredEvidence", "ops/mainnet/private-pool-v2-production-smoke.evidence.json");
assertGateIncludes("deployed-services", "requiredEvidence", "ops/mainnet/service-deployment.evidence.json");
assertGateIncludes("deployed-services", "requiredEvidence", "ops/mainnet/private-pool-v2-route-health.evidence.json");
assertGateIncludes("deployed-services", "requiredEvidence", "ops/mainnet/private-pool-v2-role-service-replay.evidence.json");
assertGateIncludes("deployed-services", "verificationCommands", "npm run mainnet:service-deployment-evidence-check");
assertGateIncludes("deployed-services", "verificationCommands", "npm run mainnet:private-rail-route-health-evidence-check");
assertGateIncludes("deployed-services", "verificationCommands", "npm run mainnet:role-service-replay-evidence-check");
assertGateIncludes("deployed-services", "verificationCommands", "npm run mainnet:private-pool-v2-production-smoke-check");
assertGateIncludes("deployed-services", "verificationCommands", "npm run mainnet:production-smoke-evidence-check");
assertGateIncludes("third-party-security-audit", "requiredEvidence", "ops/mainnet/mainnet-approval-gates.template.json");
assertGateIncludes("third-party-security-audit", "requiredEvidence", "ops/mainnet/mainnet-approval-gates.evidence.json");
assertGateIncludes("legal-compliance-custody", "requiredEvidence", "ops/mainnet/mainnet-approval-gates.template.json");
assertGateIncludes("legal-compliance-custody", "requiredEvidence", "ops/mainnet/mainnet-approval-gates.evidence.json");
assertGateIncludes("mainnet-funds-approval", "requiredEvidence", "ops/mainnet/mainnet-approval-gates.template.json");
assertGateIncludes("mainnet-funds-approval", "requiredEvidence", "ops/mainnet/mainnet-approval-gates.evidence.json");
assertGateIncludes("mainnet-funds-approval", "verificationCommands", "npm run mainnet:approval-gates-check");

function scanForRawSecretKeys(value, path = "packet") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForRawSecretKeys(entry, `${path}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    assert.ok(
      !["value", "rawSecret", "privateKey", "seedPhrase", "keypair", "mnemonic"].includes(key),
      `External gates packet must not contain raw secret key field ${path}.${key}.`,
    );
    scanForRawSecretKeys(entry, `${path}.${key}`);
  }
}

scanForRawSecretKeys(packet);

assert.ok(packet.stagingEvidence, "External gates packet must include staging evidence.");
assert.equal(packet.stagingEvidence.environment, "staging");
assert.equal(packet.stagingEvidence.mainnetReady, false);
assert.equal(packet.stagingEvidence.productionReady, false);
assert.equal(packet.stagingEvidence.provider, "render");
assert.ok(
  Array.isArray(packet.stagingEvidence.services) && packet.stagingEvidence.services.length === 2,
  "External gates packet must include Pay and Private Pool v2 staging services.",
);

for (const serviceId of ["pay", "private-pool-v2"]) {
  const service = packet.stagingEvidence.services.find((candidate) => candidate.id === serviceId);
  assert.ok(service, `Missing staging evidence service ${serviceId}.`);
  assert.ok(service.serviceId.startsWith("srv-"), `${serviceId} staging evidence needs Render service id.`);
  assert.ok(service.publicUrl.startsWith("https://"), `${serviceId} staging evidence needs HTTPS public URL.`);
  assert.equal(service.healthEndpoint, "/health", `${serviceId} staging evidence must expose /health.`);
  assert.ok(service.authSecretRef.endsWith("_REF"), `${serviceId} auth evidence must be a ref.`);
  assert.ok(service.databaseSecretRef.endsWith("_REF"), `${serviceId} database evidence must be a ref.`);
  assert.equal(service.storageKind, "postgres-jsonb-snapshot-store");
  assert.equal(service.durableStoreConfigured, true);
}

const requiredDocPhrases = [
  "# Vanta Mainnet External Gates",
  "Do not paste secrets into chat",
  "secret manager",
  "third-party security audit",
  "legal, compliance, and custody",
  "explicit approval before mainnet funds",
  "ops/mainnet/external-gates.packet.json",
  "npm run mainnet:external-gates-check",
  "npm run mainnet:preflight",
  "docs/mainnet-launch-worksheet.md",
];

for (const phrase of requiredDocPhrases) {
  assert.ok(docs.includes(phrase), `docs/mainnet-external-gates.md is missing required phrase: ${phrase}`);
}

const requiredWorksheetPhrases = [
  "# Vanta Mainnet Launch Worksheet",
  "Start Here",
  "Do Not Send Me",
  "What You Need To Find",
  "Plain-English Meaning",
  "Who Usually Provides This",
  "What To Give Codex",
  "What Not To Give Codex",
  "First Practical Path",
  "Not production-ready",
];

for (const phrase of requiredWorksheetPhrases) {
  assert.ok(worksheet.includes(phrase), `docs/mainnet-launch-worksheet.md is missing required phrase: ${phrase}`);
}

for (const phrase of [
  "# Production Private Pool v2 Service Setup",
  "vanta-prod-private-pool-v2-indexer",
  "vanta-prod-private-pool-v2-prover",
  "vanta-prod-private-pool-v2-relayer",
  "vanta-prod-private-pool-v2-verifier",
  "vanta-prod-private-pool-v2-operator",
  "The production indexer, prover, relayer, verifier, and operator services have live public health evidence, authenticated no-real-funds smoke evidence",
  "The production network still needs backup/restore evidence",
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
  "npm run mainnet:production-service-setup-check",
]) {
  assert.ok(
    productionServiceSetup.includes(phrase),
    `docs/production-private-pool-v2-service-setup.md is missing required phrase: ${phrase}`,
  );
}

assert.equal(
  packageJson.scripts["mainnet:external-gates-check"],
  "node scripts/check-vanta-external-gates-packet.mjs",
  "package.json must expose mainnet:external-gates-check.",
);

assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:external-gates-check"),
  "mainnet:preflight must include the external gates packet check.",
);

assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:production-service-setup-check"),
  "mainnet:preflight must include the production service setup check.",
);

console.log("Vanta external gates packet check: PASS");
