import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const viteEnvSource = readFileSync(new URL("../src/vite-env.d.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const envKeyMatches = [...viteEnvSource.matchAll(/readonly\s+(VITE_[A-Z0-9_]+)\??:/g)];
const envKeys = envKeyMatches.map((match) => match[1]);
const duplicatedEnvKeys = [...new Set(envKeys.filter((key, index) => envKeys.indexOf(key) !== index))];

assert.deepEqual(
  duplicatedEnvKeys,
  [],
  `src/vite-env.d.ts must declare each VITE env key once. Duplicates: ${duplicatedEnvKeys.join(", ")}`,
);

for (const key of [
  "VITE_VANTA_MAINNET_USDT_MINT",
  "VITE_VANTA_MAINNET_EURC_MINT",
  "VITE_VANTA_MAINNET_USDS_MINT",
  "VITE_VANTA_MAINNET_USX_MINT",
  "VITE_VANTA_MAINNET_USD1_MINT",
  "VITE_VANTA_MAINNET_JUPUSD_MINT",
]) {
  assert.ok(envKeys.includes(key), `src/vite-env.d.ts must declare ${key}.`);
}

assert.equal(
  packageJson.scripts["vite-env:contract-check"],
  "node scripts/check-vanta-vite-env-contract.mjs",
  "package.json must expose vite-env:contract-check.",
);
assert.ok(
  packageJson.scripts["token-availability:check"].includes("npm run vite-env:contract-check"),
  "token-availability:check must include vite-env:contract-check.",
);

console.log("Vanta Vite env contract check: PASS");
