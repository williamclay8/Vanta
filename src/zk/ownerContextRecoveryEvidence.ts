import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import type { CanonicalNoteOwnerContext } from "./canonicalNote";

export const OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION =
  "vanta-owner-context-recovery-evidence-0.1" as const;
export const VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION =
  "vanta-shield-owner-key-hierarchy-0.1" as const;
export const VANTA_SHIELD_OWNER_KEY_HIERARCHY_DERIVATION_PREFIX =
  `owner-key-hierarchy:${VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION}:vanta:` as const;

export type OwnerContextRecoveryClass =
  | "wallet-derived-cross-device-candidate"
  | "legacy-random-local-only"
  | "redacted-legacy-unmigratable"
  | "missing-owner-context-evidence";

export type OwnerContextRecoveryEvidenceSource =
  | "owner-key-hierarchy-v0.1"
  | "legacy-random-local-record"
  | "redacted-legacy-record"
  | "missing-owner-context-evidence";

export type OwnerContextRecoveryEvidence = {
  version: typeof OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION;
  recoveryClass: OwnerContextRecoveryClass;
  evidenceSource: OwnerContextRecoveryEvidenceSource;
  ownerPublicKey?: string;
  hierarchyVersion?: typeof VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION;
  derivationContextReferenceHash?: string;
  recoverySecretReferenceHash?: string;
  crossDeviceCandidate: boolean;
  rawRecoveryMaterialStored: false;
  importRequiredForCrossDevice: boolean;
  truth: string;
};

export type RedactedOwnerContextEvidenceInput = {
  derivationContextReferenceHash?: string;
  ownerPublicKey?: string;
  recoverySecretReferenceHash?: string;
};

const OWNER_CONTEXT_RECOVERY_CLASSES = new Set<OwnerContextRecoveryClass>([
  "wallet-derived-cross-device-candidate",
  "legacy-random-local-only",
  "redacted-legacy-unmigratable",
  "missing-owner-context-evidence",
]);

const OWNER_CONTEXT_RECOVERY_EVIDENCE_SOURCES = new Set<OwnerContextRecoveryEvidenceSource>([
  "owner-key-hierarchy-v0.1",
  "legacy-random-local-record",
  "redacted-legacy-record",
  "missing-owner-context-evidence",
]);

const SHA256_REFERENCE_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;

const OWNER_CONTEXT_RECOVERY_TRUTHS: Record<OwnerContextRecoveryClass, string> = {
  "wallet-derived-cross-device-candidate":
    "This record was created with wallet-derived owner context evidence; recovery on another device still requires a record source or import path.",
  "legacy-random-local-only":
    "This record was created without wallet-derived hierarchy evidence and remains legacy local-only unless separately backed up.",
  "redacted-legacy-unmigratable":
    "This record has only redacted owner-context references in browser storage, so this record remains local-only; a separate backup/import source must recreate recovery context before cross-device use.",
  "missing-owner-context-evidence":
    "This record does not carry owner-context recovery evidence and must not be promoted to cross-device recovery.",
};

export function createOwnerContextRecoveryEvidence(args: {
  existingEvidence?: unknown;
  ownerContext?: CanonicalNoteOwnerContext;
  redactedOwnerContext?: RedactedOwnerContextEvidenceInput;
}): OwnerContextRecoveryEvidence {
  const existingEvidence = normalizeOwnerContextRecoveryEvidence(args.existingEvidence);

  if (existingEvidence) {
    return existingEvidence;
  }

  if (args.ownerContext) {
    return createEvidenceFromOwnerContext(args.ownerContext);
  }

  if (args.redactedOwnerContext) {
    return {
      version: OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION,
      recoveryClass: "redacted-legacy-unmigratable",
      evidenceSource: "redacted-legacy-record",
      ownerPublicKey: args.redactedOwnerContext.ownerPublicKey,
      derivationContextReferenceHash: createOptionalOwnerContextReferenceHash(
        "owner-derivation-context",
        args.redactedOwnerContext.derivationContextReferenceHash,
      ),
      recoverySecretReferenceHash: createOptionalOwnerContextReferenceHash(
        "owner-recovery-secret",
        args.redactedOwnerContext.recoverySecretReferenceHash,
      ),
      crossDeviceCandidate: false,
      rawRecoveryMaterialStored: false,
      importRequiredForCrossDevice: true,
      truth: OWNER_CONTEXT_RECOVERY_TRUTHS["redacted-legacy-unmigratable"],
    };
  }

  return {
    version: OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION,
    recoveryClass: "missing-owner-context-evidence",
    evidenceSource: "missing-owner-context-evidence",
    crossDeviceCandidate: false,
    rawRecoveryMaterialStored: false,
    importRequiredForCrossDevice: true,
    truth: OWNER_CONTEXT_RECOVERY_TRUTHS["missing-owner-context-evidence"],
  };
}

