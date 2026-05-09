import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";
import type {
  CanonicalBytes32,
  CanonicalEncryptedPayload,
  CanonicalNoteOwnerContext,
} from "../canonicalNote";

const PHASE1_OWNER_RECOVERY_PAYLOAD_ENCODING_V1 =
  "vanta.canonical-note.payload.encoding.v1" as const;
const PHASE1_OWNER_RECOVERY_PAYLOAD_VERSION_V1 = 1 as const;
const PHASE1_OWNER_RECOVERY_PAYLOAD_SCHEME_V1 =
  "owner-recovery-x25519-xchacha20poly1305-v2" as const;
const OWNER_RECOVERY_STATIC_KEY_DOMAIN =
  "vanta:canonical-note:owner-recovery:static-x25519:v2";
const OWNER_RECOVERY_AEAD_DOMAIN =
  "vanta:canonical-note:owner-recovery:x25519-xchacha20poly1305:v2";
const XCHACHA_NONCE_BYTES = 24;
const ENVELOPE_BYTES32_BYTES = 32;

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

    const recipientStaticSecretKey = deriveOwnerRecoveryStaticSecretKey(input.ownerContext);
    const recipientStaticPublicKey = x25519.getPublicKey(recipientStaticSecretKey);
    const ephemeralSecretKey = x25519.utils.randomSecretKey();
    const ephemeralPublicKey = x25519.getPublicKey(ephemeralSecretKey);
    const sharedSecret = x25519.getSharedSecret(ephemeralSecretKey, recipientStaticPublicKey);
    const nonce = new Uint8Array(XCHACHA_NONCE_BYTES);
    crypto.getRandomValues(nonce);
    const key = deriveOwnerRecoveryAeadKey({
      ownerContext: input.ownerContext,
      ephemeralPublicKey,
      recipientStaticPublicKey,
      sharedSecret,
    });
    const ciphertextBytes = xchacha20poly1305(
      key,
      nonce,
      encodeOwnerRecoveryAssociatedData(input.ownerContext),
    ).encrypt(input.plaintext);

    return {
      scheme: PHASE1_OWNER_RECOVERY_PAYLOAD_SCHEME_V1,
      encoding: PHASE1_OWNER_RECOVERY_PAYLOAD_ENCODING_V1,
      payloadVersion: PHASE1_OWNER_RECOVERY_PAYLOAD_VERSION_V1,
      recipientPublicKey: input.recipientPublicKey,
      payloadNonce: encodeNonceEnvelope(nonce),
      ciphertext: encodeBase64(ciphertextBytes),
      authTag: `0x${bytesToHex(ephemeralPublicKey)}`,
    };
  },

  async decrypt(input) {
    assertValidOwnerRecoveryDecryptionInput(input);

    if (input.payload.recipientPublicKey !== input.ownerContext.ownerPublicKey) {
      throwValidationError(
        "This canonical encrypted payload is not addressed to the provided owner context.",
      );
    }

    const nonce = decodeNonceEnvelope(input.payload.payloadNonce);
    const ciphertextBytes = decodeBase64(input.payload.ciphertext, "ciphertext");
    const ephemeralPublicKey = decodeFixedHex(
      input.payload.authTag,
      "owner recovery ephemeral public key",
      32,
    );
    const recipientStaticSecretKey = deriveOwnerRecoveryStaticSecretKey(input.ownerContext);
    const recipientStaticPublicKey = x25519.getPublicKey(recipientStaticSecretKey);
    const sharedSecret = x25519.getSharedSecret(recipientStaticSecretKey, ephemeralPublicKey);
    const key = deriveOwnerRecoveryAeadKey({
      ownerContext: input.ownerContext,
      ephemeralPublicKey,
      recipientStaticPublicKey,
      sharedSecret,
    });

    try {
      return xchacha20poly1305(
        key,
        nonce,
        encodeOwnerRecoveryAssociatedData(input.ownerContext),
      ).decrypt(ciphertextBytes);
    } catch {
      throwValidationError(
        "The canonical encrypted payload failed owner recovery authentication.",
      );
    }
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

function deriveOwnerRecoveryStaticSecretKey(
  ownerContext: CanonicalNoteOwnerContext,
): Uint8Array {
  return hkdf(
    sha256,
    decodeRecoverySecret(ownerContext.recoverySecret),
    utf8ToBytes(OWNER_RECOVERY_STATIC_KEY_DOMAIN),
    concatBytes(
      encodeLengthPrefixedUtf8(ownerContext.ownerPublicKey),
      encodeOptionalLengthPrefixedUtf8(ownerContext.derivationContext),
    ),
    32,
  );
}

function deriveOwnerRecoveryAeadKey({
  ownerContext,
  ephemeralPublicKey,
  recipientStaticPublicKey,
  sharedSecret,
}: {
  ownerContext: CanonicalNoteOwnerContext;
  ephemeralPublicKey: Uint8Array;
  recipientStaticPublicKey: Uint8Array;
  sharedSecret: Uint8Array;
}): Uint8Array {
  return hkdf(
    sha256,
    sharedSecret,
    utf8ToBytes(OWNER_RECOVERY_AEAD_DOMAIN),
    concatBytes(
      ephemeralPublicKey,
      recipientStaticPublicKey,
      encodeOwnerRecoveryAssociatedData(ownerContext),
    ),
    32,
  );
}

function encodeOwnerRecoveryAssociatedData(
  ownerContext: CanonicalNoteOwnerContext,
): Uint8Array {
  return concatBytes(
    encodeLengthPrefixedUtf8(PHASE1_OWNER_RECOVERY_PAYLOAD_ENCODING_V1),
    encodeU8(PHASE1_OWNER_RECOVERY_PAYLOAD_VERSION_V1),
    encodeLengthPrefixedUtf8(PHASE1_OWNER_RECOVERY_PAYLOAD_SCHEME_V1),
    encodeLengthPrefixedUtf8(ownerContext.ownerPublicKey),
    encodeOptionalLengthPrefixedUtf8(ownerContext.derivationContext),
  );
}

function decodeRecoverySecret(value: string): Uint8Array {
  const normalized = normalizeNonEmptyString(value, "recoverySecret");

  if (/^(0x)?[0-9a-fA-F]{64}$/.test(normalized)) {
    return hexToBytes(normalized.replace(/^0x/, "").toLowerCase());
  }

  return utf8ToBytes(normalized);
}

function encodeNonceEnvelope(nonce: Uint8Array): CanonicalBytes32 {
  if (nonce.byteLength !== XCHACHA_NONCE_BYTES) {
    throwValidationError("Owner recovery payload nonce must be 24 bytes.");
  }

  const envelope = new Uint8Array(ENVELOPE_BYTES32_BYTES);
  envelope.set(nonce, 0);
  return `0x${bytesToHex(envelope)}`;
}

function decodeNonceEnvelope(value: string): Uint8Array {
  const envelope = decodeFixedHex(value, "payloadNonce", ENVELOPE_BYTES32_BYTES);
  const reserved = envelope.slice(XCHACHA_NONCE_BYTES);

  for (const byte of reserved) {
    if (byte !== 0) {
      throwValidationError("Owner recovery payload nonce reserved bytes must be zero.");
    }
  }

  return envelope.slice(0, XCHACHA_NONCE_BYTES);
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function encodeU8(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throwValidationError(`Value ${String(value)} cannot be encoded as u8.`);
  }

  return Uint8Array.of(value);
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

function decodeFixedHex(value: string, fieldName: string, expectedByteLength: number): Uint8Array {
  const normalized = normalizeBytes32(value, fieldName).replace(/^0x/, "");

  if (normalized.length !== expectedByteLength * 2) {
    throwValidationError(
      `${fieldName} must be a ${String(expectedByteLength)}-byte hex string.`,
    );
  }

  return hexToBytes(normalized);
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
