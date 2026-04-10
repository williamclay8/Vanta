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
import { AppendOnlyShieldedState, type ShieldedCommitmentInsertionRecord } from "./shieldedState";
import {
  createCanonicalLifecycleNodeId,
  createCanonicalLifecycleRecordId,
  createCanonicalLineageId,
  type CanonicalLifecycleLinkReference,
  type CanonicalLifecycleOutputLinkage,
  type CanonicalLifecycleRecordLinkage,
} from "./canonicalLifecycleLinkage";
import { listCanonicalShieldRecords } from "./liveShieldBridge";

const LIVE_SEND_RECORDS_STORAGE_KEY = "vanta.zk.phase1.live-send-records.v1";
const DEFAULT_VUSD_DECIMALS = 6;

export type LiveSendCanonicalizationInput = {
  assetSymbol: "VUSD";
  mintAddress: string;
  owner: string;
  vaultOwner: string;
  createdAt: number;
  recipient: string;
  sentAmountDisplay: string;
  changeAmountDisplay: string;
  tokenDecimals?: number;
  predecessor: {
    noteId: string;
    stateSignature: string;
    amountDisplay: string;
  };
  transition: {
    noteId: string;
    signature: string;
    spentMarkerSignature?: string;
    changeNoteId?: string;
  };
};

export type CanonicalPredecessorReference = {
  liveNoteId: string;
  liveStateSignature: string;
  canonicalCommitment?: string;
  canonicalRecordSource?: "live_shield_v1" | "live_send_v1";
  lifecycle?: CanonicalLifecycleLinkReference;
  nullifierBasis?: CanonicalNullifierBasis;
};

export type LiveSendCanonicalSuccessorRecord = {
  kind: "recipient" | "change";
  amountDisplay: string;
  canonicalNote: SerializedCanonicalNoteV1;
  artifacts: CanonicalNoteArtifacts;
  insertion: {
    index: number;
    root: string;
    leafCount: number;
  };
  liveNoteId?: string;
  liveStateSignature?: string;
  lifecycle?: CanonicalLifecycleOutputLinkage;
};

export type LiveSendCanonicalRecord = {
  recordId: string;
  source: "live_send_v1";
  createdAt: number;
  lifecycleLinkage?: CanonicalLifecycleRecordLinkage;
  liveSend: {
    assetSymbol: "VUSD";
    mintAddress: string;
    owner: string;
    vaultOwner: string;
    recipient: string;
    sentAmountDisplay: string;
    changeAmountDisplay: string;
    tokenDecimals: number;
    predecessorNoteId: string;
    predecessorStateSignature: string;
    transitionNoteId: string;
    transitionSignature: string;
    spentMarkerSignature?: string;
  };
  predecessor: CanonicalPredecessorReference;
  consumption?: CanonicalLifecycleConsumptionRecord;
  successors: LiveSendCanonicalSuccessorRecord[];
};

export type LiveSendDiagnosticsSummary = {
  recordId: string;
  createdAt: number;
  lifecycleRecordId?: string;
  lineageId?: string;
  predecessorLiveNoteId: string;
  predecessorCanonicalCommitment?: string;
  predecessorCanonicalRecordSource?: "live_shield_v1" | "live_send_v1";
  predecessorLifecycleId?: string;
  predecessorLifecycleLineageId?: string;
  predecessorLinkResolution?: CanonicalLifecycleLinkReference["resolution"];
  canonicalConsumptionId?: string;
  canonicalConsumptionKind?: CanonicalLifecycleConsumptionRecord["consumptionKind"];
  canonicalConsumptionBasis?: string;
  canonicalNullifierStub?: string;
  transitionSignature: string;
  spentMarkerSignature?: string;
  recipient: string;
  successors: Array<{
    kind: "recipient" | "change";
    lifecycleId?: string;
    lineageId?: string;
    predecessorLifecycleId?: string;
    commitment: string;
    insertionIndex: number;
    snapshotRoot: string;
    snapshotLeafCount: number;
    amountDisplay: string;
    assetId: string;
    ownerPublicKey: string;
    liveNoteId?: string;
    liveStateSignature?: string;
  }>;
};

