#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const spec = {
  id: "T19",
  title: "Concordium Identity + ZK Agent/Institutional Pattern",
  scriptFile: "check-concordium-identity-zk-patterns.mjs",
  npmScript: "twitter-pass-2026-06-13-concordium-identity-zk-check",
  stateMarkers: [
    "id: T19",
    "Concordium Identity + ZK Agent/Institutional Pattern",
    "concordium_identity_zk_agent_institutional_details:",
    "protocol-level identity",
    "https://x.com/barondickson/status/2065566719855235083",
  ],
  docMarkers: [
    "T19 - Concordium Identity + ZK Agent/Institutional Pattern",
    "ZK privacy for humans and AI agents",
    "privacy or compliance false choice",
    "identity envelope for institutional selective disclosure",
  ],
  vaultMarkers: [
    "T19 - Concordium Identity + ZK Agent/Institutional Pattern",
    "identity-plus-ZK benchmark",
    "identity envelope, not public identity exposure",
  ],
  watchlistMarkers: ["@barondickson", "Concordium", "identity + ZK"],
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
const requirements = readRequired("docs/twitter-intelligence/2026-06-13-requirements.md");
const integration = readRequired("/Users/clay/Desktop/Vanta Vault/02 Projects/Twitter-Pass-Integration-2026-06-13.md");
const watchlists = readRequired("/Users/clay/.hermes/skills/supergrok-research/references/watchlists.md");
const packageJson = JSON.parse(readRequired("package.json") || "{}");

requireMarkers("state.yaml", state, spec.stateMarkers);
requireMarkers("2026-06-13 requirements", requirements, spec.docMarkers);
requireMarkers("Twitter-Pass-Integration-2026-06-13", integration, spec.vaultMarkers);
requireMarkers("watchlists.md", watchlists, spec.watchlistMarkers);

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

console.log(`PASS: ${spec.title} is state/doc/vault/watchlist/package wired with fail-closed claim boundary`);