export function createOwnerContextReferenceHash(domain: string, value: string | undefined) {
  if (value && isValidOwnerContextReferenceHash(value)) {
    return value;
  }

  return `sha256:${bytesToHex(
    sha256(
      new TextEncoder().encode(
        `vanta-owner-context-recovery-evidence:${domain}:${value ?? "unset"}`,
      ),
    ),
  )}`;
}

function createOptionalOwnerContextReferenceHash(
  domain: string,
  value: string | undefined,
) {
  return value ? createOwnerContextReferenceHash(domain, value) : undefined;
}

export function isWalletDerivedOwnerContext(ownerContext: CanonicalNoteOwnerContext) {
  return ownerContext.derivationContext?.startsWith(
    VANTA_SHIELD_OWNER_KEY_HIERARCHY_DERIVATION_PREFIX,
  ) === true;
}

export function isOwnerContextRecoveryEvidence(
  value: unknown,
): value is OwnerContextRecoveryEvidence {
  return normalizeOwnerContextRecoveryEvidence(value) !== null;
}

function normalizeOwnerContextRecoveryEvidence(
  value: unknown,
): OwnerContextRecoveryEvidence | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const evidence = value as Partial<OwnerContextRecoveryEvidence>;

  if (
    evidence.version !== OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION ||
    !OWNER_CONTEXT_RECOVERY_CLASSES.has(evidence.recoveryClass as OwnerContextRecoveryClass) ||
    !OWNER_CONTEXT_RECOVERY_EVIDENCE_SOURCES.has(
      evidence.evidenceSource as OwnerContextRecoveryEvidenceSource,
    ) ||
    evidence.rawRecoveryMaterialStored !== false
  ) {
    return null;
  }

  switch (evidence.recoveryClass) {
    case "wallet-derived-cross-device-candidate":
      if (
        evidence.evidenceSource !== "owner-key-hierarchy-v0.1" ||
        evidence.crossDeviceCandidate !== true ||
        evidence.importRequiredForCrossDevice !== true ||
        evidence.hierarchyVersion !== VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION ||
        !isNonEmptyString(evidence.ownerPublicKey) ||
        !isValidOwnerContextReferenceHash(evidence.derivationContextReferenceHash) ||
        !isValidOwnerContextReferenceHash(evidence.recoverySecretReferenceHash)
      ) {
        return null;
      }

      return {
        version: OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION,
        recoveryClass: evidence.recoveryClass,
        evidenceSource: evidence.evidenceSource,
        ownerPublicKey: evidence.ownerPublicKey,
        hierarchyVersion: VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION,
        derivationContextReferenceHash: evidence.derivationContextReferenceHash,
        recoverySecretReferenceHash: evidence.recoverySecretReferenceHash,
        crossDeviceCandidate: true,
        rawRecoveryMaterialStored: false,
        importRequiredForCrossDevice: true,
        truth: OWNER_CONTEXT_RECOVERY_TRUTHS[evidence.recoveryClass],
      };

    case "legacy-random-local-only":
      if (
        evidence.evidenceSource !== "legacy-random-local-record" ||
        evidence.crossDeviceCandidate !== false ||
        evidence.importRequiredForCrossDevice !== true ||
        !isNonEmptyString(evidence.ownerPublicKey) ||
        evidence.hierarchyVersion !== undefined ||
        evidence.derivationContextReferenceHash !== undefined ||
        !isValidOwnerContextReferenceHash(evidence.recoverySecretReferenceHash)
      ) {
        return null;
      }

      return {
        version: OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION,
        recoveryClass: evidence.recoveryClass,
        evidenceSource: evidence.evidenceSource,
        ownerPublicKey: evidence.ownerPublicKey,
        recoverySecretReferenceHash: evidence.recoverySecretReferenceHash,
        crossDeviceCandidate: false,
        rawRecoveryMaterialStored: false,
        importRequiredForCrossDevice: true,
        truth: OWNER_CONTEXT_RECOVERY_TRUTHS[evidence.recoveryClass],
      };

    case "redacted-legacy-unmigratable":
      if (
        evidence.evidenceSource !== "redacted-legacy-record" ||
        evidence.crossDeviceCandidate !== false ||
        evidence.importRequiredForCrossDevice !== true ||
        evidence.hierarchyVersion !== undefined ||
        !isOptionalString(evidence.ownerPublicKey) ||
        !isOptionalOwnerContextReferenceHash(evidence.derivationContextReferenceHash) ||
        !isOptionalOwnerContextReferenceHash(evidence.recoverySecretReferenceHash)
      ) {
        return null;
      }

      return {
        version: OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION,
        recoveryClass: evidence.recoveryClass,
        evidenceSource: evidence.evidenceSource,
        ownerPublicKey: evidence.ownerPublicKey,
        derivationContextReferenceHash: evidence.derivationContextReferenceHash,
        recoverySecretReferenceHash: evidence.recoverySecretReferenceHash,
        crossDeviceCandidate: false,
        rawRecoveryMaterialStored: false,
        importRequiredForCrossDevice: true,
        truth: OWNER_CONTEXT_RECOVERY_TRUTHS[evidence.recoveryClass],
      };

    case "missing-owner-context-evidence":
      if (
        evidence.evidenceSource !== "missing-owner-context-evidence" ||
        evidence.crossDeviceCandidate !== false ||
        evidence.importRequiredForCrossDevice !== true ||
        evidence.ownerPublicKey !== undefined ||
        evidence.hierarchyVersion !== undefined ||
        evidence.derivationContextReferenceHash !== undefined ||
        evidence.recoverySecretReferenceHash !== undefined
      ) {
        return null;
      }

      return {
        version: OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION,
        recoveryClass: evidence.recoveryClass,
        evidenceSource: evidence.evidenceSource,
        crossDeviceCandidate: false,
        rawRecoveryMaterialStored: false,
        importRequiredForCrossDevice: true,
        truth: OWNER_CONTEXT_RECOVERY_TRUTHS[evidence.recoveryClass],
      };
  }

  return null;
}

