import { liveShieldAsset } from "@/solana/shieldConfig";
import type { VantaPrivateCoreOperatorSourceArtifactBundleV0 } from "@/zk/vantaPrivateCore";
import type { VantaPrivateCoreNoirSendWitnessPackageV0 } from "@/zk/vantaPrivateCoreSendProof";
import type { VantaPrivateCoreNoirSwapWitnessPackageV0 } from "@/zk/vantaPrivateCoreSwapProof";
import type { VantaPrivateCoreNoirUnshieldWitnessPackageV0 } from "@/zk/vantaPrivateCoreUnshieldProof";

export type VantaPrivateCoreProofOperatorResponse = {
  backend: string;
  circuit: string;
  proofVersion: number;
  provingHashLane: string;
  proofByteLength: number;
  proofFieldCount: number;
  publicInputCount: number;
  publicInputs: string[];
  verified: boolean;
};

export type VantaPrivateCoreSendOperatorResponse = VantaPrivateCoreProofOperatorResponse & {
  changeAmount: string;
  changeCommitment: string | null;
  completedAt: number;
  inputNullifier: string;
  inputRoot: string;
  proofId: string;
  releaseCandidateId: string | null;
  recipientCommitment: string;
  resultingRootBasis: "client-declared";
  resultingRoot: string | null;
  sendAmount: string;
  sendId: string;
  sendRecorded: boolean;
};

export type VantaPrivateCoreConsumeOperatorResponse = VantaPrivateCoreProofOperatorResponse & {
  authorizationBasis: "proof-backed-consume";
  completedAt: number;
  leafIndex: string | null;
  releaseDestination: string;
  proofId: string;
  releaseCandidateId: string | null;
  releaseRecorded: boolean;
  releaseRequestId: string;
  rootPolicy: "latest-registered-root";
  releaseTransitionNoteId: string;
  releasedAssetId: string;
  releasedAmount: string;
  root: string;
  nullifier: string;
};

export type VantaPrivateCoreOperatorConsumeRecord = {
  assetId: string;
  amount: string;
  completedAt: number;
  leafIndex: string | null;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  publicInputCount: number;
  releaseCandidateId: string | null;
  releaseDestination: string;
  root: string;
};

export type VantaPrivateCoreOperatorConsumeStateResponse = {
  stateVersion: number;
  latestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  records: VantaPrivateCoreOperatorConsumeRecord[];
};

export type VantaPrivateCoreOperatorProofRecord = {
  action: "consume" | "proof-only" | "register-root";
  assetId: string;
  amount: string;
  backend: string;
  circuit: string;
  completedAt: number;
  noteVersion: number;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  proofVersion: number;
  provingHashLane: string;
  publicInputCount: number;
  releaseDestination: string;
  root: string;
  verified: boolean;
};

export type VantaPrivateCoreOperatorProofStateResponse = {
  stateVersion: number;
  latestProof: VantaPrivateCoreOperatorProofRecord | null;
  records: VantaPrivateCoreOperatorProofRecord[];
};

export type VantaPrivateCoreOperatorSendProofRecord = {
  action: "send-proof";
  assetId: string;
  amount: string;
  backend: string;
  circuit: string;
  completedAt: number;
  noteVersion: number;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  proofVersion: number;
  provingHashLane: string;
  publicInputCount: number;
  releaseDestination: string;
  root: string;
  verified: boolean;
};

export type VantaPrivateCoreOperatorSendProofStateResponse = {
  stateVersion: number;
  latestProof: VantaPrivateCoreOperatorSendProofRecord | null;
  records: VantaPrivateCoreOperatorSendProofRecord[];
};

export type VantaPrivateCoreOperatorSwapProofRecord = {
  action: "swap-proof";
  assetId: string;
  amount: string;
  backend: string;
  circuit: string;
  completedAt: number;
  noteVersion: number;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  proofVersion: number;
  provingHashLane: string;
  publicInputCount: number;
  releaseDestination: string;
  root: string;
  verified: boolean;
};

export type VantaPrivateCoreOperatorSwapProofStateResponse = {
  stateVersion: number;
  latestProof: VantaPrivateCoreOperatorSwapProofRecord | null;
  records: VantaPrivateCoreOperatorSwapProofRecord[];
};

export type VantaPrivateCoreSwapOperatorResponse = VantaPrivateCoreProofOperatorResponse & {
  completedAt: number;
  executionQuoteReference: string | null;
  executionVenueLabel: string | null;
  inputNullifier: string;
  inputRoot: string;
  inputAssetId: string;
  inputAmount: string;
  outputAssetId: string;
  outputAmount: string;
  outputCommitment: string;
  proofId: string;
  resultingRootBasis: "client-declared";
  resultingRoot: string | null;
  swapId: string;
  swapRecorded: boolean;
};

export type VantaPrivateCoreOperatorSwapRecord = {
  completedAt: number;
  executionQuoteReference: string | null;
  executionVenueLabel: string | null;
  inputAssetId: string;
  inputNullifier: string;
  inputRoot: string;
  inputAmount: string;
  noteVersion: number;
  outputAssetId: string;
  outputAmount: string;
  outputCommitment: string;
  proofFieldCount: number;
  proofId: string;
  publicInputCount: number;
  resultingRootBasis: "client-declared";
  resultingRoot: string | null;
  swapId: string;
};

export type VantaPrivateCoreOperatorSwapStateResponse = {
  stateVersion: number;
  latestSwap: VantaPrivateCoreOperatorSwapRecord | null;
  records: VantaPrivateCoreOperatorSwapRecord[];
};

export type VantaPrivateCoreOperatorSendRecord = {
  assetId: string;
  changeAmount: string;
  changeCommitment: string | null;
  completedAt: number;
  inputNullifier: string;
  inputRoot: string;
  noteVersion: number;
  proofFieldCount: number;
  proofId: string;
  publicInputCount: number;
  releaseCandidateId: string | null;
  recipientCommitment: string;
  resultingRootBasis: "client-declared";
  resultingRoot: string | null;
  sendAmount: string;
  sendId: string;
};

export type VantaPrivateCoreOperatorSendStateResponse = {
  stateVersion: number;
  latestSend: VantaPrivateCoreOperatorSendRecord | null;
  records: VantaPrivateCoreOperatorSendRecord[];
};

export type VantaPrivateCoreOperatorReleaseRecord = {
  assetId: string;
  amount: string;
  authorizationBasis: "proof-backed-consume";
  completedAt: number;
  consumedNoteId: string;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  publicInputCount: number;
  releaseCandidateId: string | null;
  releaseDestination: string;
  rootPolicy: "latest-registered-root";
  releasedAssetId: string;
  releasedAmount: string;
  requestId: string;
  root: string;
  transitionNoteId: string;
};

export type VantaPrivateCoreOperatorReleaseStateResponse = {
  stateVersion: number;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  records: VantaPrivateCoreOperatorReleaseRecord[];
};

export type VantaPrivateCoreOperatorRootRecord = {
  amount: string | null;
  assetId: string | null;
  artifactBundleStatus: "complete" | "legacy-incomplete";
  artifactBundleVersion: number | null;
  merkleLeaf: string | null;
  noteCommitment: string | null;
  proofId: string | null;
  registrationBasis: "shield-input" | "send-recipient-output" | "send-change-output" | "swap-output";
  recordedAt: number;
  root: string;
  source: string;
  witnessRoot: string | null;
};

export type VantaPrivateCoreOperatorRootStateResponse = {
  currentRecord: VantaPrivateCoreOperatorRootRecord | null;
  stateVersion: number;
  currentRoot: string | null;
  records: VantaPrivateCoreOperatorRootRecord[];
};

export type VantaPrivateCoreOperatorRootRegistrationResponse = {
  known: boolean;
  root: string;
};

export type VantaPrivateCoreOperatorShippingDecisionResponse = {
  stateVersion: 1;
  decisionVersion: 1;
  decisionKind: "narrow-private-core-zk-v1-shipping";
  decisionStatus: "ready-to-ship" | "blocked";
  decisionNote: string;
  contractVersion: 21;
  summaryVersion: 45;
  generatedAt: number;
  shippingStatus: VantaPrivateCoreOperatorSummaryStateResponse["zkV1ShippingStatus"];
  shippingNote: string;
  finishLineStatus: VantaPrivateCoreOperatorSummaryStateResponse["zkV1FinishLineStatus"];
  finishLineNote: string;
  requiredLanesStatus: VantaPrivateCoreOperatorSummaryStateResponse["requiredLanesStatus"];
  requiredLanesNote: string;
  releaseBoundaryStatus: VantaPrivateCoreOperatorSummaryStateResponse["releaseBoundaryStatus"];
  releaseBoundaryNote: string;
  contractMirrorStatus: VantaPrivateCoreOperatorSummaryStateResponse["contractMirrorStatus"];
  contractMirrorNote: string;
  boundaryStatus: VantaPrivateCoreOperatorSummaryStateResponse["boundaryStatus"];
  boundaryNote: string;
};

export type VantaPrivateCoreOperatorSummaryStateResponse = {
  contractVersion: number;
  contractMirrorNote: string;
  contractMirrorStatus: "mirrors-contract" | "contract-mismatch";
  requiredLanesNote: string;
  requiredLanesStatus:
    | "coherent-required-lanes"
    | "send-lane-mismatch"
    | "release-lane-mismatch"
    | "finish-line-mismatch";
  zkV1ShippingNote: string;
  zkV1ShippingStatus:
    | "ready-narrow-v1"
    | "required-lanes-mismatch"
    | "release-boundary-mismatch"
    | "contract-mismatch"
    | "boundary-mismatch";
  releaseBoundaryNote: string;
  releaseBoundaryStatus:
    | "unavailable"
    | "consume-without-release"
    | "proof-unlinked"
    | "authorization-mismatch"
    | "root-policy-mismatch"
    | "release-recorded"
    | "contract-mismatch"
    | "boundary-mismatch";
  zkV1FinishLineNote: string;
  zkV1FinishLineStatus:
    | "coherent-minimum-v1-lane"
    | "scope-mismatch"
    | "required-lanes-mismatch"
    | "required-lane-decision-mismatch"
    | "swap-role-mismatch"
    | "contract-mismatch"
    | "boundary-mismatch";
  boundaryNote: string;
  boundaryStatus:
    | "coherent"
    | "awaiting-current-root"
    | "root-registration-unlinked"
    | "send-root-registration-unlinked"
    | "send-root-output-mismatch"
    | "proof-send-unlinked"
    | "proof-consume-unlinked"
    | "proof-release-unlinked";
  sendBoundaryNote: string;
  sendBoundaryStatus:
    | "unavailable"
    | "missing-resulting-root"
    | "awaiting-registration"
    | "output-mismatch"
    | "registration-proof-unlinked"
    | "proof-send-unlinked"
    | "coherent-current-root"
    | "coherent-registered-stale"
    | "downstream-consumed"
    | "downstream-released";
  currentRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  currentRootProofLinkStatus: "linked" | "mismatch" | "unavailable";
  sendResultingRootNote: string;
  sendResultingRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  sendResultingRootRecord: VantaPrivateCoreOperatorRootRecord | null;
  sendResultingRootRegistrationNote: string;
  sendResultingRootRegistrationStatus:
    | "unavailable"
    | "linked-recipient-output"
    | "linked-change-output"
    | "mismatch";
  sendResultingRootProofLinkStatus: "linked" | "mismatch" | "unavailable";
  sendContinuityNote: string;
  sendContinuityStatus:
    | "unavailable"
    | "missing-resulting-root"
    | "awaiting-registration"
    | "output-mismatch"
    | "registration-proof-unlinked"
    | "ready-current-root"
    | "ready-registered-stale"
    | "downstream-consumed"
    | "downstream-released";
  sendResultingRootStatus:
    | "unavailable"
    | "missing"
    | "current-root"
    | "registered-stale"
    | "downstream-consumed"
    | "downstream-released"
    | "unregistered";
  swapBoundaryNote: string;
  swapBoundaryStatus:
    | "unavailable"
    | "missing-resulting-root"
    | "awaiting-registration"
    | "output-mismatch"
    | "registration-proof-unlinked"
    | "proof-swap-unlinked"
    | "coherent-current-root"
    | "coherent-registered-stale"
    | "downstream-consumed"
    | "downstream-released";
  swapResultingRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  swapResultingRootRecord: VantaPrivateCoreOperatorRootRecord | null;
  swapResultingRootNote: string;
  swapResultingRootRegistrationNote: string;
  swapResultingRootRegistrationStatus: "unavailable" | "linked-output" | "mismatch";
  swapResultingRootProofLinkStatus: "linked" | "mismatch" | "unavailable";
  swapContinuityNote: string;
  swapContinuityStatus:
    | "unavailable"
    | "missing-resulting-root"
    | "awaiting-registration"
    | "output-mismatch"
    | "registration-proof-unlinked"
    | "ready-current-root"
    | "ready-registered-stale"
    | "downstream-consumed"
    | "downstream-released";
  swapResultingRootStatus:
    | "unavailable"
    | "missing"
    | "current-root"
    | "registered-stale"
    | "downstream-consumed"
    | "downstream-released"
    | "unregistered";
  supportedSendLaneKind: "single-input-single-recipient-optional-change";
  supportedSendLaneNote: string;
  supportedSendLaneStatus: "supported";
  supportedSendLaneVersion: number;
  supportedSendV1Decision: "accepted-narrow-v1-path";
  supportedSendV1DecisionNote: string;
  supportedUnshieldLaneKind: "single-note-proof-backed-consume";
  supportedUnshieldLaneNote: string;
  supportedUnshieldLaneStatus: "supported";
  supportedUnshieldLaneVersion: number;
  supportedUnshieldV1Decision: "accepted-narrow-v1-path";
  supportedUnshieldV1DecisionNote: string;
  supportedReleaseLaneKind: "proof-backed-consume-latest-registered-root";
  supportedReleaseLaneNote: string;
  supportedReleaseLaneStatus: "supported";
  supportedReleaseLaneVersion: number;
  supportedReleaseV1Decision: "accepted-narrow-v1-path";
  supportedReleaseV1DecisionNote: string;
  supportedSwapLaneVersion: number;
  supportedSwapLaneKind: "single-input-vusd-to-shielded-sol";
  supportedSwapLaneStatus: "supported";
  supportedSwapLaneNote: string;
  supportedSwapV1Decision: "accepted-narrow-v1-path";
  supportedSwapV1DecisionNote: string;
  supportedSwapV1Role: "adjacent-supported-not-required-for-finish-line";
  supportedSwapV1RoleNote: string;
  supportedSwapVenue: "meteora-dlmm-devnet";
  supportedSwapOutputModel: "shielded-sol-output-note";
  supportedFlowKind: "shield-hold-send-unshield-replay-guard";
  supportedFlowNote: string;
  supportedFlowStatus: "supported";
  supportedFlowVersion: number;
  supportedShippingDecisionVersion: 1;
  supportedShippingDecisionKind: "narrow-private-core-zk-v1-shipping";
  supportedShippingDecisionNote: string;
  supportedShippingDecisionGateVersion: 1;
  supportedShippingDecisionGateKind: "ready-gated-narrow-private-core-zk-v1-shipping";
  supportedShippingDecisionGateNote: string;
  supportedShippingDecisionGateTransport: "dedicated-endpoint";
  supportedShippingDecisionGateEndpoint: "/state/private-core-shipping-decision-check";
  supportedShippingDecisionTransport: "dedicated-endpoint";
  supportedShippingDecisionEndpoint: "/state/private-core-shipping-decision";
  supportedOperatorStatusVersion: 1;
  supportedOperatorStatusKind: "long-form-live-status";
  supportedOperatorStatusNote: string;
  supportedOperatorStatusGateVersion: 1;
  supportedOperatorStatusGateKind: "ready-gated-long-form-live-status";
  supportedOperatorStatusGateNote: string;
  supportedOperatorStatusGateTransport: "dedicated-endpoint";
  supportedOperatorStatusGateEndpoint: "/state/private-core-status-check";
  supportedOperatorStatusTransport: "dedicated-endpoint";
  supportedOperatorStatusEndpoint: "/state/private-core-status";
  supportedOperatorSnapshotVersion: 1;
  supportedOperatorSnapshotKind: "contract-status-shipping-bundle";
  supportedOperatorSnapshotNote: string;
  supportedOperatorSnapshotGateVersion: 1;
  supportedOperatorSnapshotGateKind: "ready-gated-contract-status-shipping-bundle";
  supportedOperatorSnapshotGateNote: string;
  supportedOperatorSnapshotGateTransport: "dedicated-endpoint";
  supportedOperatorSnapshotGateEndpoint: "/state/private-core-snapshot-check";
  supportedOperatorSnapshotTransport: "dedicated-endpoint";
  supportedOperatorSnapshotEndpoint: "/state/private-core-snapshot";
  supportedShippingArtifactVersion: 1;
  supportedShippingArtifactKind: "shipping-decision-checked-snapshot-bundle";
  supportedShippingArtifactNote: string;
  supportedShippingArtifactGateVersion: 1;
  supportedShippingArtifactGateKind: "ready-gated-shipping-decision-checked-snapshot-bundle";
  supportedShippingArtifactGateNote: string;
  supportedShippingArtifactGateTransport: "dedicated-endpoint";
  supportedShippingArtifactGateEndpoint: "/state/private-core-shipping-artifact-check";
  supportedShippingArtifactTransport: "dedicated-endpoint";
  supportedShippingArtifactEndpoint: "/state/private-core-shipping-artifact";
  supportedReleaseCandidateVersion: 1;
  supportedReleaseCandidateKind: "exact-run-send-consume-release-candidate";
  supportedReleaseCandidateNote: string;
  supportedReleaseCandidateScope: "primary-send-unshield-only";
  supportedReleaseCandidateScopeNote: string;
  supportedReleaseCandidateGateVersion: 1;
  supportedReleaseCandidateGateKind: "ready-gated-exact-run-send-consume-release-candidate";
  supportedReleaseCandidateGateNote: string;
  supportedReleaseCandidateGateTransport: "dedicated-endpoint";
  supportedReleaseCandidateGateEndpoint: "/state/private-core-release-candidate-check";
  supportedReleaseCandidateTransport: "dedicated-endpoint";
  supportedReleaseCandidateEndpoint: "/state/private-core-release-candidate";
  supportedZkV1ScopeDecision: "accepted-narrow-private-core-v1-scope";
  supportedZkV1ScopeNote: string;
  supportedZkV1RequiredLanes: "send|unshield|release";
  supportedZkV1RequiredLanesNote: string;
  supportedAssetSymbol: "VUSD";
  supportedEnvironment: "solana-devnet";
  supportedNoteSchema: "note-v0";
  supportedNoteVersion: number;
  supportedRootRegistrationProvenance:
    "shield-input|send-recipient-output|send-change-output|swap-output";
  supportedSendResultingRootBasis: "client-declared";
  supportedSendInputRootPolicy: "latest-registered-root-with-linked-registration-proof";
  supportedSendOutputRegistrationPolicy:
    "resulting-root-must-register-as-recipient-or-change-output";
  supportedSwapResultingRootBasis: "client-declared";
  supportedSwapInputRootPolicy: "latest-registered-root-with-linked-registration-proof";
  supportedSwapOutputRegistrationPolicy: "resulting-root-must-register-as-swap-output";
  supportedRecipientModel: "hashed-reference-to-owner-key";
  supportedReleaseDestinationModel: "32-byte-release-destination-field";
  supportedProofSystem: "noir-acir-ultrahonk-bbjs";
  supportedUnshieldCircuit: "vanta_private_core_single_note_unshield";
  supportedSendCircuit: "vanta_private_core_single_note_send";
  supportedUnshieldMerkleDepth: number;
  supportedSendMerkleDepth: number;
  supportedReleaseAuthorizationBasis: "proof-backed-consume";
  supportedReleaseRootPolicy: "latest-registered-root";
  supportedReleaseExecutionModel: "operator-recorded-devnet-release";
  supportedReleaseAtomicityModel: "operator-local-atomic-consume-and-release-record";
  supportedReleasePersistenceModel: "json-store-v1";
  ownerAuthorizationMode: "x25519-secret-prechecked-off-circuit";
  ownerAuthorizationDecision: "accepted-v1-off-circuit-precheck";
  ownerAuthorizationDecisionNote: string;
  sourceArtifactTruthBasis: "source-layer-artifact-bundle";
  provingArtifactTruthBasis: "verified-proving-public-input-vector";
  sourceProvingRelationship: "explicit-split-no-implicit-equality";
  nullifierKeyMode: "note-secret-as-nullifier-key-v0";
  nullifierKeyDecision: "accepted-v1-temporary-note-secret-key";
  nullifierKeyDecisionNote: string;
  provingHashLane: "poseidon-bn254-proving-lane-v0";
  generatedAt: number;
  stateVersion: number;
  summaryVersion: number;
  currentRoot: string | null;
  currentRecord: VantaPrivateCoreOperatorRootRecord | null;
  rootRecords: VantaPrivateCoreOperatorRootRecord[];
  latestProof: VantaPrivateCoreOperatorProofRecord | null;
  proofRecords: VantaPrivateCoreOperatorProofRecord[];
  latestSendProof: VantaPrivateCoreOperatorSendProofRecord | null;
  sendProofRecords: VantaPrivateCoreOperatorSendProofRecord[];
  latestSwapProof: VantaPrivateCoreOperatorSwapProofRecord | null;
  swapProofRecords: VantaPrivateCoreOperatorSwapProofRecord[];
  latestSendLinkedProof: VantaPrivateCoreOperatorSendProofRecord | null;
  latestSwapLinkedProof: VantaPrivateCoreOperatorSwapProofRecord | null;
  latestSend: VantaPrivateCoreOperatorSendRecord | null;
  sendRecords: VantaPrivateCoreOperatorSendRecord[];
  latestSwap: VantaPrivateCoreOperatorSwapRecord | null;
  swapRecords: VantaPrivateCoreOperatorSwapRecord[];
  latestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  consumeRecords: VantaPrivateCoreOperatorConsumeRecord[];
  latestConsumeProof: VantaPrivateCoreOperatorProofRecord | null;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  releaseRecords: VantaPrivateCoreOperatorReleaseRecord[];
  latestReleaseProof: VantaPrivateCoreOperatorProofRecord | null;
  rootRecordCount: number;
  proofRecordCount: number;
  sendProofRecordCount: number;
  swapProofRecordCount: number;
  sendRecordCount: number;
  swapRecordCount: number;
  consumeRecordCount: number;
  releaseRecordCount: number;
  proofSendLinkStatus: "linked" | "mismatch" | "unavailable";
  proofSwapLinkStatus: "linked" | "mismatch" | "unavailable";
  proofConsumeLinkStatus: "linked" | "mismatch" | "unavailable";
  proofReleaseLinkStatus: "linked" | "mismatch" | "unavailable";
};

