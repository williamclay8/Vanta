#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const spec = {
  "id": "T14",
  "title": "ZK Bounty Hardware Attestation for RWA Velocity",
  "scriptFile": "check-zkbounty-hardware-attestation-for-rwa-velocity.mjs",
  "npmScript": "twitter-pass-2026-06-12-zkbounty-attestation-check",
  "watchPath": "/Users/clay/Desktop/Vanta Vault/02 Projects/ZKBounty-Hardware-Attestation-Watch-Item.md",
  "stateMarkers": [
    "id: T14",
    "ZK Bounty Hardware Attestation for RWA Velocity",
    "zkbounty_hardware_attestation_for_rwa_velocity_details:",
    "Solana slot hash",
    "https://x.com/zk_bounty/status/2065464938680721770"
  ],
  "docMarkers": [
    "T14 - ZK Bounty Hardware Attestation for RWA Velocity",
    "4-layer attestation",
    "Solana slot hash",
    "RWA binding"
  ],
  "vaultMarkers": [
    "T14 - ZK Bounty Hardware Attestation for RWA Velocity",
    "4-layer attestation",
    "https://x.com/zk_bounty/status/2065464938680721770"
  ],
  "watchMarkers": [
    "ZK Bounty",
    "@zk_bounty",
    "Solana slot hash",
    "hardware ZK proofs"
  ]
};
const failures = [];

function readRequired(path) {
  const fullPath = path.startsWith("/") ? path : resolve(repoRoot, path);
  try {
    return readFileSync(fullPath, "utf8");
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

console.log(`=== ${spec.npmScript} (${spec.id}) ===`);

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-12-requirements.md");
const integration = readRequired("/Users/clay/Desktop/Vanta Vault/02 Projects/Twitter-Pass-Integration-2026-06-12.md");
const watch = readRequired(spec.watchPath);
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, spec.stateMarkers);
requireMarkers("2026-06-12 requirements", requirements, spec.docMarkers);
requireMarkers("Twitter-Pass-Integration-2026-06-12", integration, spec.vaultMarkers);
requireMarkers("watch item", watch, spec.watchMarkers);

if (packageJson.scripts?.[spec.npmScript] !== `node scripts/${spec.scriptFile}`) {
  failures.push(`package.json missing ${spec.npmScript} script`);
}
if (!packageJson.scripts?.["twitter-intelligence:check"]?.includes(`npm run ${spec.npmScript}`)) {
  failures.push(`twitter-intelligence:check missing ${spec.npmScript}`);
}

if (failures.length > 0) {
  console.error(`FAIL: ${spec.title} is not fully wired`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: ${spec.title} is state/doc/vault/package wired with fail-closed claim boundary`);
