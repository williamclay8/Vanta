import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  VantaPrivateCoreLedger,
  buildVantaPrivateCoreUnshieldProofEnvelope,
  createVantaPrivateCoreOwnerKeypair,
  deriveVantaPrivateCoreSourceArtifactsFromHeldNote,
  deriveVantaPrivateCoreSourceArtifactsFromShieldArtifact,
  deriveVantaPrivateCoreSourceArtifactsFromUnshieldResult,
  summarizeVantaPrivateCoreUnshieldProofEnvelopeConsistency,
  summarizeVantaPrivateCoreUnshieldProofEnvelope,
  summarizeVantaPrivateCoreUnshieldProofEnvelopeVerification,
  type VantaPrivateCoreOwnerKeypair,
  type CiphertextPackageV0,
  type HeldNoteViewV0,
  type SendResultV0,
  type SendTransitionV0,
  type ShieldArtifactV0,
  type SwapResultV0,
  type SwapTransitionV0,
  type UnshieldProofEnvelopeV0,
  type UnshieldResultV0,
} from "@/zk/vantaPrivateCore";
import {
  buildVantaPrivateCoreUnshieldProofBoundary,
  compareVantaPrivateCoreSourceAndProvingArtifacts,
  deriveVantaPrivateCoreProvingArtifactsFromBoundary,
  summarizeVantaPrivateCoreProofBoundaryConfiguration,
  summarizeVantaPrivateCoreProofBoundaryCompatibility,
  summarizeVantaPrivateCoreProofBoundaryPublicInputs,
  summarizeVantaPrivateCoreProofBoundaryStatus,
  summarizeVantaPrivateCoreProofBoundaryWitness,
  summarizeVantaPrivateCoreSourceVsProvingHandoff,
  type VantaPrivateCoreUnshieldProofBoundaryV0,
} from "@/zk/vantaPrivateCoreUnshieldProof";
import {
  fetchVantaPrivateCoreOperatorStatus,
  fetchVantaPrivateCoreOperatorSnapshot,
  fetchVantaPrivateCoreOperatorShippingArtifact,
  registerVantaPrivateCoreOperatorRoot,
  requestVantaPrivateCoreOperatorConsume,
  requestVantaPrivateCoreOperatorProof,
  type VantaPrivateCoreConsumeOperatorResponse,
  type VantaPrivateCoreOperatorContractStateResponse,
  type VantaPrivateCoreOperatorConsumeRecord,
  type VantaPrivateCoreOperatorProofRecord,
  type VantaPrivateCoreOperatorReleaseRecord,
  type VantaPrivateCoreOperatorRootRecord,
  type VantaPrivateCoreOperatorSendRecord,
  type VantaPrivateCoreOperatorSendProofRecord,
  type VantaPrivateCoreOperatorSwapProofRecord,
  type VantaPrivateCoreOperatorSwapRecord,
  type VantaPrivateCoreOperatorSummaryStateResponse,
  type VantaPrivateCoreProofOperatorResponse,
} from "@/zk/vantaPrivateCoreOperatorClient";

export type PrivacyAssetKey = "VUSD" | "USDC" | "JTO" | "BONK";

const VANTA_PRIVATE_CORE_VUSD_ASSET_ID =
  "0x7675736400000000000000000000000000000000000000000000000000000000" as const;
const VANTA_PRIVATE_CORE_VUSD_DECIMALS = 6;
const VANTA_PRIVATE_CORE_SOL_ASSET_ID =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
const VANTA_PRIVATE_CORE_SOL_DECIMALS = 9;
const VANTA_PRIVATE_CORE_DEMO_RELEASE_DESTINATION =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as const;

function formatPrivateCoreAssetAmount(assetId: string, amount: bigint) {
  if (assetId === VANTA_PRIVATE_CORE_VUSD_ASSET_ID) {
    return `${formatBaseUnits(amount, VANTA_PRIVATE_CORE_VUSD_DECIMALS)} VUSD`;
  }

  if (assetId === VANTA_PRIVATE_CORE_SOL_ASSET_ID) {
    return `${formatBaseUnits(amount, VANTA_PRIVATE_CORE_SOL_DECIMALS)} SOL`;
  }

  return amount.toString(10);
}

export type RecentShieldContext = {
  asset: PrivacyAssetKey;
  amount: number;
  resultingShieldedBalance: number;
  source: "shield";
  depositSignature?: string;
  signature?: string;
  settlement?: "confirmed_deposit";
  timestamp: number;
  zkBridge?: {
    commitment: string;
    insertionIndex: number;
    root: string;
    source: "canonical_note_v1";
  };
};

type PrivacyFlowContextValue = {
  privateCoreOwner: VantaPrivateCoreOwnerKeypair;
  privateCoreRecentShield: VantaPrivateCoreShieldState | null;
  privateCoreHoldState: VantaPrivateCoreHoldState | null;
  privateCoreSendState: VantaPrivateCoreSendState | null;
  privateCoreSwapState: VantaPrivateCoreSwapState | null;
  privateCoreOperatorConsumes: VantaPrivateCoreOperatorConsumeRecord[];
  privateCoreOperatorConsumeError: string | null;
  privateCoreOperatorLatestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  privateCoreOperatorLatestConsumeProof: VantaPrivateCoreOperatorProofRecord | null;
  privateCoreOperatorLatestProof: VantaPrivateCoreOperatorProofRecord | null;
  privateCoreOperatorLatestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  privateCoreOperatorLatestReleaseProof: VantaPrivateCoreOperatorProofRecord | null;
  privateCoreOperatorCurrentRoot: string | null;
  privateCoreOperatorLatestRoot: VantaPrivateCoreOperatorRootRecord | null;
  privateCoreOperatorLatestSend: VantaPrivateCoreOperatorSendRecord | null;
  privateCoreOperatorLatestSendLinkedProof: VantaPrivateCoreOperatorSendProofRecord | null;
  privateCoreOperatorLatestSendProof: VantaPrivateCoreOperatorSendProofRecord | null;
  privateCoreOperatorLatestSwap: VantaPrivateCoreOperatorSwapRecord | null;
  privateCoreOperatorLatestSwapLinkedProof: VantaPrivateCoreOperatorSwapProofRecord | null;
  privateCoreOperatorLatestSwapProof: VantaPrivateCoreOperatorSwapProofRecord | null;
  privateCoreOperatorCurrentRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  privateCoreOperatorCurrentRootProofLinkStatus: string | null;
  privateCoreOperatorSendResultingRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  privateCoreOperatorSendResultingRootRecord: VantaPrivateCoreOperatorRootRecord | null;
  privateCoreOperatorSwapResultingRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  privateCoreOperatorSwapResultingRootRecord: VantaPrivateCoreOperatorRootRecord | null;
  privateCoreOperatorRawSendContinuityNote: string | null;
  privateCoreOperatorRawSendContinuityStatus: string | null;
  privateCoreOperatorRawSendBoundaryNote: string | null;
  privateCoreOperatorRawSendBoundaryStatus: string | null;
  privateCoreOperatorRawSendResultingRootNote: string | null;
  privateCoreOperatorRawSendResultingRootRegistrationNote: string | null;
  privateCoreOperatorRawSendResultingRootRegistrationStatus: string | null;
  privateCoreOperatorSendResultingRootProofLinkStatus: string | null;
  privateCoreOperatorRawSendResultingRootStatus: string | null;
  privateCoreOperatorRawSwapContinuityNote: string | null;
  privateCoreOperatorRawSwapContinuityStatus: string | null;
  privateCoreOperatorRawSwapBoundaryNote: string | null;
  privateCoreOperatorRawSwapBoundaryStatus: string | null;
  privateCoreOperatorRawSwapResultingRootNote: string | null;
  privateCoreOperatorRawSwapResultingRootRegistrationNote: string | null;
  privateCoreOperatorRawSwapResultingRootRegistrationStatus: string | null;
  privateCoreOperatorSwapResultingRootProofLinkStatus: string | null;
  privateCoreOperatorRawSwapResultingRootStatus: string | null;
  privateCoreOperatorRawBoundaryNote: string | null;
  privateCoreOperatorRawBoundaryStatus: string | null;
  privateCoreOperatorRawReleaseBoundaryNote: string | null;
  privateCoreOperatorRawReleaseBoundaryStatus: string | null;
  privateCoreOperatorRawRequiredLanesNote: string | null;
  privateCoreOperatorRawRequiredLanesStatus: string | null;
  privateCoreOperatorRawZkV1ShippingNote: string | null;
  privateCoreOperatorRawZkV1ShippingStatus: string | null;
  privateCoreOperatorRawZkV1FinishLineNote: string | null;
  privateCoreOperatorRawZkV1FinishLineStatus: string | null;
  privateCoreOperatorSupportedSendLaneKind: string | null;
  privateCoreOperatorSupportedSendLaneNote: string | null;
  privateCoreOperatorSupportedSendLaneStatus: string | null;
  privateCoreOperatorSupportedSendLaneVersion: number | null;
  privateCoreOperatorSupportedSendV1Decision: string | null;
  privateCoreOperatorSupportedSendV1DecisionNote: string | null;
  privateCoreOperatorSupportedUnshieldLaneKind: string | null;
  privateCoreOperatorSupportedUnshieldLaneNote: string | null;
  privateCoreOperatorSupportedUnshieldLaneStatus: string | null;
  privateCoreOperatorSupportedUnshieldLaneVersion: number | null;
  privateCoreOperatorSupportedUnshieldV1Decision: string | null;
  privateCoreOperatorSupportedUnshieldV1DecisionNote: string | null;
  privateCoreOperatorSupportedReleaseLaneKind: string | null;
  privateCoreOperatorSupportedReleaseLaneNote: string | null;
  privateCoreOperatorSupportedReleaseLaneStatus: string | null;
  privateCoreOperatorSupportedReleaseLaneVersion: number | null;
  privateCoreOperatorSupportedReleaseV1Decision: string | null;
  privateCoreOperatorSupportedReleaseV1DecisionNote: string | null;
  privateCoreOperatorSupportedSwapLaneKind: string | null;
  privateCoreOperatorSupportedSwapLaneNote: string | null;
  privateCoreOperatorSupportedSwapLaneStatus: string | null;
  privateCoreOperatorSupportedSwapLaneVersion: number | null;
  privateCoreOperatorSupportedSwapV1Decision: string | null;
  privateCoreOperatorSupportedSwapV1DecisionNote: string | null;
  privateCoreOperatorSupportedSwapV1Role: string | null;
  privateCoreOperatorSupportedSwapV1RoleNote: string | null;
  privateCoreOperatorSupportedSwapVenue: string | null;
  privateCoreOperatorSupportedSwapOutputModel: string | null;
  privateCoreOperatorSupportedSwapResultingRootBasis: string | null;
  privateCoreOperatorSupportedSwapInputRootPolicy: string | null;
  privateCoreOperatorSupportedSwapOutputRegistrationPolicy: string | null;
  privateCoreOperatorSupportedFlowKind: string | null;
  privateCoreOperatorSupportedFlowNote: string | null;
  privateCoreOperatorSupportedFlowStatus: string | null;
  privateCoreOperatorSupportedFlowVersion: number | null;
  privateCoreOperatorSupportedZkV1ScopeDecision: string | null;
  privateCoreOperatorSupportedZkV1ScopeNote: string | null;
  privateCoreOperatorSupportedZkV1RequiredLanes: string | null;
  privateCoreOperatorSupportedZkV1RequiredLanesNote: string | null;
  privateCoreOperatorSupportedAssetSymbol: string | null;
  privateCoreOperatorSupportedEnvironment: string | null;
  privateCoreOperatorSupportedNoteSchema: string | null;
  privateCoreOperatorSupportedNoteVersion: number | null;
  privateCoreOperatorSupportedRootRegistrationProvenance: string | null;
  privateCoreOperatorSupportedSendResultingRootBasis: string | null;
  privateCoreOperatorSupportedSendInputRootPolicy: string | null;
  privateCoreOperatorSupportedSendOutputRegistrationPolicy: string | null;
  privateCoreOperatorSupportedRecipientModel: string | null;
  privateCoreOperatorSupportedReleaseDestinationModel: string | null;
  privateCoreOperatorSupportedProofSystem: string | null;
  privateCoreOperatorSupportedUnshieldCircuit: string | null;
  privateCoreOperatorSupportedSendCircuit: string | null;
  privateCoreOperatorSupportedUnshieldMerkleDepth: number | null;
  privateCoreOperatorSupportedSendMerkleDepth: number | null;
  privateCoreOperatorSupportedReleaseAuthorizationBasis: string | null;
  privateCoreOperatorSupportedReleaseRootPolicy: string | null;
  privateCoreOperatorSupportedReleaseExecutionModel: string | null;
  privateCoreOperatorSupportedReleaseAtomicityModel: string | null;
  privateCoreOperatorSupportedReleasePersistenceModel: string | null;
  privateCoreOperatorOwnerAuthorizationMode: string | null;
  privateCoreOperatorOwnerAuthorizationDecision: string | null;
  privateCoreOperatorOwnerAuthorizationDecisionNote: string | null;
  privateCoreOperatorSourceArtifactTruthBasis: string | null;
  privateCoreOperatorProvingArtifactTruthBasis: string | null;
  privateCoreOperatorSourceProvingRelationship: string | null;
  privateCoreOperatorNullifierKeyMode: string | null;
  privateCoreOperatorProvingHashLane: string | null;
  privateCoreOperatorProofConsumeLinkStatus: string | null;
  privateCoreOperatorProofError: string | null;
  privateCoreOperatorProofs: VantaPrivateCoreOperatorProofRecord[];
  privateCoreOperatorProofSendLinkStatus: string | null;
  privateCoreOperatorProofSwapLinkStatus: string | null;
  privateCoreOperatorProofReleaseLinkStatus: string | null;
  privateCoreOperatorReleaseError: string | null;
  privateCoreOperatorReleases: VantaPrivateCoreOperatorReleaseRecord[];
  privateCoreOperatorRoots: VantaPrivateCoreOperatorRootRecord[];
  privateCoreOperatorSendError: string | null;
  privateCoreOperatorSends: VantaPrivateCoreOperatorSendRecord[];
  privateCoreOperatorSendProofError: string | null;
  privateCoreOperatorSendProofs: VantaPrivateCoreOperatorSendProofRecord[];
  privateCoreOperatorSwaps: VantaPrivateCoreOperatorSwapRecord[];
  privateCoreOperatorSwapProofs: VantaPrivateCoreOperatorSwapProofRecord[];
  privateCoreOperatorBoundaryPrimaryNote: string | null;
  privateCoreOperatorBoundaryStatusLabel: string | null;
  privateCoreOperatorContractMirrorPrimaryNote: string | null;
  privateCoreOperatorContractMirrorStatusLabel: string | null;
  privateCoreOperatorReleaseBoundaryPrimaryNote: string | null;
  privateCoreOperatorReleaseBoundaryStatusLabel: string | null;
  privateCoreOperatorRequiredLanesPrimaryNote: string | null;
  privateCoreOperatorRequiredLanesStatusLabel: string | null;
  privateCoreOperatorZkV1ShippingPrimaryNote: string | null;
  privateCoreOperatorZkV1ShippingStatusLabel: string | null;
  privateCoreOperatorZkV1FinishLinePrimaryNote: string | null;
  privateCoreOperatorZkV1FinishLineStatusLabel: string | null;
  privateCoreOperatorSendBoundaryPrimaryNote: string | null;
  privateCoreOperatorSendBoundaryStatusLabel: string | null;
  privateCoreOperatorSendContinuityPrimaryNote: string | null;
  privateCoreOperatorSendContinuityStatusLabel: string | null;
  privateCoreOperatorSwapBoundaryPrimaryNote: string | null;
  privateCoreOperatorSwapBoundaryStatusLabel: string | null;
  privateCoreOperatorSwapContinuityPrimaryNote: string | null;
  privateCoreOperatorSwapContinuityStatusLabel: string | null;
  privateCoreOperatorSwapResultingRootPrimaryNote: string | null;
  privateCoreOperatorSwapResultingRootRegistrationPrimaryNote: string | null;
  privateCoreOperatorSwapResultingRootRegistrationStatusLabel: string | null;
  privateCoreOperatorSwapResultingRootStatusLabel: string | null;
  privateCoreOperatorSendResultingRootPrimaryNote: string | null;
  privateCoreOperatorSendResultingRootRegistrationPrimaryNote: string | null;
  privateCoreOperatorSendResultingRootRegistrationStatusLabel: string | null;
  privateCoreOperatorSendResultingRootStatusLabel: string | null;
  privateCoreOperatorRootError: string | null;
  privateCoreOperatorRootRegistrationStatus: string | null;
  privateCoreOperatorRootCurrentnessLabel: string | null;
  privateCoreOperatorContractStateVersion: number | null;
  privateCoreOperatorContractVersion: number | null;
  privateCoreOperatorContractSummaryVersion: number | null;
  privateCoreOperatorStatusVersion: number | null;
  privateCoreOperatorStatusKind: string | null;
  privateCoreOperatorSnapshotVersion: number | null;
  privateCoreOperatorSnapshotKind: string | null;
  privateCoreOperatorSupportedStatusNote: string | null;
  privateCoreOperatorSupportedStatusTransport: string | null;
  privateCoreOperatorSupportedStatusEndpoint: string | null;
  privateCoreOperatorSupportedStatusGateVersion: number | null;
  privateCoreOperatorSupportedStatusGateKind: string | null;
  privateCoreOperatorSupportedStatusGateNote: string | null;
  privateCoreOperatorSupportedStatusGateTransport: string | null;
  privateCoreOperatorSupportedStatusGateEndpoint: string | null;
  privateCoreOperatorSupportedSnapshotGateVersion: number | null;
  privateCoreOperatorSupportedSnapshotGateKind: string | null;
  privateCoreOperatorSupportedSnapshotGateNote: string | null;
  privateCoreOperatorSupportedSnapshotGateTransport: string | null;
  privateCoreOperatorSupportedSnapshotGateEndpoint: string | null;
  privateCoreOperatorSupportedShippingDecisionGateVersion: number | null;
  privateCoreOperatorSupportedShippingDecisionGateKind: string | null;
  privateCoreOperatorSupportedShippingDecisionGateNote: string | null;
  privateCoreOperatorSupportedShippingDecisionGateTransport: string | null;
  privateCoreOperatorSupportedShippingDecisionGateEndpoint: string | null;
  privateCoreOperatorSupportedShippingDecisionTransport: string | null;
  privateCoreOperatorSupportedShippingDecisionEndpoint: string | null;
  privateCoreOperatorSupportedShippingArtifactGateVersion: number | null;
  privateCoreOperatorSupportedShippingArtifactGateKind: string | null;
  privateCoreOperatorSupportedShippingArtifactGateNote: string | null;
  privateCoreOperatorSupportedShippingArtifactGateTransport: string | null;
  privateCoreOperatorSupportedShippingArtifactGateEndpoint: string | null;
  privateCoreOperatorSupportedSnapshotNote: string | null;
  privateCoreOperatorSupportedSnapshotTransport: string | null;
  privateCoreOperatorSupportedSnapshotEndpoint: string | null;
  privateCoreOperatorSupportedShippingArtifactNote: string | null;
  privateCoreOperatorSupportedShippingArtifactTransport: string | null;
  privateCoreOperatorSupportedShippingArtifactEndpoint: string | null;
  privateCoreOperatorShippingArtifactVersion: number | null;
  privateCoreOperatorShippingArtifactKind: string | null;
  privateCoreOperatorShippingDecisionVersion: number | null;
  privateCoreOperatorShippingDecisionKind: string | null;
  privateCoreOperatorSupportedShippingDecisionNote: string | null;
  privateCoreOperatorSummaryUpdatedAt: number | null;
  privateCoreUnshieldState: VantaPrivateCoreUnshieldState | null;
  recentShield: RecentShieldContext | null;
  ensurePrivateCoreOperatorRootKnown: (args: {
    proofBoundary: VantaPrivateCoreUnshieldProofBoundaryV0;
    sourceArtifacts: ReturnType<typeof deriveVantaPrivateCoreSourceArtifactsFromHeldNote>;
  }) => Promise<void>;
  refreshPrivateCoreOperatorSummary: () => Promise<VantaPrivateCoreOperatorSummaryStateResponse>;
  previewPrivateCoreSendTransition: (transition: SendTransitionV0) => SendResultV0;
  previewPrivateCoreSwapTransition: (transition: SwapTransitionV0) => SwapResultV0;
  runPrivateCoreSendTransition: (transition: SendTransitionV0) => {
    nextHoldState: VantaPrivateCoreHoldState | null;
    nextShieldState: VantaPrivateCoreShieldState | null;
    result: SendResultV0;
  };
  runPrivateCoreSwapTransition: (
    transition: SwapTransitionV0,
    options?: {
      executionBasisLabel?: string;
      executionPrimaryNote?: string;
      executionVenueLabel?: string | null;
      executionQuoteReference?: string | null;
      livePathStatusLabel?: string;
      livePathPrimaryNote?: string;
      livePathPrimaryBlocker?: string | null;
    },
  ) => {
    nextHoldState: VantaPrivateCoreHoldState | null;
    nextShieldState: VantaPrivateCoreShieldState | null;
    result: SwapResultV0;
  };
  runPrivateCoreShield: (args: { amountDisplay: string; asset: PrivacyAssetKey }) => VantaPrivateCoreShieldState;
  runPrivateCoreUnshield: () => Promise<VantaPrivateCoreUnshieldState>;
  runPrivateCoreReplayAttempt: () => Promise<VantaPrivateCoreUnshieldState>;
  setPrivateCoreHoldState: (value: VantaPrivateCoreHoldState | null) => void;
  setPrivateCoreRecentShield: (value: VantaPrivateCoreShieldState | null) => void;
  setPrivateCoreUnshieldState: (value: VantaPrivateCoreUnshieldState | null) => void;
  setRecentShield: (value: RecentShieldContext | null) => void;
};

export type VantaPrivateCoreShieldState = {
  artifact: ShieldArtifactV0;
  encryptedPayload: CiphertextPackageV0;
  sourceNoteCommitment: string;
  sourcePayloadCommitment: string;
  sourceMerkleRoot: string;
  assetId: string;
  amount: string;
  noteType: string;
  noteVersion: number;
};

export type VantaPrivateCoreHoldState = {
  heldNote: HeldNoteViewV0;
  privateNoteRecovered: boolean;
  witnessAvailable: boolean;
  proofObservationMode: string;
  replayPreviewStatus: string;
  sourceWitnessRoot: string;
  sourceProofPreviewStatement: string;
  sourceProofPreviewVerifier: string;
  sourceProofPreviewCommitment: string;
  sourceProofPreviewRoot: string;
  sourceProofPreviewAssetId: string;
  sourceProofPreviewAmount: string;
  sourceProofPreviewLeafIndex: number;
  sourceProofPreviewNullifier: string;
  sourceProofPreviewStatusLabel: string;
  sourceProofPreviewConsistencyLabel: string;
  sourceProofPreviewCommitmentStatus: string;
  sourceProofPreviewRootStatus: string;
  sourceProofPreviewNullifierStatus: string;
  previewSourceLayerStatus: string;
  previewProvingBoundaryStatus: string;
  previewHandoffStatus: string;
  previewPrimaryHandoffNote: string;
  provingPreviewHashLane: string;
  provingPreviewNoteCommitment: string;
  provingPreviewMerkleLeaf: string;
  provingPreviewStateRoot: string;
  provingPreviewNullifier: string;
  provingPreviewConsumeContextTag: string | null;
  noteCommitmentComparisonStatus: string;
  merkleLeafComparisonStatus: string;
  stateRootComparisonStatus: string;
  nullifierComparisonStatus: string;
  consumeContextComparisonStatus: string;
  circuitReadinessLabel: string;
  proofBlockerCount: number;
  primaryProofBlocker: string | null;
  compatibilityNoteCount: number;
  primaryCompatibilityNote: string | null;
  proofBoundaryKind: string;
  proofBoundaryVersion: number;
  proofCircuit: string;
  proofBackend: string;
  proofMerkleDepth: number;
  ownerAuthorizationMode: string;
  nullifierKeyMode: string;
  proofReleaseDestination: string;
  proofAssetId: string;
  proofAmount: string;
  proofNoteVersion: number;
  proofNoteType: string;
  proofLeafIndex: number;
  proofPathDepth: number;
  noteSummary: string;
};

export type VantaPrivateCoreSendState = {
  recipientCommitment: string;
  recipientPayloadCommitment: string | null;
  recipientAmount: string;
  changeCommitment: string | null;
  changeAmount: string;
  resultingRoot: string | null;
  resultingRootStatusLabel: string;
  resultingRootPrimaryNote: string;
  recipientRecoveryStatus: string;
  recipientUnshieldStatus: string;
  residualStateStatus: string;
  noteSummary: string;
  observationMode: string;
};

export type VantaPrivateCoreSwapState = {
  outputCommitment: string;
  outputPayloadCommitment: string | null;
  outputAssetId: string;
  outputAmount: string;
  executionBasisLabel: string;
  executionPrimaryNote: string;
  executionVenueLabel: string | null;
  executionQuoteReference: string | null;
  livePathStatusLabel: string;
  livePathPrimaryNote: string;
  livePathPrimaryBlocker: string | null;
  resultingRoot: string | null;
  resultingRootStatusLabel: string;
  resultingRootPrimaryNote: string;
  outputRecoveryStatus: string;
  outputUnshieldStatus: string;
  boundaryStatusLabel: string;
  boundaryPrimaryNote: string;
  continuityStatusLabel: string;
  continuityPrimaryNote: string;
  noteSummary: string;
  observationMode: string;
};