export type VantaPrivateCoreOperatorContractStateResponse = {
  stateVersion: number;
  contractVersion: number;
  summaryVersion: number;
  supportedSendLaneVersion: number;
  supportedSendLaneKind: "single-input-single-recipient-optional-change";
  supportedSendLaneStatus: "supported";
  supportedSendLaneNote: string;
  supportedSendV1Decision: "accepted-narrow-v1-path";
  supportedSendV1DecisionNote: string;
  supportedUnshieldLaneVersion: number;
  supportedUnshieldLaneKind: "single-note-proof-backed-consume";
  supportedUnshieldLaneStatus: "supported";
  supportedUnshieldLaneNote: string;
  supportedUnshieldV1Decision: "accepted-narrow-v1-path";
  supportedUnshieldV1DecisionNote: string;
  supportedReleaseLaneVersion: number;
  supportedReleaseLaneKind: "proof-backed-consume-latest-registered-root";
  supportedReleaseLaneStatus: "supported";
  supportedReleaseLaneNote: string;
  supportedReleaseV1Decision: "accepted-narrow-v1-path";
  supportedReleaseV1DecisionNote: string;
  supportedSwapLaneVersion: number;
  supportedSwapLaneKind: "single-input-vusd-to-shielded-sol";
  supportedSwapLaneStatus: "supported";
  supportedSwapLaneNote: string;
  supportedSwapV1Decision: "accepted-narrow-v1-path";
  supportedSwapV1DecisionNote: string;
  supportedSwapV1Role: "adjacent-supported-not-required-for-finish-line";
  supportedSwapV1RoleNote: string;
  supportedSwapVenue: "meteora-dlmm-devnet";
  supportedSwapOutputModel: "shielded-sol-output-note";
  supportedFlowVersion: number;
  supportedFlowKind: "shield-hold-send-unshield-replay-guard";
  supportedFlowStatus: "supported";
  supportedFlowNote: string;
  supportedShippingDecisionVersion: 1;
  supportedShippingDecisionKind: "narrow-private-core-zk-v1-shipping";
  supportedShippingDecisionNote: string;
  supportedShippingDecisionGateVersion: 1;
  supportedShippingDecisionGateKind: "ready-gated-narrow-private-core-zk-v1-shipping";
  supportedShippingDecisionGateNote: string;
  supportedShippingDecisionGateTransport: "dedicated-endpoint";
  supportedShippingDecisionGateEndpoint: "/state/private-core-shipping-decision-check";
  supportedShippingDecisionTransport: "dedicated-endpoint";
  supportedShippingDecisionEndpoint: "/state/private-core-shipping-decision";
  supportedOperatorStatusVersion: 1;
  supportedOperatorStatusKind: "long-form-live-status";
  supportedOperatorStatusNote: string;
  supportedOperatorStatusGateVersion: 1;
  supportedOperatorStatusGateKind: "ready-gated-long-form-live-status";
  supportedOperatorStatusGateNote: string;
  supportedOperatorStatusGateTransport: "dedicated-endpoint";
  supportedOperatorStatusGateEndpoint: "/state/private-core-status-check";
  supportedOperatorStatusTransport: "dedicated-endpoint";
  supportedOperatorStatusEndpoint: "/state/private-core-status";
  supportedOperatorSnapshotVersion: 1;
  supportedOperatorSnapshotKind: "contract-status-shipping-bundle";
  supportedOperatorSnapshotNote: string;
  supportedOperatorSnapshotGateVersion: 1;
  supportedOperatorSnapshotGateKind: "ready-gated-contract-status-shipping-bundle";
  supportedOperatorSnapshotGateNote: string;
  supportedOperatorSnapshotGateTransport: "dedicated-endpoint";
  supportedOperatorSnapshotGateEndpoint: "/state/private-core-snapshot-check";
  supportedOperatorSnapshotTransport: "dedicated-endpoint";
  supportedOperatorSnapshotEndpoint: "/state/private-core-snapshot";
  supportedShippingArtifactVersion: 1;
  supportedShippingArtifactKind: "shipping-decision-checked-snapshot-bundle";
  supportedShippingArtifactNote: string;
  supportedShippingArtifactGateVersion: 1;
  supportedShippingArtifactGateKind: "ready-gated-shipping-decision-checked-snapshot-bundle";
  supportedShippingArtifactGateNote: string;
  supportedShippingArtifactGateTransport: "dedicated-endpoint";
  supportedShippingArtifactGateEndpoint: "/state/private-core-shipping-artifact-check";
  supportedShippingArtifactTransport: "dedicated-endpoint";
  supportedShippingArtifactEndpoint: "/state/private-core-shipping-artifact";
  supportedReleaseCandidateVersion: 1;
  supportedReleaseCandidateKind: "exact-run-send-consume-release-candidate";
  supportedReleaseCandidateNote: string;
  supportedReleaseCandidateScope: "primary-send-unshield-only";
  supportedReleaseCandidateScopeNote: string;
  supportedReleaseCandidateGateVersion: 1;
  supportedReleaseCandidateGateKind: "ready-gated-exact-run-send-consume-release-candidate";
  supportedReleaseCandidateGateNote: string;
  supportedReleaseCandidateGateTransport: "dedicated-endpoint";
  supportedReleaseCandidateGateEndpoint: "/state/private-core-release-candidate-check";
  supportedReleaseCandidateTransport: "dedicated-endpoint";
  supportedReleaseCandidateEndpoint: "/state/private-core-release-candidate";
  supportedZkV1ScopeDecision: "accepted-narrow-private-core-v1-scope";
  supportedZkV1ScopeNote: string;
  supportedZkV1RequiredLanes: "send|unshield|release";
  supportedZkV1RequiredLanesNote: string;
  supportedAssetSymbol: "VUSD";
  supportedEnvironment: "solana-devnet";
  supportedNoteSchema: "note-v0";
  supportedNoteVersion: number;
  supportedRootRegistrationProvenance:
    "shield-input|send-recipient-output|send-change-output|swap-output";
  supportedSendResultingRootBasis: "client-declared";
  supportedSendInputRootPolicy: "latest-registered-root-with-linked-registration-proof";
  supportedSendOutputRegistrationPolicy:
    "resulting-root-must-register-as-recipient-or-change-output";
  supportedSwapResultingRootBasis: "client-declared";
  supportedSwapInputRootPolicy: "latest-registered-root-with-linked-registration-proof";
  supportedSwapOutputRegistrationPolicy: "resulting-root-must-register-as-swap-output";
  supportedRecipientModel: "hashed-reference-to-owner-key";
  supportedReleaseDestinationModel: "32-byte-release-destination-field";
  supportedProofSystem: "noir-acir-ultrahonk-bbjs";
  supportedUnshieldCircuit: "vanta_private_core_single_note_unshield";
  supportedSendCircuit: "vanta_private_core_single_note_send";
  supportedUnshieldMerkleDepth: number;
  supportedSendMerkleDepth: number;
  supportedReleaseAuthorizationBasis: "proof-backed-consume";
  supportedReleaseRootPolicy: "latest-registered-root";
  supportedReleaseExecutionModel: "operator-recorded-devnet-release";
  supportedReleaseAtomicityModel: "operator-local-atomic-consume-and-release-record";
  supportedReleasePersistenceModel: "json-store-v1";
  ownerAuthorizationMode: "x25519-secret-prechecked-off-circuit";
  ownerAuthorizationDecision: "accepted-v1-off-circuit-precheck";
  ownerAuthorizationDecisionNote: string;
  sourceArtifactTruthBasis: "source-layer-artifact-bundle";
  provingArtifactTruthBasis: "verified-proving-public-input-vector";
  sourceProvingRelationship: "explicit-split-no-implicit-equality";
  nullifierKeyMode: "note-secret-as-nullifier-key-v0";
  nullifierKeyDecision: "accepted-v1-temporary-note-secret-key";
  nullifierKeyDecisionNote: string;
  provingHashLane: "poseidon-bn254-proving-lane-v0";
};

export type VantaPrivateCoreOperatorSnapshotStateResponse = {
  operator: string;
  snapshotVersion: 1;
  snapshotKind: "contract-status-shipping-bundle";
  contract: VantaPrivateCoreOperatorContractStateResponse & { operator: string };
  status: {
    operator: string;
    summary: VantaPrivateCoreOperatorSummaryStateResponse;
    shippingDecision: VantaPrivateCoreOperatorShippingDecisionResponse;
  };
  shipping: {
    operator: string;
    summaryStateVersion: 1;
    decisionVersion: 1;
    decisionKind: "narrow-private-core-zk-v1-shipping";
    decisionStatusRaw: "ready-to-ship" | "blocked";
    decisionStatus: string;
    decisionNote: string;
    mirroredContractVersion: 21;
    summaryVersion: 45;
    summaryGenerated: number;
    shippingStatusRaw: VantaPrivateCoreOperatorSummaryStateResponse["zkV1ShippingStatus"];
    shippingStatus: string;
    shippingNote: string;
    finishLineStatusRaw: VantaPrivateCoreOperatorSummaryStateResponse["zkV1FinishLineStatus"];
    finishLineStatus: string;
    finishLineNote: string;
    requiredLanesStatusRaw: VantaPrivateCoreOperatorSummaryStateResponse["requiredLanesStatus"];
    requiredLanesStatus: string;
    requiredLanesNote: string;
    releaseBoundaryStatusRaw:
      VantaPrivateCoreOperatorSummaryStateResponse["releaseBoundaryStatus"];
    releaseBoundaryStatus: string;
    releaseBoundaryNote: string;
    contractMirrorStatusRaw:
      VantaPrivateCoreOperatorSummaryStateResponse["contractMirrorStatus"];
    contractMirrorStatus: string;
    contractMirrorNote: string;
    boundaryStatusRaw: VantaPrivateCoreOperatorSummaryStateResponse["boundaryStatus"];
    boundaryStatus: string;
    boundaryNote: string;
  };
};

export type VantaPrivateCoreOperatorStatusResponse = {
  operator: string;
  statusVersion: 1;
  statusKind: "long-form-live-status";
  snapshotVersion: 1;
  snapshotKind: "contract-status-shipping-bundle";
  shippingArtifactVersion: 1;
  shippingArtifactKind: "shipping-decision-checked-snapshot-bundle";
  summary: VantaPrivateCoreOperatorSummaryStateResponse;
  shippingDecision: VantaPrivateCoreOperatorShippingDecisionResponse;
};

export type VantaPrivateCoreOperatorShippingArtifactResponse = {
  operator: string;
  artifactVersion: 1;
  artifactKind: "shipping-decision-checked-snapshot-bundle";
  decisionVersion: 1;
  decisionKind: "narrow-private-core-zk-v1-shipping";
  decisionStatus: "ready-to-ship" | "blocked";
  decisionNote: string;
  snapshotVersion: 1;
  snapshotKind: "contract-status-shipping-bundle";
  contractVersion: 21;
  summaryVersion: 45;
  currentRoot: string | null;
  currentRootRegistrationBasis:
    | "shield-input"
    | "send-recipient-output"
    | "send-change-output"
    | "swap-output"
    | null;
  currentRootProofId: string | null;
  latestProofId: string | null;
  latestProofAction: "consume" | "proof-only" | "register-root" | null;
  latestSendProofId: string | null;
  latestSendLinkedProofId: string | null;
  latestSendId: string | null;
  latestSendRecordProofId: string | null;
  latestSendResultingRoot: string | null;
  latestConsumeRecordProofId: string | null;
  latestConsumeLinkedProofId: string | null;
  latestConsumeRoot: string | null;
  latestReleaseRecordProofId: string | null;
  latestReleaseLinkedProofId: string | null;
  latestReleaseRequestId: string | null;
  latestReleaseRoot: string | null;
  latestReleaseDestination: string | null;
  latestReleasedAssetId: string | null;
  latestReleasedAmount: string | null;
  releaseCandidateId: string | null;
  releaseCandidateLineageStatus:
    | "ready"
    | "blocked"
    | "send-mismatch"
    | "consume-mismatch"
    | "release-mismatch"
    | "unavailable";
  releaseCandidateLineageNote: string;
  snapshot: VantaPrivateCoreOperatorSnapshotStateResponse;
};

export type VantaPrivateCoreOperatorReleaseCandidateResponse = {
  operator: string;
  candidateVersion: 1;
  candidateKind: "private-core-send-consume-release-candidate";
  decisionVersion: 1;
  decisionKind: "narrow-private-core-zk-v1-shipping";
  decisionStatus: "ready-to-ship" | "blocked";
  decisionNote: string;
  contractVersion: 21;
  summaryVersion: 45;
  artifactVersion: 1;
  artifactKind: "shipping-decision-checked-snapshot-bundle";
  releaseCandidateId: string | null;
  lineageStatus:
    | "ready"
    | "blocked"
    | "send-mismatch"
    | "consume-mismatch"
    | "release-mismatch"
    | "unavailable";
  lineageNote: string;
  sendId: string | null;
  sendProofId: string | null;
  sendLinkedProofId: string | null;
  sendRecordProofId: string | null;
  sendResultingRoot: string | null;
  consumeRecordProofId: string | null;
  consumeLinkedProofId: string | null;
  consumeRoot: string | null;
  releaseRecordProofId: string | null;
  releaseLinkedProofId: string | null;
  releaseRequestId: string | null;
  releaseRoot: string | null;
  releaseDestination: string | null;
  releasedAssetId: string | null;
  releasedAmount: string | null;
  snapshotVersion: 1;
  snapshotKind: "contract-status-shipping-bundle";
};

export type VantaPrivateCoreOperatorReleaseCandidateCheckResponse = {
  operator: string;
  checkVersion: 1;
  checkKind: "ready-gated-private-core-release-candidate";
  decisionStatus: "ready" | "blocked";
  decisionNote: string;
  candidate: VantaPrivateCoreOperatorReleaseCandidateResponse;
};

function parsePrivateCoreOperatorContractState(
  value: unknown,
  errorMessage: string,
): VantaPrivateCoreOperatorContractStateResponse {
  const parsed = value as {
    operator?: unknown;
    stateVersion?: unknown;
    contractVersion?: unknown;
    summaryVersion?: unknown;
    supportedOperatorSnapshotVersion?: unknown;
    supportedOperatorSnapshotKind?: unknown;
    supportedOperatorSnapshotGateVersion?: unknown;
    supportedOperatorSnapshotGateKind?: unknown;
    supportedOperatorSnapshotGateTransport?: unknown;
    supportedOperatorSnapshotGateEndpoint?: unknown;
    supportedOperatorSnapshotTransport?: unknown;
    supportedOperatorSnapshotEndpoint?: unknown;
    supportedOperatorStatusVersion?: unknown;
    supportedOperatorStatusKind?: unknown;
    supportedOperatorStatusGateVersion?: unknown;
    supportedOperatorStatusGateKind?: unknown;
    supportedOperatorStatusGateTransport?: unknown;
    supportedOperatorStatusGateEndpoint?: unknown;
    supportedOperatorStatusTransport?: unknown;
    supportedOperatorStatusEndpoint?: unknown;
    supportedShippingArtifactVersion?: unknown;
    supportedShippingArtifactKind?: unknown;
    supportedShippingArtifactGateVersion?: unknown;
    supportedShippingArtifactGateKind?: unknown;
    supportedShippingArtifactGateTransport?: unknown;
    supportedShippingArtifactGateEndpoint?: unknown;
    supportedShippingArtifactTransport?: unknown;
    supportedShippingArtifactEndpoint?: unknown;
    supportedReleaseCandidateVersion?: unknown;
    supportedReleaseCandidateKind?: unknown;
    supportedReleaseCandidateNote?: unknown;
    supportedReleaseCandidateScope?: unknown;
    supportedReleaseCandidateScopeNote?: unknown;
    supportedReleaseCandidateGateVersion?: unknown;
    supportedReleaseCandidateGateKind?: unknown;
    supportedReleaseCandidateGateNote?: unknown;
    supportedReleaseCandidateGateTransport?: unknown;
    supportedReleaseCandidateGateEndpoint?: unknown;
    supportedReleaseCandidateTransport?: unknown;
    supportedReleaseCandidateEndpoint?: unknown;
  };

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof parsed.operator !== "string" ||
    parsed.stateVersion !== 1 ||
    parsed.contractVersion !== 21 ||
    parsed.summaryVersion !== 45 ||
    parsed.supportedOperatorSnapshotVersion !== 1 ||
    parsed.supportedOperatorSnapshotKind !== "contract-status-shipping-bundle" ||
    parsed.supportedOperatorSnapshotGateVersion !== 1 ||
    parsed.supportedOperatorSnapshotGateKind !== "ready-gated-contract-status-shipping-bundle" ||
    parsed.supportedOperatorSnapshotGateTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorSnapshotGateEndpoint !== "/state/private-core-snapshot-check" ||
    parsed.supportedOperatorSnapshotTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorSnapshotEndpoint !== "/state/private-core-snapshot" ||
    parsed.supportedOperatorStatusVersion !== 1 ||
    parsed.supportedOperatorStatusKind !== "long-form-live-status" ||
    parsed.supportedOperatorStatusGateVersion !== 1 ||
    parsed.supportedOperatorStatusGateKind !== "ready-gated-long-form-live-status" ||
    parsed.supportedOperatorStatusGateTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorStatusGateEndpoint !== "/state/private-core-status-check" ||
    parsed.supportedOperatorStatusTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorStatusEndpoint !== "/state/private-core-status" ||
    parsed.supportedShippingArtifactVersion !== 1 ||
    parsed.supportedShippingArtifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    parsed.supportedShippingArtifactGateVersion !== 1 ||
    parsed.supportedShippingArtifactGateKind !==
      "ready-gated-shipping-decision-checked-snapshot-bundle" ||
    parsed.supportedShippingArtifactGateTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingArtifactGateEndpoint !==
      "/state/private-core-shipping-artifact-check" ||
    parsed.supportedShippingArtifactTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingArtifactEndpoint !== "/state/private-core-shipping-artifact" ||
    typeof parsed.supportedReleaseCandidateNote !== "string" ||
    parsed.supportedReleaseCandidateVersion !== 1 ||
    parsed.supportedReleaseCandidateKind !== "exact-run-send-consume-release-candidate" ||
    parsed.supportedReleaseCandidateScope !== "primary-send-unshield-only" ||
    typeof parsed.supportedReleaseCandidateScopeNote !== "string" ||
    typeof parsed.supportedReleaseCandidateGateNote !== "string" ||
    parsed.supportedReleaseCandidateGateVersion !== 1 ||
    parsed.supportedReleaseCandidateGateKind !==
      "ready-gated-exact-run-send-consume-release-candidate" ||
    parsed.supportedReleaseCandidateGateTransport !== "dedicated-endpoint" ||
    parsed.supportedReleaseCandidateGateEndpoint !==
      "/state/private-core-release-candidate-check" ||
    parsed.supportedReleaseCandidateTransport !== "dedicated-endpoint" ||
    parsed.supportedReleaseCandidateEndpoint !== "/state/private-core-release-candidate"
  ) {
    throw new Error(errorMessage);
  }

  return parsed as VantaPrivateCoreOperatorContractStateResponse;
}

function parsePrivateCoreOperatorSummaryState(
  value: unknown,
  errorMessage: string,
): VantaPrivateCoreOperatorSummaryStateResponse {
  const parsed = value as {
    stateVersion?: unknown;
    contractVersion?: unknown;
    summaryVersion?: unknown;
    generatedAt?: unknown;
    requiredLanesStatus?: unknown;
    zkV1ShippingStatus?: unknown;
    releaseBoundaryStatus?: unknown;
    contractMirrorStatus?: unknown;
    boundaryStatus?: unknown;
    supportedOperatorSnapshotVersion?: unknown;
    supportedOperatorSnapshotKind?: unknown;
    supportedOperatorSnapshotGateVersion?: unknown;
    supportedOperatorSnapshotGateKind?: unknown;
    supportedOperatorSnapshotGateTransport?: unknown;
    supportedOperatorSnapshotGateEndpoint?: unknown;
    supportedOperatorSnapshotTransport?: unknown;
    supportedOperatorSnapshotEndpoint?: unknown;
    supportedOperatorStatusVersion?: unknown;
    supportedOperatorStatusKind?: unknown;
    supportedOperatorStatusGateVersion?: unknown;
    supportedOperatorStatusGateKind?: unknown;
    supportedOperatorStatusGateTransport?: unknown;
    supportedOperatorStatusGateEndpoint?: unknown;
    supportedOperatorStatusTransport?: unknown;
    supportedOperatorStatusEndpoint?: unknown;
    supportedShippingArtifactVersion?: unknown;
    supportedShippingArtifactKind?: unknown;
    supportedShippingArtifactGateVersion?: unknown;
    supportedShippingArtifactGateKind?: unknown;
    supportedShippingArtifactGateTransport?: unknown;
    supportedShippingArtifactGateEndpoint?: unknown;
    supportedShippingArtifactTransport?: unknown;
    supportedShippingArtifactEndpoint?: unknown;
    supportedReleaseCandidateVersion?: unknown;
    supportedReleaseCandidateKind?: unknown;
    supportedReleaseCandidateNote?: unknown;
    supportedReleaseCandidateScope?: unknown;
    supportedReleaseCandidateScopeNote?: unknown;
    supportedReleaseCandidateGateVersion?: unknown;
    supportedReleaseCandidateGateKind?: unknown;
    supportedReleaseCandidateGateNote?: unknown;
    supportedReleaseCandidateGateTransport?: unknown;
    supportedReleaseCandidateGateEndpoint?: unknown;
    supportedReleaseCandidateTransport?: unknown;
    supportedReleaseCandidateEndpoint?: unknown;
  };

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    parsed.stateVersion !== 1 ||
    parsed.contractVersion !== 21 ||
    parsed.summaryVersion !== 45 ||
    typeof parsed.generatedAt !== "number" ||
    !isRequiredLanesStatus(parsed.requiredLanesStatus) ||
    !isZkV1ShippingStatus(parsed.zkV1ShippingStatus) ||
    !isReleaseBoundaryStatus(parsed.releaseBoundaryStatus) ||
    !isContractMirrorStatus(parsed.contractMirrorStatus) ||
    !isBoundaryStatus(parsed.boundaryStatus) ||
    parsed.supportedOperatorSnapshotVersion !== 1 ||
    parsed.supportedOperatorSnapshotKind !== "contract-status-shipping-bundle" ||
    parsed.supportedOperatorSnapshotGateVersion !== 1 ||
    parsed.supportedOperatorSnapshotGateKind !== "ready-gated-contract-status-shipping-bundle" ||
    parsed.supportedOperatorSnapshotGateTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorSnapshotGateEndpoint !== "/state/private-core-snapshot-check" ||
    parsed.supportedOperatorSnapshotTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorSnapshotEndpoint !== "/state/private-core-snapshot" ||
    parsed.supportedOperatorStatusVersion !== 1 ||
    parsed.supportedOperatorStatusKind !== "long-form-live-status" ||
    parsed.supportedOperatorStatusGateVersion !== 1 ||
    parsed.supportedOperatorStatusGateKind !== "ready-gated-long-form-live-status" ||
    parsed.supportedOperatorStatusGateTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorStatusGateEndpoint !== "/state/private-core-status-check" ||
    parsed.supportedOperatorStatusTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorStatusEndpoint !== "/state/private-core-status" ||
    parsed.supportedShippingArtifactVersion !== 1 ||
    parsed.supportedShippingArtifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    parsed.supportedShippingArtifactGateVersion !== 1 ||
    parsed.supportedShippingArtifactGateKind !==
      "ready-gated-shipping-decision-checked-snapshot-bundle" ||
    parsed.supportedShippingArtifactGateTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingArtifactGateEndpoint !==
      "/state/private-core-shipping-artifact-check" ||
    parsed.supportedShippingArtifactTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingArtifactEndpoint !== "/state/private-core-shipping-artifact" ||
    typeof parsed.supportedReleaseCandidateNote !== "string" ||
    parsed.supportedReleaseCandidateVersion !== 1 ||
    parsed.supportedReleaseCandidateKind !== "exact-run-send-consume-release-candidate" ||
    parsed.supportedReleaseCandidateScope !== "primary-send-unshield-only" ||
    typeof parsed.supportedReleaseCandidateScopeNote !== "string" ||
    typeof parsed.supportedReleaseCandidateGateNote !== "string" ||
    parsed.supportedReleaseCandidateGateVersion !== 1 ||
    parsed.supportedReleaseCandidateGateKind !==
      "ready-gated-exact-run-send-consume-release-candidate" ||
    parsed.supportedReleaseCandidateGateTransport !== "dedicated-endpoint" ||
    parsed.supportedReleaseCandidateGateEndpoint !==
      "/state/private-core-release-candidate-check" ||
    parsed.supportedReleaseCandidateTransport !== "dedicated-endpoint" ||
    parsed.supportedReleaseCandidateEndpoint !== "/state/private-core-release-candidate"
  ) {
    throw new Error(errorMessage);
  }

  return parsed as VantaPrivateCoreOperatorSummaryStateResponse;
}

