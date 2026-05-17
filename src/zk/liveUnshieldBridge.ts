import { listCanonicalSendRecords } from "./liveSendBridge";
import { listCanonicalShieldRecords } from "./liveShieldBridge";
import { listCanonicalSwapRecords } from "./liveSwapBridge";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { CanonicalNullifierBasis } from "./canonicalNote";
import {
  createCanonicalConsumptionRecord,
  type CanonicalLifecycleConsumptionRecord,
} from "./canonicalConsumption";
import {
  createCanonicalLifecycleNodeId,
  createCanonicalLifecycleRecordId,
  createCanonicalLineageId,
  type CanonicalLifecycleLinkReference,
  type CanonicalLifecycleRecordLinkage,
} from "./canonicalLifecycleLinkage";
import {
  PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC,
  type PrivatePoolV2ShieldedStateDiagnostic,
} from "./shieldedState";
import type { LiveShieldTokenAssetKey } from "@/solana/shieldConfig";

const LIVE_UNSHIELD_RECORDS_STORAGE_KEY = "vanta.zk.phase1.live-unshield-records.v1";

type LiveUnshieldAsset = LiveShieldTokenAssetKey | "SOL";

export type LiveUnshieldCanonicalizationInput = {
  asset: LiveUnshieldAsset;
  assetId: string;
  amountDisplay: string;
  createdAt: number;
  destinationOwner: string;
  owner: string;
  vaultOwner: string;
  mintAddress?: string;
  consumed: {
    noteId: string;
    stateSignature: string;
    sourceSwapNoteId?: string;
  };
  transition: {
    noteId: string;
    signature: string;
    spentMarkerSignature?: string;
  };
  operator?: {
    requestId?: string;
    releaseSignature?: string;
  };
};

export type CanonicalConsumedReference = {
  liveNoteReferenceHash: string;
  liveStateSignatureHash: string;
  canonicalCommitment?: string;
  canonicalRecordSource?: "live_shield_v1" | "live_send_v1" | "live_swap_v1";
  lifecycle?: CanonicalLifecycleLinkReference;
  nullifierBasis?: CanonicalNullifierBasis;
};

export type LiveUnshieldCanonicalRecord = {
  recordId: string;
  source: "live_unshield_v1";
  createdAt: number;
  lifecycleLinkage?: CanonicalLifecycleRecordLinkage;
  liveUnshield: {
    amountDisplay: string;
    asset: LiveUnshieldAsset;
    assetId: string;
    consumedNoteReferenceHash: string;
    consumedStateSignatureHash: string;
    destinationOwner: string;
    mintAddress?: string;
    operatorReleaseSignature?: string;
    operatorRequestId?: string;
    owner: string;
    sourceSwapNoteReferenceHash?: string;
    spentMarkerSignature?: string;
    transitionNoteId: string;
    transitionSignature: string;
    vaultOwner: string;
  };
  consumed: CanonicalConsumedReference;
  consumption?: CanonicalLifecycleConsumptionRecord;
  lifecycleEndpoint: {
    kind: "public_exit";
    resolution: "canonical_reference_resolved" | "canonical_reference_unresolved";
  };
  diagnosticStorage: PrivatePoolV2ShieldedStateDiagnostic;
};

export type LiveUnshieldDiagnosticsSummary = {
  recordId: string;
  createdAt: number;
  lifecycleRecordId?: string;
  lineageId?: string;
  asset: LiveUnshieldAsset;
  amountDisplay: string;
  consumedReferenceHash: string;
  consumedCanonicalCommitment?: string;
  consumedCanonicalRecordSource?: "live_shield_v1" | "live_send_v1" | "live_swap_v1";
  consumedLifecycleId?: string;
  consumedLifecycleLineageId?: string;
  consumedLinkResolution?: CanonicalLifecycleLinkReference["resolution"];
  canonicalConsumptionId?: string;
  canonicalConsumptionKind?: CanonicalLifecycleConsumptionRecord["consumptionKind"];
  canonicalConsumptionBasis?: string;
  canonicalNullifierStub?: string;
  endpointLifecycleId?: string;
  destinationOwner: string;
  operatorReleaseSignature?: string;
  operatorRequestId?: string;
  sourceSwapNoteReferenceHash?: string;
  spentMarkerSignature?: string;
  transitionSignature: string;
  transitionNoteId: string;
  storageRole: PrivatePoolV2ShieldedStateDiagnostic["storageRole"];
  privacyPrimitive: false;
};