export type VantaPrivateCoreUnshieldState = {
  sourceNullifier: string | null;
  proofEnvelope: UnshieldProofEnvelopeV0 | null;
  proofBoundary: VantaPrivateCoreUnshieldProofBoundaryV0 | null;
  proofObservationMode: string | null;
  sourceProofStatement: string | null;
  sourceProofVerifier: string | null;
  sourceProofCommitment: string | null;
  sourceProofRoot: string | null;
  sourceProofAssetId: string | null;
  sourceProofAmount: string | null;
  sourceProofLeafIndex: number | null;
  sourceProofVerified: boolean | null;
  sourceProofStatusLabel: string | null;
  sourceProofCommitmentStatus: string | null;
  sourceProofRootStatus: string | null;
  sourceProofNullifierStatus: string | null;
  sourceProofConsistencyLabel: string | null;
  sourceLayerStatus: string | null;
  provingBoundaryStatus: string | null;
  handoffStatus: string | null;
  primaryHandoffNote: string | null;
  provingHashLane: string | null;
  provingNoteCommitment: string | null;
  provingMerkleLeaf: string | null;
  provingStateRoot: string | null;
  provingNullifier: string | null;
  provingConsumeContextTag: string | null;
  noteCommitmentComparisonStatus: string | null;
  merkleLeafComparisonStatus: string | null;
  stateRootComparisonStatus: string | null;
  nullifierComparisonStatus: string | null;
  consumeContextComparisonStatus: string | null;
  circuitReadinessLabel: string | null;
  proofBlockerCount: number;
  primaryProofBlocker: string | null;
  compatibilityNoteCount: number;
  primaryCompatibilityNote: string | null;
  proofBoundaryKind: string | null;
  proofBoundaryVersion: number | null;
  proofCircuit: string | null;
  proofBackend: string | null;
  proofMerkleDepth: number | null;
  ownerAuthorizationMode: string | null;
  nullifierKeyMode: string | null;
  proofReleaseDestination: string | null;
  proofAssetId: string | null;
  proofAmount: string | null;
  proofNoteVersion: number | null;
  proofNoteType: string | null;
  proofLeafIndex: number | null;
  proofPathDepth: number | null;
  proofExecutionMode: string | null;
  proofExecutionStatus: string | null;
  proofFieldCount: number | null;
  proofPublicInputCount: number | null;
  operatorProofId: string | null;
  operatorReleaseRecorded: boolean | null;
  operatorReleaseRequestId: string | null;
  operatorReleaseTransitionNoteId: string | null;
  consumeSucceeded: boolean;
  replayRejected: boolean;
  errorMessage: string | null;
  result: UnshieldResultV0 | null;
};

const PrivacyFlowContext = createContext<PrivacyFlowContextValue | null>(null);

