#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const checks = [
  {
    id: "native-sol-tag6-wiring",
    command: ["npm", "run", "private-pool-v2:native-sol-tag6-wiring-check"],
  },
  {
    id: "native-sol-unshield-proof-request",
    command: ["npm", "run", "private-pool-v2:native-sol-unshield-proof-request-check"],
  },
  {
    id: "native-sol-sentinel-in-snapshot",
    command: ["npm", "run", "private-pool-v2:native-sol-sentinel-in-snapshot-check"],
  },
];

const scriptSurface = [
  "scripts/native-sol-tag6/derive-sol-vault-pdas.mjs",
  "scripts/native-sol-tag6/build-register-sol-vault-asset-instruction.mjs",
  "scripts/native-sol-tag6/scan-mainnet-tag6-sol-releases.mjs",
  "scripts/native-sol-tag6/verify-full-tag6-sol-release-evidence.mjs",
  "scripts/native-sol-tag6/generate-tag6-external-gate-request-package.mjs",
];

const results = [];

for (const check of checks) {
  const run = spawnSync(check.command[0], check.command.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: json ? "pipe" : "inherit",
  });

  results.push({
    id: check.id,
    command: check.command.join(" "),
    status: run.status === 0 ? "pass" : "fail",
    exitCode: run.status,
    stdout: json ? run.stdout?.trim() : undefined,
    stderr: json ? run.stderr?.trim() : undefined,
  });
}

const summary = {
  checklist: "native-sol-tag6-full-predeploy-checklist",
  status: results.every((result) => result.status === "pass") ? "pass" : "fail",
  liveEvidenceStatus: "not-collected",
  productionReady: false,
  privacyClaimAllowed: false,
  note:
    "This checklist is local pre-deploy evidence only. It does not deploy, spend funds, query provider secrets, prove live TAG6 releases, or lift production privacy flags.",
  requiredLiveEvidenceBeforeClaimElevation: [
    "mainnet program deployment reviewed by owner",
    "native SOL sentinel commitments visible in production indexer snapshot",
    "one or more proof-verified mainnet TAG6 SOL unshield releases",
    "external review or owner-approved gate package",
  ],
  scriptSurface,
  results,
};

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("\nNative SOL TAG6 full predeploy checklist");
  console.log(`Status: ${summary.status.toUpperCase()}`);
  console.log("Live evidence: not collected");
  console.log("Production/privacy claims: blocked");
}

process.exit(summary.status === "pass" ? 0 : 1);
