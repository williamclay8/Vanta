import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRequired(relativePath) {
  const path = resolve(repoRoot, relativePath);
  assert.ok(existsSync(path), `Missing ${relativePath}.`);
  return readFileSync(path, "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readRequired(relativePath));
}

const packageJson = readJson("package.json");
const appSource = readRequired("src/App.tsx");
const homeSource = readRequired("src/pages/HomePage.tsx");
const manifestoSource = readRequired("src/pages/ManifestoPage.tsx");
const auditAlias = readJson("public/.well-known/audit");

assert.equal(
  packageJson.scripts["public:manifesto-check"],
  "node scripts/check-vanta-public-manifesto.mjs",
  "package.json must expose public:manifesto-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run public:manifesto-check"),
  "truth:privacy-claim-gate must include public:manifesto-check.",
);
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"]?.includes("npm run public:manifesto-check"),
  "zk:feedback-loop-check must include public:manifesto-check.",
);

for (const phrase of [
  "ManifestoPage",
  'path="/manifesto"',
  "<ManifestoPage />",
]) {
  assert.ok(appSource.includes(phrase), `App route must include ${phrase}.`);
}

assert.ok(homeSource.includes('to="/manifesto"'), "Home nav must link to /manifesto.");

for (const phrase of [
  "data-vanta-manifesto-page",
  "data-vanta-manifesto-credo",
  "Vanta Manifesto",
  "privacy is a precondition for being a person",
  "We will tell you when we cannot do that yet",
  "We will not pretend to do it when we cannot",
  "Production privacy is not enabled",
  "not an audit report",
  "npm run public:manifesto-check",
  "/.well-known/audit",
]) {
  assert.ok(manifestoSource.includes(phrase), `Manifesto page must include ${phrase}.`);
}

for (const phrase of [
  "anonymous payments",
  "untraceable",
  "fully private",
  "production-ready",
  "mainnet-ready",
  "live mainnet-private",
  "audited",
  "certified",
]) {
  assert.ok(
    !manifestoSource.toLowerCase().includes(phrase.toLowerCase()),
    `Manifesto page must not overclaim with phrase: ${phrase}`,
  );
}

assert.equal(auditAlias.schemaVersion, "vanta-public-audit-alias-0.1");
assert.equal(auditAlias.path, "/.well-known/audit");
assert.equal(auditAlias.canonicalDiscovery, "/.well-known/vanta-audit.json");
assert.equal(auditAlias.refsOnly, true);
assert.equal(auditAlias.auditClaimAllowed, false);
assert.equal(auditAlias.thirdPartyAuditAccepted, false);
assert.equal(auditAlias.productionReady, false);
assert.equal(auditAlias.mainnetReady, false);
assert.equal(auditAlias.liveDeploymentVerified, false);
assert.equal(auditAlias.privacyClaimAllowed, false);
assert.equal(auditAlias.anonymityClaimAllowed, false);
assert.deepEqual(auditAlias.safeCommands, [
  "npm run public:audit-discovery-check",
  "npm run public:manifesto-check",
  "npm run truth:privacy-claim-gate",
]);
assert.ok(
  auditAlias.currentBlockers?.includes("See /.well-known/vanta-audit.json for current blocked gates."),
  "Audit alias must point reviewers to the canonical blocked gates.",
);

console.log("Vanta public manifesto check: PASS");