export function PrivacyFlowProvider({ children }: { children: ReactNode }) {
  const [privateCoreLedger] = useState(() => new VantaPrivateCoreLedger());
  const [privateCoreOwner] = useState(() => createVantaPrivateCoreOwnerKeypair());
  const [privateCoreRecentShield, setPrivateCoreRecentShield] = useState<VantaPrivateCoreShieldState | null>(null);
  const [privateCoreHoldState, setPrivateCoreHoldState] = useState<VantaPrivateCoreHoldState | null>(null);
  const [privateCoreLocalSendState, setPrivateCoreLocalSendState] = useState<VantaPrivateCoreSendState | null>(null);
  const [privateCoreLocalSwapState, setPrivateCoreLocalSwapState] = useState<VantaPrivateCoreSwapState | null>(null);
  const [privateCoreUnshieldState, setPrivateCoreUnshieldState] = useState<VantaPrivateCoreUnshieldState | null>(null);
  const [privateCoreOperatorConsumes, setPrivateCoreOperatorConsumes] = useState<
    VantaPrivateCoreOperatorConsumeRecord[]
  >([]);
  const [privateCoreOperatorConsumeError, setPrivateCoreOperatorConsumeError] = useState<string | null>(null);
  const [privateCoreOperatorLatestConsume, setPrivateCoreOperatorLatestConsume] =
    useState<VantaPrivateCoreOperatorConsumeRecord | null>(null);
  const [privateCoreOperatorLatestConsumeProof, setPrivateCoreOperatorLatestConsumeProof] =
    useState<VantaPrivateCoreOperatorProofRecord | null>(null);
  const [privateCoreOperatorLatestProof, setPrivateCoreOperatorLatestProof] =
    useState<VantaPrivateCoreOperatorProofRecord | null>(null);
  const [privateCoreOperatorLatestRelease, setPrivateCoreOperatorLatestRelease] =
    useState<VantaPrivateCoreOperatorReleaseRecord | null>(null);
  const [privateCoreOperatorLatestReleaseProof, setPrivateCoreOperatorLatestReleaseProof] =
    useState<VantaPrivateCoreOperatorProofRecord | null>(null);
  const [privateCoreOperatorCurrentRoot, setPrivateCoreOperatorCurrentRoot] = useState<string | null>(null);
  const [privateCoreOperatorLatestRoot, setPrivateCoreOperatorLatestRoot] =
    useState<VantaPrivateCoreOperatorRootRecord | null>(null);
  const [privateCoreOperatorLatestSend, setPrivateCoreOperatorLatestSend] =
    useState<VantaPrivateCoreOperatorSendRecord | null>(null);
  const [privateCoreOperatorLatestSendLinkedProof, setPrivateCoreOperatorLatestSendLinkedProof] =
    useState<VantaPrivateCoreOperatorSendProofRecord | null>(null);
  const [privateCoreOperatorLatestSendProof, setPrivateCoreOperatorLatestSendProof] =
    useState<VantaPrivateCoreOperatorSendProofRecord | null>(null);
  const [privateCoreOperatorLatestSwap, setPrivateCoreOperatorLatestSwap] =
    useState<VantaPrivateCoreOperatorSwapRecord | null>(null);
  const [privateCoreOperatorLatestSwapLinkedProof, setPrivateCoreOperatorLatestSwapLinkedProof] =
    useState<VantaPrivateCoreOperatorSwapProofRecord | null>(null);
  const [privateCoreOperatorLatestSwapProof, setPrivateCoreOperatorLatestSwapProof] =
    useState<VantaPrivateCoreOperatorSwapProofRecord | null>(null);
  const [privateCoreOperatorCurrentRootLinkedProof, setPrivateCoreOperatorCurrentRootLinkedProof] =
    useState<VantaPrivateCoreOperatorProofRecord | null>(null);
  const [privateCoreOperatorCurrentRootProofLinkStatus, setPrivateCoreOperatorCurrentRootProofLinkStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSendResultingRootLinkedProof, setPrivateCoreOperatorSendResultingRootLinkedProof] =
    useState<VantaPrivateCoreOperatorProofRecord | null>(null);
  const [privateCoreOperatorSendResultingRootRecord, setPrivateCoreOperatorSendResultingRootRecord] =
    useState<VantaPrivateCoreOperatorRootRecord | null>(null);
  const [privateCoreOperatorSwapResultingRootLinkedProof, setPrivateCoreOperatorSwapResultingRootLinkedProof] =
    useState<VantaPrivateCoreOperatorProofRecord | null>(null);
  const [privateCoreOperatorSwapResultingRootRecord, setPrivateCoreOperatorSwapResultingRootRecord] =
    useState<VantaPrivateCoreOperatorRootRecord | null>(null);
  const [privateCoreOperatorRawSendContinuityNote, setPrivateCoreOperatorRawSendContinuityNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSendContinuityStatus, setPrivateCoreOperatorRawSendContinuityStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSendBoundaryNote, setPrivateCoreOperatorRawSendBoundaryNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSendBoundaryStatus, setPrivateCoreOperatorRawSendBoundaryStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSendResultingRootNote, setPrivateCoreOperatorRawSendResultingRootNote] =
    useState<string | null>(null);
  const [
    privateCoreOperatorRawSendResultingRootRegistrationNote,
    setPrivateCoreOperatorRawSendResultingRootRegistrationNote,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorRawSendResultingRootRegistrationStatus,
    setPrivateCoreOperatorRawSendResultingRootRegistrationStatus,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSendResultingRootProofLinkStatus, setPrivateCoreOperatorSendResultingRootProofLinkStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSendResultingRootStatus, setPrivateCoreOperatorRawSendResultingRootStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSwapContinuityNote, setPrivateCoreOperatorRawSwapContinuityNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSwapContinuityStatus, setPrivateCoreOperatorRawSwapContinuityStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSwapBoundaryNote, setPrivateCoreOperatorRawSwapBoundaryNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSwapBoundaryStatus, setPrivateCoreOperatorRawSwapBoundaryStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawSwapResultingRootNote, setPrivateCoreOperatorRawSwapResultingRootNote] =
    useState<string | null>(null);
  const [
    privateCoreOperatorRawSwapResultingRootRegistrationNote,
    setPrivateCoreOperatorRawSwapResultingRootRegistrationNote,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorRawSwapResultingRootRegistrationStatus,
    setPrivateCoreOperatorRawSwapResultingRootRegistrationStatus,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSwapResultingRootProofLinkStatus,
    setPrivateCoreOperatorSwapResultingRootProofLinkStatus,
  ] = useState<string | null>(null);
  const [privateCoreOperatorRawSwapResultingRootStatus, setPrivateCoreOperatorRawSwapResultingRootStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawBoundaryNote, setPrivateCoreOperatorRawBoundaryNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawBoundaryStatus, setPrivateCoreOperatorRawBoundaryStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawReleaseBoundaryNote, setPrivateCoreOperatorRawReleaseBoundaryNote] =
    useState<string | null>(null);
  const [
    privateCoreOperatorRawReleaseBoundaryStatus,
    setPrivateCoreOperatorRawReleaseBoundaryStatus,
  ] = useState<string | null>(null);
  const [privateCoreOperatorRawRequiredLanesNote, setPrivateCoreOperatorRawRequiredLanesNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawRequiredLanesStatus, setPrivateCoreOperatorRawRequiredLanesStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawZkV1ShippingNote, setPrivateCoreOperatorRawZkV1ShippingNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawZkV1ShippingStatus, setPrivateCoreOperatorRawZkV1ShippingStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawShippingDecisionNote, setPrivateCoreOperatorRawShippingDecisionNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawShippingDecisionStatus, setPrivateCoreOperatorRawShippingDecisionStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorRawZkV1FinishLineNote, setPrivateCoreOperatorRawZkV1FinishLineNote] =
    useState<string | null>(null);
  const [
    privateCoreOperatorRawZkV1FinishLineStatus,
    setPrivateCoreOperatorRawZkV1FinishLineStatus,
  ] = useState<string | null>(null);
  const [privateCoreOperatorRawContractMirrorNote, setPrivateCoreOperatorRawContractMirrorNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawContractMirrorStatus, setPrivateCoreOperatorRawContractMirrorStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSendLaneKind, setPrivateCoreOperatorSupportedSendLaneKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSendLaneNote, setPrivateCoreOperatorSupportedSendLaneNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSendLaneStatus, setPrivateCoreOperatorSupportedSendLaneStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSendLaneVersion, setPrivateCoreOperatorSupportedSendLaneVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorSupportedSendV1Decision, setPrivateCoreOperatorSupportedSendV1Decision] =
    useState<string | null>(null);
  const [
    privateCoreOperatorSupportedSendV1DecisionNote,
    setPrivateCoreOperatorSupportedSendV1DecisionNote,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedUnshieldLaneKind, setPrivateCoreOperatorSupportedUnshieldLaneKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedUnshieldLaneNote, setPrivateCoreOperatorSupportedUnshieldLaneNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedUnshieldLaneStatus, setPrivateCoreOperatorSupportedUnshieldLaneStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedUnshieldLaneVersion, setPrivateCoreOperatorSupportedUnshieldLaneVersion] =
    useState<number | null>(null);
  const [
    privateCoreOperatorSupportedUnshieldV1Decision,
    setPrivateCoreOperatorSupportedUnshieldV1Decision,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedUnshieldV1DecisionNote,
    setPrivateCoreOperatorSupportedUnshieldV1DecisionNote,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedReleaseLaneKind, setPrivateCoreOperatorSupportedReleaseLaneKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedReleaseLaneNote, setPrivateCoreOperatorSupportedReleaseLaneNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedReleaseLaneStatus, setPrivateCoreOperatorSupportedReleaseLaneStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedReleaseLaneVersion, setPrivateCoreOperatorSupportedReleaseLaneVersion] =
    useState<number | null>(null);
  const [
    privateCoreOperatorSupportedReleaseV1Decision,
    setPrivateCoreOperatorSupportedReleaseV1Decision,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedReleaseV1DecisionNote,
    setPrivateCoreOperatorSupportedReleaseV1DecisionNote,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedSwapLaneKind, setPrivateCoreOperatorSupportedSwapLaneKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSwapLaneNote, setPrivateCoreOperatorSupportedSwapLaneNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSwapLaneStatus, setPrivateCoreOperatorSupportedSwapLaneStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSwapLaneVersion, setPrivateCoreOperatorSupportedSwapLaneVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorSupportedSwapV1Decision, setPrivateCoreOperatorSupportedSwapV1Decision] =
    useState<string | null>(null);
  const [
    privateCoreOperatorSupportedSwapV1DecisionNote,
    setPrivateCoreOperatorSupportedSwapV1DecisionNote,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedSwapV1Role, setPrivateCoreOperatorSupportedSwapV1Role] =
    useState<string | null>(null);
  const [
    privateCoreOperatorSupportedSwapV1RoleNote,
    setPrivateCoreOperatorSupportedSwapV1RoleNote,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedSwapVenue, setPrivateCoreOperatorSupportedSwapVenue] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSwapOutputModel, setPrivateCoreOperatorSupportedSwapOutputModel] =
    useState<string | null>(null);
  const [
    privateCoreOperatorSupportedSwapResultingRootBasis,
    setPrivateCoreOperatorSupportedSwapResultingRootBasis,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedSwapInputRootPolicy,
    setPrivateCoreOperatorSupportedSwapInputRootPolicy,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedSwapOutputRegistrationPolicy,
    setPrivateCoreOperatorSupportedSwapOutputRegistrationPolicy,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedFlowKind, setPrivateCoreOperatorSupportedFlowKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedFlowNote, setPrivateCoreOperatorSupportedFlowNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedFlowStatus, setPrivateCoreOperatorSupportedFlowStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedFlowVersion, setPrivateCoreOperatorSupportedFlowVersion] =
    useState<number | null>(null);
  const [
    privateCoreOperatorSupportedZkV1ScopeDecision,
    setPrivateCoreOperatorSupportedZkV1ScopeDecision,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedZkV1ScopeNote, setPrivateCoreOperatorSupportedZkV1ScopeNote] =
    useState<string | null>(null);
  const [
    privateCoreOperatorSupportedZkV1RequiredLanes,
    setPrivateCoreOperatorSupportedZkV1RequiredLanes,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedZkV1RequiredLanesNote,
    setPrivateCoreOperatorSupportedZkV1RequiredLanesNote,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedAssetSymbol, setPrivateCoreOperatorSupportedAssetSymbol] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedEnvironment, setPrivateCoreOperatorSupportedEnvironment] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedNoteSchema, setPrivateCoreOperatorSupportedNoteSchema] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedNoteVersion, setPrivateCoreOperatorSupportedNoteVersion] =
    useState<number | null>(null);
  const [
    privateCoreOperatorSupportedRootRegistrationProvenance,
    setPrivateCoreOperatorSupportedRootRegistrationProvenance,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedSendResultingRootBasis,
    setPrivateCoreOperatorSupportedSendResultingRootBasis,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedSendInputRootPolicy,
    setPrivateCoreOperatorSupportedSendInputRootPolicy,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedSendOutputRegistrationPolicy,
    setPrivateCoreOperatorSupportedSendOutputRegistrationPolicy,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedRecipientModel, setPrivateCoreOperatorSupportedRecipientModel] =
    useState<string | null>(null);
  const [
    privateCoreOperatorSupportedReleaseDestinationModel,
    setPrivateCoreOperatorSupportedReleaseDestinationModel,
  ] = useState<string | null>(null);
  const [privateCoreOperatorSupportedProofSystem, setPrivateCoreOperatorSupportedProofSystem] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedUnshieldCircuit, setPrivateCoreOperatorSupportedUnshieldCircuit] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSendCircuit, setPrivateCoreOperatorSupportedSendCircuit] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedUnshieldMerkleDepth, setPrivateCoreOperatorSupportedUnshieldMerkleDepth] =
    useState<number | null>(null);
  const [privateCoreOperatorSupportedSendMerkleDepth, setPrivateCoreOperatorSupportedSendMerkleDepth] =
    useState<number | null>(null);
  const [
    privateCoreOperatorSupportedReleaseAuthorizationBasis,
    setPrivateCoreOperatorSupportedReleaseAuthorizationBasis,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedReleaseRootPolicy,
    setPrivateCoreOperatorSupportedReleaseRootPolicy,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedReleaseExecutionModel,
    setPrivateCoreOperatorSupportedReleaseExecutionModel,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedReleaseAtomicityModel,
    setPrivateCoreOperatorSupportedReleaseAtomicityModel,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSupportedReleasePersistenceModel,
    setPrivateCoreOperatorSupportedReleasePersistenceModel,
  ] = useState<string | null>(null);
  const [privateCoreOperatorOwnerAuthorizationMode, setPrivateCoreOperatorOwnerAuthorizationMode] =
    useState<string | null>(null);
  const [
    privateCoreOperatorOwnerAuthorizationDecision,
    setPrivateCoreOperatorOwnerAuthorizationDecision,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorOwnerAuthorizationDecisionNote,
    setPrivateCoreOperatorOwnerAuthorizationDecisionNote,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSourceArtifactTruthBasis,
    setPrivateCoreOperatorSourceArtifactTruthBasis,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorProvingArtifactTruthBasis,
    setPrivateCoreOperatorProvingArtifactTruthBasis,
  ] = useState<string | null>(null);
  const [
    privateCoreOperatorSourceProvingRelationship,
    setPrivateCoreOperatorSourceProvingRelationship,
  ] = useState<string | null>(null);
  const [privateCoreOperatorNullifierKeyMode, setPrivateCoreOperatorNullifierKeyMode] =
    useState<string | null>(null);
  const [privateCoreOperatorProvingHashLane, setPrivateCoreOperatorProvingHashLane] =
    useState<string | null>(null);
  const [privateCoreOperatorProofConsumeLinkStatus, setPrivateCoreOperatorProofConsumeLinkStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorProofError, setPrivateCoreOperatorProofError] = useState<string | null>(null);
  const [privateCoreOperatorProofs, setPrivateCoreOperatorProofs] = useState<
    VantaPrivateCoreOperatorProofRecord[]
  >([]);
  const [privateCoreOperatorProofSendLinkStatus, setPrivateCoreOperatorProofSendLinkStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorProofSwapLinkStatus, setPrivateCoreOperatorProofSwapLinkStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorProofReleaseLinkStatus, setPrivateCoreOperatorProofReleaseLinkStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorReleaseError, setPrivateCoreOperatorReleaseError] = useState<string | null>(null);
  const [privateCoreOperatorReleases, setPrivateCoreOperatorReleases] = useState<
    VantaPrivateCoreOperatorReleaseRecord[]
  >([]);
  const [privateCoreOperatorSendError, setPrivateCoreOperatorSendError] = useState<string | null>(null);
  const [privateCoreOperatorSends, setPrivateCoreOperatorSends] = useState<
    VantaPrivateCoreOperatorSendRecord[]
  >([]);
  const [privateCoreOperatorSendProofError, setPrivateCoreOperatorSendProofError] = useState<string | null>(null);
  const [privateCoreOperatorSendProofs, setPrivateCoreOperatorSendProofs] = useState<
    VantaPrivateCoreOperatorSendProofRecord[]
  >([]);
  const [privateCoreOperatorSwaps, setPrivateCoreOperatorSwaps] = useState<
    VantaPrivateCoreOperatorSwapRecord[]
  >([]);
  const [privateCoreOperatorSwapProofs, setPrivateCoreOperatorSwapProofs] = useState<
    VantaPrivateCoreOperatorSwapProofRecord[]
  >([]);
  const [privateCoreOperatorRoots, setPrivateCoreOperatorRoots] = useState<
    VantaPrivateCoreOperatorRootRecord[]
  >([]);
  const [privateCoreOperatorRootError, setPrivateCoreOperatorRootError] = useState<string | null>(null);
  const [privateCoreOperatorRootRegistrationStatus, setPrivateCoreOperatorRootRegistrationStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorContractStateVersion, setPrivateCoreOperatorContractStateVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorContractVersion, setPrivateCoreOperatorContractVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorContractSummaryVersion, setPrivateCoreOperatorContractSummaryVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorStatusVersion, setPrivateCoreOperatorStatusVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorStatusKind, setPrivateCoreOperatorStatusKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSnapshotVersion, setPrivateCoreOperatorSnapshotVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorSnapshotKind, setPrivateCoreOperatorSnapshotKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedStatusNote, setPrivateCoreOperatorSupportedStatusNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedStatusTransport, setPrivateCoreOperatorSupportedStatusTransport] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedStatusEndpoint, setPrivateCoreOperatorSupportedStatusEndpoint] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedStatusGateVersion, setPrivateCoreOperatorSupportedStatusGateVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorSupportedStatusGateKind, setPrivateCoreOperatorSupportedStatusGateKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedStatusGateNote, setPrivateCoreOperatorSupportedStatusGateNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedStatusGateTransport, setPrivateCoreOperatorSupportedStatusGateTransport] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedStatusGateEndpoint, setPrivateCoreOperatorSupportedStatusGateEndpoint] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSnapshotGateVersion, setPrivateCoreOperatorSupportedSnapshotGateVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorSupportedSnapshotGateKind, setPrivateCoreOperatorSupportedSnapshotGateKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSnapshotGateNote, setPrivateCoreOperatorSupportedSnapshotGateNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSnapshotGateTransport, setPrivateCoreOperatorSupportedSnapshotGateTransport] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSnapshotGateEndpoint, setPrivateCoreOperatorSupportedSnapshotGateEndpoint] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingDecisionGateVersion, setPrivateCoreOperatorSupportedShippingDecisionGateVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorSupportedShippingDecisionGateKind, setPrivateCoreOperatorSupportedShippingDecisionGateKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingDecisionGateNote, setPrivateCoreOperatorSupportedShippingDecisionGateNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingDecisionGateTransport, setPrivateCoreOperatorSupportedShippingDecisionGateTransport] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingDecisionGateEndpoint, setPrivateCoreOperatorSupportedShippingDecisionGateEndpoint] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingDecisionTransport, setPrivateCoreOperatorSupportedShippingDecisionTransport] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingDecisionEndpoint, setPrivateCoreOperatorSupportedShippingDecisionEndpoint] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingArtifactGateVersion, setPrivateCoreOperatorSupportedShippingArtifactGateVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorSupportedShippingArtifactGateKind, setPrivateCoreOperatorSupportedShippingArtifactGateKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingArtifactGateNote, setPrivateCoreOperatorSupportedShippingArtifactGateNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingArtifactGateTransport, setPrivateCoreOperatorSupportedShippingArtifactGateTransport] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingArtifactGateEndpoint, setPrivateCoreOperatorSupportedShippingArtifactGateEndpoint] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSnapshotNote, setPrivateCoreOperatorSupportedSnapshotNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSnapshotTransport, setPrivateCoreOperatorSupportedSnapshotTransport] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSnapshotEndpoint, setPrivateCoreOperatorSupportedSnapshotEndpoint] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingArtifactNote, setPrivateCoreOperatorSupportedShippingArtifactNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingArtifactTransport, setPrivateCoreOperatorSupportedShippingArtifactTransport] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingArtifactEndpoint, setPrivateCoreOperatorSupportedShippingArtifactEndpoint] =
    useState<string | null>(null);
  const [privateCoreOperatorShippingArtifactVersion, setPrivateCoreOperatorShippingArtifactVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorShippingArtifactKind, setPrivateCoreOperatorShippingArtifactKind] =
    useState<string | null>(null);
  const [privateCoreOperatorShippingDecisionVersion, setPrivateCoreOperatorShippingDecisionVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorShippingDecisionKind, setPrivateCoreOperatorShippingDecisionKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedShippingDecisionNote, setPrivateCoreOperatorSupportedShippingDecisionNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSummaryUpdatedAt, setPrivateCoreOperatorSummaryUpdatedAt] =
    useState<number | null>(null);
  const [recentShield, setRecentShield] = useState<RecentShieldContext | null>(null);

  const refreshPrivateCoreOperatorSummary = useCallback(async () => {
    const [statusState, snapshotState, shippingArtifactState] = await Promise.all([
      fetchVantaPrivateCoreOperatorStatus(),
      fetchVantaPrivateCoreOperatorSnapshot(),
      fetchVantaPrivateCoreOperatorShippingArtifact(),
    ]);
    const contractState = snapshotState.contract;
    const summaryState = statusState.summary;
    const shippingDecisionState = statusState.shippingDecision;
    setPrivateCoreOperatorStatusVersion(statusState.statusVersion);
    setPrivateCoreOperatorStatusKind(statusState.statusKind);
    applyPrivateCoreOperatorContractState({
      contractState,
      setPrivateCoreOperatorContractStateVersion,
      setPrivateCoreOperatorContractVersion,
      setPrivateCoreOperatorContractSummaryVersion,
      setPrivateCoreOperatorSupportedSendLaneKind,
      setPrivateCoreOperatorSupportedSendLaneNote,
      setPrivateCoreOperatorSupportedSendLaneStatus,
      setPrivateCoreOperatorSupportedSendLaneVersion,
      setPrivateCoreOperatorSupportedSendV1Decision,
      setPrivateCoreOperatorSupportedSendV1DecisionNote,
      setPrivateCoreOperatorSupportedUnshieldLaneKind,
      setPrivateCoreOperatorSupportedUnshieldLaneNote,
      setPrivateCoreOperatorSupportedUnshieldLaneStatus,
      setPrivateCoreOperatorSupportedUnshieldLaneVersion,
      setPrivateCoreOperatorSupportedUnshieldV1Decision,
      setPrivateCoreOperatorSupportedUnshieldV1DecisionNote,
      setPrivateCoreOperatorSupportedReleaseLaneKind,
      setPrivateCoreOperatorSupportedReleaseLaneNote,
      setPrivateCoreOperatorSupportedReleaseLaneStatus,
      setPrivateCoreOperatorSupportedReleaseLaneVersion,
      setPrivateCoreOperatorSupportedReleaseV1Decision,
      setPrivateCoreOperatorSupportedReleaseV1DecisionNote,
      setPrivateCoreOperatorSupportedSwapLaneKind,
      setPrivateCoreOperatorSupportedSwapLaneNote,
      setPrivateCoreOperatorSupportedSwapLaneStatus,
      setPrivateCoreOperatorSupportedSwapLaneVersion,
      setPrivateCoreOperatorSupportedSwapV1Decision,
      setPrivateCoreOperatorSupportedSwapV1DecisionNote,
      setPrivateCoreOperatorSupportedSwapV1Role,
      setPrivateCoreOperatorSupportedSwapV1RoleNote,
      setPrivateCoreOperatorSupportedSwapVenue,
      setPrivateCoreOperatorSupportedSwapOutputModel,
      setPrivateCoreOperatorSupportedSwapResultingRootBasis,
      setPrivateCoreOperatorSupportedSwapInputRootPolicy,
      setPrivateCoreOperatorSupportedSwapOutputRegistrationPolicy,
      setPrivateCoreOperatorSupportedFlowKind,
      setPrivateCoreOperatorSupportedFlowNote,
      setPrivateCoreOperatorSupportedFlowStatus,
      setPrivateCoreOperatorSupportedFlowVersion,
      setPrivateCoreOperatorSupportedZkV1ScopeDecision,
      setPrivateCoreOperatorSupportedZkV1ScopeNote,
      setPrivateCoreOperatorSupportedZkV1RequiredLanes,
      setPrivateCoreOperatorSupportedZkV1RequiredLanesNote,
      setPrivateCoreOperatorSupportedAssetSymbol,
      setPrivateCoreOperatorSupportedEnvironment,
      setPrivateCoreOperatorSupportedNoteSchema,
      setPrivateCoreOperatorSupportedNoteVersion,
      setPrivateCoreOperatorSupportedRootRegistrationProvenance,
      setPrivateCoreOperatorSupportedSendResultingRootBasis,
      setPrivateCoreOperatorSupportedSendInputRootPolicy,
      setPrivateCoreOperatorSupportedSendOutputRegistrationPolicy,
      setPrivateCoreOperatorSupportedStatusNote,
      setPrivateCoreOperatorSupportedStatusTransport,
      setPrivateCoreOperatorSupportedStatusEndpoint,
      setPrivateCoreOperatorSupportedStatusGateVersion,
      setPrivateCoreOperatorSupportedStatusGateKind,
      setPrivateCoreOperatorSupportedStatusGateNote,
      setPrivateCoreOperatorSupportedStatusGateTransport,
      setPrivateCoreOperatorSupportedStatusGateEndpoint,
      setPrivateCoreOperatorSupportedSnapshotGateVersion,
      setPrivateCoreOperatorSupportedSnapshotGateKind,
      setPrivateCoreOperatorSupportedSnapshotGateNote,
      setPrivateCoreOperatorSupportedSnapshotGateTransport,
      setPrivateCoreOperatorSupportedSnapshotGateEndpoint,
      setPrivateCoreOperatorSupportedShippingDecisionGateVersion,
      setPrivateCoreOperatorSupportedShippingDecisionGateKind,
      setPrivateCoreOperatorSupportedShippingDecisionGateNote,
      setPrivateCoreOperatorSupportedShippingDecisionGateTransport,
      setPrivateCoreOperatorSupportedShippingDecisionGateEndpoint,
      setPrivateCoreOperatorSupportedShippingDecisionTransport,
      setPrivateCoreOperatorSupportedShippingDecisionEndpoint,
      setPrivateCoreOperatorSupportedShippingArtifactGateVersion,
      setPrivateCoreOperatorSupportedShippingArtifactGateKind,
      setPrivateCoreOperatorSupportedShippingArtifactGateNote,
      setPrivateCoreOperatorSupportedShippingArtifactGateTransport,
      setPrivateCoreOperatorSupportedShippingArtifactGateEndpoint,
      setPrivateCoreOperatorSupportedSnapshotNote,
      setPrivateCoreOperatorSupportedSnapshotTransport,
      setPrivateCoreOperatorSupportedSnapshotEndpoint,
      setPrivateCoreOperatorSupportedShippingArtifactNote,
      setPrivateCoreOperatorSupportedShippingArtifactTransport,
      setPrivateCoreOperatorSupportedShippingArtifactEndpoint,
      setPrivateCoreOperatorSupportedRecipientModel,
      setPrivateCoreOperatorSupportedReleaseDestinationModel,
      setPrivateCoreOperatorSupportedProofSystem,
      setPrivateCoreOperatorSupportedUnshieldCircuit,
      setPrivateCoreOperatorSupportedSendCircuit,
      setPrivateCoreOperatorSupportedUnshieldMerkleDepth,
      setPrivateCoreOperatorSupportedSendMerkleDepth,
      setPrivateCoreOperatorSupportedReleaseAuthorizationBasis,
      setPrivateCoreOperatorSupportedReleaseRootPolicy,
      setPrivateCoreOperatorSupportedReleaseExecutionModel,
      setPrivateCoreOperatorSupportedReleaseAtomicityModel,
      setPrivateCoreOperatorSupportedReleasePersistenceModel,
      setPrivateCoreOperatorSupportedShippingDecisionNote,
      setPrivateCoreOperatorOwnerAuthorizationMode,
      setPrivateCoreOperatorOwnerAuthorizationDecision,
      setPrivateCoreOperatorOwnerAuthorizationDecisionNote,
      setPrivateCoreOperatorSourceArtifactTruthBasis,
      setPrivateCoreOperatorProvingArtifactTruthBasis,
      setPrivateCoreOperatorSourceProvingRelationship,
      setPrivateCoreOperatorNullifierKeyMode,
      setPrivateCoreOperatorProvingHashLane,
    });
    applyPrivateCoreOperatorSummaryState({
      summaryState,
      setPrivateCoreOperatorCurrentRoot,
      setPrivateCoreOperatorLatestConsume,
      setPrivateCoreOperatorLatestConsumeProof,
      setPrivateCoreOperatorLatestProof,
      setPrivateCoreOperatorLatestRelease,
      setPrivateCoreOperatorLatestReleaseProof,
      setPrivateCoreOperatorLatestRoot,
      setPrivateCoreOperatorLatestSend,
      setPrivateCoreOperatorLatestSendLinkedProof,
      setPrivateCoreOperatorLatestSwap,
      setPrivateCoreOperatorLatestSwapLinkedProof,
      setPrivateCoreOperatorCurrentRootProofLinkStatus,
      setPrivateCoreOperatorCurrentRootLinkedProof,
      setPrivateCoreOperatorSwapResultingRootLinkedProof,
      setPrivateCoreOperatorSwapResultingRootRecord,
      setPrivateCoreOperatorRawSendContinuityNote,
      setPrivateCoreOperatorRawSendContinuityStatus,
      setPrivateCoreOperatorRawSendBoundaryNote,
      setPrivateCoreOperatorRawSendBoundaryStatus,
      setPrivateCoreOperatorRawSendResultingRootNote,
      setPrivateCoreOperatorRawSendResultingRootRegistrationNote,
      setPrivateCoreOperatorRawSendResultingRootRegistrationStatus,
      setPrivateCoreOperatorSendResultingRootLinkedProof,
      setPrivateCoreOperatorSendResultingRootRecord,
      setPrivateCoreOperatorSendResultingRootProofLinkStatus,
      setPrivateCoreOperatorRawSendResultingRootStatus,
      setPrivateCoreOperatorRawSwapContinuityNote,
      setPrivateCoreOperatorRawSwapContinuityStatus,
      setPrivateCoreOperatorRawSwapBoundaryNote,
      setPrivateCoreOperatorRawSwapBoundaryStatus,
      setPrivateCoreOperatorRawSwapResultingRootNote,
      setPrivateCoreOperatorRawSwapResultingRootRegistrationNote,
      setPrivateCoreOperatorRawSwapResultingRootRegistrationStatus,
      setPrivateCoreOperatorSwapResultingRootProofLinkStatus,
      setPrivateCoreOperatorRawSwapResultingRootStatus,
      setPrivateCoreOperatorRawBoundaryNote,
      setPrivateCoreOperatorRawBoundaryStatus,
      setPrivateCoreOperatorRawReleaseBoundaryNote,
      setPrivateCoreOperatorRawReleaseBoundaryStatus,
      setPrivateCoreOperatorRawRequiredLanesNote,
      setPrivateCoreOperatorRawRequiredLanesStatus,
      setPrivateCoreOperatorRawZkV1ShippingNote,
      setPrivateCoreOperatorRawZkV1ShippingStatus,
      setPrivateCoreOperatorRawContractMirrorNote,
      setPrivateCoreOperatorRawContractMirrorStatus,
      setPrivateCoreOperatorRawZkV1FinishLineNote,
      setPrivateCoreOperatorRawZkV1FinishLineStatus,
      setPrivateCoreOperatorConsumes,
      setPrivateCoreOperatorProofConsumeLinkStatus,
      setPrivateCoreOperatorProofs,
      setPrivateCoreOperatorProofSendLinkStatus,
      setPrivateCoreOperatorProofSwapLinkStatus,
      setPrivateCoreOperatorProofReleaseLinkStatus,
      setPrivateCoreOperatorReleases,
      setPrivateCoreOperatorRoots,
      setPrivateCoreOperatorSends,
      setPrivateCoreOperatorLatestSendProof,
      setPrivateCoreOperatorSendProofs,
      setPrivateCoreOperatorLatestSwapProof,
      setPrivateCoreOperatorSwaps,
      setPrivateCoreOperatorSwapProofs,
    });
    setPrivateCoreOperatorSnapshotVersion(snapshotState.snapshotVersion);
    setPrivateCoreOperatorSnapshotKind(snapshotState.snapshotKind);
    setPrivateCoreOperatorShippingArtifactVersion(shippingArtifactState.artifactVersion);
    setPrivateCoreOperatorShippingArtifactKind(shippingArtifactState.artifactKind);
    setPrivateCoreOperatorShippingDecisionVersion(shippingDecisionState.decisionVersion);
    setPrivateCoreOperatorShippingDecisionKind(shippingDecisionState.decisionKind);
    setPrivateCoreOperatorRawShippingDecisionNote(shippingDecisionState.decisionNote);
    setPrivateCoreOperatorRawShippingDecisionStatus(shippingDecisionState.decisionStatus);
    setPrivateCoreOperatorConsumeError(null);
    setPrivateCoreOperatorProofError(null);
    setPrivateCoreOperatorReleaseError(null);
    setPrivateCoreOperatorRootError(null);
    setPrivateCoreOperatorSendError(null);
    setPrivateCoreOperatorSendProofError(null);
    setPrivateCoreOperatorSummaryUpdatedAt(snapshotState.shipping.summaryGenerated);
    return summaryState;
  }, []);

  const privateCoreOperatorSendResultingRootSummary = useMemo(
    () =>
      summarizePrivateCoreOperatorSendResultingRootStatus({
        latestSend: privateCoreOperatorLatestSend,
        rawNote: privateCoreOperatorRawSendResultingRootNote,
        rawStatus: privateCoreOperatorRawSendResultingRootStatus,
      }),
    [
      privateCoreOperatorLatestSend,
      privateCoreOperatorRawSendResultingRootNote,
      privateCoreOperatorRawSendResultingRootStatus,
    ],
  );
  const privateCoreOperatorSendContinuitySummary = useMemo(
    () =>
      summarizePrivateCoreOperatorSendContinuityStatus({
        rawNote: privateCoreOperatorRawSendContinuityNote,
        rawStatus: privateCoreOperatorRawSendContinuityStatus,
      }),
    [privateCoreOperatorRawSendContinuityNote, privateCoreOperatorRawSendContinuityStatus],
  );
  const privateCoreOperatorSendBoundarySummary = useMemo(
    () =>
      summarizePrivateCoreOperatorSendBoundaryStatus({
        rawNote: privateCoreOperatorRawSendBoundaryNote,
        rawStatus: privateCoreOperatorRawSendBoundaryStatus,
      }),
    [privateCoreOperatorRawSendBoundaryNote, privateCoreOperatorRawSendBoundaryStatus],
  );
  const privateCoreOperatorSendResultingRootRegistrationSummary = useMemo(
    () =>
      summarizePrivateCoreOperatorSendResultingRootRegistration({
        rawNote: privateCoreOperatorRawSendResultingRootRegistrationNote,
        rawStatus: privateCoreOperatorRawSendResultingRootRegistrationStatus,
      }),
    [
      privateCoreOperatorRawSendResultingRootRegistrationNote,
      privateCoreOperatorRawSendResultingRootRegistrationStatus,
    ],
  );
  const privateCoreOperatorSwapResultingRootSummary = useMemo(
    () =>
      summarizePrivateCoreOperatorSwapResultingRootStatus({
        latestSwap: privateCoreOperatorLatestSwap,
        rawNote: privateCoreOperatorRawSwapResultingRootNote,
        rawStatus: privateCoreOperatorRawSwapResultingRootStatus,
      }),
    [
      privateCoreOperatorLatestSwap,
      privateCoreOperatorRawSwapResultingRootNote,
      privateCoreOperatorRawSwapResultingRootStatus,
    ],
  );
  const privateCoreOperatorSwapContinuitySummary = useMemo(
    () =>
      summarizePrivateCoreOperatorSwapContinuityStatus({
        rawNote: privateCoreOperatorRawSwapContinuityNote,
        rawStatus: privateCoreOperatorRawSwapContinuityStatus,
      }),
    [privateCoreOperatorRawSwapContinuityNote, privateCoreOperatorRawSwapContinuityStatus],
  );
  const privateCoreOperatorSwapBoundarySummary = useMemo(
    () =>
      summarizePrivateCoreOperatorSwapBoundaryStatus({
        rawNote: privateCoreOperatorRawSwapBoundaryNote,
        rawStatus: privateCoreOperatorRawSwapBoundaryStatus,
      }),
    [privateCoreOperatorRawSwapBoundaryNote, privateCoreOperatorRawSwapBoundaryStatus],
  );
  const privateCoreOperatorSwapResultingRootRegistrationSummary = useMemo(
    () =>
      summarizePrivateCoreOperatorSwapResultingRootRegistration({
        rawNote: privateCoreOperatorRawSwapResultingRootRegistrationNote,
        rawStatus: privateCoreOperatorRawSwapResultingRootRegistrationStatus,
      }),
    [
      privateCoreOperatorRawSwapResultingRootRegistrationNote,
      privateCoreOperatorRawSwapResultingRootRegistrationStatus,
    ],
  );

  const privateCoreSendState = useMemo(
    () =>
      mergePrivateCoreSendStateWithOperatorDownstream({
        baseState:
          privateCoreLocalSendState ??
          summarizePrivateCoreOperatorSendState({
            latestConsume: privateCoreOperatorLatestConsume,
            latestRelease: privateCoreOperatorLatestRelease,
            latestSend: privateCoreOperatorLatestSend,
            linkedProof: privateCoreOperatorLatestSendLinkedProof,
            resultingRootPrimaryNote: privateCoreOperatorSendResultingRootSummary.primaryNote,
            resultingRootStatusLabel: privateCoreOperatorSendResultingRootSummary.statusLabel,
          }),
        latestConsume: privateCoreOperatorLatestConsume,
        latestRelease: privateCoreOperatorLatestRelease,
        resultingRootPrimaryNote: privateCoreOperatorSendResultingRootSummary.primaryNote,
        resultingRootStatusLabel: privateCoreOperatorSendResultingRootSummary.statusLabel,
      }),
    [
      privateCoreLocalSendState,
      privateCoreOperatorLatestConsume,
      privateCoreOperatorLatestRelease,
      privateCoreOperatorLatestSend,
      privateCoreOperatorLatestSendLinkedProof,
      privateCoreOperatorSendResultingRootSummary.primaryNote,
      privateCoreOperatorSendResultingRootSummary.statusLabel,
    ],
  );

  const privateCoreSwapState = useMemo(
    () =>
      mergePrivateCoreSwapStateWithOperatorDownstream({
        baseState:
          privateCoreLocalSwapState ??
          summarizePrivateCoreOperatorSwapState({
            latestConsume: privateCoreOperatorLatestConsume,
            latestRelease: privateCoreOperatorLatestRelease,
            latestSwap: privateCoreOperatorLatestSwap,
            linkedProof: privateCoreOperatorLatestSwapLinkedProof,
            boundaryPrimaryNote: privateCoreOperatorSwapBoundarySummary.primaryNote,
            boundaryStatusLabel: privateCoreOperatorSwapBoundarySummary.statusLabel,
            continuityPrimaryNote: privateCoreOperatorSwapContinuitySummary.primaryNote,
            continuityStatusLabel: privateCoreOperatorSwapContinuitySummary.statusLabel,
            resultingRootPrimaryNote: privateCoreOperatorSwapResultingRootSummary.primaryNote,
            resultingRootStatusLabel: privateCoreOperatorSwapResultingRootSummary.statusLabel,
          }),
        boundaryPrimaryNote: privateCoreOperatorSwapBoundarySummary.primaryNote,
        boundaryStatusLabel: privateCoreOperatorSwapBoundarySummary.statusLabel,
        continuityPrimaryNote: privateCoreOperatorSwapContinuitySummary.primaryNote,
        continuityStatusLabel: privateCoreOperatorSwapContinuitySummary.statusLabel,
        latestConsume: privateCoreOperatorLatestConsume,
        latestRelease: privateCoreOperatorLatestRelease,
        resultingRootPrimaryNote: privateCoreOperatorSwapResultingRootSummary.primaryNote,
        resultingRootStatusLabel: privateCoreOperatorSwapResultingRootSummary.statusLabel,
      }),
    [
      privateCoreLocalSwapState,
      privateCoreOperatorLatestConsume,
      privateCoreOperatorLatestRelease,
      privateCoreOperatorLatestSwap,
      privateCoreOperatorLatestSwapLinkedProof,
      privateCoreOperatorSwapBoundarySummary.primaryNote,
      privateCoreOperatorSwapBoundarySummary.statusLabel,
      privateCoreOperatorSwapContinuitySummary.primaryNote,
      privateCoreOperatorSwapContinuitySummary.statusLabel,
      privateCoreOperatorSwapResultingRootSummary.primaryNote,
      privateCoreOperatorSwapResultingRootSummary.statusLabel,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    const loadSummary = () =>
      refreshPrivateCoreOperatorSummary()
        .then(() => {
          if (cancelled) {
            return;
          }
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          setPrivateCoreOperatorConsumeError(message);
          setPrivateCoreOperatorProofError(message);
          setPrivateCoreOperatorReleaseError(message);
          setPrivateCoreOperatorRootError(message);
          setPrivateCoreOperatorSendError(message);
          setPrivateCoreOperatorSendProofError(message);
        });

    void loadSummary();
    const intervalId = window.setInterval(() => {
      void loadSummary();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [privateCoreRecentShield, privateCoreUnshieldState, refreshPrivateCoreOperatorSummary]);

  useEffect(() => {
    if (!privateCoreRecentShield || !privateCoreHoldState) {
      return;
    }

    let cancelled = false;
    setPrivateCoreOperatorRootRegistrationStatus("Registering root with operator");

    const proofBoundary = buildVantaPrivateCoreUnshieldProofBoundary({
      heldNote: privateCoreHoldState.heldNote,
      ownerSecretKey: privateCoreOwner.secretKey,
      releaseDestination: VANTA_PRIVATE_CORE_DEMO_RELEASE_DESTINATION,
    });
    const sourceArtifacts = deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
      privateCoreHoldState.heldNote,
    );

    void registerVantaPrivateCoreOperatorRoot({
      sourceArtifacts,
      witnessPackage: proofBoundary.noirWitnessPackage,
    })
      .then((registration) => {
        if (cancelled) {
          return;
        }
        setPrivateCoreOperatorRootRegistrationStatus(
          registration.known
            ? "Operator root registered"
            : "Operator root registration unavailable",
        );
        return refreshPrivateCoreOperatorSummary();
      })
      .then(() => {
        if (cancelled) {
          return;
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setPrivateCoreOperatorRootRegistrationStatus("Operator root registration failed");
        setPrivateCoreOperatorRootError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [privateCoreHoldState, privateCoreOwner.secretKey, privateCoreRecentShield]);

  const ensurePrivateCoreOperatorRootKnown = useCallback(
    async (args: {
      proofBoundary: VantaPrivateCoreUnshieldProofBoundaryV0;
      sourceArtifacts: ReturnType<typeof deriveVantaPrivateCoreSourceArtifactsFromHeldNote>;
    }) => {
      const sourceRoot = args.proofBoundary.publicInputs.stateRoot;

      if (privateCoreOperatorRoots.some((record) => record.root === sourceRoot)) {
        return;
      }

      setPrivateCoreOperatorRootRegistrationStatus("Registering root with operator");
      const registration = await registerVantaPrivateCoreOperatorRoot({
        sourceArtifacts: args.sourceArtifacts,
        witnessPackage: args.proofBoundary.noirWitnessPackage,
      });
      await refreshPrivateCoreOperatorSummary();
      setPrivateCoreOperatorRootRegistrationStatus(
        registration.known ? "Operator root registered" : "Operator root registration unavailable",
      );
    },
    [privateCoreOperatorRoots],
  );

  const buildPrivateCorePresentedState = useCallback(
    (args: { hold: HeldNoteViewV0; shieldArtifact: ShieldArtifactV0 }) => {
      const provingPreview = buildVantaPrivateCoreUnshieldProofBoundary({
        heldNote: args.hold,
        ownerSecretKey: privateCoreOwner.secretKey,
        releaseDestination: VANTA_PRIVATE_CORE_DEMO_RELEASE_DESTINATION,
      });
      const sourceProofPreviewEnvelope = buildVantaPrivateCoreUnshieldProofEnvelope(
        args.hold.note,
        args.hold.witness,
      );
      const sourceShieldArtifacts = deriveVantaPrivateCoreSourceArtifactsFromShieldArtifact(
        args.shieldArtifact,
      );
      const sourceHoldArtifacts = deriveVantaPrivateCoreSourceArtifactsFromHeldNote(args.hold);
      const provingPreviewArtifacts = deriveVantaPrivateCoreProvingArtifactsFromBoundary(
        provingPreview,
      );
      const previewComparison = compareVantaPrivateCoreSourceAndProvingArtifacts({
        sourceArtifacts: sourceShieldArtifacts,
        provingArtifacts: provingPreviewArtifacts,
        sourceConsumeContextTag: provingPreview.publicInputs.consumeContextTag ?? null,
      });
      const sourceProofPreviewVerification =
        summarizeVantaPrivateCoreUnshieldProofEnvelopeVerification(sourceProofPreviewEnvelope);
      const sourceProofPreviewSummary =
        summarizeVantaPrivateCoreUnshieldProofEnvelope(sourceProofPreviewEnvelope);
      const sourceProofPreviewConsistency =
        summarizeVantaPrivateCoreUnshieldProofEnvelopeConsistency({
          envelope: sourceProofPreviewEnvelope,
          sourceArtifacts: {
            ...sourceHoldArtifacts,
            nullifier: sourceProofPreviewEnvelope.publicInputs.nullifier,
          },
          expectedNullifier: sourceProofPreviewEnvelope.publicInputs.nullifier,
        });
      const previewHandoffSummary = summarizeVantaPrivateCoreSourceVsProvingHandoff({
        sourceProofVerified: sourceProofPreviewVerification.verified,
        sourceProofConsistencyLabel: sourceProofPreviewConsistency.overallStatusLabel,
        proofBoundary: provingPreview,
        comparison: previewComparison,
      });
      const previewStatus = summarizeVantaPrivateCoreProofBoundaryStatus(provingPreview);
      const previewCompatibility = summarizeVantaPrivateCoreProofBoundaryCompatibility(
        provingPreview,
      );
      const previewConfiguration =
        summarizeVantaPrivateCoreProofBoundaryConfiguration(provingPreview);
      const previewPublicInputs = summarizeVantaPrivateCoreProofBoundaryPublicInputs(
        provingPreview,
      );
      const previewWitness = summarizeVantaPrivateCoreProofBoundaryWitness(provingPreview);

      const shieldState: VantaPrivateCoreShieldState = {
        artifact: args.shieldArtifact,
        encryptedPayload: args.shieldArtifact.encryptedPayload,
        sourceNoteCommitment:
          sourceShieldArtifacts.noteCommitment ?? args.shieldArtifact.commitment.value,
        sourcePayloadCommitment:
          sourceShieldArtifacts.payloadCommitment ??
          args.shieldArtifact.encryptedPayload.payloadCommitment,
        sourceMerkleRoot: sourceShieldArtifacts.merkleRoot ?? args.shieldArtifact.root,
        assetId: args.shieldArtifact.note.assetId,
        amount: args.shieldArtifact.note.amount.toString(10),
        noteType: args.shieldArtifact.note.noteType,
        noteVersion: args.shieldArtifact.note.version,
      };

      const holdState: VantaPrivateCoreHoldState = {
        heldNote: args.hold,
        privateNoteRecovered: true,
        witnessAvailable: true,
        proofObservationMode: "Preview before consume",
        replayPreviewStatus: "Ready after first consume",
        sourceWitnessRoot: sourceHoldArtifacts.witnessRoot ?? args.hold.witness.root,
        sourceProofPreviewStatement: sourceProofPreviewSummary.statement,
        sourceProofPreviewVerifier: sourceProofPreviewSummary.proof,
        sourceProofPreviewCommitment: sourceProofPreviewSummary.commitment,
        sourceProofPreviewRoot: sourceProofPreviewSummary.root,
        sourceProofPreviewAssetId: sourceProofPreviewSummary.assetId,
        sourceProofPreviewAmount: sourceProofPreviewSummary.amount,
        sourceProofPreviewLeafIndex: sourceProofPreviewSummary.leafIndex,
        sourceProofPreviewNullifier: sourceProofPreviewEnvelope.publicInputs.nullifier,
        sourceProofPreviewStatusLabel: sourceProofPreviewVerification.statusLabel,
        sourceProofPreviewConsistencyLabel: sourceProofPreviewConsistency.overallStatusLabel,
        sourceProofPreviewCommitmentStatus: sourceProofPreviewConsistency.commitmentStatus,
        sourceProofPreviewRootStatus: sourceProofPreviewConsistency.rootStatus,
        sourceProofPreviewNullifierStatus: sourceProofPreviewConsistency.nullifierStatus,
        previewSourceLayerStatus: previewHandoffSummary.sourceLayerStatus,
        previewProvingBoundaryStatus: previewHandoffSummary.provingBoundaryStatus,
        previewHandoffStatus: previewHandoffSummary.handoffStatus,
        previewPrimaryHandoffNote: previewHandoffSummary.primaryHandoffNote,
        provingPreviewHashLane: provingPreviewArtifacts.provingHashLane,
        provingPreviewNoteCommitment: provingPreviewArtifacts.provingNoteCommitment,
        provingPreviewMerkleLeaf: provingPreviewArtifacts.provingMerkleLeaf,
        provingPreviewStateRoot: provingPreviewArtifacts.provingStateRoot,
        provingPreviewNullifier: provingPreviewArtifacts.provingNullifier,
        provingPreviewConsumeContextTag: provingPreviewArtifacts.provingConsumeContextTag,
        noteCommitmentComparisonStatus: previewComparison.noteCommitment.statusLabel,
        merkleLeafComparisonStatus: previewComparison.merkleLeaf.statusLabel,
        stateRootComparisonStatus: previewComparison.stateRoot.statusLabel,
        nullifierComparisonStatus: previewComparison.nullifier.statusLabel,
        consumeContextComparisonStatus: previewComparison.consumeContext.statusLabel,
        circuitReadinessLabel: previewStatus.readinessLabel,
        proofBlockerCount: previewStatus.blockerCount,
        primaryProofBlocker: previewStatus.primaryBlocker,
        compatibilityNoteCount: previewCompatibility.noteCount,
        primaryCompatibilityNote: previewCompatibility.primaryNote,
        proofBoundaryKind: provingPreview.kind,
        proofBoundaryVersion: provingPreview.version,
        proofCircuit: previewConfiguration.circuit,
        proofBackend: previewConfiguration.backend,
        proofMerkleDepth: previewConfiguration.merkleDepth,
        ownerAuthorizationMode: previewConfiguration.ownerAuthorizationMode,
        nullifierKeyMode: previewConfiguration.nullifierKeyMode,
        proofReleaseDestination: previewPublicInputs.releaseDestination,
        proofAssetId: previewPublicInputs.assetId,
        proofAmount: previewPublicInputs.amount,
        proofNoteVersion: previewPublicInputs.noteVersion,
        proofNoteType: previewWitness.noteType,
        proofLeafIndex: previewWitness.leafIndex,
        proofPathDepth: previewWitness.pathDepth,
        noteSummary: `${formatPrivateCoreAssetAmount(
          args.shieldArtifact.note.assetId,
          args.shieldArtifact.note.amount,
        )} private note`,
      };

      return { holdState, shieldState };
    },
    [privateCoreOwner.secretKey],
  );

  const runPrivateCoreShield = useCallback((args: { amountDisplay: string; asset: PrivacyAssetKey }): VantaPrivateCoreShieldState => {
    if (args.asset !== "VUSD") {
      throw new Error("Vanta Private Core v0.1 currently supports the VUSD demo lane only.");
    }

    const shield = privateCoreLedger.shield({
      assetId: VANTA_PRIVATE_CORE_VUSD_ASSET_ID,
      amount: decimalToBaseUnits(args.amountDisplay, VANTA_PRIVATE_CORE_VUSD_DECIMALS),
      ownerPublicKey: privateCoreOwner.publicKey,
    });
    const hold = privateCoreLedger.hold({
      encryptedPayload: shield.encryptedPayload,
      ownerSecretKey: privateCoreOwner.secretKey,
    });
    const { holdState: nextHoldState, shieldState: nextShieldState } =
      buildPrivateCorePresentedState({
        hold,
        shieldArtifact: shield,
      });

    setPrivateCoreRecentShield(nextShieldState);
    setPrivateCoreHoldState(nextHoldState);
    setPrivateCoreLocalSendState(null);
    setPrivateCoreLocalSwapState(null);
    setPrivateCoreUnshieldState(null);

    return nextShieldState;
  }, [buildPrivateCorePresentedState, privateCoreLedger, privateCoreOwner]);

  const runPrivateCoreSendTransition = useCallback(
    (transition: SendTransitionV0) => {
      const result = privateCoreLedger.send(transition);
      const nextShieldState =
        result.change !== null
          ? ({
              note: result.change.note,
              commitment: result.change.commitment,
              encryptedPayload: result.change.encryptedPayload,
              insertionIndex: result.change.insertionIndex,
              root: result.resultingRoot,
            } satisfies ShieldArtifactV0)
          : null;
      const nextHold =
        result.change !== null
          ? privateCoreLedger.hold({
              encryptedPayload: result.change.encryptedPayload,
              ownerSecretKey: privateCoreOwner.secretKey,
            })
          : null;
      const nextPresentedState =
        nextShieldState && nextHold
          ? buildPrivateCorePresentedState({
              hold: nextHold,
              shieldArtifact: nextShieldState,
            })
          : null;

      setPrivateCoreRecentShield(nextPresentedState?.shieldState ?? null);
      setPrivateCoreHoldState(nextPresentedState?.holdState ?? null);
      setPrivateCoreLocalSendState({
        recipientCommitment: result.recipient.commitment.value,
        recipientPayloadCommitment: result.recipient.encryptedPayload.payloadCommitment,
        recipientAmount: result.recipient.note.amount.toString(10),
        changeCommitment: result.change?.commitment.value ?? null,
        changeAmount: (result.change?.note.amount ?? 0n).toString(10),
        resultingRoot: result.resultingRoot,
        resultingRootStatusLabel: "Send root pending operator summary",
        resultingRootPrimaryNote:
          "The send resulting root exists locally and is waiting for the next operator summary refresh.",
        recipientRecoveryStatus: "Recipient note created privately",
        recipientUnshieldStatus: "Recipient note ready for private hold or unshield",
        residualStateStatus:
          result.change !== null
            ? "Residual note is current private state"
            : "No residual note remains",
        noteSummary: `${formatBaseUnits(result.recipient.note.amount, VANTA_PRIVATE_CORE_VUSD_DECIMALS)} VUSD sent privately`,
        observationMode: "Local send handoff",
      });
      setPrivateCoreLocalSwapState(null);
      setPrivateCoreUnshieldState(null);

      return {
        result,
        nextShieldState: nextPresentedState?.shieldState ?? null,
        nextHoldState: nextPresentedState?.holdState ?? null,
      };
    },
    [buildPrivateCorePresentedState, privateCoreLedger, privateCoreOwner.secretKey],
  );

  const previewPrivateCoreSendTransition = useCallback(
    (transition: SendTransitionV0) => privateCoreLedger.previewSend(transition),
    [privateCoreLedger],
  );

  const runPrivateCoreSwapTransition = useCallback(
    (
      transition: SwapTransitionV0,
    options?: {
      executionBasisLabel?: string;
      executionPrimaryNote?: string;
      executionVenueLabel?: string | null;
      executionQuoteReference?: string | null;
      livePathStatusLabel?: string;
      livePathPrimaryNote?: string;
      livePathPrimaryBlocker?: string | null;
    },
    ) => {
      const result = privateCoreLedger.swap(transition);
      const nextShieldState = {
        note: result.output.note,
        commitment: result.output.commitment,
        encryptedPayload: result.output.encryptedPayload,
        insertionIndex: result.output.insertionIndex,
        root: result.resultingRoot,
      } satisfies ShieldArtifactV0;
      const nextHold = privateCoreLedger.hold({
        encryptedPayload: result.output.encryptedPayload,
        ownerSecretKey: privateCoreOwner.secretKey,
      });
      const nextPresentedState = buildPrivateCorePresentedState({
        hold: nextHold,
        shieldArtifact: nextShieldState,
      });

      setPrivateCoreRecentShield(nextPresentedState.shieldState);
      setPrivateCoreHoldState(nextPresentedState.holdState);
      setPrivateCoreLocalSendState(null);
      setPrivateCoreLocalSwapState({
        outputCommitment: result.output.commitment.value,
        outputPayloadCommitment: result.output.encryptedPayload.payloadCommitment,
        outputAssetId: result.output.note.assetId,
        outputAmount: result.output.note.amount.toString(10),
        executionBasisLabel: options?.executionBasisLabel ?? "Local swap transition",
        executionPrimaryNote:
          options?.executionPrimaryNote ??
          "A private-core swap transition was applied locally and is waiting for the next operator summary refresh.",
        executionVenueLabel: options?.executionVenueLabel ?? null,
        executionQuoteReference: options?.executionQuoteReference ?? null,
        livePathStatusLabel: options?.livePathStatusLabel ?? "Locally applied transition",
        livePathPrimaryNote:
          options?.livePathPrimaryNote ??
          "The swap transition was applied locally from the currently selected execution path and is waiting for the next operator summary refresh.",
        livePathPrimaryBlocker: options?.livePathPrimaryBlocker ?? null,
        resultingRoot: result.resultingRoot,
        resultingRootStatusLabel: "Swap root pending operator summary",
        resultingRootPrimaryNote:
          "The swap resulting root exists locally and is waiting for the next operator summary refresh.",
        outputRecoveryStatus: "Swap output note created privately",
        outputUnshieldStatus: "Swap output ready for private hold or unshield",
        boundaryStatusLabel: "Swap boundary pending operator summary",
        boundaryPrimaryNote:
          "The swap handoff exists locally and is waiting for the next operator boundary summary refresh.",
        continuityStatusLabel: "Swap continuity pending operator summary",
        continuityPrimaryNote:
          "The downstream continuity of the local swap handoff is waiting for the next operator summary refresh.",
        noteSummary: `${formatPrivateCoreAssetAmount(
          result.output.note.assetId,
          result.output.note.amount,
        )} swapped privately`,
        observationMode: "Local swap handoff",
      });
      setPrivateCoreUnshieldState(null);

      return {
        result,
        nextHoldState: nextPresentedState.holdState,
        nextShieldState: nextPresentedState.shieldState,
      };
    },
    [buildPrivateCorePresentedState, privateCoreLedger, privateCoreOwner.secretKey],
  );

  const previewPrivateCoreSwapTransition = useCallback(
    (transition: SwapTransitionV0) => privateCoreLedger.previewSwap(transition),
    [privateCoreLedger],
  );

  const runPrivateCoreUnshield = useCallback(async (): Promise<VantaPrivateCoreUnshieldState> => {
    if (!privateCoreHoldState) {
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: null,
        proofEnvelope: null,
        proofBoundary: null,
        proofObservationMode: null,
        sourceProofStatement: null,
        sourceProofVerifier: null,
        sourceProofCommitment: null,
        sourceProofRoot: null,
        sourceProofAssetId: null,
        sourceProofAmount: null,
        sourceProofLeafIndex: null,
        sourceProofVerified: null,
        sourceProofStatusLabel: null,
        sourceProofCommitmentStatus: null,
        sourceProofRootStatus: null,
        sourceProofNullifierStatus: null,
        sourceProofConsistencyLabel: null,
        sourceLayerStatus: null,
        provingBoundaryStatus: null,
        handoffStatus: null,
        primaryHandoffNote: null,
        provingHashLane: null,
        provingNoteCommitment: null,
        provingMerkleLeaf: null,
        provingStateRoot: null,
        provingNullifier: null,
        provingConsumeContextTag: null,
        noteCommitmentComparisonStatus: null,
        merkleLeafComparisonStatus: null,
        stateRootComparisonStatus: null,
        nullifierComparisonStatus: null,
        consumeContextComparisonStatus: null,
        circuitReadinessLabel: null,
        proofBlockerCount: 0,
        primaryProofBlocker: null,
        compatibilityNoteCount: 0,
        primaryCompatibilityNote: null,
        proofBoundaryKind: null,
        proofBoundaryVersion: null,
        proofCircuit: null,
        proofBackend: null,
        proofMerkleDepth: null,
        ownerAuthorizationMode: null,
        nullifierKeyMode: null,
        proofReleaseDestination: null,
        proofAssetId: null,
        proofAmount: null,
        proofNoteVersion: null,
        proofNoteType: null,
        proofLeafIndex: null,
        proofPathDepth: null,
        proofExecutionMode: null,
        proofExecutionStatus: null,
        proofFieldCount: null,
        proofPublicInputCount: null,
        operatorProofId: null,
        operatorReleaseRecorded: null,
        operatorReleaseRequestId: null,
        operatorReleaseTransitionNoteId: null,
        consumeSucceeded: false,
        replayRejected: false,
        errorMessage: "No recovered private-core note is available to unshield.",
        result: null,
      };
      setPrivateCoreUnshieldState(nextState);
      return nextState;
    }

    const proofEnvelope = buildVantaPrivateCoreUnshieldProofEnvelope(
      privateCoreHoldState.heldNote.note,
      privateCoreHoldState.heldNote.witness,
    );
    const proofBoundary = buildVantaPrivateCoreUnshieldProofBoundary({
      heldNote: privateCoreHoldState.heldNote,
      ownerSecretKey: privateCoreOwner.secretKey,
      releaseDestination: VANTA_PRIVATE_CORE_DEMO_RELEASE_DESTINATION,
    });
    const provingArtifacts = deriveVantaPrivateCoreProvingArtifactsFromBoundary(proofBoundary);
    const sourceProofSummary = summarizeVantaPrivateCoreUnshieldProofEnvelope(proofEnvelope);
    const sourceProofVerification = summarizeVantaPrivateCoreUnshieldProofEnvelopeVerification(
      proofEnvelope,
    );
    const proofStatus = summarizeVantaPrivateCoreProofBoundaryStatus(proofBoundary);
    const proofCompatibility = summarizeVantaPrivateCoreProofBoundaryCompatibility(proofBoundary);
    const proofConfiguration = summarizeVantaPrivateCoreProofBoundaryConfiguration(proofBoundary);
    const proofPublicInputs = summarizeVantaPrivateCoreProofBoundaryPublicInputs(proofBoundary);
    const proofWitness = summarizeVantaPrivateCoreProofBoundaryWitness(proofBoundary);
    const sourceHoldArtifacts = deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
      privateCoreHoldState.heldNote,
    );
    let operatorConsumeReceipt: VantaPrivateCoreConsumeOperatorResponse | null = null;

    try {
      await ensurePrivateCoreOperatorRootKnown({
        proofBoundary,
        sourceArtifacts: sourceHoldArtifacts,
      });
      operatorConsumeReceipt = await requestVantaPrivateCoreOperatorConsume({
        sourceArtifacts: sourceHoldArtifacts,
        witnessPackage: proofBoundary.noirWitnessPackage,
      });
      try {
        await refreshPrivateCoreOperatorSummary();
      } catch (error) {
        const immediateOperatorConsume = summarizePrivateCoreImmediateOperatorConsume(operatorConsumeReceipt);
        const immediateOperatorRelease = summarizePrivateCoreImmediateOperatorRelease(operatorConsumeReceipt);
        const message = error instanceof Error ? error.message : String(error);
        setPrivateCoreOperatorLatestConsume(immediateOperatorConsume);
        setPrivateCoreOperatorConsumes((records) =>
          mergePrivateCoreOperatorConsumes(records, immediateOperatorConsume),
        );
        setPrivateCoreOperatorLatestRelease(immediateOperatorRelease);
        setPrivateCoreOperatorReleases((records) =>
          mergePrivateCoreOperatorReleases(records, immediateOperatorRelease),
        );
        setPrivateCoreOperatorConsumeError(message);
        setPrivateCoreOperatorReleaseError(message);
      }
      const result = privateCoreLedger.unshield(privateCoreHoldState.heldNote);
      const sourceUnshieldArtifacts = deriveVantaPrivateCoreSourceArtifactsFromUnshieldResult(result);
      const sourceProofConsistency = summarizeVantaPrivateCoreUnshieldProofEnvelopeConsistency({
        envelope: proofEnvelope,
        sourceArtifacts: {
          ...sourceHoldArtifacts,
          nullifier: sourceUnshieldArtifacts.nullifier,
        },
        expectedNullifier: sourceUnshieldArtifacts.nullifier ?? result.nullifier.value,
      });
      const provingComparison = compareVantaPrivateCoreSourceAndProvingArtifacts({
        sourceArtifacts: sourceHoldArtifacts,
        provingArtifacts,
        sourceConsumeContextTag: proofBoundary.publicInputs.consumeContextTag ?? null,
      });
      const handoffSummary = summarizeVantaPrivateCoreSourceVsProvingHandoff({
        sourceProofVerified: sourceProofVerification.verified,
        sourceProofConsistencyLabel: sourceProofConsistency.overallStatusLabel,
        proofBoundary,
        comparison: provingComparison,
      });
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: sourceUnshieldArtifacts.nullifier ?? result.nullifier.value,
        proofEnvelope,
        proofBoundary,
        proofObservationMode: "Observed during unshield",
        sourceProofStatement: sourceProofSummary.statement,
        sourceProofVerifier: sourceProofSummary.proof,
        sourceProofCommitment: sourceProofSummary.commitment,
        sourceProofRoot: sourceProofSummary.root,
        sourceProofAssetId: sourceProofSummary.assetId,
        sourceProofAmount: sourceProofSummary.amount,
        sourceProofLeafIndex: sourceProofSummary.leafIndex,
        sourceProofVerified: sourceProofVerification.verified,
        sourceProofStatusLabel: sourceProofVerification.statusLabel,
        sourceProofCommitmentStatus: sourceProofConsistency.commitmentStatus,
        sourceProofRootStatus: sourceProofConsistency.rootStatus,
        sourceProofNullifierStatus: sourceProofConsistency.nullifierStatus,
        sourceProofConsistencyLabel: sourceProofConsistency.overallStatusLabel,
        sourceLayerStatus: handoffSummary.sourceLayerStatus,
        provingBoundaryStatus: handoffSummary.provingBoundaryStatus,
        handoffStatus: handoffSummary.handoffStatus,
        primaryHandoffNote: handoffSummary.primaryHandoffNote,
        provingHashLane: provingArtifacts.provingHashLane,
        provingNoteCommitment: provingArtifacts.provingNoteCommitment,
        provingMerkleLeaf: provingArtifacts.provingMerkleLeaf,
        provingStateRoot: provingArtifacts.provingStateRoot,
        provingNullifier: provingArtifacts.provingNullifier,
        provingConsumeContextTag: provingArtifacts.provingConsumeContextTag,
        noteCommitmentComparisonStatus: provingComparison.noteCommitment.statusLabel,
        merkleLeafComparisonStatus: provingComparison.merkleLeaf.statusLabel,
        stateRootComparisonStatus: provingComparison.stateRoot.statusLabel,
        nullifierComparisonStatus: provingComparison.nullifier.statusLabel,
        consumeContextComparisonStatus: provingComparison.consumeContext.statusLabel,
        circuitReadinessLabel: proofStatus.readinessLabel,
        proofBlockerCount: proofStatus.blockerCount,
        primaryProofBlocker: proofStatus.primaryBlocker,
        compatibilityNoteCount: proofCompatibility.noteCount,
        primaryCompatibilityNote: proofCompatibility.primaryNote,
        proofBoundaryKind: proofBoundary.kind,
        proofBoundaryVersion: proofBoundary.version,
        proofCircuit: proofConfiguration.circuit,
        proofBackend: proofConfiguration.backend,
        proofMerkleDepth: proofConfiguration.merkleDepth,
        ownerAuthorizationMode: proofConfiguration.ownerAuthorizationMode,
        nullifierKeyMode: proofConfiguration.nullifierKeyMode,
        proofReleaseDestination: proofPublicInputs.releaseDestination,
        proofAssetId: proofPublicInputs.assetId,
        proofAmount: proofPublicInputs.amount,
        proofNoteVersion: proofPublicInputs.noteVersion,
        proofNoteType: proofWitness.noteType,
        proofLeafIndex: proofWitness.leafIndex,
        proofPathDepth: proofWitness.pathDepth,
        proofExecutionMode: operatorConsumeReceipt.backend,
        proofExecutionStatus: operatorConsumeReceipt.verified
          ? "Operator proof verified, root accepted, and consume authorized"
          : "Operator proof unavailable",
        proofFieldCount: operatorConsumeReceipt.proofFieldCount,
        proofPublicInputCount: operatorConsumeReceipt.publicInputCount,
        operatorProofId: operatorConsumeReceipt.proofId,
        operatorReleaseRecorded: operatorConsumeReceipt.releaseRecorded,
        operatorReleaseRequestId: operatorConsumeReceipt.releaseRequestId,
        operatorReleaseTransitionNoteId: operatorConsumeReceipt.releaseTransitionNoteId,
        consumeSucceeded: true,
        replayRejected: false,
        errorMessage: null,
        result,
      };
      setPrivateCoreUnshieldState(nextState);
      return nextState;
    } catch (error) {
      const sourceProofConsistency = summarizeVantaPrivateCoreUnshieldProofEnvelopeConsistency({
        envelope: proofEnvelope,
        sourceArtifacts: {
          ...sourceHoldArtifacts,
          nullifier: proofEnvelope.publicInputs.nullifier,
        },
        expectedNullifier: proofEnvelope.publicInputs.nullifier,
      });
      const provingComparison = compareVantaPrivateCoreSourceAndProvingArtifacts({
        sourceArtifacts: sourceHoldArtifacts,
        provingArtifacts,
        sourceConsumeContextTag: proofBoundary.publicInputs.consumeContextTag ?? null,
      });
      const handoffSummary = summarizeVantaPrivateCoreSourceVsProvingHandoff({
        sourceProofVerified: sourceProofVerification.verified,
        sourceProofConsistencyLabel: sourceProofConsistency.overallStatusLabel,
        proofBoundary,
        comparison: provingComparison,
      });
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: proofEnvelope.publicInputs.nullifier,
        proofEnvelope,
        proofBoundary,
        proofObservationMode: "Observed during unshield failure",
        sourceProofStatement: sourceProofSummary.statement,
        sourceProofVerifier: sourceProofSummary.proof,
        sourceProofCommitment: sourceProofSummary.commitment,
        sourceProofRoot: sourceProofSummary.root,
        sourceProofAssetId: sourceProofSummary.assetId,
        sourceProofAmount: sourceProofSummary.amount,
        sourceProofLeafIndex: sourceProofSummary.leafIndex,
        sourceProofVerified: sourceProofVerification.verified,
        sourceProofStatusLabel: sourceProofVerification.statusLabel,
        sourceProofCommitmentStatus: sourceProofConsistency.commitmentStatus,
        sourceProofRootStatus: sourceProofConsistency.rootStatus,
        sourceProofNullifierStatus: sourceProofConsistency.nullifierStatus,
        sourceProofConsistencyLabel: sourceProofConsistency.overallStatusLabel,
        sourceLayerStatus: handoffSummary.sourceLayerStatus,
        provingBoundaryStatus: handoffSummary.provingBoundaryStatus,
        handoffStatus: handoffSummary.handoffStatus,
        primaryHandoffNote: handoffSummary.primaryHandoffNote,
        provingHashLane: provingArtifacts.provingHashLane,
        provingNoteCommitment: provingArtifacts.provingNoteCommitment,
        provingMerkleLeaf: provingArtifacts.provingMerkleLeaf,
        provingStateRoot: provingArtifacts.provingStateRoot,
        provingNullifier: provingArtifacts.provingNullifier,
        provingConsumeContextTag: provingArtifacts.provingConsumeContextTag,
        noteCommitmentComparisonStatus: provingComparison.noteCommitment.statusLabel,
        merkleLeafComparisonStatus: provingComparison.merkleLeaf.statusLabel,
        stateRootComparisonStatus: provingComparison.stateRoot.statusLabel,
        nullifierComparisonStatus: provingComparison.nullifier.statusLabel,
        consumeContextComparisonStatus: provingComparison.consumeContext.statusLabel,
        circuitReadinessLabel: proofStatus.readinessLabel,
        proofBlockerCount: proofStatus.blockerCount,
        primaryProofBlocker: proofStatus.primaryBlocker,
        compatibilityNoteCount: proofCompatibility.noteCount,
        primaryCompatibilityNote: proofCompatibility.primaryNote,
        proofBoundaryKind: proofBoundary.kind,
        proofBoundaryVersion: proofBoundary.version,
        proofCircuit: proofConfiguration.circuit,
        proofBackend: proofConfiguration.backend,
        proofMerkleDepth: proofConfiguration.merkleDepth,
        ownerAuthorizationMode: proofConfiguration.ownerAuthorizationMode,
        nullifierKeyMode: proofConfiguration.nullifierKeyMode,
        proofReleaseDestination: proofPublicInputs.releaseDestination,
        proofAssetId: proofPublicInputs.assetId,
        proofAmount: proofPublicInputs.amount,
        proofNoteVersion: proofPublicInputs.noteVersion,
        proofNoteType: proofWitness.noteType,
        proofLeafIndex: proofWitness.leafIndex,
        proofPathDepth: proofWitness.pathDepth,
        proofExecutionMode: operatorConsumeReceipt?.backend ?? null,
        proofExecutionStatus: operatorConsumeReceipt?.verified
          ? "Operator proof verified before failure"
          : "Operator consume rejected request",
        proofFieldCount: operatorConsumeReceipt?.proofFieldCount ?? null,
        proofPublicInputCount: operatorConsumeReceipt?.publicInputCount ?? null,
        operatorProofId: operatorConsumeReceipt?.proofId ?? null,
        operatorReleaseRecorded: operatorConsumeReceipt?.releaseRecorded ?? null,
        operatorReleaseRequestId: operatorConsumeReceipt?.releaseRequestId ?? null,
        operatorReleaseTransitionNoteId: operatorConsumeReceipt?.releaseTransitionNoteId ?? null,
        consumeSucceeded: false,
        replayRejected: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        result: null,
      };
      setPrivateCoreUnshieldState(nextState);
      return nextState;
    }
  }, [
    ensurePrivateCoreOperatorRootKnown,
    privateCoreHoldState,
    privateCoreLedger,
    privateCoreOwner.secretKey,
  ]);

  const runPrivateCoreReplayAttempt = useCallback(async (): Promise<VantaPrivateCoreUnshieldState> => {
    if (!privateCoreHoldState) {
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: null,
        proofEnvelope: null,
        proofBoundary: null,
        proofObservationMode: null,
        sourceProofStatement: null,
        sourceProofVerifier: null,
        sourceProofCommitment: null,
        sourceProofRoot: null,
        sourceProofAssetId: null,
        sourceProofAmount: null,
        sourceProofLeafIndex: null,
        sourceProofVerified: null,
        sourceProofStatusLabel: null,
        sourceProofCommitmentStatus: null,
        sourceProofRootStatus: null,
        sourceProofNullifierStatus: null,
        sourceProofConsistencyLabel: null,
        sourceLayerStatus: null,
        provingBoundaryStatus: null,
        handoffStatus: null,
        primaryHandoffNote: null,
        provingHashLane: null,
        provingNoteCommitment: null,
        provingMerkleLeaf: null,
        provingStateRoot: null,
        provingNullifier: null,
        provingConsumeContextTag: null,
        noteCommitmentComparisonStatus: null,
        merkleLeafComparisonStatus: null,
        stateRootComparisonStatus: null,
        nullifierComparisonStatus: null,
        consumeContextComparisonStatus: null,
        circuitReadinessLabel: null,
        proofBlockerCount: 0,
        primaryProofBlocker: null,
        compatibilityNoteCount: 0,
        primaryCompatibilityNote: null,
        proofBoundaryKind: null,
        proofBoundaryVersion: null,
        proofCircuit: null,
        proofBackend: null,
        proofMerkleDepth: null,
        ownerAuthorizationMode: null,
        nullifierKeyMode: null,
        proofReleaseDestination: null,
        proofAssetId: null,
        proofAmount: null,
        proofNoteVersion: null,
        proofNoteType: null,
        proofLeafIndex: null,
        proofPathDepth: null,
        proofExecutionMode: null,
        proofExecutionStatus: null,
        proofFieldCount: null,
        proofPublicInputCount: null,
        operatorProofId: null,
        operatorReleaseRecorded: null,
        operatorReleaseRequestId: null,
        operatorReleaseTransitionNoteId: null,
        consumeSucceeded: false,
        replayRejected: false,
        errorMessage: "No recovered private-core note is available for replay testing.",
        result: null,
      };
      setPrivateCoreUnshieldState(nextState);
      return nextState;
    }

    const proofEnvelope = buildVantaPrivateCoreUnshieldProofEnvelope(
      privateCoreHoldState.heldNote.note,
      privateCoreHoldState.heldNote.witness,
    );
    const proofBoundary = buildVantaPrivateCoreUnshieldProofBoundary({
      heldNote: privateCoreHoldState.heldNote,
      ownerSecretKey: privateCoreOwner.secretKey,
      releaseDestination: VANTA_PRIVATE_CORE_DEMO_RELEASE_DESTINATION,
    });
    const provingArtifacts = deriveVantaPrivateCoreProvingArtifactsFromBoundary(proofBoundary);
    const sourceProofSummary = summarizeVantaPrivateCoreUnshieldProofEnvelope(proofEnvelope);
    const sourceProofVerification = summarizeVantaPrivateCoreUnshieldProofEnvelopeVerification(
      proofEnvelope,
    );
    const proofStatus = summarizeVantaPrivateCoreProofBoundaryStatus(proofBoundary);
    const proofCompatibility = summarizeVantaPrivateCoreProofBoundaryCompatibility(proofBoundary);
    const proofConfiguration = summarizeVantaPrivateCoreProofBoundaryConfiguration(proofBoundary);
    const proofPublicInputs = summarizeVantaPrivateCoreProofBoundaryPublicInputs(proofBoundary);
    const proofWitness = summarizeVantaPrivateCoreProofBoundaryWitness(proofBoundary);
    const sourceHoldArtifacts = deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
      privateCoreHoldState.heldNote,
    );
    let operatorProofReceipt: VantaPrivateCoreProofOperatorResponse | null = null;

    try {
      await ensurePrivateCoreOperatorRootKnown({
        proofBoundary,
        sourceArtifacts: sourceHoldArtifacts,
      });
      operatorProofReceipt = await requestVantaPrivateCoreOperatorProof({
        witnessPackage: proofBoundary.noirWitnessPackage,
      });
      await requestVantaPrivateCoreOperatorConsume({
        sourceArtifacts: sourceHoldArtifacts,
        witnessPackage: proofBoundary.noirWitnessPackage,
      });
      throw new Error("Replay consume unexpectedly succeeded.");
    } catch (error) {
      const sourceHoldArtifacts = deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
        privateCoreHoldState.heldNote,
      );
      const sourceProofConsistency = summarizeVantaPrivateCoreUnshieldProofEnvelopeConsistency({
        envelope: proofEnvelope,
        sourceArtifacts: {
          ...sourceHoldArtifacts,
          nullifier: proofEnvelope.publicInputs.nullifier,
        },
        expectedNullifier: proofEnvelope.publicInputs.nullifier,
      });
      const provingComparison = compareVantaPrivateCoreSourceAndProvingArtifacts({
        sourceArtifacts: sourceHoldArtifacts,
        provingArtifacts,
        sourceConsumeContextTag: proofBoundary.publicInputs.consumeContextTag ?? null,
      });
      const handoffSummary = summarizeVantaPrivateCoreSourceVsProvingHandoff({
        sourceProofVerified: sourceProofVerification.verified,
        sourceProofConsistencyLabel: sourceProofConsistency.overallStatusLabel,
        proofBoundary,
        comparison: provingComparison,
      });
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: proofEnvelope.publicInputs.nullifier,
        proofEnvelope,
        proofBoundary,
        proofObservationMode: "Observed during replay rejection",
        sourceProofStatement: sourceProofSummary.statement,
        sourceProofVerifier: sourceProofSummary.proof,
        sourceProofCommitment: sourceProofSummary.commitment,
        sourceProofRoot: sourceProofSummary.root,
        sourceProofAssetId: sourceProofSummary.assetId,
        sourceProofAmount: sourceProofSummary.amount,
        sourceProofLeafIndex: sourceProofSummary.leafIndex,
        sourceProofVerified: sourceProofVerification.verified,
        sourceProofStatusLabel: sourceProofVerification.statusLabel,
        sourceProofCommitmentStatus: sourceProofConsistency.commitmentStatus,
        sourceProofRootStatus: sourceProofConsistency.rootStatus,
        sourceProofNullifierStatus: sourceProofConsistency.nullifierStatus,
        sourceProofConsistencyLabel: sourceProofConsistency.overallStatusLabel,
        sourceLayerStatus: handoffSummary.sourceLayerStatus,
        provingBoundaryStatus: handoffSummary.provingBoundaryStatus,
        handoffStatus: handoffSummary.handoffStatus,
        primaryHandoffNote: handoffSummary.primaryHandoffNote,
        provingHashLane: provingArtifacts.provingHashLane,
        provingNoteCommitment: provingArtifacts.provingNoteCommitment,
        provingMerkleLeaf: provingArtifacts.provingMerkleLeaf,
        provingStateRoot: provingArtifacts.provingStateRoot,
        provingNullifier: provingArtifacts.provingNullifier,
        provingConsumeContextTag: provingArtifacts.provingConsumeContextTag,
        noteCommitmentComparisonStatus: provingComparison.noteCommitment.statusLabel,
        merkleLeafComparisonStatus: provingComparison.merkleLeaf.statusLabel,
        stateRootComparisonStatus: provingComparison.stateRoot.statusLabel,
        nullifierComparisonStatus: provingComparison.nullifier.statusLabel,
        consumeContextComparisonStatus: provingComparison.consumeContext.statusLabel,
        circuitReadinessLabel: proofStatus.readinessLabel,
        proofBlockerCount: proofStatus.blockerCount,
        primaryProofBlocker: proofStatus.primaryBlocker,
        compatibilityNoteCount: proofCompatibility.noteCount,
        primaryCompatibilityNote: proofCompatibility.primaryNote,
        proofBoundaryKind: proofBoundary.kind,
        proofBoundaryVersion: proofBoundary.version,
        proofCircuit: proofConfiguration.circuit,
        proofBackend: proofConfiguration.backend,
        proofMerkleDepth: proofConfiguration.merkleDepth,
        ownerAuthorizationMode: proofConfiguration.ownerAuthorizationMode,
        nullifierKeyMode: proofConfiguration.nullifierKeyMode,
        proofReleaseDestination: proofPublicInputs.releaseDestination,
        proofAssetId: proofPublicInputs.assetId,
        proofAmount: proofPublicInputs.amount,
        proofNoteVersion: proofPublicInputs.noteVersion,
        proofNoteType: proofWitness.noteType,
        proofLeafIndex: proofWitness.leafIndex,
        proofPathDepth: proofWitness.pathDepth,
        proofExecutionMode: operatorProofReceipt?.backend ?? null,
        proofExecutionStatus: operatorProofReceipt?.verified
          ? "Operator proof verified before replay rejection"
          : "Operator replay consume rejected request",
        proofFieldCount: operatorProofReceipt?.proofFieldCount ?? null,
        proofPublicInputCount: operatorProofReceipt?.publicInputCount ?? null,
        operatorProofId: null,
        operatorReleaseRecorded: null,
        operatorReleaseRequestId: null,
        operatorReleaseTransitionNoteId: null,
        consumeSucceeded: false,
        replayRejected: true,
        errorMessage: error instanceof Error ? error.message : String(error),
        result: null,
      };
      setPrivateCoreUnshieldState(nextState);
      return nextState;
    }
  }, [
    ensurePrivateCoreOperatorRootKnown,
    privateCoreHoldState,
    privateCoreLedger,
    privateCoreOwner.secretKey,
  ]);

  const value = useMemo<PrivacyFlowContextValue>(
    () => {
      const privateCoreOperatorRootCurrentnessLabel = summarizePrivateCoreOperatorRootCurrentness({
        currentRoot:
          privateCoreHoldState?.sourceWitnessRoot ??
          privateCoreRecentShield?.sourceMerkleRoot ??
          null,
        operatorCurrentRoot: privateCoreOperatorCurrentRoot,
        operatorRootError: privateCoreOperatorRootError,
        operatorRoots: privateCoreOperatorRoots,
      });
      const privateCoreOperatorBoundarySummary = summarizePrivateCoreOperatorBoundaryStatus({
        operatorBoundaryNote: privateCoreOperatorRawBoundaryNote,
        operatorBoundaryStatus: privateCoreOperatorRawBoundaryStatus,
        operatorConsumeError: privateCoreOperatorConsumeError,
        operatorProofConsumeLinkStatus: privateCoreOperatorProofConsumeLinkStatus,
        operatorProofError: privateCoreOperatorProofError,
        operatorProofSendLinkStatus: privateCoreOperatorProofSendLinkStatus,
        operatorProofReleaseLinkStatus: privateCoreOperatorProofReleaseLinkStatus,
        operatorReleaseError: privateCoreOperatorReleaseError,
        operatorRootCurrentnessLabel: privateCoreOperatorRootCurrentnessLabel,
        operatorRootError: privateCoreOperatorRootError,
        operatorSummaryUpdatedAt: privateCoreOperatorSummaryUpdatedAt,
      });
      const privateCoreOperatorContractMirrorSummary =
        summarizePrivateCoreOperatorContractMirrorStatus({
          contractMirrorNote: privateCoreOperatorRawContractMirrorNote,
          contractMirrorStatus: privateCoreOperatorRawContractMirrorStatus,
        });
      const privateCoreOperatorReleaseBoundarySummary =
        summarizePrivateCoreOperatorReleaseBoundaryStatus({
          releaseBoundaryNote: privateCoreOperatorRawReleaseBoundaryNote,
          releaseBoundaryStatus: privateCoreOperatorRawReleaseBoundaryStatus,
        });
      const privateCoreOperatorRequiredLanesSummary =
        summarizePrivateCoreOperatorRequiredLanesStatus({
          requiredLanesNote: privateCoreOperatorRawRequiredLanesNote,
          requiredLanesStatus: privateCoreOperatorRawRequiredLanesStatus,
        });
      const privateCoreOperatorZkV1ShippingSummary =
        summarizePrivateCoreOperatorZkV1ShippingStatus({
          shippingDecisionNote: privateCoreOperatorRawShippingDecisionNote,
          shippingDecisionStatus: privateCoreOperatorRawShippingDecisionStatus,
          shippingNote: privateCoreOperatorRawZkV1ShippingNote,
          shippingStatus: privateCoreOperatorRawZkV1ShippingStatus,
        });
      const privateCoreOperatorZkV1FinishLineSummary =
        summarizePrivateCoreOperatorZkV1FinishLineStatus({
          finishLineNote: privateCoreOperatorRawZkV1FinishLineNote,
          finishLineStatus: privateCoreOperatorRawZkV1FinishLineStatus,
        });
      return {
      privateCoreOwner,
      privateCoreRecentShield,
      privateCoreHoldState,
      privateCoreSendState,
      privateCoreSwapState,
      privateCoreOperatorConsumes,
      privateCoreOperatorConsumeError,
      privateCoreOperatorLatestConsume,
      privateCoreOperatorLatestConsumeProof,
      privateCoreOperatorLatestProof,
      privateCoreOperatorLatestRelease,
      privateCoreOperatorLatestReleaseProof,
      privateCoreOperatorCurrentRoot,
      privateCoreOperatorLatestRoot,
      privateCoreOperatorLatestSend,
      privateCoreOperatorLatestSendLinkedProof,
      privateCoreOperatorLatestSendProof,
      privateCoreOperatorLatestSwap,
      privateCoreOperatorLatestSwapLinkedProof,
      privateCoreOperatorLatestSwapProof,
      privateCoreOperatorCurrentRootLinkedProof,
      privateCoreOperatorCurrentRootProofLinkStatus,
      privateCoreOperatorSendResultingRootLinkedProof,
      privateCoreOperatorSendResultingRootRecord,
      privateCoreOperatorSwapResultingRootLinkedProof,
      privateCoreOperatorSwapResultingRootRecord,
      privateCoreOperatorRawSendContinuityNote,
      privateCoreOperatorRawSendContinuityStatus,
      privateCoreOperatorRawSendBoundaryNote,
      privateCoreOperatorRawSendBoundaryStatus,
      privateCoreOperatorRawSendResultingRootNote,
      privateCoreOperatorRawSendResultingRootRegistrationNote,
      privateCoreOperatorRawSendResultingRootRegistrationStatus,
      privateCoreOperatorSendResultingRootProofLinkStatus,
      privateCoreOperatorRawSendResultingRootStatus,
      privateCoreOperatorRawSwapContinuityNote,
      privateCoreOperatorRawSwapContinuityStatus,
      privateCoreOperatorRawSwapBoundaryNote,
      privateCoreOperatorRawSwapBoundaryStatus,
      privateCoreOperatorRawSwapResultingRootNote,
      privateCoreOperatorRawSwapResultingRootRegistrationNote,
      privateCoreOperatorRawSwapResultingRootRegistrationStatus,
      privateCoreOperatorSwapResultingRootProofLinkStatus,
      privateCoreOperatorRawSwapResultingRootStatus,
      privateCoreOperatorRawBoundaryNote,
      privateCoreOperatorRawBoundaryStatus,
      privateCoreOperatorRawReleaseBoundaryNote,
      privateCoreOperatorRawReleaseBoundaryStatus,
      privateCoreOperatorRawRequiredLanesNote,
      privateCoreOperatorRawRequiredLanesStatus,
      privateCoreOperatorRawShippingDecisionNote,
      privateCoreOperatorRawShippingDecisionStatus,
      privateCoreOperatorRawZkV1ShippingNote,
      privateCoreOperatorRawZkV1ShippingStatus,
      privateCoreOperatorRawZkV1FinishLineNote,
      privateCoreOperatorRawZkV1FinishLineStatus,
      privateCoreOperatorRawContractMirrorNote,
      privateCoreOperatorRawContractMirrorStatus,
      privateCoreOperatorSupportedSendLaneKind,
      privateCoreOperatorSupportedSendLaneNote,
      privateCoreOperatorSupportedSendLaneStatus,
      privateCoreOperatorSupportedSendLaneVersion,
      privateCoreOperatorSupportedSendV1Decision,
      privateCoreOperatorSupportedSendV1DecisionNote,
      privateCoreOperatorSupportedUnshieldLaneKind,
      privateCoreOperatorSupportedUnshieldLaneNote,
      privateCoreOperatorSupportedUnshieldLaneStatus,
      privateCoreOperatorSupportedUnshieldLaneVersion,
      privateCoreOperatorSupportedUnshieldV1Decision,
      privateCoreOperatorSupportedUnshieldV1DecisionNote,
      privateCoreOperatorSupportedReleaseLaneKind,
      privateCoreOperatorSupportedReleaseLaneNote,
      privateCoreOperatorSupportedReleaseLaneStatus,
      privateCoreOperatorSupportedReleaseLaneVersion,
      privateCoreOperatorSupportedReleaseV1Decision,
      privateCoreOperatorSupportedReleaseV1DecisionNote,
      privateCoreOperatorSupportedSwapLaneKind,
      privateCoreOperatorSupportedSwapLaneNote,
      privateCoreOperatorSupportedSwapLaneStatus,
      privateCoreOperatorSupportedSwapLaneVersion,
      privateCoreOperatorSupportedSwapV1Decision,
      privateCoreOperatorSupportedSwapV1DecisionNote,
      privateCoreOperatorSupportedSwapV1Role,
      privateCoreOperatorSupportedSwapV1RoleNote,
      privateCoreOperatorSupportedSwapVenue,
      privateCoreOperatorSupportedSwapOutputModel,
      privateCoreOperatorSupportedSwapResultingRootBasis,
      privateCoreOperatorSupportedSwapInputRootPolicy,
      privateCoreOperatorSupportedSwapOutputRegistrationPolicy,
      privateCoreOperatorSupportedFlowKind,
      privateCoreOperatorSupportedFlowNote,
      privateCoreOperatorSupportedFlowStatus,
      privateCoreOperatorSupportedFlowVersion,
      privateCoreOperatorSupportedZkV1ScopeDecision,
      privateCoreOperatorSupportedZkV1ScopeNote,
      privateCoreOperatorSupportedZkV1RequiredLanes,
      privateCoreOperatorSupportedZkV1RequiredLanesNote,
      privateCoreOperatorSupportedAssetSymbol,
      privateCoreOperatorSupportedEnvironment,
      privateCoreOperatorSupportedNoteSchema,
      privateCoreOperatorSupportedNoteVersion,
      privateCoreOperatorSupportedRootRegistrationProvenance,
      privateCoreOperatorSupportedSendResultingRootBasis,
      privateCoreOperatorSupportedSendInputRootPolicy,
      privateCoreOperatorSupportedSendOutputRegistrationPolicy,
      privateCoreOperatorSupportedRecipientModel,
      privateCoreOperatorSupportedReleaseDestinationModel,
      privateCoreOperatorSupportedProofSystem,
      privateCoreOperatorSupportedUnshieldCircuit,
      privateCoreOperatorSupportedSendCircuit,
      privateCoreOperatorSupportedUnshieldMerkleDepth,
      privateCoreOperatorSupportedSendMerkleDepth,
      privateCoreOperatorSupportedReleaseAuthorizationBasis,
      privateCoreOperatorSupportedReleaseRootPolicy,
      privateCoreOperatorSupportedReleaseExecutionModel,
      privateCoreOperatorSupportedReleaseAtomicityModel,
      privateCoreOperatorSupportedReleasePersistenceModel,
      privateCoreOperatorOwnerAuthorizationMode,
      privateCoreOperatorOwnerAuthorizationDecision,
      privateCoreOperatorOwnerAuthorizationDecisionNote,
      privateCoreOperatorSourceArtifactTruthBasis,
      privateCoreOperatorProvingArtifactTruthBasis,
      privateCoreOperatorSourceProvingRelationship,
      privateCoreOperatorNullifierKeyMode,
      privateCoreOperatorProvingHashLane,
      privateCoreOperatorProofConsumeLinkStatus,
      privateCoreOperatorProofError,
      privateCoreOperatorProofs,
      privateCoreOperatorProofSendLinkStatus,
      privateCoreOperatorProofSwapLinkStatus,
      privateCoreOperatorProofReleaseLinkStatus,
      privateCoreOperatorReleaseError,
      privateCoreOperatorReleases,
      privateCoreOperatorRoots,
      privateCoreOperatorSendError,
      privateCoreOperatorSends,
      privateCoreOperatorSendProofError,
      privateCoreOperatorSendProofs,
      privateCoreOperatorSwaps,
      privateCoreOperatorSwapProofs,
      privateCoreOperatorBoundaryPrimaryNote: privateCoreOperatorBoundarySummary.primaryNote,
      privateCoreOperatorBoundaryStatusLabel: privateCoreOperatorBoundarySummary.statusLabel,
      privateCoreOperatorContractMirrorPrimaryNote:
        privateCoreOperatorContractMirrorSummary.primaryNote,
      privateCoreOperatorContractMirrorStatusLabel:
        privateCoreOperatorContractMirrorSummary.statusLabel,
      privateCoreOperatorReleaseBoundaryPrimaryNote:
        privateCoreOperatorReleaseBoundarySummary.primaryNote,
      privateCoreOperatorReleaseBoundaryStatusLabel:
        privateCoreOperatorReleaseBoundarySummary.statusLabel,
      privateCoreOperatorRequiredLanesPrimaryNote:
        privateCoreOperatorRequiredLanesSummary.primaryNote,
      privateCoreOperatorRequiredLanesStatusLabel:
        privateCoreOperatorRequiredLanesSummary.statusLabel,
      privateCoreOperatorZkV1ShippingPrimaryNote:
        privateCoreOperatorZkV1ShippingSummary.primaryNote,
      privateCoreOperatorZkV1ShippingStatusLabel:
        privateCoreOperatorZkV1ShippingSummary.statusLabel,
      privateCoreOperatorZkV1FinishLinePrimaryNote:
        privateCoreOperatorZkV1FinishLineSummary.primaryNote,
      privateCoreOperatorZkV1FinishLineStatusLabel:
        privateCoreOperatorZkV1FinishLineSummary.statusLabel,
      privateCoreOperatorSendBoundaryPrimaryNote:
        privateCoreOperatorSendBoundarySummary.primaryNote,
      privateCoreOperatorSendBoundaryStatusLabel:
        privateCoreOperatorSendBoundarySummary.statusLabel,
      privateCoreOperatorSendContinuityPrimaryNote:
        privateCoreOperatorSendContinuitySummary.primaryNote,
      privateCoreOperatorSendContinuityStatusLabel:
        privateCoreOperatorSendContinuitySummary.statusLabel,
      privateCoreOperatorSwapBoundaryPrimaryNote:
        privateCoreOperatorSwapBoundarySummary.primaryNote,
      privateCoreOperatorSwapBoundaryStatusLabel:
        privateCoreOperatorSwapBoundarySummary.statusLabel,
      privateCoreOperatorSwapContinuityPrimaryNote:
        privateCoreOperatorSwapContinuitySummary.primaryNote,
      privateCoreOperatorSwapContinuityStatusLabel:
        privateCoreOperatorSwapContinuitySummary.statusLabel,
      privateCoreOperatorSwapResultingRootPrimaryNote:
        privateCoreOperatorSwapResultingRootSummary.primaryNote,
      privateCoreOperatorSwapResultingRootRegistrationPrimaryNote:
        privateCoreOperatorSwapResultingRootRegistrationSummary.primaryNote,
      privateCoreOperatorSwapResultingRootRegistrationStatusLabel:
        privateCoreOperatorSwapResultingRootRegistrationSummary.statusLabel,
      privateCoreOperatorSwapResultingRootStatusLabel:
        privateCoreOperatorSwapResultingRootSummary.statusLabel,
      privateCoreOperatorSendResultingRootPrimaryNote:
        privateCoreOperatorSendResultingRootSummary.primaryNote,
      privateCoreOperatorSendResultingRootRegistrationPrimaryNote:
        privateCoreOperatorSendResultingRootRegistrationSummary.primaryNote,
      privateCoreOperatorSendResultingRootRegistrationStatusLabel:
        privateCoreOperatorSendResultingRootRegistrationSummary.statusLabel,
      privateCoreOperatorSendResultingRootStatusLabel:
        privateCoreOperatorSendResultingRootSummary.statusLabel,
      privateCoreOperatorRootError,
      privateCoreOperatorRootRegistrationStatus,
      privateCoreOperatorRootCurrentnessLabel,
      privateCoreOperatorContractStateVersion,
      privateCoreOperatorContractVersion,
      privateCoreOperatorContractSummaryVersion,
      privateCoreOperatorStatusVersion,
      privateCoreOperatorStatusKind,
      privateCoreOperatorSnapshotVersion,
      privateCoreOperatorSnapshotKind,
      privateCoreOperatorSupportedStatusNote,
      privateCoreOperatorSupportedStatusTransport,
      privateCoreOperatorSupportedStatusEndpoint,
      privateCoreOperatorSupportedStatusGateVersion,
      privateCoreOperatorSupportedStatusGateKind,
      privateCoreOperatorSupportedStatusGateNote,
      privateCoreOperatorSupportedStatusGateTransport,
      privateCoreOperatorSupportedStatusGateEndpoint,
      privateCoreOperatorSupportedSnapshotGateVersion,
      privateCoreOperatorSupportedSnapshotGateKind,
      privateCoreOperatorSupportedSnapshotGateNote,
      privateCoreOperatorSupportedSnapshotGateTransport,
      privateCoreOperatorSupportedSnapshotGateEndpoint,
      privateCoreOperatorSupportedShippingDecisionGateVersion,
      privateCoreOperatorSupportedShippingDecisionGateKind,
      privateCoreOperatorSupportedShippingDecisionGateNote,
      privateCoreOperatorSupportedShippingDecisionGateTransport,
      privateCoreOperatorSupportedShippingDecisionGateEndpoint,
      privateCoreOperatorSupportedShippingDecisionTransport,
      privateCoreOperatorSupportedShippingDecisionEndpoint,
      privateCoreOperatorSupportedShippingArtifactGateVersion,
      privateCoreOperatorSupportedShippingArtifactGateKind,
      privateCoreOperatorSupportedShippingArtifactGateNote,
      privateCoreOperatorSupportedShippingArtifactGateTransport,
      privateCoreOperatorSupportedShippingArtifactGateEndpoint,
      privateCoreOperatorSupportedSnapshotNote,
      privateCoreOperatorSupportedSnapshotTransport,
      privateCoreOperatorSupportedSnapshotEndpoint,
      privateCoreOperatorSupportedShippingArtifactNote,
      privateCoreOperatorSupportedShippingArtifactTransport,
      privateCoreOperatorSupportedShippingArtifactEndpoint,
      privateCoreOperatorShippingArtifactVersion,
      privateCoreOperatorShippingArtifactKind,
      privateCoreOperatorShippingDecisionVersion,
      privateCoreOperatorShippingDecisionKind,
      privateCoreOperatorSupportedShippingDecisionNote,
      privateCoreOperatorSummaryUpdatedAt,
      privateCoreUnshieldState,
      recentShield,
      ensurePrivateCoreOperatorRootKnown,
      refreshPrivateCoreOperatorSummary,
      previewPrivateCoreSendTransition,
      previewPrivateCoreSwapTransition,
      runPrivateCoreSendTransition,
      runPrivateCoreSwapTransition,
      runPrivateCoreReplayAttempt,
      runPrivateCoreShield,
      runPrivateCoreUnshield,
      setPrivateCoreHoldState,
      setPrivateCoreRecentShield,
      setPrivateCoreUnshieldState,
      setRecentShield,
    };
    },
    [
      privateCoreHoldState,
      privateCoreOwner,
      privateCoreSendState,
      privateCoreSwapState,
      privateCoreOperatorConsumeError,
      privateCoreOperatorConsumes,
      privateCoreOperatorLatestConsume,
      privateCoreOperatorLatestConsumeProof,
      privateCoreOperatorLatestProof,
      privateCoreOperatorLatestRelease,
      privateCoreOperatorLatestReleaseProof,
      privateCoreOperatorCurrentRoot,
      privateCoreOperatorLatestRoot,
      privateCoreOperatorLatestSend,
      privateCoreOperatorLatestSendLinkedProof,
      privateCoreOperatorLatestSendProof,
      privateCoreOperatorLatestSwap,
      privateCoreOperatorLatestSwapLinkedProof,
      privateCoreOperatorLatestSwapProof,
      privateCoreOperatorCurrentRootLinkedProof,
      privateCoreOperatorCurrentRootProofLinkStatus,
      privateCoreOperatorSendResultingRootLinkedProof,
      privateCoreOperatorSendResultingRootRecord,
      privateCoreOperatorRawSendContinuityNote,
      privateCoreOperatorRawSendContinuityStatus,
      privateCoreOperatorRawSendBoundaryNote,
      privateCoreOperatorRawSendBoundaryStatus,
      privateCoreOperatorRawSendResultingRootNote,
      privateCoreOperatorRawSendResultingRootRegistrationNote,
      privateCoreOperatorRawSendResultingRootRegistrationStatus,
      privateCoreOperatorSendResultingRootProofLinkStatus,
      privateCoreOperatorRawSendResultingRootStatus,
      privateCoreOperatorRawBoundaryNote,
      privateCoreOperatorRawBoundaryStatus,
      privateCoreOperatorRawReleaseBoundaryNote,
      privateCoreOperatorRawReleaseBoundaryStatus,
      privateCoreOperatorRawRequiredLanesNote,
      privateCoreOperatorRawRequiredLanesStatus,
      privateCoreOperatorRawZkV1ShippingNote,
      privateCoreOperatorRawZkV1ShippingStatus,
      privateCoreOperatorRawZkV1FinishLineNote,
      privateCoreOperatorRawZkV1FinishLineStatus,
      privateCoreOperatorRawContractMirrorNote,
      privateCoreOperatorRawContractMirrorStatus,
      privateCoreOperatorSendBoundarySummary,
      privateCoreOperatorSendContinuitySummary,
      privateCoreOperatorSupportedSendLaneKind,
      privateCoreOperatorSupportedSendLaneNote,
      privateCoreOperatorSupportedSendLaneStatus,
      privateCoreOperatorSupportedSendLaneVersion,
      privateCoreOperatorSupportedSendV1Decision,
      privateCoreOperatorSupportedSendV1DecisionNote,
      privateCoreOperatorSupportedUnshieldLaneKind,
      privateCoreOperatorSupportedUnshieldLaneNote,
      privateCoreOperatorSupportedUnshieldLaneStatus,
      privateCoreOperatorSupportedUnshieldLaneVersion,
      privateCoreOperatorSupportedUnshieldV1Decision,
      privateCoreOperatorSupportedUnshieldV1DecisionNote,
      privateCoreOperatorSupportedReleaseLaneKind,
      privateCoreOperatorSupportedReleaseLaneNote,
      privateCoreOperatorSupportedReleaseLaneStatus,
      privateCoreOperatorSupportedReleaseLaneVersion,
      privateCoreOperatorSupportedReleaseV1Decision,
      privateCoreOperatorSupportedReleaseV1DecisionNote,
      privateCoreOperatorSupportedSwapLaneKind,
      privateCoreOperatorSupportedSwapLaneNote,
      privateCoreOperatorSupportedSwapLaneStatus,
      privateCoreOperatorSupportedSwapLaneVersion,
      privateCoreOperatorSupportedSwapV1Decision,
      privateCoreOperatorSupportedSwapV1DecisionNote,
      privateCoreOperatorSupportedSwapV1Role,
      privateCoreOperatorSupportedSwapV1RoleNote,
      privateCoreOperatorSupportedSwapVenue,
      privateCoreOperatorSupportedSwapOutputModel,
      privateCoreOperatorSupportedSwapResultingRootBasis,
      privateCoreOperatorSupportedSwapInputRootPolicy,
      privateCoreOperatorSupportedSwapOutputRegistrationPolicy,
      privateCoreOperatorSupportedFlowKind,
      privateCoreOperatorSupportedFlowNote,
      privateCoreOperatorSupportedFlowStatus,
      privateCoreOperatorSupportedFlowVersion,
      privateCoreOperatorSupportedZkV1ScopeDecision,
      privateCoreOperatorSupportedZkV1ScopeNote,
      privateCoreOperatorSupportedZkV1RequiredLanes,
      privateCoreOperatorSupportedZkV1RequiredLanesNote,
      privateCoreOperatorSupportedAssetSymbol,
      privateCoreOperatorSupportedEnvironment,
      privateCoreOperatorSupportedNoteSchema,
      privateCoreOperatorSupportedNoteVersion,
      privateCoreOperatorSupportedRootRegistrationProvenance,
      privateCoreOperatorSupportedSendResultingRootBasis,
      privateCoreOperatorSupportedSendInputRootPolicy,
      privateCoreOperatorSupportedSendOutputRegistrationPolicy,
      privateCoreOperatorSupportedRecipientModel,
      privateCoreOperatorSupportedReleaseDestinationModel,
      privateCoreOperatorSupportedProofSystem,
      privateCoreOperatorSupportedUnshieldCircuit,
      privateCoreOperatorSupportedSendCircuit,
      privateCoreOperatorSupportedUnshieldMerkleDepth,
      privateCoreOperatorSupportedSendMerkleDepth,
      privateCoreOperatorSupportedReleaseAuthorizationBasis,
      privateCoreOperatorSupportedReleaseRootPolicy,
      privateCoreOperatorSupportedReleaseExecutionModel,
      privateCoreOperatorSupportedReleaseAtomicityModel,
      privateCoreOperatorSupportedReleasePersistenceModel,
      privateCoreOperatorOwnerAuthorizationMode,
      privateCoreOperatorOwnerAuthorizationDecision,
      privateCoreOperatorOwnerAuthorizationDecisionNote,
      privateCoreOperatorSourceArtifactTruthBasis,
      privateCoreOperatorProvingArtifactTruthBasis,
      privateCoreOperatorSourceProvingRelationship,
      privateCoreOperatorNullifierKeyMode,
      privateCoreOperatorProvingHashLane,
      privateCoreOperatorProofConsumeLinkStatus,
      privateCoreOperatorProofError,
      privateCoreOperatorProofs,
      privateCoreOperatorProofSendLinkStatus,
      privateCoreOperatorProofSwapLinkStatus,
      privateCoreOperatorProofReleaseLinkStatus,
      privateCoreOperatorReleaseError,
      privateCoreOperatorRootError,
      privateCoreOperatorRootRegistrationStatus,
      privateCoreOperatorContractStateVersion,
      privateCoreOperatorContractVersion,
      privateCoreOperatorContractSummaryVersion,
      privateCoreOperatorStatusVersion,
      privateCoreOperatorStatusKind,
      privateCoreOperatorReleases,
      privateCoreOperatorRoots,
      privateCoreOperatorSendError,
      privateCoreOperatorSends,
      privateCoreOperatorSendProofError,
      privateCoreOperatorSendProofs,
      privateCoreOperatorSwaps,
      privateCoreOperatorSwapProofs,
      privateCoreOperatorContractStateVersion,
      privateCoreOperatorContractVersion,
      privateCoreOperatorContractSummaryVersion,
      privateCoreOperatorStatusVersion,
      privateCoreOperatorStatusKind,
      privateCoreOperatorSnapshotVersion,
      privateCoreOperatorSnapshotKind,
      privateCoreOperatorSupportedStatusNote,
      privateCoreOperatorSupportedStatusTransport,
      privateCoreOperatorSupportedStatusEndpoint,
      privateCoreOperatorSupportedStatusGateVersion,
      privateCoreOperatorSupportedStatusGateKind,
      privateCoreOperatorSupportedStatusGateNote,
      privateCoreOperatorSupportedStatusGateTransport,
      privateCoreOperatorSupportedStatusGateEndpoint,
      privateCoreOperatorSupportedSnapshotGateVersion,
      privateCoreOperatorSupportedSnapshotGateKind,
      privateCoreOperatorSupportedSnapshotGateNote,
      privateCoreOperatorSupportedSnapshotGateTransport,
      privateCoreOperatorSupportedSnapshotGateEndpoint,
      privateCoreOperatorSupportedShippingDecisionGateVersion,
      privateCoreOperatorSupportedShippingDecisionGateKind,
      privateCoreOperatorSupportedShippingDecisionGateNote,
      privateCoreOperatorSupportedShippingDecisionGateTransport,
      privateCoreOperatorSupportedShippingDecisionGateEndpoint,
      privateCoreOperatorSupportedShippingDecisionTransport,
      privateCoreOperatorSupportedShippingDecisionEndpoint,
      privateCoreOperatorSupportedShippingArtifactGateVersion,
      privateCoreOperatorSupportedShippingArtifactGateKind,
      privateCoreOperatorSupportedShippingArtifactGateNote,
      privateCoreOperatorSupportedShippingArtifactGateTransport,
      privateCoreOperatorSupportedShippingArtifactGateEndpoint,
      privateCoreOperatorSupportedSnapshotNote,
      privateCoreOperatorSupportedSnapshotTransport,
      privateCoreOperatorSupportedSnapshotEndpoint,
      privateCoreOperatorSupportedShippingArtifactNote,
      privateCoreOperatorSupportedShippingArtifactTransport,
      privateCoreOperatorSupportedShippingArtifactEndpoint,
      privateCoreOperatorShippingArtifactVersion,
      privateCoreOperatorShippingArtifactKind,
      privateCoreOperatorShippingDecisionVersion,
      privateCoreOperatorShippingDecisionKind,
      privateCoreOperatorSupportedShippingDecisionNote,
      privateCoreOperatorSummaryUpdatedAt,
      privateCoreRecentShield,
      privateCoreUnshieldState,
      recentShield,
      ensurePrivateCoreOperatorRootKnown,
      refreshPrivateCoreOperatorSummary,
      previewPrivateCoreSendTransition,
      previewPrivateCoreSwapTransition,
      runPrivateCoreSendTransition,
      runPrivateCoreSwapTransition,
      runPrivateCoreReplayAttempt,
      runPrivateCoreShield,
      runPrivateCoreUnshield,
    ],
  );

  return (
    <PrivacyFlowContext.Provider value={value}>
      {children}
    </PrivacyFlowContext.Provider>
  );
}