function parsePrivateCoreOperatorShippingDecisionState(
  value: unknown,
  errorMessage: string,
): VantaPrivateCoreOperatorShippingDecisionResponse {
  const parsed = value as {
    stateVersion?: unknown;
    decisionVersion?: unknown;
    decisionKind?: unknown;
    decisionStatus?: unknown;
    decisionNote?: unknown;
    contractVersion?: unknown;
    summaryVersion?: unknown;
    generatedAt?: unknown;
    shippingStatus?: unknown;
    shippingNote?: unknown;
    finishLineStatus?: unknown;
    finishLineNote?: unknown;
    requiredLanesStatus?: unknown;
    requiredLanesNote?: unknown;
    releaseBoundaryStatus?: unknown;
    releaseBoundaryNote?: unknown;
    contractMirrorStatus?: unknown;
    contractMirrorNote?: unknown;
    boundaryStatus?: unknown;
    boundaryNote?: unknown;
  };

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    parsed.stateVersion !== 1 ||
    parsed.decisionVersion !== 1 ||
    parsed.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    !isShippingDecisionStatus(parsed.decisionStatus) ||
    typeof parsed.decisionNote !== "string" ||
    parsed.contractVersion !== 21 ||
    parsed.summaryVersion !== 45 ||
    typeof parsed.generatedAt !== "number" ||
    !isZkV1ShippingStatus(parsed.shippingStatus) ||
    typeof parsed.shippingNote !== "string" ||
    !isZkV1FinishLineStatus(parsed.finishLineStatus) ||
    typeof parsed.finishLineNote !== "string" ||
    !isRequiredLanesStatus(parsed.requiredLanesStatus) ||
    typeof parsed.requiredLanesNote !== "string" ||
    !isReleaseBoundaryStatus(parsed.releaseBoundaryStatus) ||
    typeof parsed.releaseBoundaryNote !== "string" ||
    !isContractMirrorStatus(parsed.contractMirrorStatus) ||
    typeof parsed.contractMirrorNote !== "string" ||
    !isBoundaryStatus(parsed.boundaryStatus) ||
    typeof parsed.boundaryNote !== "string"
  ) {
    throw new Error(errorMessage);
  }

  return parsed as VantaPrivateCoreOperatorShippingDecisionResponse;
}

function parsePrivateCoreOperatorSnapshotPayload(
  value: unknown,
  errorMessage: string,
): VantaPrivateCoreOperatorSnapshotStateResponse {
  const parsed = value as {
    operator?: unknown;
    snapshotVersion?: unknown;
    snapshotKind?: unknown;
    contract?: unknown;
    status?: unknown;
    shipping?: unknown;
  };

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof parsed.operator !== "string" ||
    parsed.snapshotVersion !== 1 ||
    parsed.snapshotKind !== "contract-status-shipping-bundle" ||
    !parsed.contract ||
    !parsed.status ||
    !parsed.shipping
  ) {
    throw new Error(errorMessage);
  }

  const contract = parsePrivateCoreOperatorContractState(parsed.contract, errorMessage);
  const statusContainer = parsed.status as {
    operator?: unknown;
    summary?: unknown;
    shippingDecision?: unknown;
  };
  const shipping = parsed.shipping as {
    operator?: unknown;
    summaryStateVersion?: unknown;
    decisionVersion?: unknown;
    decisionKind?: unknown;
    decisionStatusRaw?: unknown;
    decisionStatus?: unknown;
    decisionNote?: unknown;
    mirroredContractVersion?: unknown;
    summaryVersion?: unknown;
    summaryGenerated?: unknown;
    shippingStatusRaw?: unknown;
    shippingStatus?: unknown;
    shippingNote?: unknown;
    finishLineStatusRaw?: unknown;
    finishLineStatus?: unknown;
    finishLineNote?: unknown;
    requiredLanesStatusRaw?: unknown;
    requiredLanesStatus?: unknown;
    requiredLanesNote?: unknown;
    releaseBoundaryStatusRaw?: unknown;
    releaseBoundaryStatus?: unknown;
    releaseBoundaryNote?: unknown;
    contractMirrorStatusRaw?: unknown;
    contractMirrorStatus?: unknown;
    contractMirrorNote?: unknown;
    boundaryStatusRaw?: unknown;
    boundaryStatus?: unknown;
    boundaryNote?: unknown;
  };

  if (
    typeof statusContainer !== "object" ||
    statusContainer === null ||
    typeof statusContainer.operator !== "string" ||
    !statusContainer.summary ||
    !statusContainer.shippingDecision ||
    typeof shipping !== "object" ||
    shipping === null ||
    typeof shipping.operator !== "string" ||
    shipping.summaryStateVersion !== 1 ||
    shipping.decisionVersion !== 1 ||
    shipping.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    !isShippingDecisionStatus(shipping.decisionStatusRaw) ||
    typeof shipping.decisionStatus !== "string" ||
    typeof shipping.decisionNote !== "string" ||
    shipping.mirroredContractVersion !== 20 ||
    shipping.summaryVersion !== 45 ||
    typeof shipping.summaryGenerated !== "number" ||
    !isZkV1ShippingStatus(shipping.shippingStatusRaw) ||
    typeof shipping.shippingStatus !== "string" ||
    typeof shipping.shippingNote !== "string" ||
    !isZkV1FinishLineStatus(shipping.finishLineStatusRaw) ||
    typeof shipping.finishLineStatus !== "string" ||
    typeof shipping.finishLineNote !== "string" ||
    !isRequiredLanesStatus(shipping.requiredLanesStatusRaw) ||
    typeof shipping.requiredLanesStatus !== "string" ||
    typeof shipping.requiredLanesNote !== "string" ||
    !isReleaseBoundaryStatus(shipping.releaseBoundaryStatusRaw) ||
    typeof shipping.releaseBoundaryStatus !== "string" ||
    typeof shipping.releaseBoundaryNote !== "string" ||
    !isContractMirrorStatus(shipping.contractMirrorStatusRaw) ||
    typeof shipping.contractMirrorStatus !== "string" ||
    typeof shipping.contractMirrorNote !== "string" ||
    !isBoundaryStatus(shipping.boundaryStatusRaw) ||
    typeof shipping.boundaryStatus !== "string" ||
    typeof shipping.boundaryNote !== "string"
  ) {
    throw new Error(errorMessage);
  }

  return {
    operator: parsed.operator,
    snapshotVersion: 1,
    snapshotKind: "contract-status-shipping-bundle",
    contract: {
      operator: parsed.operator,
      ...contract,
    },
    status: {
      operator: statusContainer.operator,
      summary: parsePrivateCoreOperatorSummaryState(statusContainer.summary, errorMessage),
      shippingDecision: parsePrivateCoreOperatorShippingDecisionState(
        statusContainer.shippingDecision,
        errorMessage,
      ),
    },
    shipping: {
      operator: shipping.operator,
      summaryStateVersion: 1,
      decisionVersion: 1,
      decisionKind: "narrow-private-core-zk-v1-shipping",
      decisionStatusRaw: shipping.decisionStatusRaw,
      decisionStatus: shipping.decisionStatus,
      decisionNote: shipping.decisionNote,
      mirroredContractVersion: 21,
      summaryVersion: 45,
      summaryGenerated: shipping.summaryGenerated,
      shippingStatusRaw: shipping.shippingStatusRaw,
      shippingStatus: shipping.shippingStatus,
      shippingNote: shipping.shippingNote,
      finishLineStatusRaw: shipping.finishLineStatusRaw,
      finishLineStatus: shipping.finishLineStatus,
      finishLineNote: shipping.finishLineNote,
      requiredLanesStatusRaw: shipping.requiredLanesStatusRaw,
      requiredLanesStatus: shipping.requiredLanesStatus,
      requiredLanesNote: shipping.requiredLanesNote,
      releaseBoundaryStatusRaw: shipping.releaseBoundaryStatusRaw,
      releaseBoundaryStatus: shipping.releaseBoundaryStatus,
      releaseBoundaryNote: shipping.releaseBoundaryNote,
      contractMirrorStatusRaw: shipping.contractMirrorStatusRaw,
      contractMirrorStatus: shipping.contractMirrorStatus,
      contractMirrorNote: shipping.contractMirrorNote,
      boundaryStatusRaw: shipping.boundaryStatusRaw,
      boundaryStatus: shipping.boundaryStatus,
      boundaryNote: shipping.boundaryNote,
    },
  };
}

function isContractMirrorStatus(value: unknown): value is "mirrors-contract" | "contract-mismatch" {
  return value === "mirrors-contract" || value === "contract-mismatch";
}

function isZkV1FinishLineStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["zkV1FinishLineStatus"] {
  return (
    value === "coherent-minimum-v1-lane" ||
    value === "scope-mismatch" ||
    value === "required-lanes-mismatch" ||
    value === "required-lane-decision-mismatch" ||
    value === "swap-role-mismatch" ||
    value === "contract-mismatch" ||
    value === "boundary-mismatch"
  );
}

function isReleaseBoundaryStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["releaseBoundaryStatus"] {
  return (
    value === "unavailable" ||
    value === "consume-without-release" ||
    value === "proof-unlinked" ||
    value === "authorization-mismatch" ||
    value === "root-policy-mismatch" ||
    value === "release-recorded" ||
    value === "contract-mismatch" ||
    value === "boundary-mismatch"
  );
}

function isRequiredLanesStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["requiredLanesStatus"] {
  return (
    value === "coherent-required-lanes" ||
    value === "send-lane-mismatch" ||
    value === "release-lane-mismatch" ||
    value === "finish-line-mismatch"
  );
}

function isZkV1ShippingStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["zkV1ShippingStatus"] {
  return (
    value === "ready-narrow-v1" ||
    value === "required-lanes-mismatch" ||
    value === "release-boundary-mismatch" ||
    value === "contract-mismatch" ||
    value === "boundary-mismatch"
  );
}

function isShippingDecisionStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorShippingDecisionResponse["decisionStatus"] {
  return value === "ready-to-ship" || value === "blocked";
}

function isSendContinuityStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["sendContinuityStatus"] {
  return (
    value === "unavailable" ||
    value === "missing-resulting-root" ||
    value === "awaiting-registration" ||
    value === "output-mismatch" ||
    value === "registration-proof-unlinked" ||
    value === "ready-current-root" ||
    value === "ready-registered-stale" ||
    value === "downstream-consumed" ||
    value === "downstream-released"
  );
}

function isSendBoundaryStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["sendBoundaryStatus"] {
  return (
    value === "unavailable" ||
    value === "missing-resulting-root" ||
    value === "awaiting-registration" ||
    value === "output-mismatch" ||
    value === "registration-proof-unlinked" ||
    value === "proof-send-unlinked" ||
    value === "coherent-current-root" ||
    value === "coherent-registered-stale" ||
    value === "downstream-consumed" ||
    value === "downstream-released"
  );
}

function isSwapContinuityStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["swapContinuityStatus"] {
  return (
    value === "unavailable" ||
    value === "missing-resulting-root" ||
    value === "awaiting-registration" ||
    value === "output-mismatch" ||
    value === "registration-proof-unlinked" ||
    value === "ready-current-root" ||
    value === "ready-registered-stale" ||
    value === "downstream-consumed" ||
    value === "downstream-released"
  );
}

function isSwapBoundaryStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["swapBoundaryStatus"] {
  return (
    value === "unavailable" ||
    value === "missing-resulting-root" ||
    value === "awaiting-registration" ||
    value === "output-mismatch" ||
    value === "registration-proof-unlinked" ||
    value === "proof-swap-unlinked" ||
    value === "coherent-current-root" ||
    value === "coherent-registered-stale" ||
    value === "downstream-consumed" ||
    value === "downstream-released"
  );
}

function isSwapResultingRootStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["swapResultingRootStatus"] {
  return (
    value === "unavailable" ||
    value === "missing" ||
    value === "current-root" ||
    value === "registered-stale" ||
    value === "downstream-consumed" ||
    value === "downstream-released" ||
    value === "unregistered"
  );
}

function isSwapResultingRootRegistrationStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["swapResultingRootRegistrationStatus"] {
  return value === "unavailable" || value === "linked-output" || value === "mismatch";
}

