import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const availabilitySource = readRepoFile("src/solana/tokenAvailability.ts");
const tokenAvailabilityCheckSource = readRepoFile("scripts/check-vanta-token-availability.mjs");
const packageJson = JSON.parse(readRepoFile("package.json"));

assert(
  availabilitySource.includes("publicInput: VantaTokenCapabilityLane"),
  "Token availability must expose a public input capability lane.",
);
assert(
  availabilitySource.includes("shieldTarget: VantaTokenCapabilityLane"),
  "Token availability must expose a configured shield target capability lane.",
);
assert(
  availabilitySource.includes("poolBackedPrivateAsset: VantaTokenCapabilityLane"),
  "Token availability must expose a pool-backed private asset capability lane.",
);
assert(
  availabilitySource.includes("unshield: VantaTokenActionAvailability"),
  "Token availability must expose an explicit Unshield action lane.",
);
assert(
  availabilitySource.includes('"routeable-public-input"') &&
    availabilitySource.includes('"configured-shield-target"') &&
    availabilitySource.includes('"pool-backed-private-asset"'),
  "Token capability lanes must name the routeable input, shield target, and pool-backed private asset boundaries.",
);
assert(
  availabilitySource.includes('"blocked"') &&
    availabilitySource.includes('"not-applicable"') &&
    availabilitySource.includes('"ready"'),
  "Token capability lanes must use explicit readiness statuses.",
);
assert(
  availabilitySource.includes("production anonymity-set readiness is still blocked") ||
    availabilitySource.includes("production anonymity set is still blocked"),
  "Pool-backed private asset status must preserve the current anonymity-set blocker.",
);
assert(
  availabilitySource.includes("This asset can route into a configured shield target before privacy begins."),
  "Routeable non-shield assets must say privacy begins after routing into a shield target.",
);
assert(
  availabilitySource.includes("operator-sol-unshield") &&
    availabilitySource.includes("operator-token-unshield"),
  "Unshield availability must distinguish SOL and configured token operator lanes.",
);
assert(
  tokenAvailabilityCheckSource.includes("poolBackedPrivateAsset") &&
    tokenAvailabilityCheckSource.includes("routeable public input") &&
    tokenAvailabilityCheckSource.includes("configured shield target") &&
    tokenAvailabilityCheckSource.includes("unshield"),
  "The token availability checker must guard the canonical token capability map.",
);
assert(
  packageJson.scripts["token-capability-map:check"] ===
    "node scripts/check-vanta-token-capability-map.mjs",
  "Expected token-capability-map:check package script.",
);
assert(
  packageJson.scripts["token-availability:check"]?.includes("token-capability-map:check"),
  "token-availability:check must include the canonical capability-map checker.",
);

console.log("Vanta token capability map: PASS");
