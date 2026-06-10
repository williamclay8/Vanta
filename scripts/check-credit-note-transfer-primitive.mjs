#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function readRequired(path) {
  try {
    return readFileSync(resolve(repoRoot, path), "utf8");
  } catch {
    failures.push(`Missing required file: ${path}`);
    return "";
  }
}

function requireMarkers(label, content, markers) {
  for (const marker of markers) {
    if (!content.includes(marker)) failures.push(`${label} missing ${marker}`);
  }
}

function run(command, args) {
  try {
    execFileSync(command, args, { cwd: repoRoot, stdio: "inherit" });
  } catch {
    failures.push(`Command failed: ${command} ${args.join(" ")}`);
  }
}

console.log("=== credit-note-transfer-primitive-check (June 10 T5) ===");

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-10-requirements.md");
const darkdropWatch = readRequired("docs/twitter-intelligence/darkdrop-watch.md");
const circuit = readRequired("zk/noir/vanta_private_credit_note_transfer/src/main.nr");
const readme = readRequired("zk/noir/vanta_private_credit_note_transfer/README.md");
const proofRequestsSource = readRequired("src/zk/vantaPhase2ProductProofRequests.mjs");
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, [
  "private_transfers_credit_notes:",
  "DarkDrop",
  "Merkle vault deposit",
  "encrypted claim code",
  "credit_note_commitment",
  "direct lamport manipulation",
]);
requireMarkers("2026-06-10 requirements", requirements, [
  "T5 - Private Transfers / Credit Notes",
  "DarkDrop",
  "credit notes",
  "dead drops",
  "direct lamport manipulation",
]);
requireMarkers("darkdrop-watch.md", darkdropWatch, [
  "DarkDrop",
  "credit-note",
  "dead-drop",
  "SOL + USDC",
  "trusted setup",
]);
requireMarkers("credit-note circuit", circuit, [
  "hash_deposit_commitment",
  "hash_claim_code_commitment",
  "hash_credit_note_commitment",
  "hash_withdraw_nullifier",
  "amount_bucket_min",
  "amount_bucket_max",
]);
requireMarkers("credit-note README", readme, [
  "credit-note / dead-drop",
  "DarkDrop-inspired",
  "not a production private transfer claim",
  "npm run zk:credit-note-transfer-circuit-check",
]);
requireMarkers("proof request bridge", proofRequestsSource, [
  "createCreditNoteTransferBrowserProofRequest",
  "creditNoteTransfer",
  "zk/noir/vanta_private_credit_note_transfer",
]);

try {
  const module = await import(resolve(repoRoot, "src/zk/vantaPhase2ProductProofRequests.mjs"));
  const request = module.createCreditNoteTransferBrowserProofRequest({
    amount_bucket_min: "100",
    amount_bucket_max: "1000",
    asset_id: "1",
    recipient_commitment: "poseidon:recipient",
    withdraw_context: "77",
    deposit_commitment: "poseidon:deposit",
    claim_code_commitment: "poseidon:claim",
    credit_note_commitment: "poseidon:note",
    nullifier: "poseidon:nullifier",
  });
  module.assertNoPrivateProofRequestLeak(request, ["700", "deposit-secret", "claim-secret"]);
  if (!request.verificationCommands.includes("npm run zk:credit-note-transfer-circuit-check")) {
    failures.push("credit note proof request missing circuit verification command");
  }
} catch (error) {
  failures.push(`credit-note proof request helper failed: ${error.message}`);
}

run("node", ["scripts/check-vanta-phase2-product-noir-circuit.mjs", "credit-note-transfer"]);

if (
  packageJson.scripts?.["credit-note-transfer-primitive-check"] !==
  "node scripts/check-credit-note-transfer-primitive.mjs"
) {
  failures.push("package.json missing credit-note-transfer-primitive-check script");
}

if (failures.length > 0) {
  console.error("FAIL: credit-note transfer primitive incomplete");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: credit-note transfer primitive is circuit/request/state/doc wired");
