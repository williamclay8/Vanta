import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import type { CanonicalNoteOwnerContext } from "./canonicalNote";
import {
  createOwnerContextLegacyQuarantinePolicy,
  type OwnerContextLegacyQuarantineStatus,
} from "./ownerContextLegacyQuarantinePolicy";
import {
  OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION,
  createOwnerContextRecoveryEvidence,
  isOwnerContextRecoveryEvidence,
  type OwnerContextRecoveryEvidence,
} from "./ownerContextRecoveryEvidence";

export const OWNER_CONTEXT_RECORD_SOURCE_IMPORT_VERSION =
  "vanta-owner-context-record-source-import-0.1" as const;

export type OwnerContextRecordSourceImportStatus =
  | "wallet-derived-import-source-verified"
  | "wallet-derived-record-source-mismatch"
  | "legacy-record-source-local-only"
  | "missing-record-source"
  | "raw-owner-material-rejected";

export type OwnerContextRecordSourceImportRecordSource =
  | "live_shield_v1"
  | "live_send_v1"
  | "live_swap_v1"
  | "unknown";

export type OwnerContextRecordSourceImportEntry = {
  recordReferenceHash: string;
  source: OwnerContextRecordSourceImportRecordSource;
  ownerPublicKey?: string;
  ownerRecoveryClass: OwnerContextRecoveryEvidence["recoveryClass"];
  ownerRecoveryEvidenceSource: OwnerContextRecoveryEvidence["evidenceSource"];
  hierarchyVersion?: OwnerContextRecoveryEvidence["hierarchyVersion"];
  derivationContextReferenceHash?: string;
  recoverySecretReferenceHash?: string;
  crossDeviceCandidate: boolean;
  importRequiredForCrossDevice: boolean;
  legacyQuarantineStatus: OwnerContextLegacyQuarantineStatus;
  automaticMigrationAllowed: false;
  crossDeviceRecoveryAllowedNow: false;
  recordSourceImportCanPromote: boolean;
  localOnlyQuarantine: boolean;
  productionRecoveryReady: false;
  requiredUserAction: string;
  quarantineTruth: string;
};

export type OwnerContextRecordSourceImportPacket = {
  version: typeof OWNER_CONTEXT_RECORD_SOURCE_IMPORT_VERSION;
  createdAt: number;
  ownerPublicKey?: string;
  rawRecoveryMaterialStored: false;
  entries: OwnerContextRecordSourceImportEntry[];
  truth: string;
};

export type OwnerContextRecordSourceInput = {
  recordId?: unknown;
  source?: unknown;
  ownerContextEvidence?: unknown;
  redactedOwnerContext?: unknown;
  canonicalNote?: unknown;
  ownerContext?: unknown;
};

export type OwnerContextRecordSourceImportProof = {
  version: typeof OWNER_CONTEXT_RECORD_SOURCE_IMPORT_VERSION;
  status: OwnerContextRecordSourceImportStatus;
  matchedRecordCount: number;
  walletDerivedCandidateCount: number;
  rawRecoveryMaterialStored: false;
  truth: string;
};

export type OwnerContextRecordSourceImportPacketSummary = {
  version: typeof OWNER_CONTEXT_RECORD_SOURCE_IMPORT_VERSION;
  createdAt: number;
  recordCount: number;
  walletDerivedCandidateCount: number;
  legacyLocalOnlyCount: number;
  missingEvidenceCount: number;
  walletDerivedRecordSourceRequiredCount: number;
  quarantinedLocalOnlyCount: number;
  automaticMigrationAllowed: false;
  productionRecoveryReady: false;
  legacyQuarantineTruth: string;
  rawRecoveryMaterialStored: false;
  truth: string;
};

const RECORD_SOURCE_IMPORT_TRUTHS: Record<OwnerContextRecordSourceImportStatus, string> = {
  "wallet-derived-import-source-verified":
    "The imported record source matches the same wallet-derived owner context; second-device recovery still depends on importing this record source and any required viewing-key backup.",
  "wallet-derived-record-source-mismatch":
    "The imported record source does not match the current wallet-derived owner context and must not be promoted to cross-device recovery.",
  "legacy-record-source-local-only":
    "The imported record source only contains legacy local-only owner evidence and cannot prove second-device wallet-derived recovery.",
  "missing-record-source":
    "No owner-context record source entries were imported, so cross-device recovery is not proved.",
  "raw-owner-material-rejected":
    "The record source contained raw owner recovery material and was rejected; import packets must carry non-secret evidence only.",
};

