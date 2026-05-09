import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const jsonMode = process.argv.includes("--json");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-status-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = [
  "protocolAdapter.ts",
  "umbraCapabilityProfile.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2CapabilityProfile.ts",
  "privatePoolV2LocalIndexer.ts",
  "privatePoolV2LocalProver.ts",
  "privatePoolV2LocalRelayer.ts",
  "privatePoolV2LocalVerifierRegistry.ts",
  "privatePoolV2MockRuntime.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2SettlementPolicy.ts",
];
const protocolActionProofModes = {
  send: "actual_private_spend_circuit_request",
  shield: "shield_circuit_request",
  swap: "swap_to_shielded_circuit_request",
  unshield: "committed_unshield_or_claim_circuit_request",
};
const productionGate = {
  ready: false,
  status: "blocked",
  blockers: [
    "no-proven-audited-shared-anonymity-set",
    "no-proven-live-mainnet-private-settlement-evidence",
    "no-third-party-audit",
    "production-anonymity-set-measured-below-threshold",
    "no-independent-production-relayer-separation-review",
    "no-active-bounded-real-funds-approval-window",
  ],
  requiredCommands: [
    "npm run private-pool-v2:anonymity-set-readiness-check",
    "npm run mainnet:private-settlement-check",
    "npm run mainnet:actual-private-settlement-review-check",
    "npm run mainnet:approval-gates-status-json",
  ],
};

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

try {
  mkdirSync(tempTsDir, { recursive: true });

  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  const { createVantaPrivatePoolV2MockRuntime } = await import(
    pathToFileURL(join(tempJsDir, "privatePoolV2MockRuntime.js")).href
  );
  const { getVantaPrivatePoolV2CapabilityProfile } = await import(
    pathToFileURL(join(tempJsDir, "privatePoolV2CapabilityProfile.js")).href
  );
  const { VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY } = await import(
    pathToFileURL(join(tempJsDir, "privatePoolV2SettlementPolicy.js")).href
  );
  const { createNullifierReplayGuard } = await import(
    pathToFileURL(resolve(repoRoot, "src/privacy/nullifierReplayGuard.mjs")).href
  );
  const runtime = createVantaPrivatePoolV2MockRuntime();
  const readiness = runtime.readiness();
  const capabilityProfile = getVantaPrivatePoolV2CapabilityProfile();
  const nullifierReplayGuard = createNullifierReplayGuard();
  const guardedNullifiers = nullifierReplayGuard.snapshot();
  const acceptedGuardedNullifiers = guardedNullifiers.filter((record) => record.status === "accepted");
  const reservedGuardedNullifiers = guardedNullifiers.filter((record) => record.status !== "accepted");
  const result = {
    contractVersion: runtime.contractVersion,
    kind: "Private Pool V2 status",
    network: runtime.network,
    receiptCount: runtime.verifierRegistry?.receipts?.length ?? 0,
    ok: readiness.ready && productionGate.ready,
    localRuntimeReady: readiness.ready,
    productionReady: false,
    privacyClaimAllowed: capabilityProfile.privacyClaimAllowed === true,
    productionPrivateReady: capabilityProfile.productionPrivateReady === true,
    claimScope: capabilityProfile.claimScope,
    currentVerifiedPrivacyFlags: capabilityProfile.currentVerifiedPrivacyFlags,
    targetPrivacyFlags: capabilityProfile.targetPrivacyFlags,
    requiredBlockingEvidence: capabilityProfile.requiredBlockingEvidence,
    productionGate,
    protocolActionProofModes,
    readiness,
    settlementPolicy: VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY,
    nullifierReplayGuard: {
      acceptedNullifierCount: acceptedGuardedNullifiers.length,
      guardedNullifierCount: guardedNullifiers.length,
      mode: "claim-preflight-and-accepted-reservation",
      productionReady: false,
      reservationMode: nullifierReplayGuard.reservationMode ?? "single-process-memory-reservation",
      reservedNullifierCount: reservedGuardedNullifiers.length,
      storageMode: nullifierReplayGuard.storageMode,
      uniquenessScope: nullifierReplayGuard.uniquenessScope ?? "context-nullifier",
    },
    supportedAssets: runtime.assets.map((asset) => ({
      id: asset.id,
      mintAddress: asset.mintAddress,
      poolMintAddress: asset.poolMintAddress,
      poolStatus: asset.poolStatus,
      routeablePublicEntry: asset.routeablePublicEntry,
      symbol: asset.symbol,
    })),
    surfaces: {
      indexer: runtime.indexer ? "ready" : "missing",
      prover: runtime.prover ? "ready" : "missing",
      relayer: runtime.relayer ? "ready" : "missing",
      verifierRegistry: runtime.verifierRegistry ? "ready" : "missing",
    },
    verificationCommands: [
      "private-pool-v2:contract-check",
      "private-pool-v2:local-runtime-check",
      "private-pool-v2:shield-circuit-check",
      "private-pool-v2:send-circuit-check",
      "private-pool-v2:swap-to-shielded-circuit-check",
      "private-pool-v2:actual-private-spend-circuit-check",
      "private-pool-v2:claim-circuit-check",
      "private-pool-v2:shield-prove",
      "private-pool-v2:send-prove",
      "private-pool-v2:swap-to-shielded-prove",
      "private-pool-v2:actual-private-spend-prove",
      "private-pool-v2:claim-prove",
      "private-pool-v2:verify",
    ],
  };

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("Private Pool V2 status");
    console.log(`- contractVersion: ${result.contractVersion}`);
    console.log(`- network: ${result.network}`);
    console.log(`- localRuntimeReady: ${String(result.localRuntimeReady)}`);
    console.log(`- productionGate: ${result.productionGate.status}`);
    console.log(`- productionReady: ${String(result.productionReady)}`);
    console.log(`- productionBlockers: ${result.productionGate.blockers.join(", ")}`);
    console.log(`- receiptCount: ${result.receiptCount}`);
    console.log(`- settlementPolicy: ${result.settlementPolicy.version}`);
    console.log(
      `- protocolActionProofModes: shield=${result.protocolActionProofModes.shield}, send=${result.protocolActionProofModes.send}, swap=${result.protocolActionProofModes.swap}, unshield=${result.protocolActionProofModes.unshield}`,
    );
    console.log(
      `- nullifierReplayGuard: mode=${result.nullifierReplayGuard.mode}, reservation=${result.nullifierReplayGuard.reservationMode}, storage=${result.nullifierReplayGuard.storageMode}, uniqueness=${result.nullifierReplayGuard.uniquenessScope}, accepted=${result.nullifierReplayGuard.acceptedNullifierCount}, reserved=${result.nullifierReplayGuard.reservedNullifierCount}`,
    );
    console.log(`- assets: ${result.supportedAssets.map((asset) => asset.symbol).join(", ")}`);
    for (const [surface, status] of Object.entries(result.surfaces)) {
      console.log(`- ${surface}: ${status}`);
    }
    console.log("- canonical verification: npm run private-pool-v2:verify");
  }
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
