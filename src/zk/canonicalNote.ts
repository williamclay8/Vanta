import { isRecord } from "../isRecord";
import {
  phase1OwnerRecoveryPayloadCryptoAdapter,
  type OwnerRecoveryCryptoAdapter,
} from "./crypto/ownerRecoveryPayloadCrypto";
import { poseidon10 } from "poseidon-lite";

export const CANONICAL_NOTE_V1 = 1 as const;
export const CANONICAL_NOTE_ENCODING_V1 = "vanta.canonical-note.encoding.v1" as const;
export const CANONICAL_NOTE_COMMITMENT_SCHEME_V1 = "sha256-canonical-note-v1" as const;
export const CANONICAL_NOTE_PROVING_COMMITMENT_SCHEME_V1 =
  "poseidon-bn254-canonical-note-proving-commitment-v1" as const;
export const CANONICAL_NOTE_PROVING_FIELD_ENCODING_V1 =
  "vanta.canonical-note.proving-fields.poseidon-bn254.v1" as const;
export const CANONICAL_NOTE_NULLIFIER_BASIS_SCHEME_V1 =
  "sha256-placeholder-nullifier-basis-v1" as const;
export const CANONICAL_NOTE_PAYLOAD_ENCODING_V1 =
  "vanta.canonical-note.payload.encoding.v1" as const;
export const CANONICAL_NOTE_PAYLOAD_VERSION_V1 = 1 as const;
export const CANONICAL_NOTE_PAYLOAD_SCHEME_V1 =
  "owner-recovery-x25519-xchacha20poly1305-v2" as const;
export const CANONICAL_NOTE_COMMITMENT_PREIMAGE_ORDER = [
  "version",
  "assetId",
  "amount",
  "ownerPublicKey",
  "noteNonce",
  "noteSecret",
  "blinding",
  "derivationTag",
] as const;
export const CANONICAL_NOTE_PROVING_COMMITMENT_FIELD_ORDER = [
  "version",
  "assetIdHi",
  "assetIdLo",
  "amountLo",
  "amountHi",
  "ownerPublicKey",
  "noteNonce",
  "noteSecret",
  "blinding",
  "derivationTag",
] as const;

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const U64_MASK = (1n << 64n) - 1n;
const U128_MAX = (1n << 128n) - 1n;

export type CanonicalNoteVersion = typeof CANONICAL_NOTE_V1;
export type CanonicalAssetId = string;
export type CanonicalOwnerPublicKey = string;
export type CanonicalBytes32 = string;

export type CanonicalNoteSourceKind =
  | "shield"
  | "send"
  | "swap"
  | "change"
  | "unshield_change"
  | "unknown";

export type NoteCreationHint = {
  sourceKind: CanonicalNoteSourceKind;
  sourceAssetHint?: string;
  sourceTxSignatureHint?: string;
  sourceTransitionIdHint?: string;
};

export type CanonicalNoteV1 = {
  version: CanonicalNoteVersion;
  assetId: CanonicalAssetId;
  amount: bigint;
  ownerPublicKey: CanonicalOwnerPublicKey;
  noteNonce: CanonicalBytes32;
  noteSecret: CanonicalBytes32;
  blinding: CanonicalBytes32;
  derivationTag: CanonicalBytes32;
  creationHint?: NoteCreationHint;
};

export type SerializedCanonicalNoteV1 = {
  version: CanonicalNoteVersion;
  assetId: CanonicalAssetId;
  amount: string;
  ownerPublicKey: CanonicalOwnerPublicKey;
  noteNonce: CanonicalBytes32;
  noteSecret: CanonicalBytes32;
  blinding: CanonicalBytes32;
  derivationTag: CanonicalBytes32;
  creationHint?: NoteCreationHint;
};

export type CanonicalNoteCommitment = {
  scheme: typeof CANONICAL_NOTE_COMMITMENT_SCHEME_V1;
  value: string;
};

export type CanonicalNoteProvingFields = {
  encoding: typeof CANONICAL_NOTE_PROVING_FIELD_ENCODING_V1;
  fieldOrder: typeof CANONICAL_NOTE_PROVING_COMMITMENT_FIELD_ORDER;
  version: bigint;
  assetIdHi: bigint;
  assetIdLo: bigint;
  amountLo: bigint;
  amountHi: bigint;
  ownerPublicKey: bigint;
  noteNonce: bigint;
  noteSecret: bigint;
  blinding: bigint;
  derivationTag: bigint;
};

export type CanonicalNoteProvingCommitment = {
  scheme: typeof CANONICAL_NOTE_PROVING_COMMITMENT_SCHEME_V1;
  fieldEncoding: typeof CANONICAL_NOTE_PROVING_FIELD_ENCODING_V1;
  value: string;
  fieldValue: string;
};

