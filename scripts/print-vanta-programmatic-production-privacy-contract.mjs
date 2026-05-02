import { strict as assert } from "node:assert";

import { createVantaProgrammaticProductionPrivacyContract } from "../src/readiness/programmaticProductionPrivacyContract.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

const contract = createVantaProgrammaticProductionPrivacyContract();

if (checkMode) {
  assert.equal(contract.version, "vanta-programmatic-production-privacy-contract-0.1");
  assert.equal(contract.selectedRailId, "vanta-private-pool-v2");
  assert.equal(contract.productionPrivateReady, false);
  assert.equal(contract.privacyClaimAllowed, false);
  assert.equal(contract.mainnetReady, false);
  assert.ok(contract.requirements.length >= 10, "Programmatic privacy contract must cover the full privacy loop.");
  assert.ok(
    contract.blockedRequirementIds.includes("live-shared-pool-settlement"),
    "Contract must preserve live shared-pool settlement as a blocker.",
  );
  assert.ok(
    contract.blockedRequirementIds.includes("audited-shared-anonymity"),
    "Contract must preserve audited shared anonymity as a blocker.",
  );
  assert.ok(
    contract.partiallySatisfiedRequirementIds.includes("counterparty-verifiable-receipts"),
    "Contract must preserve receipt/trust-packet work as only partially satisfied.",
  );
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(contract, null, 2));
} else {
  console.log("Vanta programmatic production privacy contract");
  console.log(`- selectedRailId: ${contract.selectedRailId}`);
  console.log(`- productionPrivateReady: ${String(contract.productionPrivateReady)}`);
  console.log(`- privacyClaimAllowed: ${String(contract.privacyClaimAllowed)}`);
  console.log(`- score: ${contract.score}/${contract.maxScore}`);
  console.log(`- blocked: ${contract.blockedRequirementIds.join(", ")}`);
  console.log(`- partial: ${contract.partiallySatisfiedRequirementIds.join(", ")}`);
  console.log(`- current truth: ${contract.currentTruth}`);
  console.log(`- canonical verification: ${contract.requiredVerificationCommands.join(", ")}`);
}
