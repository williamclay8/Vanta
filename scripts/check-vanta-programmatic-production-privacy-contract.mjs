import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaProgrammaticProductionPrivacyContract } from "../src/readiness/programmaticProductionPrivacyContract.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

for (const path of [
  "src/readiness/programmaticProductionPrivacyContract.mjs",
  "src/readiness/programmaticProductionPrivacyContract.d.mts",
  "scripts/print-vanta-programmatic-production-privacy-contract.mjs",
  "scripts/run-vanta-programmatic-privacy-loop.mjs",
  "scripts/check-vanta-actual-private-settlement-lineage.mjs",
  "scripts/print-vanta-shared-cohort-settlement-next-action.mjs",
  "scripts/check-vanta-shared-cohort-settlement-next-action.mjs",
]) {
  assert.ok(existsSync(resolve(repoRoot, path)), `Missing ${path}.`);
}

assert.equal(
  packageJson.scripts["programmatic-privacy:contract"],
  "node scripts/print-vanta-programmatic-production-privacy-contract.mjs",
  "package.json must expose programmatic-privacy:contract.",
);
assert.equal(
  packageJson.scripts["programmatic-privacy:contract-json"],
  "node scripts/print-vanta-programmatic-production-privacy-contract.mjs --json",
  "package.json must expose programmatic-privacy:contract-json.",
);
assert.equal(
  packageJson.scripts["programmatic-privacy:contract-check"],
  "node scripts/check-vanta-programmatic-production-privacy-contract.mjs",
  "package.json must expose programmatic-privacy:contract-check.",
);
assert.equal(
  packageJson.scripts["programmatic-privacy:loop-100"],
  "node scripts/run-vanta-programmatic-privacy-loop.mjs --iterations 100 --check",
  "package.json must expose programmatic-privacy:loop-100.",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-lineage-check"],
  "node scripts/check-vanta-actual-private-settlement-lineage.mjs",
  "package.json must expose mainnet:actual-private-settlement-lineage-check.",
);
assert.equal(
  packageJson.scripts["mainnet:shared-cohort-next-action"],
  "node scripts/print-vanta-shared-cohort-settlement-next-action.mjs",
  "package.json must expose mainnet:shared-cohort-next-action.",
);
assert.equal(
  packageJson.scripts["mainnet:shared-cohort-next-action-check"],
  "node scripts/check-vanta-shared-cohort-settlement-next-action.mjs",
  "package.json must expose mainnet:shared-cohort-next-action-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run programmatic-privacy:contract-check"),
  "mainnet:preflight must include the programmatic production privacy contract check.",
);

const contract = createVantaProgrammaticProductionPrivacyContract();

assert.equal(contract.version, "vanta-programmatic-production-privacy-contract-0.1");
assert.equal(contract.selectedRailId, "vanta-private-pool-v2");
assert.equal(contract.productionPrivateReady, false);
assert.equal(contract.privacyClaimAllowed, false);
assert.equal(contract.mainnetReady, false);
assert.ok(contract.definition.includes("shared private state"));
assert.ok(contract.definition.includes("receipt-verifiable commitments/transcripts"));
assert.ok(contract.currentTruth.includes("fail closed"));
assert.ok(contract.userFacingRule.includes("Do not call Vanta production-private"));

const requirements = new Map(contract.requirements.map((requirement) => [requirement.id, requirement]));

for (const id of [
  "fail-closed-privacy-claims",
  "live-shared-pool-settlement",
  "commitment-only-public-transcript",
  "proof-bound-settlement-receipt",
  "production-replay-resistance",
  "relayer-separation",
  "audited-shared-anonymity",
  "counterparty-verifiable-receipts",
  "bounded-mainnet-authority",
  "external-review-custody-and-limitations",
]) {
  assert.ok(requirements.has(id), `Missing requirement ${id}.`);
}

assert.equal(requirements.get("fail-closed-privacy-claims").status, "satisfied");
assert.equal(requirements.get("live-shared-pool-settlement").status, "blocked");
assert.equal(requirements.get("relayer-separation").status, "blocked");
assert.equal(requirements.get("audited-shared-anonymity").status, "blocked");
assert.equal(requirements.get("bounded-mainnet-authority").status, "blocked");
assert.equal(requirements.get("counterparty-verifiable-receipts").status, "partially-satisfied");

assert.ok(
  requirements
    .get("audited-shared-anonymity")
    .requiredEvidenceRefs.includes("VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF"),
  "Audited anonymity requirement must name the anonymity-set evidence ref.",
);
assert.ok(
  requirements
    .get("counterparty-verifiable-receipts")
    .requiredEvidenceRefs.includes("npm run shield:trust-packet-check"),
  "Receipt requirement must name the Shield trust-packet check.",
);
assert.ok(
  requirements
    .get("counterparty-verifiable-receipts")
    .requiredEvidenceRefs.includes("npm run send:trust-packet-check"),
  "Receipt requirement must name the Send trust-packet check.",
);
assert.ok(
  requirements
    .get("counterparty-verifiable-receipts")
    .requiredEvidenceRefs.includes("npm run unshield:trust-packet-check"),
  "Receipt requirement must name the Unshield trust-packet check.",
);
assert.ok(
  requirements
    .get("counterparty-verifiable-receipts")
    .requiredEvidenceRefs.includes("npm run pay:receipt-privacy-contract-check"),
  "Receipt requirement must name the Pay receipt privacy check.",
);
assert.ok(
  requirements
    .get("live-shared-pool-settlement")
    .requiredEvidenceRefs.includes("npm run mainnet:shared-cohort-next-action-check"),
  "Live shared pool requirement must name the shared-cohort next-action check.",
);
assert.equal(contract.currentSignals.liveMainnetPrivateSettlementAvailable, false);
assert.equal(contract.currentSignals.meaningfulPrivacyReady, false);
assert.equal(contract.currentSignals.auditedSharedAnonymitySetAvailable, false);
assert.equal(contract.currentSignals.minimumDistinctCommitments, 1024);
assert.ok(
  contract.currentSignals.currentDistinctCommitmentCount < contract.currentSignals.minimumDistinctCommitments,
  "Current distinct commitment count must remain below the production threshold until evidence changes.",
);

for (const command of [
  "npm run programmatic-privacy:contract-check",
  "npm run programmatic-privacy:loop-100",
  "npm run truth:privacy-claim-gate",
  "npm run privacy-rail:contract-check",
  "npm run mainnet:private-settlement-check",
  "npm run mainnet:actual-private-settlement-lineage-check",
  "npm run mainnet:shared-cohort-next-action-check",
  "npm run private-pool-v2:anonymity-set-readiness-check",
  "npm run private-pool-v2:relayer-separation-evidence-check",
  "npm run shield:trust-packet-check",
  "npm run send:trust-packet-check",
  "npm run swap:trust-packet-check",
  "npm run unshield:trust-packet-check",
  "npm run pay:receipt-privacy-contract-check",
  "npm run mainnet:preflight",
]) {
  assert.ok(contract.requiredVerificationCommands.includes(command), `Missing verification command ${command}.`);
}

const printed = JSON.parse(
  execFileSync("npm", ["run", "--silent", "programmatic-privacy:contract-json"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

assert.deepEqual(printed.blockedRequirementIds, contract.blockedRequirementIds);
assert.deepEqual(printed.partiallySatisfiedRequirementIds, contract.partiallySatisfiedRequirementIds);

execFileSync("npm", ["run", "--silent", "programmatic-privacy:contract", "--", "--check"], {
  cwd: repoRoot,
  encoding: "utf8",
});

console.log("Vanta programmatic production privacy contract check: PASS");
