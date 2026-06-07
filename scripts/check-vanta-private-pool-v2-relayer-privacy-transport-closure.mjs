import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_VERSION,
  normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence,
} from "../src/privacy/privatePoolV2RelayerPrivacyTransport.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const closurePath = resolve(
  repoRoot,
  "ops/mainnet/private-pool-v2-relayer-privacy-transport-closure.evidence.json",
);
const acquisitionPath = resolve(
  repoRoot,
  "ops/mainnet/private-pool-v2-relayer-privacy-transport-acquisition.evidence.json",
);
const manifestPath = resolve(repoRoot, "ops/mainnet/private-pool-v2-services.manifest.json");
const repairPath = resolve(repoRoot, "ops/mainnet/render-provider-config-repair.evidence.json");
const envExamplePath = resolve(repoRoot, ".env.example");
const packagePath = resolve(repoRoot, "package.json");

const closure = JSON.parse(readFileSync(closurePath, "utf8"));
const acquisition = JSON.parse(readFileSync(acquisitionPath, "utf8"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const repair = JSON.parse(readFileSync(repairPath, "utf8"));
const envExample = readFileSync(envExamplePath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

const externalEvidenceEnvVar = "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH";
const commonEnvVars = [
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODE",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_DEPLOYMENT_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_LOG_REDACTION_REVIEW_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_RETENTION_POLICY_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_REVIEWER_ACCEPTANCE_REF",
];
const torEnvVars = [
  "VANTA_PRIVATE_POOL_V2_RELAYER_TOR_ONION_HOST_FINGERPRINT_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_TOR_ONION_SERVICE_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_TOR_REVERSE_PROXY_REDACTION_REF",
];
const blindedTokenEnvVars = [
  "VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_ISSUER_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_VERIFIER_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_FAMILY_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_REPLAY_CACHE_REF",
];

function assertNoSecretMaterial(value, path = "closure") {
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

function assertNullCurrentRefs(refs, label) {
  assert.ok(Array.isArray(refs), `${label} must be an array.`);
  for (const entry of refs) {
    assert.equal(entry.currentRef, null, `${label}.${entry.field}.currentRef must remain null.`);
    assert.ok(entry.envVar, `${label}.${entry.field} must name an env var.`);
    assert.ok(Array.isArray(entry.allowedPrefixes), `${label}.${entry.field} must name prefixes.`);
  }
}

function validateExternalEvidenceWhenProvided() {
  const envPath = process.env[externalEvidenceEnvVar];
  if (!envPath) {
    return { externalEvidenceValidated: false };
  }

  const resolved = envPath.startsWith("/") ? envPath : resolve(repoRoot, envPath);
  assert.ok(existsSync(resolved), `${externalEvidenceEnvVar} points to a missing file.`);
  const source = readFileSync(resolved, "utf8");
  assertNoSecretMaterial(source, externalEvidenceEnvVar);

  const accepted = normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence(JSON.parse(source));
  assert.equal(accepted.productionReady, false);
  assert.equal(accepted.privacyClaimAllowed, false);
  assert.ok(["tor-onion", "blinded-token"].includes(accepted.activeMode));
  return {
    activeMode: accepted.activeMode,
    externalEvidenceValidated: true,
  };
}

assert.equal(closure.version, "vanta-private-pool-v2-relayer-privacy-transport-closure-0.1");
assert.equal(closure.status, "blocked-external-privacy-transport-evidence-required");
assert.equal(closure.mainnetReady, false);
assert.equal(closure.productionReady, false);
assert.equal(closure.privacyClaimAllowed, false);
assert.equal(closure.privacyTransportReady, false);
assert.equal(closure.secretPolicy, "references-only-no-secret-values");
assert.equal(closure.renderWorkspace?.workspaceId, "tea-d7j37af7f7vs739ii8rg");
assert.equal(closure.renderWorkspace?.workspaceName, "William's workspace");
assert.equal(closure.relayerService?.serviceId, "srv-d7jg9jrbc2fs73c161gg");
assert.equal(closure.recommendedFirstMode?.mode, "tor-onion");
assert.equal(closure.recommendedFirstMode?.providerMutationAllowed, false);
assertNoSecretMaterial(closure);

assert.ok(closure.priorRepairRef.endsWith("render-provider-config-repair.evidence.json"));
assert.equal(repair.version, "vanta-render-provider-config-repair-evidence-0.1");
assert.ok(
  repair.remainingBlockers.some(
    (blocker) => blocker.id === "relayer-privacy-transport-evidence-missing",
  ),
  "Repair evidence must preserve the relayer privacy-transport blocker.",
);

assert.equal(
  closure.currentRenderEvidence?.latestMainDeployRef,
  "render:tea-d7j37af7f7vs739ii8rg/srv-d7jg9jrbc2fs73c161gg/dep-d8if0t42m8qs73904afg",
);
assert.equal(closure.currentRenderEvidence?.latestMainDeployStatus, "update_failed");
assert.equal(
  closure.currentRenderEvidence?.latestMainDeployCommit,
  "611acff6a38bc7de5741a83ed02db5a40cf4fcd6",
);
assert.equal(closure.currentRenderEvidence?.jitterBatchingErrorObservedAfterRepair, false);
assert.ok(
  closure.currentRenderEvidence?.nextFailClosedBlocker.includes(
    "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED=true",
  ),
);
assert.equal(closure.currentRenderEvidence?.currentLiveHealthOk, true);

assert.equal(
  acquisition.version,
  "vanta-private-pool-v2-relayer-privacy-transport-acquisition-0.1",
);
assert.equal(acquisition.status, "blocked-awaiting-external-transport-deployment-and-review");
assert.equal(acquisition.providerMutationAllowed, false);
assert.equal(acquisition.modeDecision?.recommendedFirstMode, "tor-onion");
assert.equal(
  closure.acquisitionRequest?.acquisitionPacketRef,
  "ops/mainnet/private-pool-v2-relayer-privacy-transport-acquisition.evidence.json",
);
assert.equal(
  closure.acquisitionRequest?.humanRequestRef,
  "ops/mainnet/private-pool-v2-relayer-privacy-transport-external-evidence-request.md",
);
assert.equal(closure.acquisitionRequest?.providerMutationAllowed, false);
assert.ok(
  closure.acquisitionRequest?.command.includes(
    "npm run relayer:privacy-transport-acquisition-check",
  ),
);

assertNullCurrentRefs(closure.requiredCommonRefs, "requiredCommonRefs");
assertNullCurrentRefs(closure.modeSpecificRefs?.["tor-onion"], "modeSpecificRefs.tor-onion");
assertNullCurrentRefs(closure.modeSpecificRefs?.["blinded-token"], "modeSpecificRefs.blinded-token");

assert.equal(closure.externalClosureValidation?.evidencePathEnvVar, externalEvidenceEnvVar);
assert.equal(closure.externalClosureValidation?.defaultGuardRequiresExternalEvidence, false);
assert.equal(closure.externalClosureValidation?.requiresExactlyOneMode, true);
assert.equal(closure.externalClosureValidation?.satisfiesRelayerPrivacyTransportClosure, false);
assert.ok(
  closure.externalClosureValidation?.truthBoundary.includes("does not supply live Tor"),
  "External validation truth boundary must preserve the live Tor blocker.",
);
assert.equal(closure.renderProviderPreflight?.printsSecretValues, false);
assert.equal(closure.renderProviderPreflight?.providerMutationAllowed, false);
assert.equal(
  closure.renderProviderPreflight?.command,
  "npm run mainnet:render-relayer-privacy-transport-env-status",
);
assert.equal(closure.renderProviderPreflight?.lastLiveStatus?.liveProviderChecked, true);
assert.equal(closure.renderProviderPreflight?.lastLiveStatus?.checkedEnvKeyCount, 13);
assert.deepEqual(closure.renderProviderPreflight?.lastLiveStatus?.presentPrivacyTransportEnvNames, []);
assert.equal(closure.renderProviderPreflight?.lastLiveStatus?.privacyTransportReady, false);
for (const envName of commonEnvVars) {
  assert.ok(
    closure.renderProviderPreflight?.lastLiveStatus?.missingRequiredEnvNames.includes(envName),
    `Live Render status must record missing ${envName}.`,
  );
}

const relayer = manifest.services.find((service) => service.id === "relayer");
assert.ok(relayer, "Production manifest must include relayer service.");
assert.equal(relayer.deployedService?.serviceId, closure.relayerService.serviceId);
const relayerEnvNames = new Set(relayer.env.map((entry) => entry.name));
for (const envName of [...commonEnvVars, ...torEnvVars, ...blindedTokenEnvVars]) {
  assert.ok(relayerEnvNames.has(envName), `Relayer manifest missing ${envName}.`);
  assert.ok(envExample.includes(`${envName}=`), `.env.example missing ${envName}.`);
}
assert.ok(
  envExample.includes(`${externalEvidenceEnvVar}=`),
  `.env.example missing ${externalEvidenceEnvVar}.`,
);

for (const command of [
  "npm run relayer:privacy-transport-check",
  "npm run relayer:privacy-transport-acquisition-check",
  "npm run relayer:privacy-transport-closure-check",
  "npm run mainnet:render-relayer-privacy-transport-env-status",
  "npm run mainnet:deployment-manifest-check",
  "npm run truth:privacy-claim-gate",
]) {
  assert.ok(closure.canonicalCommands.includes(command), `Closure packet missing ${command}.`);
}

assert.equal(
  packageJson.scripts["relayer:privacy-transport-acquisition-check"],
  "node scripts/check-vanta-private-pool-v2-relayer-privacy-transport-acquisition.mjs",
);
assert.equal(
  packageJson.scripts["relayer:privacy-transport-closure-check"],
  "node scripts/check-vanta-private-pool-v2-relayer-privacy-transport-closure.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:render-relayer-privacy-transport-env-status"],
  "node scripts/check-vanta-render-relayer-privacy-transport-env.mjs",
);
for (const compositeName of ["private-pool-v2:verify", "mainnet:preflight"]) {
  assert.ok(
    packageJson.scripts[compositeName].includes("npm run relayer:privacy-transport-closure-check"),
    `${compositeName} must include the relayer privacy-transport closure guard.`,
  );
  assert.ok(
    packageJson.scripts[compositeName].includes("npm run relayer:privacy-transport-acquisition-check"),
    `${compositeName} must include the relayer privacy-transport acquisition guard.`,
  );
  assert.ok(
    packageJson.scripts[compositeName].includes("npm run mainnet:render-relayer-privacy-transport-env-status"),
    `${compositeName} must include the Render privacy-transport env status guard.`,
  );
}

const externalValidation = validateExternalEvidenceWhenProvided();

console.log(
  JSON.stringify(
    {
      activeMode: externalValidation.activeMode ?? null,
      externalEvidenceValidated: externalValidation.externalEvidenceValidated,
      ok: true,
      privacyClaimAllowed: false,
      privacyTransportReady: externalValidation.externalEvidenceValidated,
      productionReady: false,
      status: externalValidation.externalEvidenceValidated
        ? "reviewed-relayer-privacy-transport-evidence-valid-claim-blocked"
        : "blocked-external-relayer-privacy-transport-evidence-required",
      version: VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_VERSION,
    },
    null,
    2,
  ),
);
