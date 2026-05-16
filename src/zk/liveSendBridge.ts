import {
import { getCurrentRoot, fetchOperatorRoot } from "./indexerClient";
const USE_INDEXER = import.meta.env.VITE_USE_INDEXER === "true";

async function getRootForliveSendBridge() {
  if (USE_INDEXER) {
    try {
      const root = await getCurrentRoot(USE_INDEXER);
      if (root) return root;
    } catch (e) {
      console.warn("[liveSendBridge] Indexer failed, falling back to operator");
    }
  }
  return await fetchOperatorRoot();
}
}
import { getCurrentRoot } from "./indexerClient";
}
  createCanonicalNote,
  deriveCanonicalNoteArtifacts,
  type CanonicalNoteArtifacts,
  type CanonicalNoteOwnerContext,
  type SerializedCanonicalNoteV1,
  toSerializedCanonicalNote,
} from "./canonicalNote";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { CanonicalNullifierBasis } from "./canonicalNote";
import {
  createCanonicalConsumptionRecord,
  type CanonicalLifecycleConsumptionRecord,
} from "./canonicalConsumption";
import {
  AppendOnlyShieldedState,
  PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC,
  type PrivatePoolV2ShieldedStateDiagnostic,
  type ShieldedCommitmentInsertionRecord,
} from "./shieldedState";
import {
  createCanonicalLifecycleNodeId,
  createCanonicalLifecycleRecordId,
  createCanonicalLineageId,
  type CanonicalLifecycleLinkReference,
  type CanonicalLifecycleOutputLinkage,
  type CanonicalLifecycleRecordLinkage,
} from "./canonicalLifecycleLinkage";
import { listCanonicalShieldRecords } from "./liveShieldBridge";
import {
  createOwnerContextRecoveryEvidence,
  type OwnerContextRecoveryEvidence,
} from "./ownerContextRecoveryEvidence";

const LIVE_SEND_RECORDS_STORAGE_KEY = "vanta.zk.phase1.live-send-records.v1";
const DEFAULT_USDC_DECIMALS = 6;

