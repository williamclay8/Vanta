import { createHash } from "node:crypto";
import { strict as assert } from "node:assert";

import { createVantaProgrammaticProductionPrivacyContract } from "../src/readiness/programmaticProductionPrivacyContract.mjs";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const checkMode = args.includes("--check");
const iterations = Number(readOptionValue("--iterations") || 100);

if (!Number.isInteger(iterations) || iterations < 1) {
  throw new Error("Programmatic privacy loop requires a positive integer --iterations value.");
}

const passes = [];

for (let index = 0; index < iterations; index += 1) {
  const contract = createVantaProgrammaticProductionPrivacyContract();
  const stablePayload = {
    blockedRequirementIds: contract.blockedRequirementIds,
    currentSignals: contract.currentSignals,
    maxScore: contract.maxScore,
    partiallySatisfiedRequirementIds: contract.partiallySatisfiedRequirementIds,
    productionPrivateReady: contract.productionPrivateReady,
    requirements: contract.requirements.map((requirement) => ({
      id: requirement.id,
      status: requirement.status,
    })),
    score: contract.score,
    selectedRailId: contract.selectedRailId,
  };

  passes.push({
    iteration: index + 1,
    productionPrivateReady: contract.productionPrivateReady,
    privacyClaimAllowed: contract.privacyClaimAllowed,
    score: contract.score,
    maxScore: contract.maxScore,
    blockedRequirementIds: contract.blockedRequirementIds,
    partiallySatisfiedRequirementIds: contract.partiallySatisfiedRequirementIds,
    signalHash: hashStable(stablePayload),
  });
}

const first = passes[0];
const last = passes.at(-1);
const uniqueSignalHashes = [...new Set(passes.map((pass) => pass.signalHash))];
const anyUnsafePromotion = passes.some(
  (pass) => pass.productionPrivateReady === true || pass.privacyClaimAllowed === true,
);
const result = {
  version: "vanta-programmatic-privacy-loop-0.1",
  iterations,
  stableAcrossLoop: uniqueSignalHashes.length === 1,
  uniqueSignalHashes,
  first,
  last,
  unsafePromotionObserved: anyUnsafePromotion,
  dailyDelta: {
    newlyLearnedToday:
      "A repeated privacy loop is useful only when it distinguishes stable blockers from new deltas and fails closed on accidental promotion.",
    stillBlockedUnchanged: last.blockedRequirementIds,
    staleAssumptionToRetire:
      "Repeating a privacy check many times is not progress unless a gate, artifact, evidence source, or memory loop gets sharper.",
    reusableCommandToPreferNextTime: "npm run programmatic-privacy:loop-100",
    counterpartyArtifactThatGotSharper:
      "Programmatic privacy loop output now summarizes all-flow receipt/trust-packet blockers and stable fail-closed status.",
  },
  nextProofBackedMoves: [
    "Bind Shield/Send/Unshield trust packets to current operator evidence before setting proofBacked true.",
    "Split Pay public receipt audiences so buyer-shareable packets do not expose raw economics unless explicitly disclosed.",
    "Add exact settlement-lineage reconciliation across accepted root, replay rejection, operator receipt, protocol settlement, and relayer spend refs.",
    "Add offline blocked-but-shaped private-core release readiness output for no-operator environments.",
  ],
};

if (checkMode) {
  assert.equal(result.iterations, iterations);
  assert.equal(result.stableAcrossLoop, true, "Programmatic privacy loop must be stable across repeated passes.");
  assert.equal(result.unsafePromotionObserved, false, "Privacy loop must not observe accidental production/private promotion.");
  assert.equal(last.productionPrivateReady, false, "Vanta must remain fail-closed until evidence gates prove readiness.");
  assert.equal(last.privacyClaimAllowed, false, "Privacy claims must remain blocked until evidence gates prove readiness.");
  assert.ok(last.blockedRequirementIds.includes("audited-shared-anonymity"));
  assert.ok(last.blockedRequirementIds.includes("live-shared-pool-settlement"));
  assert.ok(last.blockedRequirementIds.includes("bounded-mainnet-authority"));
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta programmatic privacy loop");
  console.log(`- iterations: ${result.iterations}`);
  console.log(`- stableAcrossLoop: ${String(result.stableAcrossLoop)}`);
  console.log(`- unsafePromotionObserved: ${String(result.unsafePromotionObserved)}`);
  console.log(`- score: ${last.score}/${last.maxScore}`);
  console.log(`- productionPrivateReady: ${String(last.productionPrivateReady)}`);
  console.log(`- privacyClaimAllowed: ${String(last.privacyClaimAllowed)}`);
  console.log(`- blocked: ${last.blockedRequirementIds.join(", ")}`);
  console.log(`- prefer next: ${result.dailyDelta.reusableCommandToPreferNextTime}`);
}

function readOptionValue(name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return "";
  }

  return args[index + 1] ?? "";
}

function hashStable(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