export type CanonicalNullifierBasis = {
  scheme: typeof CANONICAL_NOTE_NULLIFIER_BASIS_SCHEME_V1;
  value: string;
};

export type CanonicalEncryptedPayload = {
  scheme: typeof CANONICAL_NOTE_PAYLOAD_SCHEME_V1;
  encoding: typeof CANONICAL_NOTE_PAYLOAD_ENCODING_V1;
  payloadVersion: typeof CANONICAL_NOTE_PAYLOAD_VERSION_V1;
  recipientPublicKey: CanonicalOwnerPublicKey;
  payloadNonce: CanonicalBytes32;
  ciphertext: string;
  authTag: string;
};

export type CanonicalNoteArtifacts = {
  commitment: CanonicalNoteCommitment;
  provingCommitment: CanonicalNoteProvingCommitment;
  nullifierBasis: CanonicalNullifierBasis;
  encryptedPayload: CanonicalEncryptedPayload;
};

export type CanonicalCommitmentEncoding = {
  encoding: typeof CANONICAL_NOTE_ENCODING_V1;
  preimageFieldOrder: typeof CANONICAL_NOTE_COMMITMENT_PREIMAGE_ORDER;
  bytes: Uint8Array;
};

export type CanonicalNoteConstructionInput = {
  assetId: CanonicalAssetId;
  amount: bigint | number | string;
  ownerPublicKey: CanonicalOwnerPublicKey;
  noteNonce?: CanonicalBytes32;
  noteSecret?: CanonicalBytes32;
  blinding?: CanonicalBytes32;
  derivationTag?: CanonicalBytes32;
  creationHint?: NoteCreationHint;
};

export type CanonicalNoteOwnerContext = {
  ownerPublicKey: CanonicalOwnerPublicKey;
  recoverySecret: string;
  derivationContext?: string;
};

export type CanonicalEncryptedPayloadOptions = {
  payloadNonce?: CanonicalBytes32;
};

export type CanonicalNoteArtifactDeriver = {
  deriveCommitment(note: CanonicalNoteV1): Promise<CanonicalNoteCommitment>;
  deriveProvingCommitment?(
    note: CanonicalNoteV1,
  ): Promise<CanonicalNoteProvingCommitment>;
  deriveNullifierBasis(note: CanonicalNoteV1): Promise<CanonicalNullifierBasis>;
  deriveEncryptedPayload(
    note: CanonicalNoteV1,
    ownerContext: CanonicalNoteOwnerContext,
    options?: CanonicalEncryptedPayloadOptions,
  ): Promise<CanonicalEncryptedPayload>;
};

export class CanonicalNoteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalNoteValidationError";
  }
}

export function createCanonicalNote(input: CanonicalNoteConstructionInput): CanonicalNoteV1 {
  const note: CanonicalNoteV1 = {
    version: CANONICAL_NOTE_V1,
    assetId: normalizeNonEmptyString(input.assetId, "assetId"),
    amount: normalizeAmount(input.amount),
    ownerPublicKey: normalizeNonEmptyString(input.ownerPublicKey, "ownerPublicKey"),
    noteNonce: normalizeOptionalBytes32(input.noteNonce) ?? generatePlaceholderBytes32(),
    noteSecret: normalizeOptionalBytes32(input.noteSecret) ?? generatePlaceholderBytes32(),
    blinding: normalizeOptionalBytes32(input.blinding) ?? generatePlaceholderBytes32(),
    derivationTag: normalizeOptionalBytes32(input.derivationTag) ?? generatePlaceholderBytes32(),
    creationHint: normalizeCreationHint(input.creationHint),
  };

  assertValidCanonicalNote(note);
  return note;
}

export async function deriveCanonicalNoteArtifacts(
  note: CanonicalNoteV1,
  ownerContext: CanonicalNoteOwnerContext,
  deriver: CanonicalNoteArtifactDeriver = placeholderCanonicalNoteArtifactDeriver,
): Promise<CanonicalNoteArtifacts> {
  assertValidCanonicalNote(note);
  assertValidCanonicalNoteOwnerContext(ownerContext);

  const [commitment, provingCommitment, nullifierBasis, encryptedPayload] = await Promise.all([
    deriver.deriveCommitment(note),
    deriver.deriveProvingCommitment
      ? deriver.deriveProvingCommitment(note)
      : deriveCanonicalNoteProvingCommitment(note),
    deriver.deriveNullifierBasis(note),
    deriver.deriveEncryptedPayload(note, ownerContext),
  ]);

  return {
    commitment,
    provingCommitment,
    nullifierBasis,
    encryptedPayload,
  };
}

export async function deriveCanonicalNoteCommitment(
  note: CanonicalNoteV1,
  deriver: Pick<CanonicalNoteArtifactDeriver, "deriveCommitment"> = placeholderCanonicalNoteArtifactDeriver,
): Promise<CanonicalNoteCommitment> {
  assertValidCanonicalNote(note);
  return deriver.deriveCommitment(note);
}

