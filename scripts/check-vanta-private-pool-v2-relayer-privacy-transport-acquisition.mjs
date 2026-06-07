import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence } from "../src/privacy/privatePoolV2RelayerPrivacyTransport.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const acquisitionPath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-acquisition.evidence.json";
const closurePath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-closure.evidence.json";
const requestPath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-external-evidence-request.md";
const torTemplatePath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-tor-onion.template.json";
const blindedTemplatePath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-blinded-token.template.json";
const runbookPath = "docs/operator-runbook.md";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function assertExists(path) {
  assert.ok(existsSync(resolve(repoRoot, path)), `Missing ${path}.`);
}

function assertIncludes(source, marker, label) {
  assert.ok(source.includes(marker), `${label} missing marker: ${marker}`);
}

function assertNoSecretMaterial(value, path = "packet") {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    for (const forbidden of [
      /postgres(?:ql)?:\/\//iu,
      /DATABASE_URL=/u,
      /Bearer\s+/u,
      /\brnd_[A-Za-z0-9_]+/u,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/u,
      /\b(?:onion|token|wallet|user)[_-]?(?:private|secret|preimage)\b/iu,
    ]) {
      assert.ok(!forbidden.test(value), `${path} includes forbidden secret-bearing material.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecretMaterial(entry, `${path}.${index}`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      assertNoSecretMaterial(nested, `${path}.${key}`);
    }
  }
}

function assertAllNullRefs(value, path) {
  if (value === null) return;
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${path} must be an object.`);
  for (const [key, nested] of Object.entries(value)) {
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      assertAllNullRefs(nested, `${path}.${key}`);
    } else {
      assert.equal(nested, null, `${path}.${key} must remain null until reviewed refs return.`);
    }
  }
}

function assertTemplateIsNotAcceptedEvidence(template, label) {
  assert.equal(template.templateStatus, "template-only-fill-with-reviewed-refs-before-validation");
  assert.equal(template.productionReady, false);
  assert.equal(template.privacyClaimAllowed, false);
  assertNoSecretMaterial(template, label);
  assert.throws(
    () => normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence(template),
    /refs-only handle/,
    `${label} must not validate before placeholders are replaced.`,
  );
}

for (const path of [acquisitionPath, closurePath, requestPath, torTemplatePath, blindedTemplatePath]) {
  assertExists(path);
}

const acquisition = readJson(acquisitionPath);
const closure = readJson(closurePath);
const request = read(requestPath);
const torTemplate = readJson(torTemplatePath);
const blindedTemplate = readJson(blindedTemplatePath);
const runbook = read(runbookPath);
const packageJson = readJson("package.json");

assert.equal(acquisition.version, "vanta-private-pool-v2-relayer-privacy-transport-acquisition-0.1");
assert.equal(acquisition.status, "blocked-awaiting-external-transport-deployment-and-review");
assert.equal(acquisition.mainnetReady, false);
assert.equal(acquisition.productionReady, false);
assert.equal(acquisition.privacyClaimAllowed, false);
assert.equal(acquisition.privacyTransportReady, false);
assert.equal(acquisition.providerMutationAllowed, false);
assert.equal(acquisition.secretPolicy, "references-only-no-secret-values");
assert.equal(acquisition.renderWorkspace?.workspaceId, "tea-d7j37af7f7vs739ii8rg");
assert.equal(acquisition.relayerService?.serviceId, "srv-d7jg9jrbc2fs73c161gg");
assert.equal(acquisition.currentRelayerDeploy?.status, "update_failed");
assertIncludes(
  acquisition.currentRelayerDeploy?.failClosedReason ?? "",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED=true",
  "current relayer deploy blocker",
);
assert.equal(acquisition.currentRelayerDeploy?.jitterBatchingErrorObserved, false);
assert.equal(acquisition.currentRelayerDeploy?.stalePostgresHostObserved, false);
assert.equal(acquisition.modeDecision?.recommendedFirstMode, "tor-onion");
assert.equal(acquisition.modeDecision?.alternateMode, "blinded-token");
assert.equal(acquisition.modeDecision?.alternateStatus, "valid-but-heavier-external-infrastructure-path");
assertNoSecretMaterial(acquisition, acquisitionPath);

const sourceById = new Map(acquisition.primarySourceRefs.map((entry) => [entry.id, entry]));
assert.equal(
  sourceById.get("tor-project-onion-service-setup")?.url,
  "https://community.torproject.org/onion-services/setup/",
);
assert.equal(
  sourceById.get("ietf-rfc9576-privacy-pass-architecture")?.url,
  "https://www.ietf.org/rfc/rfc9576.html",
);
assert.equal(
  sourceById.get("ietf-rfc9577-privacy-pass-http-auth")?.url,
  "https://www.ietf.org/rfc/rfc9577.html",
);

assert.deepEqual(acquisition.repoRequestRefs, {
  humanRequestRef: requestPath,
  torOnionTemplateRef: torTemplatePath,
  blindedTokenTemplateRef: blindedTemplatePath,
  closurePacketRef: closurePath,
});
assertAllNullRefs(acquisition.currentAcceptedRefs, "currentAcceptedRefs");

for (const expected of [
  "tor-onion-ingress-deployment",
  "reverse-proxy-and-relayer-log-redaction",
  "no-ip-retention-policy",
  "reviewer-acceptance",
  "returned-evidence-validation",
  "render-env-mutation",
]) {
  assert.ok(acquisition.reviewOrder.some((entry) => entry.id === expected), `Missing review step ${expected}.`);
}

assertTemplateIsNotAcceptedEvidence(torTemplate, torTemplatePath);
assertTemplateIsNotAcceptedEvidence(blindedTemplate, blindedTemplatePath);

for (const marker of [
  "HiddenServiceDir",
  "HiddenServicePort",
  "Privacy Pass",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH=<reviewed-tor-onion-json>",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH=<reviewed-blinded-token-json>",
  "Do not set placeholder refs",
]) {
  assertIncludes(request, marker, requestPath);
}
assertNoSecretMaterial(request, requestPath);

assert.equal(
  closure.acquisitionRequest?.acquisitionPacketRef,
  acquisitionPath,
  "Closure packet must point to acquisition packet.",
);
assert.equal(closure.acquisitionRequest?.providerMutationAllowed, false);
assertIncludes(
  closure.acquisitionRequest?.command ?? "",
  "npm run relayer:privacy-transport-acquisition-check",
  "closure acquisition command",
);

assert.equal(
  packageJson.scripts["relayer:privacy-transport-acquisition-check"],
  "node scripts/check-vanta-private-pool-v2-relayer-privacy-transport-acquisition.mjs",
);
for (const compositeName of ["private-pool-v2:verify", "mainnet:preflight"]) {
  assertIncludes(
    packageJson.scripts[compositeName],
    "npm run relayer:privacy-transport-acquisition-check",
    compositeName,
  );
}

for (const marker of [
  "npm run relayer:privacy-transport-acquisition-check",
  "ops/mainnet/private-pool-v2-relayer-privacy-transport-external-evidence-request.md",
  "reviewed refs-only Tor-onion",
  "reviewed refs-only blinded-token",
]) {
  assertIncludes(runbook, marker, runbookPath);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      providerMutationAllowed: false,
      recommendedFirstMode: acquisition.modeDecision.recommendedFirstMode,
      status: acquisition.status,
      templatesValidateOnlyAfterReviewerRefs: true,
    },
    null,
    2,
  ),
);
