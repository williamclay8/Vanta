#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const target = process.argv[2];

const circuits = {
  "selective-disclosure": {
    label: "Vanta selective disclosure",
    path: "zk/noir/vanta_selective_disclosure",
  },
  "velocity-aggregate": {
    label: "Vanta velocity aggregate",
    path: "zk/noir/vanta_velocity_aggregate",
  },
  "credit-note-transfer": {
    label: "Vanta credit-note private transfer",
    path: "zk/noir/vanta_private_credit_note_transfer",
  },
  "rwa-compliance": {
    label: "Vanta RWA compliance",
    path: "zk/noir/vanta_rwa_compliance",
  },
  "private-perps-risk": {
    label: "Vanta private perps risk",
    path: "zk/noir/vanta_private_perps_risk",
  },
  "agent-spending-limit": {
    label: "Vanta agent spending limit",
    path: "zk/noir/vanta_agent_spending_limit",
  },
  "verifiable-compute-hybrid": {
    label: "Vanta verifiable compute hybrid",
    path: "zk/noir/vanta_verifiable_compute_hybrid",
  },
};

const circuit = circuits[target];

if (!circuit) {
  console.error("Unknown Phase 2 product Noir circuit target.");
  console.error(`Expected one of: ${Object.keys(circuits).join(", ")}`);
  process.exit(1);
}

const circuitDir = resolve(repoRoot, circuit.path);
const manifestPath = resolve(circuitDir, "Nargo.toml");

if (!existsSync(manifestPath)) {
  console.error(`Missing Nargo.toml for ${circuit.label}: ${manifestPath}`);
  process.exit(1);
}

console.log(`${circuit.label} circuit check: ${circuit.path}`);
execFileSync("nargo", ["test"], {
  cwd: circuitDir,
  stdio: "inherit",
});
console.log(`${circuit.label} circuit check: PASS`);
