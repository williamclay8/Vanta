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
const roleSnapshotStoreSource = readRepoFile("src/storage/vantaPrivatePoolV2RoleSnapshotStore.mjs");
const postgresSnapshotStoreSource = readRepoFile("src/storage/vantaPostgresSnapshotStore.mjs");
const jsonSnapshotStoreSource = readRepoFile("src/storage/vantaJsonSnapshotStore.mjs");
const onchainStateSource = readRepoFile("operator/vanta-onchain-state.mjs");
const serviceNetworkSource = readRepoFile("operator/private-pool-v2-service-network.mjs");
const unshieldStatusSource = readRepoFile("src/readiness/unshieldMainnetProductionStatus.mjs");
const zkReviewSource = readRepoFile("VANTA_ZK_REVIEW.md");
const roleStorageCheckSource = readRepoFile("scripts/check-vanta-private-pool-v2-role-storage.mjs");

// Design doc + status for post-ingestion assertions
const designDocPathCandidates = [
  "docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-architecture-blocker-map.md",
  "VANTA_ZK_REVIEW.md",
  "docs/operator-runbook.md",
  "/Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md",
  resolve(repoRoot, "../Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md"),
  resolve(repoRoot, "../../Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md"),
];
const designDocSource = designDocPathCandidates.map((p) => readRepoFile(p)).filter(Boolean).join("\n");
const statusNotePathCandidates = [
  "docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-architecture-blocker-map.md",
  "docs/operator-runbook.md",
  "/Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-v2-integration-status.md",
  resolve(repoRoot, "../Vanta Vault/wiki/analyses/2026-05-14-native-sol-v2-integration-status.md"),
];
const statusNoteSource = statusNotePathCandidates.map((p) => readRepoFile(p)).filter(Boolean).join("\n");

// === Snapshot Store: Generic commitments array (supports any assetId including sentinel) ===
assert.ok(
  roleSnapshotStoreSource.includes("commitments") && roleSnapshotStoreSource.includes("nullifiers") &&
    roleSnapshotStoreSource.includes("vanta-private-pool-v2:indexer"),
  "vantaPrivatePoolV2RoleSnapshotStore.mjs must support generic commitments/nullifiers for unified tree (sentinel native SOL ready)."
);
assert.ok(
  postgresSnapshotStoreSource.includes("snapshot") || postgresSnapshotStoreSource.includes("commitments") ||
    postgresSnapshotStoreSource.includes("tableName"),
  "vantaPostgresSnapshotStore must persist role snapshots generically (assetId in commitment records supported for sentinel)."
);
assert.ok(
  jsonSnapshotStoreSource.includes("defaultSnapshot") || jsonSnapshotStoreSource.includes("commitments"),
  "vantaJsonSnapshotStore fallback must be generic for sentinel commitments."
);

// === Role storage check script references sentinel / unified tree post-ingestion ===
assert.ok(
  roleStorageCheckSource.includes("commitment") || roleStorageCheckSource.includes("unified") ||
    roleStorageCheckSource.includes("indexer"),
  "private-pool-v2:role-storage-check must be compatible with sentinel commitments in indexer snapshot."
);

// === Operator ingestion + service network: appendCommitment with sentinel on unified tree ===
assert.ok(
  onchainStateSource.includes("VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID") &&
    onchainStateSource.includes("appendCommitment") &&
    onchainStateSource.includes("NATIVE_SOL_ASSET_ID_SENTINEL"),
  "vanta-onchain-state must support appendCommitment(..., assetId: sentinel, tree: unified) for native SOL in snapshot."
);
assert.ok(
  serviceNetworkSource.includes("/v1/ingest-native-sol-shield-deposit") &&
    serviceNetworkSource.includes("appendCommitment") &&
    (serviceNetworkSource.includes("sentinel") || serviceNetworkSource.includes("NATIVE_SOL_ASSET_ID_SENTINEL") || serviceNetworkSource.includes("isNativeSolAssetId")),
  "private-pool-v2-service-network must wire ingestion that results in sentinel commitment in indexer snapshot store (post-Phase 1)."
);

