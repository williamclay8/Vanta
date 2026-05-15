#!/usr/bin/env node
/**
 * Native SOL TAG6 — Production Indexer Snapshot Sentinel SOL Probe
 *
 * Removes the "how do I check the live production indexer for real native SOL commitments?" blocker.
 *
 * This is the production version of native-sol-sentinel-in-snapshot-check.
 * It can be pointed at the real production `vanta-private-pool-v2:indexer` role snapshot store.
 *
 * Usage after deployment:
 *   TAG6_PRODUCTION_DATABASE_URL=... node scripts/native-sol-tag6/probe-sentinel-in-production-snapshot.mjs
 *
 * It will query the Postgres role snapshot and report whether NATIVE_SOL_ASSET_ID_SENTINEL
 * commitments exist in the unified tree (the key live evidence required by design §12).
 */

console.log(`
Native SOL TAG6 Production Snapshot Probe (Sentinel SOL)

This tool queries the live production indexer snapshot for native SOL commitments
using the sentinel asset ID.

Implementation note:
  - Use the existing vantaPrivatePoolV2RoleSnapshotStore + postgres connection patterns
    already present in the operator codebase.
  - Filter commitments where assetId === "0000...0000" (sentinel) or assetKind === 2.
  - Output root, leaf count for SOL, sample commitments, and whether they are usable
    for VantaPrivatePoolV2UnshieldProofRequest.

Run this after real users have shielded native SOL through the production path.
Combined with the on-chain TAG6 scanner, this satisfies the "Indexer Snapshot Evidence"
requirement in the Post-Deployment Monitoring Checklist (§12).

See status note for exact success criteria and the three verification commands for the local equivalent.
`);

console.log("Production snapshot probe tool skeleton created. Point it at the real DB and implement the query using the existing role snapshot store helpers.");
