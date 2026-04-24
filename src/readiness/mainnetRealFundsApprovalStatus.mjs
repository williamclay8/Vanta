import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/mainnet-real-funds-approval.evidence.json");

function parseLaunchWindowRef(ref) {
  const match = String(ref).match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})-(\d{2}:\d{2}:\d{2}) ([A-Za-z_]+\/[A-Za-z_]+)$/,
  );
  assert.ok(match, "approvedLaunchWindowRef must use '<date>T<start>-<end> <IANA timezone>' format.");

  const [, date, startTime, endTime, timeZone] = match;
  return {
    date,
    endKey: `${date}T${endTime}`,
    startKey: `${date}T${startTime}`,
    timeZone,
  };
}

function zonedDateTimeKey(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export function createVantaMainnetRealFundsApprovalStatus() {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const approval = evidence.approvalRecord;
  const launchWindow = parseLaunchWindowRef(approval.approvedLaunchWindowRef);
  const nowKey = zonedDateTimeKey(launchWindow.timeZone);

  let approvalWindowStatus = "pending";
  if (nowKey < launchWindow.startKey) {
    approvalWindowStatus = "scheduled";
  } else if (nowKey > launchWindow.endKey) {
    approvalWindowStatus = "expired";
  } else {
    approvalWindowStatus = "active";
  }

  const liveMainnetActionsAllowedNow =
    evidence.realFundsAllowed === true &&
    approval.status === "approved" &&
    approvalWindowStatus === "active";
  const mainnetFundsBlockedBy = [
    "all-other-mainnet-actions-blocked",
    ...(approvalWindowStatus === "active" ? [] : [`bounded-approval-window-${approvalWindowStatus}`]),
  ];

  return {
    approvalActionRef: approval.approvedActionRef,
    approvalActionSummary: approval.approvedActionSummary,
    approvalEnvironment: approval.approvedEnvironment,
    approvalRecordStatus: approval.status,
    approvalWindowStatus,
    approvalWindowRef: approval.approvedLaunchWindowRef,
    approvedByRef: approval.approvedByRef,
    checkedAt: new Date().toISOString(),
    currentTimeZoneClock: nowKey,
    feePayerRef: approval.approvedFeePayerRef,
    launchWindowEnd: launchWindow.endKey,
    launchWindowStart: launchWindow.startKey,
    launchWindowTimeZone: launchWindow.timeZone,
    liveMainnetActionsAllowedNow,
    mainnetReady: false,
    mainnetFundsBlockedBy,
    maximumFundsAtRiskRef: approval.maximumFundsAtRiskRef,
    productionReady: false,
    realFundsApprovalRecorded: evidence.realFundsAllowed === true,
    rollbackPlanRef: approval.rollbackPlanRef,
    requiredNextStep:
      approvalWindowStatus === "active"
        ? "Keep live actions inside the exact approved bounded beta action."
        : "Record a new bounded approval window before any live mainnet action.",
    safety:
      "No wallet keys, signed transactions, bearer values, or raw database URLs are printed.",
    stopLossPlanRef: approval.stopLossPlanRef,
    version: "vanta-mainnet-real-funds-approval-status-0.1",
  };
}
