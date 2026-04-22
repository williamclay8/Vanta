import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/mainnet-approval-gates.evidence.json");
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const jsonMode = process.argv.includes("--json");

const status = {
  version: "vanta-mainnet-approval-gates-status-0.1",
  checkedAt: evidence.checkedAt,
  mainnetReady: evidence.mainnetReady,
  productionReady: evidence.productionReady,
  realFundsAllowed: evidence.realFundsAllowed,
  status: evidence.status,
  blockedGateCount: evidence.gates.filter((gate) => gate.status === "blocked").length,
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
  console.log(`- blockedGateCount: ${status.blockedGateCount}`);
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