export async function deriveCanonicalNoteProvingFields(
  note: CanonicalNoteV1,
): Promise<CanonicalNoteProvingFields> {
  assertValidCanonicalNote(note);

  const assetIdFields = await deriveStringFieldPair(
    "vanta:canonical-note:asset-id-field-pair:v1",
    note.assetId,
  );

  return {
    encoding: CANONICAL_NOTE_PROVING_FIELD_ENCODING_V1,
    fieldOrder: CANONICAL_NOTE_PROVING_COMMITMENT_FIELD_ORDER,
    version: BigInt(note.version),
    assetIdHi: assetIdFields.hi,
    assetIdLo: assetIdFields.lo,
    amountLo: note.amount & U64_MASK,
    amountHi: note.amount >> 64n,
    ownerPublicKey: await deriveStringField(
      "vanta:canonical-note:owner-public-key-field:v1",
      note.ownerPublicKey,
    ),
    noteNonce: deriveFieldFromBytes32(note.noteNonce, "noteNonce"),
    noteSecret: deriveFieldFromBytes32(note.noteSecret, "noteSecret"),
    blinding: deriveFieldFromBytes32(note.blinding, "blinding"),
    derivationTag: deriveFieldFromBytes32(note.derivationTag, "derivationTag"),
  };
}

export async function deriveCanonicalNoteProvingCommitment(
  note: CanonicalNoteV1,
): Promise<CanonicalNoteProvingCommitment> {
  const fields = await deriveCanonicalNoteProvingFields(note);
  const fieldValue = poseidon10(getCanonicalNoteProvingFieldValueVector(fields));

  return {
    scheme: CANONICAL_NOTE_PROVING_COMMITMENT_SCHEME_V1,
    fieldEncoding: CANONICAL_NOTE_PROVING_FIELD_ENCODING_V1,
    value: encodeFieldHex(fieldValue),
    fieldValue: fieldValue.toString(10),
  };
}

export function getCanonicalNoteProvingFieldValueVector(
  fields: CanonicalNoteProvingFields,
): bigint[] {
  return [
    fields.version,
    fields.assetIdHi,
    fields.assetIdLo,
    fields.amountLo,
    fields.amountHi,
    fields.ownerPublicKey,
    fields.noteNonce,
    fields.noteSecret,
    fields.blinding,
    fields.derivationTag,
  ];
}

export async function deriveCanonicalNullifierBasis(
  note: CanonicalNoteV1,
  deriver: Pick<CanonicalNoteArtifactDeriver, "deriveNullifierBasis"> = placeholderCanonicalNoteArtifactDeriver,
): Promise<CanonicalNullifierBasis> {
  assertValidCanonicalNote(note);
  return deriver.deriveNullifierBasis(note);
}

export async function deriveCanonicalEncryptedPayload(
  note: CanonicalNoteV1,
  ownerContext: CanonicalNoteOwnerContext,
  options?: CanonicalEncryptedPayloadOptions,
  deriver: Pick<CanonicalNoteArtifactDeriver, "deriveEncryptedPayload"> = placeholderCanonicalNoteArtifactDeriver,
): Promise<CanonicalEncryptedPayload> {
  assertValidCanonicalNote(note);
  assertValidCanonicalNoteOwnerContext(ownerContext);
  return deriver.deriveEncryptedPayload(note, ownerContext, options);
}

export function serializeCanonicalNote(note: CanonicalNoteV1): string {
  assertValidCanonicalNote(note);
  return JSON.stringify(toSerializedCanonicalNote(note));
}

export function encodeCanonicalNote(note: CanonicalNoteV1): Uint8Array {
  assertValidCanonicalNote(note);

  const serialized = toSerializedCanonicalNote(note);
  const hint = serialized.creationHint;

  return concatBytes(
    encodeUtf8(CANONICAL_NOTE_ENCODING_V1),
    encodeU8(serialized.version),
    encodeLengthPrefixedUtf8(serialized.assetId),
    encodeU128(note.amount),
    encodeLengthPrefixedUtf8(serialized.ownerPublicKey),
    encodeFixedHex32(serialized.noteNonce, "noteNonce"),
    encodeFixedHex32(serialized.noteSecret, "noteSecret"),
    encodeFixedHex32(serialized.blinding, "blinding"),
    encodeFixedHex32(serialized.derivationTag, "derivationTag"),
    encodeBoolean(hint !== undefined),
    hint
      ? concatBytes(
          encodeLengthPrefixedUtf8(hint.sourceKind),
          encodeOptionalLengthPrefixedUtf8(hint.sourceAssetHint),
          encodeOptionalLengthPrefixedUtf8(hint.sourceTxSignatureHint),
          encodeOptionalLengthPrefixedUtf8(hint.sourceTransitionIdHint),
        )
      : new Uint8Array(),
  );
}

