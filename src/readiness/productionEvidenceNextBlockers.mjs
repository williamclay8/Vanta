import { readFileSync } from "node:fs";

import { createVantaMainnetPrivateSettlementStatus } from "./mainnetPrivateSettlementStatus.mjs";
import { createVantaMainnetRealFundsApprovalStatus } from "./mainnetRealFundsApprovalStatus.mjs";

const anonymityEvidencePath = new URL("../../ops/mainnet/private-pool-v2-anonymity-set.evidence.json", import.meta.url);
const hardBlockersPath = new URL("../../ops/mainnet/actual-private-hard-blockers.packet.json", import.meta.url);
const relayerSeparationEvidencePath = new URL(
  "../../ops/mainnet/private-pool-v2-relayer-separation.evidence.json",
  import.meta.url,
);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function blockerById(packet) {
  return new Map((packet.hardBlockers ?? []).map((blocker) => [blocker.id, blocker]));
}

export function createVantaProductionEvidenceNextBlockers() {
  const privateSettlement = createVantaMainnetPrivateSettlementStatus();
  const approval = createVantaMainnetRealFundsApprovalStatus();
  const anonymityEvidence = readJson(anonymityEvidencePath);
  const hardBlockers = readJson(hardBlockersPath);
  const hardBlockerMap = blockerById(hardBlockers);
  const relayerSeparation = readJson(relayerSeparationEvidencePath);
  const spendCompatibility = privateSettlement.spendProgramCompatibilityStatus;
  const anonymityMeasurement = anonymityEvidence.currentMeasurement;
  const relayerIndependentReview = relayerSeparation.separationChecks.find((check) => check.id === "independent-review");
  const approvalBlocker = hardBlockerMap.get("fresh-bounded-approval");

  return {
    version: "vanta-production-evidence-next-blockers-0.1",
    checkedAt: new Date().toISOString(),
    purpose:
      "Refs-only status for the next production-evidence tranche. This command does not approve funds, run live transactions, write evidence, deploy programs, or claim production privacy.",
    canonicalRepo: {
      branch: privateSettlement.localRepositoryTruth.branch,
      headCommit: privateSettlement.localRepositoryTruth.headCommit,
      liveDeploymentVerifiedForCurrentLocalCommit:
        privateSettlement.deploymentEvidenceFreshness.liveDeploymentVerifiedForCurrentLocalCommit,
      workingTreeClean: privateSettlement.localRepositoryTruth.workingTreeClean,
    },
    mainnetReady: false,
    meaningfulPrivacyReady: false,
    privacyClaimAllowed: false,
    productionReady: false,
    realFundsAllowedNow: approval.liveMainnetActionsAllowedNow,
    nextBlockers: [
      {
        id: "current-abi-compatible-mainnet-spend-program-evidence",
        status: spendCompatibility.compatibleWithCurrentLocalAbi
          ? "unexpected-compatible"
          : "blocked-current-mainnet-evidence-abi-incompatible",
        owner: "founder-operator-with-mainnet-deploy-approval",
        mayBeDoneByCodexAlone: false,
        currentLocalAbi: spendCompatibility.currentLocalAbi,
        reviewedMainnetEvidenceAbi: spendCompatibility.reviewedMainnetEvidenceAbi,
        currentEvidenceRefs: {
          programId: privateSettlement.actualPrivateMainnetEvidence.mainnetSpendProgramEvidence.programId,
          deployTxRef: privateSettlement.actualPrivateMainnetEvidence.mainnetSpendProgramEvidence.deployTxRef,
          initTxRef: privateSettlement.actualPrivateMainnetEvidence.mainnetSpendProgramEvidence.initTxRef,
          spendEvidenceTxRef:
            privateSettlement.actualPrivateMainnetEvidence.mainnetSpendProgramEvidence.spendEvidenceTxRef,
        },
        requiredArtifactShape:
          "sbf-lineage:<current-output-record-pda-eight-account-spend-v1-deploy-init-spend-review-ref>",
        requiredAction: spendCompatibility.requiredAction,
        canonicalCommands: [
          "npm run private-pool-v2:sbf-abi-status-json",
          "npm run private-pool-v2:sbf-abi-check",
          "npm run zk:c01-sbf-live-lineage-acceptance-gate-check",
          "npm run mainnet:private-settlement-status-json",
        ],
        truthBoundary:
          "Historical mainnet spend evidence cannot promote current production privacy until it is rebuilt, redeployed, reinitialized, and reviewed against the current output-record PDA spend ABI.",
      },
      {
        id: "audited-shared-anonymity-evidence",
        status: "blocked-measured-below-threshold-and-no-independent-review",
        owner: "protocol-operator-and-independent-reviewer",
        mayBeDoneByCodexAlone: false,
        currentMeasurement: {
          distinctCommitmentCount: anonymityMeasurement.distinctCommitmentCount,
          minimumDistinctCommitments: anonymityMeasurement.minimumDistinctCommitments,
          measurementStatus: anonymityMeasurement.status,
          reviewerAccepted: anonymityMeasurement.reviewerAccepted,
        },
        requiredArtifactShape: "reviewer:<independent-1024-plus-live-shared-anonymity-measurement-ref>",
        canonicalCommands: [
          "npm run private-pool-v2:anonymity-set-metrics-json",
          "npm run private-pool-v2:anonymity-set-metrics-check",
          "npm run private-pool-v2:anonymity-set-evidence-check",
        ],
        truthBoundary:
          "A proof path with two commitments is not meaningful anonymity; audited shared anonymity requires enough live commitments and independent acceptance.",
      },
      {
        id: "independent-relayer-separation-review",
        status:
          relayerIndependentReview?.status === "not-recorded"
            ? "blocked-no-independent-review"
            : `blocked-${relayerIndependentReview?.status ?? "unknown-independent-review-status"}`,
        owner: "independent-reviewer",
        mayBeDoneByCodexAlone: false,
        relayerSeparationReady: relayerSeparation.relayerSeparationReady,
        currentEvidenceRefs: relayerSeparation.currentEvidenceRefs,
        requiredRefs: relayerSeparation.requiredRefs,
        requiredArtifactShape: "reviewer:<production-relayer-separation-review-ref>",
        canonicalCommands: [
          "npm run private-pool-v2:relayer-separation-evidence-check",
          "npm run private-pool-v2:production-relayer-review-check",
          "npm run relayer:privacy-transport-review-dispatch-check",
        ],
        truthBoundary:
          "Local role separation, manifest refs, and replay evidence are not an independent production relayer separation review.",
      },
      {
        id: "fresh-bounded-approval-window",
        status: approval.liveMainnetActionsAllowedNow
          ? "satisfied-active-bounded-approval"
          : `blocked-${approval.approvalWindowStatus}-bounded-approval`,
        owner: "founder-operator",
        mayBeDoneByCodexAlone: false,
        approvalActionRef: approval.approvalActionRef,
        approvalWindowRef: approval.approvalWindowRef,
        approvalWindowStatus: approval.approvalWindowStatus,
        currentArtifactRef: approvalBlocker?.currentArtifactRef ?? null,
        requiredArtifactShape: "approval-window:<fresh-exact-action-window-America_Chicago>",
        requiredAction: approval.requiredNextStep,
        stopCondition: approval.stopCondition,
        canonicalCommands: [
          "npm run mainnet:real-funds-approval-status-json",
          "npm run mainnet:real-funds-approval-status-check",
          "npm run mainnet:approval-gates-status-json",
        ],
        truthBoundary:
          "No live funds, signing, deployment, or mainnet write may happen without a fresh active bounded approval for the exact action.",
      },
    ],
    recommendedOrder: [
      "Build and review the current ABI spend-program artifact locally without live funds.",
      "Only after the current ABI lineage is ready, record a fresh bounded approval window for the exact mainnet evidence action.",
      "Inside that window only, deploy/reinitialize the current ABI program and produce shared-cohort settlement evidence.",
      "Measure a live shared anonymity cohort and keep claims blocked until it reaches the accepted threshold and independent review.",
      "Obtain independent relayer separation and anonymity review refs before any production privacy claim.",
    ],
    forbiddenUntilComplete: [
      "production private",
      "live-mainnet private settlement",
      "anonymous or untraceable",
      "audited shared anonymity",
      "legal, compliance, custody, or security approval",
    ],
    safety:
      "No wallet keys, seed phrases, bearer values, database URLs, signed transactions, raw private inputs, or live transaction payloads are printed.",
  };
}
