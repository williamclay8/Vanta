import { listCanonicalSendRecords } from "./liveSendBridge";
import { listCanonicalShieldRecords } from "./liveShieldBridge";
import { listCanonicalSwapRecords } from "./liveSwapBridge";
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

const LIVE_UNSHIELD_RECORDS_STORAGE_KEY = "vanta.zk.phase1.live-unshield-records.v1";

export type LiveUnshieldCanonicalizationInput = {
  asset: "VUSD" | "SOL";
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
  liveNoteId: string;
  liveStateSignature: string;
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
    asset: "VUSD" | "SOL";
    assetId: string;
    consumedNoteId: string;
    consumedStateSignature: string;
    destinationOwner: string;
    mintAddress?: string;
    operatorReleaseSignature?: string;
    operatorRequestId?: string;
    owner: string;
    sourceSwapNoteId?: string;
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
};

export type LiveUnshieldDiagnosticsSummary = {
  recordId: string;
  createdAt: number;
  lifecycleRecordId?: string;
  lineageId?: string;
  asset: "VUSD" | "SOL";
  amountDisplay: string;
  consumedLiveNoteId: string;
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
  sourceSwapNoteId?: string;
  spentMarkerSignature?: string;
  transitionSignature: string;
  transitionNoteId: string;
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
      consumedNoteId: input.consumed.noteId,
      consumedStateSignature: input.consumed.stateSignature,
      destinationOwner: input.destinationOwner,
      mintAddress: input.mintAddress,
      operatorReleaseSignature: input.operator?.releaseSignature,
      operatorRequestId: input.operator?.requestId,
      owner: input.owner,
      sourceSwapNoteId: input.consumed.sourceSwapNoteId,
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

    return parsed.filter(isLiveUnshieldCanonicalRecord);
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
      consumedLiveNoteId: record.liveUnshield.consumedNoteId,
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
      sourceSwapNoteId: record.liveUnshield.sourceSwapNoteId,
      spentMarkerSignature: record.liveUnshield.spentMarkerSignature,
      transitionSignature: record.liveUnshield.transitionSignature,
      transitionNoteId: record.liveUnshield.transitionNoteId,
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

  for (const record of listCanonicalSwapRecords()) {
    if (
      record.outputSuccessor.liveNoteId === liveNoteId ||
      record.outputSuccessor.liveStateSignature === liveStateSignature
    ) {
      return {
        liveNoteId,
        liveStateSignature,
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
    liveNoteId,
    liveStateSignature,
    lifecycle: {
      resolution: "unresolved",
    },
  };
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
