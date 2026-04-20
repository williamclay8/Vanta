import { strict as assert } from "node:assert";
import {
  createTransactionSafetySummary,
  validateTransactionSafetySummary,
} from "../src/wallet/transactionSafetySummary.mjs";

const safeDevnetSummary = createTransactionSafetySummary({
  amount: "1.25",
  asset: "USDC",
  cluster: "devnet",
  estimatedFees: "0.000005 SOL",
  feePayer: "payer1111111111111111111111111111111111111",
  instructions: ["transfer-checked", "memo"],
  recipient: "recipient1111111111111111111111111111111111",
  recentBlockhash: "blockhash11111111111111111111111111111111",
  simulationResult: {
    logs: ["Program log: ok"],
    ok: true,
  },
});

assert.equal(safeDevnetSummary.kind, "vanta-transaction-safety-summary");
assert.equal(safeDevnetSummary.mainnetSubmissionAllowed, false);
assert.equal(safeDevnetSummary.requiresHumanApproval, true);
assert.equal(validateTransactionSafetySummary(safeDevnetSummary).accepted, true);

const blockedMainnetSummary = createTransactionSafetySummary({
  ...safeDevnetSummary,
  cluster: "mainnet-beta",
});

const blockedMainnetDecision = validateTransactionSafetySummary(blockedMainnetSummary);
assert.equal(blockedMainnetDecision.accepted, false);
assert.equal(blockedMainnetDecision.reason, "mainnet-approval-required");

const approvedMainnetSummary = createTransactionSafetySummary({
  ...safeDevnetSummary,
  cluster: "mainnet-beta",
  explicitMainnetApproval: true,
});

assert.equal(validateTransactionSafetySummary(approvedMainnetSummary).accepted, true);

const failedSimulationSummary = createTransactionSafetySummary({
  ...safeDevnetSummary,
  simulationResult: {
    error: "insufficient funds",
    logs: [],
    ok: false,
  },
});

const failedSimulationDecision = validateTransactionSafetySummary(failedSimulationSummary);
assert.equal(failedSimulationDecision.accepted, false);
assert.equal(failedSimulationDecision.reason, "simulation-failed");

assert.throws(
  () =>
    createTransactionSafetySummary({
      ...safeDevnetSummary,
      feePayer: "",
    }),
  /feePayer/i,
);

console.log("Vanta transaction safety summary check: PASS");
