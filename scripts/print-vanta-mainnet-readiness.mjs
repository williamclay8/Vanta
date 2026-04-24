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
  console.log("- private settlement:");
  console.log(`  - rail: ${snapshot.privateSettlement.activePrivacyRailId}`);
  console.log(`  - settlementReadiness: ${snapshot.privateSettlement.settlementReadiness}`);
  console.log(`  - routeHealthPublicPassed: ${String(snapshot.privateSettlement.routeHealthPublicPassed)}`);
  console.log(
    `  - routeHealthAuthenticatedPassed: ${String(snapshot.privateSettlement.routeHealthAuthenticatedPassed)}`,
  );
  console.log(`  - productionSmokeHealthPassed: ${String(snapshot.privateSettlement.productionSmokeHealthPassed)}`);
  console.log(`  - productionSmokeTargetsPassed: ${String(snapshot.privateSettlement.productionSmokeTargetsPassed)}`);
  console.log(`  - replayProtocolLayerImplemented: ${String(snapshot.privateSettlement.replayProtocolLayerImplemented)}`);
  console.log(`  - realFundsAllowedNow: ${String(snapshot.privateSettlement.realFundsAllowedNow)}`);
  console.log(`  - privacyClaimAllowed: ${String(snapshot.privateSettlement.privacyClaimAllowed)}`);
  console.log("- abuse / observability:");
  console.log(`  - payRuntime: ${snapshot.abuseObservability.payRuntimeStatus}`);
  console.log(`  - privatePoolV2RuntimeMode: ${snapshot.abuseObservability.privatePoolV2RuntimeMode}`);
  console.log(`  - privatePoolV2RateLimiter: ${snapshot.abuseObservability.privatePoolV2RateLimiter}`);
  console.log(
    `  - privatePoolV2MatchesPreferredRateLimiter: ${String(snapshot.abuseObservability.privatePoolV2RuntimeMatchesPreferredRateLimiter)}`,
  );
  console.log(
    `  - providerBackedLogSinkAvailable: ${String(snapshot.abuseObservability.providerBackedLogSinkAvailable)}`,
  );
  console.log(
    `  - metricsDashboardsAvailable: ${String(snapshot.abuseObservability.metricsDashboardsAvailable)}`,
  );
  console.log(`  - alertsConfigured: ${String(snapshot.abuseObservability.alertsConfigured)}`);
  console.log(
    `  - retentionPolicyConfigured: ${String(snapshot.abuseObservability.retentionPolicyConfigured)}`,
  );
  console.log(`  - incidentWorkflowReady: ${String(snapshot.abuseObservability.incidentWorkflowReady)}`);
  console.log("- nullifier / replay:");
  console.log(`  - runtimeMode: ${snapshot.nullifierReplay.runtimeMode}`);
  console.log(`  - layeredStatus: ${snapshot.nullifierReplay.layeredReplayStatus}`);
  console.log(`  - guardMode: ${snapshot.nullifierReplay.nullifierReplayGuardMode}`);
  console.log(`  - protocolLayer: ${snapshot.nullifierReplay.protocolEnforcementLayer}`);
  console.log(
    `  - finalProtocolLayerImplemented: ${String(snapshot.nullifierReplay.protocolEnforcementFinalLayerImplemented)}`,
  );
  console.log("- wallet signing:");
  console.log(`  - cluster: ${snapshot.walletSigning.browserVerificationCluster}`);
  console.log(`  - mode: ${snapshot.walletSigning.browserVerificationMode}`);
  console.log(`  - browserVerifiedPages: ${snapshot.walletSigning.browserVerifiedProtocolPages.join(", ")}`);
  console.log(`  - localBrowserVerificationOnly: ${String(snapshot.walletSigning.localBrowserVerificationOnly)}`);
  console.log(
    `  - productionBrowserVerificationAvailable: ${String(snapshot.walletSigning.productionBrowserVerificationAvailable)}`,
  );
  console.log(`  - productionBrowserVerificationStatus: ${snapshot.walletSigning.productionBrowserVerificationStatus}`);
  console.log(
    `  - protocolPagesWithSafeSendAdoption: ${snapshot.walletSigning.protocolPagesWithSafeSendAdoption.join(", ")}`,
  );
  console.log(`  - messageIntentPages: ${snapshot.walletSigning.messageIntentPages.join(", ")}`);
  console.log(`  - umbraAdapterGateStatus: ${snapshot.walletSigning.umbraAdapterGateStatus}`);
  console.log(
    `  - liveMainnetSubmissionEnabled: ${String(snapshot.walletSigning.liveMainnetSubmissionEnabled)}`,
  );
  console.log(
    `  - mainnetSubmissionExplicitlyBlocked: ${String(snapshot.walletSigning.mainnetSubmissionExplicitlyBlocked)}`,
  );
  console.log("- private pool v2 production smoke:");
  console.log(`  - realFundsAllowed: ${String(snapshot.privatePoolV2ProductionSmoke.realFundsAllowed)}`);
  console.log(`  - services: ${snapshot.privatePoolV2ProductionSmoke.serviceIds.join(", ")}`);
  console.log(
    `  - smokeTargets: ${snapshot.privatePoolV2ProductionSmoke.smokeTargetStatuses
      .map((target) =>
        target.replayStatus === null ? `${target.id}:${target.status}` : `${target.id}:${target.status}:${target.replayStatus}`,
      )
      .join(", ")}`,
  );
  console.log("- production service deployment:");
  console.log(`  - manifestRef: ${snapshot.productionServiceDeployment.manifestRef}`);
  console.log(`  - routeHealthLastCheckedAt: ${snapshot.productionServiceDeployment.routeHealthLastCheckedAt}`);
  console.log(`  - routeHealthPublicPassed: ${String(snapshot.productionServiceDeployment.routeHealthPublicPassed)}`);
  console.log(
    `  - routeHealthAuthenticatedPassed: ${String(snapshot.productionServiceDeployment.routeHealthAuthenticatedPassed)}`,
  );
  console.log(`  - roleServiceReplayVerified: ${String(snapshot.productionServiceDeployment.roleServiceReplayVerified)}`);
  console.log(
    `  - productionSmokeHealthPassed: ${String(snapshot.productionServiceDeployment.productionSmokeHealthPassed)}`,
  );
  console.log(
    `  - productionSmokeTargetsPassed: ${String(snapshot.productionServiceDeployment.productionSmokeTargetsPassed)}`,
  );
  console.log(
    `  - services: ${snapshot.productionServiceDeployment.serviceDeploymentStatuses
      .map((service) => `${service.id}:${service.deploymentStatus}`)
      .join(", ")}`,
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
