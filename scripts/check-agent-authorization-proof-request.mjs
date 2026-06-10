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

console.log("=== agent-authorization-proof-request-check (zkRune pattern) ===");

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-10-requirements.md");
const watch = readRequired("docs/twitter-intelligence/zkrune-watch.md");
const circuit = readRequired("zk/noir/vanta_agent_spending_limit/src/main.nr");
const proofRequestsSource = readRequired("src/zk/vantaPhase2ProductProofRequests.mjs");
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, [
  "agent_authorization_proving:",
  "zkRune",
  "spending_limit",
  "human_approval_commitment",
  "authorization_nullifier",
]);
requireMarkers("2026-06-10 requirements", requirements, [
  "zkAgent Passport",
  "agent authorization",
  "spending limits",
  "human-in-the-loop",
]);
requireMarkers("zkrune-watch.md", watch, [
  "zkRune",
  "zkAgent Passport",
  "client-side Groth16",
  "human-in-the-loop",
]);
requireMarkers("agent circuit", circuit, [
  "hash_authorization_nullifier",
  "spend_amount <= spending_limit",
  "human_approval_commitment",
  "policy_epoch",
]);
requireMarkers("proof request bridge", proofRequestsSource, [
  "createAgentSpendingLimitBrowserProofRequest",
  "agentSpendingLimit",
  "zk/noir/vanta_agent_spending_limit",
]);

try {
  const module = await import(resolve(repoRoot, "src/zk/vantaPhase2ProductProofRequests.mjs"));
  const request = module.createAgentSpendingLimitBrowserProofRequest({
    agent_id: "42",
    spending_limit: "500",
    policy_epoch: "20260610",
    human_approval_commitment: "poseidon:approval",
    authorization_nullifier: "poseidon:nullifier",
    policy_commitment: "poseidon:policy",
  });
  module.assertNoPrivateProofRequestLeak(request, ["450", "operator-secret", "approval-secret"]);
} catch (error) {
  failures.push(`agent proof request helper failed: ${error.message}`);
}

run("node", ["scripts/check-vanta-phase2-product-noir-circuit.mjs", "agent-spending-limit"]);

if (
  packageJson.scripts?.["agent-authorization-proof-request-check"] !==
  "node scripts/check-agent-authorization-proof-request.mjs"
) {
  failures.push("package.json missing agent-authorization-proof-request-check script");
}

if (failures.length > 0) {
  console.error("FAIL: agent authorization proof request incomplete");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: agent authorization proof request and circuit are wired");
