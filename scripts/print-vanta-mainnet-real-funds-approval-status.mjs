import { strict as assert } from "node:assert";
import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");
const status = createVantaMainnetRealFundsApprovalStatus();

if (checkMode) {
  assert.equal(status.realFundsApprovalRecorded, true, "Real-funds approval record must remain present.");
  assert.equal(status.approvalRecordStatus, "approved", "Approval record must stay approved.");
  assert.equal(status.approvalActionRef, "launch-runbook/vanta-mainnet-beta-001");
  assert.equal(status.approvalActionSummary, "Enable beta mainnet private-pool smoke with maximum 0.05 SOL at risk");
  assert.equal(status.approvalEnvironment, "mainnet-beta");
  assert.equal(status.feePayerRef, "wallet/public-fee-payer-vanta-beta");
  assert.equal(status.rollbackPlanRef, "runbook/disable-private-pool-v2-services-and-beta-actions");
  assert.equal(status.stopLossPlanRef, "max-0.05-sol-or-first-failed-settlement");
  assert.equal(status.maximumFundsAtRiskRef, "0.05 SOL");
  assert.equal(status.approvedByRef, "Clay / founder approval / 2026-04-22");
  assert.equal(status.mainnetReady, false, "Mainnet readiness must remain false.");
  assert.equal(status.productionReady, false, "Production readiness must remain false.");
  assert.equal(
    status.liveMainnetActionsAllowedNow,
    status.approvalWindowStatus === "active",
    "Live mainnet action allowance must match the active approval window.",
  );
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(status, null, 2));
} else {
  console.log("Vanta mainnet real-funds approval status");
  console.log(`- approvalRecordStatus: ${status.approvalRecordStatus}`);
  console.log(`- approvalActionSummary: ${status.approvalActionSummary}`);
  console.log(`- approvalWindowStatus: ${status.approvalWindowStatus}`);
  console.log(`- approvalWindowRef: ${status.approvalWindowRef}`);
  console.log(`- liveMainnetActionsAllowedNow: ${String(status.liveMainnetActionsAllowedNow)}`);
  console.log(`- approvalActionRef: ${status.approvalActionRef}`);
  console.log(`- feePayerRef: ${status.feePayerRef}`);
  console.log(`- rollbackPlanRef: ${status.rollbackPlanRef}`);
  console.log(`- stopLossPlanRef: ${status.stopLossPlanRef}`);
  console.log(`- maximumFundsAtRiskRef: ${status.maximumFundsAtRiskRef}`);
  console.log(`- approvedByRef: ${status.approvedByRef}`);
  console.log(`- requiredNextStep: ${status.requiredNextStep}`);
}
