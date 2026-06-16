#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
    failures.push("nargo is not available; cannot verify June 16 starter circuits");
    return;
  }
  try {
    execFileSync("nargo", ["test"], {
      cwd: resolve(repoRoot, circuitPath),
      stdio: "inherit",
    });
  } catch {
    failures.push(`nargo test failed in ${circuitPath}`);
  }
}

console.log("=== twitter-pass-2026-06-16-research-artifacts ===");

const requirements = readRequired("docs/twitter-intelligence/2026-06-16-requirements.md");
const circuitSpecs = readRequired("docs/zk/phase2-june16-research-circuit-specs.md");
const hybridBenchmark = readRequired("docs/zk/hybrid-zk-confidential-compute-benchmark-2026-06-16.md");

requireMarkers("June 16 requirements", requirements, [
  "T22 - Anonymity Pools / Unlinkable Wallet Private Transfers",
  "T23 - Agentic Eligibility Gating / x402-Style Proof Headers",
  "T24 - MPC / Confidential Compute Benchmark for Hybrid ZK",
  "T25 - Compliance-Aware Clean Provenance Selective Disclosure",
  "T26 - FHE / Quantum-Resistant Encrypted Compute Comparison",
  "T27 - Ecosystem Tailwinds, Competitive Positioning, and Token/Traction Discipline",
  "T28 - Helius LaserStream Privacy Monitoring Benchmark",
  "T29 - Noir Profiler Circuit Cost Discipline",
  "cron-output-backed",
  "pasted-brief-backed",
  "prior momentum-bank-backed support",
  "the named June 16 momentum-bank section was not present locally",
  "recovered cron output",
  "Vanta design inference",
  "Helius LaserStream Upgrade",
  "Noir profiler tool",
  "not Voidral integration",
  "not live x402 endpoint support",
  "not Xona integration",
  "not Medusa integration",
  "not Arcium integration",
  "not live confidential compute",
  "not FHE implementation",
  "not post-quantum security",
  "not Privacy Pools integration",
  "not legal/compliance approval",
  "external comparator not Vanta throughput",
  "not production",
]);

requireMarkers("June 16 circuit specs", circuitSpecs, [
  "vanta_unlinkable_transfer_plus",
  "vanta_agent_eligibility_gate",
  "vanta_clean_provenance_disclosure",
  "T29 - Noir Profiler Cost Discipline",
  "vanta-noir-profiler-receipt-candidate-v0.1",
  "cron-output-backed",
  "Helius LaserStream Upgrade",
  "Noir profiler tool",
  "Arcium at Solana Summit Germany",
  "ZkMedusa token mechanics update",
  "Receipt / Registry Formats",
  "not production",
]);

requireMarkers("Hybrid benchmark", hybridBenchmark, [
  "224M MPC rounds",
  "cron-output-backed",
  "pasted-brief-backed",
  "the named June 16 momentum-bank section was not present locally",
  "FHE",
  "Quantum-Resistant Encrypted Compute",
  "externalTrustBoundary",
  "blocked-until-generated-proof-and-review",
  "No Vanta artifact should say or imply post-quantum privacy",
]);

const circuits = [
  {
    path: "zk/noir/vanta_unlinkable_transfer_plus",
    markers: [
      "hash_deposit_commitment",
      "hash_recipient_commitment",
      "hash_transfer_commitment",
      "hash_unlinkable_nullifier",
      "anonymity_root",
      "relayer_context",
    ],
  },
  {
    path: "zk/noir/vanta_agent_eligibility_gate",
    markers: [
      "hash_agent_id_commitment",
      "hash_eligibility_commitment",
      "hash_eligibility_nullifier",
      "settlement_policy_hash",
      "risk_flag == 0",
    ],
  },
  {
    path: "zk/noir/vanta_clean_provenance_disclosure",
    markers: [
      "hash_provenance_commitment",
      "hash_membership_nullifier",
      "provenance_score",
      "risk_bucket",
      "expiry_slot",
    ],
  },
];

for (const circuit of circuits) {
  const manifest = readRequired(`${circuit.path}/Nargo.toml`);
  const source = readRequired(`${circuit.path}/src/main.nr`);
  const readme = readRequired(`${circuit.path}/README.md`);
  requireMarkers(`${circuit.path} manifest`, manifest, ["type = \"bin\"", "poseidon"]);
  requireMarkers(`${circuit.path} source`, source, circuit.markers);
  requireMarkers(`${circuit.path} README`, readme, ["Claim Boundary", "nargo test"]);
  runNargoTest(circuit.path);
}

if (failures.length > 0) {
  console.error("FAIL: June 16 research artifacts are incomplete");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: June 16 research artifacts are source-labeled, claim-blocked, and circuit-checkable");
