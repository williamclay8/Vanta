import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const capabilitySource = readFileSync(
  resolve(repoRoot, "src/solana/shieldAssetCapability.ts"),
  "utf8",
);
const shieldPageSource = readFileSync(resolve(repoRoot, "src/pages/ShieldPage.tsx"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

const requiredCapabilityCopy = [
  "direct-native-sol",
  "direct-configured-token",
  "route-to-configured-shield-token",
  "unsupported",
  "supportsDirectShield",
  "requiresPublicRoute",
  "targetShieldAsset",
  "asset can enter shielded state as itself",
  "source asset must be routed into a configured shield asset before shielding",
];

const failures = [];

for (const text of requiredCapabilityCopy) {
  if (!capabilitySource.includes(text)) {
    failures.push(`Missing shield capability contract text: ${text}`);
  }
}

if (!shieldPageSource.includes("createShieldAssetCapability")) {
  failures.push("Shield page must use the shield asset capability contract.");
}

if (!shieldPageSource.includes("capability.routeLabel")) {
  failures.push("Shield page must render route copy from the capability contract.");
}

if (!shieldPageSource.includes("Route:")) {
  failures.push("Shield page must show the computed source-to-shield route.");
}

if (!shieldPageSource.includes("capability.targetShieldAsset?.label")) {
  failures.push("Shield page must show the computed shield target label.");
}

if (!packageSource.includes('"shield:capability-check"')) {
  failures.push("package.json must expose shield:capability-check.");
}

if (failures.length > 0) {
  console.error("Vanta shield capability contract check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta shield capability contract check: PASS");