export async function recordCanonicalSendFromLiveSend(
  input: LiveSendCanonicalizationInput,
): Promise<LiveSendCanonicalRecord> {
  const existing = listCanonicalSendRecords().find(
    (record) => record.liveSend.transitionSignature === input.transition.signature,
  );

  if (existing) {
    return existing;
  }

  const predecessor = resolveCanonicalPredecessorReference(
    input.predecessor.noteId,
    input.predecessor.stateSignature,
  );
  const recordLifecycleId = createCanonicalLifecycleRecordId("send", input.transition.signature);
  const lineageId = predecessor.lifecycle?.lineageId ?? createCanonicalLineageId(recordLifecycleId);
  const predecessorLifecycleId = predecessor.lifecycle?.lifecycleId;

  const ownerContext = createOwnerContext(input.owner, input.mintAddress, input.vaultOwner);
  const recipientSuccessor = await createSuccessorRecord({
    amountDisplay: input.sentAmountDisplay,
    createdAt: input.createdAt,
    kind: "recipient",
    lineageId,
    predecessorLifecycleId,
    mintAddress: input.mintAddress,
    ownerContext,
    ownerPublicKey: input.recipient,
    recordId: input.transition.signature,
    transitionNoteId: input.transition.noteId,
    transitionSignature: input.transition.signature,
    tokenDecimals: resolveTokenDecimals(input.tokenDecimals),
  });

  const changeSuccessor =
    Number(input.changeAmountDisplay) > 0
      ? await createSuccessorRecord({
          amountDisplay: input.changeAmountDisplay,
          createdAt: input.createdAt,
          kind: "change",
          lineageId,
          predecessorLifecycleId,
          liveNoteId: input.transition.changeNoteId,
          liveStateSignature: `${input.transition.signature}:change`,
          mintAddress: input.mintAddress,
          ownerContext,
          ownerPublicKey: input.owner,
          recordId: input.transition.signature,
          transitionNoteId: input.transition.noteId,
          transitionSignature: input.transition.signature,
          tokenDecimals: resolveTokenDecimals(input.tokenDecimals),
        })
      : null;

  const successors = [recipientSuccessor, changeSuccessor].filter(
    (value): value is LiveSendCanonicalSuccessorRecord => value !== null,
  );
  const outputLifecycleIds = successors
    .map((successor) => successor.lifecycle?.lifecycleId)
    .filter((value): value is string => typeof value === "string");
  const consumption =
    predecessorLifecycleId && predecessor.nullifierBasis
      ? await createCanonicalConsumptionRecord({
          recordLifecycleId,
          lineageId,
          consumedLifecycleId: predecessorLifecycleId,
          consumptionKind: "send",
          consumedNullifierBasis: predecessor.nullifierBasis,
          producedLifecycleIds: outputLifecycleIds,
        })
      : undefined;

  const record: LiveSendCanonicalRecord = {
    recordId: input.transition.signature,
    source: "live_send_v1",
    createdAt: input.createdAt,
    lifecycleLinkage: {
      recordLifecycleId,
      lineageId,
      predecessorLifecycleId,
      outputLifecycleIds,
    },
    liveSend: {
      assetSymbol: "VUSD",
      mintAddress: input.mintAddress,
      owner: input.owner,
      vaultOwner: input.vaultOwner,
      recipient: input.recipient,
      sentAmountDisplay: input.sentAmountDisplay,
      changeAmountDisplay: input.changeAmountDisplay,
      tokenDecimals: resolveTokenDecimals(input.tokenDecimals),
      predecessorNoteId: input.predecessor.noteId,
      predecessorStateSignature: input.predecessor.stateSignature,
      transitionNoteId: input.transition.noteId,
      transitionSignature: input.transition.signature,
      spentMarkerSignature: input.transition.spentMarkerSignature,
    },
    predecessor,
    consumption,
    successors,
  };

  persistCanonicalSendRecord(record);
  return record;
}

export function listCanonicalSendRecords(): LiveSendCanonicalRecord[] {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(LIVE_SEND_RECORDS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isLiveSendCanonicalRecord);
  } catch {
    return [];
  }
}

export function listCanonicalSendDiagnosticsSummaries(): LiveSendDiagnosticsSummary[] {
  return listCanonicalSendRecords()
    .map((record) => ({
      recordId: record.recordId,
      createdAt: record.createdAt,
      lifecycleRecordId: record.lifecycleLinkage?.recordLifecycleId,
      lineageId: record.lifecycleLinkage?.lineageId,
      predecessorLiveNoteId: record.predecessor.liveNoteId,
      predecessorCanonicalCommitment: record.predecessor.canonicalCommitment,
      predecessorCanonicalRecordSource: record.predecessor.canonicalRecordSource,
      predecessorLifecycleId: record.predecessor.lifecycle?.lifecycleId,
      predecessorLifecycleLineageId: record.predecessor.lifecycle?.lineageId,
      predecessorLinkResolution: record.predecessor.lifecycle?.resolution,
      canonicalConsumptionId: record.consumption?.consumptionId,
      canonicalConsumptionKind: record.consumption?.consumptionKind,
      canonicalConsumptionBasis: record.consumption?.consumptionBasis.value,
      canonicalNullifierStub: record.consumption?.nullifierStub.value,
      transitionSignature: record.liveSend.transitionSignature,
      spentMarkerSignature: record.liveSend.spentMarkerSignature,
      recipient: record.liveSend.recipient,
      successors: record.successors.map((successor) => ({
        kind: successor.kind,
        lifecycleId: successor.lifecycle?.lifecycleId,
        lineageId: successor.lifecycle?.lineageId,
        predecessorLifecycleId: successor.lifecycle?.predecessorLifecycleId,
        commitment: successor.artifacts.commitment.value,
        insertionIndex: successor.insertion.index,
        snapshotRoot: successor.insertion.root,
        snapshotLeafCount: successor.insertion.leafCount,
        amountDisplay: successor.amountDisplay,
        assetId: successor.canonicalNote.assetId,
        ownerPublicKey: successor.canonicalNote.ownerPublicKey,
        liveNoteId: successor.liveNoteId,
        liveStateSignature: successor.liveStateSignature,
      })),
    }))
    .sort((left, right) => right.createdAt - left.createdAt);
}

