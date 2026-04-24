import type { PrivateVaultRecord } from "./privateVaultTypes";

export const PRIVATE_VAULT_STORAGE_KEY = "vanta.privateVault.v1";

export type PrivateVaultStorageSaveResult =
  | { kind: "saved" }
  | { kind: "storage-unavailable" }
  | { kind: "write-failed" };

export type PrivateVaultStorageLoadResult =
  | { kind: "success"; record: PrivateVaultRecord }
  | { kind: "missing-record" }
  | { kind: "storage-unavailable" }
  | { kind: "corrupt-record" };

export function savePrivateVaultRecord(
  record: PrivateVaultRecord,
): PrivateVaultStorageSaveResult {
  const storage = safeGetPrivateVaultStorage();

  if (!storage) {
    return { kind: "storage-unavailable" };
  }

  try {
    storage.setItem(PRIVATE_VAULT_STORAGE_KEY, JSON.stringify(record));
    return { kind: "saved" };
  } catch {
    return { kind: "write-failed" };
  }
}

export function loadPrivateVaultRecord(): PrivateVaultStorageLoadResult {
  const storage = safeGetPrivateVaultStorage();

  if (!storage) {
    return { kind: "storage-unavailable" };
  }

  try {
    const raw = storage.getItem(PRIVATE_VAULT_STORAGE_KEY);
    if (!raw) {
      return { kind: "missing-record" };
    }

    const record = safeParsePrivateVaultRecord(raw);
    return record ? { kind: "success", record } : { kind: "corrupt-record" };
  } catch {
    return { kind: "storage-unavailable" };
  }
}

function safeGetPrivateVaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function safeParsePrivateVaultRecord(raw: string): PrivateVaultRecord | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isPrivateVaultRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
