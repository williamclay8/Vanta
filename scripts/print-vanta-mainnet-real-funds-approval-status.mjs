import { strict as assert } from "node:assert";
import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");
const status = createVantaMainnetRealFundsApprovalStatus();

if (checkMode) {
  assert.equal(status.realFundsApprovalRecorded, true, "Real-funds approval record must remain present.");
  assert.equal(status.approvalRecordStatus, "approved", "Approval record must stay approved.");
  assert.ok(status.approvalActionRef);
  assert.ok(status.approvalActionSummary);
  assert.ok(["mainnet-beta", "mainnet"].includes(status.approvalEnvironment));
  assert.ok(status.feePayerRef);
  assert.ok(status.rollbackPlanRef);
  assert.ok(status.stopLossPlanRef);
  assert.ok(status.maximumFundsAtRiskRef);
  assert.ok(status.approvedByRef);
  assert.equal(status.mainnetReady, false, "Mainnet readiness must remain false.");
  assert.equal(status.productionReady, false, "Production readiness must remain false.");
  assert.equal(
    status.liveMainnetActionsAllowedNow,
    status.approvalWindowStatus === "active" && !status.stopCondition.appliesToCurrentApproval,
    "Live mainnet action allowance must match the active approval window and stop-condition gate.",
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
  console.log(`- stopConditionStatus: ${status.stopCondition.status}`);
  console.log(`- stopConditionApplies: ${String(status.stopCondition.appliesToCurrentApproval)}`);
  console.log(`- liveMainnetActionsAllowedNow: ${String(status.liveMainnetActionsAllowedNow)}`);
  console.log(`- approvalActionRef: ${status.approvalActionRef}`);
  console.log(`- feePayerRef: ${status.feePayerRef}`);
  console.log(`- rollbackPlanRef: ${status.rollbackPlanRef}`);
  console.log(`- stopLossPlanRef: ${status.stopLossPlanRef}`);
  console.log(`- maximumFundsAtRiskRef: ${status.maximumFundsAtRiskRef}`);
  console.log(`- approvedByRef: ${status.approvedByRef}`);
  console.log(`- requiredNextStep: ${status.requiredNextStep}`);
}