export function usePrivacyFlow() {
  const context = useContext(PrivacyFlowContext);

  if (!context) {
    throw new Error("usePrivacyFlow must be used within PrivacyFlowProvider");
  }

  return context;
}

function decimalToBaseUnits(value: string, decimals: number): bigint {
  const normalized = value.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid decimal amount: ${value}`);
  }

  const [whole, fraction = ""] = normalized.split(".");
  const paddedFraction = `${fraction}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(`${whole}${paddedFraction}`);
}

function formatBaseUnits(amount: bigint, decimals: number): string {
  const raw = amount.toString(10).padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals);
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

function summarizePrivateCoreOperatorRootCurrentness(args: {
  currentRoot: string | null;
  operatorCurrentRoot: string | null;
  operatorRootError: string | null;
  operatorRoots: VantaPrivateCoreOperatorRootRecord[];
}): string | null {
  if (!args.currentRoot) {
    return null;
  }

  if (args.operatorRootError) {
    return "Operator root state unavailable";
  }

  const latestRoot = args.operatorCurrentRoot ?? args.operatorRoots[0]?.root ?? null;

  if (!latestRoot) {
    return "Root not yet registered";
  }

  if (latestRoot === args.currentRoot) {
    return "Current operator root";
  }

  if (args.operatorRoots.some((record) => record.root === args.currentRoot)) {
    return "Registered but not current";
  }

  return "Root not yet registered";
}

