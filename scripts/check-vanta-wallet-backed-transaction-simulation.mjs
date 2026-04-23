import { strict as assert } from "node:assert";
import {
  createWalletBackedTransactionSimulationGate,
  validateWalletBackedTransactionSimulationGate,
} from "../src/wallet/walletBackedTransactionSimulation.mjs";
import { createTransactionSafetySummary } from "../src/wallet/transactionSafetySummary.mjs";

const simulatedDevnetSummary = createTransactionSafetySummary({
  amount: "0.05",
  asset: "SOL",
  cluster: "devnet",
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
  connectedWalletAddress: simulatedDevnetSummary.feePayer,
  humanApprovedSummary: true,
  summary: simulatedDevnetSummary,
  transactionFingerprint: "txfp_devnet_private_pool_v2_shield_001",
});

assert.equal(readyGate.kind, "vanta-wallet-backed-transaction-simulation-gate");
assert.equal(readyGate.canRequestWalletSignature, true);
assert.equal(readyGate.requiresWalletSignature, true);
assert.equal(readyGate.requiresSimulationBeforeSignature, true);
assert.equal(readyGate.transactionMutableAfterSummary, false);
assert.equal(readyGate.privateKeyMaterialHandled, false);
assert.equal(readyGate.cluster, "devnet");
assert.equal(readyGate.walletAddress, simulatedDevnetSummary.feePayer);
assert.equal(validateWalletBackedTransactionSimulationGate(readyGate).accepted, true);

const missingWalletGate = createWalletBackedTransactionSimulationGate({
  connectedWalletAddress: "",
  humanApprovedSummary: true,
  summary: simulatedDevnetSummary,
  transactionFingerprint: "txfp_missing_wallet",
});

assert.equal(missingWalletGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(missingWalletGate).reason, "wallet-not-connected");

const failedSimulationSummary = createTransactionSafetySummary({
  ...simulatedDevnetSummary,
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
  connectedWalletAddress: simulatedDevnetSummary.feePayer,
  humanApprovedSummary: true,
  summary: simulatedDevnetSummary,
  transactionFingerprint: "txfp_mutable_transaction",
  transactionMutableAfterSummary: true,
});

assert.equal(mutableTransactionGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(mutableTransactionGate).reason, "transaction-mutated-after-summary");

const unapprovedMainnetSummary = createTransactionSafetySummary({
  ...simulatedDevnetSummary,
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
  connectedWalletAddress: simulatedDevnetSummary.feePayer,
  humanApprovedSummary: false,
  summary: simulatedDevnetSummary,
  transactionFingerprint: "txfp_no_human_approval",
});

assert.equal(noHumanApprovalGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(noHumanApprovalGate).reason, "human-approval-required");

const missingSummaryGate = createWalletBackedTransactionSimulationGate({
  connectedWalletAddress: simulatedDevnetSummary.feePayer,
  humanApprovedSummary: true,
  summary: null,
  transactionFingerprint: "txfp_missing_summary",
});

assert.equal(missingSummaryGate.canRequestWalletSignature, false);
assert.equal(validateWalletBackedTransactionSimulationGate(missingSummaryGate).reason, "transaction-summary-required");

console.log("Vanta wallet-backed transaction simulation check: PASS");
