#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function readRequired(path) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${path}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireMarkers(label, content, markers) {
  for (const marker of markers) {
    if (!content.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
  }
}

function commandAvailable(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return result.status === 0;
}

function runNargoTest(circuitPath) {
  if (!commandAvailable("nargo")) {
    failures.push("nargo is not available; cannot verify June 17 starter circuit");
    return;
  }
  const nargoHome = resolve(repoRoot, ".tmp", "nargo-home");
  const xdgCacheHome = resolve(repoRoot, ".tmp", "xdg-cache");
  mkdirSync(nargoHome, { recursive: true });
  mkdirSync(xdgCacheHome, { recursive: true });
  try {
    execFileSync("nargo", ["test"], {
      cwd: resolve(repoRoot, circuitPath),
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        NARGO_HOME: nargoHome,
        XDG_CACHE_HOME: xdgCacheHome,
      },
      stdio: "inherit",
    });
  } catch {
    failures.push(`nargo test failed in ${circuitPath}`);
  }
}

console.log("=== twitter-pass-2026-06-17-research-artifacts ===");

const requirements = readRequired("docs/twitter-intelligence/2026-06-17-requirements.md");
const synthesis = readRequired("docs/zk/vanta-phase2-update-2026-06-17-signals.md");
const wrapper = readRequired("src/zk/vantaPassportEligibility.ts");

requireMarkers("June 17 requirements", requirements, [
  "T30 - Passport Reputation Gate",
  "T31 - Passport Proof Header Wrapper",
  "T32 - Post-Quantum Resilience Plan",
  "T33 - Delegated Privacy Ring Capabilities",
  "T34 - Private Bridge-Intent Watch Item",
  "june17-hermes-backed",
  "public-web-backed",
  "Vanta design inference",
  "not a ZkMedusa integration",
  "not post-quantum Vanta",
  "not Helius integration",
  "not a bridge",
  "not production",
]);

requireMarkers("June 17 synthesis", synthesis, [
  "ZkMedusa Passport SDK Deep Dive",
  "Clean Install Test",
  "EUNSUPPORTEDPROTOCOL",
  "Post-Quantum Resilience Plan",
  "ML-KEM",
  "base oblivious transfers",
  "session-key caching",
  "VeerTx Private Payments / ZEC Bridge Pattern",
  "HeliusPrivacy / Light Follow-Up",
  "Backlog Additions",
  "T30",
  "T31",
  "T32",
  "claimBoundary",
  "No production privacy",
]);

requireMarkers("Passport wrapper", wrapper, [
  "VantaPassportEligibilityPolicy",
  "VantaPassportEligibilityWitness",
  "VantaPassportEligibilityHeader",
  "createVantaPassportEligibilityHeader",
  "passportReputationGate",
  "vanta_passport_reputation_gate",
  "hasActiveVerifier",
  "hasConsumedNullifier",
  "redactedFields",
  "claim_wallet_blinding",
  "allowlist_leaf_secret",
  "allowlist_path_indices",
  "local-proof-header-candidate-not-zkmedusa-integration-not-production-private",
]);

const circuitPath = "zk/noir/vanta_passport_reputation_gate";
const manifest = readRequired(`${circuitPath}/Nargo.toml`);
const source = readRequired(`${circuitPath}/src/main.nr`);
const readme = readRequired(`${circuitPath}/README.md`);
const prover = readRequired(`${circuitPath}/Prover.toml`);

requireMarkers(`${circuitPath} manifest`, manifest, [
  "type = \"bin\"",
  "poseidon",
  "v0.1.1",
]);
requireMarkers(`${circuitPath} source`, source, [
  "hash_passport_commitment",
  "hash_claim_wallet_commitment",
  "hash_allowlist_leaf",
  "compute_allowlist_root",
  "hash_eligibility_nullifier",
  "risk_flag == 0",
  "expiry_slot >= current_slot_floor",
  "allowlist_root",
  "claim_wallet_commitment",
]);
requireMarkers(`${circuitPath} README`, readme, [
  "Claim Boundary",
  "not a ZkMedusa integration",
  "candidate commitment shape",
  "wallet-isolation",
  "ba04f0a3b53b2a2037debe41d55c1595b1bde507",
  "not a lockfile-level immutability guarantee",
  "nargo test",
]);
requireMarkers(`${circuitPath} prover`, prover, [
  "reputation_score",
  "allowlist_path",
  "eligibility_nullifier",
]);

runNargoTest(circuitPath);

if (failures.length > 0) {
  console.error("FAIL: June 17 research artifacts are incomplete");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: June 17 research artifacts are source-labeled, claim-blocked, and circuit-checkable");
