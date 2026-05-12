import {
  createCanonicalNote,
  deriveCanonicalEncryptedPayload,
  deriveCanonicalNoteArtifacts,
  type CanonicalEncryptedPayload,
  type CanonicalNoteArtifacts,
  type CanonicalNoteOwnerContext,
  type CanonicalNoteV1,
  type SerializedCanonicalNoteV1,
  toSerializedCanonicalNote,
} from "./canonicalNote";
import {
  AppendOnlyShieldedState,
  BROWSER_LOCAL_SHIELDED_STATE_DIAGNOSTIC,
  type BrowserLocalShieldedStateDiagnostic,
  type ShieldedCommitmentInsertionRecord,
  type ShieldedStateSnapshot,
} from "./shieldedState";
import {
  createCanonicalLifecycleNodeId,
  createCanonicalLifecycleRecordId,
  createCanonicalLineageId,
  type CanonicalLifecycleRecordLinkage,
} from "./canonicalLifecycleLinkage";
import type { LiveShieldTokenAssetKey } from "@/solana/shieldConfig";

const LIVE_SHIELD_RECORDS_STORAGE_KEY = "vanta.zk.phase1.live-shield-records.v1";
const DEFAULT_SHIELD_TOKEN_DECIMALS = 6;

export type LiveShieldCanonicalizationInput = {
  amountDisplay: string;
  amountNumeric: number;
  assetSymbol: LiveShieldTokenAssetKey;
  mintAddress: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
  createdAt: number;
  depositSignature?: string;
  tokenDecimals?: number;
};

export type LiveShieldCanonicalRecord = {
  recordId: string;
  source: "live_shield_v1";
  createdAt: number;
  lifecycleLinkage?: CanonicalLifecycleRecordLinkage;
  liveShield: {
    amountBaseUnits: string;
    amountDisplay: string;
    assetSymbol: LiveShieldTokenAssetKey;
    depositSignature?: string;
    mintAddress: string;
    owner: string;
    stateSignature: string;
    tokenDecimals: number;
    vaultOwner: string;
  };
  ownerContext: CanonicalNoteOwnerContext;
  canonicalNote: SerializedCanonicalNoteV1;
  artifacts: CanonicalNoteArtifacts;
  insertion: {
    index: number;
    root: string;
    leafCount: number;
  };
  diagnosticStorage: BrowserLocalShieldedStateDiagnostic;
};

export type LiveShieldCanonicalDiagnosticsSummary = {
  recordId: string;
  createdAt: number;
  lifecycleRecordId?: string;
  lineageId?: string;
  outputLifecycleId?: string;
  commitment: string;
  insertionIndex: number;
  snapshotRoot: string;
  snapshotLeafCount: number;
  assetSymbol: LiveShieldTokenAssetKey;
  assetId: string;
  amountBaseUnits: string;
  amountDisplay: string;
  ownerPublicKey: string;
  creationHintSummary: string;
  depositSignature?: string;
  stateSignature: string;
  storageRole: BrowserLocalShieldedStateDiagnostic["storageRole"];
  privacyPrimitive: false;
};

export async function recordCanonicalShieldFromLiveShield(
  input: LiveShieldCanonicalizationInput,
): Promise<LiveShieldCanonicalRecord> {
  const existing = listCanonicalShieldRecords().find(
    (record) => record.liveShield.stateSignature === input.stateSignature,
  );

  if (existing) {
    return existing;
  }

  const ownerContext = createOwnerContext(input);
  const canonicalNote = createCanonicalShieldNote(input, ownerContext);
  const artifacts = await deriveCanonicalNoteArtifacts(canonicalNote, ownerContext);
  const insertion = await insertCommitmentIntoCanonicalShieldedState(artifacts.commitment);

  const record: LiveShieldCanonicalRecord = {
    recordId: input.stateSignature,
    source: "live_shield_v1",
    createdAt: input.createdAt,
    lifecycleLinkage: (() => {
      const outputLifecycleId = createCanonicalLifecycleNodeId("shield", input.stateSignature, "origin");
      return {
        recordLifecycleId: createCanonicalLifecycleRecordId("shield", input.stateSignature),
        lineageId: createCanonicalLineageId(outputLifecycleId),
        outputLifecycleIds: [outputLifecycleId],
      };
    })(),
    liveShield: {
      amountBaseUnits: canonicalNote.amount.toString(10),
      amountDisplay: input.amountDisplay,
      assetSymbol: input.assetSymbol,
      depositSignature: input.depositSignature,
      mintAddress: input.mintAddress,
      owner: input.owner,
      stateSignature: input.stateSignature,
      tokenDecimals: resolveTokenDecimals(input.tokenDecimals),
      vaultOwner: input.vaultOwner,
    },
    ownerContext,
    canonicalNote: toSerializedCanonicalNote(canonicalNote),
    artifacts,
    insertion: {
      index: insertion.index,
      root: insertion.snapshot.root.value,
      leafCount: insertion.snapshot.leafCount,
    },
    diagnosticStorage: BROWSER_LOCAL_SHIELDED_STATE_DIAGNOSTIC,
  };

  persistCanonicalShieldRecord(record);
  return record;
}

export function listCanonicalShieldRecords(): LiveShieldCanonicalRecord[] {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(LIVE_SHIELD_RECORDS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isLiveShieldCanonicalRecord);
  } catch {
    return [];
  }
}

