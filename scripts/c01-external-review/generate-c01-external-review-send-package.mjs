#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2);

function getArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function hasArg(name) {
  return args.includes(name);
}

function sha256Ref(path) {
  const bytes = readFileSync(resolve(repoRoot, path));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function printHelp() {
  console.log(`
C01 external review outbound send-package generator

Usage:
  node scripts/c01-external-review/generate-c01-external-review-send-package.mjs \\
    --output-dir ops/mainnet/c01-gate-requests

Options:
  --dry-run    Preview without writing files
  --json       Print machine-readable summary to stdout
  --help       Show this help
`);
}

if (hasArg("--help")) {
  printHelp();
  process.exit(0);
}

const outputDir = getArg("--output-dir") ?? "ops/mainnet/c01-gate-requests";
const dryRun = hasArg("--dry-run");
const json = hasArg("--json");

const bundlePath = "ops/mainnet/private-pool-v2-c01-external-review-request-bundle.evidence.json";
const humanPath = "ops/mainnet/private-pool-v2-c01-external-evidence-request.md";
const bundle = JSON.parse(readFileSync(resolve(repoRoot, bundlePath), "utf8"));

const head = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
const treeStatus = execSync("git status --short", { cwd: repoRoot, encoding: "utf8" }).trim();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fileName = `C01-EXTERNAL-REVIEW-REQUEST-${timestamp}.md`;
const outputPath = join(outputDir, fileName);

const outboundLines = (bundle.outboundFiles ?? []).map((entry) => {
  const hash = sha256Ref(entry.path);
  return `- \`${entry.path}\` (${entry.group}) — ${hash}`;
});

const body = `# C01 External Review Outbound Request

Status: draft outbound send-list
Production privacy claim: blocked
C01 verifier ready: blocked

## Repo Starting Point

- repo: https://github.com/williamclay8/Vanta.git
- branch: \`${branch}\`
- reviewStartCommitRef: \`git:${head}\`
- treeStatusAtCollection: \`${treeStatus.length === 0 ? "clean" : "dirty"}\`

## Human Work Order

- \`${humanPath}\`
- \`${bundlePath}\`

Validate locally before sending:

\`\`\`bash
npm run zk:c01-external-review-request-bundle-check
npm run zk:c01-external-review-handoff-check
npm run zk:c01-production-verifier-artifact-request-check
\`\`\`

## Sha256-Pinned Outbound Files

${outboundLines.join("\n")}

## Review Order (External Returns Required)

1. Source review acceptance — \`VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check\`
2. Production output manifest preflight — \`VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT=<artifact-dir> npm run zk:c01-production-output-manifest-check\`
3. Deterministic production artifact build — \`VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-json> npm run zk:c01-deterministic-production-artifact-build-check\`
4. Production artifact bundle — \`VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-json> npm run zk:c01-production-artifact-acceptance-gate-check\`
5. Verifier adapter acceptance — \`VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-json> npm run zk:c01-verifier-adapter-acceptance-gate-check\`
6. SBF/live lineage acceptance — \`VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check\`
7. Audit/reviewer acceptance — \`VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-json> npm run zk:c01-audit-reviewer-acceptance-gate-check\`
8. Composite closure — all four reviewed packets plus \`npm run zk:c01-verifier-evidence-closure-gate-check\`

## Operator Local Context (Comparison Only)

These prove deployed operator relay truth but do **not** satisfy production verifier-adapter acceptance:

- \`ops/mainnet/private-pool-v2-groth16-verifier-adapter-artifact.evidence.json\`
- \`ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.evidence.json\`

## Non-Claims

This package is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, not audit/reviewer acceptance, not C01 closure, and not fund-release approval.
`;

const result = {
  generator: "c01-external-review-send-package",
  status: "ready",
  dryRun,
  outputPath,
  reviewStartCommitRef: `git:${head}`,
  branch,
  outboundFileCount: bundle.outboundFiles?.length ?? 0,
};

if (!dryRun) {
  mkdirSync(resolve(repoRoot, outputDir), { recursive: true });
  writeFileSync(resolve(repoRoot, outputPath), body, "utf8");
}

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`C01 external review send package: ${dryRun ? "DRY RUN" : "WRITTEN"}`);
  console.log(`output: ${outputPath}`);
  console.log(`commit: git:${head}`);
}