function summarizePrivateCoreOperatorBoundaryStatus(args: {
  operatorBoundaryNote: string | null;
  operatorBoundaryStatus: string | null;
  operatorConsumeError: string | null;
  operatorProofConsumeLinkStatus: string | null;
  operatorProofError: string | null;
  operatorProofSendLinkStatus: string | null;
  operatorProofReleaseLinkStatus: string | null;
  operatorReleaseError: string | null;
  operatorRootCurrentnessLabel: string | null;
  operatorRootError: string | null;
  operatorSummaryUpdatedAt: number | null;
}): {
  statusLabel: string | null;
  primaryNote: string | null;
} {
  if (
    args.operatorConsumeError ||
    args.operatorProofError ||
    args.operatorReleaseError ||
    args.operatorRootError
  ) {
    return {
      statusLabel: "Operator state unavailable",
      primaryNote:
        args.operatorProofError ??
        args.operatorConsumeError ??
        args.operatorReleaseError ??
        args.operatorRootError,
    };
  }

  if (!args.operatorSummaryUpdatedAt) {
    return {
      statusLabel: "Awaiting operator summary",
      primaryNote: "No operator summary has been observed yet.",
    };
  }

  if (args.operatorBoundaryStatus && args.operatorBoundaryStatus !== "coherent") {
    return {
      statusLabel:
        args.operatorBoundaryStatus === "awaiting-current-root"
          ? "Awaiting current root"
          : args.operatorBoundaryStatus === "root-registration-unlinked"
            ? "Root registration unlinked"
          : args.operatorBoundaryStatus === "send-root-registration-unlinked"
            ? "Send root registration unlinked"
          : args.operatorBoundaryStatus === "send-root-output-mismatch"
            ? "Send root output mismatch"
          : args.operatorBoundaryStatus === "proof-send-unlinked"
            ? "Proof and send not linked"
            : args.operatorBoundaryStatus === "proof-consume-unlinked"
            ? "Proof and consume not linked"
            : "Proof and release not linked",
      primaryNote: args.operatorBoundaryNote,
    };
  }

  if (args.operatorRootCurrentnessLabel !== "Current operator root") {
    return {
      statusLabel: "Operator root not current",
      primaryNote: args.operatorRootCurrentnessLabel ?? "Operator root status unavailable.",
    };
  }

  if (args.operatorProofSendLinkStatus !== "linked" && args.operatorProofSendLinkStatus !== "unavailable") {
    return {
      statusLabel: "Proof and send not linked",
      primaryNote:
        args.operatorProofSendLinkStatus === "mismatch"
          ? "Latest send record does not match its linked proof."
          : "Latest send proof linkage is unavailable.",
    };
  }

  if (args.operatorProofConsumeLinkStatus !== "linked") {
    return {
      statusLabel: "Proof and consume not linked",
      primaryNote:
        args.operatorProofConsumeLinkStatus === "mismatch"
          ? "Latest consume record does not match its linked proof."
          : "Latest consume proof linkage is unavailable.",
    };
  }

  if (args.operatorProofReleaseLinkStatus !== "linked") {
    return {
      statusLabel: "Proof and release not linked",
      primaryNote:
        args.operatorProofReleaseLinkStatus === "mismatch"
          ? "Latest release record does not match its linked proof."
          : "Latest release proof linkage is unavailable.",
    };
  }

  const summaryAgeMs = Date.now() - args.operatorSummaryUpdatedAt;
  if (summaryAgeMs > 30_000) {
    return {
      statusLabel: "Operator summary aging",
      primaryNote: "Operator summary is older than 30 seconds.",
    };
  }

  return {
    statusLabel: "Operator boundary coherent",
    primaryNote: "Current root, linked proof, consume, and release state all agree.",
  };
}