export function decodeCanonicalNote(encoded: Uint8Array): CanonicalNoteV1 {
  const reader = new ByteReader(encoded);

  reader.expectFixedBytes(encodeUtf8(CANONICAL_NOTE_ENCODING_V1), "canonical note encoding");

  const note: CanonicalNoteV1 = {
    version: normalizeVersion(reader.readU8("version")),
    assetId: normalizeNonEmptyString(reader.readLengthPrefixedUtf8("assetId"), "assetId"),
    amount: normalizeAmount(reader.readU128("amount")),
    ownerPublicKey: normalizeNonEmptyString(
      reader.readLengthPrefixedUtf8("ownerPublicKey"),
      "ownerPublicKey",
    ),
    noteNonce: normalizeBytes32(reader.readFixedHex32("noteNonce"), "noteNonce"),
    noteSecret: normalizeBytes32(reader.readFixedHex32("noteSecret"), "noteSecret"),
    blinding: normalizeBytes32(reader.readFixedHex32("blinding"), "blinding"),
    derivationTag: normalizeBytes32(reader.readFixedHex32("derivationTag"), "derivationTag"),
    creationHint: reader.readBoolean("creationHint presence")
      ? normalizeCreationHint({
          sourceKind: reader.readLengthPrefixedUtf8("creationHint.sourceKind"),
          sourceAssetHint: reader.readOptionalLengthPrefixedUtf8(
            "creationHint.sourceAssetHint",
          ),
          sourceTxSignatureHint: reader.readOptionalLengthPrefixedUtf8(
            "creationHint.sourceTxSignatureHint",
          ),
          sourceTransitionIdHint: reader.readOptionalLengthPrefixedUtf8(
            "creationHint.sourceTransitionIdHint",
          ),
        })
      : undefined,
  };

  reader.assertFullyConsumed("canonical note");
  assertValidCanonicalNote(note);
  return note;
}

export function encodeCanonicalNoteForCommitment(note: CanonicalNoteV1): CanonicalCommitmentEncoding {
  assertValidCanonicalNote(note);

  // Commitment preimage excludes creationHint by design. The hint is recovery metadata, not
  // part of canonical commitment correctness. The fixed order below is the protocol order.
  const bytes = concatBytes(
    encodeUtf8(`${CANONICAL_NOTE_ENCODING_V1}.commitment-preimage`),
    encodeU8(note.version),
    encodeLengthPrefixedUtf8(note.assetId),
    encodeU128(note.amount),
    encodeLengthPrefixedUtf8(note.ownerPublicKey),
    encodeFixedHex32(note.noteNonce, "noteNonce"),
    encodeFixedHex32(note.noteSecret, "noteSecret"),
    encodeFixedHex32(note.blinding, "blinding"),
    encodeFixedHex32(note.derivationTag, "derivationTag"),
  );

  return {
    encoding: CANONICAL_NOTE_ENCODING_V1,
    preimageFieldOrder: CANONICAL_NOTE_COMMITMENT_PREIMAGE_ORDER,
    bytes,
  };
}

export function encodeCanonicalEncryptedPayload(payload: CanonicalEncryptedPayload): Uint8Array {
  assertValidCanonicalEncryptedPayload(payload);

  return concatBytes(
    encodeUtf8(CANONICAL_NOTE_PAYLOAD_ENCODING_V1),
    encodeU8(payload.payloadVersion),
    encodeLengthPrefixedUtf8(payload.scheme),
    encodeLengthPrefixedUtf8(payload.recipientPublicKey),
    encodeFixedHex32(payload.payloadNonce, "payloadNonce"),
    encodeLengthPrefixedBytes(decodeBase64(payload.ciphertext, "ciphertext")),
    encodeFixedHex32(payload.authTag, "authTag"),
  );
}

export function decodeCanonicalEncryptedPayload(encoded: Uint8Array): CanonicalEncryptedPayload {
  const reader = new ByteReader(encoded);

  reader.expectFixedBytes(
    encodeUtf8(CANONICAL_NOTE_PAYLOAD_ENCODING_V1),
    "canonical encrypted payload encoding",
  );

  const payload: CanonicalEncryptedPayload = {
    payloadVersion: normalizePayloadVersion(reader.readU8("payloadVersion")),
    scheme: normalizePayloadScheme(reader.readLengthPrefixedUtf8("scheme")),
    encoding: CANONICAL_NOTE_PAYLOAD_ENCODING_V1,
    recipientPublicKey: normalizeNonEmptyString(
      reader.readLengthPrefixedUtf8("recipientPublicKey"),
      "recipientPublicKey",
    ),
    payloadNonce: normalizeBytes32(reader.readFixedHex32("payloadNonce"), "payloadNonce"),
    ciphertext: encodeBase64(reader.readLengthPrefixedBytes("ciphertext")),
    authTag: normalizeBytes32(reader.readFixedHex32("authTag"), "authTag"),
  };

  reader.assertFullyConsumed("canonical encrypted payload");
  assertValidCanonicalEncryptedPayload(payload);
  return payload;
}

