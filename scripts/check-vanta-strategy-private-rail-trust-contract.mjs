import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function sourceOf(path) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${path}`);
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function requireMarkers(path, markers) {
  const source = sourceOf(path);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker ${marker} in ${path}`);
    }
  }
  return source;
}

const contractSource = requireMarkers("src/strategy/strategyPrivateRailTrustContract.ts", [
  "VANTA_STRATEGY_PRIVATE_RAIL_TRUST_CONTRACT_VERSION",
  "vanta-strategy-private-rail-trust-contract-0.1",
  "getStrategyPrivateRailTrustContract",
  "hash-bound proof-public Strategy rail preview",
  "fullyPrivateStrategyClaim: false",
  "productionPrivacyClaimsLocked: true",
  "operatorPacketFields",
  "redactedFields",
  "verificationSurfaces",
  "npm run strategy:private-rail-check",
  "npm run strategy:committed-settlement-check",
  "npm run strategy:route-quote-privacy-check",
  "npm run strategy:production-service-readiness-check",
  "npm run strategy:operator-runtime-check",
]);

const railSource = requireMarkers("src/strategy/strategyPrivateRail.ts", [
  "getStrategyPrivateRailTrustContract",
  "trustContract",
  "VANTA_STRATEGY_PRIVATE_RAIL_TRUST_CONTRACT_VERSION",
]);

const pageSource = requireMarkers("src/pages/StrategyPage.tsx", [
  "getStrategyPrivateRailTrustContract",
  "strategyPrivateRailTrustContract",
  "Strategy trust packet",
  "Strategy receipt packet",
  "Hash-bound packet preview",
  "Operator plaintext shared",
  "Shielded private-core note required",
  "Live strategy execution still needs readiness, operator, audit, and mainnet evidence.",
  "npm run strategy:private-rail-check",
]);

const checkSource = sourceOf("scripts/check-vanta-strategy-private-rail.mjs");
const packageSource = sourceOf("package.json");

for (const marker of [
  "trustContract.version",
  "trustContract.claimControls.fullyPrivateStrategyClaim",
  "trustContract.redactedFields",
]) {
  if (!checkSource.includes(marker)) {
    failures.push(`Strategy private rail check must assert ${marker}`);
  }
}

if (!packageSource.includes('"strategy:private-rail-trust-contract-check"')) {
  failures.push("package.json must expose strategy:private-rail-trust-contract-check.");
}

if (!packageSource.includes('"strategy:committed-settlement-check"')) {
  failures.push("package.json must expose strategy:committed-settlement-check.");
}

if (!packageSource.includes('"strategy:route-quote-privacy-check"')) {
  failures.push("package.json must expose strategy:route-quote-privacy-check.");
}

if (!packageSource.includes('"strategy:production-service-readiness-check"')) {
  failures.push("package.json must expose strategy:production-service-readiness-check.");
}

if (!packageSource.includes('"strategy:operator-runtime-check"')) {
  failures.push("package.json must expose strategy:operator-runtime-check.");
}

if (!packageSource.includes("npm run strategy:committed-settlement-check")) {
  failures.push("strategy:verify must include strategy:committed-settlement-check.");
}

if (!packageSource.includes("npm run strategy:route-quote-privacy-check")) {
  failures.push("strategy:verify must include strategy:route-quote-privacy-check.");
}

if (!packageSource.includes("npm run strategy:production-service-readiness-check")) {
  failures.push("strategy:verify must include strategy:production-service-readiness-check.");
}

if (!packageSource.includes("npm run strategy:operator-runtime-check")) {
  failures.push("strategy:verify must include strategy:operator-runtime-check.");
}

if (!packageSource.includes("npm run strategy:private-rail-trust-contract-check")) {
  failures.push("strategy:verify must include strategy:private-rail-trust-contract-check.");
}

for (const banned of [
  "Fully private Strategy",
  "Anonymous strategy",
  "Untraceable TWAP",
  "Live private strategy execution",
  "Production-ready private strategy",
]) {
  if (contractSource.includes(banned) || railSource.includes(banned)) {
    failures.push(`Banned Strategy privacy claim found: ${banned}`);
  }

  if (pageSource.includes(banned)) {
    failures.push(`Banned Strategy privacy claim found in page: ${banned}`);
  }
}

if (failures.length > 0) {
  console.error("Vanta Strategy private rail trust contract check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Strategy private rail trust contract check: PASS");
