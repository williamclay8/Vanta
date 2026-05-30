import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = "ops/mainnet/production-privacy-audit-outreach.evidence.json";
const humanPath = "ops/mainnet/audit-outreach-requests/production-privacy-audit-external-evidence-request.md";
const auditTemplatePath = "ops/mainnet/audit-review.packet.template.json";
const gatesPath = "ops/mainnet/mainnet-approval-gates.evidence.json";

function fail(message) {
  console.error(`production privacy audit outreach prep: FAIL - ${message}`);
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

function sha256Ref(path) {
  const bytes = readFileSync(resolve(repoRoot, path));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

const evidenceText = read(evidencePath);
const evidence = JSON.parse(evidenceText);
const human = read(humanPath);
const auditTemplate = readJson(auditTemplatePath);
const gates = readJson(gatesPath);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

for (const forbidden of [
  "proofBytes",
  "proofHex",
  "verifyingKeyBytes",
  "keypairBytes",
  "signedTransactionBytes",
  "-----BEGIN",
  "bearer ",
  "postgres://",
  "postgresql://",
]) {
  assert(!evidenceText.includes(forbidden), `evidence packet must not contain forbidden marker ${forbidden}`);
}

assert(
  evidence.version === "vanta-production-privacy-audit-outreach-prep-0.1",
  "version mismatch",
);
assert(
  evidence.status === "ready-for-external-audit-outreach-prep-blocked",
  "status mismatch",
);
assert(evidence.productionReady === false, "productionReady must remain false");
assert(evidence.auditClaimAllowed === false, "auditClaimAllowed must remain false");
assert(evidence.mainnetReady === false, "mainnetReady must remain false");
assert(evidence.privacyClaimAllowed === false, "privacyClaimAllowed must remain false");
assert(evidence.band7Item === 21, "band7Item must be 21");

const laneIds = (evidence.requiredReviewerLanes ?? []).map((lane) => lane.id);
assert(laneIds.includes("zk-specialist"), "missing zk-specialist lane");
assert(laneIds.includes("solana-program-specialist"), "missing solana-program-specialist lane");

for (const entry of evidence.outboundFiles ?? []) {
  assert(typeof entry.path === "string", "outbound file missing path");
  assert(existsSync(resolve(repoRoot, entry.path)), `outbound file missing ${entry.path}`);
  const expected = entry.sha256;
  if (expected) {
    assert(sha256Ref(entry.path) === expected, `sha256 drift for ${entry.path}`);
  }
}

includes(human, "Band 7 item 21", "human request");
includes(human, evidencePath, "human request");
includes(human, "audit:outreach-prep-check", "human request");
includes(human, "C01 external production verifier", "human request");
includes(human, "TAG6 native SOL live evidence", "human request");

includes(read("PRODUCTION_PRIVACY_AUDIT.md"), "Contract two independent audit firms", "PRODUCTION_PRIVACY_AUDIT");
includes(read("docs/audit-package.md"), "audit-review.packet.template.json", "audit package doc");

assert(
  auditTemplate.version === "vanta-audit-review-packet-template-0.1",
  "audit template version mismatch",
);
assert(auditTemplate.auditClaimAllowed === false, "audit template must keep auditClaimAllowed false");

const auditGate = (gates.gates ?? []).find((gate) => gate.id === "third-party-security-audit");
assert(auditGate, "mainnet approval gates missing third-party-security-audit gate");

for (const command of evidence.canonicalCommands ?? []) {
  const key = command.replace(/^npm run /, "");
  assert(typeof scripts[key] === "string", `package.json missing script ${key}`);
}

for (const ref of Object.keys(evidence.requiredReturnedExternalRefs ?? {})) {
  assert(
    evidence.requiredReturnedExternalRefs[ref] === null,
    `${ref} must remain null until external return`,
  );
  assert(
    auditTemplate.requiredReviewerRefs?.includes(ref),
    `${ref} must appear in audit-review.packet.template.json`,
  );
}

assert(
  existsSync(resolve(repoRoot, "scripts/audit-outreach/generate-audit-outreach-send-package.mjs")),
  "missing audit outreach send-package generator",
);

console.log("production privacy audit outreach prep: PASS");
console.log(`lanes: ${laneIds.join(", ")}`);
console.log(`outbound files: ${evidence.outboundFiles?.length ?? 0}`);
console.log("audit claim: blocked");
console.log("production privacy claim: blocked");
