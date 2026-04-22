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
  console.log("");
  console.log("Stores");
  for (const store of evidence.stores) {
    console.log(`- ${store.id}`);
    console.log(`  restore: ${store.restoreReadbackStatus}`);
    console.log(`  backups: ${store.backupControlStatus}`);
    console.log("  refs:");
    for (const ref of store.databaseRefs) {
      console.log(`    - ${ref}`);
    }
    if (store.restoreDrillRef) {
      console.log(`  restoreDrillRef: ${store.restoreDrillRef}`);
    }
    console.log("  blockedUntil:");
    for (const blocker of store.blockedUntil) {
      console.log(`    - ${blocker}`);
    }
  }
  console.log("");
  console.log("Global Evidence Gates");
  for (const gate of evidence.globalEvidence) {
    console.log(`- ${gate.id}`);
    console.log(`  status: ${gate.status}`);
    console.log(`  ref: ${gate.requiredRefPattern}`);
  }
  console.log("");
  console.log("Next Operator Actions");
  for (const [index, action] of evidence.nextOperatorActions.entries()) {
    console.log(`${index + 1}. ${action}`);
  }
}
