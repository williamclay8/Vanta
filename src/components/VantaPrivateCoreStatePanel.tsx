import type {
  VantaPrivateCoreHoldState,
  VantaPrivateCoreSendState,
  VantaPrivateCoreShieldState,
  VantaPrivateCoreSwapState,
  VantaPrivateCoreUnshieldState,
} from "@/data/context/PrivacyFlowContext";
import type {
  VantaPrivateCoreOperatorConsumeRecord,
  VantaPrivateCoreOperatorProofRecord,
  VantaPrivateCoreOperatorReleaseRecord,
  VantaPrivateCoreOperatorRootRecord,
  VantaPrivateCoreOperatorSendRecord,
  VantaPrivateCoreOperatorSendProofRecord,
  VantaPrivateCoreOperatorSwapProofRecord,
  VantaPrivateCoreOperatorSwapRecord,
} from "@/zk/vantaPrivateCoreOperatorClient";

type VantaPrivateCoreStatePanelProps = {
  holdState: VantaPrivateCoreHoldState | null;
  sendState?: VantaPrivateCoreSendState | null;
  swapState?: VantaPrivateCoreSwapState | null;
  operatorCurrentRoot?: string | null;
  operatorConsumeError?: string | null;
  operatorConsumes?: VantaPrivateCoreOperatorConsumeRecord[];
  operatorLatestConsume?: VantaPrivateCoreOperatorConsumeRecord | null;
  operatorLatestConsumeProof?: VantaPrivateCoreOperatorProofRecord | null;
  operatorLatestProof?: VantaPrivateCoreOperatorProofRecord | null;
  operatorLatestRelease?: VantaPrivateCoreOperatorReleaseRecord | null;
  operatorLatestReleaseProof?: VantaPrivateCoreOperatorProofRecord | null;
  operatorLatestRoot?: VantaPrivateCoreOperatorRootRecord | null;
  operatorLatestSend?: VantaPrivateCoreOperatorSendRecord | null;
  operatorLatestSendLinkedProof?: VantaPrivateCoreOperatorSendProofRecord | null;
  operatorLatestSendProof?: VantaPrivateCoreOperatorSendProofRecord | null;
  operatorLatestSwap?: VantaPrivateCoreOperatorSwapRecord | null;
  operatorLatestSwapLinkedProof?: VantaPrivateCoreOperatorSwapProofRecord | null;
  operatorLatestSwapProof?: VantaPrivateCoreOperatorSwapProofRecord | null;
  operatorBoundaryPrimaryNote?: string | null;
  operatorBoundaryStatusLabel?: string | null;
  operatorContractMirrorPrimaryNote?: string | null;
  operatorContractMirrorStatusLabel?: string | null;
  operatorReleaseBoundaryPrimaryNote?: string | null;
  operatorReleaseBoundaryStatusLabel?: string | null;
  operatorZkV1FinishLinePrimaryNote?: string | null;
  operatorZkV1FinishLineStatusLabel?: string | null;
  operatorSendBoundaryPrimaryNote?: string | null;
  operatorSendBoundaryStatusLabel?: string | null;
  operatorSendContinuityPrimaryNote?: string | null;
  operatorSendContinuityStatusLabel?: string | null;
  operatorSwapBoundaryPrimaryNote?: string | null;
  operatorSwapBoundaryStatusLabel?: string | null;
  operatorSwapContinuityPrimaryNote?: string | null;
  operatorSwapContinuityStatusLabel?: string | null;
  operatorSupportedSendLaneKind?: string | null;
  operatorSupportedSendLaneNote?: string | null;
  operatorSupportedSendLaneStatus?: string | null;
  operatorSupportedSendLaneVersion?: number | null;
  operatorSupportedSendV1Decision?: string | null;
  operatorSupportedSendV1DecisionNote?: string | null;
  operatorSupportedUnshieldLaneKind?: string | null;
  operatorSupportedUnshieldLaneNote?: string | null;
  operatorSupportedUnshieldLaneStatus?: string | null;
  operatorSupportedUnshieldLaneVersion?: number | null;
  operatorSupportedUnshieldV1Decision?: string | null;
  operatorSupportedUnshieldV1DecisionNote?: string | null;
  operatorSupportedReleaseLaneKind?: string | null;
  operatorSupportedReleaseLaneNote?: string | null;
  operatorSupportedReleaseLaneStatus?: string | null;
  operatorSupportedReleaseLaneVersion?: number | null;
  operatorSupportedReleaseV1Decision?: string | null;
  operatorSupportedReleaseV1DecisionNote?: string | null;
  operatorSupportedSwapLaneKind?: string | null;
  operatorSupportedSwapLaneNote?: string | null;
  operatorSupportedSwapLaneStatus?: string | null;
  operatorSupportedSwapLaneVersion?: number | null;
  operatorSupportedSwapV1Decision?: string | null;
  operatorSupportedSwapV1DecisionNote?: string | null;
  operatorSupportedSwapV1Role?: string | null;
  operatorSupportedSwapV1RoleNote?: string | null;
  operatorSupportedSwapVenue?: string | null;
  operatorSupportedSwapOutputModel?: string | null;
  operatorSupportedSwapResultingRootBasis?: string | null;
  operatorSupportedSwapInputRootPolicy?: string | null;
  operatorSupportedSwapOutputRegistrationPolicy?: string | null;
  operatorSupportedFlowKind?: string | null;
  operatorSupportedFlowNote?: string | null;
  operatorSupportedFlowStatus?: string | null;
  operatorSupportedFlowVersion?: number | null;
  operatorSupportedZkV1ScopeDecision?: string | null;
  operatorSupportedZkV1ScopeNote?: string | null;
  operatorSupportedZkV1RequiredLanes?: string | null;
  operatorSupportedZkV1RequiredLanesNote?: string | null;
  operatorSupportedAssetSymbol?: string | null;
  operatorSupportedEnvironment?: string | null;
  operatorSupportedNoteSchema?: string | null;
  operatorSupportedNoteVersion?: number | null;
  operatorSupportedRootRegistrationProvenance?: string | null;
  operatorSupportedSendResultingRootBasis?: string | null;
  operatorSupportedSendInputRootPolicy?: string | null;
  operatorSupportedSendOutputRegistrationPolicy?: string | null;
  operatorSupportedRecipientModel?: string | null;
  operatorSupportedReleaseDestinationModel?: string | null;
  operatorSupportedProofSystem?: string | null;
  operatorSupportedUnshieldCircuit?: string | null;
  operatorSupportedSendCircuit?: string | null;
  operatorSupportedUnshieldMerkleDepth?: number | null;
  operatorSupportedSendMerkleDepth?: number | null;
  operatorSupportedReleaseAuthorizationBasis?: string | null;
  operatorSupportedReleaseRootPolicy?: string | null;
  operatorSupportedReleaseExecutionModel?: string | null;
  operatorSupportedReleaseAtomicityModel?: string | null;
  operatorSupportedReleasePersistenceModel?: string | null;
  operatorOwnerAuthorizationMode?: string | null;
  operatorOwnerAuthorizationDecision?: string | null;
  operatorOwnerAuthorizationDecisionNote?: string | null;
  operatorSourceArtifactTruthBasis?: string | null;
  operatorProvingArtifactTruthBasis?: string | null;
  operatorSourceProvingRelationship?: string | null;
  operatorNullifierKeyMode?: string | null;
  operatorProvingHashLane?: string | null;
  operatorCurrentRootLinkedProof?: VantaPrivateCoreOperatorProofRecord | null;
  operatorCurrentRootProofLinkStatus?: string | null;
  operatorProofConsumeLinkStatus?: string | null;
  operatorProofError?: string | null;
  operatorProofs?: VantaPrivateCoreOperatorProofRecord[];
  operatorProofSendLinkStatus?: string | null;
  operatorProofSwapLinkStatus?: string | null;
  operatorProofReleaseLinkStatus?: string | null;
  operatorReleaseError?: string | null;
  operatorReleases?: VantaPrivateCoreOperatorReleaseRecord[];
  operatorRootCurrentnessLabel?: string | null;
  operatorRootError?: string | null;
  operatorRootRegistrationStatus?: string | null;
  operatorRoots?: VantaPrivateCoreOperatorRootRecord[];
  operatorContractStateVersion?: number | null;
  operatorContractVersion?: number | null;
  operatorContractSummaryVersion?: number | null;
  operatorSendResultingRootLinkedProof?: VantaPrivateCoreOperatorProofRecord | null;
  operatorSendResultingRootRecord?: VantaPrivateCoreOperatorRootRecord | null;
  operatorSendResultingRootPrimaryNote?: string | null;
  operatorSendResultingRootRegistrationPrimaryNote?: string | null;
  operatorSendResultingRootProofLinkStatus?: string | null;
  operatorSendResultingRootRegistrationStatusLabel?: string | null;
  operatorSendResultingRootStatusLabel?: string | null;
  operatorSwapResultingRootLinkedProof?: VantaPrivateCoreOperatorProofRecord | null;
  operatorSwapResultingRootRecord?: VantaPrivateCoreOperatorRootRecord | null;
  operatorSwapResultingRootPrimaryNote?: string | null;
  operatorSwapResultingRootRegistrationPrimaryNote?: string | null;
  operatorSwapResultingRootProofLinkStatus?: string | null;
  operatorSwapResultingRootRegistrationStatusLabel?: string | null;
  operatorSwapResultingRootStatusLabel?: string | null;
  operatorSendError?: string | null;
  operatorSends?: VantaPrivateCoreOperatorSendRecord[];
  operatorSendProofError?: string | null;
  operatorSendProofs?: VantaPrivateCoreOperatorSendProofRecord[];
  operatorSwaps?: VantaPrivateCoreOperatorSwapRecord[];
  operatorSwapProofs?: VantaPrivateCoreOperatorSwapProofRecord[];
  operatorSummaryUpdatedAt?: number | null;
  shieldState: VantaPrivateCoreShieldState | null;
  unshieldState: VantaPrivateCoreUnshieldState | null;
  compact?: boolean;
  title?: string;
};