export async function requestVantaPrivateCoreOperatorProof(args: {
  witnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0;
}): Promise<VantaPrivateCoreProofOperatorResponse> {
  const response = await fetch(getPrivateCoreProofOperatorUrl(), {
    body: JSON.stringify({
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core proof operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreProofOperatorResponse>;

  if (!parsed.verified) {
    throw new Error("The private-core proof operator did not verify the proof successfully.");
  }

  if (
    typeof parsed.proofFieldCount !== "number" ||
    typeof parsed.publicInputCount !== "number" ||
    typeof parsed.proofByteLength !== "number" ||
    typeof parsed.provingHashLane !== "string"
  ) {
    throw new Error("The private-core proof operator returned an invalid proof summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    circuit: parsed.circuit ?? "vanta_private_core_single_note_unshield",
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane,
    proofByteLength: parsed.proofByteLength,
    proofFieldCount: parsed.proofFieldCount,
    publicInputCount: parsed.publicInputCount,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    verified: true,
  };
}

export async function requestVantaPrivateCoreOperatorSendProof(args: {
  witnessPackage: VantaPrivateCoreNoirSendWitnessPackageV0;
}): Promise<VantaPrivateCoreProofOperatorResponse> {
  const response = await fetch(getPrivateCoreSendProofOperatorUrl(), {
    body: JSON.stringify({
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core send proof operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreProofOperatorResponse>;

  if (!parsed.verified) {
    throw new Error("The private-core send proof operator did not verify the proof successfully.");
  }

  if (
    typeof parsed.proofFieldCount !== "number" ||
    typeof parsed.publicInputCount !== "number" ||
    typeof parsed.proofByteLength !== "number" ||
    typeof parsed.provingHashLane !== "string"
  ) {
    throw new Error("The private-core send proof operator returned an invalid proof summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    circuit: parsed.circuit ?? "vanta_private_core_single_note_send",
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane,
    proofByteLength: parsed.proofByteLength,
    proofFieldCount: parsed.proofFieldCount,
    publicInputCount: parsed.publicInputCount,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    verified: true,
  };
}

export async function requestVantaPrivateCoreOperatorSwapProof(args: {
  witnessPackage: VantaPrivateCoreNoirSwapWitnessPackageV0;
}): Promise<VantaPrivateCoreProofOperatorResponse> {
  const response = await fetch(getPrivateCoreSwapProofOperatorUrl(), {
    body: JSON.stringify({
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core swap proof operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreProofOperatorResponse>;

  if (!parsed.verified) {
    throw new Error("The private-core swap proof operator did not verify the proof successfully.");
  }

  if (
    typeof parsed.proofFieldCount !== "number" ||
    typeof parsed.publicInputCount !== "number" ||
    typeof parsed.proofByteLength !== "number" ||
    typeof parsed.provingHashLane !== "string"
  ) {
    throw new Error("The private-core swap proof operator returned an invalid proof summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    circuit: parsed.circuit ?? "vanta_private_core_single_note_swap",
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane,
    proofByteLength: parsed.proofByteLength,
    proofFieldCount: parsed.proofFieldCount,
    publicInputCount: parsed.publicInputCount,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    verified: true,
  };
}

export async function requestVantaPrivateCoreOperatorSwapTransition(args: {
  executionQuoteReference?: string | null;
  executionVenueLabel?: string | null;
  witnessPackage: VantaPrivateCoreNoirSwapWitnessPackageV0;
  resultingRoot: string;
}): Promise<VantaPrivateCoreSwapOperatorResponse> {
  const response = await fetch(getPrivateCoreSwapTransitionOperatorUrl(), {
    body: JSON.stringify({
      executionQuoteReference: args.executionQuoteReference ?? null,
      executionVenueLabel: args.executionVenueLabel ?? null,
      resultingRoot: args.resultingRoot,
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core swap operator rejected the transition request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreSwapOperatorResponse>;

  if (
    !parsed.verified ||
    parsed.swapRecorded !== true ||
    typeof parsed.completedAt !== "number" ||
    typeof parsed.inputNullifier !== "string" ||
    typeof parsed.inputRoot !== "string" ||
    typeof parsed.inputAssetId !== "string" ||
    typeof parsed.inputAmount !== "string" ||
    typeof parsed.outputAssetId !== "string" ||
    typeof parsed.outputAmount !== "string" ||
    typeof parsed.outputCommitment !== "string" ||
    typeof parsed.proofId !== "string" ||
    parsed.resultingRootBasis !== "client-declared" ||
    typeof parsed.swapId !== "string"
  ) {
    throw new Error("The private-core swap operator returned an invalid transition summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    circuit: parsed.circuit ?? "vanta_private_core_single_note_swap",
    completedAt: parsed.completedAt,
    executionQuoteReference:
      typeof parsed.executionQuoteReference === "string" ? parsed.executionQuoteReference : null,
    executionVenueLabel:
      typeof parsed.executionVenueLabel === "string" ? parsed.executionVenueLabel : null,
    inputNullifier: parsed.inputNullifier,
    inputRoot: parsed.inputRoot,
    inputAssetId: parsed.inputAssetId,
    inputAmount: parsed.inputAmount,
    outputAssetId: parsed.outputAssetId,
    outputAmount: parsed.outputAmount,
    outputCommitment: parsed.outputCommitment,
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane ?? "poseidon-bn254-proving-lane-v0",
    proofByteLength: parsed.proofByteLength ?? 0,
    proofFieldCount: parsed.proofFieldCount ?? 0,
    proofId: parsed.proofId,
    publicInputCount: parsed.publicInputCount ?? 0,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    resultingRootBasis: "client-declared",
    resultingRoot: typeof parsed.resultingRoot === "string" ? parsed.resultingRoot : null,
    swapId: parsed.swapId,
    swapRecorded: true,
    verified: true,
  };
}

export async function requestVantaPrivateCoreOperatorSendTransition(args: {
  releaseCandidateId?: string | null;
  witnessPackage: VantaPrivateCoreNoirSendWitnessPackageV0;
  resultingRoot: string;
}): Promise<VantaPrivateCoreSendOperatorResponse> {
  const response = await fetch(getPrivateCoreSendTransitionOperatorUrl(), {
    body: JSON.stringify({
      releaseCandidateId: args.releaseCandidateId ?? null,
      resultingRoot: args.resultingRoot,
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core send operator rejected the transition request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreSendOperatorResponse>;

  if (
    !parsed.verified ||
    parsed.sendRecorded !== true ||
    typeof parsed.completedAt !== "number" ||
    typeof parsed.inputNullifier !== "string" ||
    typeof parsed.inputRoot !== "string" ||
    typeof parsed.proofId !== "string" ||
    (parsed.releaseCandidateId !== null &&
      parsed.releaseCandidateId !== undefined &&
      typeof parsed.releaseCandidateId !== "string") ||
    typeof parsed.recipientCommitment !== "string" ||
    parsed.resultingRootBasis !== "client-declared" ||
    typeof parsed.sendAmount !== "string" ||
    typeof parsed.sendId !== "string"
  ) {
    throw new Error("The private-core send operator returned an invalid transition summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    changeAmount: parsed.changeAmount ?? "0",
    changeCommitment: parsed.changeCommitment ?? null,
    circuit: parsed.circuit ?? "vanta_private_core_single_note_send",
    completedAt: parsed.completedAt,
    inputNullifier: parsed.inputNullifier,
    inputRoot: parsed.inputRoot,
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane ?? "poseidon-bn254-proving-lane-v0",
    proofByteLength: parsed.proofByteLength ?? 0,
    proofFieldCount: parsed.proofFieldCount ?? 0,
    proofId: parsed.proofId,
    releaseCandidateId:
      typeof parsed.releaseCandidateId === "string" ? parsed.releaseCandidateId : null,
    publicInputCount: parsed.publicInputCount ?? 0,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    recipientCommitment: parsed.recipientCommitment,
    resultingRootBasis: parsed.resultingRootBasis === "client-declared" ? "client-declared" : "client-declared",
    resultingRoot: typeof parsed.resultingRoot === "string" ? parsed.resultingRoot : null,
    sendAmount: parsed.sendAmount,
    sendId: parsed.sendId,
    sendRecorded: true,
    verified: true,
  };
}

export async function requestVantaPrivateCoreOperatorConsume(args: {
  releaseCandidateId?: string | null;
  sourceArtifacts: VantaPrivateCoreOperatorSourceArtifactBundleV0;
  witnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0;
}): Promise<VantaPrivateCoreConsumeOperatorResponse> {
  const response = await fetch(getPrivateCoreConsumeOperatorUrl(), {
    body: JSON.stringify({
      releaseCandidateId: args.releaseCandidateId ?? null,
      sourceArtifacts: args.sourceArtifacts,
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core consume operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreConsumeOperatorResponse>;

  if (
    !parsed.verified ||
    typeof parsed.completedAt !== "number" ||
    (parsed.leafIndex !== null && typeof parsed.leafIndex !== "string") ||
    parsed.authorizationBasis !== "proof-backed-consume" ||
    typeof parsed.releaseDestination !== "string" ||
    typeof parsed.proofId !== "string" ||
    (parsed.releaseCandidateId !== null &&
      parsed.releaseCandidateId !== undefined &&
      typeof parsed.releaseCandidateId !== "string") ||
    parsed.releaseRecorded !== true ||
    typeof parsed.releaseRequestId !== "string" ||
    parsed.rootPolicy !== "latest-registered-root" ||
    typeof parsed.releaseTransitionNoteId !== "string" ||
    typeof parsed.releasedAssetId !== "string" ||
    typeof parsed.releasedAmount !== "string" ||
    typeof parsed.root !== "string" ||
    typeof parsed.nullifier !== "string"
  ) {
    throw new Error("The private-core consume operator returned an invalid consume summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    circuit: parsed.circuit ?? "vanta_private_core_single_note_unshield",
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane ?? "poseidon-bn254-proving-lane-v0",
    proofByteLength: parsed.proofByteLength ?? 0,
    proofFieldCount: parsed.proofFieldCount ?? 0,
    publicInputCount: parsed.publicInputCount ?? 0,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    verified: true,
    authorizationBasis: "proof-backed-consume",
    completedAt: parsed.completedAt,
    leafIndex: parsed.leafIndex ?? null,
    proofId: parsed.proofId,
    releaseCandidateId:
      typeof parsed.releaseCandidateId === "string" ? parsed.releaseCandidateId : null,
    releaseDestination: parsed.releaseDestination,
    releaseRecorded: true,
    releaseRequestId: parsed.releaseRequestId,
    rootPolicy: "latest-registered-root",
    releaseTransitionNoteId: parsed.releaseTransitionNoteId,
    releasedAssetId: parsed.releasedAssetId,
    releasedAmount: parsed.releasedAmount,
    root: parsed.root,
    nullifier: parsed.nullifier,
  };
}

export async function registerVantaPrivateCoreOperatorRoot(args: {
  sourceArtifacts: VantaPrivateCoreOperatorSourceArtifactBundleV0;
  witnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0;
}): Promise<VantaPrivateCoreOperatorRootRegistrationResponse> {
  const response = await fetch(getPrivateCoreRootRegistrationUrl(), {
    body: JSON.stringify({
      sourceArtifacts: args.sourceArtifacts,
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core root operator rejected the registration request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreOperatorRootRegistrationResponse>;

  if (parsed.known !== true || typeof parsed.root !== "string") {
    throw new Error("The private-core root operator returned an invalid root registration summary.");
  }

  return {
    known: true,
    root: parsed.root,
  };
}

function getPrivateCoreProofOperatorUrl() {
  return new URL("/private-core/unshield-proof", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSendProofOperatorUrl() {
  return new URL("/private-core/send-proof", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSwapProofOperatorUrl() {
  return new URL("/private-core/swap-proof", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSwapTransitionOperatorUrl() {
  return new URL("/private-core/swap-transition", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSendTransitionOperatorUrl() {
  return new URL("/private-core/send-transition", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreConsumeOperatorUrl() {
  return new URL("/private-core/unshield-consume", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreRootRegistrationUrl() {
  return new URL("/private-core/register-root", liveShieldAsset.unshieldOperatorUrl).toString();
}

export async function fetchVantaPrivateCoreOperatorConsumes(): Promise<
  VantaPrivateCoreOperatorConsumeStateResponse
> {
  const response = await fetch(getPrivateCoreConsumeStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core consume operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestConsume?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestConsume !== null &&
      parsed.latestConsume !== undefined &&
      !isConsumeRecord(parsed.latestConsume)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core consume operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestConsume: isConsumeRecord(parsed.latestConsume) ? parsed.latestConsume : null,
    records: parsed.records.filter(isConsumeRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorProofs(): Promise<
  VantaPrivateCoreOperatorProofStateResponse
> {
  const response = await fetch(getPrivateCoreProofStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core proof operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestProof?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestProof !== null &&
      parsed.latestProof !== undefined &&
      !isProofRecord(parsed.latestProof)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core proof operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestProof: isProofRecord(parsed.latestProof) ? parsed.latestProof : null,
    records: parsed.records.filter(isProofRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorSendProofs(): Promise<
  VantaPrivateCoreOperatorSendProofStateResponse
> {
  const response = await fetch(getPrivateCoreSendProofStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core send proof operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestProof?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestProof !== null &&
      parsed.latestProof !== undefined &&
      !isSendProofRecord(parsed.latestProof)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core send proof operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestProof: isSendProofRecord(parsed.latestProof) ? parsed.latestProof : null,
    records: parsed.records.filter(isSendProofRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorSwapProofs(): Promise<
  VantaPrivateCoreOperatorSwapProofStateResponse
> {
  const response = await fetch(getPrivateCoreSwapProofStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core swap proof operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestProof?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestProof !== null &&
      parsed.latestProof !== undefined &&
      !isSwapProofRecord(parsed.latestProof)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core swap proof operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestProof: isSwapProofRecord(parsed.latestProof) ? parsed.latestProof : null,
    records: parsed.records.filter(isSwapProofRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorSwaps(): Promise<
  VantaPrivateCoreOperatorSwapStateResponse
> {
  const response = await fetch(getPrivateCoreSwapStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core swap operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestSwap?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestSwap !== null &&
      parsed.latestSwap !== undefined &&
      !isSwapRecord(parsed.latestSwap)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core swap operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestSwap: isSwapRecord(parsed.latestSwap) ? parsed.latestSwap : null,
    records: parsed.records.filter(isSwapRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorSends(): Promise<
  VantaPrivateCoreOperatorSendStateResponse
> {
  const response = await fetch(getPrivateCoreSendStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core send operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestSend?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestSend !== null &&
      parsed.latestSend !== undefined &&
      !isSendRecord(parsed.latestSend)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core send operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestSend: isSendRecord(parsed.latestSend) ? parsed.latestSend : null,
    records: parsed.records.filter(isSendRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorRoots(): Promise<VantaPrivateCoreOperatorRootStateResponse> {
  const response = await fetch(getPrivateCoreRootStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core root operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    currentRecord?: unknown;
    currentRoot?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.currentRecord !== null &&
      parsed.currentRecord !== undefined &&
      !isRootRecord(parsed.currentRecord)) ||
    (parsed.currentRoot !== null &&
      parsed.currentRoot !== undefined &&
      typeof parsed.currentRoot !== "string") ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core root operator state endpoint returned invalid data.");
  }

  return {
    currentRecord: isRootRecord(parsed.currentRecord) ? parsed.currentRecord : null,
    stateVersion: 1,
    currentRoot: typeof parsed.currentRoot === "string" ? parsed.currentRoot : null,
    records: parsed.records.filter(isRootRecord),
  };
}

function getPrivateCoreConsumeStateUrl() {
  return new URL("/state/private-core-consumes", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreProofStateUrl() {
  return new URL("/state/private-core-proofs", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSendProofStateUrl() {
  return new URL("/state/private-core-send-proofs", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSwapProofStateUrl() {
  return new URL("/state/private-core-swap-proofs", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSwapStateUrl() {
  return new URL("/state/private-core-swaps", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSendStateUrl() {
  return new URL("/state/private-core-sends", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreReleaseStateUrl() {
  return new URL("/state/private-core-releases", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreRootStateUrl() {
  return new URL("/state/private-core-roots", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSummaryStateUrl() {
  return new URL("/state/private-core-summary", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreShippingDecisionUrl() {
  return new URL("/state/private-core-shipping-decision", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreStatusStateUrl() {
  return new URL("/state/private-core-status", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreContractStateUrl() {
  return new URL("/state/private-core-contract", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSnapshotStateUrl() {
  return new URL("/state/private-core-snapshot", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreShippingArtifactUrl() {
  return new URL("/state/private-core-shipping-artifact", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreReleaseCandidateUrl() {
  return new URL("/state/private-core-release-candidate", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreReleaseCandidateCheckUrl() {
  return new URL(
    "/state/private-core-release-candidate-check",
    liveShieldAsset.unshieldOperatorUrl,
  ).toString();
}

export async function fetchVantaPrivateCoreOperatorReleases(): Promise<
  VantaPrivateCoreOperatorReleaseStateResponse
> {
  const response = await fetch(getPrivateCoreReleaseStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core release operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestRelease?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestRelease !== null &&
      parsed.latestRelease !== undefined &&
      !isReleaseRecord(parsed.latestRelease)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core release operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestRelease: isReleaseRecord(parsed.latestRelease) ? parsed.latestRelease : null,
    records: parsed.records.filter(isReleaseRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorSummary(): Promise<
  VantaPrivateCoreOperatorSummaryStateResponse
> {
  const response = await fetch(getPrivateCoreSummaryStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core operator summary endpoint failed.");
  }

  const parsed = (await response.json()) as {
    stateVersion?: unknown;
    contractVersion?: unknown;
    summaryVersion?: unknown;
    contractMirrorStatus?: unknown;
    contractMirrorNote?: unknown;
    requiredLanesStatus?: unknown;
    requiredLanesNote?: unknown;
    zkV1ShippingStatus?: unknown;
    zkV1ShippingNote?: unknown;
    releaseBoundaryStatus?: unknown;
    releaseBoundaryNote?: unknown;
    zkV1FinishLineStatus?: unknown;
    zkV1FinishLineNote?: unknown;
    boundaryStatus?: unknown;
    boundaryNote?: unknown;
    sendBoundaryStatus?: unknown;
    sendBoundaryNote?: unknown;
    swapBoundaryStatus?: unknown;
    swapBoundaryNote?: unknown;
    currentRootLinkedProof?: unknown;
    currentRootProofLinkStatus?: unknown;
    sendResultingRootLinkedProof?: unknown;
    sendResultingRootRecord?: unknown;
    sendResultingRootStatus?: unknown;
    sendResultingRootNote?: unknown;
    sendResultingRootRegistrationStatus?: unknown;
    sendResultingRootRegistrationNote?: unknown;
    sendResultingRootProofLinkStatus?: unknown;
    sendContinuityStatus?: unknown;
    sendContinuityNote?: unknown;
    swapResultingRootLinkedProof?: unknown;
    swapResultingRootRecord?: unknown;
    swapResultingRootStatus?: unknown;
    swapResultingRootNote?: unknown;
    swapResultingRootRegistrationStatus?: unknown;
    swapResultingRootRegistrationNote?: unknown;
    swapResultingRootProofLinkStatus?: unknown;
    swapContinuityStatus?: unknown;
    swapContinuityNote?: unknown;
    supportedSendLaneKind?: unknown;
    supportedSendLaneNote?: unknown;
    supportedSendLaneStatus?: unknown;
    supportedSendLaneVersion?: unknown;
    supportedSendV1Decision?: unknown;
    supportedSendV1DecisionNote?: unknown;
    supportedUnshieldLaneKind?: unknown;
    supportedUnshieldLaneNote?: unknown;
    supportedUnshieldLaneStatus?: unknown;
    supportedUnshieldLaneVersion?: unknown;
    supportedUnshieldV1Decision?: unknown;
    supportedUnshieldV1DecisionNote?: unknown;
    supportedReleaseLaneKind?: unknown;
    supportedReleaseLaneNote?: unknown;
    supportedReleaseV1Decision?: unknown;
    supportedReleaseV1DecisionNote?: unknown;
    supportedReleaseLaneStatus?: unknown;
    supportedReleaseLaneVersion?: unknown;
    supportedSwapLaneVersion?: unknown;
    supportedSwapLaneKind?: unknown;
    supportedSwapLaneStatus?: unknown;
    supportedSwapLaneNote?: unknown;
    supportedSwapV1Decision?: unknown;
    supportedSwapV1DecisionNote?: unknown;
    supportedSwapV1Role?: unknown;
    supportedSwapV1RoleNote?: unknown;
    supportedSwapVenue?: unknown;
    supportedSwapOutputModel?: unknown;
    supportedFlowKind?: unknown;
    supportedFlowNote?: unknown;
    supportedFlowStatus?: unknown;
    supportedFlowVersion?: unknown;
    supportedShippingDecisionVersion?: unknown;
    supportedShippingDecisionKind?: unknown;
    supportedShippingDecisionGateNote?: unknown;
    supportedShippingDecisionGateVersion?: unknown;
    supportedShippingDecisionGateKind?: unknown;
    supportedShippingDecisionGateTransport?: unknown;
    supportedShippingDecisionGateEndpoint?: unknown;
    supportedShippingDecisionTransport?: unknown;
    supportedShippingDecisionEndpoint?: unknown;
    supportedShippingDecisionNote?: unknown;
    supportedOperatorStatusVersion?: unknown;
    supportedOperatorStatusKind?: unknown;
    supportedOperatorStatusNote?: unknown;
    supportedOperatorStatusGateVersion?: unknown;
    supportedOperatorStatusGateKind?: unknown;
    supportedOperatorStatusGateNote?: unknown;
    supportedOperatorStatusGateTransport?: unknown;
    supportedOperatorStatusGateEndpoint?: unknown;
    supportedOperatorStatusTransport?: unknown;
    supportedOperatorStatusEndpoint?: unknown;
    supportedOperatorSnapshotVersion?: unknown;
    supportedOperatorSnapshotKind?: unknown;
    supportedOperatorSnapshotNote?: unknown;
    supportedOperatorSnapshotGateVersion?: unknown;
    supportedOperatorSnapshotGateKind?: unknown;
    supportedOperatorSnapshotGateNote?: unknown;
    supportedOperatorSnapshotGateTransport?: unknown;
    supportedOperatorSnapshotGateEndpoint?: unknown;
    supportedOperatorSnapshotTransport?: unknown;
    supportedOperatorSnapshotEndpoint?: unknown;
    supportedShippingArtifactVersion?: unknown;
    supportedShippingArtifactKind?: unknown;
    supportedShippingArtifactNote?: unknown;
    supportedShippingArtifactGateVersion?: unknown;
    supportedShippingArtifactGateKind?: unknown;
    supportedShippingArtifactGateNote?: unknown;
    supportedShippingArtifactGateTransport?: unknown;
    supportedShippingArtifactGateEndpoint?: unknown;
    supportedShippingArtifactTransport?: unknown;
    supportedShippingArtifactEndpoint?: unknown;
    supportedReleaseCandidateVersion?: unknown;
    supportedReleaseCandidateKind?: unknown;
    supportedReleaseCandidateNote?: unknown;
    supportedReleaseCandidateScope?: unknown;
    supportedReleaseCandidateScopeNote?: unknown;
    supportedReleaseCandidateGateVersion?: unknown;
    supportedReleaseCandidateGateKind?: unknown;
    supportedReleaseCandidateGateNote?: unknown;
    supportedReleaseCandidateGateTransport?: unknown;
    supportedReleaseCandidateGateEndpoint?: unknown;
    supportedReleaseCandidateTransport?: unknown;
    supportedReleaseCandidateEndpoint?: unknown;
    supportedZkV1ScopeDecision?: unknown;
    supportedZkV1ScopeNote?: unknown;
    supportedZkV1RequiredLanes?: unknown;
    supportedZkV1RequiredLanesNote?: unknown;
    supportedAssetSymbol?: unknown;
    supportedEnvironment?: unknown;
    supportedNoteSchema?: unknown;
    supportedNoteVersion?: unknown;
    supportedRootRegistrationProvenance?: unknown;
    supportedSendResultingRootBasis?: unknown;
    supportedSendInputRootPolicy?: unknown;
    supportedSendOutputRegistrationPolicy?: unknown;
    supportedSwapResultingRootBasis?: unknown;
    supportedSwapInputRootPolicy?: unknown;
    supportedSwapOutputRegistrationPolicy?: unknown;
    supportedRecipientModel?: unknown;
    supportedReleaseDestinationModel?: unknown;
    supportedProofSystem?: unknown;
    supportedUnshieldCircuit?: unknown;
    supportedSendCircuit?: unknown;
    supportedUnshieldMerkleDepth?: unknown;
    supportedSendMerkleDepth?: unknown;
    supportedReleaseAuthorizationBasis?: unknown;
    supportedReleaseRootPolicy?: unknown;
    supportedReleaseExecutionModel?: unknown;
    supportedReleaseAtomicityModel?: unknown;
    supportedReleasePersistenceModel?: unknown;
    ownerAuthorizationMode?: unknown;
    ownerAuthorizationDecision?: unknown;
    ownerAuthorizationDecisionNote?: unknown;
    sourceArtifactTruthBasis?: unknown;
    provingArtifactTruthBasis?: unknown;
    sourceProvingRelationship?: unknown;
    nullifierKeyMode?: unknown;
    nullifierKeyDecision?: unknown;
    nullifierKeyDecisionNote?: unknown;
    provingHashLane?: unknown;
    generatedAt?: unknown;
    currentRoot?: unknown;
    currentRecord?: unknown;
    rootRecords?: unknown;
    latestProof?: unknown;
    proofRecords?: unknown;
    latestSendProof?: unknown;
    sendProofRecords?: unknown;
    latestSwapProof?: unknown;
    swapProofRecords?: unknown;
    latestSendLinkedProof?: unknown;
    latestSwapLinkedProof?: unknown;
    latestSend?: unknown;
    sendRecords?: unknown;
    latestSwap?: unknown;
    swapRecords?: unknown;
    latestConsume?: unknown;
    consumeRecords?: unknown;
    latestConsumeProof?: unknown;
    latestRelease?: unknown;
    releaseRecords?: unknown;
    latestReleaseProof?: unknown;
    rootRecordCount?: unknown;
    proofRecordCount?: unknown;
    sendProofRecordCount?: unknown;
    swapProofRecordCount?: unknown;
    sendRecordCount?: unknown;
    swapRecordCount?: unknown;
    consumeRecordCount?: unknown;
    releaseRecordCount?: unknown;
    proofSendLinkStatus?: unknown;
    proofSwapLinkStatus?: unknown;
    proofConsumeLinkStatus?: unknown;
    proofReleaseLinkStatus?: unknown;
  };

  if (
    parsed.stateVersion !== 1 ||
    parsed.contractVersion !== 21 ||
    parsed.summaryVersion !== 45 ||
    !isContractMirrorStatus(parsed.contractMirrorStatus) ||
    typeof parsed.contractMirrorNote !== "string" ||
    !isRequiredLanesStatus(parsed.requiredLanesStatus) ||
    typeof parsed.requiredLanesNote !== "string" ||
    !isZkV1ShippingStatus(parsed.zkV1ShippingStatus) ||
    typeof parsed.zkV1ShippingNote !== "string" ||
    !isReleaseBoundaryStatus(parsed.releaseBoundaryStatus) ||
    typeof parsed.releaseBoundaryNote !== "string" ||
    !isZkV1FinishLineStatus(parsed.zkV1FinishLineStatus) ||
    typeof parsed.zkV1FinishLineNote !== "string" ||
    !isBoundaryStatus(parsed.boundaryStatus) ||
    typeof parsed.boundaryNote !== "string" ||
    !isSendBoundaryStatus(parsed.sendBoundaryStatus) ||
    typeof parsed.sendBoundaryNote !== "string" ||
    !isSwapBoundaryStatus(parsed.swapBoundaryStatus) ||
    typeof parsed.swapBoundaryNote !== "string" ||
    (parsed.currentRootLinkedProof !== null &&
      parsed.currentRootLinkedProof !== undefined &&
      !isProofRecord(parsed.currentRootLinkedProof)) ||
    !isLinkStatus(parsed.currentRootProofLinkStatus) ||
    (parsed.sendResultingRootLinkedProof !== null &&
      parsed.sendResultingRootLinkedProof !== undefined &&
      !isProofRecord(parsed.sendResultingRootLinkedProof)) ||
    (parsed.sendResultingRootRecord !== null &&
      parsed.sendResultingRootRecord !== undefined &&
      !isRootRecord(parsed.sendResultingRootRecord)) ||
    !isSendResultingRootStatus(parsed.sendResultingRootStatus) ||
    typeof parsed.sendResultingRootNote !== "string" ||
    !isSendResultingRootRegistrationStatus(parsed.sendResultingRootRegistrationStatus) ||
    typeof parsed.sendResultingRootRegistrationNote !== "string" ||
    !isLinkStatus(parsed.sendResultingRootProofLinkStatus) ||
    !isSendContinuityStatus(parsed.sendContinuityStatus) ||
    typeof parsed.sendContinuityNote !== "string" ||
    (parsed.swapResultingRootLinkedProof !== null &&
      parsed.swapResultingRootLinkedProof !== undefined &&
      !isProofRecord(parsed.swapResultingRootLinkedProof)) ||
    (parsed.swapResultingRootRecord !== null &&
      parsed.swapResultingRootRecord !== undefined &&
      !isRootRecord(parsed.swapResultingRootRecord)) ||
    !isSwapResultingRootStatus(parsed.swapResultingRootStatus) ||
    typeof parsed.swapResultingRootNote !== "string" ||
    !isSwapResultingRootRegistrationStatus(parsed.swapResultingRootRegistrationStatus) ||
    typeof parsed.swapResultingRootRegistrationNote !== "string" ||
    !isLinkStatus(parsed.swapResultingRootProofLinkStatus) ||
    !isSwapContinuityStatus(parsed.swapContinuityStatus) ||
    typeof parsed.swapContinuityNote !== "string" ||
    parsed.supportedSendLaneVersion !== 1 ||
    parsed.supportedSendLaneKind !== "single-input-single-recipient-optional-change" ||
    parsed.supportedSendLaneStatus !== "supported" ||
    typeof parsed.supportedSendLaneNote !== "string" ||
    parsed.supportedSendV1Decision !== "accepted-narrow-v1-path" ||
    typeof parsed.supportedSendV1DecisionNote !== "string" ||
    parsed.supportedUnshieldLaneVersion !== 1 ||
    parsed.supportedUnshieldLaneKind !== "single-note-proof-backed-consume" ||
    parsed.supportedUnshieldLaneStatus !== "supported" ||
    typeof parsed.supportedUnshieldLaneNote !== "string" ||
    parsed.supportedUnshieldV1Decision !== "accepted-narrow-v1-path" ||
    typeof parsed.supportedUnshieldV1DecisionNote !== "string" ||
    parsed.supportedReleaseLaneVersion !== 1 ||
    parsed.supportedReleaseLaneKind !== "proof-backed-consume-latest-registered-root" ||
    parsed.supportedReleaseLaneStatus !== "supported" ||
    typeof parsed.supportedReleaseLaneNote !== "string" ||
    parsed.supportedReleaseV1Decision !== "accepted-narrow-v1-path" ||
    typeof parsed.supportedReleaseV1DecisionNote !== "string" ||
    parsed.supportedSwapLaneVersion !== 1 ||
    parsed.supportedSwapLaneKind !== "single-input-vusd-to-shielded-sol" ||
    parsed.supportedSwapLaneStatus !== "supported" ||
    typeof parsed.supportedSwapLaneNote !== "string" ||
    parsed.supportedSwapV1Decision !== "accepted-narrow-v1-path" ||
    typeof parsed.supportedSwapV1DecisionNote !== "string" ||
    parsed.supportedSwapV1Role !== "adjacent-supported-not-required-for-finish-line" ||
    typeof parsed.supportedSwapV1RoleNote !== "string" ||
    parsed.supportedSwapVenue !== "meteora-dlmm-devnet" ||
    parsed.supportedSwapOutputModel !== "shielded-sol-output-note" ||
    parsed.supportedFlowVersion !== 1 ||
    parsed.supportedFlowKind !== "shield-hold-send-unshield-replay-guard" ||
    parsed.supportedFlowStatus !== "supported" ||
    typeof parsed.supportedFlowNote !== "string" ||
    parsed.supportedShippingDecisionVersion !== 1 ||
    parsed.supportedShippingDecisionKind !== "narrow-private-core-zk-v1-shipping" ||
    typeof parsed.supportedShippingDecisionGateNote !== "string" ||
    parsed.supportedShippingDecisionGateVersion !== 1 ||
    parsed.supportedShippingDecisionGateKind !==
      "ready-gated-narrow-private-core-zk-v1-shipping" ||
    parsed.supportedShippingDecisionGateTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingDecisionGateEndpoint !==
      "/state/private-core-shipping-decision-check" ||
    parsed.supportedShippingDecisionTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingDecisionEndpoint !== "/state/private-core-shipping-decision" ||
    typeof parsed.supportedShippingDecisionNote !== "string" ||
    parsed.supportedOperatorStatusVersion !== 1 ||
    parsed.supportedOperatorStatusKind !== "long-form-live-status" ||
    typeof parsed.supportedOperatorStatusNote !== "string" ||
    parsed.supportedOperatorStatusGateVersion !== 1 ||
    parsed.supportedOperatorStatusGateKind !== "ready-gated-long-form-live-status" ||
    typeof parsed.supportedOperatorStatusGateNote !== "string" ||
    parsed.supportedOperatorStatusGateTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorStatusGateEndpoint !== "/state/private-core-status-check" ||
    parsed.supportedOperatorStatusTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorStatusEndpoint !== "/state/private-core-status" ||
    parsed.supportedOperatorSnapshotVersion !== 1 ||
    parsed.supportedOperatorSnapshotKind !== "contract-status-shipping-bundle" ||
    typeof parsed.supportedOperatorSnapshotNote !== "string" ||
    parsed.supportedOperatorSnapshotGateVersion !== 1 ||
    parsed.supportedOperatorSnapshotGateKind !==
      "ready-gated-contract-status-shipping-bundle" ||
    typeof parsed.supportedOperatorSnapshotGateNote !== "string" ||
    parsed.supportedOperatorSnapshotGateTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorSnapshotGateEndpoint !== "/state/private-core-snapshot-check" ||
    parsed.supportedOperatorSnapshotTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorSnapshotEndpoint !== "/state/private-core-snapshot" ||
    parsed.supportedShippingArtifactVersion !== 1 ||
    parsed.supportedShippingArtifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    typeof parsed.supportedShippingArtifactNote !== "string" ||
    parsed.supportedShippingArtifactGateVersion !== 1 ||
    parsed.supportedShippingArtifactGateKind !==
      "ready-gated-shipping-decision-checked-snapshot-bundle" ||
    typeof parsed.supportedShippingArtifactGateNote !== "string" ||
    parsed.supportedShippingArtifactGateTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingArtifactGateEndpoint !==
      "/state/private-core-shipping-artifact-check" ||
    parsed.supportedShippingArtifactTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingArtifactEndpoint !== "/state/private-core-shipping-artifact" ||
    parsed.supportedReleaseCandidateVersion !== 1 ||
    parsed.supportedReleaseCandidateKind !== "exact-run-send-consume-release-candidate" ||
    typeof parsed.supportedReleaseCandidateNote !== "string" ||
    parsed.supportedReleaseCandidateScope !== "primary-send-unshield-only" ||
    typeof parsed.supportedReleaseCandidateScopeNote !== "string" ||
    parsed.supportedReleaseCandidateGateVersion !== 1 ||
    parsed.supportedReleaseCandidateGateKind !==
      "ready-gated-exact-run-send-consume-release-candidate" ||
    typeof parsed.supportedReleaseCandidateGateNote !== "string" ||
    parsed.supportedReleaseCandidateGateTransport !== "dedicated-endpoint" ||
    parsed.supportedReleaseCandidateGateEndpoint !==
      "/state/private-core-release-candidate-check" ||
    parsed.supportedReleaseCandidateTransport !== "dedicated-endpoint" ||
    parsed.supportedReleaseCandidateEndpoint !== "/state/private-core-release-candidate" ||
    parsed.supportedZkV1ScopeDecision !== "accepted-narrow-private-core-v1-scope" ||
    typeof parsed.supportedZkV1ScopeNote !== "string" ||
    parsed.supportedZkV1RequiredLanes !== "send|unshield|release" ||
    typeof parsed.supportedZkV1RequiredLanesNote !== "string" ||
    parsed.supportedAssetSymbol !== "VUSD" ||
    parsed.supportedEnvironment !== "solana-devnet" ||
    parsed.supportedNoteSchema !== "note-v0" ||
    parsed.supportedNoteVersion !== 0 ||
    parsed.supportedRootRegistrationProvenance !==
      "shield-input|send-recipient-output|send-change-output|swap-output" ||
    parsed.supportedSendResultingRootBasis !== "client-declared" ||
    parsed.supportedSendInputRootPolicy !==
      "latest-registered-root-with-linked-registration-proof" ||
    parsed.supportedSendOutputRegistrationPolicy !==
      "resulting-root-must-register-as-recipient-or-change-output" ||
    parsed.supportedSwapResultingRootBasis !== "client-declared" ||
    parsed.supportedSwapInputRootPolicy !==
      "latest-registered-root-with-linked-registration-proof" ||
    parsed.supportedSwapOutputRegistrationPolicy !==
      "resulting-root-must-register-as-swap-output" ||
    parsed.supportedRecipientModel !== "hashed-reference-to-owner-key" ||
    parsed.supportedReleaseDestinationModel !== "32-byte-release-destination-field" ||
    parsed.supportedProofSystem !== "noir-acir-ultrahonk-bbjs" ||
    parsed.supportedUnshieldCircuit !== "vanta_private_core_single_note_unshield" ||
    parsed.supportedSendCircuit !== "vanta_private_core_single_note_send" ||
    parsed.supportedUnshieldMerkleDepth !== 3 ||
    parsed.supportedSendMerkleDepth !== 3 ||
    parsed.supportedReleaseAuthorizationBasis !== "proof-backed-consume" ||
    parsed.supportedReleaseRootPolicy !== "latest-registered-root" ||
    parsed.supportedReleaseExecutionModel !== "operator-recorded-devnet-release" ||
    parsed.supportedReleaseAtomicityModel !== "operator-local-atomic-consume-and-release-record" ||
    parsed.supportedReleasePersistenceModel !== "json-store-v1" ||
    parsed.ownerAuthorizationMode !== "x25519-secret-prechecked-off-circuit" ||
    parsed.ownerAuthorizationDecision !== "accepted-v1-off-circuit-precheck" ||
    typeof parsed.ownerAuthorizationDecisionNote !== "string" ||
    parsed.sourceArtifactTruthBasis !== "source-layer-artifact-bundle" ||
    parsed.provingArtifactTruthBasis !== "verified-proving-public-input-vector" ||
    parsed.sourceProvingRelationship !== "explicit-split-no-implicit-equality" ||
    parsed.nullifierKeyMode !== "note-secret-as-nullifier-key-v0" ||
    parsed.nullifierKeyDecision !== "accepted-v1-temporary-note-secret-key" ||
    typeof parsed.nullifierKeyDecisionNote !== "string" ||
    parsed.provingHashLane !== "poseidon-bn254-proving-lane-v0" ||
    typeof parsed.generatedAt !== "number" ||
    (parsed.currentRoot !== null &&
      parsed.currentRoot !== undefined &&
      typeof parsed.currentRoot !== "string") ||
    (parsed.currentRecord !== null &&
      parsed.currentRecord !== undefined &&
      !isRootRecord(parsed.currentRecord)) ||
    !Array.isArray(parsed.rootRecords) ||
    (parsed.latestProof !== null &&
      parsed.latestProof !== undefined &&
      !isProofRecord(parsed.latestProof)) ||
    !Array.isArray(parsed.proofRecords) ||
    (parsed.latestSendProof !== null &&
      parsed.latestSendProof !== undefined &&
      !isSendProofRecord(parsed.latestSendProof)) ||
    !Array.isArray(parsed.sendProofRecords) ||
    (parsed.latestSwapProof !== null &&
      parsed.latestSwapProof !== undefined &&
      !isSwapProofRecord(parsed.latestSwapProof)) ||
    !Array.isArray(parsed.swapProofRecords) ||
    (parsed.latestSendLinkedProof !== null &&
      parsed.latestSendLinkedProof !== undefined &&
      !isSendProofRecord(parsed.latestSendLinkedProof)) ||
    (parsed.latestSwapLinkedProof !== null &&
      parsed.latestSwapLinkedProof !== undefined &&
      !isSwapProofRecord(parsed.latestSwapLinkedProof)) ||
    (parsed.latestSend !== null &&
      parsed.latestSend !== undefined &&
      !isSendRecord(parsed.latestSend)) ||
    !Array.isArray(parsed.sendRecords) ||
    (parsed.latestSwap !== null &&
      parsed.latestSwap !== undefined &&
      !isSwapRecord(parsed.latestSwap)) ||
    !Array.isArray(parsed.swapRecords) ||
    (parsed.latestConsume !== null &&
      parsed.latestConsume !== undefined &&
      !isConsumeRecord(parsed.latestConsume)) ||
    !Array.isArray(parsed.consumeRecords) ||
    (parsed.latestConsumeProof !== null &&
      parsed.latestConsumeProof !== undefined &&
      !isProofRecord(parsed.latestConsumeProof)) ||
    (parsed.latestRelease !== null &&
      parsed.latestRelease !== undefined &&
      !isReleaseRecord(parsed.latestRelease)) ||
    !Array.isArray(parsed.releaseRecords) ||
    (parsed.latestReleaseProof !== null &&
      parsed.latestReleaseProof !== undefined &&
      !isProofRecord(parsed.latestReleaseProof)) ||
    typeof parsed.rootRecordCount !== "number" ||
    typeof parsed.proofRecordCount !== "number" ||
    typeof parsed.sendProofRecordCount !== "number" ||
    typeof parsed.swapProofRecordCount !== "number" ||
    typeof parsed.sendRecordCount !== "number" ||
    typeof parsed.swapRecordCount !== "number" ||
    typeof parsed.consumeRecordCount !== "number" ||
    typeof parsed.releaseRecordCount !== "number" ||
    !isLinkStatus(parsed.proofSendLinkStatus) ||
    !isLinkStatus(parsed.proofSwapLinkStatus) ||
    !isLinkStatus(parsed.proofConsumeLinkStatus) ||
    !isLinkStatus(parsed.proofReleaseLinkStatus)
  ) {
    throw new Error("The private-core operator summary endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    contractVersion: 21,
    summaryVersion: 45,
    contractMirrorStatus: parsed.contractMirrorStatus,
    contractMirrorNote: parsed.contractMirrorNote,
    requiredLanesStatus: parsed.requiredLanesStatus,
    requiredLanesNote: parsed.requiredLanesNote,
    zkV1ShippingStatus: parsed.zkV1ShippingStatus,
    zkV1ShippingNote: parsed.zkV1ShippingNote,
    releaseBoundaryStatus: parsed.releaseBoundaryStatus,
    releaseBoundaryNote: parsed.releaseBoundaryNote,
    zkV1FinishLineStatus: parsed.zkV1FinishLineStatus,
    zkV1FinishLineNote: parsed.zkV1FinishLineNote,
    boundaryStatus: parsed.boundaryStatus,
    boundaryNote: parsed.boundaryNote,
    sendBoundaryStatus: parsed.sendBoundaryStatus,
    sendBoundaryNote: parsed.sendBoundaryNote,
    swapBoundaryStatus: parsed.swapBoundaryStatus,
    swapBoundaryNote: parsed.swapBoundaryNote,
    supportedSendLaneVersion: 1,
    supportedSendLaneKind: "single-input-single-recipient-optional-change",
    supportedSendLaneStatus: "supported",
    supportedSendLaneNote: parsed.supportedSendLaneNote,
    supportedSendV1Decision: "accepted-narrow-v1-path",
    supportedSendV1DecisionNote: parsed.supportedSendV1DecisionNote,
    supportedUnshieldLaneVersion: 1,
    supportedUnshieldLaneKind: "single-note-proof-backed-consume",
    supportedUnshieldLaneStatus: "supported",
    supportedUnshieldLaneNote: parsed.supportedUnshieldLaneNote,
    supportedUnshieldV1Decision: "accepted-narrow-v1-path",
    supportedUnshieldV1DecisionNote: parsed.supportedUnshieldV1DecisionNote,
    supportedReleaseLaneVersion: 1,
    supportedReleaseLaneKind: "proof-backed-consume-latest-registered-root",
    supportedReleaseLaneStatus: "supported",
    supportedReleaseLaneNote: parsed.supportedReleaseLaneNote,
    supportedReleaseV1Decision: "accepted-narrow-v1-path",
    supportedReleaseV1DecisionNote: parsed.supportedReleaseV1DecisionNote,
    supportedSwapLaneVersion: 1,
    supportedSwapLaneKind: "single-input-vusd-to-shielded-sol",
    supportedSwapLaneStatus: "supported",
    supportedSwapLaneNote: parsed.supportedSwapLaneNote,
    supportedSwapV1Decision: "accepted-narrow-v1-path",
    supportedSwapV1DecisionNote: parsed.supportedSwapV1DecisionNote,
    supportedSwapV1Role: "adjacent-supported-not-required-for-finish-line",
    supportedSwapV1RoleNote: parsed.supportedSwapV1RoleNote,
    supportedSwapVenue: "meteora-dlmm-devnet",
    supportedSwapOutputModel: "shielded-sol-output-note",
    supportedFlowVersion: 1,
    supportedFlowKind: "shield-hold-send-unshield-replay-guard",
    supportedFlowStatus: "supported",
    supportedFlowNote: parsed.supportedFlowNote,
    supportedShippingDecisionVersion: 1,
    supportedShippingDecisionKind: "narrow-private-core-zk-v1-shipping",
    supportedShippingDecisionNote: parsed.supportedShippingDecisionNote,
    supportedShippingDecisionGateNote: parsed.supportedShippingDecisionGateNote,
    supportedShippingDecisionGateVersion: 1,
    supportedShippingDecisionGateKind: "ready-gated-narrow-private-core-zk-v1-shipping",
    supportedShippingDecisionGateTransport: "dedicated-endpoint",
    supportedShippingDecisionGateEndpoint: "/state/private-core-shipping-decision-check",
    supportedShippingDecisionTransport: "dedicated-endpoint",
    supportedShippingDecisionEndpoint: "/state/private-core-shipping-decision",
    supportedOperatorStatusVersion: 1,
    supportedOperatorStatusKind: "long-form-live-status",
    supportedOperatorStatusNote: parsed.supportedOperatorStatusNote,
    supportedOperatorStatusGateVersion: 1,
    supportedOperatorStatusGateKind: "ready-gated-long-form-live-status",
    supportedOperatorStatusGateNote: parsed.supportedOperatorStatusGateNote,
    supportedOperatorStatusGateTransport: "dedicated-endpoint",
    supportedOperatorStatusGateEndpoint: "/state/private-core-status-check",
    supportedOperatorStatusTransport: "dedicated-endpoint",
    supportedOperatorStatusEndpoint: "/state/private-core-status",
    supportedOperatorSnapshotVersion: 1,
    supportedOperatorSnapshotKind: "contract-status-shipping-bundle",
    supportedOperatorSnapshotNote: parsed.supportedOperatorSnapshotNote,
    supportedOperatorSnapshotGateVersion: 1,
    supportedOperatorSnapshotGateKind: "ready-gated-contract-status-shipping-bundle",
    supportedOperatorSnapshotGateNote: parsed.supportedOperatorSnapshotGateNote,
    supportedOperatorSnapshotGateTransport: "dedicated-endpoint",
    supportedOperatorSnapshotGateEndpoint: "/state/private-core-snapshot-check",
    supportedOperatorSnapshotTransport: "dedicated-endpoint",
    supportedOperatorSnapshotEndpoint: "/state/private-core-snapshot",
    supportedShippingArtifactVersion: 1,
    supportedShippingArtifactKind: "shipping-decision-checked-snapshot-bundle",
    supportedShippingArtifactNote: parsed.supportedShippingArtifactNote,
    supportedShippingArtifactGateVersion: 1,
    supportedShippingArtifactGateKind: "ready-gated-shipping-decision-checked-snapshot-bundle",
    supportedShippingArtifactGateNote: parsed.supportedShippingArtifactGateNote,
    supportedShippingArtifactGateTransport: "dedicated-endpoint",
    supportedShippingArtifactGateEndpoint: "/state/private-core-shipping-artifact-check",
    supportedShippingArtifactTransport: "dedicated-endpoint",
    supportedShippingArtifactEndpoint: "/state/private-core-shipping-artifact",
    supportedReleaseCandidateVersion: 1,
    supportedReleaseCandidateKind: "exact-run-send-consume-release-candidate",
    supportedReleaseCandidateNote: parsed.supportedReleaseCandidateNote,
    supportedReleaseCandidateScope: "primary-send-unshield-only",
    supportedReleaseCandidateScopeNote: parsed.supportedReleaseCandidateScopeNote,
    supportedReleaseCandidateGateVersion: 1,
    supportedReleaseCandidateGateKind: "ready-gated-exact-run-send-consume-release-candidate",
    supportedReleaseCandidateGateNote: parsed.supportedReleaseCandidateGateNote,
    supportedReleaseCandidateGateTransport: "dedicated-endpoint",
    supportedReleaseCandidateGateEndpoint: "/state/private-core-release-candidate-check",
    supportedReleaseCandidateTransport: "dedicated-endpoint",
    supportedReleaseCandidateEndpoint: "/state/private-core-release-candidate",
    supportedZkV1ScopeDecision: "accepted-narrow-private-core-v1-scope",
    supportedZkV1ScopeNote: parsed.supportedZkV1ScopeNote,
    supportedZkV1RequiredLanes: "send|unshield|release",
    supportedZkV1RequiredLanesNote: parsed.supportedZkV1RequiredLanesNote,
    supportedAssetSymbol: "VUSD",
    supportedEnvironment: "solana-devnet",
    supportedNoteSchema: "note-v0",
    supportedNoteVersion: 0,
    supportedRootRegistrationProvenance:
      "shield-input|send-recipient-output|send-change-output|swap-output",
    supportedSendResultingRootBasis: "client-declared",
    supportedSendInputRootPolicy:
      "latest-registered-root-with-linked-registration-proof",
    supportedSendOutputRegistrationPolicy:
      "resulting-root-must-register-as-recipient-or-change-output",
    supportedSwapResultingRootBasis: "client-declared",
    supportedSwapInputRootPolicy:
      "latest-registered-root-with-linked-registration-proof",
    supportedSwapOutputRegistrationPolicy:
      "resulting-root-must-register-as-swap-output",
    supportedRecipientModel: "hashed-reference-to-owner-key",
    supportedReleaseDestinationModel: "32-byte-release-destination-field",
    supportedProofSystem: "noir-acir-ultrahonk-bbjs",
    supportedUnshieldCircuit: "vanta_private_core_single_note_unshield",
    supportedSendCircuit: "vanta_private_core_single_note_send",
    supportedUnshieldMerkleDepth: 3,
    supportedSendMerkleDepth: 3,
    supportedReleaseAuthorizationBasis: "proof-backed-consume",
    supportedReleaseRootPolicy: "latest-registered-root",
    supportedReleaseExecutionModel: "operator-recorded-devnet-release",
    supportedReleaseAtomicityModel: "operator-local-atomic-consume-and-release-record",
    supportedReleasePersistenceModel: "json-store-v1",
    ownerAuthorizationMode: "x25519-secret-prechecked-off-circuit",
    ownerAuthorizationDecision: "accepted-v1-off-circuit-precheck",
    ownerAuthorizationDecisionNote: parsed.ownerAuthorizationDecisionNote,
    sourceArtifactTruthBasis: "source-layer-artifact-bundle",
    provingArtifactTruthBasis: "verified-proving-public-input-vector",
    sourceProvingRelationship: "explicit-split-no-implicit-equality",
    nullifierKeyMode: "note-secret-as-nullifier-key-v0",
    nullifierKeyDecision: "accepted-v1-temporary-note-secret-key",
    nullifierKeyDecisionNote: parsed.nullifierKeyDecisionNote,
    provingHashLane: "poseidon-bn254-proving-lane-v0",
    currentRootLinkedProof: isProofRecord(parsed.currentRootLinkedProof)
      ? parsed.currentRootLinkedProof
      : null,
    currentRootProofLinkStatus: parsed.currentRootProofLinkStatus,
    sendResultingRootLinkedProof: isProofRecord(parsed.sendResultingRootLinkedProof)
      ? parsed.sendResultingRootLinkedProof
      : null,
    sendResultingRootRecord: isRootRecord(parsed.sendResultingRootRecord)
      ? parsed.sendResultingRootRecord
      : null,
    sendResultingRootStatus: parsed.sendResultingRootStatus,
    sendResultingRootNote: parsed.sendResultingRootNote,
    sendResultingRootRegistrationStatus: parsed.sendResultingRootRegistrationStatus,
    sendResultingRootRegistrationNote: parsed.sendResultingRootRegistrationNote,
    sendResultingRootProofLinkStatus: parsed.sendResultingRootProofLinkStatus,
    sendContinuityStatus: parsed.sendContinuityStatus,
    sendContinuityNote: parsed.sendContinuityNote,
    swapResultingRootLinkedProof: isProofRecord(parsed.swapResultingRootLinkedProof)
      ? parsed.swapResultingRootLinkedProof
      : null,
    swapResultingRootRecord: isRootRecord(parsed.swapResultingRootRecord)
      ? parsed.swapResultingRootRecord
      : null,
    swapResultingRootStatus: parsed.swapResultingRootStatus,
    swapResultingRootNote: parsed.swapResultingRootNote,
    swapResultingRootRegistrationStatus: parsed.swapResultingRootRegistrationStatus,
    swapResultingRootRegistrationNote: parsed.swapResultingRootRegistrationNote,
    swapResultingRootProofLinkStatus: parsed.swapResultingRootProofLinkStatus,
    swapContinuityStatus: parsed.swapContinuityStatus,
    swapContinuityNote: parsed.swapContinuityNote,
    generatedAt: parsed.generatedAt,
    currentRoot: typeof parsed.currentRoot === "string" ? parsed.currentRoot : null,
    currentRecord: isRootRecord(parsed.currentRecord) ? parsed.currentRecord : null,
    rootRecords: parsed.rootRecords.filter(isRootRecord),
    latestProof: isProofRecord(parsed.latestProof) ? parsed.latestProof : null,
    proofRecords: parsed.proofRecords.filter(isProofRecord),
    latestSendProof: isSendProofRecord(parsed.latestSendProof) ? parsed.latestSendProof : null,
    sendProofRecords: parsed.sendProofRecords.filter(isSendProofRecord),
    latestSwapProof: isSwapProofRecord(parsed.latestSwapProof) ? parsed.latestSwapProof : null,
    swapProofRecords: parsed.swapProofRecords.filter(isSwapProofRecord),
    latestSendLinkedProof: isSendProofRecord(parsed.latestSendLinkedProof)
      ? parsed.latestSendLinkedProof
      : null,
    latestSwapLinkedProof: isSwapProofRecord(parsed.latestSwapLinkedProof)
      ? parsed.latestSwapLinkedProof
      : null,
    latestSend: isSendRecord(parsed.latestSend) ? parsed.latestSend : null,
    sendRecords: parsed.sendRecords.filter(isSendRecord),
    latestSwap: isSwapRecord(parsed.latestSwap) ? parsed.latestSwap : null,
    swapRecords: parsed.swapRecords.filter(isSwapRecord),
    latestConsume: isConsumeRecord(parsed.latestConsume) ? parsed.latestConsume : null,
    consumeRecords: parsed.consumeRecords.filter(isConsumeRecord),
    latestConsumeProof: isProofRecord(parsed.latestConsumeProof) ? parsed.latestConsumeProof : null,
    latestRelease: isReleaseRecord(parsed.latestRelease) ? parsed.latestRelease : null,
    releaseRecords: parsed.releaseRecords.filter(isReleaseRecord),
    latestReleaseProof: isProofRecord(parsed.latestReleaseProof) ? parsed.latestReleaseProof : null,
    rootRecordCount: parsed.rootRecordCount,
    proofRecordCount: parsed.proofRecordCount,
    sendProofRecordCount: parsed.sendProofRecordCount,
    swapProofRecordCount: parsed.swapProofRecordCount,
    sendRecordCount: parsed.sendRecordCount,
    swapRecordCount: parsed.swapRecordCount,
    consumeRecordCount: parsed.consumeRecordCount,
    releaseRecordCount: parsed.releaseRecordCount,
    proofSendLinkStatus: parsed.proofSendLinkStatus,
    proofSwapLinkStatus: parsed.proofSwapLinkStatus,
    proofConsumeLinkStatus: parsed.proofConsumeLinkStatus,
    proofReleaseLinkStatus: parsed.proofReleaseLinkStatus,
  };
}

export async function fetchVantaPrivateCoreOperatorShippingDecision(): Promise<
  VantaPrivateCoreOperatorShippingDecisionResponse
> {
  const response = await fetch(getPrivateCoreShippingDecisionUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core shipping decision endpoint failed.");
  }

  const parsed = (await response.json()) as {
    stateVersion?: unknown;
    decisionVersion?: unknown;
    decisionKind?: unknown;
    decisionStatus?: unknown;
    decisionNote?: unknown;
    contractVersion?: unknown;
    summaryVersion?: unknown;
    generatedAt?: unknown;
    shippingStatus?: unknown;
    shippingNote?: unknown;
    finishLineStatus?: unknown;
    finishLineNote?: unknown;
    requiredLanesStatus?: unknown;
    requiredLanesNote?: unknown;
    releaseBoundaryStatus?: unknown;
    releaseBoundaryNote?: unknown;
    contractMirrorStatus?: unknown;
    contractMirrorNote?: unknown;
    boundaryStatus?: unknown;
    boundaryNote?: unknown;
  };

  if (
    parsed.stateVersion !== 1 ||
    parsed.decisionVersion !== 1 ||
    parsed.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    !isShippingDecisionStatus(parsed.decisionStatus) ||
    typeof parsed.decisionNote !== "string" ||
    parsed.contractVersion !== 21 ||
    parsed.summaryVersion !== 45 ||
    typeof parsed.generatedAt !== "number" ||
    !isZkV1ShippingStatus(parsed.shippingStatus) ||
    typeof parsed.shippingNote !== "string" ||
    !isZkV1FinishLineStatus(parsed.finishLineStatus) ||
    typeof parsed.finishLineNote !== "string" ||
    !isRequiredLanesStatus(parsed.requiredLanesStatus) ||
    typeof parsed.requiredLanesNote !== "string" ||
    !isReleaseBoundaryStatus(parsed.releaseBoundaryStatus) ||
    typeof parsed.releaseBoundaryNote !== "string" ||
    !isContractMirrorStatus(parsed.contractMirrorStatus) ||
    typeof parsed.contractMirrorNote !== "string" ||
    !isBoundaryStatus(parsed.boundaryStatus) ||
    typeof parsed.boundaryNote !== "string"
  ) {
    throw new Error("The private-core shipping decision endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    decisionVersion: 1,
    decisionKind: "narrow-private-core-zk-v1-shipping",
    decisionStatus: parsed.decisionStatus,
    decisionNote: parsed.decisionNote,
    contractVersion: 21,
    summaryVersion: 45,
    generatedAt: parsed.generatedAt,
    shippingStatus: parsed.shippingStatus,
    shippingNote: parsed.shippingNote,
    finishLineStatus: parsed.finishLineStatus,
    finishLineNote: parsed.finishLineNote,
    requiredLanesStatus: parsed.requiredLanesStatus,
    requiredLanesNote: parsed.requiredLanesNote,
    releaseBoundaryStatus: parsed.releaseBoundaryStatus,
    releaseBoundaryNote: parsed.releaseBoundaryNote,
    contractMirrorStatus: parsed.contractMirrorStatus,
    contractMirrorNote: parsed.contractMirrorNote,
    boundaryStatus: parsed.boundaryStatus,
    boundaryNote: parsed.boundaryNote,
  };
}

export async function fetchVantaPrivateCoreOperatorContract(): Promise<
  VantaPrivateCoreOperatorContractStateResponse
> {
  const response = await fetch(getPrivateCoreContractStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core operator contract endpoint failed.");
  }

  const parsed = (await response.json()) as {
    stateVersion?: unknown;
    contractVersion?: unknown;
    summaryVersion?: unknown;
    zkV1FinishLineStatus?: unknown;
    zkV1FinishLineNote?: unknown;
    supportedSendLaneVersion?: unknown;
    supportedSendLaneKind?: unknown;
    supportedSendLaneStatus?: unknown;
    supportedSendLaneNote?: unknown;
    supportedSendV1Decision?: unknown;
    supportedSendV1DecisionNote?: unknown;
    supportedUnshieldLaneVersion?: unknown;
    supportedUnshieldLaneKind?: unknown;
    supportedUnshieldLaneStatus?: unknown;
    supportedUnshieldLaneNote?: unknown;
    supportedUnshieldV1Decision?: unknown;
    supportedUnshieldV1DecisionNote?: unknown;
    supportedReleaseLaneVersion?: unknown;
    supportedReleaseLaneKind?: unknown;
    supportedReleaseLaneStatus?: unknown;
    supportedReleaseLaneNote?: unknown;
    supportedReleaseV1Decision?: unknown;
    supportedReleaseV1DecisionNote?: unknown;
    supportedSwapLaneVersion?: unknown;
    supportedSwapLaneKind?: unknown;
    supportedSwapLaneStatus?: unknown;
    supportedSwapLaneNote?: unknown;
    supportedSwapV1Decision?: unknown;
    supportedSwapV1DecisionNote?: unknown;
    supportedSwapV1Role?: unknown;
    supportedSwapV1RoleNote?: unknown;
    supportedSwapVenue?: unknown;
    supportedSwapOutputModel?: unknown;
    supportedFlowVersion?: unknown;
    supportedFlowKind?: unknown;
    supportedFlowStatus?: unknown;
    supportedFlowNote?: unknown;
    supportedShippingDecisionVersion?: unknown;
    supportedShippingDecisionKind?: unknown;
    supportedShippingDecisionGateNote?: unknown;
    supportedShippingDecisionGateVersion?: unknown;
    supportedShippingDecisionGateKind?: unknown;
    supportedShippingDecisionGateTransport?: unknown;
    supportedShippingDecisionGateEndpoint?: unknown;
    supportedShippingDecisionTransport?: unknown;
    supportedShippingDecisionEndpoint?: unknown;
    supportedShippingDecisionNote?: unknown;
    supportedOperatorStatusVersion?: unknown;
    supportedOperatorStatusKind?: unknown;
    supportedOperatorStatusNote?: unknown;
    supportedOperatorStatusGateVersion?: unknown;
    supportedOperatorStatusGateKind?: unknown;
    supportedOperatorStatusGateNote?: unknown;
    supportedOperatorStatusGateTransport?: unknown;
    supportedOperatorStatusGateEndpoint?: unknown;
    supportedOperatorStatusTransport?: unknown;
    supportedOperatorStatusEndpoint?: unknown;
    supportedOperatorSnapshotVersion?: unknown;
    supportedOperatorSnapshotKind?: unknown;
    supportedOperatorSnapshotNote?: unknown;
    supportedOperatorSnapshotGateVersion?: unknown;
    supportedOperatorSnapshotGateKind?: unknown;
    supportedOperatorSnapshotGateNote?: unknown;
    supportedOperatorSnapshotGateTransport?: unknown;
    supportedOperatorSnapshotGateEndpoint?: unknown;
    supportedOperatorSnapshotTransport?: unknown;
    supportedOperatorSnapshotEndpoint?: unknown;
    supportedShippingArtifactVersion?: unknown;
    supportedShippingArtifactKind?: unknown;
    supportedShippingArtifactNote?: unknown;
    supportedShippingArtifactGateVersion?: unknown;
    supportedShippingArtifactGateKind?: unknown;
    supportedShippingArtifactGateNote?: unknown;
    supportedShippingArtifactGateTransport?: unknown;
    supportedShippingArtifactGateEndpoint?: unknown;
    supportedShippingArtifactTransport?: unknown;
    supportedShippingArtifactEndpoint?: unknown;
    supportedReleaseCandidateVersion?: unknown;
    supportedReleaseCandidateKind?: unknown;
    supportedReleaseCandidateNote?: unknown;
    supportedReleaseCandidateScope?: unknown;
    supportedReleaseCandidateScopeNote?: unknown;
    supportedReleaseCandidateGateVersion?: unknown;
    supportedReleaseCandidateGateKind?: unknown;
    supportedReleaseCandidateGateNote?: unknown;
    supportedReleaseCandidateGateTransport?: unknown;
    supportedReleaseCandidateGateEndpoint?: unknown;
    supportedReleaseCandidateTransport?: unknown;
    supportedReleaseCandidateEndpoint?: unknown;
    supportedZkV1ScopeDecision?: unknown;
    supportedZkV1ScopeNote?: unknown;
    supportedZkV1RequiredLanes?: unknown;
    supportedZkV1RequiredLanesNote?: unknown;
    supportedAssetSymbol?: unknown;
    supportedEnvironment?: unknown;
    supportedNoteSchema?: unknown;
    supportedNoteVersion?: unknown;
    supportedRootRegistrationProvenance?: unknown;
    supportedSendResultingRootBasis?: unknown;
    supportedSendInputRootPolicy?: unknown;
    supportedSendOutputRegistrationPolicy?: unknown;
    supportedSwapResultingRootBasis?: unknown;
    supportedSwapInputRootPolicy?: unknown;
    supportedSwapOutputRegistrationPolicy?: unknown;
    supportedRecipientModel?: unknown;
    supportedReleaseDestinationModel?: unknown;
    supportedProofSystem?: unknown;
    supportedUnshieldCircuit?: unknown;
    supportedSendCircuit?: unknown;
    supportedUnshieldMerkleDepth?: unknown;
    supportedSendMerkleDepth?: unknown;
    supportedReleaseAuthorizationBasis?: unknown;
    supportedReleaseRootPolicy?: unknown;
    supportedReleaseExecutionModel?: unknown;
    supportedReleaseAtomicityModel?: unknown;
    supportedReleasePersistenceModel?: unknown;
    ownerAuthorizationMode?: unknown;
    ownerAuthorizationDecision?: unknown;
    ownerAuthorizationDecisionNote?: unknown;
    sourceArtifactTruthBasis?: unknown;
    provingArtifactTruthBasis?: unknown;
    sourceProvingRelationship?: unknown;
    nullifierKeyMode?: unknown;
    nullifierKeyDecision?: unknown;
    nullifierKeyDecisionNote?: unknown;
    provingHashLane?: unknown;
  };

  if (
    parsed.stateVersion !== 1 ||
    parsed.contractVersion !== 21 ||
    parsed.summaryVersion !== 45 ||
    !isZkV1FinishLineStatus(parsed.zkV1FinishLineStatus) ||
    typeof parsed.zkV1FinishLineNote !== "string" ||
    parsed.supportedSendLaneVersion !== 1 ||
    parsed.supportedSendLaneKind !== "single-input-single-recipient-optional-change" ||
    parsed.supportedSendLaneStatus !== "supported" ||
    typeof parsed.supportedSendLaneNote !== "string" ||
    parsed.supportedSendV1Decision !== "accepted-narrow-v1-path" ||
    typeof parsed.supportedSendV1DecisionNote !== "string" ||
    parsed.supportedUnshieldLaneVersion !== 1 ||
    parsed.supportedUnshieldLaneKind !== "single-note-proof-backed-consume" ||
    parsed.supportedUnshieldLaneStatus !== "supported" ||
    typeof parsed.supportedUnshieldLaneNote !== "string" ||
    parsed.supportedUnshieldV1Decision !== "accepted-narrow-v1-path" ||
    typeof parsed.supportedUnshieldV1DecisionNote !== "string" ||
    parsed.supportedReleaseLaneVersion !== 1 ||
    parsed.supportedReleaseLaneKind !== "proof-backed-consume-latest-registered-root" ||
    parsed.supportedReleaseLaneStatus !== "supported" ||
    typeof parsed.supportedReleaseLaneNote !== "string" ||
    parsed.supportedReleaseV1Decision !== "accepted-narrow-v1-path" ||
    typeof parsed.supportedReleaseV1DecisionNote !== "string" ||
    parsed.supportedSwapLaneVersion !== 1 ||
    parsed.supportedSwapLaneKind !== "single-input-vusd-to-shielded-sol" ||
    parsed.supportedSwapLaneStatus !== "supported" ||
    typeof parsed.supportedSwapLaneNote !== "string" ||
    parsed.supportedSwapV1Decision !== "accepted-narrow-v1-path" ||
    typeof parsed.supportedSwapV1DecisionNote !== "string" ||
    parsed.supportedSwapV1Role !== "adjacent-supported-not-required-for-finish-line" ||
    typeof parsed.supportedSwapV1RoleNote !== "string" ||
    parsed.supportedSwapVenue !== "meteora-dlmm-devnet" ||
    parsed.supportedSwapOutputModel !== "shielded-sol-output-note" ||
    parsed.supportedFlowVersion !== 1 ||
    parsed.supportedFlowKind !== "shield-hold-send-unshield-replay-guard" ||
    parsed.supportedFlowStatus !== "supported" ||
    typeof parsed.supportedFlowNote !== "string" ||
    parsed.supportedShippingDecisionVersion !== 1 ||
    parsed.supportedShippingDecisionKind !== "narrow-private-core-zk-v1-shipping" ||
    typeof parsed.supportedShippingDecisionGateNote !== "string" ||
    parsed.supportedShippingDecisionGateVersion !== 1 ||
    parsed.supportedShippingDecisionGateKind !==
      "ready-gated-narrow-private-core-zk-v1-shipping" ||
    parsed.supportedShippingDecisionGateTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingDecisionGateEndpoint !==
      "/state/private-core-shipping-decision-check" ||
    parsed.supportedShippingDecisionTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingDecisionEndpoint !== "/state/private-core-shipping-decision" ||
    typeof parsed.supportedShippingDecisionNote !== "string" ||
    parsed.supportedOperatorStatusVersion !== 1 ||
    parsed.supportedOperatorStatusKind !== "long-form-live-status" ||
    typeof parsed.supportedOperatorStatusNote !== "string" ||
    parsed.supportedOperatorStatusGateVersion !== 1 ||
    parsed.supportedOperatorStatusGateKind !== "ready-gated-long-form-live-status" ||
    typeof parsed.supportedOperatorStatusGateNote !== "string" ||
    parsed.supportedOperatorStatusGateTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorStatusGateEndpoint !== "/state/private-core-status-check" ||
    parsed.supportedOperatorStatusTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorStatusEndpoint !== "/state/private-core-status" ||
    parsed.supportedOperatorSnapshotVersion !== 1 ||
    parsed.supportedOperatorSnapshotKind !== "contract-status-shipping-bundle" ||
    typeof parsed.supportedOperatorSnapshotNote !== "string" ||
    parsed.supportedOperatorSnapshotGateVersion !== 1 ||
    parsed.supportedOperatorSnapshotGateKind !==
      "ready-gated-contract-status-shipping-bundle" ||
    typeof parsed.supportedOperatorSnapshotGateNote !== "string" ||
    parsed.supportedOperatorSnapshotGateTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorSnapshotGateEndpoint !== "/state/private-core-snapshot-check" ||
    parsed.supportedOperatorSnapshotTransport !== "dedicated-endpoint" ||
    parsed.supportedOperatorSnapshotEndpoint !== "/state/private-core-snapshot" ||
    parsed.supportedShippingArtifactVersion !== 1 ||
    parsed.supportedShippingArtifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    typeof parsed.supportedShippingArtifactNote !== "string" ||
    parsed.supportedShippingArtifactGateVersion !== 1 ||
    parsed.supportedShippingArtifactGateKind !==
      "ready-gated-shipping-decision-checked-snapshot-bundle" ||
    typeof parsed.supportedShippingArtifactGateNote !== "string" ||
    parsed.supportedShippingArtifactGateTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingArtifactGateEndpoint !==
      "/state/private-core-shipping-artifact-check" ||
    parsed.supportedShippingArtifactTransport !== "dedicated-endpoint" ||
    parsed.supportedShippingArtifactEndpoint !== "/state/private-core-shipping-artifact" ||
    parsed.supportedReleaseCandidateVersion !== 1 ||
    parsed.supportedReleaseCandidateKind !== "exact-run-send-consume-release-candidate" ||
    typeof parsed.supportedReleaseCandidateNote !== "string" ||
    parsed.supportedReleaseCandidateScope !== "primary-send-unshield-only" ||
    typeof parsed.supportedReleaseCandidateScopeNote !== "string" ||
    parsed.supportedReleaseCandidateGateVersion !== 1 ||
    parsed.supportedReleaseCandidateGateKind !==
      "ready-gated-exact-run-send-consume-release-candidate" ||
    typeof parsed.supportedReleaseCandidateGateNote !== "string" ||
    parsed.supportedReleaseCandidateGateTransport !== "dedicated-endpoint" ||
    parsed.supportedReleaseCandidateGateEndpoint !==
      "/state/private-core-release-candidate-check" ||
    parsed.supportedReleaseCandidateTransport !== "dedicated-endpoint" ||
    parsed.supportedReleaseCandidateEndpoint !== "/state/private-core-release-candidate" ||
    parsed.supportedZkV1ScopeDecision !== "accepted-narrow-private-core-v1-scope" ||
    typeof parsed.supportedZkV1ScopeNote !== "string" ||
    parsed.supportedZkV1RequiredLanes !== "send|unshield|release" ||
    typeof parsed.supportedZkV1RequiredLanesNote !== "string" ||
    parsed.supportedAssetSymbol !== "VUSD" ||
    parsed.supportedEnvironment !== "solana-devnet" ||
    parsed.supportedNoteSchema !== "note-v0" ||
    parsed.supportedNoteVersion !== 0 ||
    parsed.supportedRootRegistrationProvenance !==
      "shield-input|send-recipient-output|send-change-output|swap-output" ||
    parsed.supportedSendResultingRootBasis !== "client-declared" ||
    parsed.supportedSendInputRootPolicy !==
      "latest-registered-root-with-linked-registration-proof" ||
    parsed.supportedSendOutputRegistrationPolicy !==
      "resulting-root-must-register-as-recipient-or-change-output" ||
    parsed.supportedSwapResultingRootBasis !== "client-declared" ||
    parsed.supportedSwapInputRootPolicy !==
      "latest-registered-root-with-linked-registration-proof" ||
    parsed.supportedSwapOutputRegistrationPolicy !==
      "resulting-root-must-register-as-swap-output" ||
    parsed.supportedRecipientModel !== "hashed-reference-to-owner-key" ||
    parsed.supportedReleaseDestinationModel !== "32-byte-release-destination-field" ||
    parsed.supportedProofSystem !== "noir-acir-ultrahonk-bbjs" ||
    parsed.supportedUnshieldCircuit !== "vanta_private_core_single_note_unshield" ||
    parsed.supportedSendCircuit !== "vanta_private_core_single_note_send" ||
    parsed.supportedUnshieldMerkleDepth !== 3 ||
    parsed.supportedSendMerkleDepth !== 3 ||
    parsed.supportedReleaseAuthorizationBasis !== "proof-backed-consume" ||
    parsed.supportedReleaseRootPolicy !== "latest-registered-root" ||
    parsed.supportedReleaseExecutionModel !== "operator-recorded-devnet-release" ||
    parsed.supportedReleaseAtomicityModel !== "operator-local-atomic-consume-and-release-record" ||
    parsed.supportedReleasePersistenceModel !== "json-store-v1" ||
    parsed.ownerAuthorizationMode !== "x25519-secret-prechecked-off-circuit" ||
    parsed.ownerAuthorizationDecision !== "accepted-v1-off-circuit-precheck" ||
    typeof parsed.ownerAuthorizationDecisionNote !== "string" ||
    parsed.sourceArtifactTruthBasis !== "source-layer-artifact-bundle" ||
    parsed.provingArtifactTruthBasis !== "verified-proving-public-input-vector" ||
    parsed.sourceProvingRelationship !== "explicit-split-no-implicit-equality" ||
    parsed.nullifierKeyMode !== "note-secret-as-nullifier-key-v0" ||
    parsed.nullifierKeyDecision !== "accepted-v1-temporary-note-secret-key" ||
    typeof parsed.nullifierKeyDecisionNote !== "string" ||
    parsed.provingHashLane !== "poseidon-bn254-proving-lane-v0"
  ) {
    throw new Error("The private-core operator contract endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    contractVersion: 21,
    summaryVersion: 45,
    supportedSendLaneVersion: 1,
    supportedSendLaneKind: "single-input-single-recipient-optional-change",
    supportedSendLaneStatus: "supported",
    supportedSendLaneNote: parsed.supportedSendLaneNote,
    supportedSendV1Decision: "accepted-narrow-v1-path",
    supportedSendV1DecisionNote: parsed.supportedSendV1DecisionNote,
    supportedUnshieldLaneVersion: 1,
    supportedUnshieldLaneKind: "single-note-proof-backed-consume",
    supportedUnshieldLaneStatus: "supported",
    supportedUnshieldLaneNote: parsed.supportedUnshieldLaneNote,
    supportedUnshieldV1Decision: "accepted-narrow-v1-path",
    supportedUnshieldV1DecisionNote: parsed.supportedUnshieldV1DecisionNote,
    supportedReleaseLaneVersion: 1,
    supportedReleaseLaneKind: "proof-backed-consume-latest-registered-root",
    supportedReleaseLaneStatus: "supported",
    supportedReleaseLaneNote: parsed.supportedReleaseLaneNote,
    supportedReleaseV1Decision: "accepted-narrow-v1-path",
    supportedReleaseV1DecisionNote: parsed.supportedReleaseV1DecisionNote,
    supportedSwapLaneVersion: 1,
    supportedSwapLaneKind: "single-input-vusd-to-shielded-sol",
    supportedSwapLaneStatus: "supported",
    supportedSwapLaneNote: parsed.supportedSwapLaneNote,
    supportedSwapV1Decision: "accepted-narrow-v1-path",
    supportedSwapV1DecisionNote: parsed.supportedSwapV1DecisionNote,
    supportedSwapV1Role: "adjacent-supported-not-required-for-finish-line",
    supportedSwapV1RoleNote: parsed.supportedSwapV1RoleNote,
    supportedSwapVenue: "meteora-dlmm-devnet",
    supportedSwapOutputModel: "shielded-sol-output-note",
    supportedFlowVersion: 1,
    supportedFlowKind: "shield-hold-send-unshield-replay-guard",
    supportedFlowStatus: "supported",
    supportedFlowNote: parsed.supportedFlowNote,
    supportedShippingDecisionVersion: 1,
    supportedShippingDecisionKind: "narrow-private-core-zk-v1-shipping",
    supportedShippingDecisionNote: parsed.supportedShippingDecisionNote,
    supportedShippingDecisionGateNote: parsed.supportedShippingDecisionGateNote,
    supportedShippingDecisionGateVersion: 1,
    supportedShippingDecisionGateKind: "ready-gated-narrow-private-core-zk-v1-shipping",
    supportedShippingDecisionGateTransport: "dedicated-endpoint",
    supportedShippingDecisionGateEndpoint: "/state/private-core-shipping-decision-check",
    supportedShippingDecisionTransport: "dedicated-endpoint",
    supportedShippingDecisionEndpoint: "/state/private-core-shipping-decision",
    supportedOperatorStatusVersion: 1,
    supportedOperatorStatusKind: "long-form-live-status",
    supportedOperatorStatusNote: parsed.supportedOperatorStatusNote,
    supportedOperatorStatusGateVersion: 1,
    supportedOperatorStatusGateKind: "ready-gated-long-form-live-status",
    supportedOperatorStatusGateNote: parsed.supportedOperatorStatusGateNote,
    supportedOperatorStatusGateTransport: "dedicated-endpoint",
    supportedOperatorStatusGateEndpoint: "/state/private-core-status-check",
    supportedOperatorStatusTransport: "dedicated-endpoint",
    supportedOperatorStatusEndpoint: "/state/private-core-status",
    supportedOperatorSnapshotVersion: 1,
    supportedOperatorSnapshotKind: "contract-status-shipping-bundle",
    supportedOperatorSnapshotNote: parsed.supportedOperatorSnapshotNote,
    supportedOperatorSnapshotGateVersion: 1,
    supportedOperatorSnapshotGateKind: "ready-gated-contract-status-shipping-bundle",
    supportedOperatorSnapshotGateNote: parsed.supportedOperatorSnapshotGateNote,
    supportedOperatorSnapshotGateTransport: "dedicated-endpoint",
    supportedOperatorSnapshotGateEndpoint: "/state/private-core-snapshot-check",
    supportedOperatorSnapshotTransport: "dedicated-endpoint",
    supportedOperatorSnapshotEndpoint: "/state/private-core-snapshot",
    supportedShippingArtifactVersion: 1,
    supportedShippingArtifactKind: "shipping-decision-checked-snapshot-bundle",
    supportedShippingArtifactNote: parsed.supportedShippingArtifactNote,
    supportedShippingArtifactGateVersion: 1,
    supportedShippingArtifactGateKind: "ready-gated-shipping-decision-checked-snapshot-bundle",
    supportedShippingArtifactGateNote: parsed.supportedShippingArtifactGateNote,
    supportedShippingArtifactGateTransport: "dedicated-endpoint",
    supportedShippingArtifactGateEndpoint: "/state/private-core-shipping-artifact-check",
    supportedShippingArtifactTransport: "dedicated-endpoint",
    supportedShippingArtifactEndpoint: "/state/private-core-shipping-artifact",
    supportedReleaseCandidateVersion: 1,
    supportedReleaseCandidateKind: "exact-run-send-consume-release-candidate",
    supportedReleaseCandidateNote: parsed.supportedReleaseCandidateNote,
    supportedReleaseCandidateScope: "primary-send-unshield-only",
    supportedReleaseCandidateScopeNote: parsed.supportedReleaseCandidateScopeNote,
    supportedReleaseCandidateGateVersion: 1,
    supportedReleaseCandidateGateKind: "ready-gated-exact-run-send-consume-release-candidate",
    supportedReleaseCandidateGateNote: parsed.supportedReleaseCandidateGateNote,
    supportedReleaseCandidateGateTransport: "dedicated-endpoint",
    supportedReleaseCandidateGateEndpoint: "/state/private-core-release-candidate-check",
    supportedReleaseCandidateTransport: "dedicated-endpoint",
    supportedReleaseCandidateEndpoint: "/state/private-core-release-candidate",
    supportedZkV1ScopeDecision: "accepted-narrow-private-core-v1-scope",
    supportedZkV1ScopeNote: parsed.supportedZkV1ScopeNote,
    supportedZkV1RequiredLanes: "send|unshield|release",
    supportedZkV1RequiredLanesNote: parsed.supportedZkV1RequiredLanesNote,
    supportedAssetSymbol: "VUSD",
    supportedEnvironment: "solana-devnet",
    supportedNoteSchema: "note-v0",
    supportedNoteVersion: 0,
    supportedRootRegistrationProvenance:
      "shield-input|send-recipient-output|send-change-output|swap-output",
    supportedSendResultingRootBasis: "client-declared",
    supportedSendInputRootPolicy:
      "latest-registered-root-with-linked-registration-proof",
    supportedSendOutputRegistrationPolicy:
      "resulting-root-must-register-as-recipient-or-change-output",
    supportedSwapResultingRootBasis: "client-declared",
    supportedSwapInputRootPolicy:
      "latest-registered-root-with-linked-registration-proof",
    supportedSwapOutputRegistrationPolicy:
      "resulting-root-must-register-as-swap-output",
    supportedRecipientModel: "hashed-reference-to-owner-key",
    supportedReleaseDestinationModel: "32-byte-release-destination-field",
    supportedProofSystem: "noir-acir-ultrahonk-bbjs",
    supportedUnshieldCircuit: "vanta_private_core_single_note_unshield",
    supportedSendCircuit: "vanta_private_core_single_note_send",
    supportedUnshieldMerkleDepth: 3,
    supportedSendMerkleDepth: 3,
    supportedReleaseAuthorizationBasis: "proof-backed-consume",
    supportedReleaseRootPolicy: "latest-registered-root",
    supportedReleaseExecutionModel: "operator-recorded-devnet-release",
    supportedReleaseAtomicityModel: "operator-local-atomic-consume-and-release-record",
    supportedReleasePersistenceModel: "json-store-v1",
    ownerAuthorizationMode: "x25519-secret-prechecked-off-circuit",
    ownerAuthorizationDecision: "accepted-v1-off-circuit-precheck",
    ownerAuthorizationDecisionNote: parsed.ownerAuthorizationDecisionNote,
    sourceArtifactTruthBasis: "source-layer-artifact-bundle",
    provingArtifactTruthBasis: "verified-proving-public-input-vector",
    sourceProvingRelationship: "explicit-split-no-implicit-equality",
    nullifierKeyMode: "note-secret-as-nullifier-key-v0",
    nullifierKeyDecision: "accepted-v1-temporary-note-secret-key",
    nullifierKeyDecisionNote: parsed.nullifierKeyDecisionNote,
    provingHashLane: "poseidon-bn254-proving-lane-v0",
  };
}

export async function fetchVantaPrivateCoreOperatorSnapshot(): Promise<
  VantaPrivateCoreOperatorSnapshotStateResponse
> {
  const response = await fetch(getPrivateCoreSnapshotStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core operator snapshot endpoint failed.");
  }

  return parsePrivateCoreOperatorSnapshotPayload(
    await response.json(),
    "The private-core operator snapshot endpoint returned invalid data.",
  );
}

export async function fetchVantaPrivateCoreOperatorStatus(): Promise<
  VantaPrivateCoreOperatorStatusResponse
> {
  const response = await fetch(getPrivateCoreStatusStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core operator status endpoint failed.");
  }

  const parsed = (await response.json()) as {
    operator?: unknown;
    statusVersion?: unknown;
    statusKind?: unknown;
    snapshotVersion?: unknown;
    snapshotKind?: unknown;
    shippingArtifactVersion?: unknown;
    shippingArtifactKind?: unknown;
    summary?: unknown;
    shippingDecision?: unknown;
  };

  if (
    typeof parsed.operator !== "string" ||
    parsed.statusVersion !== 1 ||
    parsed.statusKind !== "long-form-live-status" ||
    parsed.snapshotVersion !== 1 ||
    parsed.snapshotKind !== "contract-status-shipping-bundle" ||
    parsed.shippingArtifactVersion !== 1 ||
    parsed.shippingArtifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    !parsed.summary ||
    typeof parsed.summary !== "object" ||
    !parsed.shippingDecision ||
    typeof parsed.shippingDecision !== "object"
  ) {
    throw new Error("The private-core operator status endpoint returned invalid data.");
  }

  return {
    operator: parsed.operator,
    statusVersion: 1,
    statusKind: "long-form-live-status",
    snapshotVersion: 1,
    snapshotKind: "contract-status-shipping-bundle",
    shippingArtifactVersion: 1,
    shippingArtifactKind: "shipping-decision-checked-snapshot-bundle",
    summary: parsePrivateCoreOperatorSummaryState(
      parsed.summary,
      "The private-core operator status endpoint returned invalid data.",
    ),
    shippingDecision: parsePrivateCoreOperatorShippingDecisionState(
      parsed.shippingDecision,
      "The private-core operator status endpoint returned invalid data.",
    ),
  };
}

export async function fetchVantaPrivateCoreOperatorShippingArtifact(): Promise<
  VantaPrivateCoreOperatorShippingArtifactResponse
> {
  const response = await fetch(getPrivateCoreShippingArtifactUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core shipping artifact endpoint failed.");
  }

  const parsed = (await response.json()) as {
    operator?: unknown;
    artifactVersion?: unknown;
    artifactKind?: unknown;
    decisionVersion?: unknown;
    decisionKind?: unknown;
    decisionStatus?: unknown;
    decisionNote?: unknown;
    snapshotVersion?: unknown;
    snapshotKind?: unknown;
    contractVersion?: unknown;
    summaryVersion?: unknown;
    currentRoot?: unknown;
    currentRootRegistrationBasis?: unknown;
    currentRootProofId?: unknown;
    latestProofId?: unknown;
    latestProofAction?: unknown;
    latestSendProofId?: unknown;
    latestSendLinkedProofId?: unknown;
    latestSendId?: unknown;
    latestSendRecordProofId?: unknown;
    latestSendResultingRoot?: unknown;
    latestConsumeRecordProofId?: unknown;
    latestConsumeLinkedProofId?: unknown;
    latestConsumeRoot?: unknown;
    latestReleaseRecordProofId?: unknown;
    latestReleaseLinkedProofId?: unknown;
    latestReleaseRequestId?: unknown;
    latestReleaseRoot?: unknown;
    latestReleaseDestination?: unknown;
    latestReleasedAssetId?: unknown;
    latestReleasedAmount?: unknown;
    releaseCandidateId?: unknown;
    releaseCandidateLineageStatus?: unknown;
    releaseCandidateLineageNote?: unknown;
    snapshot?: unknown;
  };

  if (
    typeof parsed.operator !== "string" ||
    parsed.artifactVersion !== 1 ||
    parsed.artifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    parsed.decisionVersion !== 1 ||
    parsed.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    !isShippingDecisionStatus(parsed.decisionStatus) ||
    typeof parsed.decisionNote !== "string" ||
    parsed.snapshotVersion !== 1 ||
    parsed.snapshotKind !== "contract-status-shipping-bundle" ||
    parsed.contractVersion !== 21 ||
    parsed.summaryVersion !== 45 ||
    (parsed.currentRoot !== null &&
      parsed.currentRoot !== undefined &&
      typeof parsed.currentRoot !== "string") ||
    (parsed.currentRootRegistrationBasis !== null &&
      parsed.currentRootRegistrationBasis !== undefined &&
      parsed.currentRootRegistrationBasis !== "shield-input" &&
      parsed.currentRootRegistrationBasis !== "send-recipient-output" &&
      parsed.currentRootRegistrationBasis !== "send-change-output" &&
      parsed.currentRootRegistrationBasis !== "swap-output") ||
    (parsed.currentRootProofId !== null &&
      parsed.currentRootProofId !== undefined &&
      typeof parsed.currentRootProofId !== "string") ||
    (parsed.latestProofId !== null &&
      parsed.latestProofId !== undefined &&
      typeof parsed.latestProofId !== "string") ||
    (parsed.latestProofAction !== null &&
      parsed.latestProofAction !== undefined &&
      parsed.latestProofAction !== "consume" &&
      parsed.latestProofAction !== "proof-only" &&
      parsed.latestProofAction !== "register-root") ||
    (parsed.latestSendProofId !== null &&
      parsed.latestSendProofId !== undefined &&
      typeof parsed.latestSendProofId !== "string") ||
    (parsed.latestSendLinkedProofId !== null &&
      parsed.latestSendLinkedProofId !== undefined &&
      typeof parsed.latestSendLinkedProofId !== "string") ||
    (parsed.latestSendId !== null &&
      parsed.latestSendId !== undefined &&
      typeof parsed.latestSendId !== "string") ||
    (parsed.latestSendRecordProofId !== null &&
      parsed.latestSendRecordProofId !== undefined &&
      typeof parsed.latestSendRecordProofId !== "string") ||
    (parsed.latestSendResultingRoot !== null &&
      parsed.latestSendResultingRoot !== undefined &&
      typeof parsed.latestSendResultingRoot !== "string") ||
    (parsed.latestConsumeRecordProofId !== null &&
      parsed.latestConsumeRecordProofId !== undefined &&
      typeof parsed.latestConsumeRecordProofId !== "string") ||
    (parsed.latestConsumeLinkedProofId !== null &&
      parsed.latestConsumeLinkedProofId !== undefined &&
      typeof parsed.latestConsumeLinkedProofId !== "string") ||
    (parsed.latestConsumeRoot !== null &&
      parsed.latestConsumeRoot !== undefined &&
      typeof parsed.latestConsumeRoot !== "string") ||
    (parsed.latestReleaseRecordProofId !== null &&
      parsed.latestReleaseRecordProofId !== undefined &&
      typeof parsed.latestReleaseRecordProofId !== "string") ||
    (parsed.latestReleaseLinkedProofId !== null &&
      parsed.latestReleaseLinkedProofId !== undefined &&
      typeof parsed.latestReleaseLinkedProofId !== "string") ||
    (parsed.latestReleaseRequestId !== null &&
      parsed.latestReleaseRequestId !== undefined &&
      typeof parsed.latestReleaseRequestId !== "string") ||
    (parsed.latestReleaseRoot !== null &&
      parsed.latestReleaseRoot !== undefined &&
      typeof parsed.latestReleaseRoot !== "string") ||
    (parsed.latestReleaseDestination !== null &&
      parsed.latestReleaseDestination !== undefined &&
      typeof parsed.latestReleaseDestination !== "string") ||
    (parsed.latestReleasedAssetId !== null &&
      parsed.latestReleasedAssetId !== undefined &&
      typeof parsed.latestReleasedAssetId !== "string") ||
    (parsed.latestReleasedAmount !== null &&
      parsed.latestReleasedAmount !== undefined &&
      typeof parsed.latestReleasedAmount !== "string") ||
    (parsed.releaseCandidateId !== null &&
      parsed.releaseCandidateId !== undefined &&
      typeof parsed.releaseCandidateId !== "string") ||
    (parsed.releaseCandidateLineageStatus !== "ready" &&
      parsed.releaseCandidateLineageStatus !== "blocked" &&
      parsed.releaseCandidateLineageStatus !== "send-mismatch" &&
      parsed.releaseCandidateLineageStatus !== "consume-mismatch" &&
      parsed.releaseCandidateLineageStatus !== "release-mismatch" &&
      parsed.releaseCandidateLineageStatus !== "unavailable") ||
    typeof parsed.releaseCandidateLineageNote !== "string" ||
    !parsed.snapshot ||
    typeof parsed.snapshot !== "object"
  ) {
    throw new Error("The private-core shipping artifact endpoint returned invalid data.");
  }

  const snapshot = parsePrivateCoreOperatorSnapshotPayload(
    parsed.snapshot,
    "The private-core shipping artifact endpoint returned invalid data.",
  );

  if (
    snapshot.operator !== parsed.operator ||
    snapshot.snapshotVersion !== parsed.snapshotVersion ||
    snapshot.snapshotKind !== parsed.snapshotKind ||
    snapshot.contract.contractVersion !== parsed.contractVersion ||
    snapshot.contract.summaryVersion !== parsed.summaryVersion
  ) {
    throw new Error("The private-core shipping artifact endpoint returned invalid data.");
  }

  return {
    operator: parsed.operator,
    artifactVersion: 1,
    artifactKind: "shipping-decision-checked-snapshot-bundle",
    decisionVersion: 1,
    decisionKind: "narrow-private-core-zk-v1-shipping",
    decisionStatus: parsed.decisionStatus,
    decisionNote: parsed.decisionNote,
    snapshotVersion: 1,
    snapshotKind: "contract-status-shipping-bundle",
    contractVersion: 21,
    summaryVersion: 45,
    currentRoot: typeof parsed.currentRoot === "string" ? parsed.currentRoot : null,
    currentRootRegistrationBasis:
      parsed.currentRootRegistrationBasis === "shield-input" ||
      parsed.currentRootRegistrationBasis === "send-recipient-output" ||
      parsed.currentRootRegistrationBasis === "send-change-output" ||
      parsed.currentRootRegistrationBasis === "swap-output"
        ? parsed.currentRootRegistrationBasis
        : null,
    currentRootProofId: typeof parsed.currentRootProofId === "string" ? parsed.currentRootProofId : null,
    latestProofId: typeof parsed.latestProofId === "string" ? parsed.latestProofId : null,
    latestProofAction:
      parsed.latestProofAction === "consume" ||
      parsed.latestProofAction === "proof-only" ||
      parsed.latestProofAction === "register-root"
        ? parsed.latestProofAction
        : null,
    latestSendProofId: typeof parsed.latestSendProofId === "string" ? parsed.latestSendProofId : null,
    latestSendLinkedProofId:
      typeof parsed.latestSendLinkedProofId === "string" ? parsed.latestSendLinkedProofId : null,
    latestSendId: typeof parsed.latestSendId === "string" ? parsed.latestSendId : null,
    latestSendRecordProofId:
      typeof parsed.latestSendRecordProofId === "string" ? parsed.latestSendRecordProofId : null,
    latestSendResultingRoot:
      typeof parsed.latestSendResultingRoot === "string" ? parsed.latestSendResultingRoot : null,
    latestConsumeRecordProofId:
      typeof parsed.latestConsumeRecordProofId === "string"
        ? parsed.latestConsumeRecordProofId
        : null,
    latestConsumeLinkedProofId:
      typeof parsed.latestConsumeLinkedProofId === "string"
        ? parsed.latestConsumeLinkedProofId
        : null,
    latestConsumeRoot: typeof parsed.latestConsumeRoot === "string" ? parsed.latestConsumeRoot : null,
    latestReleaseRecordProofId:
      typeof parsed.latestReleaseRecordProofId === "string"
        ? parsed.latestReleaseRecordProofId
        : null,
    latestReleaseLinkedProofId:
      typeof parsed.latestReleaseLinkedProofId === "string"
        ? parsed.latestReleaseLinkedProofId
        : null,
    latestReleaseRequestId:
      typeof parsed.latestReleaseRequestId === "string" ? parsed.latestReleaseRequestId : null,
    latestReleaseRoot: typeof parsed.latestReleaseRoot === "string" ? parsed.latestReleaseRoot : null,
    latestReleaseDestination:
      typeof parsed.latestReleaseDestination === "string"
        ? parsed.latestReleaseDestination
        : null,
    latestReleasedAssetId:
      typeof parsed.latestReleasedAssetId === "string" ? parsed.latestReleasedAssetId : null,
    latestReleasedAmount:
      typeof parsed.latestReleasedAmount === "string" ? parsed.latestReleasedAmount : null,
    releaseCandidateId:
      typeof parsed.releaseCandidateId === "string" ? parsed.releaseCandidateId : null,
    releaseCandidateLineageStatus: parsed.releaseCandidateLineageStatus,
    releaseCandidateLineageNote: parsed.releaseCandidateLineageNote,
    snapshot,
  };
}

function isReleaseCandidateLineageStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorReleaseCandidateResponse["lineageStatus"] {
  return (
    value === "ready" ||
    value === "blocked" ||
    value === "send-mismatch" ||
    value === "consume-mismatch" ||
    value === "release-mismatch" ||
    value === "unavailable"
  );
}

export async function fetchVantaPrivateCoreOperatorReleaseCandidate(): Promise<
  VantaPrivateCoreOperatorReleaseCandidateResponse
> {
  const response = await fetch(getPrivateCoreReleaseCandidateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core release candidate endpoint failed.");
  }

  const parsed = (await response.json()) as {
    operator?: unknown;
    candidateVersion?: unknown;
    candidateKind?: unknown;
    decisionVersion?: unknown;
    decisionKind?: unknown;
    decisionStatus?: unknown;
    decisionNote?: unknown;
    contractVersion?: unknown;
    summaryVersion?: unknown;
    artifactVersion?: unknown;
    artifactKind?: unknown;
    releaseCandidateId?: unknown;
    lineageStatus?: unknown;
    lineageNote?: unknown;
    sendId?: unknown;
    sendProofId?: unknown;
    sendLinkedProofId?: unknown;
    sendRecordProofId?: unknown;
    sendResultingRoot?: unknown;
    consumeRecordProofId?: unknown;
    consumeLinkedProofId?: unknown;
    consumeRoot?: unknown;
    releaseRecordProofId?: unknown;
    releaseLinkedProofId?: unknown;
    releaseRequestId?: unknown;
    releaseRoot?: unknown;
    releaseDestination?: unknown;
    releasedAssetId?: unknown;
    releasedAmount?: unknown;
    snapshotVersion?: unknown;
    snapshotKind?: unknown;
  };

  if (
    typeof parsed.operator !== "string" ||
    parsed.candidateVersion !== 1 ||
    parsed.candidateKind !== "private-core-send-consume-release-candidate" ||
    parsed.decisionVersion !== 1 ||
    parsed.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    !isShippingDecisionStatus(parsed.decisionStatus) ||
    typeof parsed.decisionNote !== "string" ||
    parsed.contractVersion !== 21 ||
    parsed.summaryVersion !== 45 ||
    parsed.artifactVersion !== 1 ||
    parsed.artifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    (parsed.releaseCandidateId !== null &&
      parsed.releaseCandidateId !== undefined &&
      typeof parsed.releaseCandidateId !== "string") ||
    !isReleaseCandidateLineageStatus(parsed.lineageStatus) ||
    typeof parsed.lineageNote !== "string" ||
    (parsed.sendId !== null && parsed.sendId !== undefined && typeof parsed.sendId !== "string") ||
    (parsed.sendProofId !== null &&
      parsed.sendProofId !== undefined &&
      typeof parsed.sendProofId !== "string") ||
    (parsed.sendLinkedProofId !== null &&
      parsed.sendLinkedProofId !== undefined &&
      typeof parsed.sendLinkedProofId !== "string") ||
    (parsed.sendRecordProofId !== null &&
      parsed.sendRecordProofId !== undefined &&
      typeof parsed.sendRecordProofId !== "string") ||
    (parsed.sendResultingRoot !== null &&
      parsed.sendResultingRoot !== undefined &&
      typeof parsed.sendResultingRoot !== "string") ||
    (parsed.consumeRecordProofId !== null &&
      parsed.consumeRecordProofId !== undefined &&
      typeof parsed.consumeRecordProofId !== "string") ||
    (parsed.consumeLinkedProofId !== null &&
      parsed.consumeLinkedProofId !== undefined &&
      typeof parsed.consumeLinkedProofId !== "string") ||
    (parsed.consumeRoot !== null &&
      parsed.consumeRoot !== undefined &&
      typeof parsed.consumeRoot !== "string") ||
    (parsed.releaseRecordProofId !== null &&
      parsed.releaseRecordProofId !== undefined &&
      typeof parsed.releaseRecordProofId !== "string") ||
    (parsed.releaseLinkedProofId !== null &&
      parsed.releaseLinkedProofId !== undefined &&
      typeof parsed.releaseLinkedProofId !== "string") ||
    (parsed.releaseRequestId !== null &&
      parsed.releaseRequestId !== undefined &&
      typeof parsed.releaseRequestId !== "string") ||
    (parsed.releaseRoot !== null &&
      parsed.releaseRoot !== undefined &&
      typeof parsed.releaseRoot !== "string") ||
    (parsed.releaseDestination !== null &&
      parsed.releaseDestination !== undefined &&
      typeof parsed.releaseDestination !== "string") ||
    (parsed.releasedAssetId !== null &&
      parsed.releasedAssetId !== undefined &&
      typeof parsed.releasedAssetId !== "string") ||
    (parsed.releasedAmount !== null &&
      parsed.releasedAmount !== undefined &&
      typeof parsed.releasedAmount !== "string") ||
    parsed.snapshotVersion !== 1 ||
    parsed.snapshotKind !== "contract-status-shipping-bundle"
  ) {
    throw new Error("The private-core release candidate endpoint returned invalid data.");
  }

  return {
    operator: parsed.operator,
    candidateVersion: 1,
    candidateKind: "private-core-send-consume-release-candidate",
    decisionVersion: 1,
    decisionKind: "narrow-private-core-zk-v1-shipping",
    decisionStatus: parsed.decisionStatus,
    decisionNote: parsed.decisionNote,
    contractVersion: 21,
    summaryVersion: 45,
    artifactVersion: 1,
    artifactKind: "shipping-decision-checked-snapshot-bundle",
    releaseCandidateId:
      typeof parsed.releaseCandidateId === "string" ? parsed.releaseCandidateId : null,
    lineageStatus: parsed.lineageStatus,
    lineageNote: parsed.lineageNote,
    sendId: typeof parsed.sendId === "string" ? parsed.sendId : null,
    sendProofId: typeof parsed.sendProofId === "string" ? parsed.sendProofId : null,
    sendLinkedProofId:
      typeof parsed.sendLinkedProofId === "string" ? parsed.sendLinkedProofId : null,
    sendRecordProofId:
      typeof parsed.sendRecordProofId === "string" ? parsed.sendRecordProofId : null,
    sendResultingRoot:
      typeof parsed.sendResultingRoot === "string" ? parsed.sendResultingRoot : null,
    consumeRecordProofId:
      typeof parsed.consumeRecordProofId === "string" ? parsed.consumeRecordProofId : null,
    consumeLinkedProofId:
      typeof parsed.consumeLinkedProofId === "string" ? parsed.consumeLinkedProofId : null,
    consumeRoot: typeof parsed.consumeRoot === "string" ? parsed.consumeRoot : null,
    releaseRecordProofId:
      typeof parsed.releaseRecordProofId === "string" ? parsed.releaseRecordProofId : null,
    releaseLinkedProofId:
      typeof parsed.releaseLinkedProofId === "string" ? parsed.releaseLinkedProofId : null,
    releaseRequestId:
      typeof parsed.releaseRequestId === "string" ? parsed.releaseRequestId : null,
    releaseRoot: typeof parsed.releaseRoot === "string" ? parsed.releaseRoot : null,
    releaseDestination:
      typeof parsed.releaseDestination === "string" ? parsed.releaseDestination : null,
    releasedAssetId:
      typeof parsed.releasedAssetId === "string" ? parsed.releasedAssetId : null,
    releasedAmount: typeof parsed.releasedAmount === "string" ? parsed.releasedAmount : null,
    snapshotVersion: 1,
    snapshotKind: "contract-status-shipping-bundle",
  };
}

export async function fetchVantaPrivateCoreOperatorReleaseCandidateCheck(): Promise<
  VantaPrivateCoreOperatorReleaseCandidateCheckResponse
> {
  const response = await fetch(getPrivateCoreReleaseCandidateCheckUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core release candidate gate endpoint failed.");
  }

  const parsed = (await response.json()) as {
    operator?: unknown;
    checkVersion?: unknown;
    checkKind?: unknown;
    decisionStatus?: unknown;
    decisionNote?: unknown;
    candidate?: unknown;
  };

  if (
    typeof parsed.operator !== "string" ||
    parsed.checkVersion !== 1 ||
    parsed.checkKind !== "ready-gated-private-core-release-candidate" ||
    (parsed.decisionStatus !== "ready" && parsed.decisionStatus !== "blocked") ||
    typeof parsed.decisionNote !== "string" ||
    !parsed.candidate ||
    typeof parsed.candidate !== "object"
  ) {
    throw new Error("The private-core release candidate gate endpoint returned invalid data.");
  }

  return {
    operator: parsed.operator,
    checkVersion: 1,
    checkKind: "ready-gated-private-core-release-candidate",
    decisionStatus: parsed.decisionStatus,
    decisionNote: parsed.decisionNote,
    candidate: await parseReleaseCandidateFromUnknown(parsed.candidate),
  };
}

async function parseReleaseCandidateFromUnknown(
  value: unknown,
): Promise<VantaPrivateCoreOperatorReleaseCandidateResponse> {
  const parsed = value as Record<string, unknown>;

  if (
    typeof parsed.operator !== "string" ||
    parsed.candidateVersion !== 1 ||
    parsed.candidateKind !== "private-core-send-consume-release-candidate" ||
    parsed.decisionVersion !== 1 ||
    parsed.decisionKind !== "narrow-private-core-zk-v1-shipping" ||
    !isShippingDecisionStatus(parsed.decisionStatus) ||
    typeof parsed.decisionNote !== "string" ||
    parsed.contractVersion !== 21 ||
    parsed.summaryVersion !== 45 ||
    parsed.artifactVersion !== 1 ||
    parsed.artifactKind !== "shipping-decision-checked-snapshot-bundle" ||
    !isReleaseCandidateLineageStatus(parsed.lineageStatus) ||
    typeof parsed.lineageNote !== "string" ||
    parsed.snapshotVersion !== 1 ||
    parsed.snapshotKind !== "contract-status-shipping-bundle"
  ) {
    throw new Error("The private-core release candidate gate endpoint returned invalid data.");
  }

  return {
    operator: parsed.operator,
    candidateVersion: 1,
    candidateKind: "private-core-send-consume-release-candidate",
    decisionVersion: 1,
    decisionKind: "narrow-private-core-zk-v1-shipping",
    decisionStatus: parsed.decisionStatus,
    decisionNote: parsed.decisionNote,
    contractVersion: 21,
    summaryVersion: 45,
    artifactVersion: 1,
    artifactKind: "shipping-decision-checked-snapshot-bundle",
    releaseCandidateId:
      typeof parsed.releaseCandidateId === "string" ? parsed.releaseCandidateId : null,
    lineageStatus: parsed.lineageStatus,
    lineageNote: parsed.lineageNote,
    sendId: typeof parsed.sendId === "string" ? parsed.sendId : null,
    sendProofId: typeof parsed.sendProofId === "string" ? parsed.sendProofId : null,
    sendLinkedProofId:
      typeof parsed.sendLinkedProofId === "string" ? parsed.sendLinkedProofId : null,
    sendRecordProofId:
      typeof parsed.sendRecordProofId === "string" ? parsed.sendRecordProofId : null,
    sendResultingRoot:
      typeof parsed.sendResultingRoot === "string" ? parsed.sendResultingRoot : null,
    consumeRecordProofId:
      typeof parsed.consumeRecordProofId === "string" ? parsed.consumeRecordProofId : null,
    consumeLinkedProofId:
      typeof parsed.consumeLinkedProofId === "string" ? parsed.consumeLinkedProofId : null,
    consumeRoot: typeof parsed.consumeRoot === "string" ? parsed.consumeRoot : null,
    releaseRecordProofId:
      typeof parsed.releaseRecordProofId === "string" ? parsed.releaseRecordProofId : null,
    releaseLinkedProofId:
      typeof parsed.releaseLinkedProofId === "string" ? parsed.releaseLinkedProofId : null,
    releaseRequestId:
      typeof parsed.releaseRequestId === "string" ? parsed.releaseRequestId : null,
    releaseRoot: typeof parsed.releaseRoot === "string" ? parsed.releaseRoot : null,
    releaseDestination:
      typeof parsed.releaseDestination === "string" ? parsed.releaseDestination : null,
    releasedAssetId:
      typeof parsed.releasedAssetId === "string" ? parsed.releasedAssetId : null,
    releasedAmount: typeof parsed.releasedAmount === "string" ? parsed.releasedAmount : null,
    snapshotVersion: 1,
    snapshotKind: "contract-status-shipping-bundle",
  };
}

function isConsumeRecord(value: unknown): value is VantaPrivateCoreOperatorConsumeRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).amount === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).publicInputCount === "number" &&
    (((value as VantaPrivateCoreOperatorConsumeRecord).releaseCandidateId === null ||
      (value as VantaPrivateCoreOperatorConsumeRecord).releaseCandidateId === undefined) ||
      typeof (value as VantaPrivateCoreOperatorConsumeRecord).releaseCandidateId === "string") &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).releaseDestination === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).root === "string"
  );
}

function isProofRecord(value: unknown): value is VantaPrivateCoreOperatorProofRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    (((value as VantaPrivateCoreOperatorProofRecord).action === "consume" ||
      (value as VantaPrivateCoreOperatorProofRecord).action === "proof-only" ||
      (value as VantaPrivateCoreOperatorProofRecord).action === "register-root")) &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).amount === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).backend === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).circuit === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).noteVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).proofVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).provingHashLane === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).publicInputCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).releaseDestination === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).verified === "boolean"
  );
}

function isRootRecord(value: unknown): value is VantaPrivateCoreOperatorRootRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    ((value as VantaPrivateCoreOperatorRootRecord).artifactBundleStatus === "complete" ||
      (value as VantaPrivateCoreOperatorRootRecord).artifactBundleStatus === "legacy-incomplete") &&
    (((value as VantaPrivateCoreOperatorRootRecord).artifactBundleVersion === null ||
      (value as VantaPrivateCoreOperatorRootRecord).artifactBundleVersion === undefined) ||
      typeof (value as VantaPrivateCoreOperatorRootRecord).artifactBundleVersion === "number") &&
    (((value as VantaPrivateCoreOperatorRootRecord).proofId === null ||
      (value as VantaPrivateCoreOperatorRootRecord).proofId === undefined) ||
      typeof (value as VantaPrivateCoreOperatorRootRecord).proofId === "string") &&
    ((value as VantaPrivateCoreOperatorRootRecord).registrationBasis === "shield-input" ||
      (value as VantaPrivateCoreOperatorRootRecord).registrationBasis ===
        "send-recipient-output" ||
      (value as VantaPrivateCoreOperatorRootRecord).registrationBasis === "send-change-output" ||
      (value as VantaPrivateCoreOperatorRootRecord).registrationBasis === "swap-output") &&
    typeof (value as VantaPrivateCoreOperatorRootRecord).recordedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorRootRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorRootRecord).source === "string"
  );
}

function isSendProofRecord(value: unknown): value is VantaPrivateCoreOperatorSendProofRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as VantaPrivateCoreOperatorSendProofRecord).action === "send-proof" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).amount === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).backend === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).circuit === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).noteVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).proofVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).provingHashLane === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).publicInputCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).releaseDestination === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).verified === "boolean"
  );
}

function isSwapProofRecord(value: unknown): value is VantaPrivateCoreOperatorSwapProofRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as VantaPrivateCoreOperatorSwapProofRecord).action === "swap-proof" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).amount === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).backend === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).circuit === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).noteVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).proofVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).provingHashLane === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).publicInputCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).releaseDestination === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapProofRecord).verified === "boolean"
  );
}

function isSwapRecord(value: unknown): value is VantaPrivateCoreOperatorSwapRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).completedAt === "number" &&
    (((value as VantaPrivateCoreOperatorSwapRecord).executionQuoteReference === null ||
      (value as VantaPrivateCoreOperatorSwapRecord).executionQuoteReference === undefined) ||
      typeof (value as VantaPrivateCoreOperatorSwapRecord).executionQuoteReference === "string") &&
    (((value as VantaPrivateCoreOperatorSwapRecord).executionVenueLabel === null ||
      (value as VantaPrivateCoreOperatorSwapRecord).executionVenueLabel === undefined) ||
      typeof (value as VantaPrivateCoreOperatorSwapRecord).executionVenueLabel === "string") &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).inputAssetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).inputNullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).inputRoot === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).inputAmount === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).noteVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).outputAssetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).outputAmount === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).outputCommitment === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).publicInputCount === "number" &&
    (value as VantaPrivateCoreOperatorSwapRecord).resultingRootBasis === "client-declared" &&
    (((value as VantaPrivateCoreOperatorSwapRecord).resultingRoot === null ||
      (value as VantaPrivateCoreOperatorSwapRecord).resultingRoot === undefined) ||
      typeof (value as VantaPrivateCoreOperatorSwapRecord).resultingRoot === "string") &&
    typeof (value as VantaPrivateCoreOperatorSwapRecord).swapId === "string"
  );
}

function isSendRecord(value: unknown): value is VantaPrivateCoreOperatorSendRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).changeAmount === "string" &&
    (((value as VantaPrivateCoreOperatorSendRecord).changeCommitment === null ||
      (value as VantaPrivateCoreOperatorSendRecord).changeCommitment === undefined) ||
      typeof (value as VantaPrivateCoreOperatorSendRecord).changeCommitment === "string") &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).inputNullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).inputRoot === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).noteVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).publicInputCount === "number" &&
    (((value as VantaPrivateCoreOperatorSendRecord).releaseCandidateId === null ||
      (value as VantaPrivateCoreOperatorSendRecord).releaseCandidateId === undefined) ||
      typeof (value as VantaPrivateCoreOperatorSendRecord).releaseCandidateId === "string") &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).recipientCommitment === "string" &&
    (value as VantaPrivateCoreOperatorSendRecord).resultingRootBasis === "client-declared" &&
    (((value as VantaPrivateCoreOperatorSendRecord).resultingRoot === null ||
      (value as VantaPrivateCoreOperatorSendRecord).resultingRoot === undefined) ||
      typeof (value as VantaPrivateCoreOperatorSendRecord).resultingRoot === "string") &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).sendAmount === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).sendId === "string"
  );
}

function isReleaseRecord(value: unknown): value is VantaPrivateCoreOperatorReleaseRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).amount === "string" &&
    (value as VantaPrivateCoreOperatorReleaseRecord).authorizationBasis === "proof-backed-consume" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).consumedNoteId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).publicInputCount === "number" &&
    (((value as VantaPrivateCoreOperatorReleaseRecord).releaseCandidateId === null ||
      (value as VantaPrivateCoreOperatorReleaseRecord).releaseCandidateId === undefined) ||
      typeof (value as VantaPrivateCoreOperatorReleaseRecord).releaseCandidateId === "string") &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).releaseDestination === "string" &&
    (value as VantaPrivateCoreOperatorReleaseRecord).rootPolicy === "latest-registered-root" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).releasedAssetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).releasedAmount === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).requestId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).transitionNoteId === "string"
  );
}

function isLinkStatus(value: unknown): value is "linked" | "mismatch" | "unavailable" {
  return value === "linked" || value === "mismatch" || value === "unavailable";
}

function isBoundaryStatus(
  value: unknown,
): value is
  | "coherent"
  | "awaiting-current-root"
  | "root-registration-unlinked"
  | "send-root-registration-unlinked"
  | "send-root-output-mismatch"
  | "proof-send-unlinked"
  | "proof-consume-unlinked"
  | "proof-release-unlinked" {
  return (
    value === "coherent" ||
    value === "awaiting-current-root" ||
    value === "root-registration-unlinked" ||
    value === "send-root-registration-unlinked" ||
    value === "send-root-output-mismatch" ||
    value === "proof-send-unlinked" ||
    value === "proof-consume-unlinked" ||
    value === "proof-release-unlinked"
  );
}

function isSendResultingRootStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["sendResultingRootStatus"] {
  return (
    value === "unavailable" ||
    value === "missing" ||
    value === "current-root" ||
    value === "registered-stale" ||
    value === "downstream-consumed" ||
    value === "downstream-released" ||
    value === "unregistered"
  );
}

function isSendResultingRootRegistrationStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["sendResultingRootRegistrationStatus"] {
  return (
    value === "unavailable" ||
    value === "linked-recipient-output" ||
    value === "linked-change-output" ||
    value === "mismatch"
  );
}
