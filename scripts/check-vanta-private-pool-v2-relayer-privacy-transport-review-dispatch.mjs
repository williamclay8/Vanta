import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const dispatchPath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-review-dispatch.evidence.json";
const issueBodyPath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-github-review-request.md";
const acquisitionPath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-acquisition.evidence.json";
const closurePath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-closure.evidence.json";
const requestPath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-external-evidence-request.md";
const torTemplatePath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-tor-onion.template.json";
const blindedTemplatePath = "ops/mainnet/private-pool-v2-relayer-privacy-transport-blinded-token.template.json";

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

for (const path of [
  dispatchPath,
  issueBodyPath,
  acquisitionPath,
  closurePath,
  requestPath,
  torTemplatePath,
  blindedTemplatePath,
]) {
  assertExists(path);
}

const dispatch = readJson(dispatchPath);
const acquisition = readJson(acquisitionPath);
const closure = readJson(closurePath);
const issueBody = read(issueBodyPath);
const packageJson = readJson("package.json");

assert.equal(dispatch.version, "vanta-private-pool-v2-relayer-privacy-transport-review-dispatch-0.1");
assert.equal(dispatch.status, "sent-awaiting-external-reviewer-response");
assert.equal(dispatch.mainnetReady, false);
assert.equal(dispatch.productionReady, false);
assert.equal(dispatch.privacyClaimAllowed, false);
assert.equal(dispatch.privacyTransportReady, false);
assert.equal(dispatch.providerMutationAllowed, false);
assert.equal(dispatch.reviewerAccepted, false);
assert.equal(dispatch.secretPolicy, "references-only-no-secret-values");
assert.equal(dispatch.repository?.owner, "williamclay8");
assert.equal(dispatch.repository?.name, "Vanta");
assert.equal(dispatch.repository?.dispatchBranch, "codex/relayer-privacy-transport-review-dispatch");
assert.equal(dispatch.renderWorkspace?.workspaceId, "tea-d7j37af7f7vs739ii8rg");
assert.equal(dispatch.relayerService?.serviceId, "srv-d7jg9jrbc2fs73c161gg");
assert.equal(dispatch.latestRelayerDeploy?.status, "update_failed");
assertIncludes(
  dispatch.latestRelayerDeploy?.failClosedReason ?? "",
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED=true",
  "latest relayer deploy blocker",
);
assert.equal(dispatch.latestRelayerDeploy?.jitterBatchingErrorObserved, false);
assert.equal(dispatch.latestRelayerDeploy?.stalePostgresHostObserved, false);
assert.equal(
  dispatch.githubReviewIssue?.title,
  "External review: Private Pool v2 relayer privacy transport refs-only evidence",
);
assert.ok(
  /^https:\/\/github\.com\/williamclay8\/Vanta\/issues\/\d+$/u.test(dispatch.githubReviewIssue?.url ?? ""),
  "Dispatch must record the GitHub review issue URL.",
);
assert.ok(Number.isInteger(dispatch.githubReviewIssue?.number), "Dispatch must record GitHub issue number.");
assert.ok(dispatch.githubReviewIssue.number > 0, "GitHub issue number must be positive.");
assert.equal(dispatch.githubReviewIssue?.state, "open");
assert.equal(dispatch.requestedReviewMode, "tor-onion-first-blinded-token-alternate");
assertNoSecretMaterial(dispatch, dispatchPath);
assertNoSecretMaterial(issueBody, issueBodyPath);

assert.deepEqual(dispatch.dispatchRefs, {
  issueBodyRef: issueBodyPath,
  acquisitionPacketRef: acquisitionPath,
  humanRequestRef: requestPath,
  torOnionTemplateRef: torTemplatePath,
  blindedTokenTemplateRef: blindedTemplatePath,
  closurePacketRef: closurePath,
});

for (const field of [
  "deploymentRef",
  "logRedactionReviewRef",
  "retentionPolicyRef",
  "reviewerAcceptanceRef",
]) {
  assert.ok(dispatch.requiredReturnRefs?.common?.includes(field), `Missing common return ref ${field}.`);
}
for (const field of [
  "torOnion.onionHostFingerprintRef",
  "torOnion.onionServiceRef",
  "torOnion.reverseProxyRedactionRef",
]) {
  assert.ok(dispatch.requiredReturnRefs?.torOnion?.includes(field), `Missing Tor return ref ${field}.`);
}
for (const field of [
  "blindedToken.issuerRef",
  "blindedToken.verifierRef",
  "blindedToken.tokenFamilyRef",
  "blindedToken.replayCacheRef",
]) {
  assert.ok(dispatch.requiredReturnRefs?.blindedToken?.includes(field), `Missing blinded-token return ref ${field}.`);
}

for (const marker of [
  "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH=<reviewed-json>",
  "Recommended first path: Tor onion ingress.",
  "Alternate path: blinded-token / Privacy Pass-style ingress.",
  "Do not post or attach raw database URLs",
  "RENDER_API_KEY=<render-api-key> npm run mainnet:render-relayer-privacy-transport-env-status -- --require-ready",
]) {
  assertIncludes(issueBody, marker, issueBodyPath);
}

assert.equal(
  acquisition.reviewDispatch?.dispatchPacketRef,
  dispatchPath,
  "Acquisition packet must point to dispatch packet.",
);
assert.equal(
  acquisition.reviewDispatch?.githubIssueUrl,
  dispatch.githubReviewIssue.url,
  "Acquisition packet must record GitHub issue URL.",
);
assert.equal(acquisition.reviewDispatch?.providerMutationAllowed, false);
assert.equal(
  closure.acquisitionRequest?.reviewDispatchPacketRef,
  dispatchPath,
  "Closure packet must point to dispatch packet.",
);
assert.equal(
  closure.acquisitionRequest?.githubReviewIssueUrl,
  dispatch.githubReviewIssue.url,
  "Closure packet must record GitHub issue URL.",
);

assert.equal(
  packageJson.scripts["relayer:privacy-transport-review-dispatch-check"],
  "node scripts/check-vanta-private-pool-v2-relayer-privacy-transport-review-dispatch.mjs",
);
for (const compositeName of ["private-pool-v2:verify", "mainnet:preflight"]) {
  assertIncludes(
    packageJson.scripts[compositeName],
    "npm run relayer:privacy-transport-review-dispatch-check",
    compositeName,
  );
}

console.log(
  JSON.stringify(
    {
      githubIssueUrl: dispatch.githubReviewIssue.url,
      ok: true,
      providerMutationAllowed: false,
      reviewerAccepted: false,
      status: dispatch.status,
    },
    null,
    2,
  ),
);
