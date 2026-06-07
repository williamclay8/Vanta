import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  assertNoLeaksInCommitment,
  checkPrivateLiquidation,
  openPrivatePosition,
  toPublicPrivatePerpsPositionPacket,
  updatePositionWithNullifier,
} from "../src/perps/vantaPrivatePerpsEngine.ts";

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
console.log("Running demo-vanta-private-perps-mvp.mjs for end-to-end verification...");
let demoOutput = "";
try {
  demoOutput = execSync("node scripts/demo-vanta-private-perps-mvp.mjs", {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15000
  });
  console.log(demoOutput);
} catch (e) {
  failures.push(`Demo execution failed: ${e.message}`);
  if (e.stdout) console.error(e.stdout);
}

// Basic assertions on demo success (TDD-style, adapted from compliance gateway pattern)
assert.ok(demoOutput.includes("DEMO COMPLETE: SUCCESS"), "Demo must report SUCCESS");
assert.ok(demoOutput.includes("Liquidatable:"), "Liquidation predicate checks must be present");
assert.ok(demoOutput.includes("beta-shielded-perps-not-production-private-derivatives-or-settlement"), "Claim boundary must be present and correct");
assert.ok(demoOutput.includes("Nullifier (for private updates):"), "Nullifier for private updates must be demonstrated");
assert.ok(demoOutput.includes("Settlement ref:"), "Pay/Private Pool settlement hook must be present");

// No leak checks on demo output (critical private perps *values* only - not descriptive words)
const bannedLeaks = ["50000", "secret-position-key-xxx-2026", "ownerSecret", "privateWitness"];
for (const leak of bannedLeaks) {
  assert.ok(!demoOutput.includes(leak), `Leak detected in demo output: ${leak}`);
}

const modulePrivatePosition = {
  notional: "50000",
  leverage: "5",
  entryPrice: "150.00",
  collateralAsset: "USDC",
  collateralAmount: "10000",
  ownerSecret: "secret-position-key-xxx-2026",
};
const moduleOpened = openPrivatePosition(modulePrivatePosition);
const modulePublicOpened = toPublicPrivatePerpsPositionPacket(moduleOpened);
const moduleUpdated = updatePositionWithNullifier(
  moduleOpened,
  "45000",
  "148.50",
  modulePrivatePosition.ownerSecret,
);
const modulePublicUpdated = toPublicPrivatePerpsPositionPacket(moduleUpdated);
assert.ok(moduleOpened.privateWitness.blinding, "Module commitment must keep prover-side blinding in privateWitness");
assertNoLeaksInCommitment(modulePublicOpened, modulePrivatePosition);
assertNoLeaksInCommitment(modulePublicUpdated, modulePrivatePosition);
assert.ok(
  !JSON.stringify(modulePublicOpened).includes("privateWitness"),
  "Perps public packet must not include privateWitness",
);
const moduleLiquidationAdverse = checkPrivateLiquidation(moduleOpened, "142.00");
const moduleLiquidationSafe = checkPrivateLiquidation(moduleOpened, "155.00");
assert.equal(moduleLiquidationAdverse.isLiquidatable, true, "Adverse demo price must be liquidatable");
assert.equal(moduleLiquidationSafe.isLiquidatable, false, "Safe demo price must not be liquidatable");

// File and marker checks (extend the perps + institutional pattern)
requireMarkers("scripts/demo-vanta-private-perps-mvp.mjs", [
  "Vanta Private Perps Engine Demo",
  "openPrivatePosition",
  "checkPrivateLiquidation",
  "updatePositionWithNullifier",
  "createPerpsSettlementStub",
  "DEMO COMPLETE: SUCCESS",
  "claimBoundary",
  "beta-shielded-perps-not-production-private-derivatives-or-settlement",
]);

requireMarkers("src/perps/vantaPrivatePerpsEngine.ts", [
  "VANTA_PRIVATE_PERPS_ENGINE_SCHEMA_VERSION",
  "VantaPrivatePositionCommitment",
  "VantaPrivatePositionPublicPacket",
  "openPrivatePosition",
  "checkPrivateLiquidation",
  "updatePositionWithNullifier",
  "createPerpsSettlementStub",
  "toPublicPrivatePerpsPositionPacket",
  "privateWitness",
  "beta-shielded-perps-not-production-private-derivatives-or-settlement",
]);

requireMarkers("package.json", [
  "private-perps:check",
]);

// Banned claim checks (Vanta culture - same as compliance + perps-specific)
const bannedClaims = [
  "Fully private",
  "Regulator-approved",
  "Compliance-safe",
  "Production private",
  "Live mainnet private settlement",
  "Production-ready private derivatives",
  "Fully shielded perps",
];
for (const sourcePath of [
  "scripts/demo-vanta-private-perps-mvp.mjs",
  "src/perps/vantaPrivatePerpsEngine.ts",
]) {
  const src = sourceOf(sourcePath);
  for (const banned of bannedClaims) {
    if (src.includes(banned)) {
      failures.push(`Banned claim in ${sourcePath}: ${banned}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Private Perps Engine check: FAIL");
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}

console.log("Vanta Private Perps Engine check: PASS");
console.log("All functional flows, no leaks, claims fail-closed, markers present, shield/Pay integration hooks verified.");
