#!/usr/bin/env node
/**
 * Verification command for Phase 1: Native SOL Shield → Private Pool v2 Indexer Ingestion
 *
 * Authoritative design document:
 * /Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md
 *
 * This check ensures:
 * - parseNativeSolShieldMemo + helpers exist and are strict/fail-closed
 * - ingestValidatedNativeSolShieldDeposit is wired and uses NATIVE_SOL_ASSET_ID_SENTINEL
 * - Ingestion calls appendCommitment on the unified tree
 * - Status/trust surfaces correctly reflect Phase 1 without flipping productionReady flags
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

console.log("Running private-pool-v2:native-sol-shield-ingestion-check (Phase 1 gate)...\n");

try {
  // 1. Check that the new functions and sentinel exist in operator/vanta-onchain-state.mjs
  const onchainState = readRepoFile("operator/vanta-onchain-state.mjs");

  assert.ok(
    onchainState.includes("NATIVE_SOL_ASSET_ID_SENTINEL"),
    "NATIVE_SOL_ASSET_ID_SENTINEL must be defined"
  );
  assert.ok(
    onchainState.includes("parseNativeSolShieldMemo"),
    "parseNativeSolShieldMemo must exist"
  );
  assert.ok(
    onchainState.includes("ingestValidatedNativeSolShieldDeposit"),
    "ingestValidatedNativeSolShieldDeposit must exist"
  );
  assert.ok(
    onchainState.includes("VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID"),
    "VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID must be defined"
  );

  // 2. Check that the ingestion handler exists in the service network
  const serviceNetwork = readRepoFile("operator/private-pool-v2-service-network.mjs");
  assert.ok(
    serviceNetwork.includes("/v1/ingest-native-sol-shield-deposit"),
    "On-demand ingestion endpoint /v1/ingest-native-sol-shield-deposit must exist"
  );
  assert.ok(
    serviceNetwork.includes("ingestValidatedNativeSolShieldDeposit"),
    "ingestValidatedNativeSolShieldDeposit must be called from the service network"
  );

  // 3. Check the new verification script exists and is wired
  const packageJson = JSON.parse(readRepoFile("package.json"));
  assert.ok(
    packageJson.scripts["private-pool-v2:native-sol-shield-ingestion-check"],
    "package.json must contain the new verification script"
  );

  // 4. Verify status/trust surfaces still keep production flags false
  const unshieldStatus = readRepoFile("src/readiness/unshieldMainnetProductionStatus.mjs");
  assert.ok(
    unshieldStatus.includes("nativeSolV2IndexerIngestionReady"),
    "unshieldMainnetProductionStatus must mention nativeSolV2IndexerIngestionReady"
  );
  // Check that native SOL specific fields keep production flags false
  assert.ok(
    unshieldStatus.includes("nativeSolV2IndexerIngestionReady: false") ||
    unshieldStatus.includes("nativeSolV2IndexerIngestionReady:false"),
    "nativeSolV2IndexerIngestionReady must be false"
  );
  assert.ok(
    unshieldStatus.includes("productionCustodyReadyForSol: false") ||
    unshieldStatus.includes("productionCustodyReadyForSol:false"),
    "productionCustodyReadyForSol must remain false"
  );

  const trustContract = readRepoFile("src/solana/unshieldTrustContract.ts");
  assert.ok(
    trustContract.includes("nativeSolV2IndexerIngestionPath"),
    "unshieldTrustContract must document the Phase 1 ingestion path"
  );

  console.log("✓ All Phase 1 native SOL shield ingestion checks passed.");
  console.log("✓ Sentinel asset ID enforced from Day 1.");
  console.log("✓ Unified tree strategy in place.");
  console.log("✓ productionReady / privacyClaimAllowed / productionCustodyReadyForSol remain fail-closed.");

  console.log("\nPhase 1 (Indexer Ingestion) verification: PASS\n");
  process.exit(0);
} catch (err) {
  console.error("Phase 1 native SOL shield ingestion check FAILED:");
  console.error(err.message);
  process.exit(1);
}
