import { strict as assert } from "node:assert";

import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const expectedAck = "I_UNDERSTAND_THIS_RUN_CAN_MOVE_MAINNET_FUNDS";
const ack = process.env.VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK?.trim();
const approvalStatus = createVantaMainnetRealFundsApprovalStatus();

function failClosed(message, extra = {}) {
  const payload = {
    approvalActionRef: approvalStatus.approvalActionRef,
    approvalWindowRef: approvalStatus.approvalWindowRef,
    approvalWindowStatus: approvalStatus.approvalWindowStatus,
    blocker: message,
    checkedAt: new Date().toISOString(),
    feePayerRef: approvalStatus.feePayerRef,
    liveMainnetActionsAllowedNow: approvalStatus.liveMainnetActionsAllowedNow,
    maximumFundsAtRiskRef: approvalStatus.maximumFundsAtRiskRef,
    safety: "No wallet keys, signed transactions, bearer values, or raw database URLs are printed.",
    stopLossPlanRef: approvalStatus.stopLossPlanRef,
    ...extra,
  };

  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
}

assert.equal(
  approvalStatus.approvalActionRef,
  "actual-private/mainnet-settlement-evidence-run-2026-04-28",
  "This live runner is only scoped to the approved actual-private evidence action.",
);
assert.equal(
  approvalStatus.maximumFundsAtRiskRef,
  "0.025 SOL",
  "This live runner must remain capped to the approved maximum funds at risk.",
);

if (approvalStatus.liveMainnetActionsAllowedNow !== true) {
  failClosed("bounded-approval-window-not-active", {
    requiredNextStep: approvalStatus.requiredNextStep,
  });
} else if (ack !== expectedAck) {
  failClosed("missing-live-mainnet-settlement-ack", {
    requiredAckEnv: "VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK",
    requiredAckValueRef: expectedAck,
  });
} else {
  failClosed("no-reviewed-live-actual-private-settlement-executor-implemented", {
    currentRepoTruth:
      "The repo has no committed executor that can safely build, sign, submit, and refs-only-record a live actual-private mainnet settlement using the approved wallet.",
    allowedNextImplementation:
      "Build a wallet-backed live executor that enforces the approval cap, relayer/source wallet separation, shared-cohort deposit, relayer-submitted spend, accepted-root freshness, nullifier replay rejection, Solscan transcript review, and refs-only evidence writing before enabling this command to spend funds.",
  });
}
