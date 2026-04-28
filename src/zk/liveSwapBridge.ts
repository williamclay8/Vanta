import {
  createCanonicalNote,
  deriveCanonicalNoteArtifacts,
  type CanonicalNoteArtifacts,
  type CanonicalNoteOwnerContext,
  type SerializedCanonicalNoteV1,
  toSerializedCanonicalNote,
} from "./canonicalNote";
import type { CanonicalNullifierBasis } from "./canonicalNote";
import {
  createCanonicalConsumptionRecord,
  type CanonicalLifecycleConsumptionRecord,
} from "./canonicalConsumption";
import { listCanonicalSendRecords } from "./liveSendBridge";
import { listCanonicalShieldRecords } from "./liveShieldBridge";
import { AppendOnlyShieldedState, type ShieldedCommitmentInsertionRecord } from "./shieldedState";
import {
  createCanonicalLifecycleNodeId,
  createCanonicalLifecycleRecordId,
  createCanonicalLineageId,
  type CanonicalLifecycleLinkReference,
  type CanonicalLifecycleOutputLinkage,
  type CanonicalLifecycleRecordLinkage,
} from "./canonicalLifecycleLinkage";

const LIVE_SWAP_RECORDS_STORAGE_KEY = "vanta.zk.phase1.live-swap-records.v1";
const DEFAULT_VUSD_DECIMALS = 6;
const DEFAULT_SOL_DECIMALS = 9;

export type LiveSwapCanonicalizationInput = {
  createdAt: number;
  owner: string;
  vaultOwner: string;
  input: {
    asset: "VUSD";
    mintAddress: string;
    amountDisplay: string;
    noteId: string;
    stateSignature: string;
  };
  output: {
    asset: "SOL";
    assetId: string;
    amountDisplay: string;
    noteId: string;
    stateSignature: string;
  };
  transition: {
    noteId: string;
    signature: string;
    spentMarkerSignature?: string;
  };
  operator?: {
    requestId?: string;
  };
  venue: {
    family: "DLMM";
    name: "Meteora";
    network: "Devnet";
    poolAddress: string;
    quoteId: string;
    quoteTimestamp: number;
    quoteExpiresAt: number;
  };
};

export type CanonicalSwapInputReference = {
  liveNoteId: string;
  liveStateSignature: string;
  canonicalCommitment?: string;
  canonicalRecordSource?: "live_shield_v1" | "live_send_v1";
  lifecycle?: CanonicalLifecycleLinkReference;
  nullifierBasis?: CanonicalNullifierBasis;
};

export type LiveSwapCanonicalRecord = {
  recordId: string;
  source: "live_swap_v1";
  createdAt: number;
  lifecycleLinkage?: CanonicalLifecycleRecordLinkage;
  liveSwap: {
    owner: string;
    vaultOwner: string;
    inputAsset: "VUSD";
    inputMintAddress: string;
    inputAmountDisplay: string;
    inputNoteId: string;
    inputStateSignature: string;
    outputAsset: "SOL";
    outputAssetId: string;
    outputAmountDisplay: string;
    outputNoteId: string;
    outputStateSignature: string;
    transitionNoteId: string;
    transitionSignature: string;
    spentMarkerSignature?: string;
    operatorRequestId?: string;
    venueFamily: "DLMM";
    venueName: "Meteora";
    venueNetwork: "Devnet";
    venuePoolAddress: string;
    quoteId: string;
    quoteTimestamp: number;
    quoteExpiresAt: number;
  };
  inputReference: CanonicalSwapInputReference;
  consumption?: CanonicalLifecycleConsumptionRecord;
  outputSuccessor: {
    canonicalNote: SerializedCanonicalNoteV1;
    artifacts: CanonicalNoteArtifacts;
    insertion: {
      index: number;
      previousRoot: string;
      root: string;
      leafCount: number;
    };
    liveNoteId: string;
    liveStateSignature: string;
    lifecycle?: CanonicalLifecycleOutputLinkage;
  };
};