export async function recoverCanonicalNoteFromPayload(
  payload: CanonicalEncryptedPayload,
  ownerContext: CanonicalNoteOwnerContext,
  cryptoAdapter: OwnerRecoveryCryptoAdapter = phase1OwnerRecoveryPayloadCryptoAdapter,
): Promise<CanonicalNoteV1> {
  assertValidCanonicalEncryptedPayload(payload);
  assertValidCanonicalNoteOwnerContext(ownerContext);
  const plaintext = await cryptoAdapter.decrypt({ ownerContext, payload });
  const note = decodeCanonicalNote(plaintext);

  if (note.ownerPublicKey !== ownerContext.ownerPublicKey) {
    throw new CanonicalNoteValidationError(
      "Recovered canonical note ownership does not match the provided owner context.",
    );
  }

  return note;
}

export function deserializeCanonicalNote(serialized: string): CanonicalNoteV1 {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new CanonicalNoteValidationError(
      `The canonical note payload could not be parsed: ${getErrorMessage(error)}`,
    );
  }

  return parseSerializedCanonicalNote(parsed);
}

export function parseSerializedCanonicalNote(parsed: unknown): CanonicalNoteV1 {
  if (!isRecord(parsed)) {
    throw new CanonicalNoteValidationError("The canonical note payload must be an object.");
  }

  const note: CanonicalNoteV1 = {
    version: normalizeVersion(parsed.version),
    assetId: normalizeNonEmptyString(parsed.assetId, "assetId"),
    amount: normalizeAmount(parsed.amount),
    ownerPublicKey: normalizeNonEmptyString(parsed.ownerPublicKey, "ownerPublicKey"),
    noteNonce: normalizeBytes32(parsed.noteNonce, "noteNonce"),
    noteSecret: normalizeBytes32(parsed.noteSecret, "noteSecret"),
    blinding: normalizeBytes32(parsed.blinding, "blinding"),
    derivationTag: normalizeBytes32(parsed.derivationTag, "derivationTag"),
    creationHint: normalizeCreationHint(parsed.creationHint),
  };

  assertValidCanonicalNote(note);
  return note;
}

export function toSerializedCanonicalNote(note: CanonicalNoteV1): SerializedCanonicalNoteV1 {
  assertValidCanonicalNote(note);

  return {
    version: note.version,
    assetId: note.assetId,
    amount: note.amount.toString(10),
    ownerPublicKey: note.ownerPublicKey,
    noteNonce: note.noteNonce,
    noteSecret: note.noteSecret,
    blinding: note.blinding,
    derivationTag: note.derivationTag,
    creationHint: note.creationHint,
  };
}

export function isCanonicalNoteV1(value: unknown): value is CanonicalNoteV1 {
  try {
    assertValidCanonicalNote(value);
    return true;
  } catch {
    return false;
  }
}

export function assertValidCanonicalNote(value: unknown): asserts value is CanonicalNoteV1 {
  if (!isRecord(value)) {
    throw new CanonicalNoteValidationError("Canonical note must be an object.");
  }

  const note = value as Partial<CanonicalNoteV1>;

  normalizeVersion(note.version);
  normalizeNonEmptyString(note.assetId, "assetId");
  normalizeAmount(note.amount);
  normalizeNonEmptyString(note.ownerPublicKey, "ownerPublicKey");
  normalizeBytes32(note.noteNonce, "noteNonce");
  normalizeBytes32(note.noteSecret, "noteSecret");
  normalizeBytes32(note.blinding, "blinding");
  normalizeBytes32(note.derivationTag, "derivationTag");
  normalizeCreationHint(note.creationHint);
}

export function assertValidCanonicalNoteOwnerContext(
  value: unknown,
): asserts value is CanonicalNoteOwnerContext {
  if (!isRecord(value)) {
    throw new CanonicalNoteValidationError("Canonical note owner context must be an object.");
  }

  normalizeNonEmptyString(value.ownerPublicKey, "ownerPublicKey");
  normalizeNonEmptyString(value.recoverySecret, "recoverySecret");

  if (value.derivationContext !== undefined) {
    normalizeNonEmptyString(value.derivationContext, "derivationContext");
  }
}