export type LiveSendCanonicalizationInput = {
  assetSymbol: "USDC";
  mintAddress: string;
  owner: string;
  vaultOwner: string;
  createdAt: number;
  recipient: string;
  sentAmountDisplay: string;
  changeAmountDisplay: string;
  ownerContext: CanonicalNoteOwnerContext;
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

type LiveSendSuccessorArtifacts = {
  commitment: CanonicalNoteArtifacts["commitment"];
  provingCommitment: CanonicalNoteArtifacts["provingCommitment"];
  encryptedPayload?: CanonicalNoteArtifacts["encryptedPayload"];
  encryptedPayloadCommitment?: string;
  nullifierBasis: CanonicalNoteArtifacts["nullifierBasis"];
};

export type LiveSendCanonicalSuccessorRecord = {
  kind: "recipient" | "change";
  amountDisplay: string;
  canonicalNote?: SerializedCanonicalNoteV1;
  redactedCanonicalNote?: {
    amountCommitment: string;
    assetIdCommitment: string;
    ownerPublicKeyCommitment: string;
  };
  artifacts: LiveSendSuccessorArtifacts;
  ownerContextEvidence?: OwnerContextRecoveryEvidence;
  insertion: {
    index: number;
    root: string;
    leafCount: number;
  };
  liveNoteId?: string;
  liveNoteReferenceHash?: string;
  liveStateSignature?: string;
  liveStateSignatureHash?: string;
  lifecycle?: CanonicalLifecycleOutputLinkage;
};

export type LiveSendCanonicalRecord = {
  recordId: string;
  source: "live_send_v1";
  createdAt: number;
  lifecycleLinkage?: CanonicalLifecycleRecordLinkage;
  liveSend: {
    assetSymbol: "USDC";
    mintAddress: string;
    owner?: string;
    ownerReferenceHash?: string;
    vaultOwner?: string;
    vaultOwnerReferenceHash?: string;
    recipient?: string;
    redactedRecipientReference?: string;
    sentAmountDisplay?: string;
    sentAmountCommitment?: string;
    changeAmountDisplay?: string;
    changeAmountCommitment?: string;
    tokenDecimals: number;
    predecessorNoteId?: string;
    predecessorNoteReferenceHash?: string;
    predecessorStateSignature?: string;
    predecessorStateSignatureHash?: string;
    transitionNoteId?: string;
    transitionNoteReferenceHash?: string;
    transitionSignature: string;
    spentMarkerSignature?: string;
  };
  predecessor: CanonicalPredecessorReference;
  consumption?: CanonicalLifecycleConsumptionRecord;
  ownerContextEvidence?: OwnerContextRecoveryEvidence;
  successors: LiveSendCanonicalSuccessorRecord[];
  diagnosticStorage: PrivatePoolV2ShieldedStateDiagnostic;
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
  storageRole: PrivatePoolV2ShieldedStateDiagnostic["storageRole"];
  privacyPrimitive: false;
  ownerRecoveryClass: OwnerContextRecoveryEvidence["recoveryClass"];
  ownerRecoveryEvidenceSource: OwnerContextRecoveryEvidence["evidenceSource"];
  ownerRecoveryCrossDeviceCandidate: boolean;
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
    ownerRecoveryClass: OwnerContextRecoveryEvidence["recoveryClass"];
    ownerRecoveryEvidenceSource: OwnerContextRecoveryEvidence["evidenceSource"];
    ownerRecoveryCrossDeviceCandidate: boolean;
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

  const ownerContext = input.ownerContext;
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
      assetSymbol: "USDC",
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
    ownerContextEvidence: createOwnerContextRecoveryEvidence({ ownerContext }),
    successors,
    diagnosticStorage: PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC,
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

    const records = parsed.filter(isLiveSendCanonicalRecord);
    const redactedRecords = records.map(redactLiveSendRecordForPersistence);

    if (JSON.stringify(records) !== JSON.stringify(redactedRecords)) {
      storage.setItem(LIVE_SEND_RECORDS_STORAGE_KEY, JSON.stringify(redactedRecords));
    }

    return redactedRecords;
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
      storageRole:
        record.diagnosticStorage?.storageRole ??
        PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC.storageRole,
      privacyPrimitive: false as const,
      ownerRecoveryClass:
        record.ownerContextEvidence?.recoveryClass ??
        createOwnerContextRecoveryEvidence({}).recoveryClass,
      ownerRecoveryEvidenceSource:
        record.ownerContextEvidence?.evidenceSource ??
        createOwnerContextRecoveryEvidence({}).evidenceSource,
      ownerRecoveryCrossDeviceCandidate:
        record.ownerContextEvidence?.crossDeviceCandidate ??
        createOwnerContextRecoveryEvidence({}).crossDeviceCandidate,
      recipient: record.liveSend.recipient ?? record.liveSend.redactedRecipientReference ?? "redacted",
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
        assetId:
          successor.canonicalNote?.assetId ??
          successor.redactedCanonicalNote?.assetIdCommitment ??
          "redacted",
        ownerPublicKey:
          successor.canonicalNote?.ownerPublicKey ??
          successor.redactedCanonicalNote?.ownerPublicKeyCommitment ??
          "redacted",
        ownerRecoveryClass:
          successor.ownerContextEvidence?.recoveryClass ??
          createOwnerContextRecoveryEvidence({}).recoveryClass,
        ownerRecoveryEvidenceSource:
          successor.ownerContextEvidence?.evidenceSource ??
          createOwnerContextRecoveryEvidence({}).evidenceSource,
        ownerRecoveryCrossDeviceCandidate:
          successor.ownerContextEvidence?.crossDeviceCandidate ??
          createOwnerContextRecoveryEvidence({}).crossDeviceCandidate,
        liveNoteId: successor.liveNoteId ?? successor.liveNoteReferenceHash,
        liveStateSignature: successor.liveStateSignature ?? successor.liveStateSignatureHash,
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
      sourceAssetHint: "USDC",
      sourceTxSignatureHint: args.transitionSignature,
      sourceTransitionIdHint: args.transitionNoteId,
    },
  });
  const artifacts = await deriveCanonicalNoteArtifacts(canonicalNote, args.ownerContext);
  const insertion = await insertCommitmentIntoCanonicalShieldedState(artifacts.commitment);
  const serializedCanonicalNote = toSerializedCanonicalNote(canonicalNote);

  return {
    kind: args.kind,
    amountDisplay: args.amountDisplay,
    canonicalNote: serializedCanonicalNote,
    artifacts,
    ownerContextEvidence: createOwnerContextRecoveryEvidence({
      ownerContext: args.ownerContext,
    }),
    insertion: {
      index: insertion.index,
    const currentRoot = await getCurrentRoot();
}
    if (currentRoot) console.log("[Send] Using root from indexer:", currentRoot.merkleRoot);
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

  const predecessorNoteReferenceHash = redactLiveSendReference("predecessor-note-id", liveNoteId);
  const predecessorStateSignatureHash = redactLiveSendReference(
    "predecessor-state-signature",
    liveStateSignature,
  );

  for (const record of listCanonicalSendRecords()) {
    const successorMatch = record.successors.find(
      (successor) =>
        successor.liveNoteId === liveNoteId ||
        successor.liveStateSignature === liveStateSignature ||
        successor.liveNoteReferenceHash === predecessorNoteReferenceHash ||
        successor.liveStateSignatureHash === predecessorStateSignatureHash,
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

  const nextRecords = [
    ...listCanonicalSendRecords().map(redactLiveSendRecordForPersistence),
    redactLiveSendRecordForPersistence(record),
  ];
  storage.setItem(LIVE_SEND_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords));
}

function redactLiveSendRecordForPersistence(record: LiveSendCanonicalRecord): LiveSendCanonicalRecord {
  return {
    recordId: record.recordId,
    source: record.source,
    createdAt: record.createdAt,
    lifecycleLinkage: record.lifecycleLinkage
      ? {
          recordLifecycleId: redactLiveSendReference(
            "lifecycle-record-id",
            record.lifecycleLinkage.recordLifecycleId,
          ),
          lineageId: redactLiveSendReference("lifecycle-lineage-id", record.lifecycleLinkage.lineageId),
          predecessorLifecycleId: redactLiveSendReference(
            "lifecycle-predecessor-id",
            record.lifecycleLinkage.predecessorLifecycleId,
          ),
          outputLifecycleIds: record.lifecycleLinkage.outputLifecycleIds.map((outputLifecycleId) =>
            redactLiveSendReference("lifecycle-output-id", outputLifecycleId),
          ),
          endpointLifecycleId: record.lifecycleLinkage.endpointLifecycleId
            ? redactLiveSendReference(
                "lifecycle-endpoint-id",
                record.lifecycleLinkage.endpointLifecycleId,
              )
            : undefined,
        }
      : undefined,
    liveSend: {
      assetSymbol: record.liveSend.assetSymbol,
      mintAddress: record.liveSend.mintAddress,
      ownerReferenceHash: redactLiveSendHeldOutValue("owner"),
      vaultOwnerReferenceHash: redactLiveSendHeldOutValue("vault-owner"),
      redactedRecipientReference: redactLiveSendHeldOutValue("recipient"),
      sentAmountCommitment: redactLiveSendHeldOutValue("sent-amount"),
      changeAmountCommitment: redactLiveSendHeldOutValue("change-amount"),
      tokenDecimals: record.liveSend.tokenDecimals,
      predecessorNoteReferenceHash: redactLiveSendReference(
        "predecessor-note-id",
        record.liveSend.predecessorNoteId ?? record.liveSend.predecessorNoteReferenceHash,
      ),
      predecessorStateSignatureHash: redactLiveSendReference(
        "predecessor-state-signature",
        record.liveSend.predecessorStateSignature ?? record.liveSend.predecessorStateSignatureHash,
      ),
      transitionNoteReferenceHash: redactLiveSendReference(
        "transition-note-id",
        record.liveSend.transitionNoteId ?? record.liveSend.transitionNoteReferenceHash,
      ),
      transitionSignature: record.liveSend.transitionSignature,
      spentMarkerSignature: record.liveSend.spentMarkerSignature,
    },
    predecessor: {
      liveNoteId: redactLiveSendReference("predecessor-note-id", record.predecessor.liveNoteId),
      liveStateSignature: redactLiveSendReference(
        "predecessor-state-signature",
        record.predecessor.liveStateSignature,
      ),
      canonicalCommitment: record.predecessor.canonicalCommitment,
      canonicalRecordSource: record.predecessor.canonicalRecordSource,
      lifecycle: record.predecessor.lifecycle
        ? {
            lifecycleId: redactLiveSendReference(
              "predecessor-lifecycle-id",
              record.predecessor.lifecycle.lifecycleId,
            ),
            lineageId: redactLiveSendReference(
              "predecessor-lineage-id",
              record.predecessor.lifecycle.lineageId,
            ),
            resolution: record.predecessor.lifecycle.resolution,
          }
        : undefined,
      nullifierBasis: record.predecessor.nullifierBasis,
    },
    ownerContextEvidence: createOwnerContextRecoveryEvidence({
      existingEvidence: record.ownerContextEvidence,
    }),
    successors: record.successors.map(redactLiveSendSuccessorForPersistence),
    diagnosticStorage:
      record.diagnosticStorage ?? PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC,
  };
}

function redactLiveSendSuccessorForPersistence(
  successor: LiveSendCanonicalSuccessorRecord,
): LiveSendCanonicalSuccessorRecord {
  return {
    kind: successor.kind,
    amountDisplay: "committed",
    redactedCanonicalNote: successor.canonicalNote
      ? {
          amountCommitment: redactLiveSendHeldOutValue("successor-amount"),
          assetIdCommitment: redactLiveSendReference("successor-asset-id", successor.canonicalNote.assetId),
          ownerPublicKeyCommitment: redactLiveSendHeldOutValue("successor-owner-public-key"),
        }
      : successor.redactedCanonicalNote,
    artifacts: redactLiveSendArtifactsForPersistence(successor.artifacts),
    ownerContextEvidence: createOwnerContextRecoveryEvidence({
      existingEvidence: successor.ownerContextEvidence,
    }),
    insertion: successor.insertion,
    liveNoteReferenceHash: redactLiveSendReference(
      "predecessor-note-id",
      successor.liveNoteId ?? successor.liveNoteReferenceHash,
    ),
    liveStateSignatureHash: redactLiveSendReference(
      "predecessor-state-signature",
      successor.liveStateSignature ?? successor.liveStateSignatureHash,
    ),
    lifecycle: successor.lifecycle
      ? {
          lifecycleId: redactLiveSendReference(
            "successor-lifecycle-id",
            successor.lifecycle.lifecycleId,
          ),
          lineageId: redactLiveSendReference("successor-lineage-id", successor.lifecycle.lineageId),
          predecessorLifecycleId: redactLiveSendReference(
            "successor-predecessor-lifecycle-id",
            successor.lifecycle.predecessorLifecycleId,
          ),
          branchRole: successor.lifecycle.branchRole,
        }
      : undefined,
  };
}

function redactLiveSendReference(domain: string, value: string | undefined) {
  if (value?.startsWith("sha256:")) {
    return value;
  }

  return `sha256:${bytesToHex(
    sha256(new TextEncoder().encode(`vanta-live-send-redaction:${domain}:${value ?? "unset"}`)),
  )}`;
}

function redactLiveSendHeldOutValue(domain: string) {
  return `redacted:${domain}:held-out-of-browser-storage`;
}

function redactLiveSendArtifactsForPersistence(
  artifacts: LiveSendSuccessorArtifacts,
): LiveSendSuccessorArtifacts {
  return {
    commitment: artifacts.commitment,
    provingCommitment: artifacts.provingCommitment,
    encryptedPayloadCommitment:
      artifacts.encryptedPayloadCommitment ??
      "redacted:encrypted-payload:held-out-of-browser-storage",
    nullifierBasis: artifacts.nullifierBasis,
  };
}

function createCanonicalAssetId(mintAddress: string) {
  return `solana:mint:${mintAddress}`;
}

function resolveTokenDecimals(value: number | undefined) {
  return Number.isInteger(value) && value !== undefined && value >= 0
    ? value
    : DEFAULT_USDC_DECIMALS;
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
