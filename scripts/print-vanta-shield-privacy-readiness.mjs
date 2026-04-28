import { createCurrentVantaShieldPrivacyReadiness } from "../src/readiness/shieldPrivacyReadiness.mjs";

const jsonMode = process.argv.includes("--json");

const readiness = createCurrentVantaShieldPrivacyReadiness();

if (jsonMode) {
  console.log(JSON.stringify(readiness, null, 2));
} else {
  console.log("Vanta Shield privacy readiness");
  console.log(`- kind: ${readiness.kind}`);
  console.log(`- failClosed: ${String(readiness.failClosed)}`);
  console.log(`- localCapabilitiesReady: ${String(readiness.localCapabilitiesReady)}`);
  console.log(`- productionEvidenceReady: ${String(readiness.productionEvidenceReady)}`);
  console.log(`- strictReady: ${String(readiness.strictReady)}`);
  console.log(`- claimAllowed: ${String(readiness.claimAllowed)}`);
  console.log(`- blockers: ${readiness.blockers.join(", ")}`);
  console.log(`- current evidence refs: ${readiness.currentEvidenceRefs.join(", ")}`);
  console.log(`- required evidence refs: ${readiness.requiredEvidenceRefs.join(", ")}`);
  console.log(`- canonical verification: ${readiness.gateCommand}`);
  console.log(`- current truth: ${readiness.currentTruth}`);
}
