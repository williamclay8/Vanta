import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const discoveryPath = resolve(repoRoot, "public/.well-known/vanta-audit.json");
const auditPackagePath = resolve(repoRoot, "docs/audit-package.md");
const packageJsonPath = resolve(repoRoot, "package.json");

const requiredRefs = [
  "SECURITY_LIMITATIONS.md",
  "docs/audit-package.md",
  "VANTA_ZK_REVIEW.findings.json",
  "docs/zk/c01-production-verifier-backend-decision.md",
  "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "ops/mainnet/audit-review.packet.template.json",
  "ops/mainnet/legal-compliance-custody.packet.template.json",
  "ops/mainnet/production-key-custody.template.json",
  "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertRelativeRepoRef(ref) {
  assert.equal(typeof ref, "string", `Expected ref to be a string: ${String(ref)}`);
  assert.ok(ref.length > 0, "Refs must be non-empty.");
  assert.ok(!isAbsolute(ref), `Ref must be relative, not absolute: ${ref}`);
  assert.ok(!ref.includes("://"), `Ref must be repo-local, not a URL: ${ref}`);
  assert.ok(!ref.startsWith("../"), `Ref must stay inside the repo: ${ref}`);
  assert.ok(!ref.includes("/../"), `Ref must stay inside the repo: ${ref}`);
  assert.ok(existsSync(resolve(repoRoot, ref)), `Ref must point to an existing repo path: ${ref}`);
}

function walk(value, visitor, path = "$") {
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, visitor, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      visitor(key, `${path}.${key}#key`);
      walk(entry, visitor, `${path}.${key}`);
    }
  }
}

function isRepoRefKey(key) {
  return (
    /(?:Ref|Refs|Package|Ledger|Decision|Template|Templates)$/u.test(key) ||
    key === "securityLimitations"
  );
}

function assertRepoRefsForKey(key, value, path) {
  if (!isRepoRefKey(key)) {
    return;
  }
  if (typeof value === "string") {
    assertRelativeRepoRef(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      assert.equal(typeof entry, "string", `${path}[${index}] must be a repo-local ref string.`);
      assertRelativeRepoRef(entry);
    });
  }
}

function walkRepoRefs(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkRepoRefs(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertRepoRefsForKey(key, entry, `${path}.${key}`);
      walkRepoRefs(entry, `${path}.${key}`);
    }
  }
}

assert.ok(existsSync(discoveryPath), "Missing public/.well-known/vanta-audit.json.");
assert.ok(existsSync(auditPackagePath), "Missing docs/audit-package.md.");

const discoverySource = readFileSync(discoveryPath, "utf8");
const discovery = JSON.parse(discoverySource);
const auditPackage = readFileSync(auditPackagePath, "utf8");
const packageJson = readJson(packageJsonPath);

assert.equal(
  packageJson.scripts["public:audit-discovery-check"],
  "node scripts/check-vanta-public-audit-discovery.mjs",
  "package.json must expose public:audit-discovery-check.",
);
assert.ok(
  packageJson.scripts["audit:package-check"]?.includes("npm run public:audit-discovery-check"),
  "audit:package-check must include public:audit-discovery-check.",
);

assert.equal(discovery.schemaVersion, "vanta-public-audit-discovery-0.1");
assert.equal(discovery.path, "/.well-known/vanta-audit.json");
assert.equal(discovery.auditClaimAllowed, false);
assert.equal(discovery.thirdPartyAuditAccepted, false);
assert.equal(discovery.productionReady, false);
assert.equal(discovery.mainnetReady, false);
assert.equal(discovery.liveDeploymentVerified, false);
assert.equal(discovery.privacyClaimAllowed, false);
assert.equal(discovery.anonymityClaimAllowed, false);
assert.equal(discovery.refsOnly, true);

assert.equal(discovery.securityLimitations, "SECURITY_LIMITATIONS.md");
assert.equal(discovery.auditPackage, "docs/audit-package.md");
assert.equal(discovery.findingLedger, "VANTA_ZK_REVIEW.findings.json");
assert.equal(
  discovery.proofBoundaries?.c01VerifierBackendDecision,
  "docs/zk/c01-production-verifier-backend-decision.md",
);
assert.equal(
  discovery.proofBoundaries?.c01VerifierCandidateEvidence,
  "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
);
assert.equal(
  discovery.proofBoundaries?.c01VerifierAdapterTestCandidateEvidence,
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
);
assert.equal(discovery.proofBoundaries?.offchainProofArtifactOnly, true);
assert.equal(discovery.proofBoundaries?.solanaC01Groth16VerifierReady, false);
assert.equal(discovery.proofBoundaries?.productionVerifierBackendSelected, false);

