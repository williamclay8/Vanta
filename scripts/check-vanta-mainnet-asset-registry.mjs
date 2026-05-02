import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const shieldConfig = readFileSync(new URL("../src/solana/shieldConfig.ts", import.meta.url), "utf8");
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const requiredMainnetMints = {
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  KMNO: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",
  PYUSD: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
};

assert.ok(
  shieldConfig.includes('export type VantaSolanaCluster = "mainnet-beta"'),
  "Shield config must expose the mainnet-beta Solana cluster type.",
);
assert.ok(
  shieldConfig.includes("const isMainnetCluster = true"),
  "Shield config must hard-select mainnet for static production builds.",
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