function createEvidenceFromOwnerContext(
  ownerContext: CanonicalNoteOwnerContext,
): OwnerContextRecoveryEvidence {
  const walletDerived = isWalletDerivedOwnerContext(ownerContext);

  return {
    version: OWNER_CONTEXT_RECOVERY_EVIDENCE_VERSION,
    recoveryClass: walletDerived
      ? "wallet-derived-cross-device-candidate"
      : "legacy-random-local-only",
    evidenceSource: walletDerived
      ? "owner-key-hierarchy-v0.1"
      : "legacy-random-local-record",
    ownerPublicKey: ownerContext.ownerPublicKey,
    hierarchyVersion: walletDerived ? VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION : undefined,
    derivationContextReferenceHash: ownerContext.derivationContext
      ? createOwnerContextReferenceHash(
          "owner-derivation-context",
          ownerContext.derivationContext,
        )
      : undefined,
    recoverySecretReferenceHash: createOwnerContextReferenceHash(
      "owner-recovery-secret",
      ownerContext.recoverySecret,
    ),
    crossDeviceCandidate: walletDerived,
    rawRecoveryMaterialStored: false,
    importRequiredForCrossDevice: true,
    truth: walletDerived
      ? OWNER_CONTEXT_RECOVERY_TRUTHS["wallet-derived-cross-device-candidate"]
      : OWNER_CONTEXT_RECOVERY_TRUTHS["legacy-random-local-only"],
  };
}

function isValidOwnerContextReferenceHash(value: unknown): value is string {
  return typeof value === "string" && SHA256_REFERENCE_HASH_PATTERN.test(value);
}

function isOptionalOwnerContextReferenceHash(value: unknown): value is string | undefined {
  return value === undefined || isValidOwnerContextReferenceHash(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}