function summarizePrivateCoreOperatorContractMirrorStatus(args: {
  contractMirrorNote: string | null;
  contractMirrorStatus: string | null;
}) {
  if (args.contractMirrorStatus === "mirrors-contract") {
    return {
      primaryNote:
        args.contractMirrorNote ??
        "Operator summary mirrors the frozen private-core contract.",
      statusLabel: "Summary mirrors contract",
    };
  }

  if (args.contractMirrorStatus === "contract-mismatch") {
    return {
      primaryNote:
        args.contractMirrorNote ??
        "Operator summary drifted from the frozen private-core contract.",
      statusLabel: "Summary drift detected",
    };
  }

  return {
    primaryNote: "No operator contract mirror status has been observed yet.",
    statusLabel: "Awaiting contract mirror state",
  };
}

function summarizePrivateCoreOperatorReleaseBoundaryStatus(args: {
  releaseBoundaryNote: string | null;
  releaseBoundaryStatus: string | null;
}) {
  if (args.releaseBoundaryStatus === "release-recorded") {
    return {
      primaryNote:
        args.releaseBoundaryNote ??
        "Latest private-core release is recorded, proof-linked, and consistent with the frozen release contract.",
      statusLabel: "Release recorded",
    };
  }

  if (args.releaseBoundaryStatus === "consume-without-release") {
    return {
      primaryNote:
        args.releaseBoundaryNote ??
        "A private-core consume exists without a corresponding release record.",
      statusLabel: "Consume without release",
    };
  }

  if (args.releaseBoundaryStatus === "proof-unlinked") {
    return {
      primaryNote:
        args.releaseBoundaryNote ??
        "Latest private-core release does not have a linked proof-consume basis yet.",
      statusLabel: "Release proof unlinked",
    };
  }

  if (args.releaseBoundaryStatus === "authorization-mismatch") {
    return {
      primaryNote:
        args.releaseBoundaryNote ??
        "Latest private-core release authorization basis does not match the frozen release contract.",
      statusLabel: "Release auth mismatch",
    };
  }

  if (args.releaseBoundaryStatus === "root-policy-mismatch") {
    return {
      primaryNote:
        args.releaseBoundaryNote ??
        "Latest private-core release root policy does not match the frozen release contract.",
      statusLabel: "Release root-policy mismatch",
    };
  }

  if (args.releaseBoundaryStatus === "contract-mismatch") {
    return {
      primaryNote:
        args.releaseBoundaryNote ??
        "Operator summary drifted from the frozen private-core contract.",
      statusLabel: "Contract mismatch",
    };
  }

  if (args.releaseBoundaryStatus === "boundary-mismatch") {
    return {
      primaryNote:
        args.releaseBoundaryNote ??
        "Current operator boundary is not coherent enough for the frozen release lane.",
      statusLabel: "Boundary mismatch",
    };
  }

  return {
    primaryNote: "No private-core release-boundary summary has been observed yet.",
    statusLabel: "Awaiting release state",
  };
}

function summarizePrivateCoreOperatorZkV1FinishLineStatus(args: {
  finishLineNote: string | null;
  finishLineStatus: string | null;
}) {
  if (args.finishLineStatus === "coherent-minimum-v1-lane") {
    return {
      primaryNote:
        args.finishLineNote ??
        "Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
      statusLabel: "Coherent minimum v1 lane",
    };
  }

  if (args.finishLineStatus === "scope-mismatch") {
    return {
      primaryNote: args.finishLineNote ?? "zk v1 scope decision does not match the frozen finish line.",
      statusLabel: "Scope mismatch",
    };
  }

  if (args.finishLineStatus === "required-lanes-mismatch") {
    return {
      primaryNote:
        args.finishLineNote ?? "Required zk v1 lane set does not match the frozen send/unshield/release contract.",
      statusLabel: "Required lanes mismatch",
    };
  }

  if (args.finishLineStatus === "required-lane-decision-mismatch") {
    return {
      primaryNote:
        args.finishLineNote ?? "One or more required zk v1 lanes are not marked as accepted narrow v1 paths.",
      statusLabel: "Required lane decision mismatch",
    };
  }

  if (args.finishLineStatus === "swap-role-mismatch") {
    return {
      primaryNote:
        args.finishLineNote ?? "Constrained swap role does not match the frozen adjacent-support contract.",
      statusLabel: "Swap role mismatch",
    };
  }

  if (args.finishLineStatus === "contract-mismatch") {
    return {
      primaryNote: args.finishLineNote ?? "Operator summary drifted from the frozen private-core contract.",
      statusLabel: "Contract mismatch",
    };
  }

  if (args.finishLineStatus === "boundary-mismatch") {
    return {
      primaryNote: args.finishLineNote ?? "Current operator boundary is not coherent enough for the frozen minimum v1 lane.",
      statusLabel: "Boundary mismatch",
    };
  }

  return {
    primaryNote: "No zk v1 finish-line summary has been observed yet.",
    statusLabel: "Awaiting finish-line state",
  };
}

function summarizePrivateCoreOperatorRequiredLanesStatus(args: {
  requiredLanesNote: string | null;
  requiredLanesStatus: string | null;
}) {
  if (args.requiredLanesStatus === "coherent-required-lanes") {
    return {
      primaryNote:
        args.requiredLanesNote ??
        "Minimum zk v1 required lanes are coherent at the operator boundary.",
      statusLabel: "Coherent required lanes",
    };
  }

  if (args.requiredLanesStatus === "send-lane-mismatch") {
    return {
      primaryNote:
        args.requiredLanesNote ??
        "Current send lane is not coherent enough for the minimum zk v1 finish line.",
      statusLabel: "Send lane mismatch",
    };
  }

  if (args.requiredLanesStatus === "release-lane-mismatch") {
    return {
      primaryNote:
        args.requiredLanesNote ??
        "Current release lane is not coherent enough for the minimum zk v1 finish line.",
      statusLabel: "Release lane mismatch",
    };
  }

  if (args.requiredLanesStatus === "finish-line-mismatch") {
    return {
      primaryNote:
        args.requiredLanesNote ??
        "Current finish-line state is not coherent enough for the minimum zk v1 lane set.",
      statusLabel: "Finish-line mismatch",
    };
  };

  return {
    primaryNote: "No private-core required-lanes summary has been observed yet.",
    statusLabel: "Awaiting required-lane state",
  };
}

function summarizePrivateCoreOperatorZkV1ShippingStatus(args: {
  shippingDecisionNote: string | null;
  shippingDecisionStatus: string | null;
  shippingNote: string | null;
  shippingStatus: string | null;
}) {
  if (args.shippingDecisionStatus === "ready-to-ship") {
    return {
      primaryNote:
        args.shippingDecisionNote ??
        args.shippingNote ??
        "Frozen narrow zk v1 lane is coherent enough to ship at the current operator boundary.",
      statusLabel: "Ready to ship",
    };
  }

  if (args.shippingDecisionStatus === "blocked") {
    return {
      primaryNote:
        args.shippingDecisionNote ??
        args.shippingNote ??
        "The canonical operator shipping decision is currently blocked by a live lane mismatch.",
      statusLabel: "Blocked",
    };
  }

  if (args.shippingStatus === "ready-narrow-v1") {
    return {
      primaryNote:
        args.shippingNote ??
        "Frozen narrow zk v1 lane is coherent enough to ship at the current operator boundary.",
      statusLabel: "Ready narrow v1",
    };
  }

  if (args.shippingStatus === "required-lanes-mismatch") {
    return {
      primaryNote:
        args.shippingNote ??
        "Minimum zk v1 required lanes are not yet coherent enough to ship the frozen narrow lane.",
      statusLabel: "Required lanes mismatch",
    };
  }

  if (args.shippingStatus === "release-boundary-mismatch") {
    return {
      primaryNote:
        args.shippingNote ??
        "Current release boundary is not coherent enough to ship the frozen narrow lane.",
      statusLabel: "Release-boundary mismatch",
    };
  }

  if (args.shippingStatus === "contract-mismatch") {
    return {
      primaryNote:
        args.shippingNote ??
        "Operator summary drifted from the frozen private-core contract.",
      statusLabel: "Contract mismatch",
    };
  }

  if (args.shippingStatus === "boundary-mismatch") {
    return {
      primaryNote:
        args.shippingNote ??
        "Current operator boundary is not coherent enough to ship the frozen narrow lane.",
      statusLabel: "Boundary mismatch",
    };
  }

  return {
    primaryNote: "No canonical operator shipping decision has been observed yet.",
    statusLabel: "Awaiting shipping decision",
  };
}

