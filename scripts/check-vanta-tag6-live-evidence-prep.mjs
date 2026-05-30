import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = "ops/mainnet/tag6-gate-requests/tag6-live-evidence-prep.evidence.json";
const runbookPath = "ops/mainnet/tag6-gate-requests/TAG6-LIVE-EVIDENCE-PREP-RUNBOOK-2026-05-30.md";
const receiptTemplatePath = "ops/mainnet/tag6-gate-requests/tag6-live-evidence-receipt.template.json";
const probePath = "scripts/native-sol-tag6/probe-sentinel-in-production-snapshot.mjs";

function fail(message) {
  console.error(`tag6 live evidence prep: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

const evidence = readJson(evidencePath);
const runbook = read(runbookPath);
const receiptTemplate = readJson(receiptTemplatePath);
const probeSource = read(probePath);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

assert(evidence.version === "vanta-tag6-live-evidence-prep-0.1", "version mismatch");
assert(
  evidence.status === "ready-for-live-evidence-collection-blocked",
  "status mismatch",
);
assert(evidence.productionReady === false, "productionReady must remain false");
assert(evidence.privacyClaimAllowed === false, "privacyClaimAllowed must remain false");
assert(evidence.liveEvidenceStatus === "not-collected", "liveEvidenceStatus must remain not-collected");
assert(evidence.probeStatus === "skeleton-only", "probeStatus must remain skeleton-only until implemented");

for (const path of evidence.scriptSurface ?? []) {
  assert(existsSync(resolve(repoRoot, path)), `script surface missing ${path}`);
}

for (const path of evidence.runbookRefs ?? []) {
  assert(existsSync(resolve(repoRoot, path)), `runbook ref missing ${path}`);
}

includes(runbook, "skeleton only", "runbook");
includes(runbook, "tag6-live-evidence-prep-checklist", "runbook");
includes(runbook, receiptTemplatePath, "runbook");
includes(probeSource, "skeleton", "probe script");

assert(receiptTemplate.productionReady === false, "receipt template must keep productionReady false");
assert(receiptTemplate.proofVerified === false, "receipt template must keep proofVerified false");

for (const command of evidence.canonicalCommands ?? []) {
  const key = command.replace(/^npm run /, "");
  assert(typeof scripts[key] === "string", `package.json missing script ${key}`);
}

assert(
  existsSync(resolve(repoRoot, "scripts/native-sol-tag6/run-tag6-live-evidence-prep-checklist.mjs")),
  "missing live evidence prep checklist runner",
);

console.log("tag6 live evidence prep: PASS");
console.log(`live evidence status: ${evidence.liveEvidenceStatus}`);
console.log(`probe status: ${evidence.probeStatus}`);
console.log(`script surface files: ${evidence.scriptSurface?.length ?? 0}`);
console.log("production privacy claim: blocked");
