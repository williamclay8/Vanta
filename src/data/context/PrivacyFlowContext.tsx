import {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  VantaPrivateCoreLedger,
  buildVantaPrivateCoreUnshieldProofEnvelope,
  createVantaPrivateCoreOwnerKeypair,
  type VantaPrivateCoreOwnerKeypair,
  type CiphertextPackageV0,
  type HeldNoteViewV0,
  type ShieldArtifactV0,
  type UnshieldProofEnvelopeV0,
  type UnshieldResultV0,
} from "@/zk/vantaPrivateCore";
import {
  buildVantaPrivateCoreUnshieldProofBoundary,
  type VantaPrivateCoreUnshieldProofBoundaryV0,
} from "@/zk/vantaPrivateCoreUnshieldProof";

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
  privateCoreUnshieldState: VantaPrivateCoreUnshieldState | null;
  recentShield: RecentShieldContext | null;
  runPrivateCoreShield: (args: { amountDisplay: string; asset: PrivacyAssetKey }) => VantaPrivateCoreShieldState;
  runPrivateCoreUnshield: () => VantaPrivateCoreUnshieldState;
  runPrivateCoreReplayAttempt: () => VantaPrivateCoreUnshieldState;
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
  sourceWitnessRoot: string;
  provingPreviewHashLane: string;
  provingPreviewStateRoot: string;
  provingPreviewNullifier: string;
  provingPreviewConsumeContextTag: string | null;
  noteSummary: string;
};

export type VantaPrivateCoreUnshieldState = {
  sourceNullifier: string | null;
  proofEnvelope: UnshieldProofEnvelopeV0 | null;
  proofBoundary: VantaPrivateCoreUnshieldProofBoundaryV0 | null;
  provingHashLane: string | null;
  provingStateRoot: string | null;
  provingNullifier: string | null;
  provingConsumeContextTag: string | null;
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
  const [recentShield, setRecentShield] = useState<RecentShieldContext | null>(null);

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
    const nextShieldState: VantaPrivateCoreShieldState = {
      artifact: shield,
      encryptedPayload: shield.encryptedPayload,
      sourceNoteCommitment: shield.commitment.value,
      sourcePayloadCommitment: shield.encryptedPayload.payloadCommitment,
      sourceMerkleRoot: shield.root,
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
      sourceWitnessRoot: hold.witness.root,
      provingPreviewHashLane: provingPreview.noirWitnessPackage.provingHashLane,
      provingPreviewStateRoot: provingPreview.noirWitnessPackage.publicInputs.state_root,
      provingPreviewNullifier: provingPreview.noirWitnessPackage.publicInputs.nullifier,
      provingPreviewConsumeContextTag:
        provingPreview.noirWitnessPackage.publicInputs.consume_context_tag_lo ?? null,
      noteSummary: `${formatBaseUnits(shield.note.amount, VANTA_PRIVATE_CORE_VUSD_DECIMALS)} VUSD private note`,
    });
    setPrivateCoreUnshieldState(null);

    return nextShieldState;
  }, [privateCoreLedger, privateCoreOwner]);

  const runPrivateCoreUnshield = useCallback((): VantaPrivateCoreUnshieldState => {
    if (!privateCoreHoldState) {
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: null,
        proofEnvelope: null,
        proofBoundary: null,
        provingHashLane: null,
        provingStateRoot: null,
        provingNullifier: null,
        provingConsumeContextTag: null,
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

    try {
      const result = privateCoreLedger.unshield(privateCoreHoldState.heldNote);
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: result.nullifier.value,
        proofEnvelope,
        proofBoundary,
        provingHashLane: proofBoundary.noirWitnessPackage.provingHashLane,
        provingStateRoot: proofBoundary.noirWitnessPackage.publicInputs.state_root,
        provingNullifier: proofBoundary.noirWitnessPackage.publicInputs.nullifier,
        provingConsumeContextTag:
          proofBoundary.noirWitnessPackage.publicInputs.consume_context_tag_lo ?? null,
        consumeSucceeded: true,
        replayRejected: false,
        errorMessage: null,
        result,
      };
      setPrivateCoreUnshieldState(nextState);
      return nextState;
    } catch (error) {
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: proofEnvelope.publicInputs.nullifier,
        proofEnvelope,
        proofBoundary,
        provingHashLane: proofBoundary.noirWitnessPackage.provingHashLane,
        provingStateRoot: proofBoundary.noirWitnessPackage.publicInputs.state_root,
        provingNullifier: proofBoundary.noirWitnessPackage.publicInputs.nullifier,
        provingConsumeContextTag:
          proofBoundary.noirWitnessPackage.publicInputs.consume_context_tag_lo ?? null,
        consumeSucceeded: false,
        replayRejected: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        result: null,
      };
      setPrivateCoreUnshieldState(nextState);
      return nextState;
    }
  }, [privateCoreHoldState, privateCoreLedger]);

  const runPrivateCoreReplayAttempt = useCallback((): VantaPrivateCoreUnshieldState => {
    if (!privateCoreHoldState) {
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: null,
        proofEnvelope: null,
        proofBoundary: null,
        provingHashLane: null,
        provingStateRoot: null,
        provingNullifier: null,
        provingConsumeContextTag: null,
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

    try {
      const result = privateCoreLedger.unshield(privateCoreHoldState.heldNote);
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: result.nullifier.value,
        proofEnvelope,
        proofBoundary,
        provingHashLane: proofBoundary.noirWitnessPackage.provingHashLane,
        provingStateRoot: proofBoundary.noirWitnessPackage.publicInputs.state_root,
        provingNullifier: proofBoundary.noirWitnessPackage.publicInputs.nullifier,
        provingConsumeContextTag:
          proofBoundary.noirWitnessPackage.publicInputs.consume_context_tag_lo ?? null,
        consumeSucceeded: true,
        replayRejected: false,
        errorMessage: null,
        result,
      };
      setPrivateCoreUnshieldState(nextState);
      return nextState;
    } catch (error) {
      const nextState: VantaPrivateCoreUnshieldState = {
        sourceNullifier: proofEnvelope.publicInputs.nullifier,
        proofEnvelope,
        proofBoundary,
        provingHashLane: proofBoundary.noirWitnessPackage.provingHashLane,
        provingStateRoot: proofBoundary.noirWitnessPackage.publicInputs.state_root,
        provingNullifier: proofBoundary.noirWitnessPackage.publicInputs.nullifier,
        provingConsumeContextTag:
          proofBoundary.noirWitnessPackage.publicInputs.consume_context_tag_lo ?? null,
        consumeSucceeded: false,
        replayRejected: true,
        errorMessage: error instanceof Error ? error.message : String(error),
        result: null,
      };
      setPrivateCoreUnshieldState(nextState);
      return nextState;
    }
  }, [privateCoreHoldState, privateCoreLedger]);

  const value = useMemo<PrivacyFlowContextValue>(
    () => ({
      privateCoreOwner,
      privateCoreRecentShield,
      privateCoreHoldState,
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
