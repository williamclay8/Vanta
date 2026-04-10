import type {
  CanonicalBytes32,
  CanonicalEncryptedPayload,
  CanonicalNoteOwnerContext,
} from "../canonicalNote";

const PHASE1_OWNER_RECOVERY_PAYLOAD_ENCODING_V1 =
  "vanta.canonical-note.payload.encoding.v1" as const;
const PHASE1_OWNER_RECOVERY_PAYLOAD_VERSION_V1 = 1 as const;
const PHASE1_OWNER_RECOVERY_PAYLOAD_SCHEME_V1 =
  "owner-recovery-xor-stream-sha256-v1" as const;

export type OwnerRecoveryEncryptionInput = {
  ownerContext: CanonicalNoteOwnerContext;
  recipientPublicKey: string;
  payloadNonce: CanonicalBytes32;
  plaintext: Uint8Array;
};

export type OwnerRecoveryDecryptionInput = {
  ownerContext: CanonicalNoteOwnerContext;
  payload: CanonicalEncryptedPayload;
};

export type OwnerRecoveryCryptoAdapter = {
  readonly scheme: typeof PHASE1_OWNER_RECOVERY_PAYLOAD_SCHEME_V1;
  encrypt(input: OwnerRecoveryEncryptionInput): Promise<CanonicalEncryptedPayload>;
  decrypt(input: OwnerRecoveryDecryptionInput): Promise<Uint8Array>;
};

export const phase1OwnerRecoveryPayloadCryptoAdapter: OwnerRecoveryCryptoAdapter = {
  scheme: PHASE1_OWNER_RECOVERY_PAYLOAD_SCHEME_V1,

  async encrypt(input) {
    assertValidOwnerRecoveryEncryptionInput(input);

    if (input.recipientPublicKey !== input.ownerContext.ownerPublicKey) {
      throwValidationError(
        "Canonical encrypted payload derivation requires an owner context for the note owner.",
      );
    }

    const keyMaterial = await deriveOwnerRecoveryKeyMaterial(
      input.ownerContext,
      input.payloadNonce,
    );
    const ciphertextBytes = await xorWithDerivedKeystream(input.plaintext, keyMaterial);
    const authTag = await deriveOwnerRecoveryAuthTag(
      input.ownerContext,
      input.payloadNonce,
      ciphertextBytes,
    );

    return {
      scheme: PHASE1_OWNER_RECOVERY_PAYLOAD_SCHEME_V1,
      encoding: PHASE1_OWNER_RECOVERY_PAYLOAD_ENCODING_V1,
      payloadVersion: PHASE1_OWNER_RECOVERY_PAYLOAD_VERSION_V1,
      recipientPublicKey: input.recipientPublicKey,
      payloadNonce: input.payloadNonce,
      ciphertext: encodeBase64(ciphertextBytes),
      authTag,
    };
  },

  async decrypt(input) {
    assertValidOwnerRecoveryDecryptionInput(input);

    if (input.payload.recipientPublicKey !== input.ownerContext.ownerPublicKey) {
      throwValidationError(
        "This canonical encrypted payload is not addressed to the provided owner context.",
      );
    }

    const ciphertextBytes = decodeBase64(input.payload.ciphertext, "ciphertext");
    const expectedAuthTag = await deriveOwnerRecoveryAuthTag(
      input.ownerContext,
      input.payload.payloadNonce,
      ciphertextBytes,
    );

    if (!constantTimeEqualHex(expectedAuthTag, input.payload.authTag)) {
      throwValidationError(
        "The canonical encrypted payload failed owner recovery authentication.",
      );
    }

    const keyMaterial = await deriveOwnerRecoveryKeyMaterial(
      input.ownerContext,
      input.payload.payloadNonce,
    );

    return xorWithDerivedKeystream(ciphertextBytes, keyMaterial);
  },
};

function assertValidOwnerRecoveryEncryptionInput(
  value: OwnerRecoveryEncryptionInput,
): asserts value is OwnerRecoveryEncryptionInput {
  if (!(value.plaintext instanceof Uint8Array)) {
    throwValidationError(
      "Owner recovery encryption input requires plaintext bytes.",
    );
  }

  normalizeNonEmptyString(value.recipientPublicKey, "recipientPublicKey");
  normalizeOwnerContext(value.ownerContext);
  normalizeBytes32(value.payloadNonce, "payloadNonce");
}

function assertValidOwnerRecoveryDecryptionInput(
  value: OwnerRecoveryDecryptionInput,
): asserts value is OwnerRecoveryDecryptionInput {
  normalizeOwnerContext(value.ownerContext);

  if (value.payload.scheme !== PHASE1_OWNER_RECOVERY_PAYLOAD_SCHEME_V1) {
    throwValidationError(
      `Unsupported owner recovery payload scheme: ${String(value.payload.scheme)}`,
    );
  }
}

