import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/mainnet-approval-gates.evidence.json");
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const jsonMode = process.argv.includes("--json");

function parseLaunchWindowRef(ref) {
  const match = String(ref).match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})-(\d{2}:\d{2}:\d{2}) ([A-Za-z_]+\/[A-Za-z_]+)$/,
  );
  if (!match) {
    return null;
  }

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

function boundedApprovalStatus(gate) {
  const launchWindow = parseLaunchWindowRef(gate?.approvedLaunchWindowRef);
  if (!gate || !launchWindow) {
    return {
      approvedActionSummary: gate?.approvedActionSummary ?? null,
      approvalWindowRef: gate?.approvedLaunchWindowRef ?? null,
      approvalWindowStatus: "missing",
      generalMainnetFundsAllowed: false,
      liveMainnetActionsAllowedNow: false,
      recorded: false,
    };
  }

  const nowKey = zonedDateTimeKey(launchWindow.timeZone);
  const approvalWindowStatus =
    nowKey < launchWindow.startKey ? "scheduled" : nowKey > launchWindow.endKey ? "expired" : "active";
  const recorded = gate.status === "approved-bounded-action";

  return {
    approvedActionSummary: gate.approvedActionSummary,
    approvalWindowRef: gate.approvedLaunchWindowRef,
    approvalWindowStatus,
    currentTimeZoneClock: nowKey,
    generalMainnetFundsAllowed: false,
    liveMainnetActionsAllowedNow: recorded && approvalWindowStatus === "active",
    recorded,
  };
}

const fundsGate = evidence.gates.find((gate) => gate.id === "explicit-mainnet-funds-approval");
const boundedApproval = boundedApprovalStatus(fundsGate);
const externalGates = evidence.gates.filter((gate) => gate.requiresExternalApproval === true);
const unclearedExternalGates = externalGates.filter((gate) => {
  if (gate.status === "evidence-recorded") {
    return false;
  }
  if (gate.id === "explicit-mainnet-funds-approval") {
    return boundedApproval.liveMainnetActionsAllowedNow !== true;
  }
  return true;
});
const operatorSkippedControls = evidence.operatorSkippedControls ?? [];

const status = {
  version: "vanta-mainnet-approval-gates-status-0.1",
  checkedAt: evidence.checkedAt,
  mainnetReady: evidence.mainnetReady,
  productionReady: evidence.productionReady,
  realFundsAllowed: evidence.realFundsAllowed,
  mainnetClaimAllowed: false,
  productionClaimAllowed: false,
  boundedRealFundsApproval: boundedApproval,
  boundedRealFundsApprovalRecorded: boundedApproval.recorded,
  boundedRealFundsApprovalWindowStatus: boundedApproval.approvalWindowStatus,
  generalMainnetFundsAllowed: boundedApproval.generalMainnetFundsAllowed,
  liveMainnetActionsAllowedNow: boundedApproval.liveMainnetActionsAllowedNow,
  status: evidence.status,
  blockedGateCount: evidence.gates.filter((gate) => gate.status === "blocked").length,
  externalGateCount: externalGates.length,
  operatorSkippedControlCount: operatorSkippedControls.length,
  operatorSkippedControlIds: operatorSkippedControls.map((control) => control.id),
  unclearedExternalGateCount: unclearedExternalGates.length,
  unclearedExternalGateIds: unclearedExternalGates.map((gate) => gate.id),
  gates: evidence.gates.map((gate) => ({
    id: gate.id,
    status: gate.status,
    currentEvidenceStatus: gate.currentEvidenceStatus,
    requiresExternalApproval: gate.requiresExternalApproval,
    operatorDecision: gate.operatorDecision,
    nextAction: gate.nextAction,
  })),
  technicalEvidence: evidence.currentTechnicalEvidence.map((entry) => ({
    id: entry.id,
    status: entry.status,
    ref: entry.ref,
  })),
  limitations: evidence.limitations,
};

if (jsonMode) {
  console.log(JSON.stringify(status, null, 2));
} else {
  console.log("Vanta mainnet approval gates status");
  console.log(`- version: ${status.version}`);
  console.log(`- source: ops/mainnet/mainnet-approval-gates.evidence.json`);
  console.log(`- checkedAt: ${status.checkedAt}`);
  console.log(`- status: ${status.status}`);
  console.log(`- mainnetReady: ${status.mainnetReady}`);
  console.log(`- productionReady: ${status.productionReady}`);
  console.log(`- realFundsAllowed: ${status.realFundsAllowed}`);
  console.log(`- mainnetClaimAllowed: ${status.mainnetClaimAllowed}`);
  console.log(`- productionClaimAllowed: ${status.productionClaimAllowed}`);
  console.log(`- boundedRealFundsApprovalRecorded: ${status.boundedRealFundsApprovalRecorded}`);
  console.log(`- boundedRealFundsApprovalWindowStatus: ${status.boundedRealFundsApprovalWindowStatus}`);
  console.log(`- liveMainnetActionsAllowedNow: ${status.liveMainnetActionsAllowedNow}`);
  console.log(`- generalMainnetFundsAllowed: ${status.generalMainnetFundsAllowed}`);
  console.log(`- blockedGateCount: ${status.blockedGateCount}`);
  console.log(`- externalGateCount: ${status.externalGateCount}`);
  console.log(`- operatorSkippedControlCount: ${status.operatorSkippedControlCount}`);
  console.log(`- unclearedExternalGateCount: ${status.unclearedExternalGateCount}`);
  console.log(`- unclearedExternalGateIds: ${status.unclearedExternalGateIds.join(", ") || "none"}`);
  console.log("- gates:");
  for (const gate of status.gates) {
    console.log(`  - ${gate.id}: ${gate.status}, evidence ${gate.currentEvidenceStatus}`);
    if (gate.operatorDecision) {
      console.log(`    decision: ${gate.operatorDecision}`);
    }
    console.log(`    next: ${gate.nextAction}`);
  }
  console.log("- technical evidence:");
  for (const entry of status.technicalEvidence) {
    console.log(`  - ${entry.id}: ${entry.status} (${entry.ref})`);
  }
  console.log("- launch limits:");
  for (const limitation of status.limitations) {
    console.log(`  - ${limitation}`);
  }
}
