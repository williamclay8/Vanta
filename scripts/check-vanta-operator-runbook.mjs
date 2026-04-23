import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const runbookPath = resolve(repoRoot, "docs/operator-runbook.md");

if (!existsSync(runbookPath)) {
  throw new Error("Missing docs/operator-runbook.md.");
}

const source = readFileSync(runbookPath, "utf8");
const requiredPhrases = [
  "# Vanta Operator Runbook",
  "npm run private-pool-v2:operator",
  "npm run pay:operator",
  "VANTA_PRIVATE_POOL_V2_STORE_PATH",
  "VANTA_PAY_STORE_PATH",
  "VANTA_PAY_SECRET_KEY",
  "VANTA_PAY_WEBHOOK_SECRET",
  "productionReady: false",
  "npm run mainnet:readiness",
  "npm run mainnet:readiness-json",
  "npm run mainnet:preflight",
  "npm run mainnet:readiness-check",
  "npm run mainnet:external-gates-check",
  "npm run mainnet:service-contract-check",
  "npm run mainnet:storage-contract-check",
  "npm run mainnet:storage-migration-check",
  "npm run mainnet:backup-restore-check",
  "npm run mainnet:backup-restore-evidence-check",
  "npm run storage:adapter-check",
  "npm run mainnet:abuse-observability-check",
  "npm run ops:rate-limit-check",
  "npm run nullifier:replay-guard-check",
  "npm run mainnet:deployment-manifest-check",
  "npm run private-pool-v2:service-network-check",
  "npm run private-pool-v2:role-storage-check",
  "VANTA_PRIVATE_POOL_V2_INDEXER_DATABASE_URL",
  "npm run wallet:signing-safety-check",
  "npm run wallet:transaction-safety-check",
  "npm run wallet:backed-simulation-check",
  "npm run wallet:live-send-inventory-check",
  "npm run wallet:safe-send-boundary-check",
  "npm run wallet:safe-send-hook-check",
  "npm run shield:safe-send-adoption-check",
  "npm run send:safe-send-adoption-check",
  "npm run swap:safe-send-adoption-check",
  "npm run mainnet:secret-handling-check",
  "npm run audit:package-check",
  "docs/audit-package.md",
  "docs/mainnet-external-gates.md",
  "ops/mainnet/external-gates.packet.json",
  "src/readiness/productionStorageContract.mjs",
  "ops/mainnet/production-backup-restore.template.json",
  "ops/mainnet/production-backup-restore.evidence.json",
  "npm run mainnet:backup-restore-status",
  "npm run mainnet:backup-restore-status-json",
  "ops/mainnet/production-restore-drill.evidence.json",
  "npm run mainnet:production-restore-drill-evidence-check",
  "npm run mainnet:production-restore-drill-readback",
  "docs/production-db-refs-runbook.md",
  "npm run mainnet:production-db-refs-check",
  "npm run mainnet:production-db-migration-harness-check",
  "npm run mainnet:production-db-migration-dry-run",
  "npm run mainnet:production-db-migration-apply",
  "ops/mainnet/production-migration-evidence.manifest.json",
  "npm run mainnet:production-migration-evidence-check",
  "ops/mainnet/staging-smoke-evidence.manifest.json",
  "npm run mainnet:staging-smoke-evidence-check",
  "ops/storage/postgres/001_vanta_mainnet_storage.sql",
  "src/readiness/abuseObservabilityContract.mjs",
  "src/storage/vantaJsonSnapshotStore.mjs",
  "src/storage/vantaPrivatePoolV2RoleSnapshotStore.mjs",
  "src/ops/vantaRateLimit.mjs",
  "src/privacy/nullifierReplayGuard.mjs",
  "src/wallet/transactionSafetySummary.mjs",
  "src/wallet/walletBackedTransactionSimulation.mjs",
  "src/readiness/walletLiveSendInventory.mjs",
  "src/wallet/walletSafeSendBoundary.mjs",
  "src/wallet/useVantaSafeSendTransaction.ts",
  "scripts/check-vanta-shield-safe-send-adoption.mjs",
  "scripts/check-vanta-send-safe-send-adoption.mjs",
  "scripts/check-vanta-swap-safe-send-adoption.mjs",
  "src/readiness/secretHandlingContract.mjs",
  "point-in-time recovery",
  "Production Backup/Restore Drill",
  "restore-drill evidence",
  "backup decryption material",
  "privacy-preserving telemetry",
  "Never request, store, or handle private keys, seed phrases, or keypair files.",
  "ops/mainnet/private-pool-v2-services.manifest.json",
  "Do not use browser-exposed operator tokens as production secrets.",
  "Do not paste secrets into chat",
  "npm run pay:verify",
  "npm run private-pool-v2:verify",
  "npm run private-core:verify",
];

for (const phrase of requiredPhrases) {
  if (!source.includes(phrase)) {
    throw new Error(`docs/operator-runbook.md is missing required phrase: ${phrase}`);
  }
}

console.log("vanta operator runbook: PASS");
