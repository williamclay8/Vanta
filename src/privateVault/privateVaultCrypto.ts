const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const PRIVATE_VAULT_PAYLOAD_VERSION = "vanta.privateVault.payload.v1" as const;
export const PRIVATE_VAULT_PAYLOAD_SCHEME_V1 = "pbkdf2-aes-gcm-sha256.v1" as const;
export const PRIVATE_VAULT_PAYLOAD_SCHEME = "pbkdf2-aes-gcm-sha256.v2" as const;
export const PRIVATE_VAULT_KDF_ITERATIONS = 600_000 as const;
export const PRIVATE_VAULT_LEGACY_KDF_ITERATIONS = 120_000 as const;

export type PrivateVaultCryptoErrorCode =
  | "blank_password"
  | "crypto_unavailable"
  | "encrypt_failed"
  | "invalid_payload"
  | "decrypt_failed";

export class PrivateVaultCryptoError extends Error {
  readonly code: PrivateVaultCryptoErrorCode;

  constructor(code: PrivateVaultCryptoErrorCode, message: string) {
    super(message);
    this.name = "PrivateVaultCryptoError";
    this.code = code;
  }
}

type PrivateVaultPayloadEnvelope = {
  envelopeVersion: typeof PRIVATE_VAULT_PAYLOAD_VERSION;
  encryptionScheme:
    | typeof PRIVATE_VAULT_PAYLOAD_SCHEME
    | typeof PRIVATE_VAULT_PAYLOAD_SCHEME_V1;
  kdfIterations?: number;
  salt: number[];
  iv: number[];
  ciphertext: number[];
};

export async function encryptPrivateVaultPayload(
  payload: string,
  password: string,
): Promise<string> {
  assertPrivateVaultPassword(password);

  try {
    const cryptoApi = getPrivateVaultCrypto();
    const keyMaterial = await cryptoApi.subtle.importKey(
      "raw",
      textEncoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const salt = cryptoApi.getRandomValues(new Uint8Array(16));
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));
    const key = await cryptoApi.subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations: PRIVATE_VAULT_KDF_ITERATIONS,
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const ciphertext = await cryptoApi.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      textEncoder.encode(payload),
    );

    return JSON.stringify({
      envelopeVersion: PRIVATE_VAULT_PAYLOAD_VERSION,
      encryptionScheme: PRIVATE_VAULT_PAYLOAD_SCHEME,
      kdfIterations: PRIVATE_VAULT_KDF_ITERATIONS,
      salt: Array.from(salt),
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertext)),
    });
  } catch (error) {
    if (error instanceof PrivateVaultCryptoError) {
      throw error;
    }

    throw new PrivateVaultCryptoError(
      "encrypt_failed",
      "Unable to encrypt the private vault payload.",
    );
  }
}

export async function decryptPrivateVaultPayload(
  encryptedPayload: string,
  password: string,
): Promise<string> {
  assertPrivateVaultPassword(password);

  const cryptoApi = getPrivateVaultCrypto();
  const parsed = parsePrivateVaultPayloadEnvelope(encryptedPayload);

  try {
    const keyMaterial = await cryptoApi.subtle.importKey(
      "raw",
      textEncoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await cryptoApi.subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: new Uint8Array(parsed.salt),
        iterations: resolvePrivateVaultKdfIterations(parsed),
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const plaintext = await cryptoApi.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(parsed.iv) },
      key,
      new Uint8Array(parsed.ciphertext),
    );

    return textDecoder.decode(plaintext);
  } catch (error) {
    if (error instanceof PrivateVaultCryptoError) {
      throw error;
    }

    throw new PrivateVaultCryptoError(
      "decrypt_failed",
      "Unable to decrypt the private vault payload.",
    );
  }
}

function assertPrivateVaultPassword(password: string) {
  if (password.trim().length === 0) {
    throw new PrivateVaultCryptoError(
      "blank_password",
      "Private vault password must not be blank.",
    );
  }
}

function getPrivateVaultCrypto(): Pick<Crypto, "subtle" | "getRandomValues"> {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== "function") {
    throw new PrivateVaultCryptoError(
      "crypto_unavailable",
      "Private vault cryptography is unavailable in this context.",
    );
  }

  return cryptoApi;
}

function parsePrivateVaultPayloadEnvelope(raw: string): PrivateVaultPayloadEnvelope {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isPrivateVaultPayloadEnvelope(parsed)) {
      throw new PrivateVaultCryptoError(
        "invalid_payload",
        "Private vault payload envelope is invalid.",
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof PrivateVaultCryptoError) {
      throw error;
    }

    throw new PrivateVaultCryptoError(
      "invalid_payload",
      "Private vault payload envelope is invalid.",
    );
  }
}

function isPrivateVaultPayloadEnvelope(value: unknown): value is PrivateVaultPayloadEnvelope {
  if (!isRecord(value)) {
    return false;
  }

  const isCurrentScheme = value.encryptionScheme === PRIVATE_VAULT_PAYLOAD_SCHEME;
  const isLegacyScheme = value.encryptionScheme === PRIVATE_VAULT_PAYLOAD_SCHEME_V1;

  return (
    value.envelopeVersion === PRIVATE_VAULT_PAYLOAD_VERSION &&
    (isCurrentScheme || isLegacyScheme) &&
    hasValidKdfIterations(value, isCurrentScheme, isLegacyScheme) &&
    isByteArrayLike(value.salt, 16) &&
    isByteArrayLike(value.iv, 12) &&
    isByteArrayLike(value.ciphertext)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasValidKdfIterations(
  value: Record<string, unknown>,
  isCurrentScheme: boolean,
  isLegacyScheme: boolean,
) {
  if (isCurrentScheme) {
    return value.kdfIterations === PRIVATE_VAULT_KDF_ITERATIONS;
  }

  if (isLegacyScheme) {
    return (
      value.kdfIterations === undefined ||
      value.kdfIterations === PRIVATE_VAULT_LEGACY_KDF_ITERATIONS
    );
  }

  return false;
}

function resolvePrivateVaultKdfIterations(envelope: PrivateVaultPayloadEnvelope) {
  if (envelope.encryptionScheme === PRIVATE_VAULT_PAYLOAD_SCHEME) {
    return PRIVATE_VAULT_KDF_ITERATIONS;
  }

  return PRIVATE_VAULT_LEGACY_KDF_ITERATIONS;
}

function isByteArrayLike(value: unknown, expectedLength?: number): value is number[] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (expectedLength !== undefined && value.length !== expectedLength) {
    return false;
  }

  return value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255);
}