export type LiveSwapDiagnosticsSummary = {
  recordId: string;
  createdAt: number;
  lifecycleRecordId?: string;
  lineageId?: string;
  inputAsset: "VUSD";
  inputAmountDisplay: string;
  inputLiveNoteId: string;
  inputCanonicalCommitment?: string;
  inputCanonicalRecordSource?: "live_shield_v1" | "live_send_v1";
  inputLifecycleId?: string;
  inputLifecycleLineageId?: string;
  inputLinkResolution?: CanonicalLifecycleLinkReference["resolution"];
  canonicalConsumptionId?: string;
  canonicalConsumptionKind?: CanonicalLifecycleConsumptionRecord["consumptionKind"];
  canonicalConsumptionBasis?: string;
  canonicalNullifierStub?: string;
  outputAsset: "SOL";
  outputAmountDisplay: string;
  outputLifecycleId?: string;
  outputLineageId?: string;
  outputPredecessorLifecycleId?: string;
  outputCommitment: string;
  outputInsertionIndex: number;
  outputSnapshotRoot: string;
  outputSnapshotLeafCount: number;
  outputLiveNoteId: string;
  transitionSignature: string;
  transitionNoteId: string;
  spentMarkerSignature?: string;
  operatorRequestId?: string;
  venueSummary: string;
  quoteId: string;
};

export type LiveSwapCommittedSettlementTerms = {
  economicsCommitment: string;
  inputCommitment: string;
  inputRoot: string;
  nullifierOrReplayCommitment: string;
  outputCommitment: string;
  outputLeafIndex: string;
  outputRoot: string;
  ownerCommitment: string;
  routeCommitment: string;
  settlementCommitment: string;
  settlementId: string;
  swapContextTag: string;
  swapPublicInputHash: string;
};

export async function recordCanonicalSwapFromLiveSwap(
  input: LiveSwapCanonicalizationInput,
): Promise<LiveSwapCanonicalRecord> {
  const existing = listCanonicalSwapRecords().find(
    (record) => record.liveSwap.transitionSignature === input.transition.signature,
  );

  if (existing) {
    return existing;
  }

  const inputReference = resolveCanonicalInputReference(
    input.input.noteId,
    input.input.stateSignature,
  );
  const recordLifecycleId = createCanonicalLifecycleRecordId("swap", input.transition.signature);
  const lineageId = inputReference.lifecycle?.lineageId ?? createCanonicalLineageId(recordLifecycleId);
  const predecessorLifecycleId = inputReference.lifecycle?.lifecycleId;
  const outputLifecycleId = createCanonicalLifecycleNodeId("swap", input.transition.signature, "output");

  const ownerContext = createOwnerContext(input.owner, input.output.assetId, input.vaultOwner);
  const canonicalOutputNote = createCanonicalNote({
    assetId: createCanonicalSolAssetId(input.output.assetId),
    amount: decimalAmountToBaseUnits(input.output.amountDisplay, DEFAULT_SOL_DECIMALS),
    ownerPublicKey: input.owner,
    creationHint: {
      sourceKind: "swap",
      sourceAssetHint: "SOL",
      sourceTxSignatureHint: input.transition.signature,
      sourceTransitionIdHint: input.transition.noteId,
    },
  });
  const artifacts = await deriveCanonicalNoteArtifacts(canonicalOutputNote, ownerContext);
  const insertion = await insertCommitmentIntoCanonicalShieldedState(artifacts.commitment);

  const record: LiveSwapCanonicalRecord = {
    recordId: input.transition.signature,
    source: "live_swap_v1",
    createdAt: input.createdAt,
    lifecycleLinkage: {
      recordLifecycleId,
      lineageId,
      predecessorLifecycleId,
      outputLifecycleIds: [outputLifecycleId],
    },
    liveSwap: {
      owner: input.owner,
      vaultOwner: input.vaultOwner,
      inputAsset: "VUSD",
      inputMintAddress: input.input.mintAddress,
      inputAmountDisplay: input.input.amountDisplay,
      inputNoteId: input.input.noteId,
      inputStateSignature: input.input.stateSignature,
      outputAsset: "SOL",
      outputAssetId: input.output.assetId,
      outputAmountDisplay: input.output.amountDisplay,
      outputNoteId: input.output.noteId,
      outputStateSignature: input.output.stateSignature,
      transitionNoteId: input.transition.noteId,
      transitionSignature: input.transition.signature,
      spentMarkerSignature: input.transition.spentMarkerSignature,
      operatorRequestId: input.operator?.requestId,
      venueFamily: input.venue.family,
      venueName: input.venue.name,
      venueNetwork: input.venue.network,
      venuePoolAddress: input.venue.poolAddress,
      quoteId: input.venue.quoteId,
      quoteTimestamp: input.venue.quoteTimestamp,
      quoteExpiresAt: input.venue.quoteExpiresAt,
    },
    inputReference,
    consumption:
      predecessorLifecycleId && inputReference.nullifierBasis
        ? await createCanonicalConsumptionRecord({
            recordLifecycleId,
            lineageId,
            consumedLifecycleId: predecessorLifecycleId,
            consumptionKind: "swap",
            consumedNullifierBasis: inputReference.nullifierBasis,
            producedLifecycleIds: [outputLifecycleId],
          })
        : undefined,
    outputSuccessor: {
      canonicalNote: toSerializedCanonicalNote(canonicalOutputNote),
      artifacts,
      insertion: {
        index: insertion.index,
        previousRoot: insertion.previousRoot,
        root: insertion.snapshot.root.value,
        leafCount: insertion.snapshot.leafCount,
      },
      liveNoteId: input.output.noteId,
      liveStateSignature: input.output.stateSignature,
      lifecycle: {
        lifecycleId: outputLifecycleId,
        lineageId,
        predecessorLifecycleId,
        branchRole: "output",
      },
    },
  };

  persistCanonicalSwapRecord(record);
  return record;
}

