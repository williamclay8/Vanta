import { argon2idAsync } from "@noble/hashes/argon2.js";
import { isRecord } from "../isRecord";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const PRIVATE_VAULT_PAYLOAD_VERSION = "vanta.privateVault.payload.v1" as const;
export const PRIVATE_VAULT_PAYLOAD_SCHEME_V1 = "pbkdf2-aes-gcm-sha256.v1" as const;
export const PRIVATE_VAULT_PAYLOAD_SCHEME_V2 = "pbkdf2-aes-gcm-sha256.v2" as const;
export const PRIVATE_VAULT_PAYLOAD_SCHEME = "argon2id-aes-gcm-sha256.v3" as const;
export const PRIVATE_VAULT_ARGON2ID_MEMORY_KIB = 65_536 as const;
export const PRIVATE_VAULT_ARGON2ID_TIME_COST = 3 as const;
export const PRIVATE_VAULT_ARGON2ID_PARALLELISM = 1 as const;
export const PRIVATE_VAULT_ARGON2ID_DERIVED_KEY_BYTES = 32 as const;
const PRIVATE_VAULT_ARGON2ID_VERSION = 0x13 as const;
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
    | typeof PRIVATE_VAULT_PAYLOAD_SCHEME_V2
    | typeof PRIVATE_VAULT_PAYLOAD_SCHEME_V1;
  argon2id?: PrivateVaultArgon2idParameters;
  kdfIterations?: number;
  salt: number[];
  iv: number[];
  ciphertext: number[];
};

type PrivateVaultArgon2idParameters = {
  derivedKeyBytes: typeof PRIVATE_VAULT_ARGON2ID_DERIVED_KEY_BYTES;
  memoryKiB: typeof PRIVATE_VAULT_ARGON2ID_MEMORY_KIB;
  parallelism: typeof PRIVATE_VAULT_ARGON2ID_PARALLELISM;
  timeCost: typeof PRIVATE_VAULT_ARGON2ID_TIME_COST;
  version: typeof PRIVATE_VAULT_ARGON2ID_VERSION;
};

export async function encryptPrivateVaultPayload(
  payload: string,
  password: string,
): Promise<string> {
  assertPrivateVaultPassword(password);

  try {
    const cryptoApi = getPrivateVaultCrypto();
    const salt = cryptoApi.getRandomValues(new Uint8Array(16));
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));
    const key = await derivePrivateVaultArgon2idKey(cryptoApi, password, salt);
    const ciphertext = await cryptoApi.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      textEncoder.encode(payload),
    );

    return JSON.stringify({
      envelopeVersion: PRIVATE_VAULT_PAYLOAD_VERSION,
      encryptionScheme: PRIVATE_VAULT_PAYLOAD_SCHEME,
      argon2id: privateVaultArgon2idParameters(),
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
    const key = await derivePrivateVaultAesKey(cryptoApi, password, parsed);
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

async function derivePrivateVaultAesKey(
  cryptoApi: Pick<Crypto, "subtle">,
  password: string,
  envelope: PrivateVaultPayloadEnvelope,
) {
  const salt = new Uint8Array(envelope.salt);

  if (envelope.encryptionScheme === PRIVATE_VAULT_PAYLOAD_SCHEME) {
    return derivePrivateVaultArgon2idKey(cryptoApi, password, salt);
  }

  return derivePrivateVaultPbkdf2Key(
    cryptoApi,
    password,
    salt,
    resolvePrivateVaultKdfIterations(envelope),
  );
}

async function derivePrivateVaultArgon2idKey(
  cryptoApi: Pick<Crypto, "subtle">,
  password: string,
  salt: Uint8Array,
) {
  const rawKey = await argon2idAsync(textEncoder.encode(password), salt, {
    dkLen: PRIVATE_VAULT_ARGON2ID_DERIVED_KEY_BYTES,
    m: PRIVATE_VAULT_ARGON2ID_MEMORY_KIB,
    p: PRIVATE_VAULT_ARGON2ID_PARALLELISM,
    t: PRIVATE_VAULT_ARGON2ID_TIME_COST,
    version: PRIVATE_VAULT_ARGON2ID_VERSION,
  });
  const cryptoRawKey = new Uint8Array(rawKey);

  try {
    return await cryptoApi.subtle.importKey(
      "raw",
      cryptoRawKey,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  } finally {
    rawKey.fill(0);
  }
}

async function derivePrivateVaultPbkdf2Key(
  cryptoApi: Pick<Crypto, "subtle">,
  password: string,
  salt: Uint8Array,
  iterations: number,
) {
  const keyMaterial = await cryptoApi.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new Uint8Array(salt),
      iterations,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function privateVaultArgon2idParameters(): PrivateVaultArgon2idParameters {
  return {
    derivedKeyBytes: PRIVATE_VAULT_ARGON2ID_DERIVED_KEY_BYTES,
    memoryKiB: PRIVATE_VAULT_ARGON2ID_MEMORY_KIB,
    parallelism: PRIVATE_VAULT_ARGON2ID_PARALLELISM,
    timeCost: PRIVATE_VAULT_ARGON2ID_TIME_COST,
    version: PRIVATE_VAULT_ARGON2ID_VERSION,
  };
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
  const isPbkdf2V2Scheme = value.encryptionScheme === PRIVATE_VAULT_PAYLOAD_SCHEME_V2;
  const isLegacyScheme = value.encryptionScheme === PRIVATE_VAULT_PAYLOAD_SCHEME_V1;

  return (
    value.envelopeVersion === PRIVATE_VAULT_PAYLOAD_VERSION &&
    (isCurrentScheme || isPbkdf2V2Scheme || isLegacyScheme) &&
    hasValidKdfIterations(value, isCurrentScheme, isPbkdf2V2Scheme, isLegacyScheme) &&
    isByteArrayLike(value.salt, 16) &&
    isByteArrayLike(value.iv, 12) &&
    isByteArrayLike(value.ciphertext)
  );
}

function hasValidKdfIterations(
  value: Record<string, unknown>,
  isCurrentScheme: boolean,
  isPbkdf2V2Scheme: boolean,
  isLegacyScheme: boolean,
) {
  if (isCurrentScheme) {
    return (
      value.kdfIterations === undefined &&
      hasValidArgon2idParameters(value.argon2id)
    );
  }

  if (isPbkdf2V2Scheme) {
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

function hasValidArgon2idParameters(value: unknown): value is PrivateVaultArgon2idParameters {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.derivedKeyBytes === PRIVATE_VAULT_ARGON2ID_DERIVED_KEY_BYTES &&
    value.memoryKiB === PRIVATE_VAULT_ARGON2ID_MEMORY_KIB &&
    value.parallelism === PRIVATE_VAULT_ARGON2ID_PARALLELISM &&
    value.timeCost === PRIVATE_VAULT_ARGON2ID_TIME_COST &&
    value.version === PRIVATE_VAULT_ARGON2ID_VERSION
  );
}

function resolvePrivateVaultKdfIterations(envelope: PrivateVaultPayloadEnvelope) {
  if (envelope.encryptionScheme === PRIVATE_VAULT_PAYLOAD_SCHEME_V2) {
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