export function assertValidCanonicalEncryptedPayload(
  value: unknown,
): asserts value is CanonicalEncryptedPayload {
  if (!isRecord(value)) {
    throw new CanonicalNoteValidationError("Canonical encrypted payload must be an object.");
  }

  const payload = value as Partial<CanonicalEncryptedPayload>;

  normalizePayloadScheme(payload.scheme);

  if (payload.encoding !== CANONICAL_NOTE_PAYLOAD_ENCODING_V1) {
    throw new CanonicalNoteValidationError(
      `Unsupported canonical encrypted payload encoding: ${String(payload.encoding)}`,
    );
  }

  normalizePayloadVersion(payload.payloadVersion);
  normalizeNonEmptyString(payload.recipientPublicKey, "recipientPublicKey");
  normalizeBytes32(payload.payloadNonce, "payloadNonce");
  decodeBase64(payload.ciphertext, "ciphertext");
  normalizeBytes32(payload.authTag, "authTag");
}

export const placeholderCanonicalNoteArtifactDeriver: CanonicalNoteArtifactDeriver = {
  async deriveCommitment(note) {
    const commitmentEncoding = encodeCanonicalNoteForCommitment(note);
    const digest = await deriveSha256Hex(commitmentEncoding.bytes);

    return {
      scheme: CANONICAL_NOTE_COMMITMENT_SCHEME_V1,
      value: digest,
    };
  },

  async deriveProvingCommitment(note) {
    return deriveCanonicalNoteProvingCommitment(note);
  },

  async deriveNullifierBasis(note) {
    const basis = JSON.stringify({
      version: note.version,
      ownerPublicKey: note.ownerPublicKey,
      noteNonce: note.noteNonce,
      noteSecret: note.noteSecret,
      derivationTag: note.derivationTag,
    });

    const digest = await derivePlaceholderDigest(
      "vanta:canonical-note-nullifier-basis:placeholder:v1",
      basis,
    );

    return {
      scheme: CANONICAL_NOTE_NULLIFIER_BASIS_SCHEME_V1,
      value: digest,
    };
  },

  async deriveEncryptedPayload(note, ownerContext, options) {
    assertValidCanonicalNoteOwnerContext(ownerContext);
    const payloadNonce =
      normalizeOptionalBytes32(options?.payloadNonce) ?? generatePlaceholderBytes32();
    return phase1OwnerRecoveryPayloadCryptoAdapter.encrypt({
      ownerContext,
      recipientPublicKey: note.ownerPublicKey,
      payloadNonce,
      plaintext: encodeCanonicalNote(note),
    });
  },
};

function normalizeVersion(value: unknown): CanonicalNoteVersion {
  if (value !== CANONICAL_NOTE_V1) {
    throw new CanonicalNoteValidationError(
      `Unsupported canonical note version: ${String(value)}`,
    );
  }

  return CANONICAL_NOTE_V1;
}

function normalizePayloadVersion(value: unknown): typeof CANONICAL_NOTE_PAYLOAD_VERSION_V1 {
  if (value !== CANONICAL_NOTE_PAYLOAD_VERSION_V1) {
    throw new CanonicalNoteValidationError(
      `Unsupported canonical encrypted payload version: ${String(value)}`,
    );
  }

  return CANONICAL_NOTE_PAYLOAD_VERSION_V1;
}

function normalizePayloadScheme(value: unknown): typeof CANONICAL_NOTE_PAYLOAD_SCHEME_V1 {
  if (value !== CANONICAL_NOTE_PAYLOAD_SCHEME_V1) {
    throw new CanonicalNoteValidationError(
      `Unsupported canonical encrypted payload scheme: ${String(value)}`,
    );
  }

  return CANONICAL_NOTE_PAYLOAD_SCHEME_V1;
}

function normalizeAmount(value: bigint | number | string | unknown): bigint {
  try {
    const amount =
      typeof value === "bigint"
        ? value
        : typeof value === "number"
          ? BigInt(value)
          : typeof value === "string"
            ? BigInt(value)
            : null;

    if (amount === null) {
      throw new Error("Amount must be a bigint, number, or string.");
    }

    if (amount < 0n) {
      throw new Error("Amount cannot be negative.");
    }

    if (amount > U128_MAX) {
      throw new Error("Amount cannot exceed u128 max.");
    }

    return amount;
  } catch (error) {
    throw new CanonicalNoteValidationError(
      `Invalid canonical note amount: ${getErrorMessage(error)}`,
    );
  }
}

function normalizeCreationHint(value: unknown): NoteCreationHint | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new CanonicalNoteValidationError("creationHint must be an object when present.");
  }

  const sourceKind = normalizeSourceKind(value.sourceKind);

  return {
    sourceKind,
    sourceAssetHint: normalizeOptionalString(value.sourceAssetHint),
    sourceTxSignatureHint: normalizeOptionalString(value.sourceTxSignatureHint),
    sourceTransitionIdHint: normalizeOptionalString(value.sourceTransitionIdHint),
  };
}

