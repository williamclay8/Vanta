import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const swapReceiptBridge = read("src/privacy/privatePoolV2SwapToShieldedBrowserReceipt.ts");
const swapPage = read("src/pages/SwapPage.tsx");
const liveSwapBridge = read("src/zk/liveSwapBridge.ts");
const packageJson = readJson("package.json");
const publicCircuitAssetPath =
  "public/proofs/private-pool-v2/vanta_private_pool_v2_swap_to_shielded_entry.json";
const publicCircuitAsset = readJson(publicCircuitAssetPath);

assert(
  existsSync(resolve(repoRoot, publicCircuitAssetPath)),
  "Swap browser proof receipt bridge must ship the lazy-loaded public circuit asset.",
);
assert(
  typeof publicCircuitAsset.bytecode === "string" &&
    publicCircuitAsset.bytecode.length > 1_000_000,
  "Swap browser proof receipt public circuit asset must include compiled ACIR bytecode.",
);
assert(
  publicCircuitAsset.abi && typeof publicCircuitAsset.abi === "object",
  "Swap browser proof receipt public circuit asset must include the compiled ABI.",
);

for (const requiredBridgeMarker of [
  "VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_BROWSER_RECEIPT_VERSION",
  "VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_BROWSER_CIRCUIT_ASSET_URL",
  "createVantaPrivatePoolV2SwapToShieldedBrowserWorkerArtifactProducer",
  "createVantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceipt",
  "createVantaPrivatePoolV2SwapToShieldedBrowserProofRequestContext",
  "canonicalSettlementBindingHash",
  "canonicalTermsCommitmentHash",
  "fieldFromParts",
  "createVantaPrivatePoolV2BrowserProverClient().proveSwapToShielded",
  "createVantaPrivatePoolV2LocalBbFixtureProver",
  "assertNoWitnessMaterial",
]) {
  assert(
    swapReceiptBridge.includes(requiredBridgeMarker),
    `Swap browser proof receipt bridge missing ${requiredBridgeMarker}.`,
  );
}

for (const failClosedMarker of [
  'proofArtifact.proofSystem !== "noir-bb"',
  "proofArtifact.proofBackend !== VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND",
  "proofResult.proofSystem !== \"noir-bb\"",
  "proofResult.proofBackend !== VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND",
  "Swap-to-shielded browser-local receipt rejects non-noir-bb proof evidence.",
  "Swap-to-shielded browser-local receipt rejects proof evidence that is not local-bb-derived-artifact.",
  "Swap-to-shielded browser-local receipt proof artifact public input mismatch.",
  "Swap-to-shielded browser-local persisted proof receipt",
]) {
  assert(
    swapReceiptBridge.includes(failClosedMarker),
    `Swap browser proof receipt bridge must fail closed on ${failClosedMarker}.`,
  );
}

for (const swapPageMarker of [
  "createVantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceipt",
  "browserLocalProofReceipt.protocolSettlementResponse",
  "browserLocalProofReceipt.browserLocalProofReceipt",
  "proofBackend !==\n          \"local-bb-derived-artifact\"",
  "findCanonicalSwapRecord",
  "selectedSwapBrowserLocalProofReceipt",
  "observedSwapProtocolSettlement",
  "lastSwapProtocolSettlement ??\n    selectedSwapBrowserLocalProofReceipt?.protocolSettlementResponse",
]) {
  assert(
    swapPage.includes(swapPageMarker),
    `Swap page must observe browser-local proof receipt marker ${swapPageMarker}.`,
  );
}

for (const liveSwapBridgeMarker of [
  "browserLocalProofReceipt?: VantaPrivatePoolV2SwapToShieldedBrowserLocalProofReceipt",
  "proofReceiptId?: string",
  "proofBackend?: string",
  "proofSystem?: string",
  "proofPublicInputCommitment?: string",
  "persistCanonicalSwapBrowserLocalProofReceipt",
  "findCanonicalSwapRecord",
  "browserLocalProofReceipt:",
]) {
  assert(
    liveSwapBridge.includes(liveSwapBridgeMarker),
    `Canonical Swap bridge must persist browser proof receipt marker ${liveSwapBridgeMarker}.`,
  );
}

assert(
  packageJson.scripts?.["swap:browser-proof-receipt-check"] ===
    "node scripts/check-vanta-swap-browser-proof-receipt-bridge.mjs",
  "package.json must expose deterministic swap:browser-proof-receipt-check.",
);
assert(
  packageJson.scripts?.["swap:browser-proof-receipt-prover-check"] ===
    "npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check",
  "package.json must expose swap:browser-proof-receipt-prover-check for the real Swap browser-worker prover guard.",
);
assert(
  packageJson.scripts?.["swap:committed-settlement-check"]?.includes(
    "npm run swap:browser-proof-receipt-check",
  ),
  "swap:committed-settlement-check must include swap:browser-proof-receipt-check.",
);

console.log("Swap browser-local proof receipt bridge contract is intact.");
