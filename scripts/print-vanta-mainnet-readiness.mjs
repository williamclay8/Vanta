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
  console.log("- real funds approval:");
  console.log(`  - record: ${snapshot.realFundsApproval.approvalRecordStatus}`);
  console.log(`  - window: ${snapshot.realFundsApproval.approvalWindowStatus}`);
  console.log(`  - allowedNow: ${String(snapshot.realFundsApproval.liveMainnetActionsAllowedNow)}`);
  console.log(`  - nextStep: ${snapshot.realFundsApproval.requiredNextStep}`);
  console.log("- abuse / observability:");
  console.log(`  - payRuntime: ${snapshot.abuseObservability.payRuntimeStatus}`);
  console.log(`  - privatePoolV2RuntimeMode: ${snapshot.abuseObservability.privatePoolV2RuntimeMode}`);
  console.log(`  - privatePoolV2RateLimiter: ${snapshot.abuseObservability.privatePoolV2RateLimiter}`);
  console.log(
    `  - privatePoolV2MatchesPreferredRateLimiter: ${String(snapshot.abuseObservability.privatePoolV2RuntimeMatchesPreferredRateLimiter)}`,
  );
  console.log("- nullifier / replay:");
  console.log(`  - runtimeMode: ${snapshot.nullifierReplay.runtimeMode}`);
  console.log(`  - layeredStatus: ${snapshot.nullifierReplay.layeredReplayStatus}`);
  console.log(`  - guardMode: ${snapshot.nullifierReplay.nullifierReplayGuardMode}`);
  console.log(`  - protocolLayer: ${snapshot.nullifierReplay.protocolEnforcementLayer}`);
  console.log(
    `  - finalProtocolLayerImplemented: ${String(snapshot.nullifierReplay.protocolEnforcementFinalLayerImplemented)}`,
  );
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