function normalizeSourceKind(value: unknown): CanonicalNoteSourceKind {
  switch (value) {
    case "shield":
    case "send":
    case "swap":
    case "change":
    case "unshield_change":
    case "unknown":
      return value;
    default:
      throw new CanonicalNoteValidationError(
        `Unsupported canonical note source kind: ${String(value)}`,
      );
  }
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeNonEmptyString(value, "optionalString");
}

function normalizeNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CanonicalNoteValidationError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeOptionalBytes32(value: unknown): CanonicalBytes32 | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeBytes32(value, "bytes32");
}

function normalizeBytes32(value: unknown, fieldName: string): CanonicalBytes32 {
  const normalized = normalizeNonEmptyString(value, fieldName);

  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new CanonicalNoteValidationError(
      `${fieldName} must be a 32-byte hex string.`,
    );
  }

  return normalized.toLowerCase();
}

function generatePlaceholderBytes32(): CanonicalBytes32 {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${encodeHex(bytes)}`;
}

async function deriveStringFieldPair(domain: string, value: string) {
  const digest = await deriveSha256Bytes(
    encodeUtf8(`${domain}\n${normalizeNonEmptyString(value, "fieldSource")}`),
  );

  return {
    hi: bytesToBigInt(digest.slice(0, 16)),
    lo: bytesToBigInt(digest.slice(16, 32)),
  };
}

async function deriveStringField(domain: string, value: string) {
  const digest = await deriveSha256Bytes(
    encodeUtf8(`${domain}\n${normalizeNonEmptyString(value, "fieldSource")}`),
  );
  return bytesToBigInt(digest) % BN254_SCALAR_FIELD;
}

function deriveFieldFromBytes32(value: string, fieldName: string) {
  return bytesToBigInt(decodeFixedHex(value, fieldName, 32)) % BN254_SCALAR_FIELD;
}

function bytesToBigInt(bytes: Uint8Array) {
  let value = 0n;

  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  return value;
}

function encodeFieldHex(value: bigint) {
  if (value < 0n || value >= BN254_SCALAR_FIELD) {
    throw new CanonicalNoteValidationError("BN254 field value is outside the scalar field.");
  }

  return `0x${value.toString(16).padStart(64, "0")}`;
}

async function derivePlaceholderDigest(domain: string, payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${domain}\n${payload}`);
  return deriveSha256Hex(bytes);
}

function encodeHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function deriveSha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return `0x${encodeHex(new Uint8Array(digest))}`;
}

async function deriveSha256Bytes(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return new Uint8Array(digest);
}

function encodeU8(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new CanonicalNoteValidationError(`Value ${String(value)} cannot be encoded as u8.`);
  }

  return Uint8Array.of(value);
}

function encodeU16(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new CanonicalNoteValidationError(`Value ${String(value)} cannot be encoded as u16.`);
  }

  const bytes = new Uint8Array(2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, value, false);
  return bytes;
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