function abbreviate(value: string | null | undefined) {
  if (!value) {
    return "Unavailable";
  }

  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function formatAmount(baseUnits: string) {
  const raw = baseUnits.padStart(7, "0");
  const whole = raw.slice(0, -6);
  const fraction = raw.slice(-6).replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} VUSD`;
}

function formatAssetAmount(assetId: string | null | undefined, baseUnits: string) {
  if (
    assetId === "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  ) {
    const raw = baseUnits.padStart(10, "0");
    const whole = raw.slice(0, -9);
    const fraction = raw.slice(-9).replace(/0+$/, "");
    return `${whole}${fraction ? `.${fraction}` : ""} SOL`;
  }

  return formatAmount(baseUnits);
}

function formatOperatorSummaryFreshness(value: number | null) {
  if (!value) {
    return "Unavailable";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatOperatorRootRegistrationBasis(
  value:
    | "shield-input"
    | "send-recipient-output"
    | "send-change-output"
    | "swap-output"
    | null
    | undefined,
) {
  if (value === "shield-input") {
    return "Shield input";
  }

  if (value === "send-recipient-output") {
    return "Send recipient output";
  }

  if (value === "send-change-output") {
    return "Send change output";
  }

  if (value === "swap-output") {
    return "Swap output";
  }

  return "Unavailable";
}

function summarizeOperatorImmediateReleaseAlignment(args: {
  latestOperatorRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  unshieldState: VantaPrivateCoreUnshieldState | null;
}) {
  if (!args.unshieldState?.operatorReleaseRecorded) {
    return args.unshieldState?.replayRejected ? "Replay rejected before new release" : "Unavailable";
  }

  if (!args.latestOperatorRelease) {
    return "Awaiting operator release state";
  }

  if (
    args.unshieldState.operatorReleaseRequestId === args.latestOperatorRelease.requestId &&
    args.unshieldState.operatorReleaseTransitionNoteId === args.latestOperatorRelease.transitionNoteId &&
    args.unshieldState.sourceNullifier === args.latestOperatorRelease.nullifier
  ) {
    return "Immediate release matches operator state";
  }

  return "Immediate release mismatch";
}

function summarizeOperatorImmediateProofAlignment(args: {
  latestOperatorProof: VantaPrivateCoreOperatorProofRecord | null;
  unshieldState: VantaPrivateCoreUnshieldState | null;
}) {
  if (!args.unshieldState?.proofExecutionStatus) {
    return "Unavailable";
  }

  if (!args.latestOperatorProof) {
    return "Awaiting operator proof state";
  }

  if (
    (!args.unshieldState.operatorProofId ||
      args.latestOperatorProof.proofId === args.unshieldState.operatorProofId) &&
    args.latestOperatorProof.nullifier === args.unshieldState.sourceNullifier &&
    args.latestOperatorProof.root === args.unshieldState.sourceProofRoot &&
    args.latestOperatorProof.proofFieldCount === args.unshieldState.proofFieldCount &&
    args.latestOperatorProof.publicInputCount === args.unshieldState.proofPublicInputCount
  ) {
    return "Immediate proof matches operator state";
  }

  return "Immediate proof mismatch";
}

export function VantaPrivateCoreStatePanel({
  holdState,
  sendState = null,
  swapState = null,
  operatorCurrentRoot = null,
  operatorConsumeError = null,
  operatorConsumes = [],
  operatorLatestConsume = null,
  operatorLatestConsumeProof = null,
  operatorLatestProof = null,
  operatorLatestRelease = null,
  operatorLatestReleaseProof = null,
  operatorLatestRoot = null,
  operatorLatestSend = null,
  operatorLatestSendLinkedProof = null,
  operatorLatestSendProof = null,
  operatorLatestSwap = null,
  operatorLatestSwapLinkedProof = null,
  operatorLatestSwapProof = null,
  operatorBoundaryPrimaryNote = null,
  operatorBoundaryStatusLabel = null,
  operatorContractMirrorPrimaryNote = null,
  operatorContractMirrorStatusLabel = null,
  operatorReleaseBoundaryPrimaryNote = null,
  operatorReleaseBoundaryStatusLabel = null,
  operatorZkV1FinishLinePrimaryNote = null,
  operatorZkV1FinishLineStatusLabel = null,
  operatorSendBoundaryPrimaryNote = null,
  operatorSendBoundaryStatusLabel = null,
  operatorSendContinuityPrimaryNote = null,
  operatorSendContinuityStatusLabel = null,
  operatorSwapBoundaryPrimaryNote = null,
  operatorSwapBoundaryStatusLabel = null,
  operatorSwapContinuityPrimaryNote = null,
  operatorSwapContinuityStatusLabel = null,
  operatorSupportedSendLaneKind = null,
  operatorSupportedSendLaneNote = null,
  operatorSupportedSendLaneStatus = null,
  operatorSupportedSendLaneVersion = null,
  operatorSupportedSendV1Decision = null,
  operatorSupportedSendV1DecisionNote = null,
  operatorSupportedUnshieldLaneKind = null,
  operatorSupportedUnshieldLaneNote = null,
  operatorSupportedUnshieldLaneStatus = null,
  operatorSupportedUnshieldLaneVersion = null,
  operatorSupportedUnshieldV1Decision = null,
  operatorSupportedUnshieldV1DecisionNote = null,
  operatorSupportedReleaseLaneKind = null,
  operatorSupportedReleaseLaneNote = null,
  operatorSupportedReleaseLaneStatus = null,
  operatorSupportedReleaseLaneVersion = null,
  operatorSupportedReleaseV1Decision = null,
  operatorSupportedReleaseV1DecisionNote = null,
  operatorSupportedSwapLaneKind = null,
  operatorSupportedSwapLaneNote = null,
  operatorSupportedSwapLaneStatus = null,
  operatorSupportedSwapLaneVersion = null,
  operatorSupportedSwapV1Decision = null,
  operatorSupportedSwapV1DecisionNote = null,
  operatorSupportedSwapV1Role = null,
  operatorSupportedSwapV1RoleNote = null,
  operatorSupportedSwapVenue = null,
  operatorSupportedSwapOutputModel = null,
  operatorSupportedSwapResultingRootBasis = null,
  operatorSupportedSwapInputRootPolicy = null,
  operatorSupportedSwapOutputRegistrationPolicy = null,
  operatorSupportedFlowKind = null,
  operatorSupportedFlowNote = null,
  operatorSupportedFlowStatus = null,
  operatorSupportedFlowVersion = null,
  operatorSupportedZkV1ScopeDecision = null,
  operatorSupportedZkV1ScopeNote = null,
  operatorSupportedZkV1RequiredLanes = null,
  operatorSupportedZkV1RequiredLanesNote = null,
  operatorSupportedAssetSymbol = null,
  operatorSupportedEnvironment = null,
  operatorSupportedNoteSchema = null,
  operatorSupportedNoteVersion = null,
  operatorSupportedRootRegistrationProvenance = null,
  operatorSupportedSendResultingRootBasis = null,
  operatorSupportedSendInputRootPolicy = null,
  operatorSupportedSendOutputRegistrationPolicy = null,
  operatorSupportedRecipientModel = null,
  operatorSupportedReleaseDestinationModel = null,
  operatorSupportedProofSystem = null,
  operatorSupportedUnshieldCircuit = null,
  operatorSupportedSendCircuit = null,
  operatorSupportedUnshieldMerkleDepth = null,
  operatorSupportedSendMerkleDepth = null,
  operatorSupportedReleaseAuthorizationBasis = null,
  operatorSupportedReleaseRootPolicy = null,
  operatorSupportedReleaseExecutionModel = null,
  operatorSupportedReleaseAtomicityModel = null,
  operatorSupportedReleasePersistenceModel = null,
  operatorOwnerAuthorizationMode = null,
  operatorOwnerAuthorizationDecision = null,
  operatorOwnerAuthorizationDecisionNote = null,
  operatorSourceArtifactTruthBasis = null,
  operatorProvingArtifactTruthBasis = null,
  operatorSourceProvingRelationship = null,
  operatorNullifierKeyMode = null,
  operatorProvingHashLane = null,
  operatorCurrentRootLinkedProof = null,
  operatorCurrentRootProofLinkStatus = null,
  operatorProofConsumeLinkStatus = null,
  operatorProofError = null,
  operatorProofs = [],
  operatorProofSendLinkStatus = null,
  operatorProofSwapLinkStatus = null,
  operatorProofReleaseLinkStatus = null,
  operatorReleaseError = null,
  operatorReleases = [],
  operatorRootCurrentnessLabel = null,
  operatorRootError = null,
  operatorRootRegistrationStatus = null,
  operatorRoots = [],
  operatorContractStateVersion = null,
  operatorContractVersion = null,
  operatorContractSummaryVersion = null,
  operatorSendResultingRootLinkedProof = null,
  operatorSendResultingRootRecord = null,
  operatorSendResultingRootPrimaryNote = null,
  operatorSendResultingRootRegistrationPrimaryNote = null,
  operatorSendResultingRootProofLinkStatus = null,
  operatorSendResultingRootRegistrationStatusLabel = null,
  operatorSendResultingRootStatusLabel = null,
  operatorSwapResultingRootLinkedProof = null,
  operatorSwapResultingRootRecord = null,
  operatorSwapResultingRootPrimaryNote = null,
  operatorSwapResultingRootRegistrationPrimaryNote = null,
  operatorSwapResultingRootProofLinkStatus = null,
  operatorSwapResultingRootRegistrationStatusLabel = null,
  operatorSwapResultingRootStatusLabel = null,
  operatorSendError = null,
  operatorSends = [],
  operatorSendProofError = null,
  operatorSendProofs = [],
  operatorSwaps = [],
  operatorSwapProofs = [],
  operatorSummaryUpdatedAt = null,
  shieldState,
  unshieldState,
  compact = false,
  title = "Vanta Private Core private state",
}: VantaPrivateCoreStatePanelProps) {
  const latestOperatorConsume = operatorLatestConsume ?? operatorConsumes[0] ?? null;
  const latestOperatorProof = operatorLatestProof ?? operatorProofs[0] ?? null;
  const latestOperatorRelease = operatorLatestRelease ?? operatorReleases[0] ?? null;
  const latestOperatorRoot = operatorLatestRoot ?? operatorRoots[0] ?? null;
  const latestOperatorSend = operatorLatestSend ?? operatorSends[0] ?? null;
  const latestOperatorSendLinkedProof =
    operatorLatestSendLinkedProof ??
    (latestOperatorSend?.proofId
      ? operatorSendProofs.find((record) => record.proofId === latestOperatorSend.proofId) ?? null
      : null);
  const latestOperatorSendProof = operatorLatestSendProof ?? operatorSendProofs[0] ?? null;
  const latestOperatorSwap = operatorLatestSwap ?? operatorSwaps[0] ?? null;
  const latestOperatorSwapLinkedProof =
    operatorLatestSwapLinkedProof ??
    (latestOperatorSwap?.proofId
      ? operatorSwapProofs.find((record) => record.proofId === latestOperatorSwap.proofId) ?? null
      : null);
  const latestOperatorSwapProof = operatorLatestSwapProof ?? operatorSwapProofs[0] ?? null;
  const immediateProofAlignmentLabel = summarizeOperatorImmediateProofAlignment({
    latestOperatorProof,
    unshieldState,
  });
  const immediateReleaseAlignmentLabel = summarizeOperatorImmediateReleaseAlignment({
    latestOperatorRelease,
    unshieldState,
  });

  return (
    <div className="note-state-panel vanta-private-core-state-panel">
      <div className="shield-card__header">
        <div>
          <span>Vanta Private Core v0.1</span>
          <h3>{title}</h3>
        </div>
        <small>
          {unshieldState?.replayRejected
            ? "Replay rejected"
            : unshieldState?.consumeSucceeded
              ? "Private note consumed"
              : holdState?.privateNoteRecovered
                ? "Private note ready"
                : shieldState
                  ? "Private note live"
                : "Awaiting shield"}
        </small>
      </div>

      <div className="preview-grid note-state-summary">
        <div className="preview-card preview-card--accent">
          <span>Private note</span>
          <strong>
            {unshieldState?.replayRejected || unshieldState?.consumeSucceeded
              ? "Consumed"
              : shieldState
                ? "Created"
                : "Not yet"}
          </strong>
        </div>
        <div className="preview-card">
          <span>Held privately</span>
          <strong>
            {unshieldState?.replayRejected || unshieldState?.consumeSucceeded
              ? "Consumed"
              : holdState?.privateNoteRecovered
                ? "Recovered"
                : "Unavailable"}
          </strong>
        </div>
        <div className="preview-card">
          <span>Witness</span>
          <strong>
            {unshieldState?.replayRejected || unshieldState?.consumeSucceeded
              ? "Used"
              : holdState?.witnessAvailable
                ? "Ready"
                : "Missing"}
          </strong>
        </div>
        <div className="preview-card">
          <span>Consume status</span>
          <strong>
            {unshieldState?.consumeSucceeded
              ? "Consumed once"
              : unshieldState?.replayRejected
                ? "Replay rejected"
                : holdState?.privateNoteRecovered
                  ? "Ready to consume"
                  : "Not yet consumed"}
          </strong>
        </div>
      </div>

      {compact &&
      (swapState ||
        latestOperatorSwap ||
        operatorSwapBoundaryStatusLabel ||
        operatorSwapContinuityStatusLabel ||
        operatorSwapResultingRootStatusLabel) ? (
        <div className="note-state-list">
          <div className="note-state-row">
            <div className="note-state-row__header">
              <div>
                <strong>
                  {swapState
                    ? formatAssetAmount(swapState.outputAssetId, swapState.outputAmount)
                    : latestOperatorSwap?.outputAmount
                      ? `${latestOperatorSwap.outputAmount} SOL`
                    : "Latest swap output"}
                </strong>
                <span>
                  {swapState?.outputCommitment
                    ? abbreviate(swapState.outputCommitment)
                    : latestOperatorSwap?.swapId
                    ? abbreviate(latestOperatorSwap.swapId)
                    : "No swap transition recorded"}
                </span>
              </div>
              <div className="note-state-chips">
                <span className="note-state-chip">
                  {swapState?.boundaryStatusLabel ??
                    operatorSwapBoundaryStatusLabel ??
                    "Swap boundary unavailable"}
                </span>
                <span className="note-state-chip">
                  {swapState?.continuityStatusLabel ??
                    operatorSwapContinuityStatusLabel ??
                    "No swap continuity observed"}
                </span>
              </div>
            </div>
            <div className="note-state-row__meta">
              <span>
                Swap root{" "}
                {swapState?.resultingRoot
                  ? abbreviate(swapState.resultingRoot)
                  : latestOperatorSwap?.resultingRoot
                    ? abbreviate(latestOperatorSwap.resultingRoot)
                  : "Unavailable"}
              </span>
              <span>
                {swapState?.resultingRootStatusLabel ??
                  operatorSwapResultingRootStatusLabel ??
                  "Swap root unavailable"}
              </span>
              <span>
                {swapState?.livePathPrimaryNote ??
                  swapState?.boundaryPrimaryNote ??
                  swapState?.resultingRootPrimaryNote ??
                  operatorSwapBoundaryPrimaryNote ??
                  "No swap boundary note yet"}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {swapState ? (
        <div className="note-state-list">
          <div className="note-state-row">
            <div className="note-state-row__header">
              <div>
                <strong>{formatAssetAmount(swapState.outputAssetId, swapState.outputAmount)}</strong>
                <span>{abbreviate(swapState.outputCommitment)}</span>
              </div>
              <div className="note-state-chips">
                <span className="note-state-chip note-state-chip--spendable">
                  {swapState.outputRecoveryStatus}
                </span>
                <span className="note-state-chip">{swapState.outputUnshieldStatus}</span>
              </div>
            </div>
            <div className="review-grid">
              <div className="review-row">
                <span>Swap execution basis</span>
                <strong>{swapState.executionBasisLabel}</strong>
              </div>
              <div className="review-row">
                <span>Swap execution note</span>
                <strong>{swapState.executionPrimaryNote}</strong>
              </div>
              <div className="review-row">
                <span>Execution venue</span>
                <strong>{swapState.executionVenueLabel ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Quote reference</span>
                <strong>{swapState.executionQuoteReference ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Swap live path</span>
                <strong>{swapState.livePathStatusLabel}</strong>
              </div>
              <div className="review-row">
                <span>Swap live path note</span>
                <strong>{swapState.livePathPrimaryNote}</strong>
              </div>
              <div className="review-row">
                <span>Swap live path blocker</span>
                <strong>{swapState.livePathPrimaryBlocker ?? "None"}</strong>
              </div>
              <div className="review-row">
                <span>Output payload</span>
                <strong>
                  {swapState.outputPayloadCommitment
                    ? abbreviate(swapState.outputPayloadCommitment)
                    : "Unavailable from operator summary"}
                </strong>
              </div>
              <div className="review-row">
                <span>Output asset</span>
                <strong>{abbreviate(swapState.outputAssetId)}</strong>
              </div>
              <div className="review-row">
                <span>Resulting root</span>
                <strong>
                  {swapState.resultingRoot
                    ? abbreviate(swapState.resultingRoot)
                    : "Unavailable from operator summary"}
                </strong>
              </div>
              <div className="review-row">
                <span>Swap root status</span>
                <strong>{swapState.resultingRootStatusLabel ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Swap root note</span>
                <strong>{swapState.resultingRootPrimaryNote ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Swap boundary</span>
                <strong>{swapState.boundaryStatusLabel ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Swap boundary note</span>
                <strong>{swapState.boundaryPrimaryNote ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Swap continuity</span>
                <strong>{swapState.continuityStatusLabel ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Swap continuity note</span>
                <strong>{swapState.continuityPrimaryNote ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Observation mode</span>
                <strong>{swapState.observationMode}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {sendState ? (
        <div className="note-state-list">
          <div className="note-state-row">
            <div className="note-state-row__header">
              <div>
                <strong>{formatAmount(sendState.recipientAmount)}</strong>
                <span>{abbreviate(sendState.recipientCommitment)}</span>
              </div>
              <div className="note-state-chips">
                <span className="note-state-chip note-state-chip--spendable">
                  {sendState.recipientRecoveryStatus}
                </span>
                <span className="note-state-chip">{sendState.residualStateStatus}</span>
              </div>
            </div>
            <div className="review-grid">
              <div className="review-row">
                <span>Recipient payload</span>
                <strong>
                  {sendState.recipientPayloadCommitment
                    ? abbreviate(sendState.recipientPayloadCommitment)
                    : "Unavailable from operator summary"}
                </strong>
              </div>
              <div className="review-row">
                <span>Change amount</span>
                <strong>{formatAmount(sendState.changeAmount)}</strong>
              </div>
              <div className="review-row">
                <span>Resulting root</span>
                <strong>
                  {sendState.resultingRoot
                    ? abbreviate(sendState.resultingRoot)
                    : "Unavailable from operator summary"}
                </strong>
              </div>
              <div className="review-row">
                <span>Resulting root status</span>
                <strong>
                  {sendState.resultingRootStatusLabel ??
                    operatorSendResultingRootStatusLabel ??
                    "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Resulting root note</span>
                <strong>
                  {sendState.resultingRootPrimaryNote ??
                    operatorSendResultingRootPrimaryNote ??
                    "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Resulting root record</span>
                <strong>
                  {operatorSendResultingRootRecord?.root
                    ? abbreviate(operatorSendResultingRootRecord.root)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Recipient unshield</span>
                <strong>{sendState.recipientUnshieldStatus}</strong>
              </div>
              <div className="review-row">
                <span>Observation mode</span>
                <strong>{sendState.observationMode}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {shieldState ? (
        <div className="note-state-list">
          <div className="note-state-row">
            <div className="note-state-row__header">
              <div>
                <strong>{formatAmount(shieldState.amount)}</strong>
                <span>{abbreviate(shieldState.sourceNoteCommitment)}</span>
              </div>
              <div className="note-state-chips">
                <span className="note-state-chip note-state-chip--spendable">
                  {unshieldState?.replayRejected
                    ? "Replay blocked"
                    : unshieldState?.consumeSucceeded
                    ? "Consumed"
                    : holdState?.privateNoteRecovered
                      ? "Ready"
                      : "Holdable"}
                </span>
                <span className="note-state-chip note-state-chip--change">
                  Note v{shieldState.noteVersion}
                </span>
              </div>
            </div>

            <div className="note-state-row__meta">
              <span>{shieldState.noteType} note</span>
              <span>Source root {abbreviate(holdState?.sourceWitnessRoot ?? shieldState.sourceMerkleRoot)}</span>
              <span>Source payload {abbreviate(shieldState.sourcePayloadCommitment)}</span>
              {(unshieldState?.sourceNullifier ?? holdState?.sourceProofPreviewNullifier) && (
                <span>
                  Source nullifier {abbreviate(unshieldState?.sourceNullifier ?? holdState?.sourceProofPreviewNullifier)}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="shield-review-note">
          Shield from the current UI to mint one Vanta Private Core private note, recover it privately,
          and then consume it once through the replay-safe demo lane.
        </p>
      )}

      {!compact && shieldState && (
        <details className="shield-helper shield-helper--meta">
          <summary>Internal Vanta Private Core diagnostics</summary>
          <div className="review-list" style={{ marginTop: 12 }}>
            <div className="review-row">
              <span>Source note commitment</span>
              <strong>{abbreviate(shieldState.sourceNoteCommitment)}</strong>
            </div>
            <div className="review-row">
              <span>Source witness root</span>
              <strong>{abbreviate(holdState?.sourceWitnessRoot ?? shieldState.sourceMerkleRoot)}</strong>
            </div>
            <div className="review-row">
              <span>Source payload commitment</span>
              <strong>{abbreviate(shieldState.sourcePayloadCommitment)}</strong>
            </div>
            <div className="review-row">
              <span>Witness status</span>
              <strong>{holdState?.witnessAvailable ? "Ready" : "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Observation mode</span>
              <strong>{unshieldState?.proofObservationMode ?? holdState?.proofObservationMode ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator contract</span>
              <strong>
                {operatorContractVersion
                  ? `v${String(operatorContractVersion)} · state ${String(operatorContractStateVersion ?? 1)}`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Contract summary compatibility</span>
              <strong>
                {operatorContractSummaryVersion
                  ? `Summary v${String(operatorContractSummaryVersion)}`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator summary refresh</span>
              <strong>{formatOperatorSummaryFreshness(operatorSummaryUpdatedAt)}</strong>
            </div>
            <div className="review-row">
              <span>Operator contract source</span>
              <strong>Dedicated operator contract endpoint</strong>
            </div>
            <div className="review-row">
              <span>Operator boundary status</span>
              <strong>{operatorBoundaryStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Contract mirror status</span>
              <strong>{operatorContractMirrorStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Release boundary status</span>
              <strong>{operatorReleaseBoundaryStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send boundary status</span>
              <strong>{operatorSendBoundaryStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported send lane</span>
              <strong>
                {operatorSupportedSendLaneKind === "single-input-single-recipient-optional-change"
                  ? `v${String(operatorSupportedSendLaneVersion ?? 1)} · Single input / recipient / optional change`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported lane status</span>
              <strong>{operatorSupportedSendLaneStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported unshield lane</span>
              <strong>
                {operatorSupportedUnshieldLaneKind === "single-note-proof-backed-consume"
                  ? `v${String(operatorSupportedUnshieldLaneVersion ?? 1)} · Single-note proof-backed consume`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported unshield status</span>
              <strong>{operatorSupportedUnshieldLaneStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported release lane</span>
              <strong>
                {operatorSupportedReleaseLaneKind === "proof-backed-consume-latest-registered-root"
                  ? `v${String(operatorSupportedReleaseLaneVersion ?? 1)} · Proof-backed consume / latest registered root`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported release status</span>
              <strong>{operatorSupportedReleaseLaneStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported swap lane</span>
              <strong>
                {operatorSupportedSwapLaneKind === "single-input-vusd-to-shielded-sol"
                  ? `v${String(operatorSupportedSwapLaneVersion ?? 1)} · Single input VUSD to shielded SOL`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported swap status</span>
              <strong>{operatorSupportedSwapLaneStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported swap venue</span>
              <strong>
                {operatorSupportedSwapVenue === "meteora-dlmm-devnet"
                  ? "Meteora DLMM devnet"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported swap output</span>
              <strong>
                {operatorSupportedSwapOutputModel === "shielded-sol-output-note"
                  ? "Shielded SOL output note"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported swap root basis</span>
              <strong>
                {operatorSupportedSwapResultingRootBasis === "client-declared"
                  ? "Client-declared"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported swap input-root policy</span>
              <strong>
                {operatorSupportedSwapInputRootPolicy ===
                "latest-registered-root-with-linked-registration-proof"
                  ? "Latest registered root with linked registration proof"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported swap output registration</span>
              <strong>
                {operatorSupportedSwapOutputRegistrationPolicy ===
                "resulting-root-must-register-as-swap-output"
                  ? "Resulting root must register as swap output"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Swap v1 decision</span>
              <strong>
                {operatorSupportedSwapV1Decision === "accepted-narrow-v1-path"
                  ? "Accepted narrow v1 path"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Swap v1 role</span>
              <strong>
                {operatorSupportedSwapV1Role ===
                "adjacent-supported-not-required-for-finish-line"
                  ? "Adjacent support, not finish-line required"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported flow</span>
              <strong>
                {operatorSupportedFlowKind === "shield-hold-send-unshield-replay-guard"
                  ? `v${String(operatorSupportedFlowVersion ?? 1)} · Shield / hold / send / unshield / replay guard`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported flow status</span>
              <strong>{operatorSupportedFlowStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>zk v1 scope</span>
              <strong>
                {operatorSupportedZkV1ScopeDecision === "accepted-narrow-private-core-v1-scope"
                  ? "Accepted narrow private-core v1 scope"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>zk v1 required lanes</span>
              <strong>
                {operatorSupportedZkV1RequiredLanes === "send|unshield|release"
                  ? "Send / unshield / release"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>zk v1 finish-line status</span>
              <strong>{operatorZkV1FinishLineStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported asset</span>
              <strong>{operatorSupportedAssetSymbol ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported environment</span>
              <strong>{operatorSupportedEnvironment ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported note schema</span>
              <strong>
                {operatorSupportedNoteSchema === "note-v0"
                  ? `NoteV0 / v${String(operatorSupportedNoteVersion ?? 0)}`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported root provenance</span>
              <strong>
                {operatorSupportedRootRegistrationProvenance ===
                "shield-input|send-recipient-output|send-change-output|swap-output"
                  ? "Shield input / send recipient output / send change output / swap output"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported send root basis</span>
              <strong>
                {operatorSupportedSendResultingRootBasis === "client-declared"
                  ? "Client-declared"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported send input-root policy</span>
              <strong>
                {operatorSupportedSendInputRootPolicy ===
                "latest-registered-root-with-linked-registration-proof"
                  ? "Latest registered root with linked registration proof"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported send output registration</span>
              <strong>
                {operatorSupportedSendOutputRegistrationPolicy ===
                "resulting-root-must-register-as-recipient-or-change-output"
                  ? "Resulting root must register as recipient or change output"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported swap root basis</span>
              <strong>
                {operatorSupportedSwapResultingRootBasis === "client-declared"
                  ? "Client-declared"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported swap input-root policy</span>
              <strong>
                {operatorSupportedSwapInputRootPolicy ===
                "latest-registered-root-with-linked-registration-proof"
                  ? "Latest registered root with linked registration proof"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported swap output registration</span>
              <strong>
                {operatorSupportedSwapOutputRegistrationPolicy ===
                "resulting-root-must-register-as-swap-output"
                  ? "Resulting root must register as swap output"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported recipient model</span>
              <strong>
                {operatorSupportedRecipientModel === "hashed-reference-to-owner-key"
                  ? "Hashed reference to owner key"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported release destination model</span>
              <strong>
                {operatorSupportedReleaseDestinationModel === "32-byte-release-destination-field"
                  ? "32-byte release destination field"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported proof system</span>
              <strong>
                {operatorSupportedProofSystem === "noir-acir-ultrahonk-bbjs"
                  ? "Noir ACIR / UltraHonk / bb.js"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported unshield circuit</span>
              <strong>
                {operatorSupportedUnshieldCircuit
                  ? `${operatorSupportedUnshieldCircuit} @ depth ${String(operatorSupportedUnshieldMerkleDepth ?? "?")}`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported send circuit</span>
              <strong>
                {operatorSupportedSendCircuit
                  ? `${operatorSupportedSendCircuit} @ depth ${String(operatorSupportedSendMerkleDepth ?? "?")}`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported release auth</span>
              <strong>
                {operatorSupportedReleaseAuthorizationBasis === "proof-backed-consume"
                  ? "Proof-backed consume"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported release root policy</span>
              <strong>
                {operatorSupportedReleaseRootPolicy === "latest-registered-root"
                  ? "Latest registered root"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported release execution</span>
              <strong>
                {operatorSupportedReleaseExecutionModel === "operator-recorded-devnet-release"
                  ? "Operator-recorded devnet release"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported release atomicity</span>
              <strong>
                {operatorSupportedReleaseAtomicityModel ===
                "operator-local-atomic-consume-and-release-record"
                  ? "Operator-local atomic consume + release record"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Supported release persistence</span>
              <strong>
                {operatorSupportedReleasePersistenceModel === "json-store-v1"
                  ? "JSON store v1"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator boundary note</span>
              <strong>{operatorBoundaryPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Contract mirror note</span>
              <strong>{operatorContractMirrorPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Release boundary note</span>
              <strong>{operatorReleaseBoundaryPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send boundary note</span>
              <strong>{operatorSendBoundaryPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send continuity status</span>
              <strong>{operatorSendContinuityStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send continuity note</span>
              <strong>{operatorSendContinuityPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported lane note</span>
              <strong>{operatorSupportedSendLaneNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send v1 decision</span>
              <strong>
                {operatorSupportedSendV1Decision === "accepted-narrow-v1-path"
                  ? "Accepted narrow v1 path"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Send v1 decision note</span>
              <strong>{operatorSupportedSendV1DecisionNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported unshield note</span>
              <strong>{operatorSupportedUnshieldLaneNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Unshield v1 decision</span>
              <strong>
                {operatorSupportedUnshieldV1Decision === "accepted-narrow-v1-path"
                  ? "Accepted narrow v1 path"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Unshield v1 decision note</span>
              <strong>{operatorSupportedUnshieldV1DecisionNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported release note</span>
              <strong>{operatorSupportedReleaseLaneNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Release v1 decision</span>
              <strong>
                {operatorSupportedReleaseV1Decision === "accepted-narrow-v1-path"
                  ? "Accepted narrow v1 path"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Release v1 decision note</span>
              <strong>{operatorSupportedReleaseV1DecisionNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported swap note</span>
              <strong>{operatorSupportedSwapLaneNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap v1 decision note</span>
              <strong>{operatorSupportedSwapV1DecisionNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap v1 role note</span>
              <strong>{operatorSupportedSwapV1RoleNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Supported flow note</span>
              <strong>{operatorSupportedFlowNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>zk v1 scope note</span>
              <strong>{operatorSupportedZkV1ScopeNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>zk v1 required-lanes note</span>
              <strong>{operatorSupportedZkV1RequiredLanesNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>zk v1 finish-line note</span>
              <strong>{operatorZkV1FinishLinePrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator owner auth</span>
              <strong>
                {operatorOwnerAuthorizationMode === "x25519-secret-prechecked-off-circuit"
                  ? "X25519 secret prechecked off-circuit"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Owner auth decision</span>
              <strong>
                {operatorOwnerAuthorizationDecision === "accepted-v1-off-circuit-precheck"
                  ? "Accepted v1 off-circuit precheck"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Owner auth decision note</span>
              <strong>{operatorOwnerAuthorizationDecisionNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source artifact truth</span>
              <strong>
                {operatorSourceArtifactTruthBasis === "source-layer-artifact-bundle"
                  ? "Source-layer artifact bundle"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Proving artifact truth</span>
              <strong>
                {operatorProvingArtifactTruthBasis === "verified-proving-public-input-vector"
                  ? "Verified proving public-input vector"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Source/proving relationship</span>
              <strong>
                {operatorSourceProvingRelationship === "explicit-split-no-implicit-equality"
                  ? "Explicit split / no implicit equality"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator nullifier key</span>
              <strong>
                {operatorNullifierKeyMode === "note-secret-as-nullifier-key-v0"
                  ? "Note secret as nullifier key v0"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator proving lane</span>
              <strong>{operatorProvingHashLane ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Circuit readiness</span>
              <strong>{unshieldState?.circuitReadinessLabel ?? holdState?.circuitReadinessLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof blockers</span>
              <strong>{String(unshieldState?.proofBlockerCount ?? holdState?.proofBlockerCount ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Primary blocker</span>
              <strong>{unshieldState?.primaryProofBlocker ?? holdState?.primaryProofBlocker ?? "None"}</strong>
            </div>
            <div className="review-row">
              <span>Compatibility notes</span>
              <strong>{String(unshieldState?.compatibilityNoteCount ?? holdState?.compatibilityNoteCount ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Primary assumption</span>
              <strong>{unshieldState?.primaryCompatibilityNote ?? holdState?.primaryCompatibilityNote ?? "None"}</strong>
            </div>
            <div className="review-row">
              <span>Proof boundary kind</span>
              <strong>{unshieldState?.proofBoundaryKind ?? holdState?.proofBoundaryKind ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof boundary version</span>
              <strong>{String(unshieldState?.proofBoundaryVersion ?? holdState?.proofBoundaryVersion ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Proof circuit</span>
              <strong>{unshieldState?.proofCircuit ?? holdState?.proofCircuit ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof backend</span>
              <strong>{unshieldState?.proofBackend ?? holdState?.proofBackend ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof execution mode</span>
              <strong>{unshieldState?.proofExecutionMode ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof execution status</span>
              <strong>{unshieldState?.proofExecutionStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof shape</span>
              <strong>
                {unshieldState?.proofFieldCount && unshieldState?.proofPublicInputCount
                  ? `${unshieldState.proofFieldCount} fields · ${unshieldState.proofPublicInputCount} public inputs`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator consume records</span>
              <strong>
                {operatorConsumeError
                  ? "Unavailable"
                  : operatorConsumes.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator nullifier</span>
              <strong>
                {operatorConsumeError
                  ? operatorConsumeError
                  : latestOperatorConsume?.nullifier
                    ? abbreviate(latestOperatorConsume.nullifier)
                      : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest consume proof</span>
              <strong>
                {operatorConsumeError
                  ? operatorConsumeError
                  : latestOperatorConsume?.proofId
                    ? abbreviate(latestOperatorConsume.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Linked consume proof</span>
              <strong>
                {operatorProofError
                  ? operatorProofError
                  : operatorLatestConsumeProof?.proofId
                    ? abbreviate(operatorLatestConsumeProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator proof records</span>
              <strong>
                {operatorProofError
                  ? "Unavailable"
                  : operatorProofs.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator proof</span>
              <strong>
                {operatorProofError
                  ? operatorProofError
                  : operatorLatestProof?.proofId
                    ? abbreviate(operatorLatestProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Immediate proof id</span>
              <strong>
                {unshieldState?.operatorProofId
                  ? abbreviate(unshieldState.operatorProofId)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest proof action</span>
              <strong>{operatorProofError ? operatorProofError : operatorLatestProof?.action ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator send proof records</span>
              <strong>
                {operatorSendProofError
                  ? "Unavailable"
                  : operatorSendProofs.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator send records</span>
              <strong>
                {operatorSendError
                  ? "Unavailable"
                  : operatorSends.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator send</span>
              <strong>
                {operatorSendError
                  ? operatorSendError
                  : latestOperatorSend?.sendId
                    ? abbreviate(latestOperatorSend.sendId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest send proof link</span>
              <strong>
                {operatorSendError
                  ? operatorSendError
                  : latestOperatorSend?.proofId
                    ? abbreviate(latestOperatorSend.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest send root basis</span>
              <strong>
                {operatorSendError
                  ? operatorSendError
                  : latestOperatorSend?.resultingRootBasis ?? "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Linked send proof</span>
              <strong>
                {operatorSendProofError
                  ? operatorSendProofError
                  : latestOperatorSendLinkedProof?.proofId
                    ? abbreviate(latestOperatorSendLinkedProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest send amount</span>
              <strong>
                {operatorSendError
                  ? operatorSendError
                  : latestOperatorSend?.sendAmount
                    ? `${latestOperatorSend.sendAmount} / ${latestOperatorSend.changeAmount}`
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator send proof</span>
              <strong>
                {operatorSendProofError
                  ? operatorSendProofError
                  : latestOperatorSendProof?.proofId
                    ? abbreviate(latestOperatorSendProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest send proof action</span>
              <strong>
                {operatorSendProofError
                  ? operatorSendProofError
                  : latestOperatorSendProof?.action ?? "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Proof/send link</span>
              <strong>{operatorProofSendLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator swap proof records</span>
              <strong>{operatorSwapProofs.length.toString()}</strong>
            </div>
            <div className="review-row">
              <span>Operator swap records</span>
              <strong>{operatorSwaps.length.toString()}</strong>
            </div>
            <div className="review-row">
              <span>Latest operator swap</span>
              <strong>
                {latestOperatorSwap?.swapId ? abbreviate(latestOperatorSwap.swapId) : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest swap proof link</span>
              <strong>
                {latestOperatorSwap?.proofId ? abbreviate(latestOperatorSwap.proofId) : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator swap proof</span>
              <strong>
                {latestOperatorSwapProof?.proofId
                  ? abbreviate(latestOperatorSwapProof.proofId)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Linked swap proof</span>
              <strong>
                {latestOperatorSwapLinkedProof?.proofId
                  ? abbreviate(latestOperatorSwapLinkedProof.proofId)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest swap output</span>
              <strong>
                {latestOperatorSwap?.outputAmount && latestOperatorSwap?.outputAssetId
                  ? `${latestOperatorSwap.outputAmount} / ${abbreviate(latestOperatorSwap.outputAssetId)}`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest swap resulting root</span>
              <strong>{abbreviate(latestOperatorSwap?.resultingRoot)}</strong>
            </div>
            <div className="review-row">
              <span>Swap resulting root status</span>
              <strong>{operatorSwapResultingRootStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap resulting root note</span>
              <strong>{operatorSwapResultingRootPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap continuity status</span>
              <strong>{operatorSwapContinuityStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap continuity note</span>
              <strong>{operatorSwapContinuityPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap boundary status</span>
              <strong>{operatorSwapBoundaryStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap boundary note</span>
              <strong>{operatorSwapBoundaryPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof/swap link</span>
              <strong>{operatorProofSwapLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Latest send proof root</span>
              <strong>
                {operatorSendProofError
                  ? operatorSendProofError
                  : latestOperatorSendProof?.root
                    ? abbreviate(latestOperatorSendProof.root)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest proof root</span>
              <strong>
                {operatorProofError
                  ? operatorProofError
                  : operatorLatestProof?.root
                    ? abbreviate(operatorLatestProof.root)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Immediate proof alignment</span>
              <strong>{immediateProofAlignmentLabel}</strong>
            </div>
            <div className="review-row">
              <span>Proof/consume link</span>
              <strong>{operatorProofConsumeLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator release records</span>
              <strong>
                {operatorReleaseError
                  ? "Unavailable"
                  : operatorReleases.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator release</span>
              <strong>
                {operatorReleaseError
                  ? operatorReleaseError
                  : latestOperatorRelease?.nullifier
                    ? abbreviate(latestOperatorRelease.nullifier)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator release recorded</span>
              <strong>
                {unshieldState?.operatorReleaseRecorded === true
                  ? "Recorded during consume"
                  : unshieldState?.operatorReleaseRecorded === false
                    ? "Not recorded"
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest release proof</span>
              <strong>
                {operatorReleaseError
                  ? operatorReleaseError
                  : latestOperatorRelease?.proofId
                    ? abbreviate(latestOperatorRelease.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Release authorization</span>
              <strong>
                {latestOperatorRelease?.authorizationBasis === "proof-backed-consume"
                  ? "Proof-backed consume"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Release root policy</span>
              <strong>
                {latestOperatorRelease?.rootPolicy === "latest-registered-root"
                  ? "Latest registered root"
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Linked release proof</span>
              <strong>
                {operatorProofError
                  ? operatorProofError
                  : operatorLatestReleaseProof?.proofId
                    ? abbreviate(operatorLatestReleaseProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Immediate release request</span>
              <strong>{abbreviate(unshieldState?.operatorReleaseRequestId)}</strong>
            </div>
            <div className="review-row">
              <span>Immediate transition note</span>
              <strong>{abbreviate(unshieldState?.operatorReleaseTransitionNoteId)}</strong>
            </div>
            <div className="review-row">
              <span>Immediate release alignment</span>
              <strong>{immediateReleaseAlignmentLabel}</strong>
            </div>
            <div className="review-row">
              <span>Proof/release link</span>
              <strong>{operatorProofReleaseLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator release destination</span>
              <strong>
                {operatorReleaseError
                  ? operatorReleaseError
                  : latestOperatorRelease?.releaseDestination
                    ? abbreviate(latestOperatorRelease.releaseDestination)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator released value</span>
              <strong>
                {operatorReleaseError
                  ? operatorReleaseError
                  : latestOperatorRelease?.releasedAmount && latestOperatorRelease?.releasedAssetId
                    ? `${latestOperatorRelease.releasedAmount} / ${abbreviate(latestOperatorRelease.releasedAssetId)}`
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator root registration</span>
              <strong>{operatorRootRegistrationStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator root currentness</span>
              <strong>{operatorRootCurrentnessLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator root records</span>
              <strong>
                {operatorRootError
                  ? "Unavailable"
                  : operatorRoots.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator root</span>
              <strong>
                {operatorRootError
                  ? operatorRootError
                  : latestOperatorRoot?.root
                    ? abbreviate(latestOperatorRoot.root)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator current root</span>
              <strong>
                {operatorRootError
                  ? operatorRootError
                  : operatorCurrentRoot
                    ? abbreviate(operatorCurrentRoot)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator current root proof</span>
              <strong>
                {operatorLatestRoot?.proofId ? abbreviate(operatorLatestRoot.proofId) : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator current root linked proof</span>
              <strong>
                {operatorCurrentRootLinkedProof?.proofId
                  ? abbreviate(operatorCurrentRootLinkedProof.proofId)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator current root proof link</span>
              <strong>{operatorCurrentRootProofLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator current root registration</span>
              <strong>
                {formatOperatorRootRegistrationBasis(operatorLatestRoot?.registrationBasis)}
              </strong>
            </div>
            <div className="review-row">
              <span>Send resulting root status</span>
              <strong>
                {sendState?.resultingRootStatusLabel ??
                  operatorSendResultingRootStatusLabel ??
                  "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Send resulting root note</span>
              <strong>
                {sendState?.resultingRootPrimaryNote ??
                  operatorSendResultingRootPrimaryNote ??
                  "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Send resulting root record</span>
              <strong>
                {operatorSendResultingRootRecord?.root
                  ? abbreviate(operatorSendResultingRootRecord.root)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Send root registration basis</span>
              <strong>
                {formatOperatorRootRegistrationBasis(
                  operatorSendResultingRootRecord?.registrationBasis,
                )}
              </strong>
            </div>
            <div className="review-row">
              <span>Send root registration status</span>
              <strong>{operatorSendResultingRootRegistrationStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send root registration note</span>
              <strong>{operatorSendResultingRootRegistrationPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send resulting root proof</span>
              <strong>
                {operatorSendResultingRootRecord?.proofId
                  ? abbreviate(operatorSendResultingRootRecord.proofId)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Send resulting root linked proof</span>
              <strong>
                {operatorSendResultingRootLinkedProof?.proofId
                  ? abbreviate(operatorSendResultingRootLinkedProof.proofId)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Send resulting root proof link</span>
              <strong>{operatorSendResultingRootProofLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send resulting root bundle</span>
              <strong>
                {operatorSendResultingRootRecord?.artifactBundleStatus === "complete"
                  ? `Complete v${String(operatorSendResultingRootRecord.artifactBundleVersion ?? 1)}`
                  : operatorSendResultingRootRecord?.artifactBundleStatus === "legacy-incomplete"
                    ? "Legacy incomplete"
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Swap resulting root status</span>
              <strong>{operatorSwapResultingRootStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap resulting root note</span>
              <strong>{operatorSwapResultingRootPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap resulting root record</span>
              <strong>
                {operatorSwapResultingRootRecord?.root
                  ? abbreviate(operatorSwapResultingRootRecord.root)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Swap root registration basis</span>
              <strong>
                {formatOperatorRootRegistrationBasis(
                  operatorSwapResultingRootRecord?.registrationBasis,
                )}
              </strong>
            </div>
            <div className="review-row">
              <span>Swap root registration status</span>
              <strong>{operatorSwapResultingRootRegistrationStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap root registration note</span>
              <strong>{operatorSwapResultingRootRegistrationPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap resulting root proof</span>
              <strong>
                {operatorSwapResultingRootRecord?.proofId
                  ? abbreviate(operatorSwapResultingRootRecord.proofId)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Swap resulting root linked proof</span>
              <strong>
                {operatorSwapResultingRootLinkedProof?.proofId
                  ? abbreviate(operatorSwapResultingRootLinkedProof.proofId)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Swap resulting root proof link</span>
              <strong>{operatorSwapResultingRootProofLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap resulting root bundle</span>
              <strong>
                {operatorSwapResultingRootRecord?.artifactBundleStatus === "complete"
                  ? `Complete v${String(operatorSwapResultingRootRecord.artifactBundleVersion ?? 1)}`
                  : operatorSwapResultingRootRecord?.artifactBundleStatus === "legacy-incomplete"
                    ? "Legacy incomplete"
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Swap continuity status</span>
              <strong>{operatorSwapContinuityStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap continuity note</span>
              <strong>{operatorSwapContinuityPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap boundary status</span>
              <strong>{operatorSwapBoundaryStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Swap boundary note</span>
              <strong>{operatorSwapBoundaryPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator artifact bundle</span>
              <strong>
                {operatorRootError
                  ? operatorRootError
                  : latestOperatorRoot?.artifactBundleStatus === "complete"
                    ? `Complete v${String(latestOperatorRoot.artifactBundleVersion ?? 1)}`
                    : latestOperatorRoot?.artifactBundleStatus === "legacy-incomplete"
                      ? "Legacy incomplete"
                      : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Merkle depth</span>
              <strong>{String(unshieldState?.proofMerkleDepth ?? holdState?.proofMerkleDepth ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Owner auth mode</span>
              <strong>{unshieldState?.ownerAuthorizationMode ?? holdState?.ownerAuthorizationMode ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Nullifier key mode</span>
              <strong>{unshieldState?.nullifierKeyMode ?? holdState?.nullifierKeyMode ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Release destination</span>
              <strong>{abbreviate(unshieldState?.proofReleaseDestination ?? holdState?.proofReleaseDestination)}</strong>
            </div>
            <div className="review-row">
              <span>Public asset</span>
              <strong>{abbreviate(unshieldState?.proofAssetId ?? holdState?.proofAssetId)}</strong>
            </div>
            <div className="review-row">
              <span>Public amount</span>
              <strong>{unshieldState?.proofAmount ?? holdState?.proofAmount ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Public note version</span>
              <strong>{String(unshieldState?.proofNoteVersion ?? holdState?.proofNoteVersion ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Witness note type</span>
              <strong>{unshieldState?.proofNoteType ?? holdState?.proofNoteType ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Witness leaf index</span>
              <strong>{String(unshieldState?.proofLeafIndex ?? holdState?.proofLeafIndex ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Witness path depth</span>
              <strong>{String(unshieldState?.proofPathDepth ?? holdState?.proofPathDepth ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof statement</span>
              <strong>{unshieldState?.sourceProofStatement ?? holdState?.sourceProofPreviewStatement ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof verifier</span>
              <strong>{unshieldState?.sourceProofVerifier ?? holdState?.sourceProofPreviewVerifier ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof commitment</span>
              <strong>{abbreviate(unshieldState?.sourceProofCommitment ?? holdState?.sourceProofPreviewCommitment)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof root</span>
              <strong>{abbreviate(unshieldState?.sourceProofRoot ?? holdState?.sourceProofPreviewRoot)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof asset</span>
              <strong>{abbreviate(unshieldState?.sourceProofAssetId ?? holdState?.sourceProofPreviewAssetId)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof amount</span>
              <strong>{unshieldState?.sourceProofAmount ?? holdState?.sourceProofPreviewAmount ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof leaf index</span>
              <strong>{String(unshieldState?.sourceProofLeafIndex ?? holdState?.sourceProofPreviewLeafIndex ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof status</span>
              <strong>{unshieldState?.sourceProofStatusLabel ?? holdState?.sourceProofPreviewStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof consistency</span>
              <strong>{unshieldState?.sourceProofConsistencyLabel ?? holdState?.sourceProofPreviewConsistencyLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof commitment binding</span>
              <strong>{unshieldState?.sourceProofCommitmentStatus ?? holdState?.sourceProofPreviewCommitmentStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof root binding</span>
              <strong>{unshieldState?.sourceProofRootStatus ?? holdState?.sourceProofPreviewRootStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof nullifier binding</span>
              <strong>{unshieldState?.sourceProofNullifierStatus ?? holdState?.sourceProofPreviewNullifierStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source layer status</span>
              <strong>{unshieldState?.sourceLayerStatus ?? holdState?.previewSourceLayerStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proving boundary status</span>
              <strong>{unshieldState?.provingBoundaryStatus ?? holdState?.previewProvingBoundaryStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Handoff status</span>
              <strong>{unshieldState?.handoffStatus ?? holdState?.previewHandoffStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Primary handoff note</span>
              <strong>{unshieldState?.primaryHandoffNote ?? holdState?.previewPrimaryHandoffNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving lane" : "Proving preview lane"}</span>
              <strong>{unshieldState?.provingHashLane ?? holdState?.provingPreviewHashLane ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving note commitment" : "Proving preview commitment"}</span>
              <strong>{abbreviate(unshieldState?.provingNoteCommitment ?? holdState?.provingPreviewNoteCommitment)}</strong>
            </div>
            <div className="review-row">
              <span>Commitment comparison</span>
              <strong>{unshieldState?.noteCommitmentComparisonStatus ?? holdState?.noteCommitmentComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving leaf" : "Proving preview leaf"}</span>
              <strong>{abbreviate(unshieldState?.provingMerkleLeaf ?? holdState?.provingPreviewMerkleLeaf)}</strong>
            </div>
            <div className="review-row">
              <span>Leaf comparison</span>
              <strong>{unshieldState?.merkleLeafComparisonStatus ?? holdState?.merkleLeafComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving root" : "Proving preview root"}</span>
              <strong>{abbreviate(unshieldState?.provingStateRoot ?? holdState?.provingPreviewStateRoot)}</strong>
            </div>
            <div className="review-row">
              <span>Root comparison</span>
              <strong>{unshieldState?.stateRootComparisonStatus ?? holdState?.stateRootComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving nullifier" : "Proving preview nullifier"}</span>
              <strong>{abbreviate(unshieldState?.provingNullifier ?? holdState?.provingPreviewNullifier)}</strong>
            </div>
            <div className="review-row">
              <span>Nullifier comparison</span>
              <strong>{unshieldState?.nullifierComparisonStatus ?? holdState?.nullifierComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Consume context" : "Proving preview context"}</span>
              <strong>{abbreviate(unshieldState?.provingConsumeContextTag ?? holdState?.provingPreviewConsumeContextTag)}</strong>
            </div>
            <div className="review-row">
              <span>Consume context comparison</span>
              <strong>{unshieldState?.consumeContextComparisonStatus ?? holdState?.consumeContextComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source nullifier</span>
              <strong>{abbreviate(unshieldState?.sourceNullifier ?? holdState?.sourceProofPreviewNullifier)}</strong>
            </div>
            <div className="review-row">
              <span>Replay</span>
              <strong>
                {unshieldState?.replayRejected
                  ? "Rejected"
                  : holdState?.replayPreviewStatus ?? "Not yet tested"}
              </strong>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