export async function createCommittedSwapSettlementTerms(
  record: LiveSwapCanonicalRecord,
): Promise<LiveSwapCommittedSettlementTerms> {
  const inputCommitment = record.inputReference.canonicalCommitment;
  const nullifierOrReplayCommitment = record.consumption?.nullifierStub.value;

  if (!inputCommitment) {
    throw new Error(
      "Committed Swap settlement requires a canonical input commitment before receipt registration.",
    );
  }

  if (!nullifierOrReplayCommitment) {
    throw new Error(
      "Committed Swap settlement requires canonical replay/nullifier material before receipt registration.",
    );
  }

  const settlementId = `swap:${record.recordId}`;
  const outputCommitment = record.outputSuccessor.artifacts.commitment.value;

  const economicsCommitment = await createSwapSettlementCommitment(record, "economics", [
    record.liveSwap.inputAsset,
    record.liveSwap.inputMintAddress,
    record.liveSwap.inputAmountDisplay,
    record.liveSwap.outputAsset,
    record.liveSwap.outputAssetId,
    record.liveSwap.outputAmountDisplay,
    record.liveSwap.quoteId,
    record.liveSwap.quoteTimestamp,
    record.liveSwap.quoteExpiresAt,
  ]);
  const ownerCommitment = await createSwapSettlementCommitment(record, "owner", [
    record.liveSwap.owner,
    record.liveSwap.vaultOwner,
  ]);
  const routeCommitment = await createSwapSettlementCommitment(record, "route", [
    record.liveSwap.venueFamily,
    record.liveSwap.venueName,
    record.liveSwap.venueNetwork,
    record.liveSwap.venuePoolAddress,
    record.liveSwap.quoteId,
    record.liveSwap.quoteTimestamp,
    record.liveSwap.quoteExpiresAt,
  ]);
  const settlementCommitment = await createSwapSettlementCommitment(record, "settlement", [
    record.recordId,
    record.liveSwap.transitionSignature,
    record.liveSwap.spentMarkerSignature,
    record.outputSuccessor.insertion.root,
    outputCommitment,
    inputCommitment,
    nullifierOrReplayCommitment,
  ]);
  const swapContextTag = await createSwapSettlementCommitment(record, "swap-context", [
    record.lifecycleLinkage?.recordLifecycleId,
    record.lifecycleLinkage?.lineageId,
    record.liveSwap.transitionNoteId,
    record.liveSwap.operatorRequestId,
  ]);

  return {
    economicsCommitment,
    inputCommitment,
    inputRoot: record.outputSuccessor.insertion.previousRoot,
    nullifierOrReplayCommitment,
    outputCommitment,
    outputLeafIndex: String(record.outputSuccessor.insertion.index),
    outputRoot: record.outputSuccessor.insertion.root,
    ownerCommitment,
    routeCommitment,
    settlementCommitment,
    settlementId,
    swapContextTag,
    swapPublicInputHash: await createSwapSettlementCommitment(record, "swap-public-input", [
      record.outputSuccessor.insertion.previousRoot,
      inputCommitment,
      nullifierOrReplayCommitment,
      settlementCommitment,
      routeCommitment,
      economicsCommitment,
      outputCommitment,
      record.outputSuccessor.insertion.index,
      record.outputSuccessor.insertion.root,
      ownerCommitment,
      swapContextTag,
    ]),
  };
}