function summarizePrivateCoreOperatorSendBoundaryStatus(args: {
  rawNote: string | null;
  rawStatus: string | null;
}): {
  statusLabel: string | null;
  primaryNote: string | null;
} {
  switch (args.rawStatus) {
    case "coherent-current-root":
      return {
        statusLabel: "Send boundary coherent",
        primaryNote: args.rawNote,
      };
    case "coherent-registered-stale":
      return {
        statusLabel: "Send boundary coherent but stale",
        primaryNote: args.rawNote,
      };
    case "awaiting-registration":
      return {
        statusLabel: "Send boundary awaiting registration",
        primaryNote: args.rawNote,
      };
    case "proof-send-unlinked":
      return {
        statusLabel: "Send proof linkage missing",
        primaryNote: args.rawNote,
      };
    case "registration-proof-unlinked":
      return {
        statusLabel: "Send registration proof missing",
        primaryNote: args.rawNote,
      };
    case "output-mismatch":
      return {
        statusLabel: "Send output mismatch",
        primaryNote: args.rawNote,
      };
    case "missing-resulting-root":
      return {
        statusLabel: "Send resulting root missing",
        primaryNote: args.rawNote,
      };
    case "downstream-consumed":
      return {
        statusLabel: "Send output consumed downstream",
        primaryNote: args.rawNote,
      };
    case "downstream-released":
      return {
        statusLabel: "Send output released downstream",
        primaryNote: args.rawNote,
      };
    case "unavailable":
      return {
        statusLabel: "Awaiting send boundary",
        primaryNote: args.rawNote ?? "No private send boundary state has been observed yet.",
      };
    default:
      return {
        statusLabel: "Send boundary unavailable",
        primaryNote: args.rawNote ?? "Operator send boundary status unavailable.",
      };
  }
}

function summarizePrivateCoreOperatorSendResultingRootStatus(args: {
  latestSend: VantaPrivateCoreOperatorSendRecord | null;
  rawNote: string | null;
  rawStatus: string | null;
}): {
  statusLabel: string | null;
  primaryNote: string | null;
} {
  if (!args.latestSend && !args.rawStatus) {
    return {
      statusLabel: "No send root observed",
      primaryNote: "No private send transition has been observed yet.",
    };
  }

  switch (args.rawStatus) {
    case "current-root":
      return {
        statusLabel: "Send root is current",
        primaryNote: args.rawNote,
      };
    case "registered-stale":
      return {
        statusLabel: "Send root is stale",
        primaryNote: args.rawNote,
      };
    case "downstream-consumed":
      return {
        statusLabel: "Send root consumed downstream",
        primaryNote: args.rawNote,
      };
    case "downstream-released":
      return {
        statusLabel: "Send root released downstream",
        primaryNote: args.rawNote,
      };
    case "unregistered":
      return {
        statusLabel: "Send root not registered",
        primaryNote: args.rawNote,
      };
    case "missing":
      return {
        statusLabel: "Send root missing",
        primaryNote: args.rawNote,
      };
    case "unavailable":
      return {
        statusLabel: "No send root observed",
        primaryNote: args.rawNote,
      };
    default:
      return {
        statusLabel: args.latestSend?.resultingRoot ? "Send root observed" : "No send root observed",
        primaryNote: args.rawNote ?? "Operator send resulting-root status unavailable.",
      };
  }
}

function summarizePrivateCoreOperatorSendResultingRootRegistration(args: {
  rawNote: string | null;
  rawStatus: string | null;
}): {
  statusLabel: string | null;
  primaryNote: string | null;
} {
  switch (args.rawStatus) {
    case "linked-recipient-output":
      return {
        statusLabel: "Linked to recipient output",
        primaryNote: args.rawNote,
      };
    case "linked-change-output":
      return {
        statusLabel: "Linked to change output",
        primaryNote: args.rawNote,
      };
    case "mismatch":
      return {
        statusLabel: "Send root output mismatch",
        primaryNote: args.rawNote,
      };
    case "unavailable":
      return {
        statusLabel: "Awaiting send root registration",
        primaryNote: args.rawNote,
      };
    default:
      return {
        statusLabel: "Send root registration status unavailable",
        primaryNote: args.rawNote ?? "Operator send resulting-root registration status unavailable.",
      };
  }
}

function summarizePrivateCoreOperatorSendContinuityStatus(args: {
  rawNote: string | null;
  rawStatus: string | null;
}): {
  statusLabel: string | null;
  primaryNote: string | null;
} {
  switch (args.rawStatus) {
    case "ready-current-root":
      return {
        statusLabel: "Downstream continuity ready",
        primaryNote: args.rawNote,
      };
    case "ready-registered-stale":
      return {
        statusLabel: "Continuity registered but stale",
        primaryNote: args.rawNote,
      };
    case "awaiting-registration":
      return {
        statusLabel: "Awaiting continuity registration",
        primaryNote: args.rawNote,
      };
    case "registration-proof-unlinked":
      return {
        statusLabel: "Continuity proof linkage missing",
        primaryNote: args.rawNote,
      };
    case "output-mismatch":
      return {
        statusLabel: "Continuity output mismatch",
        primaryNote: args.rawNote,
      };
    case "downstream-consumed":
      return {
        statusLabel: "Continuity consumed downstream",
        primaryNote: args.rawNote,
      };
    case "downstream-released":
      return {
        statusLabel: "Continuity released downstream",
        primaryNote: args.rawNote,
      };
    case "missing-resulting-root":
      return {
        statusLabel: "Continuity missing resulting root",
        primaryNote: args.rawNote,
      };
    case "unavailable":
      return {
        statusLabel: "No continuity observed",
        primaryNote: args.rawNote,
      };
    default:
      return {
        statusLabel: "Continuity status unavailable",
        primaryNote: args.rawNote ?? "Operator send continuity status unavailable.",
      };
  }
}

function summarizePrivateCoreOperatorSwapBoundaryStatus(args: {
  rawNote: string | null;
  rawStatus: string | null;
}): {
  statusLabel: string | null;
  primaryNote: string | null;
} {
  switch (args.rawStatus) {
    case "coherent-current-root":
      return { statusLabel: "Swap boundary coherent", primaryNote: args.rawNote };
    case "coherent-registered-stale":
      return { statusLabel: "Swap boundary coherent but stale", primaryNote: args.rawNote };
    case "awaiting-registration":
      return { statusLabel: "Swap boundary awaiting registration", primaryNote: args.rawNote };
    case "proof-swap-unlinked":
      return { statusLabel: "Swap proof linkage missing", primaryNote: args.rawNote };
    case "registration-proof-unlinked":
      return { statusLabel: "Swap registration proof missing", primaryNote: args.rawNote };
    case "output-mismatch":
      return { statusLabel: "Swap output mismatch", primaryNote: args.rawNote };
    case "missing-resulting-root":
      return { statusLabel: "Swap resulting root missing", primaryNote: args.rawNote };
    case "downstream-consumed":
      return { statusLabel: "Swap output consumed downstream", primaryNote: args.rawNote };
    case "downstream-released":
      return { statusLabel: "Swap output released downstream", primaryNote: args.rawNote };
    case "unavailable":
      return {
        statusLabel: "Awaiting swap boundary",
        primaryNote: args.rawNote ?? "No private swap boundary state has been observed yet.",
      };
    default:
      return {
        statusLabel: "Swap boundary unavailable",
        primaryNote: args.rawNote ?? "Operator swap boundary status unavailable.",
      };
  }
}

function summarizePrivateCoreOperatorSwapResultingRootStatus(args: {
  latestSwap: VantaPrivateCoreOperatorSwapRecord | null;
  rawNote: string | null;
  rawStatus: string | null;
}): {
  statusLabel: string | null;
  primaryNote: string | null;
} {
  if (!args.latestSwap && !args.rawStatus) {
    return {
      statusLabel: "No swap root observed",
      primaryNote: "No private swap transition has been observed yet.",
    };
  }

  switch (args.rawStatus) {
    case "current-root":
      return { statusLabel: "Swap root is current", primaryNote: args.rawNote };
    case "registered-stale":
      return { statusLabel: "Swap root is stale", primaryNote: args.rawNote };
    case "downstream-consumed":
      return { statusLabel: "Swap root consumed downstream", primaryNote: args.rawNote };
    case "downstream-released":
      return { statusLabel: "Swap root released downstream", primaryNote: args.rawNote };
    case "unregistered":
      return { statusLabel: "Swap root not registered", primaryNote: args.rawNote };
    case "missing":
      return { statusLabel: "Swap root missing", primaryNote: args.rawNote };
    case "unavailable":
      return { statusLabel: "No swap root observed", primaryNote: args.rawNote };
    default:
      return {
        statusLabel: args.latestSwap?.resultingRoot ? "Swap root observed" : "No swap root observed",
        primaryNote: args.rawNote ?? "Operator swap resulting-root status unavailable.",
      };
  }
}

function summarizePrivateCoreOperatorSwapResultingRootRegistration(args: {
  rawNote: string | null;
  rawStatus: string | null;
}): {
  statusLabel: string | null;
  primaryNote: string | null;
} {
  switch (args.rawStatus) {
    case "linked-output":
      return { statusLabel: "Linked to swap output", primaryNote: args.rawNote };
    case "mismatch":
      return { statusLabel: "Swap root output mismatch", primaryNote: args.rawNote };
    case "unavailable":
      return { statusLabel: "Awaiting swap root registration", primaryNote: args.rawNote };
    default:
      return {
        statusLabel: "Swap root registration status unavailable",
        primaryNote: args.rawNote ?? "Operator swap resulting-root registration status unavailable.",
      };
  }
}

function summarizePrivateCoreOperatorSwapContinuityStatus(args: {
  rawNote: string | null;
  rawStatus: string | null;
}): {
  statusLabel: string | null;
  primaryNote: string | null;
} {
  switch (args.rawStatus) {
    case "ready-current-root":
      return { statusLabel: "Swap continuity ready", primaryNote: args.rawNote };
    case "ready-registered-stale":
      return { statusLabel: "Swap continuity registered but stale", primaryNote: args.rawNote };
    case "awaiting-registration":
      return {
        statusLabel: "Awaiting swap continuity registration",
        primaryNote: args.rawNote,
      };
    case "registration-proof-unlinked":
      return { statusLabel: "Swap continuity proof linkage missing", primaryNote: args.rawNote };
    case "output-mismatch":
      return { statusLabel: "Swap continuity output mismatch", primaryNote: args.rawNote };
    case "downstream-consumed":
      return { statusLabel: "Swap continuity consumed downstream", primaryNote: args.rawNote };
    case "downstream-released":
      return { statusLabel: "Swap continuity released downstream", primaryNote: args.rawNote };
    case "missing-resulting-root":
      return { statusLabel: "Swap continuity missing resulting root", primaryNote: args.rawNote };
    case "unavailable":
      return { statusLabel: "No swap continuity observed", primaryNote: args.rawNote };
    default:
      return {
        statusLabel: "Swap continuity status unavailable",
        primaryNote: args.rawNote ?? "Operator swap continuity status unavailable.",
      };
  }
}

function summarizePrivateCoreOperatorSendState(args: {
  latestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  latestSend: VantaPrivateCoreOperatorSendRecord | null;
  linkedProof: VantaPrivateCoreOperatorSendProofRecord | null;
  resultingRootPrimaryNote: string | null;
  resultingRootStatusLabel: string | null;
}): VantaPrivateCoreSendState | null {
  if (!args.latestSend) {
    return null;
  }

  const recipientUnshielded =
    args.latestConsume?.root === args.latestSend.resultingRoot &&
    args.latestRelease?.root === args.latestSend.resultingRoot &&
    args.latestRelease?.releasedAmount === args.latestSend.sendAmount &&
    args.latestConsume?.proofId === args.latestRelease?.proofId;

  return {
    recipientCommitment: args.latestSend.recipientCommitment,
    recipientPayloadCommitment: null,
    recipientAmount: args.latestSend.sendAmount,
    changeCommitment: args.latestSend.changeCommitment,
    changeAmount: args.latestSend.changeAmount,
    resultingRoot: args.latestSend.resultingRoot,
    resultingRootStatusLabel: args.resultingRootStatusLabel ?? "Send root status unavailable",
    resultingRootPrimaryNote:
      args.resultingRootPrimaryNote ?? "Operator send resulting-root status unavailable.",
    recipientRecoveryStatus:
      args.linkedProof?.proofId === args.latestSend.proofId
        ? "Recipient note recorded in operator send state"
        : "Recipient note pending linked proof",
    recipientUnshieldStatus: recipientUnshielded
      ? "Recipient note already unshielded through operator release"
      : "Recipient note ready for private hold or unshield",
    residualStateStatus:
      args.latestSend.changeAmount !== "0"
        ? "Residual note expected from send transition"
        : "No residual note remains",
    noteSummary: `${formatBaseUnits(BigInt(args.latestSend.sendAmount), VANTA_PRIVATE_CORE_VUSD_DECIMALS)} VUSD sent privately`,
    observationMode: "Operator send summary",
  };
}

function mergePrivateCoreSendStateWithOperatorDownstream(args: {
  baseState: VantaPrivateCoreSendState | null;
  latestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  resultingRootPrimaryNote: string | null;
  resultingRootStatusLabel: string | null;
}): VantaPrivateCoreSendState | null {
  if (!args.baseState) {
    return null;
  }

  const withOperatorRootStatus = {
    ...args.baseState,
    resultingRootStatusLabel:
      args.resultingRootStatusLabel ?? args.baseState.resultingRootStatusLabel,
    resultingRootPrimaryNote:
      args.resultingRootPrimaryNote ?? args.baseState.resultingRootPrimaryNote,
  };

  if (!withOperatorRootStatus.resultingRoot) {
    return withOperatorRootStatus;
  }

  const rootMatchesConsume = args.latestConsume?.root === withOperatorRootStatus.resultingRoot;
  const rootMatchesRelease = args.latestRelease?.root === withOperatorRootStatus.resultingRoot;
  const releaseMatchesAmount = args.latestRelease?.releasedAmount === withOperatorRootStatus.recipientAmount;

  if (
    rootMatchesConsume &&
    rootMatchesRelease &&
    releaseMatchesAmount &&
    args.latestConsume?.proofId === args.latestRelease?.proofId
  ) {
    return {
      ...withOperatorRootStatus,
      recipientUnshieldStatus: "Recipient note already unshielded through operator release",
    };
  }

  if (rootMatchesConsume) {
    return {
      ...withOperatorRootStatus,
      recipientUnshieldStatus: "Recipient note consumed; awaiting operator release summary",
    };
  }

  return withOperatorRootStatus;
}

function summarizePrivateCoreOperatorSwapState(args: {
  latestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  latestSwap: VantaPrivateCoreOperatorSwapRecord | null;
  linkedProof: VantaPrivateCoreOperatorSwapProofRecord | null;
  boundaryPrimaryNote: string | null;
  boundaryStatusLabel: string | null;
  continuityPrimaryNote: string | null;
  continuityStatusLabel: string | null;
  resultingRootPrimaryNote: string | null;
  resultingRootStatusLabel: string | null;
}): VantaPrivateCoreSwapState | null {
  if (!args.latestSwap) {
    return null;
  }

  const outputUnshielded =
    args.latestConsume?.root === args.latestSwap.resultingRoot &&
    args.latestRelease?.root === args.latestSwap.resultingRoot &&
    args.latestRelease?.releasedAmount === args.latestSwap.outputAmount &&
    args.latestConsume?.proofId === args.latestRelease?.proofId;

  return {
    outputCommitment: args.latestSwap.outputCommitment,
    outputPayloadCommitment: null,
    outputAssetId: args.latestSwap.outputAssetId,
    outputAmount: args.latestSwap.outputAmount,
    executionBasisLabel: "Operator summary-backed swap state",
    executionPrimaryNote:
      "This swap handoff is being reconstructed from persisted operator summary state rather than a newly applied local current-note path.",
    executionVenueLabel: args.latestSwap.executionVenueLabel ?? null,
    executionQuoteReference: args.latestSwap.executionQuoteReference ?? null,
    livePathStatusLabel: "Operator summary-backed state",
    livePathPrimaryNote:
      "The original current-note swap preparation state is not persisted, so this handoff is being reconstructed from operator summary state.",
    livePathPrimaryBlocker: null,
    resultingRoot: args.latestSwap.resultingRoot,
    resultingRootStatusLabel: args.resultingRootStatusLabel ?? "Swap root status unavailable",
    resultingRootPrimaryNote:
      args.resultingRootPrimaryNote ?? "Operator swap resulting-root status unavailable.",
    outputRecoveryStatus:
      args.linkedProof?.proofId === args.latestSwap.proofId
        ? "Swap output recorded in operator state"
        : "Swap output pending linked proof",
    outputUnshieldStatus: outputUnshielded
      ? "Swap output already unshielded through operator release"
      : "Swap output ready for private hold or unshield",
    boundaryStatusLabel: args.boundaryStatusLabel ?? "Swap boundary status unavailable",
    boundaryPrimaryNote:
      args.boundaryPrimaryNote ?? "Operator swap boundary status unavailable.",
    continuityStatusLabel: args.continuityStatusLabel ?? "Swap continuity status unavailable",
    continuityPrimaryNote:
      args.continuityPrimaryNote ?? "Operator swap continuity status unavailable.",
    noteSummary: `${formatPrivateCoreAssetAmount(
      args.latestSwap.outputAssetId,
      BigInt(args.latestSwap.outputAmount),
    )} swapped privately`,
    observationMode: "Operator swap summary",
  };
}

function mergePrivateCoreSwapStateWithOperatorDownstream(args: {
  baseState: VantaPrivateCoreSwapState | null;
  boundaryPrimaryNote: string | null;
  boundaryStatusLabel: string | null;
  continuityPrimaryNote: string | null;
  continuityStatusLabel: string | null;
  latestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  resultingRootPrimaryNote: string | null;
  resultingRootStatusLabel: string | null;
}): VantaPrivateCoreSwapState | null {
  if (!args.baseState) {
    return null;
  }

  const withOperatorRootStatus = {
    ...args.baseState,
    boundaryStatusLabel: args.boundaryStatusLabel ?? args.baseState.boundaryStatusLabel,
    boundaryPrimaryNote: args.boundaryPrimaryNote ?? args.baseState.boundaryPrimaryNote,
    continuityStatusLabel: args.continuityStatusLabel ?? args.baseState.continuityStatusLabel,
    continuityPrimaryNote: args.continuityPrimaryNote ?? args.baseState.continuityPrimaryNote,
    resultingRootStatusLabel:
      args.resultingRootStatusLabel ?? args.baseState.resultingRootStatusLabel,
    resultingRootPrimaryNote:
      args.resultingRootPrimaryNote ?? args.baseState.resultingRootPrimaryNote,
  };

  if (!withOperatorRootStatus.resultingRoot) {
    return withOperatorRootStatus;
  }

  const rootMatchesConsume = args.latestConsume?.root === withOperatorRootStatus.resultingRoot;
  const rootMatchesRelease = args.latestRelease?.root === withOperatorRootStatus.resultingRoot;
  const releaseMatchesAmount = args.latestRelease?.releasedAmount === withOperatorRootStatus.outputAmount;

  if (
    rootMatchesConsume &&
    rootMatchesRelease &&
    releaseMatchesAmount &&
    args.latestConsume?.proofId === args.latestRelease?.proofId
  ) {
    return {
      ...withOperatorRootStatus,
      outputUnshieldStatus: "Swap output already unshielded through operator release",
    };
  }

  return withOperatorRootStatus;
}