assert.deepEqual(discovery.intakeTemplates, [
  "ops/mainnet/audit-review.packet.template.json",
  "ops/mainnet/legal-compliance-custody.packet.template.json",
  "ops/mainnet/production-key-custody.template.json",
]);

for (const ref of requiredRefs) {
  assert.ok(discoverySource.includes(ref), `Discovery JSON must include required ref: ${ref}`);
  assertRelativeRepoRef(ref);
}

const publicDepthBlocker = discovery.currentBlockers?.find(
  (blocker) => blocker?.id === "public-anonymity-depth",
);
assert.ok(publicDepthBlocker, "Discovery JSON must include public-anonymity-depth blocker.");
assert.equal(publicDepthBlocker.status, "blocked");
assert.equal(publicDepthBlocker.currentDistinctCommitments, 2);
assert.equal(publicDepthBlocker.minimumDistinctCommitments, 1024);
assert.equal(
  publicDepthBlocker.evidenceRef,
  "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
);

for (const id of ["audit-acceptance", "production-verifier", "live-deployment-evidence"]) {
  assert.ok(
    discovery.currentBlockers?.some((blocker) => blocker?.id === id && blocker.status === "blocked"),
    `Discovery JSON must preserve blocker: ${id}`,
  );
}
const productionVerifierBlocker = discovery.currentBlockers?.find(
  (blocker) => blocker?.id === "production-verifier",
);
assert.equal(
  productionVerifierBlocker?.evidenceRef,
  "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
);

for (const command of [
  "npm run public:audit-discovery-check",
  "npm run audit:package-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run zk:feedback-loop-check",
  "npm run truth:privacy-claim-gate",
  "npm run build",
]) {
  assert.ok(discovery.safeCommands?.includes(command), `Discovery JSON must include command: ${command}`);
}

for (const phrase of [
  "/.well-known/vanta-audit.json",
  "refs-only public discovery",
  "auditClaimAllowed: false",
  "productionReady: false",
  "mainnetReady: false",
  "npm run public:audit-discovery-check",
  "not an audit report",
  "not third-party approval",
  "not production readiness",
]) {
  assert.ok(auditPackage.includes(phrase), `docs/audit-package.md is missing public discovery phrase: ${phrase}`);
}

const forbiddenClaimPhrases = [
  "audited",
  "certified",
  "third-party approved",
  "production-ready",
  "mainnet-ready",
  "fully private",
  "anonymous settlement",
  "untraceable",
];

const lowerDiscovery = discoverySource.toLowerCase();
for (const phrase of forbiddenClaimPhrases) {
  assert.ok(!lowerDiscovery.includes(phrase), `Discovery JSON must not overclaim with phrase: ${phrase}`);
}

const forbiddenContentPatterns = [
  /\bprivate[_ -]?key\b/iu,
  /\bseed[_ -]?phrase\b/iu,
  /\bmnemonic\b/iu,
  /\bsecret[_ -]?value\b/iu,
  /\bsigned[_ -]?transaction(?:[_ -]?bytes?)?\b/iu,
  /\bcustomer[_ -]?private[_ -]?inputs?\b/iu,
  /\breport[_ -]?bod(?:y|ies)\b/iu,
  /\blegal[_ -]?text\b/iu,
  /\braw[_ -]?witness\b/iu,
  /\bwitness[_ -]?material\b/iu,
  /\bprovider[_ -]?credentials?\b/iu,
  /\blive[_ -]?provider\b/iu,
  /\bunder[_ -]?nda\b/iu,
];

const secretValuePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bBearer\s+[A-Za-z0-9._=-]{20,}\b/u,
  /\b(?:sk|pk|secret|api[_-]?key|token)_(?:live|prod|mainnet)_[A-Za-z0-9]{12,}\b/u,
  /\b(?:gh[pousr]|xox[baprs])[-_][A-Za-z0-9_-]{20,}\b/u,
];

walk(discovery, (value, path) => {
  if (typeof value !== "string") {
    return;
  }
  for (const forbidden of forbiddenContentPatterns) {
    assert.ok(
      !forbidden.test(value),
      `Discovery JSON must not include secret/report/witness content marker at ${path}; use refs-only metadata.`,
    );
  }
  for (const pattern of secretValuePatterns) {
    assert.ok(
      !pattern.test(value),
      `Discovery JSON appears to include a secret-shaped value at ${path}; use refs-only metadata.`,
    );
  }
});

walkRepoRefs(discovery);

console.log("Vanta public audit discovery check: PASS");
