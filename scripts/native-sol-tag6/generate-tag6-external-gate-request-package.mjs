#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);

function getArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function hasArg(name) {
  return args.includes(name);
}

function printHelp() {
  console.log(`
Native SOL TAG6 external gate request package generator

Usage:
  node scripts/native-sol-tag6/generate-tag6-external-gate-request-package.mjs \\
    --owner-statement "<reviewed statement>" \\
    --output-dir ops/mainnet/tag6-gate-requests

Use --dry-run --json to preview without writing.
This is a package scaffold, not owner approval, deployment, audit acceptance, or
production privacy claim elevation.
`);
}

if (hasArg("--help")) {
  printHelp();
  process.exit(0);
}

const ownerStatement = getArg("--owner-statement");
const outputDir = getArg("--output-dir") ?? "ops/mainnet/tag6-gate-requests";
const dryRun = hasArg("--dry-run");
const json = hasArg("--json");

const failures = [];
if (!ownerStatement) {
  failures.push("missing --owner-statement");
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fileName = `TAG6-EXTERNAL-GATE-REQUEST-${timestamp}.md`;
const outputPath = join(outputDir, fileName);

const body = `# Native SOL TAG6 External Gate Request

Status: draft
Production privacy claim: blocked
Mainnet readiness claim: blocked

## Owner Statement

${ownerStatement ?? "[missing]"}

## Evidence Requirements Before Any Claim Elevation

- Local predeploy checklist is green.
- Mainnet deployment was explicitly approved and reviewed.
- Production indexer snapshot contains native SOL sentinel commitments.
- At least one proof-verified mainnet TAG6 SOL unshield release is verified.
- External reviewer or owner gate accepts the evidence packet.

## Non-Claims

This package is not an audit report, deployment proof, live-release proof, legal
or compliance approval, custody approval, or production privacy approval.
`;

const result = {
  generator: "native-sol-tag6-external-gate-request-package",
  status: failures.length === 0 ? "ready" : "blocked",
  dryRun,
  outputPath,
  failures,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (failures.length > 0) {
  console.error("Native SOL TAG6 external gate package: BLOCKED");
  for (const failure of failures) console.error(`- ${failure}`);
  printHelp();
} else if (dryRun) {
  console.log(body);
} else {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, body);
  console.log(`Wrote ${outputPath}`);
}

process.exit(failures.length === 0 ? 0 : 1);