const RAW_OWNER_MATERIAL_KEYS = new Set([
  "blinding",
  "derivationContext",
  "encryptedPayload",
  "noteSecret",
  "ownerContext",
  "recoverySecret",
  "spendingSecret",
  "viewingSecretKey",
]);

export function createOwnerContextRecordSourceImportPacket(args: {
  createdAt?: number;
  records: OwnerContextRecordSourceInput[];
}): OwnerContextRecordSourceImportPacket {
  if (containsRawOwnerMaterial(args.records)) {
    throw new Error("Owner-context record source import packets must not export raw owner recovery material.");
  }

  const entries = args.records.map(createRecordSourceImportEntry);
  const ownerPublicKeys = new Set(
    entries
      .map((entry) => entry.ownerPublicKey)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );

  return {
    version: OWNER_CONTEXT_RECORD_SOURCE_IMPORT_VERSION,
    createdAt: args.createdAt ?? Date.now(),
    ownerPublicKey: ownerPublicKeys.size === 1 ? [...ownerPublicKeys][0] : undefined,
    rawRecoveryMaterialStored: false,
    entries,
    truth:
      "This import packet carries non-secret owner-context evidence, record references, and legacy quarantine policy only; it is a record source, not a recovery-secret backup.",
  };
}

export function verifyOwnerContextRecordSourceImport(args: {
  ownerContext: CanonicalNoteOwnerContext;
  packet: unknown;
}): OwnerContextRecordSourceImportProof {
  const packet = normalizeRecordSourceImportPacket(args.packet);

  if (!packet) {
    return createImportProof("raw-owner-material-rejected", 0, 0);
  }

  if (packet.entries.length === 0) {
    return createImportProof("missing-record-source", 0, 0);
  }

  const expectedEvidence = createOwnerContextRecoveryEvidence({
    ownerContext: args.ownerContext,
  });
  const walletDerivedEntries = packet.entries.filter(
    (entry) => entry.ownerRecoveryClass === "wallet-derived-cross-device-candidate",
  );

  if (walletDerivedEntries.length === 0) {
    return createImportProof(
      "legacy-record-source-local-only",
      0,
      packet.entries.filter((entry) => entry.crossDeviceCandidate).length,
    );
  }

  const matchedEntries = walletDerivedEntries.filter((entry) =>
    ownerContextEvidenceMatchesImportEntry(expectedEvidence, entry),
  );

  return createImportProof(
    matchedEntries.length > 0
      ? "wallet-derived-import-source-verified"
      : "wallet-derived-record-source-mismatch",
    matchedEntries.length,
    walletDerivedEntries.length,
  );
}

export function parseOwnerContextRecordSourceImportPacketText(
  serializedPacket: string,
): OwnerContextRecordSourceImportPacket | null {
  try {
    return normalizeRecordSourceImportPacket(JSON.parse(serializedPacket) as unknown);
  } catch {
    return null;
  }
}

