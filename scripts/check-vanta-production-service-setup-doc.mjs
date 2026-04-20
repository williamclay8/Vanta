import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const docPath = resolve(repoRoot, "docs/production-private-pool-v2-service-setup.md");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(docPath), "Missing docs/production-private-pool-v2-service-setup.md.");

const source = readFileSync(docPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

const requiredPhrases = [
  "# Production Private Pool v2 Service Setup",
  "Current Render inventory",
  "vanta-staging-private-pool-v2",
  "https://vanta-staging-private-pool-v2.onrender.com",
  "https://vanta-0wwi.onrender.com",
  "No production indexer, prover, relayer, verifier, or operator service is currently deployed",
  "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services",
  "ops/mainnet/private-pool-v2-production-smoke.template.json",
  "ops/mainnet/mainnet-approval-gates.template.json",
  "npm run mainnet:private-pool-v2-production-smoke-check",
  "npm run mainnet:approval-gates-check",
  "npm run mainnet:preflight",
  "secret-manager-backed refs only",
  "real funds are not approved",
  "mainnetReady: false",
  "productionReady: false",
];

for (const phrase of requiredPhrases) {
  assert.ok(source.includes(phrase), `Production service setup doc is missing required phrase: ${phrase}`);
}

for (const forbidden of [
  "PRIVATE_KEY=",
  "SEED_PHRASE=",
  "MNEMONIC=",
  "DATABASE_URL=postgres://",
  "Bearer ",
  "sk_live_",
  "raw service token",
]) {
  assert.ok(!source.includes(forbidden), `Production service setup doc must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["mainnet:production-service-setup-check"],
  "node scripts/check-vanta-production-service-setup-doc.mjs",
  "package.json must expose mainnet:production-service-setup-check.",
);

assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:production-service-setup-check"),
  "mainnet:preflight must include the production service setup doc check.",
);

console.log("Vanta production service setup doc check: PASS");
