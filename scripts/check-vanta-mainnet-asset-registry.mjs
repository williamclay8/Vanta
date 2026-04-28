import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const shieldConfig = readFileSync(new URL("../src/solana/shieldConfig.ts", import.meta.url), "utf8");
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const requiredMainnetMints = {
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  PYUSD: "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

assert.ok(
  shieldConfig.includes('export type VantaSolanaCluster = "devnet" | "mainnet-beta"'),
  "Shield config must expose a cluster-aware Solana cluster type.",
);
assert.ok(
  shieldConfig.includes("VITE_SOLANA_CLUSTER"),
  "Shield config must read VITE_SOLANA_CLUSTER.",
);
assert.ok(
  shieldConfig.includes("vantaExplicitMainnetApproval"),
  "Shield config must expose the bounded-mainnet approval flag for wallet summaries.",
);
assert.ok(
  shieldConfig.includes("VITE_VANTA_MAINNET_VAULT_OWNER"),
  "Shield config must use a mainnet vault-owner env before executable mainnet lanes.",
);

for (const [symbol, mint] of Object.entries(requiredMainnetMints)) {
  assert.ok(
    shieldConfig.includes(mint),
    `Shield config must recognize ${symbol} mainnet mint ${mint}.`,
  );
  assert.ok(
    envExample.includes(`VITE_VANTA_MAINNET_${symbol}_MINT`),
    `.env.example must document VITE_VANTA_MAINNET_${symbol}_MINT.`,
  );
}

for (const symbol of ["JUP", "WIF", "KMNO"]) {
  assert.ok(
    envExample.includes(`VITE_VANTA_MAINNET_${symbol}_MINT=`),
    `.env.example must reserve VITE_VANTA_MAINNET_${symbol}_MINT for operator-supplied mainnet mint refs.`,
  );
}

assert.equal(
  packageJson.scripts["mainnet:asset-registry-check"],
  "node scripts/check-vanta-mainnet-asset-registry.mjs",
  "package.json must expose mainnet:asset-registry-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:asset-registry-check"),
  "mainnet:preflight must include the mainnet asset registry check.",
);

console.log("Vanta mainnet asset registry check: PASS");