export function summarizeOwnerContextRecordSourceImportPacket(
  packet: unknown,
): OwnerContextRecordSourceImportPacketSummary | null {
  const normalizedPacket = normalizeRecordSourceImportPacket(packet);

  if (!normalizedPacket) {
    return null;
  }

  const walletDerivedRecordSourceRequiredCount = normalizedPacket.entries.filter(
    (entry) => entry.legacyQuarantineStatus === "wallet-derived-record-source-required",
  ).length;
  const quarantinedLocalOnlyCount = normalizedPacket.entries.filter(
    (entry) => entry.localOnlyQuarantine,
  ).length;

  return {
    version: OWNER_CONTEXT_RECORD_SOURCE_IMPORT_VERSION,
    createdAt: normalizedPacket.createdAt,
    recordCount: normalizedPacket.entries.length,
    walletDerivedCandidateCount: normalizedPacket.entries.filter(
      (entry) => entry.ownerRecoveryClass === "wallet-derived-cross-device-candidate",
    ).length,
    legacyLocalOnlyCount: normalizedPacket.entries.filter(
      (entry) => entry.ownerRecoveryClass === "legacy-random-local-only",
    ).length,
    missingEvidenceCount: normalizedPacket.entries.filter(
      (entry) =>
        entry.ownerRecoveryClass === "redacted-legacy-unmigratable" ||
        entry.ownerRecoveryClass === "missing-owner-context-evidence",
    ).length,
    walletDerivedRecordSourceRequiredCount,
    quarantinedLocalOnlyCount,
    automaticMigrationAllowed: false,
    productionRecoveryReady: false,
    legacyQuarantineTruth:
      quarantinedLocalOnlyCount > 0
        ? "Legacy or missing owner-context records remain quarantined local-only; record-source import does not migrate old random-seeded records."
        : "Wallet-derived records still require record-source import and viewing-key backup before cross-device recovery is real.",
    rawRecoveryMaterialStored: false,
    truth: normalizedPacket.truth,
  };
}

function createRecordSourceImportEntry(
  record: OwnerContextRecordSourceInput,
): OwnerContextRecordSourceImportEntry {
  const evidence = createOwnerContextRecoveryEvidence({
    existingEvidence: record.ownerContextEvidence,
    redactedOwnerContext: parseRedactedOwnerContext(record.redactedOwnerContext),
  });
  const quarantinePolicy = createOwnerContextLegacyQuarantinePolicy({
    ownerContextEvidence: evidence,
  });
  const ownerPublicKey =
    evidence.ownerPublicKey ?? parseCanonicalNoteOwnerPublicKey(record.canonicalNote);

  return {
    recordReferenceHash: createRecordReferenceHash(record),
    source: normalizeRecordSource(record.source),
    ownerPublicKey,
    ownerRecoveryClass: evidence.recoveryClass,
    ownerRecoveryEvidenceSource: evidence.evidenceSource,
    hierarchyVersion: evidence.hierarchyVersion,
    derivationContextReferenceHash: evidence.derivationContextReferenceHash,
    recoverySecretReferenceHash: evidence.recoverySecretReferenceHash,
    crossDeviceCandidate: evidence.crossDeviceCandidate,
    importRequiredForCrossDevice: evidence.importRequiredForCrossDevice,
    legacyQuarantineStatus: quarantinePolicy.status,
    automaticMigrationAllowed: false,
    crossDeviceRecoveryAllowedNow: false,
    recordSourceImportCanPromote: quarantinePolicy.recordSourceImportCanPromote,
    localOnlyQuarantine: quarantinePolicy.localOnlyQuarantine,
    productionRecoveryReady: false,
    requiredUserAction: quarantinePolicy.requiredUserAction,
    quarantineTruth: quarantinePolicy.truth,
  };
}

function ownerContextEvidenceMatchesImportEntry(
  expectedEvidence: OwnerContextRecoveryEvidence,
  entry: OwnerContextRecordSourceImportEntry,
) {
  return (
    expectedEvidence.recoveryClass === "wallet-derived-cross-device-candidate" &&
    entry.ownerRecoveryEvidenceSource === expectedEvidence.evidenceSource &&
    entry.ownerPublicKey === expectedEvidence.ownerPublicKey &&
    entry.hierarchyVersion === expectedEvidence.hierarchyVersion &&
    entry.derivationContextReferenceHash === expectedEvidence.derivationContextReferenceHash &&
    entry.recoverySecretReferenceHash === expectedEvidence.recoverySecretReferenceHash &&
    entry.crossDeviceCandidate === true &&
    entry.importRequiredForCrossDevice === true
  );
}

