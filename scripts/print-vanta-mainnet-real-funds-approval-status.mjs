import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/mainnet-real-funds-approval.evidence.json");
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

const jsonMode = process.argv.includes("--json");
const checkMode = process.argv.includes("--check");

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

function summarize() {
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

  return {
    approvalActionRef: approval.approvedActionRef,
    approvalRecordStatus: approval.status,
    approvalWindowStatus,
    checkedAt: new Date().toISOString(),
    currentTimeZoneClock: nowKey,
    launchWindowEnd: launchWindow.endKey,
    launchWindowStart: launchWindow.startKey,
    launchWindowTimeZone: launchWindow.timeZone,
    liveMainnetActionsAllowedNow,
    mainnetReady: false,
    maximumFundsAtRiskRef: approval.maximumFundsAtRiskRef,
    productionReady: false,
    realFundsApprovalRecorded: evidence.realFundsAllowed === true,
    requiredNextStep:
      approvalWindowStatus === "active"
        ? "Keep live actions inside the exact approved bounded beta action."
        : "Record a new bounded approval window before any live mainnet action.",
    safety:
      "No wallet keys, signed transactions, bearer values, or raw database URLs are printed.",
    version: "vanta-mainnet-real-funds-approval-status-0.1",
  };
}

const status = summarize();

if (checkMode) {
  assert.equal(status.realFundsApprovalRecorded, true, "Real-funds approval record must remain present.");
  assert.equal(status.approvalRecordStatus, "approved", "Approval record must stay approved.");
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
  console.log(`- approvalWindowStatus: ${status.approvalWindowStatus}`);
  console.log(`- liveMainnetActionsAllowedNow: ${String(status.liveMainnetActionsAllowedNow)}`);
  console.log(`- approvalActionRef: ${status.approvalActionRef}`);
  console.log(`- maximumFundsAtRiskRef: ${status.maximumFundsAtRiskRef}`);
  console.log(`- requiredNextStep: ${status.requiredNextStep}`);
}
