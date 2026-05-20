#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

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
Native SOL TAG6 full release evidence verifier

Usage:
  node scripts/native-sol-tag6/verify-full-tag6-sol-release-evidence.mjs --tx <signature> --receipt <evidence.json> [--json]

This verifier is intentionally fail-closed. It only passes when a local evidence
JSON file explicitly records the fields needed before Vanta can cite a live TAG6
SOL release:
  - txSignature matches --tx
  - systemTransferFromSolVault: true
  - operatorSignerAbsent: true
  - unshieldEventObserved: true
  - nullifierConsumed: true
  - publicInputsHashMatched: true
  - proofVerified: true

It does not fetch mainnet by itself and does not approve production privacy.
`);
}

if (hasArg("--help")) {
  printHelp();
  process.exit(0);
}

const tx = getArg("--tx");
const receiptPath = getArg("--receipt");
const json = hasArg("--json");

const failures = [];

if (!tx) failures.push("missing --tx");
if (!receiptPath) failures.push("missing --receipt");
if (receiptPath && !existsSync(receiptPath)) failures.push(`missing receipt file: ${receiptPath}`);

let receipt = null;
if (receiptPath && existsSync(receiptPath)) {
  try {
    receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  } catch (error) {
    failures.push(`receipt is not valid JSON: ${error.message}`);
  }
}

const requiredTrueFields = [
  "systemTransferFromSolVault",
  "operatorSignerAbsent",
  "unshieldEventObserved",
  "nullifierConsumed",
  "publicInputsHashMatched",
  "proofVerified",
];

if (receipt) {
  if (receipt.txSignature !== tx) {
    failures.push("receipt.txSignature does not match --tx");
  }
  for (const field of requiredTrueFields) {
    if (receipt[field] !== true) {
      failures.push(`receipt.${field} must be true`);
    }
  }
}

const result = {
  verifier: "native-sol-tag6-full-release-evidence",
  status: failures.length === 0 ? "pass" : "fail",
  productionReady: false,
  privacyClaimAllowed: false,
  txSignature: tx ?? null,
  receiptPath: receiptPath ?? null,
  failures,
  note:
    "Passing this local schema check is only one input to the external gate. It is not deployment, audit acceptance, or production privacy approval.",
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.status === "pass") {
  console.log("Native SOL TAG6 release evidence verifier: PASS");
} else {
  console.error("Native SOL TAG6 release evidence verifier: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  if (!tx || !receiptPath) printHelp();
}

process.exit(result.status === "pass" ? 0 : 1);