export async function recordCanonicalUnshieldFromLiveUnshield(
  input: LiveUnshieldCanonicalizationInput,
): Promise<LiveUnshieldCanonicalRecord> {
  const existing = listCanonicalUnshieldRecords().find(
    (record) => record.liveUnshield.transitionSignature === input.transition.signature,
  );

  if (existing) {
    return existing;
  }

  const consumed = resolveCanonicalConsumedReference(
    input.consumed.noteId,
    input.consumed.stateSignature,
  );
  const consumedNoteReferenceHash = redactLiveUnshieldReference(
    "consumed-note-id",
    input.consumed.noteId,
  );
  const consumedStateSignatureHash = redactLiveUnshieldReference(
    "consumed-state-signature",
    input.consumed.stateSignature,
  );
  const recordLifecycleId = createCanonicalLifecycleRecordId("unshield", input.transition.signature);
  const lineageId = consumed.lifecycle?.lineageId ?? createCanonicalLineageId(recordLifecycleId);
  const consumedLifecycleId = consumed.lifecycle?.lifecycleId;
  const endpointLifecycleId = createCanonicalLifecycleNodeId("unshield", input.transition.signature, "exit");
  const consumption =
    consumedLifecycleId && consumed.nullifierBasis
      ? await createCanonicalConsumptionRecord({
          recordLifecycleId,
          lineageId,
          consumedLifecycleId,
          consumptionKind: "unshield",
          consumedNullifierBasis: consumed.nullifierBasis,
          producedLifecycleIds: [],
          exitLifecycleId: endpointLifecycleId,
        })
      : undefined;

  const record: LiveUnshieldCanonicalRecord = {
    recordId: input.transition.signature,
    source: "live_unshield_v1",
    createdAt: input.createdAt,
    lifecycleLinkage: {
      recordLifecycleId,
      lineageId,
      predecessorLifecycleId: consumedLifecycleId,
      outputLifecycleIds: [],
      endpointLifecycleId,
    },
    liveUnshield: {
      amountDisplay: input.amountDisplay,
      asset: input.asset,
      assetId: input.assetId,
      consumedNoteReferenceHash,
      consumedStateSignatureHash,
      destinationOwner: input.destinationOwner,
      mintAddress: input.mintAddress,
      operatorReleaseSignature: input.operator?.releaseSignature,
      operatorRequestId: input.operator?.requestId,
      owner: input.owner,
      sourceSwapNoteReferenceHash: input.consumed.sourceSwapNoteId
        ? redactLiveUnshieldReference("source-swap-note-id", input.consumed.sourceSwapNoteId)
        : undefined,
      spentMarkerSignature: input.transition.spentMarkerSignature,
      transitionNoteId: input.transition.noteId,
      transitionSignature: input.transition.signature,
      vaultOwner: input.vaultOwner,
    },
    consumed,
    consumption,
    lifecycleEndpoint: {
      kind: "public_exit",
      resolution: consumed.canonicalCommitment
        ? "canonical_reference_resolved"
        : "canonical_reference_unresolved",
    },
    diagnosticStorage: PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC,
  };

  persistCanonicalUnshieldRecord(record);
  return record;
}

export function listCanonicalUnshieldRecords(): LiveUnshieldCanonicalRecord[] {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(LIVE_UNSHIELD_RECORDS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeLiveUnshieldCanonicalRecord)
      .filter((record): record is LiveUnshieldCanonicalRecord => record !== null);
  } catch {
    return [];
  }
}