async function createSuccessorRecord(args: {
  amountDisplay: string;
  createdAt: number;
  kind: "recipient" | "change";
  lineageId: string;
  predecessorLifecycleId?: string;
  liveNoteId?: string;
  liveStateSignature?: string;
  mintAddress: string;
  ownerContext: CanonicalNoteOwnerContext;
  ownerPublicKey: string;
  recordId: string;
  tokenDecimals: number;
  transitionNoteId: string;
  transitionSignature: string;
}): Promise<LiveSendCanonicalSuccessorRecord> {
  const canonicalNote = createCanonicalNote({
    assetId: createCanonicalAssetId(args.mintAddress),
    amount: decimalAmountToBaseUnits(args.amountDisplay, args.tokenDecimals),
    ownerPublicKey: args.ownerPublicKey,
    creationHint: {
      sourceKind: "send",
      sourceAssetHint: "VUSD",
      sourceTxSignatureHint: args.transitionSignature,
      sourceTransitionIdHint: args.transitionNoteId,
    },
  });
  const artifacts = await deriveCanonicalNoteArtifacts(canonicalNote, args.ownerContext);
  const insertion = await insertCommitmentIntoCanonicalShieldedState(artifacts.commitment);

  return {
    kind: args.kind,
    amountDisplay: args.amountDisplay,
    canonicalNote: toSerializedCanonicalNote(canonicalNote),
    artifacts,
    insertion: {
      index: insertion.index,
      root: insertion.snapshot.root.value,
      leafCount: insertion.snapshot.leafCount,
    },
    liveNoteId: args.liveNoteId,
    liveStateSignature: args.liveStateSignature,
    lifecycle: {
      lifecycleId: createCanonicalLifecycleNodeId("send", args.recordId, args.kind),
      lineageId: args.lineageId,
      predecessorLifecycleId: args.predecessorLifecycleId,
      branchRole: args.kind,
    },
  };
}

function resolveCanonicalPredecessorReference(
  liveNoteId: string,
  liveStateSignature: string,
): CanonicalPredecessorReference {
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
): Promise<ShieldedCommitmentInsertionRecord> {
  const state = AppendOnlyShieldedState.empty();

  for (const record of listCanonicalShieldRecords()) {
    await state.insertCommitment(record.artifacts.commitment);
  }

  for (const record of listCanonicalSendRecords()) {
    for (const successor of record.successors) {
      await state.insertCommitment(successor.artifacts.commitment);
    }
  }

  return state.insertCommitment(commitment);
}

function persistCanonicalSendRecord(record: LiveSendCanonicalRecord) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const nextRecords = [...listCanonicalSendRecords(), record];
  storage.setItem(LIVE_SEND_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords));
}

function createOwnerContext(owner: string, mintAddress: string, vaultOwner: string): CanonicalNoteOwnerContext {
  return {
    ownerPublicKey: owner,
    recoverySecret: randomHex32(),
    derivationContext: `send:${mintAddress}:${vaultOwner}`,
  };
}

function createCanonicalAssetId(mintAddress: string) {
  return `solana:mint:${mintAddress}`;
}

function resolveTokenDecimals(value: number | undefined) {
  return Number.isInteger(value) && value !== undefined && value >= 0
    ? value
    : DEFAULT_VUSD_DECIMALS;
}

function decimalAmountToBaseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid decimal send amount: ${value}`);
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

function isLiveSendCanonicalRecord(value: unknown): value is LiveSendCanonicalRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<LiveSendCanonicalRecord>;
  return (
    typeof record.recordId === "string" &&
    record.source === "live_send_v1" &&
    typeof record.createdAt === "number" &&
    typeof record.liveSend === "object" &&
    record.liveSend !== null &&
    typeof record.predecessor === "object" &&
    record.predecessor !== null &&
    Array.isArray(record.successors)
  );
}
