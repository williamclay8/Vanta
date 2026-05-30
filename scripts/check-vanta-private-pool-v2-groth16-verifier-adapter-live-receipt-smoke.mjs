import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const runScriptPath = "scripts/run-vanta-private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.mjs";
const templatePath = "ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.template.json";
const adapterEvidencePath = "ops/mainnet/private-pool-v2-groth16-verifier-adapter-artifact.evidence.json";

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(
    `private-pool-v2 Groth16 verifier adapter live receipt smoke check: FAIL - ${message}`,
  );
  process.exit(1);
}

function includes(source, marker, label) {
  if (!source.includes(marker)) {
    fail(`${label} missing marker: ${marker}`);
  }
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const runScript = read(runScriptPath);
const template = JSON.parse(read(templatePath));
const adapterEvidence = JSON.parse(read(adapterEvidencePath));
const servicesManifest = JSON.parse(read("ops/mainnet/private-pool-v2-services.manifest.json"));

assert.ok(
  scripts["private-pool-v2:groth16-verifier-adapter-live-receipt-smoke"] ===
    `node ${runScriptPath}`,
  "package.json must expose private-pool-v2:groth16-verifier-adapter-live-receipt-smoke",
);
assert.ok(
  scripts["private-pool-v2:groth16-verifier-adapter-live-receipt-smoke-write"] ===
    "node scripts/run-vanta-private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.mjs --write-evidence",
  "package.json must expose private-pool-v2:groth16-verifier-adapter-live-receipt-smoke-write",
);
assert.ok(
  scripts["private-pool-v2:groth16-verifier-adapter-live-receipt-smoke-check"] ===
    "node scripts/check-vanta-private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.mjs",
  "package.json must expose private-pool-v2:groth16-verifier-adapter-live-receipt-smoke-check",
);

includes(runScript, "formatSolUnshieldIntentMessage", runScriptPath);
includes(runScript, "/unshield/sol", runScriptPath);
includes(runScript, "groth16VerifierAdapterStatus", runScriptPath);
includes(runScript, "gnarkProofSource", runScriptPath);
includes(runScript, "gnarkUsesScaffoldProof", runScriptPath);
includes(runScript, "groth16-verifier-adapter-artifact", runScriptPath);
includes(runScript, "local-unsafe", runScriptPath);
includes(runScript, "not production", runScriptPath);

assert.equal(
  template.version,
  "vanta-private-pool-v2-groth16-verifier-adapter-live-receipt-smoke-template-0.1",
  "live receipt smoke template version mismatch",
);
assert.equal(template.productionReady, false, "template productionReady must remain false");
assert.equal(template.endpoint, "/unshield/sol", "template endpoint mismatch");
assert.equal(
  template.operatorUrlRef,
  "VANTA_PRIVATE_POOL_V2_OPERATOR_URL or ops/mainnet/private-pool-v2-services.manifest.json#operator",
  "template operatorUrlRef mismatch",
);
assert.equal(
  template.adapterEvidenceRef,
  adapterEvidencePath,
  "template adapterEvidenceRef mismatch",
);
assert.ok(
  template.requiredVerificationCommands.includes(
    "npm run private-pool-v2:groth16-verifier-adapter-live-receipt-smoke",
  ),
  "template must require the live receipt smoke command",
);
assert.ok(
  template.requiredVerificationCommands.includes(
    "npm run private-pool-v2:groth16-verifier-adapter-live-receipt-smoke-check",
  ),
  "template must require the live receipt smoke wiring check",
);

assert.ok(
  servicesManifest.releaseGates.includes(
    "npm run private-pool-v2:groth16-verifier-adapter-live-receipt-smoke",
  ),
  "services manifest releaseGates must include the live Groth16 receipt smoke command",
);

assert.ok(
  adapterEvidence.canonicalCommands.includes(
    "npm run private-pool-v2:groth16-verifier-adapter-live-receipt-smoke",
  ),
  "Groth16 adapter evidence canonicalCommands must include live receipt smoke",
);

if (existsSync(resolve(repoRoot, "ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.evidence.json"))) {
  const liveEvidence = JSON.parse(
    read("ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.evidence.json"),
  );
  assert.equal(
    liveEvidence.version,
    "vanta-private-pool-v2-groth16-verifier-adapter-live-receipt-smoke-evidence-0.1",
    "checked-in live evidence version mismatch",
  );
  assert.equal(liveEvidence.productionReady, false, "checked-in live evidence productionReady must remain false");
}

console.log("private-pool-v2 Groth16 verifier adapter live receipt smoke check: PASS");