function normalizeOwnerContext(value: CanonicalNoteOwnerContext) {
  normalizeNonEmptyString(value.ownerPublicKey, "ownerPublicKey");
  normalizeNonEmptyString(value.recoverySecret, "recoverySecret");

  if (value.derivationContext !== undefined) {
    normalizeNonEmptyString(value.derivationContext, "derivationContext");
  }
}

async function deriveOwnerRecoveryKeyMaterial(
  ownerContext: CanonicalNoteOwnerContext,
  payloadNonce: CanonicalBytes32,
): Promise<Uint8Array> {
  const material = concatBytes(
    encodeUtf8("vanta:canonical-note:owner-recovery:key:v1"),
    encodeLengthPrefixedUtf8(ownerContext.ownerPublicKey),
    encodeLengthPrefixedUtf8(ownerContext.recoverySecret),
    encodeOptionalLengthPrefixedUtf8(ownerContext.derivationContext),
    encodeFixedHex32(payloadNonce, "payloadNonce"),
  );

  return deriveSha256Bytes(material);
}

async function deriveOwnerRecoveryAuthTag(
  ownerContext: CanonicalNoteOwnerContext,
  payloadNonce: CanonicalBytes32,
  ciphertext: Uint8Array,
): Promise<string> {
  const material = concatBytes(
    encodeUtf8("vanta:canonical-note:owner-recovery:auth:v1"),
    encodeLengthPrefixedUtf8(ownerContext.ownerPublicKey),
    encodeLengthPrefixedUtf8(ownerContext.recoverySecret),
    encodeOptionalLengthPrefixedUtf8(ownerContext.derivationContext),
    encodeFixedHex32(payloadNonce, "payloadNonce"),
    encodeLengthPrefixedBytes(ciphertext),
  );

  return deriveSha256Hex(material);
}

async function xorWithDerivedKeystream(
  input: Uint8Array,
  keyMaterial: Uint8Array,
): Promise<Uint8Array> {
  const output = new Uint8Array(input.length);
  let offset = 0;
  let counter = 0;

  while (offset < input.length) {
    const blockSeed = concatBytes(keyMaterial, encodeU32(counter));
    const block = await deriveSha256Bytes(blockSeed);

    for (let index = 0; index < block.length && offset < input.length; index += 1) {
      output[offset] = input[offset] ^ block[index];
      offset += 1;
    }

    counter += 1;
  }

  return output;
}

async function deriveSha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await deriveSha256Bytes(bytes);
  return `0x${encodeHex(digest)}`;
}

async function deriveSha256Bytes(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return new Uint8Array(digest);
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function encodeU32(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throwValidationError(`Value ${String(value)} cannot be encoded as u32.`);
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

function encodeOptionalLengthPrefixedUtf8(value: string | undefined): Uint8Array {
  if (value === undefined) {
    return Uint8Array.of(0);
  }

  return concatBytes(Uint8Array.of(1), encodeLengthPrefixedUtf8(value));
}

function encodeLengthPrefixedBytes(bytes: Uint8Array): Uint8Array {
  return concatBytes(encodeU32(bytes.length), bytes);
}

function encodeFixedHex32(value: string, fieldName: string): Uint8Array {
  return decodeFixedHex(value, fieldName, 32);
}

function decodeFixedHex(value: string, fieldName: string, expectedByteLength: number): Uint8Array {
  const normalized = normalizeBytes32(value, fieldName).replace(/^0x/, "");
  const bytes = new Uint8Array(expectedByteLength);

  for (let index = 0; index < expectedByteLength; index += 1) {
    const start = index * 2;
    bytes[index] = Number.parseInt(normalized.slice(start, start + 2), 16);
  }

  return bytes;
}

function normalizeBytes32(value: unknown, fieldName: string): CanonicalBytes32 {
  const normalized = normalizeNonEmptyString(value, fieldName);

  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(normalized)) {
    throwValidationError(
      `${fieldName} must be a 32-byte hex string.`,
    );
  }

  return normalized.toLowerCase();
}

function normalizeNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throwValidationError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
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
    throwValidationError(
      `${fieldName} must be valid base64: ${getErrorMessage(error)}`,
    );
  }
}

function throwValidationError(message: string): never {
  throw new Error(message);
}

function constantTimeEqualHex(left: string, right: string): boolean {
  const leftBytes = decodeFixedHex(left, "left", 32);
  const rightBytes = decodeFixedHex(right, "right", 32);
  let difference = 0;

  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }

  return difference === 0;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