export function listCanonicalUnshieldDiagnosticsSummaries(): LiveUnshieldDiagnosticsSummary[] {
  return listCanonicalUnshieldRecords()
    .map((record) => ({
      recordId: record.recordId,
      createdAt: record.createdAt,
      lifecycleRecordId: record.lifecycleLinkage?.recordLifecycleId,
      lineageId: record.lifecycleLinkage?.lineageId,
      asset: record.liveUnshield.asset,
      amountDisplay: record.liveUnshield.amountDisplay,
      consumedReferenceHash: record.liveUnshield.consumedNoteReferenceHash,
      consumedCanonicalCommitment: record.consumed.canonicalCommitment,
      consumedCanonicalRecordSource: record.consumed.canonicalRecordSource,
      consumedLifecycleId: record.consumed.lifecycle?.lifecycleId,
      consumedLifecycleLineageId: record.consumed.lifecycle?.lineageId,
      consumedLinkResolution: record.consumed.lifecycle?.resolution,
      canonicalConsumptionId: record.consumption?.consumptionId,
      canonicalConsumptionKind: record.consumption?.consumptionKind,
      canonicalConsumptionBasis: record.consumption?.consumptionBasis.value,
      canonicalNullifierStub: record.consumption?.nullifierStub.value,
      endpointLifecycleId: record.lifecycleLinkage?.endpointLifecycleId,
      destinationOwner: record.liveUnshield.destinationOwner,
      operatorReleaseSignature: record.liveUnshield.operatorReleaseSignature,
      operatorRequestId: record.liveUnshield.operatorRequestId,
      sourceSwapNoteReferenceHash: record.liveUnshield.sourceSwapNoteReferenceHash,
      spentMarkerSignature: record.liveUnshield.spentMarkerSignature,
      transitionSignature: record.liveUnshield.transitionSignature,
      transitionNoteId: record.liveUnshield.transitionNoteId,
      storageRole:
        record.diagnosticStorage?.storageRole ??
        PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC.storageRole,
      privacyPrimitive: false as const,
    }))
    .sort((left, right) => right.createdAt - left.createdAt);
}

function resolveCanonicalConsumedReference(
  liveNoteId: string,
  liveStateSignature: string,
): CanonicalConsumedReference {
  const shieldMatch = listCanonicalShieldRecords().find(
    (record) => record.recordId === liveStateSignature || record.liveShield.stateSignature === liveStateSignature,
  );
  const liveNoteReferenceHash = redactLiveUnshieldReference("consumed-note-id", liveNoteId);
  const liveStateSignatureHash = redactLiveUnshieldReference(
    "consumed-state-signature",
    liveStateSignature,
  );

  if (shieldMatch) {
    return {
      liveNoteReferenceHash,
      liveStateSignatureHash,
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
        liveNoteReferenceHash,
        liveStateSignatureHash,
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

  for (const record of listCanonicalSwapRecords()) {
    if (
      record.outputSuccessor.liveNoteId === liveNoteId ||
      record.outputSuccessor.liveStateSignature === liveStateSignature
    ) {
      return {
        liveNoteReferenceHash,
        liveStateSignatureHash,
        canonicalCommitment: record.outputSuccessor.artifacts.commitment.value,
        canonicalRecordSource: "live_swap_v1",
        lifecycle: record.outputSuccessor.lifecycle
          ? {
              lifecycleId: record.outputSuccessor.lifecycle.lifecycleId,
              lineageId: record.outputSuccessor.lifecycle.lineageId,
              resolution: "explicit",
            }
          : {
              resolution: "canonical",
            },
        nullifierBasis: record.outputSuccessor.artifacts.nullifierBasis,
      };
    }
  }

  return {
    liveNoteReferenceHash,
    liveStateSignatureHash,
    lifecycle: {
      resolution: "unresolved",
    },
  };
}

function redactLiveUnshieldReference(label: string, value: string) {
  return `sha256:${bytesToHex(
    sha256(new TextEncoder().encode(`vanta-live-unshield-${label}-v1:${value}`)),
  )}`;
}

function persistCanonicalUnshieldRecord(record: LiveUnshieldCanonicalRecord) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const nextRecords = [...listCanonicalUnshieldRecords(), record];
  storage.setItem(LIVE_UNSHIELD_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords));
}

function getStorage(): Storage | null {
  if (typeof globalThis !== "object" || globalThis === null) {
    return null;
  }

  return globalThis.localStorage ?? null;
}

