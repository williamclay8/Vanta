#!/usr/bin/env node
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

function assertRequestShape(name, request) {
  if (!request) {
    failures.push(`${name} request helper returned no packet`);
    return;
  }
  if (request.privateInputsDisclosed !== false) failures.push(`${name} privateInputsDisclosed must be false`);
  if (request.witnessDisclosed !== false) failures.push(`${name} witnessDisclosed must be false`);
  if (request.browserWorkerMessage?.payload?.witnessInput !== null) {
    failures.push(`${name} browser worker request must not disclose witnessInput`);
  }
  if (request.browserWorkerMessage?.payload?.compressedWitness !== null) {
    failures.push(`${name} browser worker request must not disclose compressedWitness`);
  }
  if (!request.proofRuntime?.includes("browser-worker")) {
    failures.push(`${name} must remain browser-worker/client-side shaped`);
  }
  if (request.productionReady !== undefined && request.productionReady !== false) {
    failures.push(`${name} must not claim production readiness`);
  }
}

console.log("=== client-side-proving-enforced-check (June 10 T2) ===");

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-10-requirements.md");
const proofRequestsSource = readRequired("src/zk/vantaPhase2ProductProofRequests.mjs");
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, [
  "client_side_groth16_patterns:",
  "zkRune",
  "browser_groth16_perf_target_seconds: 6",
  "private_inputs_never_leave_client",
  "agent_spending_limit",
]);
requireMarkers("2026-06-10 requirements", requirements, [
  "T2 - Local Proving / Client-Side Groth16",
  "zkRune",
  "90s -> 6s",
  "human-in-the-loop",
]);
requireMarkers("vantaPhase2ProductProofRequests.mjs", proofRequestsSource, [
  "createCreditNoteTransferBrowserProofRequest",
  "createRwaComplianceBrowserProofRequest",
  "createPrivatePerpsRiskBrowserProofRequest",
  "createAgentSpendingLimitBrowserProofRequest",
  "witnessInput: null",
  "compressedWitness: null",
]);

try {
  const module = await import(resolve(repoRoot, "src/zk/vantaPhase2ProductProofRequests.mjs"));
  assertRequestShape(
    "credit-note-transfer",
    module.createCreditNoteTransferBrowserProofRequest({
      amount_bucket_min: "100",
      amount_bucket_max: "1000",
      asset_id: "1",
      recipient_commitment: "poseidon:recipient",
      withdraw_context: "77",
      deposit_commitment: "poseidon:deposit",
      claim_code_commitment: "poseidon:claim",
      credit_note_commitment: "poseidon:note",
      nullifier: "poseidon:nullifier",
    }),
  );
  assertRequestShape(
    "agent-spending-limit",
    module.createAgentSpendingLimitBrowserProofRequest({
      agent_id: "42",
      spending_limit: "500",
      policy_epoch: "20260610",
      human_approval_commitment: "poseidon:approval",
      authorization_nullifier: "poseidon:auth-nullifier",
      policy_commitment: "poseidon:policy",
    }),
  );
} catch (error) {
  failures.push(`Phase 2 proof request helpers failed: ${error.message}`);
}

if (
  packageJson.scripts?.["client-side-proving-enforced-check"] !==
  "node scripts/check-client-side-proving-enforced.mjs"
) {
  failures.push("package.json missing client-side-proving-enforced-check script");
}

if (failures.length > 0) {
  console.error("FAIL: client-side proving contract incomplete");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: client-side Groth16/local proving request shapes are enforced");
