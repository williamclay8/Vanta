#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const spec = {
  "id": "T13",
  "title": "zkRune Client-Side Groth16 Eligibility Gating",
  "scriptFile": "check-zkrune-client-side-groth16-eligibility-gating.mjs",
  "npmScript": "twitter-pass-2026-06-12-zkrune-eligibility-gating-check",
  "watchPath": "/Users/clay/Desktop/Vanta Vault/02 Projects/zkRune-Watch-Item.md",
  "stateMarkers": [
    "id: T13",
    "zkRune Client-Side Groth16 Eligibility Gating",
    "zkrune_client_side_groth16_eligibility_gating_details:",
    "~0.5s with snarkjs",
    "https://x.com/i/status/2065434194155880463"
  ],
  "docMarkers": [
    "T13 - zkRune Client-Side Groth16 Eligibility Gating",
    "HTTP header proof",
    "fail-closed",
    "on-chain verify"
  ],
  "vaultMarkers": [
    "T13 - zkRune Client-Side Groth16 Eligibility Gating",
    "~0.5s with snarkjs",
    "Fail-closed design"
  ],
  "watchMarkers": [
    "June 12 update",
    "Xona Agent",
    "HTTP header proof",
    "fail-closed"
  ]
};
const failures = [];

function readRequired(pathOrPaths) {
  const paths = Array.isArray(pathOrPaths) ? pathOrPaths : [pathOrPaths];
  for (const path of paths) {
    const fullPath = path.startsWith("/") ? path : resolve(repoRoot, path);
    try {
      return readFileSync(fullPath, "utf8");
    } catch {}
  }
  failures.push(`Missing required file: ${paths.join(" or ")}`);
  return "";
}

function requireMarkers(label, content, markers) {
  for (const marker of markers) {
    if (!content.includes(marker)) failures.push(`${label} missing ${marker}`);
  }
}

console.log(`=== ${spec.npmScript} (${spec.id}) ===`);

const state = readRequired("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const requirements = readRequired("docs/twitter-intelligence/2026-06-12-requirements.md");
const integration = readRequired([
  "docs/twitter-intelligence/2026-06-12-integration.md",
  "/Users/clay/Desktop/Vanta Vault/02 Projects/Twitter-Pass-Integration-2026-06-12.md"
]);
const watch = readRequired(["docs/twitter-intelligence/2026-06-12-integration.md", spec.watchPath]);
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
