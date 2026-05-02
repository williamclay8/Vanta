import { strict as assert } from "node:assert";
import {
  createWalletBackedTransactionSimulationGate,
  validateWalletBackedTransactionSimulationGate,
} from "../src/wallet/walletBackedTransactionSimulation.mjs";
import { createTransactionSafetySummary } from "../src/wallet/transactionSafetySummary.mjs";

const simulatedMainnetSummary = createTransactionSafetySummary({
  amount: "0.05",
  asset: "SOL",
  cluster: "mainnet-beta",
  estimatedFees: "0.000005 SOL",
  feePayer: "payer1111111111111111111111111111111111111",
  instructions: ["compute-budget", "private-pool-v2-shield"],
  recipient: "vantaPool111111111111111111111111111111111",
  recentBlockhash: "blockhash11111111111111111111111111111111",
  simulationResult: {
    logs: ["Program log: simulation ok"],
    ok: true,
  },
});

const readyGate = createWalletBackedTransactionSimulationGate({
  connectedWalletAddress: simulatedMainnetSummary.feePayer,
  humanApprovedSummary: true,
  summary: simulatedMainnetSummary,
  transactionFingerprint: "txfp_mainnet_private_pool_v2_shield_001",
});

assert.equal(readyGate.kind, "vanta-wallet-backed-transaction-simulation-gate");
assert.equal(readyGate.canRequestWalletSignature, true);
assert.equal(readyGate.requiresWalletSignature, true);
assert.equal(readyGate.requiresSimulationBeforeSignature, true);
assert.equal(readyGate.transactionMutableAfterSummary, false);
assert.equal(readyGate.privateKeyMaterialHandled, false);
assert.equal(readyGate.cluster, "mainnet");
assert.equal(readyGate.walletAddress, simulatedMainnetSummary.feePayer);
assert.equal(validateWalletBackedTransactionSimulationGate(readyGate).accepted, true);

const missingWalletGate = createWalletBackedTransactionSimulationGate({
  connectedWalletAddress: "",
  humanApprovedSummary: true,
  summary: simulatedMainnetSummary,
  transactionFingerprint: "txfp_missing_wallet",
});

assert.equal(missingWalletGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(missingWalletGate).reason, "wallet-not-connected");

const failedSimulationSummary = createTransactionSafetySummary({
  ...simulatedMainnetSummary,
  simulationResult: {
    error: "insufficient funds",
    logs: [],
    ok: false,
  },
});

const failedSimulationGate = createWalletBackedTransactionSimulationGate({
  connectedWalletAddress: failedSimulationSummary.feePayer,
  humanApprovedSummary: true,
  summary: failedSimulationSummary,
  transactionFingerprint: "txfp_failed_simulation",
});

assert.equal(failedSimulationGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(failedSimulationGate).reason, "simulation-failed");

const mutableTransactionGate = createWalletBackedTransactionSimulationGate({
  connectedWalletAddress: simulatedMainnetSummary.feePayer,
  humanApprovedSummary: true,
  summary: simulatedMainnetSummary,
  transactionFingerprint: "txfp_mutable_transaction",
  transactionMutableAfterSummary: true,
});

assert.equal(mutableTransactionGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(mutableTransactionGate).reason, "transaction-mutated-after-summary");

const unapprovedMainnetSummary = createTransactionSafetySummary({
  ...simulatedMainnetSummary,
  cluster: "mainnet-beta",
});

const unapprovedMainnetGate = createWalletBackedTransactionSimulationGate({
  connectedWalletAddress: unapprovedMainnetSummary.feePayer,
  humanApprovedSummary: true,
  summary: unapprovedMainnetSummary,
  transactionFingerprint: "txfp_mainnet_unapproved",
});

assert.equal(unapprovedMainnetGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(unapprovedMainnetGate).reason, "mainnet-approval-required");

const noHumanApprovalGate = createWalletBackedTransactionSimulationGate({
  connectedWalletAddress: simulatedMainnetSummary.feePayer,
  humanApprovedSummary: false,
  summary: simulatedMainnetSummary,
  transactionFingerprint: "txfp_no_human_approval",
});

assert.equal(noHumanApprovalGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(noHumanApprovalGate).reason, "human-approval-required");

const missingSummaryGate = createWalletBackedTransactionSimulationGate({
  connectedWalletAddress: simulatedMainnetSummary.feePayer,
  humanApprovedSummary: true,
  summary: null,
  transactionFingerprint: "txfp_missing_summary",
});

assert.equal(missingSummaryGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(missingSummaryGate).reason, "transaction-summary-required");

console.log("Vanta wallet-backed transaction simulation check: PASS");
