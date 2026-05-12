import type { CanonicalNoteOwnerContext } from "./canonicalNote";
import {
  createOwnerContextRecoveryEvidence,
  type OwnerContextRecoveryEvidence,
  type RedactedOwnerContextEvidenceInput,
} from "./ownerContextRecoveryEvidence";

export const OWNER_CONTEXT_LEGACY_QUARANTINE_POLICY_VERSION =
  "vanta-owner-context-legacy-quarantine-policy-0.1" as const;

export type OwnerContextLegacyQuarantineStatus =
  | "wallet-derived-record-source-required"
  | "legacy-random-quarantined-local-only"
  | "redacted-legacy-unmigratable"
  | "missing-evidence-quarantined";

export type OwnerContextLegacyQuarantineRecordInput = {
  ownerContext?: CanonicalNoteOwnerContext;
  ownerContextEvidence?: unknown;
  redactedOwnerContext?: RedactedOwnerContextEvidenceInput;
};

export type OwnerContextLegacyQuarantineDecision = {
  version: typeof OWNER_CONTEXT_LEGACY_QUARANTINE_POLICY_VERSION;
  status: OwnerContextLegacyQuarantineStatus;
  recoveryClass: OwnerContextRecoveryEvidence["recoveryClass"];
  evidenceSource: OwnerContextRecoveryEvidence["evidenceSource"];
  label: string;
  automaticMigrationAllowed: false;
  crossDeviceRecoveryAllowedNow: false;
  recordSourceImportCanPromote: boolean;
  localOnlyQuarantine: boolean;
  rawRecoveryMaterialRequired: false;
  productionRecoveryReady: false;
  requiredUserAction: string;
  truth: string;
};

export type OwnerContextLegacyQuarantineSummary = {
  version: typeof OWNER_CONTEXT_LEGACY_QUARANTINE_POLICY_VERSION;
  recordCount: number;
  walletDerivedRecordSourceRequiredCount: number;
  legacyRandomQuarantinedCount: number;
  redactedLegacyUnmigratableCount: number;
  missingEvidenceQuarantinedCount: number;
  automaticMigrationAllowed: false;
  productionRecoveryReady: false;
  truth: string;
};

const POLICY_BY_CLASS: Record<
  OwnerContextRecoveryEvidence["recoveryClass"],
  Omit<
    OwnerContextLegacyQuarantineDecision,
    "version" | "recoveryClass" | "evidenceSource"
  >
> = {
  "wallet-derived-cross-device-candidate": {
    status: "wallet-derived-record-source-required",
    label: "record source required",
    automaticMigrationAllowed: false,
    crossDeviceRecoveryAllowedNow: false,
    recordSourceImportCanPromote: true,
    localOnlyQuarantine: false,
    rawRecoveryMaterialRequired: false,
    productionRecoveryReady: false,
    requiredUserAction:
      "Export or import the non-secret record source packet, then keep viewing-key backup handled separately.",
    truth:
      "Wallet-derived records are cross-device candidates only after a matching record source is imported; Vanta does not auto-migrate local browser records.",
  },
  "legacy-random-local-only": {
    status: "legacy-random-quarantined-local-only",
    label: "legacy quarantined",
    automaticMigrationAllowed: false,
    crossDeviceRecoveryAllowedNow: false,
    recordSourceImportCanPromote: false,
    localOnlyQuarantine: true,
    rawRecoveryMaterialRequired: false,
    productionRecoveryReady: false,
    requiredUserAction:
      "Keep this record local-only, or exit/re-shield through a new wallet-derived owner-context record when that path is available.",
    truth:
      "Old random-seeded browser-local records cannot be promoted by record-source import because they lack wallet-derived hierarchy evidence.",
  },
  "redacted-legacy-unmigratable": {
    status: "redacted-legacy-unmigratable",
    label: "legacy unmigratable",
    automaticMigrationAllowed: false,
    crossDeviceRecoveryAllowedNow: false,
    recordSourceImportCanPromote: false,
    localOnlyQuarantine: true,
    rawRecoveryMaterialRequired: false,
    productionRecoveryReady: false,
    requiredUserAction:
      "Restore from a separate backup/source if one exists, otherwise treat the record as local-only and re-shield into wallet-derived owner context.",
    truth:
      "Redacted legacy records do not contain enough owner-context material to prove cross-device recovery or safe automatic migration.",
  },
  "missing-owner-context-evidence": {
    status: "missing-evidence-quarantined",
    label: "evidence missing",
    automaticMigrationAllowed: false,
    crossDeviceRecoveryAllowedNow: false,
    recordSourceImportCanPromote: false,
    localOnlyQuarantine: true,
    rawRecoveryMaterialRequired: false,
    productionRecoveryReady: false,
    requiredUserAction:
      "Do not promote this record; recreate a wallet-derived record source before claiming recovery.",
    truth:
      "Records without owner-context evidence are quarantined from cross-device recovery and production recovery claims.",
  },
};

export function createOwnerContextLegacyQuarantinePolicy(
  input: OwnerContextLegacyQuarantineRecordInput = {},
): OwnerContextLegacyQuarantineDecision {
  const evidence = createOwnerContextRecoveryEvidence({
    existingEvidence: input.ownerContextEvidence,
    ownerContext: input.ownerContext,
    redactedOwnerContext: input.redactedOwnerContext,
  });
  const policy = POLICY_BY_CLASS[evidence.recoveryClass];

  return {
    version: OWNER_CONTEXT_LEGACY_QUARANTINE_POLICY_VERSION,
    recoveryClass: evidence.recoveryClass,
    evidenceSource: evidence.evidenceSource,
    ...policy,
  };
}

export function createOwnerContextLegacyQuarantineSummary(
  records: OwnerContextLegacyQuarantineRecordInput[],
): OwnerContextLegacyQuarantineSummary {
  const decisions = records.map(createOwnerContextLegacyQuarantinePolicy);
  const walletDerivedRecordSourceRequiredCount = decisions.filter(
    (decision) => decision.status === "wallet-derived-record-source-required",
  ).length;
  const legacyRandomQuarantinedCount = decisions.filter(
    (decision) => decision.status === "legacy-random-quarantined-local-only",
  ).length;
  const redactedLegacyUnmigratableCount = decisions.filter(
    (decision) => decision.status === "redacted-legacy-unmigratable",
  ).length;
  const missingEvidenceQuarantinedCount = decisions.filter(
    (decision) => decision.status === "missing-evidence-quarantined",
  ).length;

  return {
    version: OWNER_CONTEXT_LEGACY_QUARANTINE_POLICY_VERSION,
    recordCount: decisions.length,
    walletDerivedRecordSourceRequiredCount,
    legacyRandomQuarantinedCount,
    redactedLegacyUnmigratableCount,
    missingEvidenceQuarantinedCount,
    automaticMigrationAllowed: false,
    productionRecoveryReady: false,
    truth:
      legacyRandomQuarantinedCount +
        redactedLegacyUnmigratableCount +
        missingEvidenceQuarantinedCount >
      0
        ? "Legacy or missing owner-context records remain quarantined local-only; export/import can verify wallet-derived records but does not migrate old random-seeded records."
        : "No legacy owner-context records were found in this packet, but wallet-derived records still need record-source import and viewing-key backup before cross-device recovery is real.",
  };
}
