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
execFileSync("nargo", ["check"], {
  cwd: circuitDir,
  stdio: "inherit",
});
console.log(`${circuit.label} circuit check: PASS`);
