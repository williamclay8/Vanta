#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const writeEvidence = args.has("--write-evidence");
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const evidencePath = "ops/mainnet/anonymity-bootstrap-requests/anonymity-set-1024-bootstrap.evidence.json";

const scriptSurface = [
  "scripts/anonymity-bootstrap/run-anonymity-set-1024-bootstrap-checklist.mjs",
  "scripts/check-vanta-anonymity-set-1024-bootstrap-prep.mjs",
  "scripts/print-vanta-anonymity-set-1024-bootstrap-status.mjs",
  "scripts/print-vanta-shared-cohort-settlement-next-action.mjs",
  "scripts/print-vanta-private-pool-v2-anonymity-set-metrics.mjs",
];

const runbookRefs = [
  "ops/mainnet/anonymity-bootstrap-requests/ANONYMITY-SET-1024-BOOTSTRAP-RUNBOOK-2026-05-30.md",
  "ops/mainnet/anonymity-bootstrap-requests/anonymity-bootstrap-batch-record.template.json",
  "ops/mainnet/anonymity-bootstrap-requests/anonymity-bootstrap-measurement-receipt.template.json",
  "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
];

function runCommand(command) {
  const run = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: json ? "pipe" : "inherit",
  });
  return {
    command: command.join(" "),
    status: run.status === 0 ? "pass" : "fail",
    exitCode: run.status,
    stdout: json ? run.stdout?.trim() : undefined,
    stderr: json ? run.stderr?.trim() : undefined,
  };
}

const results = [];

results.push(runCommand(["npm", "run", "anonymity:1024-bootstrap-prep-check"]));
results.push(runCommand(["npm", "run", "private-pool-v2:anonymity-set-metrics-check"]));
results.push(runCommand(["npm", "run", "private-pool-v2:anonymity-set-readiness-check"]));
results.push(runCommand(["npm", "run", "mainnet:shared-cohort-next-action-check"]));

const missingScripts = scriptSurface.filter((path) => !existsSync(`${repoRoot}/${path}`));
results.push({
  id: "script-surface",
  status: missingScripts.length === 0 ? "pass" : "fail",
  missing: missingScripts,
});

const missingRunbooks = runbookRefs.filter((path) => !existsSync(`${repoRoot}/${path}`));
results.push({
  id: "runbook-refs",
  status: missingRunbooks.length === 0 ? "pass" : "fail",
  missing: missingRunbooks,
});

const bootstrapEvidence = JSON.parse(readFileSync(`${repoRoot}/${evidencePath}`, "utf8"));
const anonymityEvidence = JSON.parse(
  readFileSync(`${repoRoot}/ops/mainnet/private-pool-v2-anonymity-set.evidence.json`, "utf8"),
);
const distinct = anonymityEvidence.currentMeasurement?.distinctCommitmentCount ?? 0;
const minimum = anonymityEvidence.currentMeasurement?.minimumDistinctCommitments ?? 1024;

results.push({
  id: "current-depth",
  status: distinct < minimum ? "blocked-below-threshold" : "meets-threshold",
  distinctCommitmentCount: distinct,
  minimumDistinctCommitments: minimum,
  remainingToThreshold: Math.max(minimum - distinct, 0),
});

const checklistPass = results.every(
  (result) =>
    result.status === "pass" ||
    result.status === "blocked-below-threshold" ||
    result.status === "blocked-on-volume",
);

const summary = {
  checklist: "anonymity-set-1024-bootstrap-checklist",
  status: checklistPass ? "pass" : "fail",
  bootstrapStatus: bootstrapEvidence.status,
  distinctCommitmentCount: distinct,
  minimumDistinctCommitments: minimum,
  remainingToThreshold: Math.max(minimum - distinct, 0),
  productionReady: false,
  privacyClaimAllowed: false,
  note:
    "This checklist proves local bootstrap tooling and fail-closed anonymity gates are wired. It does not execute shields, move funds, or lift privacy claims.",
  knownBlockers: bootstrapEvidence.knownBlockers ?? [],
  scriptSurface,
  runbookRefs,
  results,
};

if (writeEvidence) {
  const updated = {
    ...bootstrapEvidence,
    lastChecklistRunAt: new Date().toISOString(),
    lastChecklistStatus: summary.status,
    currentProgress: {
      ...bootstrapEvidence.currentProgress,
      distinctCommitmentCount: distinct,
      remainingToThreshold: Math.max(minimum - distinct, 0),
      percentOfThreshold: Number(((distinct / minimum) * 100).toFixed(4)),
      nextMilestone: (bootstrapEvidence.threshold?.milestones ?? []).find((m) => distinct < m) ?? minimum,
      remainingToNextMilestone: Math.max(
        ((bootstrapEvidence.threshold?.milestones ?? []).find((m) => distinct < m) ?? minimum) - distinct,
        0,
      ),
      measurementStatus: anonymityEvidence.currentMeasurement?.status ?? "unknown",
      measuredAt: anonymityEvidence.currentMeasurement?.measuredAt ?? null,
    },
  };
  writeFileSync(`${repoRoot}/${evidencePath}`, `${JSON.stringify(updated, null, 2)}\n`);
}

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("anonymity set 1024 bootstrap checklist:", summary.status.toUpperCase());
  console.log(`depth: ${distinct}/${minimum} (${summary.remainingToThreshold} remaining)`);
  console.log("privacy claim: blocked");
  if (!checklistPass) {
    process.exit(1);
  }
}
