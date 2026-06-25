#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const spec = {
  id: "T20",
  title: "Noir on Solana Integration Opportunity",
  scriptFile: "check-noir-on-solana-integration-opportunity.mjs",
  npmScript: "twitter-pass-2026-06-13-noir-solana-integration-check",
  stateMarkers: [
    "id: T20",
    "Noir on Solana Integration Opportunity",
    "noir_on_solana_integration_details:",
    "Noir directly available on Solana",
    "https://x.com/aztecnetwork/status/2065488233627365572",
  ],
  docMarkers: [
    "T20 - Noir on Solana Integration Opportunity",
    "verifier program examples",
    "cross-chain Noir opportunity",
    "Aztec / NoirLang / Solana payments watch",
  ],
  vaultMarkers: [
    "T20 - Noir on Solana Integration Opportunity",
    "validates Vanta's existing Noir-first Phase 2 starter",
    "verifier programs, examples, client proving, and cross-chain Noir usage",
  ],
  watchlistMarkers: ["@aztecnetwork", "@NoirLang", "@solanapayments"],
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
const requirements = readRequired("docs/twitter-intelligence/2026-06-13-requirements.md");
const integration = readRequired([
  "docs/twitter-intelligence/2026-06-13-integration.md",
  "/Users/clay/Desktop/Vanta Vault/02 Projects/Twitter-Pass-Integration-2026-06-13.md"
]);
const watchlists = readRequired([
  "docs/twitter-intelligence/2026-06-13-integration.md",
  "/Users/clay/.hermes/skills/supergrok-research/references/watchlists.md"
]);
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