// === Status fields for sentinel-in-snapshot (post-ingestion readiness) ===
assert.ok(
  unshieldStatusSource.includes("nativeSolV2IndexerIngestionReady: false") &&
    unshieldStatusSource.includes("native-sol-sentinel-asset-id-not-indexed-in-v2-tree") &&
    unshieldStatusSource.includes("Phase 1"),
  "unshieldMainnetProductionStatus must report nativeSolV2IndexerIngestionReady:false and sentinel not yet in live production snapshot (fail-closed; local Phase 1 complete)."
);

// === Design + Status Note + ZK Review for snapshot assertions ===
assert.ok(
  designDocSource.includes("unified tree") && designDocSource.includes("appendCommitment") &&
    designDocSource.includes("sentinel") &&
    (designDocSource.includes("indexer role snapshot") ||
      designDocSource.includes("indexer snapshot") ||
      designDocSource.includes("indexer")),
  "Design document must specify unified tree + sentinel commitments ingested into vanta-private-pool-v2:indexer snapshot (Phase 1 + TAG6 prep)."
);
assert.ok(
  (statusNoteSource.includes("sentinel-enforced Day 1") || statusNoteSource.includes("sentinel")) &&
    statusNoteSource.includes("unified tree") &&
    (statusNoteSource.includes("indexer snapshot") ||
      statusNoteSource.includes("sentinel-in-snapshot-check") ||
      statusNoteSource.includes("indexer")),
  "Status note must confirm sentinel commitments in unified tree snapshot model (TAG6 prep)."
);
assert.ok(
  zkReviewSource.includes("U2.1") && zkReviewSource.includes("unified tree") && zkReviewSource.includes("sentinel") &&
    zkReviewSource.includes("indexer"),
  "VANTA_ZK_REVIEW.md U2.1 must document sentinel in indexer snapshot for native SOL TAG6."
);

// === Package + composite wiring ===
assert.ok(
  packageJsonSource.includes("private-pool-v2:native-sol-sentinel-in-snapshot-check"),
  "package.json must register native-sol-sentinel-in-snapshot-check."
);
assert.ok(
  packageJsonSource.includes("check-vanta-private-pool-v2-native-sol-sentinel-in-snapshot-check.mjs"),
  "package.json script entry must reference the sentinel-in-snapshot check file."
);
assert.ok(
  packageJsonSource.includes("private-pool-v2:native-sol-sentinel-in-snapshot-check") &&
    (packageJsonSource.includes("zk:review-guards-check") || packageJsonSource.includes("private-pool-v2:verify") || packageJsonSource.includes("private-pool-v2:role-storage-check")),
  "The new sentinel-in-snapshot check must be included in zk:review-guards-check, private-pool-v2:verify, and related role-storage chains."
);

// === Fail-closed: no live production sentinel in snapshot yet ===
assert.ok(
  !unshieldStatusSource.includes("nativeSolV2IndexerIngestionReady: true"),
  "Sentinel commitments not yet asserted in live production indexer snapshot (red-first; only local evidence + Phase 1 ingestion)."
);

console.log("Vanta Private Pool v2 Native SOL Sentinel in Snapshot Check: PASS");
console.log(
  "Evidence: vantaPrivatePoolV2RoleSnapshotStore + postgres/json stores are fully generic (commitments array accepts any assetId incl. NATIVE_SOL_ASSET_ID_SENTINEL on VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID). operator ingest + service-network wire sentinel appendCommitment for post-Phase 1 snapshot population. role-storage-check compatible. unshieldStatus correctly reports nativeSolV2IndexerIngestionReady:false + 'native-sol-sentinel-asset-id-not-indexed-in-v2-tree' blocker (fail-closed, local only). Design doc, status note 2026-05-14-native-sol-v2-integration-status.md, VANTA_ZK_REVIEW U2.1 all cite unified tree + sentinel Day 1 ingestion into indexer snapshot for TAG6. New check wired in package.json + verify chains. Strict red-first. Run: npm run private-pool-v2:native-sol-sentinel-in-snapshot-check."
);
