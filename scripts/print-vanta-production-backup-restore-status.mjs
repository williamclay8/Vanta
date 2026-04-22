import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/production-backup-restore.evidence.json");
const jsonMode = process.argv.includes("--json");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

if (jsonMode) {
  console.log(JSON.stringify(evidence, null, 2));
} else {
  console.log("Vanta production backup/restore status");
  console.log(`- version: ${evidence.version}`);
  console.log(`- status: ${evidence.status}`);
  console.log(`- mainnetReady: ${String(evidence.mainnetReady)}`);
  console.log(`- productionReady: ${String(evidence.productionReady)}`);
  console.log("- stores:");
  for (const store of evidence.stores) {
    const refs = store.databaseRefs.join(", ");
    console.log(`  - ${store.id}: restore ${store.restoreReadbackStatus}, backups ${store.backupControlStatus}`);
    console.log(`    refs: ${refs}`);
    if (store.restoreDrillRef) {
      console.log(`    restoreDrillRef: ${store.restoreDrillRef}`);
    }
    console.log(`    blockedUntil: ${store.blockedUntil.join(", ")}`);
  }
  console.log("- global evidence gates:");
  for (const gate of evidence.globalEvidence) {
    console.log(`  - ${gate.id}: ${gate.status} (${gate.requiredRefPattern})`);
  }
  console.log("- next operator actions:");
  for (const action of evidence.nextOperatorActions) {
    console.log(`  - ${action}`);
  }
}
