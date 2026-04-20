import { createVantaMainnetReadinessSnapshot } from "../src/readiness/mainnetReadiness.mjs";

const jsonMode = process.argv.includes("--json");
const snapshot = createVantaMainnetReadinessSnapshot();

if (jsonMode) {
  console.log(JSON.stringify(snapshot, null, 2));
} else {
  console.log("Vanta mainnet readiness");
  console.log(`- version: ${snapshot.version}`);
  console.log(`- decision: ${snapshot.decision}`);
  console.log(`- score: ${snapshot.score}/100`);
  console.log(`- mainnetReady: ${String(snapshot.mainnetReady)}`);
  console.log(`- productionReady: ${String(snapshot.productionReady)}`);
  console.log("- lanes:");
  for (const [lane, state] of Object.entries(snapshot.lanes)) {
    console.log(`  - ${lane}: ${state.status} (${state.readiness}/100)`);
  }
  console.log("- blockers:");
  for (const blocker of snapshot.blockers) {
    console.log(`  - ${blocker.id}: ${blocker.summary}`);
  }
  console.log("- next actions:");
  for (const action of snapshot.nextActions) {
    console.log(`  - ${action}`);
  }
}
