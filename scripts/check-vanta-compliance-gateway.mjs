import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function sourceOf(path) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${path}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireMarkers(path, markers) {
  const source = sourceOf(path);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker "${marker}" in ${path}`);
    }
  }
  return source;
}

// Run the demo and capture output (functional verification)
console.log("Running demo-compliance-gateway.mjs for end-to-end verification...");
let demoOutput = "";
try {
  demoOutput = execSync("node scripts/demo-compliance-gateway.mjs", {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15000
  });
  console.log(demoOutput);
} catch (e) {
  failures.push(`Demo execution failed: ${e.message}`);
  if (e.stdout) console.error(e.stdout);
}

// Basic assertions on demo success (TDD-style)
assert.ok(demoOutput.includes("DEMO COMPLETE: SUCCESS"), "Demo must report SUCCESS");
assert.ok(demoOutput.includes("Valid: true"), "Verification must be valid");
assert.ok(demoOutput.includes("Proofs verified: 2"), "Both proofs must verify");
assert.ok(demoOutput.includes("Proof envelope mode:"), "Proof envelope boundary must be shown");
assert.ok(demoOutput.includes("public-packet-redacted-verifier-local-opening-stub-held-out"), "Public packet must keep opening stub held out");
assert.ok(demoOutput.includes("beta-selective-disclosure-not-production-private-or-regulator-approved"), "Claim boundary must be present and correct");

// No leak checks on demo output
const bannedLeaks = ["buyer@institution.example", "evidence_secret", "customerEmail", "150.00", "verifierLocalOpeningStub"];
for (const leak of bannedLeaks) {
  assert.ok(!demoOutput.includes(leak), `Leak detected in demo output: ${leak}`);
}

// File and marker checks (extend the institutional pattern)
requireMarkers("scripts/demo-compliance-gateway.mjs", [
  "Vanta Compliance Gateway Demo",
  "createDisclosureRequest",
  "issueSelectiveDisclosure",
  "verifySelectiveDisclosure",
  "proofEnvelope",
  "publicPacket",
  "verifierLocalOpeningStub",
  "realNoirProof",
  "DEMO COMPLETE: SUCCESS",
  "claimBoundary",
]);

requireMarkers("src/compliance/vantaComplianceGateway.ts", [
  "VANTA_COMPLIANCE_GATEWAY_SCHEMA_VERSION",
  "amountAboveThreshold",
  "jurisdictionMatch",
  "selectiveProofs",
  "VantaComplianceProofEnvelope",
  "publicPacket",
  "verifierLocalOpeningStub",
  "realNoirProof",
  "toPublicGatewayDisclosurePacket",
  "proofMaterialPubliclyDisclosed",
  "npm run zk:selective-disclosure-circuit-check",
  "beta-selective-disclosure-not-production-private-or-regulator-approved",
]);

requireMarkers("package.json", [
  "compliance:gateway-check",
  "zk:selective-disclosure-circuit-check",
  "zk:phase2-product-circuits-check",
  "zk:phase2-product-proof-requests-check",
]);

// Banned claim checks (Vanta culture)
const bannedClaims = [
  "Fully private",
  "Regulator-approved",
  "Compliance-safe",
  "Production private",
  "Live mainnet private settlement",
];
for (const sourcePath of [
  "scripts/demo-compliance-gateway.mjs",
  "src/compliance/vantaComplianceGateway.ts",
]) {
  const src = sourceOf(sourcePath);
  for (const banned of bannedClaims) {
    if (src.includes(banned)) {
      failures.push(`Banned claim in ${sourcePath}: ${banned}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Compliance Gateway check: FAIL");
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}

console.log("Vanta Compliance Gateway check: PASS");
console.log("All functional flows, no leaks, claims fail-closed, markers present.");