function applyPrivateCoreOperatorContractState(args: {
  contractState: VantaPrivateCoreOperatorContractStateResponse;
  setPrivateCoreOperatorContractStateVersion: (value: number | null) => void;
  setPrivateCoreOperatorContractVersion: (value: number | null) => void;
  setPrivateCoreOperatorContractSummaryVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedSendLaneKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendLaneNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendLaneStatus: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendLaneVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedSendV1Decision: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendV1DecisionNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedUnshieldLaneKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedUnshieldLaneNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedUnshieldLaneStatus: (value: string | null) => void;
  setPrivateCoreOperatorSupportedUnshieldLaneVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedUnshieldV1Decision: (value: string | null) => void;
  setPrivateCoreOperatorSupportedUnshieldV1DecisionNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleaseLaneKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleaseLaneNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleaseLaneStatus: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleaseLaneVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedReleaseV1Decision: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleaseV1DecisionNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapLaneKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapLaneNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapLaneStatus: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapLaneVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedSwapV1Decision: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapV1DecisionNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapV1Role: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapV1RoleNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapVenue: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapOutputModel: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapResultingRootBasis: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapInputRootPolicy: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSwapOutputRegistrationPolicy: (value: string | null) => void;
  setPrivateCoreOperatorSupportedFlowKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedFlowNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedFlowStatus: (value: string | null) => void;
  setPrivateCoreOperatorSupportedFlowVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedZkV1ScopeDecision: (value: string | null) => void;
  setPrivateCoreOperatorSupportedZkV1ScopeNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedZkV1RequiredLanes: (value: string | null) => void;
  setPrivateCoreOperatorSupportedZkV1RequiredLanesNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedAssetSymbol: (value: string | null) => void;
  setPrivateCoreOperatorSupportedEnvironment: (value: string | null) => void;
  setPrivateCoreOperatorSupportedNoteSchema: (value: string | null) => void;
  setPrivateCoreOperatorSupportedNoteVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedRootRegistrationProvenance: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendResultingRootBasis: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendInputRootPolicy: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendOutputRegistrationPolicy: (value: string | null) => void;
  setPrivateCoreOperatorSupportedStatusNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedStatusTransport: (value: string | null) => void;
  setPrivateCoreOperatorSupportedStatusEndpoint: (value: string | null) => void;
  setPrivateCoreOperatorSupportedStatusGateVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedStatusGateKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedStatusGateNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedStatusGateTransport: (value: string | null) => void;
  setPrivateCoreOperatorSupportedStatusGateEndpoint: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSnapshotGateVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedSnapshotGateKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSnapshotGateNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSnapshotGateTransport: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSnapshotGateEndpoint: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingDecisionGateVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedShippingDecisionGateKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingDecisionGateNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingDecisionGateTransport: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingDecisionGateEndpoint: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingDecisionTransport: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingDecisionEndpoint: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingArtifactGateVersion: (value: number | null) => void;
  setPrivateCoreOperatorSupportedShippingArtifactGateKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingArtifactGateNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingArtifactGateTransport: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingArtifactGateEndpoint: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSnapshotNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSnapshotTransport: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSnapshotEndpoint: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingArtifactNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingArtifactTransport: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingArtifactEndpoint: (value: string | null) => void;
  setPrivateCoreOperatorSupportedRecipientModel: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleaseDestinationModel: (value: string | null) => void;
  setPrivateCoreOperatorSupportedProofSystem: (value: string | null) => void;
  setPrivateCoreOperatorSupportedUnshieldCircuit: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendCircuit: (value: string | null) => void;
  setPrivateCoreOperatorSupportedUnshieldMerkleDepth: (value: number | null) => void;
  setPrivateCoreOperatorSupportedSendMerkleDepth: (value: number | null) => void;
  setPrivateCoreOperatorSupportedReleaseAuthorizationBasis: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleaseRootPolicy: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleaseExecutionModel: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleaseAtomicityModel: (value: string | null) => void;
  setPrivateCoreOperatorSupportedReleasePersistenceModel: (value: string | null) => void;
  setPrivateCoreOperatorSupportedShippingDecisionNote: (value: string | null) => void;
  setPrivateCoreOperatorOwnerAuthorizationMode: (value: string | null) => void;
  setPrivateCoreOperatorOwnerAuthorizationDecision: (value: string | null) => void;
  setPrivateCoreOperatorOwnerAuthorizationDecisionNote: (value: string | null) => void;
  setPrivateCoreOperatorSourceArtifactTruthBasis: (value: string | null) => void;
  setPrivateCoreOperatorProvingArtifactTruthBasis: (value: string | null) => void;
  setPrivateCoreOperatorSourceProvingRelationship: (value: string | null) => void;
  setPrivateCoreOperatorNullifierKeyMode: (value: string | null) => void;
  setPrivateCoreOperatorProvingHashLane: (value: string | null) => void;
}) {
  args.setPrivateCoreOperatorContractStateVersion(args.contractState.stateVersion);
  args.setPrivateCoreOperatorContractVersion(args.contractState.contractVersion);
  args.setPrivateCoreOperatorContractSummaryVersion(args.contractState.summaryVersion);
  args.setPrivateCoreOperatorSupportedSendLaneKind(args.contractState.supportedSendLaneKind);
  args.setPrivateCoreOperatorSupportedSendLaneNote(args.contractState.supportedSendLaneNote);
  args.setPrivateCoreOperatorSupportedSendLaneStatus(args.contractState.supportedSendLaneStatus);
  args.setPrivateCoreOperatorSupportedSendLaneVersion(args.contractState.supportedSendLaneVersion);
  args.setPrivateCoreOperatorSupportedSendV1Decision(
    args.contractState.supportedSendV1Decision,
  );
  args.setPrivateCoreOperatorSupportedSendV1DecisionNote(
    args.contractState.supportedSendV1DecisionNote,
  );
  args.setPrivateCoreOperatorSupportedUnshieldLaneKind(args.contractState.supportedUnshieldLaneKind);
  args.setPrivateCoreOperatorSupportedUnshieldLaneNote(args.contractState.supportedUnshieldLaneNote);
  args.setPrivateCoreOperatorSupportedUnshieldLaneStatus(
    args.contractState.supportedUnshieldLaneStatus,
  );
  args.setPrivateCoreOperatorSupportedUnshieldLaneVersion(
    args.contractState.supportedUnshieldLaneVersion,
  );
  args.setPrivateCoreOperatorSupportedUnshieldV1Decision(
    args.contractState.supportedUnshieldV1Decision,
  );
  args.setPrivateCoreOperatorSupportedUnshieldV1DecisionNote(
    args.contractState.supportedUnshieldV1DecisionNote,
  );
  args.setPrivateCoreOperatorSupportedReleaseLaneKind(args.contractState.supportedReleaseLaneKind);
  args.setPrivateCoreOperatorSupportedReleaseLaneNote(args.contractState.supportedReleaseLaneNote);
  args.setPrivateCoreOperatorSupportedReleaseLaneStatus(
    args.contractState.supportedReleaseLaneStatus,
  );
  args.setPrivateCoreOperatorSupportedReleaseLaneVersion(
    args.contractState.supportedReleaseLaneVersion,
  );
  args.setPrivateCoreOperatorSupportedReleaseV1Decision(
    args.contractState.supportedReleaseV1Decision,
  );
  args.setPrivateCoreOperatorSupportedReleaseV1DecisionNote(
    args.contractState.supportedReleaseV1DecisionNote,
  );
  args.setPrivateCoreOperatorSupportedSwapLaneKind(args.contractState.supportedSwapLaneKind);
  args.setPrivateCoreOperatorSupportedSwapLaneNote(args.contractState.supportedSwapLaneNote);
  args.setPrivateCoreOperatorSupportedSwapLaneStatus(args.contractState.supportedSwapLaneStatus);
  args.setPrivateCoreOperatorSupportedSwapLaneVersion(
    args.contractState.supportedSwapLaneVersion,
  );
  args.setPrivateCoreOperatorSupportedSwapV1Decision(
    args.contractState.supportedSwapV1Decision,
  );
  args.setPrivateCoreOperatorSupportedSwapV1DecisionNote(
    args.contractState.supportedSwapV1DecisionNote,
  );
  args.setPrivateCoreOperatorSupportedSwapV1Role(args.contractState.supportedSwapV1Role);
  args.setPrivateCoreOperatorSupportedSwapV1RoleNote(
    args.contractState.supportedSwapV1RoleNote,
  );
  args.setPrivateCoreOperatorSupportedSwapVenue(args.contractState.supportedSwapVenue);
  args.setPrivateCoreOperatorSupportedSwapOutputModel(
    args.contractState.supportedSwapOutputModel,
  );
  args.setPrivateCoreOperatorSupportedSwapResultingRootBasis(
    args.contractState.supportedSwapResultingRootBasis,
  );
  args.setPrivateCoreOperatorSupportedSwapInputRootPolicy(
    args.contractState.supportedSwapInputRootPolicy,
  );
  args.setPrivateCoreOperatorSupportedSwapOutputRegistrationPolicy(
    args.contractState.supportedSwapOutputRegistrationPolicy,
  );
  args.setPrivateCoreOperatorSupportedFlowKind(args.contractState.supportedFlowKind);
  args.setPrivateCoreOperatorSupportedFlowNote(args.contractState.supportedFlowNote);
  args.setPrivateCoreOperatorSupportedFlowStatus(args.contractState.supportedFlowStatus);
  args.setPrivateCoreOperatorSupportedFlowVersion(args.contractState.supportedFlowVersion);
  args.setPrivateCoreOperatorSupportedZkV1ScopeDecision(
    args.contractState.supportedZkV1ScopeDecision,
  );
  args.setPrivateCoreOperatorSupportedZkV1ScopeNote(args.contractState.supportedZkV1ScopeNote);
  args.setPrivateCoreOperatorSupportedZkV1RequiredLanes(
    args.contractState.supportedZkV1RequiredLanes,
  );
  args.setPrivateCoreOperatorSupportedZkV1RequiredLanesNote(
    args.contractState.supportedZkV1RequiredLanesNote,
  );
  args.setPrivateCoreOperatorSupportedAssetSymbol(args.contractState.supportedAssetSymbol);
  args.setPrivateCoreOperatorSupportedEnvironment(args.contractState.supportedEnvironment);
  args.setPrivateCoreOperatorSupportedNoteSchema(args.contractState.supportedNoteSchema);
  args.setPrivateCoreOperatorSupportedNoteVersion(args.contractState.supportedNoteVersion);
  args.setPrivateCoreOperatorSupportedRootRegistrationProvenance(
    args.contractState.supportedRootRegistrationProvenance,
  );
  args.setPrivateCoreOperatorSupportedSendResultingRootBasis(
    args.contractState.supportedSendResultingRootBasis,
  );
  args.setPrivateCoreOperatorSupportedSendInputRootPolicy(
    args.contractState.supportedSendInputRootPolicy,
  );
  args.setPrivateCoreOperatorSupportedSendOutputRegistrationPolicy(
    args.contractState.supportedSendOutputRegistrationPolicy,
  );
  args.setPrivateCoreOperatorSupportedStatusNote(args.contractState.supportedOperatorStatusNote);
  args.setPrivateCoreOperatorSupportedStatusTransport(
    args.contractState.supportedOperatorStatusTransport,
  );
  args.setPrivateCoreOperatorSupportedStatusEndpoint(
    args.contractState.supportedOperatorStatusEndpoint,
  );
  args.setPrivateCoreOperatorSupportedStatusGateVersion(
    args.contractState.supportedOperatorStatusGateVersion,
  );
  args.setPrivateCoreOperatorSupportedStatusGateKind(
    args.contractState.supportedOperatorStatusGateKind,
  );
  args.setPrivateCoreOperatorSupportedStatusGateNote(
    args.contractState.supportedOperatorStatusGateNote,
  );
  args.setPrivateCoreOperatorSupportedStatusGateTransport(
    args.contractState.supportedOperatorStatusGateTransport,
  );
  args.setPrivateCoreOperatorSupportedStatusGateEndpoint(
    args.contractState.supportedOperatorStatusGateEndpoint,
  );
  args.setPrivateCoreOperatorSupportedSnapshotGateVersion(
    args.contractState.supportedOperatorSnapshotGateVersion,
  );
  args.setPrivateCoreOperatorSupportedSnapshotGateKind(
    args.contractState.supportedOperatorSnapshotGateKind,
  );
  args.setPrivateCoreOperatorSupportedSnapshotGateNote(
    args.contractState.supportedOperatorSnapshotGateNote,
  );
  args.setPrivateCoreOperatorSupportedSnapshotGateTransport(
    args.contractState.supportedOperatorSnapshotGateTransport,
  );
  args.setPrivateCoreOperatorSupportedSnapshotGateEndpoint(
    args.contractState.supportedOperatorSnapshotGateEndpoint,
  );
  args.setPrivateCoreOperatorSupportedShippingDecisionGateVersion(
    args.contractState.supportedShippingDecisionGateVersion,
  );
  args.setPrivateCoreOperatorSupportedShippingDecisionGateKind(
    args.contractState.supportedShippingDecisionGateKind,
  );
  args.setPrivateCoreOperatorSupportedShippingDecisionGateNote(
    args.contractState.supportedShippingDecisionGateNote,
  );
  args.setPrivateCoreOperatorSupportedShippingDecisionGateTransport(
    args.contractState.supportedShippingDecisionGateTransport,
  );
  args.setPrivateCoreOperatorSupportedShippingDecisionGateEndpoint(
    args.contractState.supportedShippingDecisionGateEndpoint,
  );
  args.setPrivateCoreOperatorSupportedShippingDecisionTransport(
    args.contractState.supportedShippingDecisionTransport,
  );
  args.setPrivateCoreOperatorSupportedShippingDecisionEndpoint(
    args.contractState.supportedShippingDecisionEndpoint,
  );
  args.setPrivateCoreOperatorSupportedShippingArtifactGateVersion(
    args.contractState.supportedShippingArtifactGateVersion,
  );
  args.setPrivateCoreOperatorSupportedShippingArtifactGateKind(
    args.contractState.supportedShippingArtifactGateKind,
  );
  args.setPrivateCoreOperatorSupportedShippingArtifactGateNote(
    args.contractState.supportedShippingArtifactGateNote,
  );
  args.setPrivateCoreOperatorSupportedShippingArtifactGateTransport(
    args.contractState.supportedShippingArtifactGateTransport,
  );
  args.setPrivateCoreOperatorSupportedShippingArtifactGateEndpoint(
    args.contractState.supportedShippingArtifactGateEndpoint,
  );
  args.setPrivateCoreOperatorSupportedSnapshotNote(
    args.contractState.supportedOperatorSnapshotNote,
  );
  args.setPrivateCoreOperatorSupportedSnapshotTransport(
    args.contractState.supportedOperatorSnapshotTransport,
  );
  args.setPrivateCoreOperatorSupportedSnapshotEndpoint(
    args.contractState.supportedOperatorSnapshotEndpoint,
  );
  args.setPrivateCoreOperatorSupportedShippingArtifactTransport(
    args.contractState.supportedShippingArtifactTransport,
  );
  args.setPrivateCoreOperatorSupportedShippingArtifactNote(
    args.contractState.supportedShippingArtifactNote,
  );
  args.setPrivateCoreOperatorSupportedShippingArtifactEndpoint(
    args.contractState.supportedShippingArtifactEndpoint,
  );
  args.setPrivateCoreOperatorSupportedRecipientModel(args.contractState.supportedRecipientModel);
  args.setPrivateCoreOperatorSupportedReleaseDestinationModel(
    args.contractState.supportedReleaseDestinationModel,
  );
  args.setPrivateCoreOperatorSupportedProofSystem(args.contractState.supportedProofSystem);
  args.setPrivateCoreOperatorSupportedUnshieldCircuit(args.contractState.supportedUnshieldCircuit);
  args.setPrivateCoreOperatorSupportedSendCircuit(args.contractState.supportedSendCircuit);
  args.setPrivateCoreOperatorSupportedUnshieldMerkleDepth(
    args.contractState.supportedUnshieldMerkleDepth,
  );
  args.setPrivateCoreOperatorSupportedSendMerkleDepth(
    args.contractState.supportedSendMerkleDepth,
  );
  args.setPrivateCoreOperatorSupportedReleaseAuthorizationBasis(
    args.contractState.supportedReleaseAuthorizationBasis,
  );
  args.setPrivateCoreOperatorSupportedReleaseRootPolicy(
    args.contractState.supportedReleaseRootPolicy,
  );
  args.setPrivateCoreOperatorSupportedReleaseExecutionModel(
    args.contractState.supportedReleaseExecutionModel,
  );
  args.setPrivateCoreOperatorSupportedReleaseAtomicityModel(
    args.contractState.supportedReleaseAtomicityModel,
  );
  args.setPrivateCoreOperatorSupportedReleasePersistenceModel(
    args.contractState.supportedReleasePersistenceModel,
  );
  args.setPrivateCoreOperatorSupportedShippingDecisionNote(
    args.contractState.supportedShippingDecisionNote,
  );
  args.setPrivateCoreOperatorOwnerAuthorizationMode(args.contractState.ownerAuthorizationMode);
  args.setPrivateCoreOperatorOwnerAuthorizationDecision(
    args.contractState.ownerAuthorizationDecision,
  );
  args.setPrivateCoreOperatorOwnerAuthorizationDecisionNote(
    args.contractState.ownerAuthorizationDecisionNote,
  );
  args.setPrivateCoreOperatorSourceArtifactTruthBasis(
    args.contractState.sourceArtifactTruthBasis,
  );
  args.setPrivateCoreOperatorProvingArtifactTruthBasis(
    args.contractState.provingArtifactTruthBasis,
  );
  args.setPrivateCoreOperatorSourceProvingRelationship(
    args.contractState.sourceProvingRelationship,
  );
  args.setPrivateCoreOperatorNullifierKeyMode(args.contractState.nullifierKeyMode);
  args.setPrivateCoreOperatorProvingHashLane(args.contractState.provingHashLane);
}

function applyPrivateCoreOperatorSummaryState(args: {
  summaryState: VantaPrivateCoreOperatorSummaryStateResponse;
  setPrivateCoreOperatorCurrentRoot: (value: string | null) => void;
  setPrivateCoreOperatorLatestConsume: (value: VantaPrivateCoreOperatorConsumeRecord | null) => void;
  setPrivateCoreOperatorLatestConsumeProof: (value: VantaPrivateCoreOperatorProofRecord | null) => void;
  setPrivateCoreOperatorLatestProof: (value: VantaPrivateCoreOperatorProofRecord | null) => void;
  setPrivateCoreOperatorLatestRelease: (value: VantaPrivateCoreOperatorReleaseRecord | null) => void;
  setPrivateCoreOperatorLatestReleaseProof: (value: VantaPrivateCoreOperatorProofRecord | null) => void;
  setPrivateCoreOperatorLatestRoot: (value: VantaPrivateCoreOperatorRootRecord | null) => void;
  setPrivateCoreOperatorLatestSend: (value: VantaPrivateCoreOperatorSendRecord | null) => void;
  setPrivateCoreOperatorLatestSendLinkedProof: (value: VantaPrivateCoreOperatorSendProofRecord | null) => void;
  setPrivateCoreOperatorLatestSendProof: (value: VantaPrivateCoreOperatorSendProofRecord | null) => void;
  setPrivateCoreOperatorLatestSwap: (value: VantaPrivateCoreOperatorSwapRecord | null) => void;
  setPrivateCoreOperatorLatestSwapLinkedProof: (value: VantaPrivateCoreOperatorSwapProofRecord | null) => void;
  setPrivateCoreOperatorLatestSwapProof: (value: VantaPrivateCoreOperatorSwapProofRecord | null) => void;
  setPrivateCoreOperatorCurrentRootLinkedProof: (value: VantaPrivateCoreOperatorProofRecord | null) => void;
  setPrivateCoreOperatorCurrentRootProofLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorSendResultingRootLinkedProof: (value: VantaPrivateCoreOperatorProofRecord | null) => void;
  setPrivateCoreOperatorSendResultingRootRecord: (value: VantaPrivateCoreOperatorRootRecord | null) => void;
  setPrivateCoreOperatorSwapResultingRootLinkedProof: (value: VantaPrivateCoreOperatorProofRecord | null) => void;
  setPrivateCoreOperatorSwapResultingRootRecord: (value: VantaPrivateCoreOperatorRootRecord | null) => void;
  setPrivateCoreOperatorRawSendContinuityNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSendContinuityStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawSendBoundaryNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSendBoundaryStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawSendResultingRootNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSendResultingRootRegistrationNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSendResultingRootRegistrationStatus: (value: string | null) => void;
  setPrivateCoreOperatorSendResultingRootProofLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawSendResultingRootStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawSwapContinuityNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSwapContinuityStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawSwapBoundaryNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSwapBoundaryStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawSwapResultingRootNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSwapResultingRootRegistrationNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSwapResultingRootRegistrationStatus: (value: string | null) => void;
  setPrivateCoreOperatorSwapResultingRootProofLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawSwapResultingRootStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawBoundaryNote: (value: string | null) => void;
  setPrivateCoreOperatorRawBoundaryStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawReleaseBoundaryNote: (value: string | null) => void;
  setPrivateCoreOperatorRawReleaseBoundaryStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawRequiredLanesNote: (value: string | null) => void;
  setPrivateCoreOperatorRawRequiredLanesStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawZkV1ShippingNote: (value: string | null) => void;
  setPrivateCoreOperatorRawZkV1ShippingStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawContractMirrorNote: (value: string | null) => void;
  setPrivateCoreOperatorRawContractMirrorStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawZkV1FinishLineNote: (value: string | null) => void;
  setPrivateCoreOperatorRawZkV1FinishLineStatus: (value: string | null) => void;
  setPrivateCoreOperatorConsumes: (value: VantaPrivateCoreOperatorConsumeRecord[]) => void;
  setPrivateCoreOperatorProofConsumeLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorProofs: (value: VantaPrivateCoreOperatorProofRecord[]) => void;
  setPrivateCoreOperatorProofSendLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorProofSwapLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorProofReleaseLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorReleases: (value: VantaPrivateCoreOperatorReleaseRecord[]) => void;
  setPrivateCoreOperatorRoots: (value: VantaPrivateCoreOperatorRootRecord[]) => void;
  setPrivateCoreOperatorSends: (value: VantaPrivateCoreOperatorSendRecord[]) => void;
  setPrivateCoreOperatorSendProofs: (value: VantaPrivateCoreOperatorSendProofRecord[]) => void;
  setPrivateCoreOperatorSwaps: (value: VantaPrivateCoreOperatorSwapRecord[]) => void;
  setPrivateCoreOperatorSwapProofs: (value: VantaPrivateCoreOperatorSwapProofRecord[]) => void;
}) {
  args.setPrivateCoreOperatorCurrentRoot(args.summaryState.currentRoot);
  args.setPrivateCoreOperatorLatestRoot(args.summaryState.currentRecord);
  args.setPrivateCoreOperatorLatestProof(args.summaryState.latestProof);
  args.setPrivateCoreOperatorLatestSend(args.summaryState.latestSend);
  args.setPrivateCoreOperatorLatestSendLinkedProof(args.summaryState.latestSendLinkedProof);
  args.setPrivateCoreOperatorLatestSendProof(args.summaryState.latestSendProof);
  args.setPrivateCoreOperatorLatestSwap(args.summaryState.latestSwap);
  args.setPrivateCoreOperatorLatestSwapLinkedProof(args.summaryState.latestSwapLinkedProof);
  args.setPrivateCoreOperatorLatestSwapProof(args.summaryState.latestSwapProof);
  args.setPrivateCoreOperatorCurrentRootLinkedProof(args.summaryState.currentRootLinkedProof);
  args.setPrivateCoreOperatorCurrentRootProofLinkStatus(args.summaryState.currentRootProofLinkStatus);
  args.setPrivateCoreOperatorSendResultingRootLinkedProof(args.summaryState.sendResultingRootLinkedProof);
  args.setPrivateCoreOperatorSendResultingRootRecord(args.summaryState.sendResultingRootRecord);
  args.setPrivateCoreOperatorSwapResultingRootLinkedProof(args.summaryState.swapResultingRootLinkedProof);
  args.setPrivateCoreOperatorSwapResultingRootRecord(args.summaryState.swapResultingRootRecord);
  args.setPrivateCoreOperatorRawSendContinuityNote(args.summaryState.sendContinuityNote);
  args.setPrivateCoreOperatorRawSendContinuityStatus(args.summaryState.sendContinuityStatus);
  args.setPrivateCoreOperatorRawSendBoundaryNote(args.summaryState.sendBoundaryNote);
  args.setPrivateCoreOperatorRawSendBoundaryStatus(args.summaryState.sendBoundaryStatus);
  args.setPrivateCoreOperatorRawSendResultingRootNote(args.summaryState.sendResultingRootNote);
  args.setPrivateCoreOperatorRawSendResultingRootRegistrationNote(
    args.summaryState.sendResultingRootRegistrationNote,
  );
  args.setPrivateCoreOperatorRawSendResultingRootRegistrationStatus(
    args.summaryState.sendResultingRootRegistrationStatus,
  );
  args.setPrivateCoreOperatorSendResultingRootProofLinkStatus(
    args.summaryState.sendResultingRootProofLinkStatus,
  );
  args.setPrivateCoreOperatorRawSendResultingRootStatus(args.summaryState.sendResultingRootStatus);
  args.setPrivateCoreOperatorRawSwapContinuityNote(args.summaryState.swapContinuityNote);
  args.setPrivateCoreOperatorRawSwapContinuityStatus(args.summaryState.swapContinuityStatus);
  args.setPrivateCoreOperatorRawSwapBoundaryNote(args.summaryState.swapBoundaryNote);
  args.setPrivateCoreOperatorRawSwapBoundaryStatus(args.summaryState.swapBoundaryStatus);
  args.setPrivateCoreOperatorRawSwapResultingRootNote(args.summaryState.swapResultingRootNote);
  args.setPrivateCoreOperatorRawSwapResultingRootRegistrationNote(
    args.summaryState.swapResultingRootRegistrationNote,
  );
  args.setPrivateCoreOperatorRawSwapResultingRootRegistrationStatus(
    args.summaryState.swapResultingRootRegistrationStatus,
  );
  args.setPrivateCoreOperatorSwapResultingRootProofLinkStatus(
    args.summaryState.swapResultingRootProofLinkStatus,
  );
  args.setPrivateCoreOperatorRawSwapResultingRootStatus(args.summaryState.swapResultingRootStatus);
  args.setPrivateCoreOperatorLatestConsume(args.summaryState.latestConsume);
  args.setPrivateCoreOperatorLatestConsumeProof(args.summaryState.latestConsumeProof);
  args.setPrivateCoreOperatorLatestRelease(args.summaryState.latestRelease);
  args.setPrivateCoreOperatorLatestReleaseProof(args.summaryState.latestReleaseProof);
  args.setPrivateCoreOperatorRawContractMirrorNote(args.summaryState.contractMirrorNote);
  args.setPrivateCoreOperatorRawContractMirrorStatus(args.summaryState.contractMirrorStatus);
  args.setPrivateCoreOperatorRawBoundaryNote(args.summaryState.boundaryNote);
  args.setPrivateCoreOperatorRawBoundaryStatus(args.summaryState.boundaryStatus);
  args.setPrivateCoreOperatorRawReleaseBoundaryNote(args.summaryState.releaseBoundaryNote);
  args.setPrivateCoreOperatorRawReleaseBoundaryStatus(args.summaryState.releaseBoundaryStatus);
  args.setPrivateCoreOperatorRawRequiredLanesNote(args.summaryState.requiredLanesNote);
  args.setPrivateCoreOperatorRawRequiredLanesStatus(args.summaryState.requiredLanesStatus);
  args.setPrivateCoreOperatorRawZkV1ShippingNote(args.summaryState.zkV1ShippingNote);
  args.setPrivateCoreOperatorRawZkV1ShippingStatus(args.summaryState.zkV1ShippingStatus);
  args.setPrivateCoreOperatorRawZkV1FinishLineNote(args.summaryState.zkV1FinishLineNote);
  args.setPrivateCoreOperatorRawZkV1FinishLineStatus(args.summaryState.zkV1FinishLineStatus);
  args.setPrivateCoreOperatorRoots(args.summaryState.rootRecords);
  args.setPrivateCoreOperatorProofs(args.summaryState.proofRecords);
  args.setPrivateCoreOperatorSends(args.summaryState.sendRecords);
  args.setPrivateCoreOperatorSendProofs(args.summaryState.sendProofRecords);
  args.setPrivateCoreOperatorSwaps(args.summaryState.swapRecords);
  args.setPrivateCoreOperatorSwapProofs(args.summaryState.swapProofRecords);
  args.setPrivateCoreOperatorConsumes(args.summaryState.consumeRecords);
  args.setPrivateCoreOperatorProofSendLinkStatus(args.summaryState.proofSendLinkStatus);
  args.setPrivateCoreOperatorProofSwapLinkStatus(args.summaryState.proofSwapLinkStatus);
  args.setPrivateCoreOperatorProofConsumeLinkStatus(args.summaryState.proofConsumeLinkStatus);
  args.setPrivateCoreOperatorReleases(args.summaryState.releaseRecords);
  args.setPrivateCoreOperatorProofReleaseLinkStatus(args.summaryState.proofReleaseLinkStatus);
}

function summarizePrivateCoreImmediateOperatorConsume(
  consumeReceipt: VantaPrivateCoreConsumeOperatorResponse,
): VantaPrivateCoreOperatorConsumeRecord {
  return {
    assetId: consumeReceipt.releasedAssetId,
    amount: consumeReceipt.releasedAmount,
    completedAt: consumeReceipt.completedAt,
    leafIndex: consumeReceipt.leafIndex,
    nullifier: consumeReceipt.nullifier,
    proofFieldCount: consumeReceipt.proofFieldCount,
    proofId: consumeReceipt.proofId,
    publicInputCount: consumeReceipt.publicInputCount,
    releaseDestination: consumeReceipt.releaseDestination,
    root: consumeReceipt.root,
  };
}

function summarizePrivateCoreImmediateOperatorRelease(
  consumeReceipt: VantaPrivateCoreConsumeOperatorResponse,
): VantaPrivateCoreOperatorReleaseRecord {
  return {
    assetId: consumeReceipt.releasedAssetId,
    amount: consumeReceipt.releasedAmount,
    authorizationBasis: consumeReceipt.authorizationBasis,
    completedAt: consumeReceipt.completedAt,
    consumedNoteId: `private-core-nullifier:${consumeReceipt.nullifier}`,
    nullifier: consumeReceipt.nullifier,
    proofFieldCount: consumeReceipt.proofFieldCount,
    proofId: consumeReceipt.proofId,
    publicInputCount: consumeReceipt.publicInputCount,
    releaseDestination: consumeReceipt.releaseDestination,
    rootPolicy: consumeReceipt.rootPolicy,
    releasedAssetId: consumeReceipt.releasedAssetId,
    releasedAmount: consumeReceipt.releasedAmount,
    requestId: consumeReceipt.releaseRequestId,
    root: consumeReceipt.root,
    transitionNoteId: consumeReceipt.releaseTransitionNoteId,
  };
}

function mergePrivateCoreOperatorConsumes(
  records: VantaPrivateCoreOperatorConsumeRecord[],
  nextRecord: VantaPrivateCoreOperatorConsumeRecord,
) {
  return [nextRecord, ...records.filter((record) => record.nullifier !== nextRecord.nullifier)];
}

function mergePrivateCoreOperatorReleases(
  records: VantaPrivateCoreOperatorReleaseRecord[],
  nextRecord: VantaPrivateCoreOperatorReleaseRecord,
) {
  return [nextRecord, ...records.filter((record) => record.requestId !== nextRecord.requestId)];
}
