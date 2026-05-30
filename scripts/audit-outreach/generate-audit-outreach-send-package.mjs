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
Production privacy audit outreach send-package generator

Usage:
  node scripts/audit-outreach/generate-audit-outreach-send-package.mjs \\
    --output-dir ops/mainnet/audit-outreach-requests

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

const outputDir = getArg("--output-dir") ?? "ops/mainnet/audit-outreach-requests";
const dryRun = hasArg("--dry-run");
const json = hasArg("--json");

const evidencePath = "ops/mainnet/production-privacy-audit-outreach.evidence.json";
const humanPath = "ops/mainnet/audit-outreach-requests/production-privacy-audit-external-evidence-request.md";
const evidence = JSON.parse(readFileSync(resolve(repoRoot, evidencePath), "utf8"));

const head = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
const treeStatus = execSync("git status --short", { cwd: repoRoot, encoding: "utf8" }).trim();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fileName = `PRODUCTION-PRIVACY-AUDIT-OUTREACH-REQUEST-${timestamp}.md`;
const outputPath = join(outputDir, fileName);

const outboundLines = (evidence.outboundFiles ?? []).map((entry) => {
  const hash = sha256Ref(entry.path);
  return `- \`${entry.path}\` (${entry.group}) — ${hash}`;
});

const laneLines = (evidence.requiredReviewerLanes ?? []).map(
  (lane) => `- **${lane.id}**: ${lane.scope}`,
);

const body = `# Production Privacy Audit Outreach Request

Status: draft outbound send-list
Production privacy claim: blocked
Audit claim: blocked
Band 7 item: 21 — contract two independent audit firms

## Repo Starting Point

- repo: https://github.com/williamclay8/Vanta.git
- branch: \`${branch}\`
- reviewStartCommitRef: \`git:${head}\`
- treeStatusAtCollection: \`${treeStatus.length === 0 ? "clean" : "dirty"}\`

## Human Work Order

- \`${humanPath}\`
- \`${evidencePath}\`

Validate locally before sending:

\`\`\`bash
npm run audit:outreach-prep-check
npm run audit:outreach-send-package-generate
npm run audit:package-check
\`\`\`

## Required Reviewer Lanes

${laneLines.join("\n")}

## Sha256-Pinned Outbound Files

${outboundLines.join("\n")}

## Required Returned Refs (Refs-Only Intake)

Use \`ops/mainnet/audit-review.packet.template.json\` as the intake shape:

- \`VANTA_AUDIT_REVIEWER_REF\`
- \`VANTA_AUDIT_SCOPE_REF\`
- \`VANTA_AUDIT_REPORT_REF\`
- \`VANTA_AUDIT_FINDINGS_DISPOSITION_REF\`
- \`VANTA_AUDIT_FIX_VERIFICATION_REF\`
- \`VANTA_AUDIT_FINAL_DECISION_REF\`

## Separation From Other External Lanes

- C01 external production verifier artifact review is a separate lane.
- TAG6 native SOL live evidence collection is a separate post-deploy lane.

## Non-Claims

This package is not reviewer selection, not an audit report, not audit acceptance, not C01 closure, not TAG6 live evidence, and not fund-release approval.
`;

const result = {
  generator: "audit-outreach-send-package",
  status: "ready",
  dryRun,
  outputPath,
  reviewStartCommitRef: `git:${head}`,
  branch,
  outboundFileCount: evidence.outboundFiles?.length ?? 0,
};

if (!dryRun) {
  mkdirSync(resolve(repoRoot, outputDir), { recursive: true });
  writeFileSync(resolve(repoRoot, outputPath), body, "utf8");
}

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Audit outreach send package: ${dryRun ? "DRY RUN" : "WRITTEN"}`);
  console.log(`output: ${outputPath}`);
  console.log(`commit: git:${head}`);
}
