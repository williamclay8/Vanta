import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const swapPage = readFileSync(resolve(repoRoot, "src/pages/SwapPage.tsx"), "utf8");
const liveSwapBridge = readFileSync(resolve(repoRoot, "src/zk/liveSwapBridge.ts"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function indexOfRegex(source, pattern, fromIndex = 0) {
  const match = pattern.exec(source.slice(fromIndex));
  return match ? fromIndex + match.index : -1;
}

assert(
  swapPage.includes("requestVantaPrivatePoolV2ProtocolSettlement"),
  "Swap page must request a Private Pool v2 protocol settlement receipt.",
);
assert(
  swapPage.includes("createCommittedSwapSettlementTerms"),
  "Swap page must derive committed settlement terms from the canonical swap bridge.",
);

const committedSettlementGateIndex = swapPage.indexOf(
  "proofReceipt?.intent !== \"swap-to-shielded\"",
);
const browserProofCallIndex = swapPage.indexOf(
  "await createVantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceipt",
  committedSettlementGateIndex,
);
const browserProofBackendGateIndex = indexOfRegex(
  swapPage,
  /proofBackend\s*!==\s*"local-bb-derived-artifact"/u,
  browserProofCallIndex,
);

assert(
  swapPage.includes("{ persist: false }") &&
    committedSettlementGateIndex >= 0 &&
    browserProofCallIndex > committedSettlementGateIndex &&
    browserProofBackendGateIndex > browserProofCallIndex &&
    swapPage.indexOf("persistCanonicalSwapRecord(", browserProofBackendGateIndex) >
      browserProofBackendGateIndex,
  "Swap output note must not be treated complete unless committed settlement and browser-local proof receipts exist.",
);
assert(
  swapPage.includes('action: "swap"') && swapPage.includes('economicsMode: "committed-economics"'),
  "Swap settlement request must use committed-economics mode for action swap.",
);

const settlementCallStart = swapPage.indexOf("requestVantaPrivatePoolV2ProtocolSettlement({");
assert(settlementCallStart >= 0, "Expected Swap page to call the protocol settlement client.");
const settlementCall = swapPage.slice(
  settlementCallStart,
  swapPage.indexOf("});", settlementCallStart),
);

for (const forbiddenField of ["amount:", "asset:", "destination:", "owner:"]) {
  assert(
    !settlementCall.includes(forbiddenField),
    `Committed Swap settlement request must not send raw ${forbiddenField.slice(0, -1)}.`,
  );
}

assert(
  settlementCall.includes("...committedSettlementTerms"),
  "Committed Swap settlement request must send only derived commitment terms.",
);
assert(
  swapPage.includes('proofReceipt?.intent !== "swap-to-shielded"') &&
    swapPage.includes("Committed Swap settlement did not return a swap-to-shielded proof receipt"),
  "Swap page must gate completion on the committed swap-to-shielded proof receipt.",
);

for (const expectedField of [
  "economicsCommitment",
  "inputCommitment",
  "inputRoot",
  "minOutputAmount",
  "nullifierOrReplayCommitment",
  "outputAmount",
  "outputCommitment",
  "outputLeafIndex",
  "outputRoot",
  "ownerCommitment",
  "routeCommitment",
  "settlementCommitment",
  "settlementId",
  "slippageBps",
  "swapContextTag",
  "swapPublicInputHash",
]) {
  assert(
    liveSwapBridge.includes(expectedField),
    `Canonical swap bridge must derive ${expectedField}.`,
  );
}

assert(
  liveSwapBridge.includes("crypto.subtle.digest") &&
    liveSwapBridge.includes("vanta.swap.committed-settlement.v0"),
  "Canonical swap bridge must hash raw economics and route material into domain-separated commitments.",
);
assert(
  liveSwapBridge.includes("requires a canonical input commitment") &&
    liveSwapBridge.includes("requires canonical replay/nullifier material"),
  "Committed Swap settlement must fail closed when canonical input or replay material is unavailable.",
);

console.log("Swap committed-settlement bridge contract is intact.");
