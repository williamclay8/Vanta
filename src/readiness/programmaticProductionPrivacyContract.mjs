import { createVantaMainnetRealFundsApprovalStatus } from "./mainnetRealFundsApprovalStatus.mjs";
import { createVantaMainnetPrivateSettlementStatus } from "./mainnetPrivateSettlementStatus.mjs";
import { createVantaPrivacyRailContract } from "./privacyRailContract.mjs";

const contractRequirements = [
  {
    id: "fail-closed-privacy-claims",
    status: "satisfied",
    currentTruth:
      "Privacy rail and claim-decision surfaces fail closed; no selected rail can claim meaningful production privacy.",
    requiredEvidenceRefs: ["npm run truth:privacy-claim-gate", "npm run privacy-rail:contract-check"],
  },
  {
    id: "live-shared-pool-settlement",
    status: "blocked",
    currentTruth:
      "Mainnet spend-program evidence exists, but reviewed live shared-cohort settlement is still blocked.",
    requiredEvidenceRefs: [
      "ops/mainnet/actual-private-mainnet-settlement.evidence.json",
      "ops/mainnet/actual-private-mainnet-settlement-review.evidence.json",
      "npm run mainnet:shared-cohort-next-action-check",
      "npm run mainnet:actual-private-settlement-review-check",
      "npm run mainnet:actual-private-settlement-lineage-check",
    ],
  },
  {
    id: "commitment-only-public-transcript",
    status: "partially-satisfied",
    currentTruth:
      "No-real-funds smoke transcript is commitment-shaped, but live transition evidence and review are required before production claims.",
    requiredEvidenceRefs: [
      "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
      "npm run mainnet:production-smoke-evidence-check",
    ],
  },
  {
    id: "proof-bound-settlement-receipt",
    status: "partially-satisfied",
    currentTruth:
      "Local proof and receipt boundaries bind roots, nullifiers, commitments, proof hashes, and Send recipient/change memo ciphertext body-hash limbs; production promotion still needs reviewed live evidence.",
    requiredEvidenceRefs: [
      "npm run private-core:verify",
      "npm run private-pool-v2:send-proof-request-check",
      "npm run private-pool-v2:send-circuit-check",
      "npm run private-pool-v2:verify",
    ],
  },
  {
    id: "production-replay-resistance",
    status: "partially-satisfied",
    currentTruth:
      "Replay/nullifier evidence and role-service barriers exist; promotion still requires reviewed live production replay rejection in the exact settlement lineage.",
    requiredEvidenceRefs: [
      "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json",
      "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
      "npm run mainnet:nullifier-replay-evidence-check",
    ],
  },
  {
    id: "relayer-separation",
    status: "blocked",
    currentTruth:
      "Architecture separates roles, but production relayer separation review remains unaccepted.",
    requiredEvidenceRefs: [
      "ops/mainnet/private-pool-v2-relayer-separation.evidence.json",
      "npm run private-pool-v2:relayer-separation-evidence-check",
      "npm run private-pool-v2:production-relayer-review-check",
    ],
  },
  {
    id: "audited-shared-anonymity",
    status: "blocked",
    currentTruth:
      "Current production anonymity metrics are below threshold and no audited shared anonymity set is available.",
    requiredEvidenceRefs: [
      "VANTA_PRIVATE_POOL_V2_AUDIT_REF",
      "VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF",
      "npm run private-pool-v2:anonymity-set-readiness-check",
    ],
  },
  {
    id: "counterparty-verifiable-receipts",
    status: "partially-satisfied",
    currentTruth:
      "Pay public receipts and Shield/Send/Swap/Unshield trust-packet surfaces exist; every production-private claim must remain tied to a shareable verifier path.",
    requiredEvidenceRefs: [
      "npm run shield:trust-packet-check",
      "npm run send:trust-packet-check",
      "npm run swap:trust-packet-check",
      "npm run unshield:trust-packet-check",
      "npm run pay:receipt-privacy-contract-check",
      "npm run pay:production-private-rail-guard-check",
      "npm run mainnet:actual-private-settlement-operator-packet-check",
    ],
  },
  {
    id: "bounded-mainnet-authority",
    status: "blocked",
    currentTruth:
      "Real-funds execution requires an active exact-scope approval window matching the settlement evidence lineage.",
    requiredEvidenceRefs: [
      "ops/mainnet/mainnet-real-funds-approval.evidence.json",
      "npm run mainnet:shared-cohort-next-action-check",
      "npm run mainnet:real-funds-approval-status-check",
    ],
  },
  {
    id: "external-review-custody-and-limitations",
    status: "blocked",
    currentTruth:
      "Audit, custody, legal/compliance, and security limitation gates remain blockers for production-ready claims.",
    requiredEvidenceRefs: [
      "npm run audit:package-check",
      "npm run security:limitations-check",
      "npm run mainnet:external-gates-production-claim-check",
    ],
  },
];

