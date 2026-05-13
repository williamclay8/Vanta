import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const evidencePath = "ops/mainnet/private-pool-v2-anonymity-set.evidence.json";
const modulePath = "src/privacy/privatePoolV2AnonymityDisclosure.ts";
const componentPath = "src/components/AnonymityDepthDisclosure.tsx";
const homePath = "src/pages/HomePage.tsx";
const stylesPath = "src/styles.css";
const landingBrowserCheckPath = "scripts/check-vanta-landing-browser.mjs";
const packagePath = "package.json";

for (const path of [evidencePath, modulePath, componentPath, homePath, stylesPath, landingBrowserCheckPath, packagePath]) {
  assert.ok(existsSync(resolve(repoRoot, path)), `Missing ${path}.`);
}

const evidence = JSON.parse(read(evidencePath));
const packageJson = JSON.parse(read(packagePath));
const moduleSource = read(modulePath);
const componentSource = read(componentPath);
const homeSource = read(homePath);
const stylesSource = read(stylesPath);
const browserCheckSource = read(landingBrowserCheckPath);

assert.equal(evidence.currentMeasurement.distinctCommitmentCount, 2);
assert.equal(evidence.currentMeasurement.minimumDistinctCommitments, 1024);
assert.equal(evidence.currentMeasurement.meetsMinimumDistinctCommitments, false);
assert.equal(evidence.currentMeasurement.privacyClaimAllowed, false);
assert.equal(evidence.currentMeasurement.reviewerAccepted, false);
assert.equal(evidence.currentMeasurement.status, "measured-below-threshold");

for (const required of [
  "vanta-private-pool-v2-public-depth-disclosure-0.1",
  "../../ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
  "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
  "npm run private-pool-v2:anonymity-set-readiness-check",
  "npm run private-pool-v2:anonymity-set-metrics-check",
  "npm run private-pool-v2:anonymity-set-evidence-check",
  "currentDistinctCommitmentCount",
  "minimumDistinctCommitments",
  "privacyClaimAllowed: false",
  "liveAnonymityClaimAllowed: false",
  "productionPrivacyClaimAllowed: false",
]) {
  assert.ok(moduleSource.includes(required), `Disclosure module missing ${required}.`);
}

for (const required of [
  "getVantaPrivatePoolV2AnonymityDisclosure",
  "Anonymity readiness: blocked",
  "Current pool depth is below the privacy threshold.",
  "Current reviewed spend evidence reports",
  "distinct commitments toward",
  "minimum",
  "Vanta does not claim live",
  "anonymity or production-private",
  "mainnet settlement yet",
  "Evidence-recorded commitments",
  "Required minimum",
  "sourceEvidencePath",
  "readinessCheck",
]) {
  assert.ok(componentSource.includes(required), `Disclosure component missing ${required}.`);
}

assert.ok(homeSource.includes("AnonymityDepthDisclosure"), "Home page must import/render AnonymityDepthDisclosure.");
assert.ok(
  homeSource.indexOf("<AnonymityDepthDisclosure />") > homeSource.indexOf("landing-minimal__hero") &&
    homeSource.indexOf("<AnonymityDepthDisclosure />") < homeSource.indexOf("id=\"what\""),
  "Home page must render the disclosure between the hero and What it does section.",
);

for (const required of [
  ".landing-depth-disclosure",
  ".landing-depth-disclosure__copy",
  ".landing-depth-disclosure__metrics",
  ".landing-depth-disclosure__evidence",
  "font-variant-numeric: tabular-nums",
]) {
  assert.ok(stylesSource.includes(required), `Styles missing ${required}.`);
}

for (const required of [
  "hasPublicDepthDisclosure",
  "anonymity readiness: blocked",
  "Current pool depth is below the privacy threshold.",
  "1,024",
  "evidence-recorded commitments",
  "required minimum",
  "Vanta does not claim live anonymity or production-private mainnet settlement yet",
]) {
  assert.ok(browserCheckSource.includes(required), `Landing browser check missing ${required}.`);
}

assert.equal(
  packageJson.scripts["private-pool-v2:public-depth-disclosure-check"],
  "node scripts/check-vanta-private-pool-v2-public-depth-disclosure.mjs",
  "package.json must expose private-pool-v2:public-depth-disclosure-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes(
    "npm run private-pool-v2:public-depth-disclosure-check",
  ),
  "truth:privacy-claim-gate must include the public-depth disclosure check.",
);
assert.equal(
  packageJson.scripts["landing:anonymity-disclosure-check"],
  "npm run private-pool-v2:public-depth-disclosure-check",
  "package.json must expose landing:anonymity-disclosure-check.",
);
assert.ok(
  packageJson.scripts["zk:review-guards-check"]?.includes(
    "npm run private-pool-v2:public-depth-disclosure-check",
  ),
  "zk:review-guards-check must include the public-depth disclosure check.",
);
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"]?.includes(
    "npm run private-pool-v2:public-depth-disclosure-check",
  ),
  "zk:feedback-loop-check must include the public-depth disclosure check.",
);

const safeDisclosureText = [moduleSource, componentSource, homeSource].join("\n");
for (const forbidden of [
  /\bguaranteed anonymity\b/iu,
  /\banonymous payments?\b/iu,
  /\bfully anonymous\b/iu,
  /\buntraceable\b/iu,
  /\bproduction[-\s]?ready\b/iu,
  /\bmainnet[-\s]?ready\b/iu,
  /\bmeaningfully private\b/iu,
  /\byour deposit joins\b/iu,
  /\blive depth oracle\b/iu,
]) {
  assert.ok(!forbidden.test(safeDisclosureText), `Public depth disclosure includes forbidden claim: ${forbidden}`);
}

console.log("Vanta Private Pool v2 public depth disclosure check: PASS");
