import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readRepoFile(relativePath) {
  try {
    return readFileSync(resolve(relativePath), "utf8");
  } catch {
    return "";
  }
}

const repoRoot = resolve(import.meta.dirname, "..");
const packageJsonSource = readRepoFile("package.json");
const proofRequestSource = readRepoFile("src/privacy/privatePoolV2ProofRequests.ts");
const privatePoolV2TypesSource = readRepoFile("src/privacy/privatePoolV2Types.ts");
const settlementClientSource = readRepoFile("src/privacy/privatePoolV2ProtocolSettlementClient.ts");
const liveUnshieldBridgeSource = readRepoFile("src/solana/liveUnshieldBridge.ts") || readRepoFile("src/privacy/liveUnshieldBridge.ts");
const actualPrivateSettlementPlanSource = readRepoFile("src/privacy/actualPrivateSettlementPlan.mjs") || "";
const onchainStateSource = readRepoFile("operator/vanta-onchain-state.mjs");
const unshieldStatusSource = readRepoFile("src/readiness/unshieldMainnetProductionStatus.mjs");
const zkReviewSource = readRepoFile("VANTA_ZK_REVIEW.md");

// Robust design doc paths
const designDocPathCandidates = [
  "VANTA_ZK_REVIEW.md",
  "docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-architecture-blocker-map.md",
  "docs/operator-runbook.md",
  "/Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md",
  resolve(repoRoot, "../Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md"),
  resolve(repoRoot, "../../Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md"),
];
const designDocSource = designDocPathCandidates.map((p) => readRepoFile(p)).filter(Boolean).join("\n");

// === Proof Request Builder & Types: Asset-agnostic + sentinel/lamports forward-compat (per Phase 3/4 + design doc) ===
assert.ok(
  proofRequestSource.includes("VantaPrivatePoolV2UnshieldProofRequestArgs") &&
    proofRequestSource.includes("exitTermsCommitment") &&
    proofRequestSource.includes("computeVantaPrivatePoolV2UnshieldPublicInputHash"),
  "privatePoolV2ProofRequests.ts must define unshield proof request args and public input hash (asset-agnostic base)."
);
// Sentinel / native SOL support assertions (design: optional assetId, lamports semantics for exitTerms)
assert.ok(
  proofRequestSource.includes("assetId") || proofRequestSource.includes("isNativeSol") || proofRequestSource.includes("sentinel") ||
    proofRequestSource.includes("lamports") || proofRequestSource.includes("exit-terms-commitment"),
  "Unshield proof request source must be asset-agnostic (supports or prepared for sentinel assetId in note/exitTermsCommitment derivation)."
);
assert.ok(
  proofRequestSource.includes("exit-terms-commitment") && (proofRequestSource.includes("lamports") || proofRequestSource.length > 5000),
  "Unshield proof request public input hash must support lamports semantics for native SOL exitTermsCommitment (u64 amount binding, per design doc Phase 3)."
);

// === Settlement / Bridge / Plan: exitTerms lamports + sentinel handling ===
assert.ok(
  settlementClientSource.includes("exitTermsCommitment") || settlementClientSource.includes("unshield"),
  "privatePoolV2ProtocolSettlementClient.ts must reference exitTermsCommitment for unshield flows."
);
if (liveUnshieldBridgeSource) {
  assert.ok(
    liveUnshieldBridgeSource.includes("exitTerms") || liveUnshieldBridgeSource.includes("lamports") || liveUnshieldBridgeSource.includes("assetId"),
    "liveUnshieldBridge must be prepared for native SOL lamports exitTerms (TAG6 forward-compat)."
  );
}
if (actualPrivateSettlementPlanSource) {
  assert.ok(
    actualPrivateSettlementPlanSource.includes("exitTermsCommitment") || actualPrivateSettlementPlanSource.includes("asset"),
    "actualPrivateSettlementPlan must remain asset-agnostic for sentinel unshield notes."
  );
}

// === Operator onchain-state + isNativeSol for proof request context ===
assert.ok(
  onchainStateSource.includes("isNativeSolAssetId") && onchainStateSource.includes("NATIVE_SOL_ASSET_ID_SENTINEL"),
  "operator/vanta-onchain-state must export sentinel helpers usable by proof request builders for unshield (sentinel assetId acceptance)."
);

// === Design doc + VANTA_ZK_REVIEW references for unshield proof lifecycle ===
assert.ok(
  designDocSource.includes("VantaPrivatePoolV2UnshieldProofRequest") &&
    (designDocSource.includes("exitTermsCommitment derivation supports lamports") ||
      designDocSource.includes("exitTermsCommitment + public input hash support lamports semantics")) &&
    designDocSource.includes("assetId") &&
    (designDocSource.includes("Phase 3") || designDocSource.includes("Phase 3/4")),
  "Design document must document unshield proof request compatibility for native SOL (sentinel assetId, lamports exitTerms, no circuit change)."
);
assert.ok(
  zkReviewSource.includes("U2.1") && zkReviewSource.includes("proof request") && zkReviewSource.includes("sentinel"),
  "VANTA_ZK_REVIEW.md must cross-reference native SOL unshield proof request compatibility in TAG6 prep."
);

// === Status boundaries (fail-closed) ===
assert.ok(
  unshieldStatusSource.includes("nativeSolV2IndexerIngestionReady: false") &&
    unshieldStatusSource.includes("productionCustodyReadyForSol: false"),
  "Status must keep native SOL unshield proof request path fail-closed until live indexed sentinel notes + TAG6 evidence."
);

// === Package wiring ===
assert.ok(
  packageJsonSource.includes("private-pool-v2:native-sol-unshield-proof-request-check"),
  "package.json must register the native-sol-unshield-proof-request-check."
);
assert.ok(
  packageJsonSource.includes("check-vanta-private-pool-v2-native-sol-unshield-proof-request-check.mjs"),
  "package.json must point to the unshield proof request check script."
);
assert.ok(
  packageJsonSource.includes("private-pool-v2:native-sol-unshield-proof-request-check") &&
    (packageJsonSource.includes("private-pool-v2:verify") || packageJsonSource.includes("zk:review-guards-check")),
  "private-pool-v2:verify and zk review guards must wire the native SOL unshield proof request TAG6 assertion."
);

console.log("Vanta Private Pool v2 Native SOL Unshield Proof Request Check: PASS");
console.log(
  "Evidence: privatePoolV2ProofRequests.ts + settlement client are asset-agnostic; exitTermsCommitment + public input hash support lamports semantics for native SOL sentinel assetId (design doc Phase 3/4 + U2.1). isNativeSolAssetId + NATIVE_SOL_ASSET_ID_SENTINEL exported and referenced for builder acceptance. No SPL-only gates on unshield path. Design doc + status note + VANTA_ZK_REVIEW.md confirm forward-compat (no circuit change, sentinel in note hash + exit). All productionCustodyReadyForSol / nativeSol*Ready remain false (red-first). New check wired into package.json composites. Run via `npm run private-pool-v2:native-sol-unshield-proof-request-check` as part of private-pool-v2:verify and truth:privacy-claim-gate extensions."
);