const statusRank = {
  blocked: 0,
  "partially-satisfied": 1,
  satisfied: 2,
};

export function createVantaProgrammaticProductionPrivacyContract() {
  const railContract = createVantaPrivacyRailContract({ activeRailId: "vanta-private-pool-v2" });
  const privateSettlement = createVantaMainnetPrivateSettlementStatus();
  const realFundsApproval = createVantaMainnetRealFundsApprovalStatus();
  const blockedRequirements = contractRequirements.filter((requirement) => requirement.status === "blocked");
  const partiallySatisfiedRequirements = contractRequirements.filter(
    (requirement) => requirement.status === "partially-satisfied",
  );
  const score = contractRequirements.reduce((total, requirement) => total + statusRank[requirement.status], 0);
  const maxScore = contractRequirements.length * statusRank.satisfied;

  return {
    version: "vanta-programmatic-production-privacy-contract-0.1",
    definition:
      "Vanta is programmatically production-private only when code, operator surfaces, evidence packets, receipts, and claim gates mechanically prove a selected live rail settles through shared private state while exposing only receipt-verifiable commitments/transcripts.",
    selectedRailId: railContract.activeRailId,
    productionPrivateReady: false,
    privacyClaimAllowed: false,
    mainnetReady: false,
    score,
    maxScore,
    requirements: contractRequirements,
    blockedRequirementIds: blockedRequirements.map((requirement) => requirement.id),
    partiallySatisfiedRequirementIds: partiallySatisfiedRequirements.map((requirement) => requirement.id),
    currentTruth:
      "Vanta has strong typed local/prod-like scaffolding, but it must still fail closed for production-private claims until shared-cohort settlement, anonymity, relayer separation, replay lineage, approval, audit, custody, and limitation evidence are reviewed.",
    currentSignals: {
      liveMainnetPrivateSettlementAvailable: privateSettlement.liveMainnetPrivateSettlementAvailable,
      meaningfulPrivacyReady: privateSettlement.meaningfulPrivacyReady,
      auditedSharedAnonymitySetAvailable: privateSettlement.auditedSharedAnonymitySetAvailable,
      boundedRealFundsApprovalWindowActive: privateSettlement.boundedRealFundsApprovalWindowActive,
      realFundsApprovalWindowStatus: realFundsApproval.approvalWindowStatus,
      currentDistinctCommitmentCount:
        privateSettlement.anonymitySetReadiness.currentDistinctCommitmentCount,
      minimumDistinctCommitments: privateSettlement.anonymitySetReadiness.minimumDistinctCommitments,
    },
    requiredVerificationCommands: [
      "npm run programmatic-privacy:contract-check",
      "npm run programmatic-privacy:loop-100",
      "npm run truth:privacy-claim-gate",
      "npm run privacy-rail:contract-check",
      "npm run mainnet:private-settlement-check",
      "npm run mainnet:shared-cohort-next-action-check",
      "npm run mainnet:actual-private-settlement-lineage-check",
      "npm run private-pool-v2:send-proof-request-check",
      "npm run private-pool-v2:send-circuit-check",
      "npm run private-pool-v2:public-input-hash-alignment-check",
      "npm run private-pool-v2:anonymity-set-readiness-check",
      "npm run private-pool-v2:relayer-separation-evidence-check",
      "npm run shield:trust-packet-check",
      "npm run send:trust-packet-check",
      "npm run swap:trust-packet-check",
      "npm run unshield:trust-packet-check",
      "npm run pay:receipt-privacy-contract-check",
      "npm run mainnet:preflight",
    ],
    userFacingRule:
      "Do not call Vanta production-private until this contract reports productionPrivateReady: true and the linked review/evidence gates pass.",
  };
}