export function listCanonicalSwapRecords(): LiveSwapCanonicalRecord[] {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(LIVE_SWAP_RECORDS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isLiveSwapCanonicalRecord);
  } catch {
    return [];
  }
}

export function listCanonicalSwapDiagnosticsSummaries(): LiveSwapDiagnosticsSummary[] {
  return listCanonicalSwapRecords()
    .map((record) => ({
      recordId: record.recordId,
      createdAt: record.createdAt,
      lifecycleRecordId: record.lifecycleLinkage?.recordLifecycleId,
      lineageId: record.lifecycleLinkage?.lineageId,
      inputAsset: record.liveSwap.inputAsset,
      inputAmountDisplay: record.liveSwap.inputAmountDisplay,
      inputLiveNoteId: record.liveSwap.inputNoteId,
      inputCanonicalCommitment: record.inputReference.canonicalCommitment,
      inputCanonicalRecordSource: record.inputReference.canonicalRecordSource,
      inputLifecycleId: record.inputReference.lifecycle?.lifecycleId,
      inputLifecycleLineageId: record.inputReference.lifecycle?.lineageId,
      inputLinkResolution: record.inputReference.lifecycle?.resolution,
      canonicalConsumptionId: record.consumption?.consumptionId,
      canonicalConsumptionKind: record.consumption?.consumptionKind,
      canonicalConsumptionBasis: record.consumption?.consumptionBasis.value,
      canonicalNullifierStub: record.consumption?.nullifierStub.value,
      outputAsset: record.liveSwap.outputAsset,
      outputAmountDisplay: record.liveSwap.outputAmountDisplay,
      outputLifecycleId: record.outputSuccessor.lifecycle?.lifecycleId,
      outputLineageId: record.outputSuccessor.lifecycle?.lineageId,
      outputPredecessorLifecycleId: record.outputSuccessor.lifecycle?.predecessorLifecycleId,
      outputCommitment: record.outputSuccessor.artifacts.commitment.value,
      outputInsertionIndex: record.outputSuccessor.insertion.index,
      outputSnapshotRoot: record.outputSuccessor.insertion.root,
      outputSnapshotLeafCount: record.outputSuccessor.insertion.leafCount,
      outputLiveNoteId: record.outputSuccessor.liveNoteId,
      transitionSignature: record.liveSwap.transitionSignature,
      transitionNoteId: record.liveSwap.transitionNoteId,
      spentMarkerSignature: record.liveSwap.spentMarkerSignature,
      operatorRequestId: record.liveSwap.operatorRequestId,
      venueSummary: `${record.liveSwap.venueName} ${record.liveSwap.venueFamily} · ${record.liveSwap.venueNetwork}`,
      quoteId: record.liveSwap.quoteId,
    }))
    .sort((left, right) => right.createdAt - left.createdAt);
}