export function listCanonicalShieldDiagnosticsSummaries(): LiveShieldCanonicalDiagnosticsSummary[] {
  return listCanonicalShieldRecords()
    .map((record) => ({
      recordId: record.recordId,
      createdAt: record.createdAt,
      lifecycleRecordId: record.lifecycleLinkage?.recordLifecycleId,
      lineageId: record.lifecycleLinkage?.lineageId,
      outputLifecycleId: record.lifecycleLinkage?.outputLifecycleIds[0],
      commitment: record.artifacts.commitment.value,
      insertionIndex: record.insertion.index,
      snapshotRoot: record.insertion.root,
      snapshotLeafCount: record.insertion.leafCount,
      assetSymbol: record.liveShield.assetSymbol,
      assetId: record.canonicalNote.assetId,
      amountBaseUnits: record.canonicalNote.amount,
      amountDisplay: record.liveShield.amountDisplay,
      ownerPublicKey: record.canonicalNote.ownerPublicKey,
      creationHintSummary: formatCreationHintSummary(record.canonicalNote.creationHint),
      depositSignature: record.liveShield.depositSignature,
      stateSignature: record.liveShield.stateSignature,
      storageRole:
        record.diagnosticStorage?.storageRole ??
        BROWSER_LOCAL_SHIELDED_STATE_DIAGNOSTIC.storageRole,
      privacyPrimitive: false as const,
    }))
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function getLatestCanonicalShieldSnapshot():
  | { snapshot: ShieldedStateSnapshot; leafCount: number }
  | null {
  const records = listCanonicalShieldRecords();

  if (records.length === 0) {
    return null;
  }

  const latestRecord = records[records.length - 1];
  const leafCount = latestRecord?.insertion.leafCount ?? records.length;

  return {
    snapshot: {
      version: 1,
      leafCount,
      root: {
        scheme: "sha256-append-only-commitment-list-v1",
        value: latestRecord?.insertion.root ?? "",
        leafCount,
        diagnostic: BROWSER_LOCAL_SHIELDED_STATE_DIAGNOSTIC,
      },
      entries: records.map((record, index) => ({
        index,
        commitment: record.artifacts.commitment,
      })),
      diagnostic: BROWSER_LOCAL_SHIELDED_STATE_DIAGNOSTIC,
    },
    leafCount,
  };
}

function createCanonicalShieldNote(
  input: LiveShieldCanonicalizationInput,
  ownerContext: CanonicalNoteOwnerContext,
): CanonicalNoteV1 {
  return createCanonicalNote({
    assetId: createCanonicalAssetId(input.mintAddress),
    amount: decimalAmountToBaseUnits(
      input.amountDisplay,
      resolveTokenDecimals(input.tokenDecimals),
    ),
    // Phase 1 bridge: use the connected wallet owner as the temporary owner recovery public key.
    // This keeps the live bridge honest without claiming the final dedicated note key hierarchy.
    ownerPublicKey: ownerContext.ownerPublicKey,
    creationHint: {
      sourceKind: "shield",
      sourceAssetHint: input.assetSymbol,
      sourceTxSignatureHint: input.depositSignature,
      sourceTransitionIdHint: input.stateSignature,
    },
  });
}

function createOwnerContext(
  input: LiveShieldCanonicalizationInput,
): CanonicalNoteOwnerContext {
  return {
    ownerPublicKey: input.owner,
    recoverySecret: randomHex32(),
    derivationContext: `shield:${input.mintAddress}:${input.vaultOwner}`,
  };
}

async function insertCommitmentIntoCanonicalShieldedState(
  commitment: CanonicalNoteArtifacts["commitment"],
): Promise<ShieldedCommitmentInsertionRecord> {
  const state = AppendOnlyShieldedState.empty();

  for (const record of listCanonicalShieldRecords()) {
    await state.insertCommitment(record.artifacts.commitment);
  }

  return state.insertCommitment(commitment);
}

function persistCanonicalShieldRecord(record: LiveShieldCanonicalRecord) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const nextRecords = [...listCanonicalShieldRecords(), record];
  storage.setItem(LIVE_SHIELD_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords));
}

function createCanonicalAssetId(mintAddress: string) {
  return `solana:mint:${mintAddress}`;
}

function resolveTokenDecimals(value: number | undefined) {
  return Number.isInteger(value) && value !== undefined && value >= 0
    ? value
    : DEFAULT_SHIELD_TOKEN_DECIMALS;
}

function decimalAmountToBaseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid decimal shield amount: ${value}`);
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

function isLiveShieldCanonicalRecord(value: unknown): value is LiveShieldCanonicalRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<LiveShieldCanonicalRecord>;
  return (
    typeof record.recordId === "string" &&
    record.source === "live_shield_v1" &&
    typeof record.createdAt === "number" &&
    typeof record.canonicalNote === "object" &&
    record.canonicalNote !== null &&
    typeof record.artifacts === "object" &&
    record.artifacts !== null &&
    typeof record.insertion === "object" &&
    record.insertion !== null &&
    typeof record.liveShield === "object" &&
    record.liveShield !== null &&
    typeof record.ownerContext === "object" &&
    record.ownerContext !== null
  );
}

function formatCreationHintSummary(
  hint: SerializedCanonicalNoteV1["creationHint"],
) {
  if (!hint) {
    return "none";
  }

  return [
    hint.sourceKind,
    hint.sourceAssetHint,
    hint.sourceTxSignatureHint ? "deposit-linked" : null,
    hint.sourceTransitionIdHint ? "state-linked" : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" / ");
}
