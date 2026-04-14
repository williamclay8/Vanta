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
  fetchVantaPrivateCoreOperatorSummary,
  registerVantaPrivateCoreOperatorRoot,
  requestVantaPrivateCoreOperatorConsume,
  requestVantaPrivateCoreOperatorProof,
  type VantaPrivateCoreConsumeOperatorResponse,
  type VantaPrivateCoreOperatorConsumeRecord,
  type VantaPrivateCoreOperatorProofRecord,
  type VantaPrivateCoreOperatorReleaseRecord,
  type VantaPrivateCoreOperatorRootRecord,
  type VantaPrivateCoreOperatorSendRecord,
  type VantaPrivateCoreOperatorSendProofRecord,
  type VantaPrivateCoreOperatorSummaryStateResponse,
  type VantaPrivateCoreProofOperatorResponse,
} from "@/zk/vantaPrivateCoreOperatorClient";

export type PrivacyAssetKey = "VUSD" | "USDC" | "JTO" | "BONK";

const VANTA_PRIVATE_CORE_VUSD_ASSET_ID =
  "0x7675736400000000000000000000000000000000000000000000000000000000" as const;
const VANTA_PRIVATE_CORE_VUSD_DECIMALS = 6;
const VANTA_PRIVATE_CORE_DEMO_RELEASE_DESTINATION =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as const;

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
  privateCoreOperatorCurrentRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  privateCoreOperatorCurrentRootProofLinkStatus: string | null;
  privateCoreOperatorSendResultingRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  privateCoreOperatorSendResultingRootRecord: VantaPrivateCoreOperatorRootRecord | null;
  privateCoreOperatorRawSendResultingRootNote: string | null;
  privateCoreOperatorRawSendResultingRootRegistrationNote: string | null;
  privateCoreOperatorRawSendResultingRootRegistrationStatus: string | null;
  privateCoreOperatorSendResultingRootProofLinkStatus: string | null;
  privateCoreOperatorRawSendResultingRootStatus: string | null;
  privateCoreOperatorRawBoundaryNote: string | null;
  privateCoreOperatorRawBoundaryStatus: string | null;
  privateCoreOperatorSupportedSendLaneKind: string | null;
  privateCoreOperatorSupportedSendLaneNote: string | null;
  privateCoreOperatorSupportedSendLaneStatus: string | null;
  privateCoreOperatorSupportedSendLaneVersion: number | null;
  privateCoreOperatorProofConsumeLinkStatus: string | null;
  privateCoreOperatorProofError: string | null;
  privateCoreOperatorProofs: VantaPrivateCoreOperatorProofRecord[];
  privateCoreOperatorProofSendLinkStatus: string | null;
  privateCoreOperatorProofReleaseLinkStatus: string | null;
  privateCoreOperatorReleaseError: string | null;
  privateCoreOperatorReleases: VantaPrivateCoreOperatorReleaseRecord[];
  privateCoreOperatorRoots: VantaPrivateCoreOperatorRootRecord[];
  privateCoreOperatorSendError: string | null;
  privateCoreOperatorSends: VantaPrivateCoreOperatorSendRecord[];
  privateCoreOperatorSendProofError: string | null;
  privateCoreOperatorSendProofs: VantaPrivateCoreOperatorSendProofRecord[];
  privateCoreOperatorBoundaryPrimaryNote: string | null;
  privateCoreOperatorBoundaryStatusLabel: string | null;
  privateCoreOperatorSendResultingRootPrimaryNote: string | null;
  privateCoreOperatorSendResultingRootRegistrationPrimaryNote: string | null;
  privateCoreOperatorSendResultingRootRegistrationStatusLabel: string | null;
  privateCoreOperatorSendResultingRootStatusLabel: string | null;
  privateCoreOperatorRootError: string | null;
  privateCoreOperatorRootRegistrationStatus: string | null;
  privateCoreOperatorRootCurrentnessLabel: string | null;
  privateCoreOperatorSummaryUpdatedAt: number | null;
  privateCoreUnshieldState: VantaPrivateCoreUnshieldState | null;
  recentShield: RecentShieldContext | null;
  ensurePrivateCoreOperatorRootKnown: (args: {
    proofBoundary: VantaPrivateCoreUnshieldProofBoundaryV0;
    sourceArtifacts: ReturnType<typeof deriveVantaPrivateCoreSourceArtifactsFromHeldNote>;
  }) => Promise<void>;
  refreshPrivateCoreOperatorSummary: () => Promise<VantaPrivateCoreOperatorSummaryStateResponse>;
  previewPrivateCoreSendTransition: (transition: SendTransitionV0) => SendResultV0;
  runPrivateCoreSendTransition: (transition: SendTransitionV0) => {
    nextHoldState: VantaPrivateCoreHoldState | null;
    nextShieldState: VantaPrivateCoreShieldState | null;
    result: SendResultV0;
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
  const [privateCoreOperatorCurrentRootLinkedProof, setPrivateCoreOperatorCurrentRootLinkedProof] =
    useState<VantaPrivateCoreOperatorProofRecord | null>(null);
  const [privateCoreOperatorCurrentRootProofLinkStatus, setPrivateCoreOperatorCurrentRootProofLinkStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSendResultingRootLinkedProof, setPrivateCoreOperatorSendResultingRootLinkedProof] =
    useState<VantaPrivateCoreOperatorProofRecord | null>(null);
  const [privateCoreOperatorSendResultingRootRecord, setPrivateCoreOperatorSendResultingRootRecord] =
    useState<VantaPrivateCoreOperatorRootRecord | null>(null);
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
  const [privateCoreOperatorRawBoundaryNote, setPrivateCoreOperatorRawBoundaryNote] =
    useState<string | null>(null);
  const [privateCoreOperatorRawBoundaryStatus, setPrivateCoreOperatorRawBoundaryStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSendLaneKind, setPrivateCoreOperatorSupportedSendLaneKind] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSendLaneNote, setPrivateCoreOperatorSupportedSendLaneNote] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSendLaneStatus, setPrivateCoreOperatorSupportedSendLaneStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSupportedSendLaneVersion, setPrivateCoreOperatorSupportedSendLaneVersion] =
    useState<number | null>(null);
  const [privateCoreOperatorProofConsumeLinkStatus, setPrivateCoreOperatorProofConsumeLinkStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorProofError, setPrivateCoreOperatorProofError] = useState<string | null>(null);
  const [privateCoreOperatorProofs, setPrivateCoreOperatorProofs] = useState<
    VantaPrivateCoreOperatorProofRecord[]
  >([]);
  const [privateCoreOperatorProofSendLinkStatus, setPrivateCoreOperatorProofSendLinkStatus] =
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
  const [privateCoreOperatorRoots, setPrivateCoreOperatorRoots] = useState<
    VantaPrivateCoreOperatorRootRecord[]
  >([]);
  const [privateCoreOperatorRootError, setPrivateCoreOperatorRootError] = useState<string | null>(null);
  const [privateCoreOperatorRootRegistrationStatus, setPrivateCoreOperatorRootRegistrationStatus] =
    useState<string | null>(null);
  const [privateCoreOperatorSummaryUpdatedAt, setPrivateCoreOperatorSummaryUpdatedAt] =
    useState<number | null>(null);
  const [recentShield, setRecentShield] = useState<RecentShieldContext | null>(null);

  const refreshPrivateCoreOperatorSummary = useCallback(async () => {
    const summaryState = await fetchVantaPrivateCoreOperatorSummary();
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
      setPrivateCoreOperatorCurrentRootProofLinkStatus,
      setPrivateCoreOperatorCurrentRootLinkedProof,
      setPrivateCoreOperatorRawSendResultingRootNote,
      setPrivateCoreOperatorRawSendResultingRootRegistrationNote,
      setPrivateCoreOperatorRawSendResultingRootRegistrationStatus,
      setPrivateCoreOperatorSendResultingRootLinkedProof,
      setPrivateCoreOperatorSendResultingRootRecord,
      setPrivateCoreOperatorSendResultingRootProofLinkStatus,
      setPrivateCoreOperatorRawSendResultingRootStatus,
      setPrivateCoreOperatorRawBoundaryNote,
      setPrivateCoreOperatorRawBoundaryStatus,
      setPrivateCoreOperatorSupportedSendLaneKind,
      setPrivateCoreOperatorSupportedSendLaneNote,
      setPrivateCoreOperatorSupportedSendLaneStatus,
      setPrivateCoreOperatorSupportedSendLaneVersion,
      setPrivateCoreOperatorConsumes,
      setPrivateCoreOperatorProofConsumeLinkStatus,
      setPrivateCoreOperatorProofs,
      setPrivateCoreOperatorProofSendLinkStatus,
      setPrivateCoreOperatorProofReleaseLinkStatus,
      setPrivateCoreOperatorReleases,
      setPrivateCoreOperatorRoots,
      setPrivateCoreOperatorSends,
      setPrivateCoreOperatorLatestSendProof,
      setPrivateCoreOperatorSendProofs,
    });
    setPrivateCoreOperatorConsumeError(null);
    setPrivateCoreOperatorProofError(null);
    setPrivateCoreOperatorReleaseError(null);
    setPrivateCoreOperatorRootError(null);
    setPrivateCoreOperatorSendError(null);
    setPrivateCoreOperatorSendProofError(null);
    setPrivateCoreOperatorSummaryUpdatedAt(summaryState.generatedAt);
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
        noteSummary: `${formatBaseUnits(args.shieldArtifact.note.amount, VANTA_PRIVATE_CORE_VUSD_DECIMALS)} VUSD private note`,
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
      return {
      privateCoreOwner,
      privateCoreRecentShield,
      privateCoreHoldState,
      privateCoreSendState,
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
      privateCoreOperatorCurrentRootLinkedProof,
      privateCoreOperatorCurrentRootProofLinkStatus,
      privateCoreOperatorSendResultingRootLinkedProof,
      privateCoreOperatorSendResultingRootRecord,
      privateCoreOperatorRawSendResultingRootNote,
      privateCoreOperatorRawSendResultingRootRegistrationNote,
      privateCoreOperatorRawSendResultingRootRegistrationStatus,
      privateCoreOperatorSendResultingRootProofLinkStatus,
      privateCoreOperatorRawSendResultingRootStatus,
      privateCoreOperatorRawBoundaryNote,
      privateCoreOperatorRawBoundaryStatus,
      privateCoreOperatorSupportedSendLaneKind,
      privateCoreOperatorSupportedSendLaneNote,
      privateCoreOperatorSupportedSendLaneStatus,
      privateCoreOperatorSupportedSendLaneVersion,
      privateCoreOperatorProofConsumeLinkStatus,
      privateCoreOperatorProofError,
      privateCoreOperatorProofs,
      privateCoreOperatorProofSendLinkStatus,
      privateCoreOperatorProofReleaseLinkStatus,
      privateCoreOperatorReleaseError,
      privateCoreOperatorReleases,
      privateCoreOperatorRoots,
      privateCoreOperatorSendError,
      privateCoreOperatorSends,
      privateCoreOperatorSendProofError,
      privateCoreOperatorSendProofs,
      privateCoreOperatorBoundaryPrimaryNote: privateCoreOperatorBoundarySummary.primaryNote,
      privateCoreOperatorBoundaryStatusLabel: privateCoreOperatorBoundarySummary.statusLabel,
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
      privateCoreOperatorSummaryUpdatedAt,
      privateCoreUnshieldState,
      recentShield,
      ensurePrivateCoreOperatorRootKnown,
      refreshPrivateCoreOperatorSummary,
      previewPrivateCoreSendTransition,
      runPrivateCoreSendTransition,
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
      privateCoreOperatorCurrentRootLinkedProof,
      privateCoreOperatorCurrentRootProofLinkStatus,
      privateCoreOperatorSendResultingRootLinkedProof,
      privateCoreOperatorSendResultingRootRecord,
      privateCoreOperatorRawSendResultingRootNote,
      privateCoreOperatorRawSendResultingRootRegistrationNote,
      privateCoreOperatorRawSendResultingRootRegistrationStatus,
      privateCoreOperatorSendResultingRootProofLinkStatus,
      privateCoreOperatorRawSendResultingRootStatus,
      privateCoreOperatorRawBoundaryNote,
      privateCoreOperatorRawBoundaryStatus,
      privateCoreOperatorSupportedSendLaneKind,
      privateCoreOperatorSupportedSendLaneNote,
      privateCoreOperatorSupportedSendLaneStatus,
      privateCoreOperatorSupportedSendLaneVersion,
      privateCoreOperatorProofConsumeLinkStatus,
      privateCoreOperatorProofError,
      privateCoreOperatorProofs,
      privateCoreOperatorProofSendLinkStatus,
      privateCoreOperatorProofReleaseLinkStatus,
      privateCoreOperatorReleaseError,
      privateCoreOperatorRootError,
      privateCoreOperatorRootRegistrationStatus,
      privateCoreOperatorReleases,
      privateCoreOperatorRoots,
      privateCoreOperatorSendError,
      privateCoreOperatorSends,
      privateCoreOperatorSendProofError,
      privateCoreOperatorSendProofs,
      privateCoreOperatorSummaryUpdatedAt,
      privateCoreRecentShield,
      privateCoreUnshieldState,
      recentShield,
      ensurePrivateCoreOperatorRootKnown,
      refreshPrivateCoreOperatorSummary,
      previewPrivateCoreSendTransition,
      runPrivateCoreSendTransition,
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
  setPrivateCoreOperatorCurrentRootLinkedProof: (value: VantaPrivateCoreOperatorProofRecord | null) => void;
  setPrivateCoreOperatorCurrentRootProofLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorSendResultingRootLinkedProof: (value: VantaPrivateCoreOperatorProofRecord | null) => void;
  setPrivateCoreOperatorSendResultingRootRecord: (value: VantaPrivateCoreOperatorRootRecord | null) => void;
  setPrivateCoreOperatorRawSendResultingRootNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSendResultingRootRegistrationNote: (value: string | null) => void;
  setPrivateCoreOperatorRawSendResultingRootRegistrationStatus: (value: string | null) => void;
  setPrivateCoreOperatorSendResultingRootProofLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawSendResultingRootStatus: (value: string | null) => void;
  setPrivateCoreOperatorRawBoundaryNote: (value: string | null) => void;
  setPrivateCoreOperatorRawBoundaryStatus: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendLaneKind: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendLaneNote: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendLaneStatus: (value: string | null) => void;
  setPrivateCoreOperatorSupportedSendLaneVersion: (value: number | null) => void;
  setPrivateCoreOperatorConsumes: (value: VantaPrivateCoreOperatorConsumeRecord[]) => void;
  setPrivateCoreOperatorProofConsumeLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorProofs: (value: VantaPrivateCoreOperatorProofRecord[]) => void;
  setPrivateCoreOperatorProofSendLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorProofReleaseLinkStatus: (value: string | null) => void;
  setPrivateCoreOperatorReleases: (value: VantaPrivateCoreOperatorReleaseRecord[]) => void;
  setPrivateCoreOperatorRoots: (value: VantaPrivateCoreOperatorRootRecord[]) => void;
  setPrivateCoreOperatorSends: (value: VantaPrivateCoreOperatorSendRecord[]) => void;
  setPrivateCoreOperatorSendProofs: (value: VantaPrivateCoreOperatorSendProofRecord[]) => void;
}) {
  args.setPrivateCoreOperatorCurrentRoot(args.summaryState.currentRoot);
  args.setPrivateCoreOperatorLatestRoot(args.summaryState.currentRecord);
  args.setPrivateCoreOperatorLatestProof(args.summaryState.latestProof);
  args.setPrivateCoreOperatorLatestSend(args.summaryState.latestSend);
  args.setPrivateCoreOperatorLatestSendLinkedProof(args.summaryState.latestSendLinkedProof);
  args.setPrivateCoreOperatorLatestSendProof(args.summaryState.latestSendProof);
  args.setPrivateCoreOperatorCurrentRootLinkedProof(args.summaryState.currentRootLinkedProof);
  args.setPrivateCoreOperatorCurrentRootProofLinkStatus(args.summaryState.currentRootProofLinkStatus);
  args.setPrivateCoreOperatorSendResultingRootLinkedProof(args.summaryState.sendResultingRootLinkedProof);
  args.setPrivateCoreOperatorSendResultingRootRecord(args.summaryState.sendResultingRootRecord);
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
  args.setPrivateCoreOperatorLatestConsume(args.summaryState.latestConsume);
  args.setPrivateCoreOperatorLatestConsumeProof(args.summaryState.latestConsumeProof);
  args.setPrivateCoreOperatorLatestRelease(args.summaryState.latestRelease);
  args.setPrivateCoreOperatorLatestReleaseProof(args.summaryState.latestReleaseProof);
  args.setPrivateCoreOperatorRawBoundaryNote(args.summaryState.boundaryNote);
  args.setPrivateCoreOperatorRawBoundaryStatus(args.summaryState.boundaryStatus);
  args.setPrivateCoreOperatorSupportedSendLaneKind(args.summaryState.supportedSendLaneKind);
  args.setPrivateCoreOperatorSupportedSendLaneNote(args.summaryState.supportedSendLaneNote);
  args.setPrivateCoreOperatorSupportedSendLaneStatus(args.summaryState.supportedSendLaneStatus);
  args.setPrivateCoreOperatorSupportedSendLaneVersion(args.summaryState.supportedSendLaneVersion);
  args.setPrivateCoreOperatorRoots(args.summaryState.rootRecords);
  args.setPrivateCoreOperatorProofs(args.summaryState.proofRecords);
  args.setPrivateCoreOperatorSends(args.summaryState.sendRecords);
  args.setPrivateCoreOperatorSendProofs(args.summaryState.sendProofRecords);
  args.setPrivateCoreOperatorConsumes(args.summaryState.consumeRecords);
  args.setPrivateCoreOperatorProofSendLinkStatus(args.summaryState.proofSendLinkStatus);
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
    completedAt: consumeReceipt.completedAt,
    consumedNoteId: `private-core-nullifier:${consumeReceipt.nullifier}`,
    nullifier: consumeReceipt.nullifier,
    proofFieldCount: consumeReceipt.proofFieldCount,
    proofId: consumeReceipt.proofId,
    publicInputCount: consumeReceipt.publicInputCount,
    releaseDestination: consumeReceipt.releaseDestination,
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