function normalizeRecordSourceImportPacket(
  packet: unknown,
): OwnerContextRecordSourceImportPacket | null {
  if (
    typeof packet !== "object" ||
    packet === null ||
    containsRawOwnerMaterial(packet)
  ) {
    return null;
  }

  const candidate = packet as Partial<OwnerContextRecordSourceImportPacket>;
  if (
    candidate.version !== OWNER_CONTEXT_RECORD_SOURCE_IMPORT_VERSION ||
    candidate.rawRecoveryMaterialStored !== false ||
    typeof candidate.createdAt !== "number" ||
    !Array.isArray(candidate.entries)
  ) {
    return null;
  }

  const entries = candidate.entries.map(normalizeRecordSourceImportEntry);
  if (entries.some((entry) => entry === null)) {
    return null;
  }

  return {
    version: OWNER_CONTEXT_RECORD_SOURCE_IMPORT_VERSION,
    createdAt: candidate.createdAt,
    ownerPublicKey:
      typeof candidate.ownerPublicKey === "string" ? candidate.ownerPublicKey : undefined,
    rawRecoveryMaterialStored: false,
    entries: entries as OwnerContextRecordSourceImportEntry[],
    truth:
      typeof candidate.truth === "string"
        ? candidate.truth
        : "This import packet carries non-secret owner-context evidence and record references only.",
  };
}

function normalizeRecordSourceImportEntry(
  entry: unknown,
): OwnerContextRecordSourceImportEntry | null {
  if (typeof entry !== "object" || entry === null || containsRawOwnerMaterial(entry)) {
    return null;
  }

  const candidate = entry as Partial<OwnerContextRecordSourceImportEntry>;
  if (
    !isReferenceHash(candidate.recordReferenceHash) ||
    !isRecordSource(candidate.source) ||
    !isOwnerRecoveryClass(candidate.ownerRecoveryClass) ||
    !isOwnerRecoveryEvidenceSource(candidate.ownerRecoveryEvidenceSource) ||
    typeof candidate.crossDeviceCandidate !== "boolean" ||
    typeof candidate.importRequiredForCrossDevice !== "boolean"
  ) {
    return null;
  }

  const evidence = {
    version: OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION,
    recoveryClass: candidate.ownerRecoveryClass,
    evidenceSource: candidate.ownerRecoveryEvidenceSource,
    ownerPublicKey: candidate.ownerPublicKey,
    hierarchyVersion: candidate.hierarchyVersion,
    derivationContextReferenceHash: candidate.derivationContextReferenceHash,
    recoverySecretReferenceHash: candidate.recoverySecretReferenceHash,
    crossDeviceCandidate: candidate.crossDeviceCandidate,
    rawRecoveryMaterialStored: false,
    importRequiredForCrossDevice: candidate.importRequiredForCrossDevice,
    truth: "",
  };

  if (!isOwnerContextRecoveryEvidence(evidence)) {
    return null;
  }

  const quarantinePolicy = createOwnerContextLegacyQuarantinePolicy({
    ownerContextEvidence: evidence,
  });

  if (
    (candidate.legacyQuarantineStatus !== undefined &&
      candidate.legacyQuarantineStatus !== quarantinePolicy.status) ||
    (candidate.automaticMigrationAllowed !== undefined &&
      candidate.automaticMigrationAllowed !== false) ||
    (candidate.crossDeviceRecoveryAllowedNow !== undefined &&
      candidate.crossDeviceRecoveryAllowedNow !== false) ||
    (candidate.recordSourceImportCanPromote !== undefined &&
      candidate.recordSourceImportCanPromote !== quarantinePolicy.recordSourceImportCanPromote) ||
    (candidate.localOnlyQuarantine !== undefined &&
      candidate.localOnlyQuarantine !== quarantinePolicy.localOnlyQuarantine) ||
    (candidate.productionRecoveryReady !== undefined &&
      candidate.productionRecoveryReady !== false)
  ) {
    return null;
  }

  return {
    recordReferenceHash: candidate.recordReferenceHash,
    source: candidate.source,
    ownerPublicKey:
      typeof candidate.ownerPublicKey === "string" ? candidate.ownerPublicKey : undefined,
    ownerRecoveryClass: candidate.ownerRecoveryClass,
    ownerRecoveryEvidenceSource: candidate.ownerRecoveryEvidenceSource,
    hierarchyVersion: candidate.hierarchyVersion,
    derivationContextReferenceHash: candidate.derivationContextReferenceHash,
    recoverySecretReferenceHash: candidate.recoverySecretReferenceHash,
    crossDeviceCandidate: candidate.crossDeviceCandidate,
    importRequiredForCrossDevice: candidate.importRequiredForCrossDevice,
    legacyQuarantineStatus: quarantinePolicy.status,
    automaticMigrationAllowed: false,
    crossDeviceRecoveryAllowedNow: false,
    recordSourceImportCanPromote: quarantinePolicy.recordSourceImportCanPromote,
    localOnlyQuarantine: quarantinePolicy.localOnlyQuarantine,
    productionRecoveryReady: false,
    requiredUserAction: quarantinePolicy.requiredUserAction,
    quarantineTruth: quarantinePolicy.truth,
  };
}

