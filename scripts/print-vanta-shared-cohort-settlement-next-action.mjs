import { readFileSync } from "node:fs";

const approvalStatusPath = new URL("../ops/mainnet/mainnet-real-funds-approval.evidence.json", import.meta.url);
const settlementEvidencePath = new URL("../ops/mainnet/actual-private-mainnet-settlement.evidence.json", import.meta.url);
const hardBlockersPath = new URL("../ops/mainnet/actual-private-hard-blockers.packet.json", import.meta.url);

const approvalEvidence = readJson(approvalStatusPath);
const settlementEvidence = readJson(settlementEvidencePath);
const hardBlockers = readJson(hardBlockersPath);

const currentSharedCohortRef = settlementEvidence.evidenceRefs?.sharedCohortDepositTxRef ?? null;
const approvalRecord = approvalEvidence.approvalRecord ?? {};
const hardBlockerList = hardBlockers.hardBlockers ?? hardBlockers.blockers ?? [];
const result = {
  version: "vanta-shared-cohort-settlement-next-action-0.1",
  checkedAt: new Date().toISOString(),
  purpose:
    "Safe refs-only checklist for preparing a shared-cohort settlement evidence run. This command does not approve funds, submit transactions, or write evidence.",
  currentState: {
    approvalStatus: approvalEvidence.status,
    approvedActionRef: approvalRecord.approvedActionRef ?? null,
    approvedLaunchWindowRef: approvalRecord.approvedLaunchWindowRef ?? null,
    sharedCohortDepositTxRef: currentSharedCohortRef,
    sharedCohortDepositReady: isSolanaTxRef(currentSharedCohortRef),
    productionReady: false,
    privacyClaimAllowed: false,
  },
  requiredOperatorSequence: [
    {
      step: 1,
      action: "Record a fresh bounded approval window for exactly one shared-cohort deposit plus actual-private settlement evidence run.",
      command: "npm run mainnet:real-funds-approval-preview",
      writeCommand: "npm run mainnet:real-funds-approval-write",
      requiredRefs: [
        "VANTA_MAINNET_APPROVAL_RECORD_REF",
        "VANTA_MAINNET_APPROVAL_ACTION_REF",
        "VANTA_MAINNET_APPROVAL_ACTION_SUMMARY",
        "VANTA_MAINNET_APPROVAL_LAUNCH_WINDOW_REF",
        "VANTA_MAINNET_APPROVAL_MAX_FUNDS_REF",
        "VANTA_MAINNET_APPROVAL_APPROVED_BY_REF",
      ],
    },
    {
      step: 2,
      action: "Run preflight and execute only inside that active approval window with explicit ACKs.",
      command: "npm run mainnet:preflight",
      liveCommand: "npm run mainnet:actual-private-settlement-live -- --execute",
      requiredAcks: [
        "VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK=I_UNDERSTAND_THIS_RUN_CAN_MOVE_MAINNET_FUNDS",
        "VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_EXECUTE_ACK=I_UNDERSTAND_THIS_WILL_REQUEST_A_MAINNET_PRIVATE_SETTLEMENT",
      ],
    },
    {
      step: 3,
      action: "Write settlement evidence only after real refs exist.",
      command: "npm run mainnet:actual-private-settlement-evidence-preview",
      writeCommand: "npm run mainnet:actual-private-settlement-evidence-write",
      requiredRefs: [
        "VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF=solana-tx:<shared-cohort-deposit-mainnet-signature>",
        "VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF=solana-tx:<relayer-submitted-mainnet-signature>",
        "VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF=operator-receipt:<receipt-ref>",
        "VANTA_ACTUAL_PRIVATE_PROTOCOL_SETTLEMENT_REF=operator-protocol-settlement:<settlement-ref>",
        "VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF=operator-nullifier-replay:<production-duplicate-rejection-ref>",
      ],
    },
    {
      step: 4,
      action: "Review and keep fail-closed until independent/audit and anonymity gates pass.",
      commands: [
        "npm run mainnet:actual-private-shared-cohort-deposit-review-check",
        "npm run mainnet:actual-private-settlement-lineage-check",
        "npm run private-pool-v2:anonymity-set-readiness-check",
        "npm run programmatic-privacy:contract-check",
      ],
    },
  ],
  hardBlockerRefs: hardBlockerList.map((blocker) => ({
    id: blocker.id,
    currentArtifactRef: blocker.currentArtifactRef,
    requiredArtifactShape: blocker.requiredArtifactShape,
    canonicalCommand: blocker.canonicalCommand,
  })),
  forbiddenUntilComplete: [
    "production-private claim",
    "live-mainnet-private claim",
    "anonymous or untraceable claim",
    "audited anonymity claim",
    "security/custody/compliance certification claim",
  ],
  safety:
    "No private keys, seed phrases, bearer values, database URLs, signed transactions, or live transaction payloads are printed.",
};

console.log(JSON.stringify(result, null, 2));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isSolanaTxRef(value) {
  return typeof value === "string" && /^solana-tx:[1-9A-HJ-NP-Za-km-z]{32,100}$/.test(value);
}