function encodeU128(value: bigint): Uint8Array {
  if (value < 0n || value > (1n << 128n) - 1n) {
    throw new CanonicalNoteValidationError(`Value ${value.toString()} cannot be encoded as u128.`);
  }

  const bytes = new Uint8Array(16);
  let remaining = value;

  for (let index = 15; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  return bytes;
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function encodeLengthPrefixedUtf8(value: string): Uint8Array {
  const bytes = encodeUtf8(value);
  return concatBytes(encodeU32(bytes.length), bytes);
}

function encodeLengthPrefixedBytes(bytes: Uint8Array): Uint8Array {
  return concatBytes(encodeU32(bytes.length), bytes);
}

function encodeOptionalLengthPrefixedUtf8(value: string | undefined): Uint8Array {
  if (value === undefined) {
    return encodeBoolean(false);
  }

  return concatBytes(encodeBoolean(true), encodeLengthPrefixedUtf8(value));
}

function encodeBoolean(value: boolean): Uint8Array {
  return Uint8Array.of(value ? 1 : 0);
}

function encodeFixedHex32(value: string, fieldName: string): Uint8Array {
  return decodeFixedHex(value, fieldName, 32);
}

function decodeFixedHex(value: string, fieldName: string, expectedByteLength: number): Uint8Array {
  const normalized = normalizeBytes32(value, fieldName).replace(/^0x/, "");

  if (normalized.length !== expectedByteLength * 2) {
    throw new CanonicalNoteValidationError(
      `${fieldName} must encode exactly ${expectedByteLength} bytes.`,
    );
  }

  const bytes = new Uint8Array(expectedByteLength);

  for (let index = 0; index < expectedByteLength; index += 1) {
    const start = index * 2;
    const byte = Number.parseInt(normalized.slice(start, start + 2), 16);
    bytes[index] = byte;
  }

  return bytes;
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

export function getCanonicalNoteEncodingDeterminismExample() {
  const note = createCanonicalNote({
    assetId: "example.usdc.mainnet",
    amount: "250000",
    ownerPublicKey: "owner-recovery-key-example",
    noteNonce: "0x1111111111111111111111111111111111111111111111111111111111111111",
    noteSecret: "0x2222222222222222222222222222222222222222222222222222222222222222",
    blinding: "0x3333333333333333333333333333333333333333333333333333333333333333",
    derivationTag: "0x4444444444444444444444444444444444444444444444444444444444444444",
    creationHint: {
      sourceKind: "shield",
      sourceAssetHint: "USDC",
      sourceTransitionIdHint: "example-transition",
    },
  });

  return {
    serialized: serializeCanonicalNote(note),
    canonicalEncodingHex: `0x${encodeHex(encodeCanonicalNote(note))}`,
    commitmentPreimageHex: `0x${encodeHex(encodeCanonicalNoteForCommitment(note).bytes)}`,
  };
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64(value: unknown, fieldName: string): Uint8Array {
  const normalized = normalizeNonEmptyString(value, fieldName);

  try {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch (error) {
    throw new CanonicalNoteValidationError(
      `${fieldName} must be valid base64: ${getErrorMessage(error)}`,
    );
  }
}

export async function getCanonicalEncryptedPayloadDeterminismExample() {
  const note = createCanonicalNote({
    assetId: "example.usdc.mainnet",
    amount: "250000",
    ownerPublicKey: "owner-recovery-key-example",
    noteNonce: "0x1111111111111111111111111111111111111111111111111111111111111111",
    noteSecret: "0x2222222222222222222222222222222222222222222222222222222222222222",
    blinding: "0x3333333333333333333333333333333333333333333333333333333333333333",
    derivationTag: "0x4444444444444444444444444444444444444444444444444444444444444444",
    creationHint: {
      sourceKind: "shield",
      sourceAssetHint: "USDC",
      sourceTransitionIdHint: "example-transition",
    },
  });
  const ownerContext: CanonicalNoteOwnerContext = {
    ownerPublicKey: "owner-recovery-key-example",
    recoverySecret: "owner-recovery-secret-example",
    derivationContext: "phase1-example",
  };
  const payload = await deriveCanonicalEncryptedPayload(note, ownerContext, {
    payloadNonce: "0x5555555555555555555555555555555555555555555555555555555555555555",
  });
  const recoveredNote = await recoverCanonicalNoteFromPayload(payload, ownerContext);

  return {
    payload,
    encodedPayloadHex: `0x${encodeHex(encodeCanonicalEncryptedPayload(payload))}`,
    recoveredNote: toSerializedCanonicalNote(recoveredNote),
  };
}

class ByteReader {
  private readonly bytes: Uint8Array;
  private offset = 0;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  expectFixedBytes(expected: Uint8Array, fieldName: string) {
    const actual = this.readBytes(expected.length, fieldName);

    for (let index = 0; index < expected.length; index += 1) {
      if (actual[index] !== expected[index]) {
        throw new CanonicalNoteValidationError(
          `Unexpected ${fieldName} prefix while decoding protocol bytes.`,
        );
      }
    }
  }

  readU8(fieldName: string): number {
    return this.readBytes(1, fieldName)[0];
  }

  readU32(fieldName: string): number {
    const bytes = this.readBytes(4, fieldName);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getUint32(0, false);
  }

  readU128(fieldName: string): bigint {
    const bytes = this.readBytes(16, fieldName);
    let value = 0n;

    for (const byte of bytes) {
      value = (value << 8n) | BigInt(byte);
    }

    return value;
  }

  readBoolean(fieldName: string): boolean {
    const value = this.readU8(fieldName);

    if (value !== 0 && value !== 1) {
      throw new CanonicalNoteValidationError(`${fieldName} must encode a boolean byte.`);
    }

    return value === 1;
  }

  readLengthPrefixedBytes(fieldName: string): Uint8Array {
    return this.readBytes(this.readU32(`${fieldName} length`), fieldName);
  }

  readLengthPrefixedUtf8(fieldName: string): string {
    return new TextDecoder().decode(this.readLengthPrefixedBytes(fieldName));
  }

  readOptionalLengthPrefixedUtf8(fieldName: string): string | undefined {
    return this.readBoolean(`${fieldName} presence`)
      ? this.readLengthPrefixedUtf8(fieldName)
      : undefined;
  }

  readFixedHex32(fieldName: string): string {
    return `0x${encodeHex(this.readBytes(32, fieldName))}`;
  }

  assertFullyConsumed(context: string) {
    if (this.offset !== this.bytes.length) {
      throw new CanonicalNoteValidationError(
        `Unexpected trailing bytes remained while decoding ${context}.`,
      );
    }
  }

  private readBytes(length: number, fieldName: string): Uint8Array {
    if (length < 0 || this.offset + length > this.bytes.length) {
      throw new CanonicalNoteValidationError(
        `Insufficient bytes while decoding ${fieldName}.`,
      );
    }

    const slice = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