function resolveCanonicalInputReference(
  liveNoteId: string,
  liveStateSignature: string,
): CanonicalSwapInputReference {
  const shieldMatch = listCanonicalShieldRecords().find(
    (record) => record.liveShield.stateSignature === liveStateSignature,
  );

  if (shieldMatch) {
    return {
      liveNoteId,
      liveStateSignature,
      canonicalCommitment: shieldMatch.artifacts.commitment.value,
      canonicalRecordSource: "live_shield_v1",
      lifecycle: shieldMatch.lifecycleLinkage
        ? {
            lifecycleId: shieldMatch.lifecycleLinkage.outputLifecycleIds[0],
            lineageId: shieldMatch.lifecycleLinkage.lineageId,
            resolution: "explicit",
          }
        : {
            resolution: "canonical",
          },
      nullifierBasis: shieldMatch.artifacts.nullifierBasis,
    };
  }

  for (const record of listCanonicalSendRecords()) {
    const successorMatch = record.successors.find(
      (successor) =>
        successor.liveNoteId === liveNoteId || successor.liveStateSignature === liveStateSignature,
    );

    if (successorMatch) {
      return {
        liveNoteId,
        liveStateSignature,
        canonicalCommitment: successorMatch.artifacts.commitment.value,
        canonicalRecordSource: "live_send_v1",
        lifecycle: successorMatch.lifecycle
          ? {
              lifecycleId: successorMatch.lifecycle.lifecycleId,
              lineageId: successorMatch.lifecycle.lineageId,
              resolution: "explicit",
            }
          : {
              resolution: "canonical",
            },
        nullifierBasis: successorMatch.artifacts.nullifierBasis,
      };
    }
  }

  return {
    liveNoteId,
    liveStateSignature,
    lifecycle: {
      resolution: "unresolved",
    },
  };
}

async function insertCommitmentIntoCanonicalShieldedState(
  commitment: CanonicalNoteArtifacts["commitment"],
): Promise<ShieldedCommitmentInsertionRecord & { previousRoot: string }> {
  const state = AppendOnlyShieldedState.empty();

  for (const record of listCanonicalShieldRecords()) {
    await state.insertCommitment(record.artifacts.commitment);
  }

  for (const record of listCanonicalSendRecords()) {
    for (const successor of record.successors) {
      await state.insertCommitment(successor.artifacts.commitment);
    }
  }

  for (const record of listCanonicalSwapRecords()) {
    await state.insertCommitment(record.outputSuccessor.artifacts.commitment);
  }

  const previousSnapshot = await state.getSnapshot();
  const insertion = await state.insertCommitment(commitment);
  return {
    ...insertion,
    previousRoot: previousSnapshot.root.value,
  };
}

function persistCanonicalSwapRecord(record: LiveSwapCanonicalRecord) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const nextRecords = [...listCanonicalSwapRecords(), record];
  storage.setItem(LIVE_SWAP_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords));
}

function createOwnerContext(
  owner: string,
  outputAssetId: string,
  vaultOwner: string,
): CanonicalNoteOwnerContext {
  return {
    ownerPublicKey: owner,
    recoverySecret: randomHex32(),
    derivationContext: `swap:${outputAssetId}:${vaultOwner}`,
  };
}

function createCanonicalSolAssetId(assetId: string) {
  return `solana:native:${assetId}`;
}

async function createSwapSettlementCommitment(
  record: LiveSwapCanonicalRecord,
  label: string,
  parts: readonly unknown[],
) {
  const payload = JSON.stringify({
    domain: "vanta.swap.committed-settlement.v0",
    label,
    recordId: record.recordId,
    parts,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return `0x${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

function decimalAmountToBaseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid decimal swap amount: ${value}`);
  }

  const [wholePart, fractionalPart = ""] = trimmed.split(".");
  const normalizedFraction = fractionalPart.padEnd(decimals, "0").slice(0, decimals);

  return BigInt(`${wholePart}${normalizedFraction}`);
}

function randomHex32() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function getStorage(): Storage | null {
  if (typeof globalThis !== "object" || globalThis === null) {
    return null;
  }

  return globalThis.localStorage ?? null;
}

function isLiveSwapCanonicalRecord(value: unknown): value is LiveSwapCanonicalRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<LiveSwapCanonicalRecord>;
  return (
    typeof record.recordId === "string" &&
    record.source === "live_swap_v1" &&
    typeof record.createdAt === "number" &&
    typeof record.liveSwap === "object" &&
    record.liveSwap !== null &&
    typeof record.inputReference === "object" &&
    record.inputReference !== null &&
    typeof record.outputSuccessor === "object" &&
    record.outputSuccessor !== null
  );
}