function normalizeLiveUnshieldCanonicalRecord(value: unknown): LiveUnshieldCanonicalRecord | null {
  if (!isLiveUnshieldCanonicalRecord(value)) {
    return null;
  }

  const legacyLiveUnshield = value.liveUnshield as typeof value.liveUnshield & {
    consumedNoteId?: string;
    consumedStateSignature?: string;
    sourceSwapNoteId?: string;
  };
  const legacyConsumed = value.consumed as typeof value.consumed & {
    liveNoteId?: string;
    liveStateSignature?: string;
  };
  const consumedNoteReferenceHash =
    value.liveUnshield.consumedNoteReferenceHash ??
    (typeof legacyLiveUnshield.consumedNoteId === "string"
      ? redactLiveUnshieldReference("consumed-note-id", legacyLiveUnshield.consumedNoteId)
      : legacyConsumed.liveNoteId
        ? redactLiveUnshieldReference("consumed-note-id", legacyConsumed.liveNoteId)
        : "sha256:unavailable");
  const consumedStateSignatureHash =
    value.liveUnshield.consumedStateSignatureHash ??
    (typeof legacyLiveUnshield.consumedStateSignature === "string"
      ? redactLiveUnshieldReference(
          "consumed-state-signature",
          legacyLiveUnshield.consumedStateSignature,
        )
      : legacyConsumed.liveStateSignature
        ? redactLiveUnshieldReference("consumed-state-signature", legacyConsumed.liveStateSignature)
        : "sha256:unavailable");

  return {
    ...value,
    liveUnshield: {
      amountDisplay: value.liveUnshield.amountDisplay,
      asset: value.liveUnshield.asset,
      assetId: value.liveUnshield.assetId,
      consumedNoteReferenceHash,
      consumedStateSignatureHash,
      destinationOwner: value.liveUnshield.destinationOwner,
      mintAddress: value.liveUnshield.mintAddress,
      operatorReleaseSignature: value.liveUnshield.operatorReleaseSignature,
      operatorRequestId: value.liveUnshield.operatorRequestId,
      owner: value.liveUnshield.owner,
      sourceSwapNoteReferenceHash:
        value.liveUnshield.sourceSwapNoteReferenceHash ??
        (typeof legacyLiveUnshield.sourceSwapNoteId === "string"
          ? redactLiveUnshieldReference("source-swap-note-id", legacyLiveUnshield.sourceSwapNoteId)
          : undefined),
      spentMarkerSignature: value.liveUnshield.spentMarkerSignature,
      transitionNoteId: value.liveUnshield.transitionNoteId,
      transitionSignature: value.liveUnshield.transitionSignature,
      vaultOwner: value.liveUnshield.vaultOwner,
    },
    consumed: {
      canonicalCommitment: value.consumed.canonicalCommitment,
      canonicalRecordSource: value.consumed.canonicalRecordSource,
      lifecycle: value.consumed.lifecycle,
      liveNoteReferenceHash:
        value.consumed.liveNoteReferenceHash ??
        (legacyConsumed.liveNoteId
          ? redactLiveUnshieldReference("consumed-note-id", legacyConsumed.liveNoteId)
          : consumedNoteReferenceHash),
      liveStateSignatureHash:
        value.consumed.liveStateSignatureHash ??
        (legacyConsumed.liveStateSignature
          ? redactLiveUnshieldReference(
              "consumed-state-signature",
              legacyConsumed.liveStateSignature,
            )
          : consumedStateSignatureHash),
      nullifierBasis: value.consumed.nullifierBasis,
    },
    diagnosticStorage:
      value.diagnosticStorage ?? PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC,
  };
}

function isLiveUnshieldCanonicalRecord(value: unknown): value is LiveUnshieldCanonicalRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<LiveUnshieldCanonicalRecord>;
  return (
    typeof record.recordId === "string" &&
    record.source === "live_unshield_v1" &&
    typeof record.createdAt === "number" &&
    typeof record.liveUnshield === "object" &&
    record.liveUnshield !== null &&
    typeof record.consumed === "object" &&
    record.consumed !== null &&
    typeof record.lifecycleEndpoint === "object" &&
    record.lifecycleEndpoint !== null
  );
}