function createImportProof(
  status: OwnerContextRecordSourceImportStatus,
  matchedRecordCount: number,
  walletDerivedCandidateCount: number,
): OwnerContextRecordSourceImportProof {
  return {
    version: OWNER_CONTEXT_RECORD_SOURCE_IMPORT_VERSION,
    status,
    matchedRecordCount,
    walletDerivedCandidateCount,
    rawRecoveryMaterialStored: false,
    truth: RECORD_SOURCE_IMPORT_TRUTHS[status],
  };
}

function createRecordReferenceHash(record: OwnerContextRecordSourceInput) {
  return createReferenceHash(
    "record-source",
    `${normalizeRecordSource(record.source)}:${String(record.recordId ?? "missing-record-id")}`,
  );
}

function createReferenceHash(domain: string, value: string) {
  return `sha256:${bytesToHex(
    sha256(
      new TextEncoder().encode(
        `vanta-owner-context-record-source-import:${domain}:${value}`,
      ),
    ),
  )}`;
}

function containsRawOwnerMaterial(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsRawOwnerMaterial);
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  for (const [key, childValue] of Object.entries(value as Record<string, unknown>)) {
    if (RAW_OWNER_MATERIAL_KEYS.has(key)) {
      return true;
    }

    if (containsRawOwnerMaterial(childValue)) {
      return true;
    }
  }

  return false;
}

function parseRedactedOwnerContext(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const candidate = value as {
    derivationContextReferenceHash?: unknown;
    ownerPublicKey?: unknown;
    recoverySecretReferenceHash?: unknown;
  };

  return {
    derivationContextReferenceHash:
      typeof candidate.derivationContextReferenceHash === "string"
        ? candidate.derivationContextReferenceHash
        : undefined,
    ownerPublicKey:
      typeof candidate.ownerPublicKey === "string" ? candidate.ownerPublicKey : undefined,
    recoverySecretReferenceHash:
      typeof candidate.recoverySecretReferenceHash === "string"
        ? candidate.recoverySecretReferenceHash
        : undefined,
  };
}

function parseCanonicalNoteOwnerPublicKey(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const candidate = value as { ownerPublicKey?: unknown };
  return typeof candidate.ownerPublicKey === "string" ? candidate.ownerPublicKey : undefined;
}

function normalizeRecordSource(value: unknown): OwnerContextRecordSourceImportRecordSource {
  return isRecordSource(value) ? value : "unknown";
}

function isRecordSource(value: unknown): value is OwnerContextRecordSourceImportRecordSource {
  return (
    value === "live_shield_v1" ||
    value === "live_send_v1" ||
    value === "live_swap_v1" ||
    value === "unknown"
  );
}

function isOwnerRecoveryClass(
  value: unknown,
): value is OwnerContextRecoveryEvidence["recoveryClass"] {
  return (
    value === "wallet-derived-cross-device-candidate" ||
    value === "legacy-random-local-only" ||
    value === "redacted-legacy-unmigratable" ||
    value === "missing-owner-context-evidence"
  );
}

function isOwnerRecoveryEvidenceSource(
  value: unknown,
): value is OwnerContextRecoveryEvidence["evidenceSource"] {
  return (
    value === "owner-key-hierarchy-v0.1" ||
    value === "legacy-random-local-record" ||
    value === "redacted-legacy-record" ||
    value === "missing-owner-context-evidence"
  );
}

function isReferenceHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}
