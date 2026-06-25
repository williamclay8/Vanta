import { isRecord } from "../isRecord";
import type { PrivateVaultRecord } from "./privateVaultTypes";

export const PRIVATE_VAULT_RECOVERY_FILE_VERSION =
  "vanta.private-vault.recovery-file.v1" as const;

export type PrivateVaultRecoveryFile = {
  recoveryFileVersion: typeof PRIVATE_VAULT_RECOVERY_FILE_VERSION;
  record: PrivateVaultRecord;
};

export function createPrivateVaultRecoveryFile(record: PrivateVaultRecord) {
  return JSON.stringify(
    {
      recoveryFileVersion: PRIVATE_VAULT_RECOVERY_FILE_VERSION,
      record,
    },
    null,
    2,
  );
}

export function parsePrivateVaultRecoveryFile(
  raw: string,
): PrivateVaultRecoveryFile | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isPrivateVaultRecoveryFile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isPrivateVaultRecoveryFile(
  value: unknown,
): value is PrivateVaultRecoveryFile {
  return (
    isRecord(value) &&
    value.recoveryFileVersion === PRIVATE_VAULT_RECOVERY_FILE_VERSION &&
    isPrivateVaultRecord(value.record)
  );
}

function isPrivateVaultRecord(value: unknown): value is PrivateVaultRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.vaultId === "string" &&
    value.vaultId.length > 0 &&
    typeof value.createdAt === "string" &&
    value.createdAt.length > 0 &&
    (value.custody === "browser-generated" || value.custody === "imported") &&
    value.derivationVersion === "v1" &&
    typeof value.encryptedPayload === "string" &&
    value.encryptedPayload.length > 0 &&
    value.recoveryFileVersion === "vanta-private-vault-recovery-v1" &&
    (value.status === "locked" ||
      value.status === "unlocked" ||
      value.status === "recovery-required") &&
    Array.isArray(value.capabilityLabels) &&
    value.capabilityLabels.every((entry) => typeof entry === "string")
  );
}
