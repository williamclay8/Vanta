import { createVantaProductionEvidenceNextBlockers } from "../src/readiness/productionEvidenceNextBlockers.mjs";

const jsonMode = process.argv.includes("--json");
const report = createVantaProductionEvidenceNextBlockers();

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Vanta production evidence next blockers");
  console.log(`- version: ${report.version}`);
  console.log(`- mainnetReady: ${String(report.mainnetReady)}`);
  console.log(`- productionReady: ${String(report.productionReady)}`);
  console.log(`- privacyClaimAllowed: ${String(report.privacyClaimAllowed)}`);
  console.log(`- realFundsAllowedNow: ${String(report.realFundsAllowedNow)}`);
  console.log(`- canonicalRepo: ${report.canonicalRepo.branch}@${report.canonicalRepo.headCommit}`);
  console.log("- blockers:");
  for (const blocker of report.nextBlockers) {
    console.log(`  - ${blocker.id}: ${blocker.status}`);
    console.log(`    owner: ${blocker.owner}`);
    console.log(`    required: ${blocker.requiredArtifactShape}`);
    console.log(`    boundary: ${blocker.truthBoundary}`);
  }
  console.log("- recommended order:");
  for (const action of report.recommendedOrder) {
    console.log(`  - ${action}`);
  }
}
