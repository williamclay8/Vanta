#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const writeEvidence = args.has("--write-evidence");
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const evidencePath = "ops/mainnet/tag6-gate-requests/tag6-live-evidence-prep.evidence.json";
const receiptTemplatePath = "ops/mainnet/tag6-gate-requests/tag6-live-evidence-receipt.template.json";

const scriptSurface = [
  "scripts/native-sol-tag6/derive-sol-vault-pdas.mjs",
  "scripts/native-sol-tag6/build-register-sol-vault-asset-instruction.mjs",
  "scripts/native-sol-tag6/scan-mainnet-tag6-sol-releases.mjs",
  "scripts/native-sol-tag6/verify-full-tag6-sol-release-evidence.mjs",
  "scripts/native-sol-tag6/probe-sentinel-in-production-snapshot.mjs",
  "scripts/native-sol-tag6/generate-tag6-external-gate-request-package.mjs",
  "scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs",
  "scripts/native-sol-tag6/run-tag6-live-evidence-prep-checklist.mjs",
];

const runbookRefs = [
  "ops/mainnet/tag6-gate-requests/TAG6-POST-DEPLOY-INSTRUCTIONS-2026-05-14.md",
  "ops/mainnet/tag6-gate-requests/TAG6-EXTERNAL-GATE-REQUEST-POST-DEPLOY-TEMPLATE-2026-05-14.md",
  "ops/mainnet/tag6-gate-requests/TAG6-LIVE-EVIDENCE-PREP-RUNBOOK-2026-05-30.md",
  "ops/mainnet/tag6-gate-requests/tag6-live-evidence-receipt.template.json",
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

results.push(
  runCommand(["npm", "run", "private-pool-v2:tag6-full-predeploy-checklist", "--", "--json"]),
);

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

const probeSource = readFileSync(`${repoRoot}/scripts/native-sol-tag6/probe-sentinel-in-production-snapshot.mjs`, "utf8");
const probeIsSkeleton = probeSource.includes("skeleton");
results.push({
  id: "production-snapshot-probe",
  status: probeIsSkeleton ? "blocked-skeleton" : "implemented",
  probeStatus: probeIsSkeleton ? "skeleton-only" : "implemented",
});

const verifierDryRun = spawnSync(
  "node",
  [
    "scripts/native-sol-tag6/verify-full-tag6-sol-release-evidence.mjs",
    "--tx",
    "TEMPLATE-TX-NOT-LIVE",
    "--receipt",
    receiptTemplatePath,
    "--json",
  ],
  { cwd: repoRoot, encoding: "utf8" },
);
results.push({
  id: "release-evidence-verifier-dry-run",
  status: verifierDryRun.status !== 0 ? "pass" : "fail",
  note: "Template receipt must fail closed until live evidence is collected",
  stdout: verifierDryRun.stdout?.trim(),
});

const checklistPass = results.every((result) =>
  result.status === "pass" || result.status === "blocked-skeleton",
);

const summary = {
  checklist: "native-sol-tag6-live-evidence-prep-checklist",
  status: checklistPass ? "pass" : "fail",
  liveEvidenceStatus: "not-collected",
  probeStatus: probeIsSkeleton ? "skeleton-only" : "implemented",
  productionReady: false,
  privacyClaimAllowed: false,
  note:
    "This checklist proves local TAG6 live-evidence tooling and predeploy gates are ready. It does not collect live evidence, query production DB secrets, or lift production privacy flags.",
  knownBlockers: probeIsSkeleton
    ? [
        "Production indexer snapshot probe is skeleton-only; implement DB query before claiming indexer snapshot evidence.",
        "Live TAG6 SOL unshield releases must be observed on-chain after deployment.",
        "External gate package must be generated and reviewed after live evidence is collected.",
      ]
    : [],
  scriptSurface,
  runbookRefs,
  results,
};

if (writeEvidence) {
  const existing = JSON.parse(readFileSync(`${repoRoot}/${evidencePath}`, "utf8"));
  const updated = {
    ...existing,
    status: summary.status === "pass" ? "ready-for-live-evidence-collection-blocked" : "prep-checklist-failed",
    liveEvidenceStatus: "not-collected",
    probeStatus: summary.probeStatus,
    lastChecklistRunAt: new Date().toISOString(),
    lastChecklistStatus: summary.status,
    scriptSurface,
    runbookRefs,
    knownBlockers: summary.knownBlockers,
  };
  writeFileSync(`${repoRoot}/${evidencePath}`, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
}

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("\nNative SOL TAG6 live evidence prep checklist");
  console.log(`Status: ${summary.status.toUpperCase()}`);
  console.log(`Live evidence: ${summary.liveEvidenceStatus}`);
  console.log(`Probe: ${summary.probeStatus}`);
  console.log("Production/privacy claims: blocked");
  if (probeIsSkeleton) {
    console.log("Blocker: production snapshot probe is skeleton-only");
  }
}

process.exit(summary.status === "pass" ? 0 : 1);
