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
  fetchVantaPrivateCoreOperatorConsumes,
  fetchVantaPrivateCoreOperatorRoots,
  registerVantaPrivateCoreOperatorRoot,
  requestVantaPrivateCoreOperatorConsume,
  requestVantaPrivateCoreOperatorProof,
  type VantaPrivateCoreConsumeOperatorResponse,
  type VantaPrivateCoreOperatorConsumeRecord,
  type VantaPrivateCoreOperatorRootRecord,
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
  privateCoreOperatorConsumes: VantaPrivateCoreOperatorConsumeRecord[];
  privateCoreOperatorConsumeError: string | null;
  privateCoreOperatorRoots: VantaPrivateCoreOperatorRootRecord[];
  privateCoreOperatorRootError: string | null;
  privateCoreOperatorRootRegistrationStatus: string | null;
  privateCoreUnshieldState: VantaPrivateCoreUnshieldState | null;
  recentShield: RecentShieldContext | null;
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
  const [privateCoreUnshieldState, setPrivateCoreUnshieldState] = useState<VantaPrivateCoreUnshieldState | null>(null);
  const [privateCoreOperatorConsumes, setPrivateCoreOperatorConsumes] = useState<
    VantaPrivateCoreOperatorConsumeRecord[]
  >([]);
  const [privateCoreOperatorConsumeError, setPrivateCoreOperatorConsumeError] = useState<string | null>(null);
  const [privateCoreOperatorRoots, setPrivateCoreOperatorRoots] = useState<
    VantaPrivateCoreOperatorRootRecord[]
  >([]);
  const [privateCoreOperatorRootError, setPrivateCoreOperatorRootError] = useState<string | null>(null);
  const [privateCoreOperatorRootRegistrationStatus, setPrivateCoreOperatorRootRegistrationStatus] =
    useState<string | null>(null);
  const [recentShield, setRecentShield] = useState<RecentShieldContext | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchVantaPrivateCoreOperatorConsumes()
      .then((records) => {
        if (cancelled) {
          return;
        }
        setPrivateCoreOperatorConsumes(records);
        setPrivateCoreOperatorConsumeError(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setPrivateCoreOperatorConsumeError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [privateCoreUnshieldState]);

  useEffect(() => {
    let cancelled = false;

    void fetchVantaPrivateCoreOperatorRoots()
      .then((records) => {
        if (cancelled) {
          return;
        }
        setPrivateCoreOperatorRoots(records);
        setPrivateCoreOperatorRootError(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setPrivateCoreOperatorRootError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [privateCoreRecentShield, privateCoreUnshieldState]);

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
    const sourceArtifacts = deriveVantaPrivateCoreSourceArtifactsFromShieldArtifact(
      privateCoreRecentShield.artifact,
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
        return fetchVantaPrivateCoreOperatorRoots();
      })
      .then((records) => {
        if (cancelled || !records) {
          return;
        }
        setPrivateCoreOperatorRoots(records);
        setPrivateCoreOperatorRootError(null);
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
      const records = await fetchVantaPrivateCoreOperatorRoots();

      setPrivateCoreOperatorRoots(records);
      setPrivateCoreOperatorRootError(null);
      setPrivateCoreOperatorRootRegistrationStatus(
        registration.known ? "Operator root registered" : "Operator root registration unavailable",
      );
    },
    [privateCoreOperatorRoots],
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
    const provingPreview = buildVantaPrivateCoreUnshieldProofBoundary({
      heldNote: hold,
      ownerSecretKey: privateCoreOwner.secretKey,
      releaseDestination: VANTA_PRIVATE_CORE_DEMO_RELEASE_DESTINATION,
    });
    const sourceProofPreviewEnvelope = buildVantaPrivateCoreUnshieldProofEnvelope(
      hold.note,
      hold.witness,
    );
    const sourceShieldArtifacts = deriveVantaPrivateCoreSourceArtifactsFromShieldArtifact(shield);
    const sourceHoldArtifacts = deriveVantaPrivateCoreSourceArtifactsFromHeldNote(hold);
    const provingPreviewArtifacts = deriveVantaPrivateCoreProvingArtifactsFromBoundary(provingPreview);
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
    const previewCompatibility = summarizeVantaPrivateCoreProofBoundaryCompatibility(provingPreview);
    const previewConfiguration = summarizeVantaPrivateCoreProofBoundaryConfiguration(provingPreview);
    const previewPublicInputs = summarizeVantaPrivateCoreProofBoundaryPublicInputs(provingPreview);
    const previewWitness = summarizeVantaPrivateCoreProofBoundaryWitness(provingPreview);
    const nextShieldState: VantaPrivateCoreShieldState = {
      artifact: shield,
      encryptedPayload: shield.encryptedPayload,
      sourceNoteCommitment: sourceShieldArtifacts.noteCommitment ?? shield.commitment.value,
      sourcePayloadCommitment:
        sourceShieldArtifacts.payloadCommitment ?? shield.encryptedPayload.payloadCommitment,
      sourceMerkleRoot: sourceShieldArtifacts.merkleRoot ?? shield.root,
      assetId: shield.note.assetId,
      amount: shield.note.amount.toString(10),
      noteType: shield.note.noteType,
      noteVersion: shield.note.version,
    };

    setPrivateCoreRecentShield(nextShieldState);
    setPrivateCoreHoldState({
      heldNote: hold,
      privateNoteRecovered: true,
      witnessAvailable: true,
      proofObservationMode: "Preview before consume",
      replayPreviewStatus: "Ready after first consume",
      sourceWitnessRoot: sourceHoldArtifacts.witnessRoot ?? hold.witness.root,
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
      noteSummary: `${formatBaseUnits(shield.note.amount, VANTA_PRIVATE_CORE_VUSD_DECIMALS)} VUSD private note`,
    });
    setPrivateCoreUnshieldState(null);

    return nextShieldState;
  }, [privateCoreLedger, privateCoreOwner]);

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
        witnessPackage: proofBoundary.noirWitnessPackage,
      });
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
    () => ({
      privateCoreOwner,
      privateCoreRecentShield,
      privateCoreHoldState,
      privateCoreOperatorConsumes,
      privateCoreOperatorConsumeError,
      privateCoreOperatorRoots,
      privateCoreOperatorRootError,
      privateCoreOperatorRootRegistrationStatus,
      privateCoreUnshieldState,
      recentShield,
      runPrivateCoreReplayAttempt,
      runPrivateCoreShield,
      runPrivateCoreUnshield,
      setPrivateCoreHoldState,
      setPrivateCoreRecentShield,
      setPrivateCoreUnshieldState,
      setRecentShield,
    }),
    [
      privateCoreHoldState,
      privateCoreOwner,
      privateCoreOperatorConsumeError,
      privateCoreOperatorConsumes,
      privateCoreOperatorRootError,
      privateCoreOperatorRootRegistrationStatus,
      privateCoreOperatorRoots,
      privateCoreRecentShield,
      privateCoreUnshieldState,
      recentShield,
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
