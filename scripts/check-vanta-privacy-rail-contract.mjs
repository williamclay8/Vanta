import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const contractPath = resolve(repoRoot, "src/readiness/privacyRailContract.mjs");
const declarationPath = resolve(repoRoot, "src/readiness/privacyRailContract.d.mts");
const docsPath = resolve(repoRoot, "docs/privacy-rail-contract.md");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(contractPath), "Missing src/readiness/privacyRailContract.mjs.");
assert.ok(existsSync(declarationPath), "Missing src/readiness/privacyRailContract.d.mts.");
assert.ok(existsSync(docsPath), "Missing docs/privacy-rail-contract.md.");

const { createVantaPrivacyClaimDecision, createVantaPrivacyRailContract } = await import(`file://${contractPath}`);
const contract = createVantaPrivacyRailContract();
const umbraSelected = createVantaPrivacyRailContract({ activeRailId: "umbra-mainnet" });
const privatePoolSelected = createVantaPrivacyRailContract({ activeRailId: "vanta-private-pool-v2" });
const docs = readFileSync(docsPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(contract.version, "vanta-privacy-rail-contract-0.1");
assert.equal(contract.mainnetReady, false);
assert.equal(contract.productionReady, false);
assert.equal(contract.meaningfulPrivacyReady, false);
assert.equal(contract.activeRailId, "alpha-public-warning");
assert.ok(contract.userFacingRule.includes("Do not claim meaningful privacy"));
assert.equal(umbraSelected.activeRailId, "umbra-mainnet");
assert.equal(umbraSelected.activeRail.canClaimMeaningfulPrivacy, false);
assert.equal(privatePoolSelected.activeRailId, "vanta-private-pool-v2");
assert.equal(privatePoolSelected.activeRail.canClaimMeaningfulPrivacy, false);

assert.throws(
  () => createVantaPrivacyRailContract({ activeRailId: "unknown-rail" }),
  /Unknown Vanta privacy rail/,
);

const alphaDecision = createVantaPrivacyClaimDecision({
  activeRailId: "alpha-public-warning",
  requestedClaim: "meaningful-private-transaction",
});
assert.equal(alphaDecision.allowed, false);
assert.equal(alphaDecision.activeRailId, "alpha-public-warning");
assert.ok(alphaDecision.userFacingCopy.includes("experimental"));
assert.ok(alphaDecision.blockers.some((blocker) => blocker.includes("no real privacy rail selected")));

const privatePoolDecision = createVantaPrivacyClaimDecision({
  activeRailId: "vanta-private-pool-v2",
  requestedClaim: "meaningful-private-transaction",
});
assert.equal(privatePoolDecision.allowed, false);
assert.ok(privatePoolDecision.userFacingCopy.includes("not ready to claim private transactions"));

for (const railId of ["alpha-public-warning", "umbra-mainnet", "vanta-private-pool-v2"]) {
  const rail = contract.rails.find((candidate) => candidate.id === railId);
  assert.ok(rail, `Missing privacy rail ${railId}.`);
  assert.ok(Array.isArray(rail.requiredEvidence) && rail.requiredEvidence.length > 0, `${railId} needs evidence.`);
  assert.ok(Array.isArray(rail.blockers) && rail.blockers.length > 0, `${railId} needs blockers.`);
  assert.equal(rail.canClaimMeaningfulPrivacy, false, `${railId} must not claim meaningful privacy yet.`);
}

const alphaRail = contract.rails.find((candidate) => candidate.id === "alpha-public-warning");
assert.equal(alphaRail.mode, "mainnet-alpha");
assert.ok(alphaRail.blockers.some((blocker) => blocker.includes("no real privacy rail")));

const umbraRail = contract.rails.find((candidate) => candidate.id === "umbra-mainnet");
assert.ok(umbraRail.requiredEvidence.includes("VANTA_UMBRA_MAINNET_CAPABILITY_REF"));
assert.ok(umbraRail.blockers.some((blocker) => blocker.includes("Umbra mainnet")));

const privatePoolRail = contract.rails.find((candidate) => candidate.id === "vanta-private-pool-v2");
assert.ok(privatePoolRail.requiredEvidence.includes("VANTA_PRIVATE_POOL_V2_PRODUCTION_SMOKE_EVIDENCE_REF"));
assert.ok(privatePoolRail.blockers.some((blocker) => blocker.includes("no-real-funds smoke evidence")));

assert.ok(
  contract.requiredVerificationCommands.includes("npm run privacy-rail:contract-check"),
  "Privacy rail contract must include its check command.",
);
assert.ok(
  packageJson.scripts["privacy-rail:contract-check"] === "node scripts/check-vanta-privacy-rail-contract.mjs",
  "package.json must expose privacy-rail:contract-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run privacy-rail:contract-check"),
  "mainnet:preflight must include privacy-rail:contract-check.",
);

for (const phrase of [
  "# Vanta Privacy Rail Contract",
  "alpha-public-warning",
  "umbra-mainnet",
  "vanta-private-pool-v2",
  "Do not claim meaningful privacy",
  "Render does not create privacy",
  "mainnetReady: false",
  "productionReady: false",
]) {
  assert.ok(docs.includes(phrase), `docs/privacy-rail-contract.md is missing required phrase: ${phrase}`);
}

console.log("Vanta privacy rail contract check: PASS");
