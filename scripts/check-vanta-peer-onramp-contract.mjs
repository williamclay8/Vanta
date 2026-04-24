import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packagePath = resolve(repoRoot, "package.json");
const viteEnvPath = resolve(repoRoot, "src/vite-env.d.ts");

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const viteEnvSource = readFileSync(viteEnvPath, "utf8");

assert.equal(
  packageJson.scripts["peer:onramp-contract-check"],
  "node scripts/check-vanta-peer-onramp-contract.mjs",
  "package.json must expose peer:onramp-contract-check.",
);

for (const envKey of [
  "readonly VITE_VANTA_ENABLE_PEER_ONRAMP?: string;",
  "readonly VITE_VANTA_ENABLE_LIVE_PEER_FUNDING?: string;",
]) {
  assert.ok(
    viteEnvSource.includes(envKey),
    `src/vite-env.d.ts must declare ${envKey}`,
  );
}

console.log("Vanta peer onramp contract check: PASS");
