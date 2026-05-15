import {
  type CanonicalNoteCommitment,
  type CanonicalNoteV1,
  CanonicalNoteValidationError,
  deriveCanonicalNoteCommitment,
} from "./canonicalNote";

export const SHIELDED_STATE_SNAPSHOT_VERSION_V1 = 1 as const;
export const SHIELDED_STATE_ROOT_SCHEME_V1 = "sha256-append-only-commitment-list-v1" as const;
export const PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC = {
  storageRole: "private-pool-v2-production-tree",
  privacyPrimitive: true,
  productionSharedTree: true,
  treeModel: "private-pool-v2-shared-merkle-tree-v1",
  truthNote:
    "Wired to Private Pool v2 shared production shielded-state tree for narrow v1; beta preview only.",
} as const;

export type ShieldedStateSnapshotVersion = typeof SHIELDED_STATE_SNAPSHOT_VERSION_V1;
export type PrivatePoolV2ShieldedStateDiagnostic =
  typeof PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC;

export type ShieldedCommitmentIndex = number;

export type ShieldedStateRoot = {
  scheme: typeof SHIELDED_STATE_ROOT_SCHEME_V1;
  value: string;
  leafCount: number;
  diagnostic: PrivatePoolV2ShieldedStateDiagnostic;
};

export type ShieldedCommitmentEntry = {
  index: ShieldedCommitmentIndex;
  commitment: CanonicalNoteCommitment;
};

export type ShieldedCommitmentInsertionRecord = {
  index: ShieldedCommitmentIndex;
  commitment: CanonicalNoteCommitment;
  snapshot: ShieldedStateSnapshot;
  diagnostic: PrivatePoolV2ShieldedStateDiagnostic;
};

export type ShieldedStateSnapshot = {
  version: ShieldedStateSnapshotVersion;
  leafCount: number;
  root: ShieldedStateRoot;
  entries: ReadonlyArray<ShieldedCommitmentEntry>;
  diagnostic: PrivatePoolV2ShieldedStateDiagnostic;
};

/**
 * Legacy browser-local diagnostic list. This is useful for local continuity
 * checks and reviewer-facing state reconstruction, but it is not the production
 * shared shielded-state tree and must not carry privacy claims.
 */
export class AppendOnlyShieldedState {
  private readonly entries: ShieldedCommitmentEntry[] = [];

  static empty() {
    return new AppendOnlyShieldedState();
  }

  async insertCommitment(
    commitment: CanonicalNoteCommitment,
  ): Promise<ShieldedCommitmentInsertionRecord> {
    assertValidCanonicalNoteCommitment(commitment);

    const index = this.entries.length;
    const entry: ShieldedCommitmentEntry = {
      index,
      commitment,
    };

    this.entries.push(entry);

    return {
      index,
      commitment,
      snapshot: await this.getSnapshot(),
      diagnostic: PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC,
    };
  }

  async insertCanonicalNote(
    note: CanonicalNoteV1,
  ): Promise<ShieldedCommitmentInsertionRecord> {
    const commitment = await deriveCanonicalNoteCommitment(note);
    return this.insertCommitment(commitment);
  }

  getEntry(index: ShieldedCommitmentIndex): ShieldedCommitmentEntry | undefined {
    assertValidShieldedCommitmentIndex(index);
    return this.entries[index];
  }

  getEntries(): ReadonlyArray<ShieldedCommitmentEntry> {
    return this.entries.map((entry) => ({
      index: entry.index,
      commitment: {
        scheme: entry.commitment.scheme,
        value: entry.commitment.value,
      },
    }));
  }

  async getSnapshot(): Promise<ShieldedStateSnapshot> {
    const entries = this.getEntries();

    return {
      version: SHIELDED_STATE_SNAPSHOT_VERSION_V1,
      leafCount: entries.length,
      root: await deriveShieldedStateRoot(entries),
      entries,
      diagnostic: PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC,
    };
  }
}

export async function deriveShieldedStateRoot(
  entries: ReadonlyArray<ShieldedCommitmentEntry>,
): Promise<ShieldedStateRoot> {
  for (const entry of entries) {
    assertValidShieldedCommitmentEntry(entry);
  }

  const bytes = concatBytes(
    encodeUtf8("vanta:shielded-state:append-only-root:v1"),
    encodeU32(entries.length),
    ...entries.map((entry) =>
      concatBytes(
        encodeU32(entry.index),
        encodeLengthPrefixedUtf8(entry.commitment.scheme),
        encodeLengthPrefixedUtf8(entry.commitment.value),
      ),
    ),
  );

  return {
    scheme: SHIELDED_STATE_ROOT_SCHEME_V1,
    value: await deriveSha256Hex(bytes),
    leafCount: entries.length,
    diagnostic: PRIVATE_POOL_V2_SHIELDED_STATE_DIAGNOSTIC,
  };
}

export function assertValidShieldedCommitmentIndex(
  value: unknown,
): asserts value is ShieldedCommitmentIndex {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new CanonicalNoteValidationError(
      `Shielded commitment index must be a non-negative integer, received ${String(value)}.`,
    );
  }
}

export function assertValidCanonicalNoteCommitment(
  value: unknown,
): asserts value is CanonicalNoteCommitment {
  if (!isRecord(value)) {
    throw new CanonicalNoteValidationError("Shielded state commitment must be an object.");
  }

  const commitment = value as Partial<CanonicalNoteCommitment>;

  if (typeof commitment.scheme !== "string" || commitment.scheme.trim().length === 0) {
    throw new CanonicalNoteValidationError(
      "Shielded state commitment scheme must be a non-empty string.",
    );
  }

  if (typeof commitment.value !== "string" || !/^0x[0-9a-f]{64}$/.test(commitment.value)) {
    throw new CanonicalNoteValidationError(
      "Shielded state commitment value must be a 32-byte lowercase hex digest.",
    );
  }
}

export function assertValidShieldedCommitmentEntry(
  value: unknown,
): asserts value is ShieldedCommitmentEntry {
  if (!isRecord(value)) {
    throw new CanonicalNoteValidationError("Shielded commitment entry must be an object.");
  }

  assertValidShieldedCommitmentIndex(value.index);
  assertValidCanonicalNoteCommitment(value.commitment);
}

export async function getShieldedStateDeterminismExample() {
  const state = AppendOnlyShieldedState.empty();

  await state.insertCommitment({
    scheme: "sha256-canonical-note-v1",
    value: "0x1111111111111111111111111111111111111111111111111111111111111111",
  });

  await state.insertCommitment({
    scheme: "sha256-canonical-note-v1",
    value: "0x2222222222222222222222222222222222222222222222222222222222222222",
  });

  return state.getSnapshot();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function deriveSha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return `0x${encodeHex(new Uint8Array(digest))}`;
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function encodeU32(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new CanonicalNoteValidationError(`Value ${String(value)} cannot be encoded as u32.`);
  }

  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value, false);
  return bytes;
}

function encodeLengthPrefixedUtf8(value: string): Uint8Array {
  const bytes = encodeUtf8(value);
  return concatBytes(encodeU32(bytes.length), bytes);
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined;
}

function encodeHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
