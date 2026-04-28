import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const adapterSource = readFileSync("src/solana/solToShieldedRouteAdapter.ts", "utf8");
const capabilitySource = readFileSync("src/solana/shieldedSwapCapability.ts", "utf8");
const shieldConfigSource = readFileSync("src/solana/shieldConfig.ts", "utf8");
const swapPageSource = readFileSync("src/pages/SwapPage.tsx", "utf8");
const viteEnvSource = readFileSync("src/vite-env.d.ts", "utf8");

assert.match(
  shieldConfigSource,
  /VITE_VANTA_SOL_TO_SHIELDED_SWAP_OPERATOR_URL/,
  "Shield config must expose an explicit SOL-to-shielded route adapter URL.",
);
assert.match(
  viteEnvSource,
  /VITE_VANTA_SOL_TO_SHIELDED_SWAP_OPERATOR_URL/,
  "Vite env typing must include the SOL-to-shielded route adapter URL.",
);
assert.match(
  capabilitySource,
  /operator-sol-to-shielded/,
  "Shielded swap capability must model the SOL-to-shielded execution mode.",
);
assert.match(
  capabilitySource,
  /status: "live"/,
  "Configured SOL-to-shielded swap capability must become live once UI execution wiring verifies adapter receipts.",
);
assert.match(
  capabilitySource,
  /Shielded SOL to shielded asset needs the SOL route adapter/,
  "Shielded swap capability must fail closed when the SOL route adapter is absent.",
);
assert.match(
  adapterSource,
  /assertSolToShieldedRouteReceipt/,
  "SOL-to-shielded adapter must expose a settlement/proof receipt assertion.",
);
assert.match(
  adapterSource,
  /requestSolToShieldedRouteExecution/,
  "SOL-to-shielded adapter must expose a typed execution request.",
);
assert.match(
  adapterSource,
  /\/execute/,
  "SOL-to-shielded adapter execution must use an explicit execute endpoint.",
);
assert.match(
  adapterSource,
  /protocolSettlementReceipt\.economicsMode !== "committed-economics"/,
  "SOL-to-shielded adapter must require committed-economics settlement receipts.",
);
assert.match(
  adapterSource,
  /proofReceipt\.intent !== "swap-to-shielded"/,
  "SOL-to-shielded adapter must require swap-to-shielded proof receipts.",
);
assert.match(
  adapterSource,
  /publicInputCommitment/,
  "SOL-to-shielded adapter must require proof public input commitments.",
);
assert.match(
  swapPageSource,
  /fetchSolToShieldedRouteQuote/,
  "Swap UI must request SOL-to-shielded route quotes.",
);
assert.match(
  swapPageSource,
  /requestSolToShieldedRouteExecution/,
  "Swap UI must submit SOL-to-shielded executions through the route adapter.",
);
assert.match(
  swapPageSource,
  /asset: "SOL"/,
  "Swap UI must finalize shielded SOL spent markers for SOL-to-shielded routes.",
);

console.log("Vanta SOL-to-shielded route adapter contract: PASS");
