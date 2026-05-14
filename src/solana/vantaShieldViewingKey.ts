import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";

export const VANTA_SHIELD_VIEWING_KEY_VERSION = "vanta-shield-viewing-key-0.1" as const;
export const VANTA_SHIELD_MEMO_VIEW_TAG_VERSION =
  "vanta-shield-memo-view-tag-0.1" as const;
export const VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_VERSION =
  "vanta-shield-recipient-viewing-key-exchange-0.1" as const;
const VANTA_SHIELD_VIEWING_MEMO_VERSION_BYTE = 0x02;
const VANTA_SHIELD_VIEWING_MEMO_DOMAIN = "vanta-shield-viewing-memo-ecdh-x25519-xchacha20-0.1";
const VANTA_SHIELD_VIEWING_MEMO_TAG_DOMAIN =
  "vanta-shield-viewing-memo-tag-x25519-sha256-0.1";
const VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_DOMAIN =
  "vanta-shield-recipient-viewing-key-exchange-public-packet-0.1";

export type VantaShieldViewingKeypair = {
  publicKey: string;
  secretKey: string;
  version: typeof VANTA_SHIELD_VIEWING_KEY_VERSION;
};

export type EncryptVantaShieldMemoToViewingKeyArgs = {
  payload: object;
  prefix: string;
  viewingPublicKey: string;
};

export type VantaShieldMemoViewingKeyPacket = {
  encryptedViewTag: string;
  memoText: string;
  version: typeof VANTA_SHIELD_MEMO_VIEW_TAG_VERSION;
};

export type VantaShieldRecipientViewingKeyExchangePacket = {
  claimBoundary: "direct-viewing-key-exchange-local-only-not-production-recipient-discovery";
  createdAt: number;
  fingerprint: string;
  forbiddenPlaintextFields: readonly string[];
  label?: string;
  productionReady: false;
  recipientWalletAddress: string;
  scope: "direct-known-counterparty";
  version: typeof VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_VERSION;
  viewingPublicKey: string;
};

export type DecryptVantaShieldMemoWithViewingKeyArgs = {
  memoText: string;
  prefix: string;
  viewingSecretKey: string;
};

const VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_ALLOWED_KEYS = new Set([
  "claimBoundary",
  "createdAt",
  "fingerprint",
  "forbiddenPlaintextFields",
  "label",
  "productionReady",
  "recipientWalletAddress",
  "scope",
  "version",
  "viewingPublicKey",
]);

const VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_FORBIDDEN_KEYS = new Set([
  "amount",
  "amountBaseUnits",
  "asset",
  "memo",
  "memoPlaintext",
  "ownerSecret",
  "plaintext",
  "plaintextMemo",
  "privateInputs",
  "rawPrivateInputs",
  "secretKey",
  "seedPhrase",
  "walletPrivateKey",
  "witness",
]);

export const VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_FORBIDDEN_PLAINTEXT_FIELDS = [
  ...VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_FORBIDDEN_KEYS,
].sort();

function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, fieldValue]) => fieldValue !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

  return `{${entries
    .map(([key, fieldValue]) => `${JSON.stringify(key)}:${canonicalJsonStringify(fieldValue)}`)
    .join(",")}}`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const normalized = padded + "=".repeat(padLength);
  const binary =
    typeof atob === "function"
      ? atob(normalized)
      : Buffer.from(normalized, "base64").toString("binary");
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function requireHexKey(value: string, label: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/u.test(value)) {
    throw new Error(`Vanta Shield viewing key requires a 32-byte lowercase hex ${label}.`);
  }
  return hexToBytes(value);
}

function requireRecipientWalletAddress(value: unknown): string {
  if (typeof value !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u.test(value.trim())) {
    throw new Error("Vanta Shield recipient viewing-key exchange requires a base58 recipient wallet address.");
  }
  return value.trim();
}

function assertRecipientViewingKeyExchangeObject(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Vanta Shield recipient viewing-key exchange packet must be an object.");
  }

  for (const [key, nested] of Object.entries(value)) {
    if (VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_FORBIDDEN_KEYS.has(key)) {
      throw new Error(`Vanta Shield recipient viewing-key exchange packet includes forbidden field ${key}.`);
    }

    if (!VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_ALLOWED_KEYS.has(key)) {
      throw new Error(`Vanta Shield recipient viewing-key exchange packet includes unsupported field ${key}.`);
    }

    if (nested && typeof nested === "object") {
      assertRecipientViewingKeyExchangeNoForbiddenNestedFields(nested, [key]);
    }
  }
}

function assertRecipientViewingKeyExchangeNoForbiddenNestedFields(
  value: object,
  path: string[],
) {
  for (const [key, nested] of Object.entries(value)) {
    if (VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_FORBIDDEN_KEYS.has(key)) {
      throw new Error(
        `Vanta Shield recipient viewing-key exchange packet includes forbidden field ${[
          ...path,
          key,
        ].join(".")}.`,
      );
    }

    if (nested && typeof nested === "object") {
      assertRecipientViewingKeyExchangeNoForbiddenNestedFields(nested, [...path, key]);
    }
  }
}

function deriveRecipientViewingKeyExchangeFingerprint({
  recipientWalletAddress,
  viewingPublicKey,
}: {
  recipientWalletAddress: string;
  viewingPublicKey: string;
}) {
  return `rvk:${bytesToHex(
    sha256(
      utf8ToBytes(
        canonicalJsonStringify({
          domain: VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_DOMAIN,
          recipientWalletAddress,
          scope: "direct-known-counterparty",
          version: VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_VERSION,
          viewingPublicKey,
        }),
      ),
    ),
  ).slice(0, 16)}`;
}

export function createVantaShieldRecipientViewingKeyExchangePacket(
  packet: Record<string, unknown>,
): VantaShieldRecipientViewingKeyExchangePacket {
  assertRecipientViewingKeyExchangeObject(packet);

  const recipientWalletAddress = requireRecipientWalletAddress(packet.recipientWalletAddress);
  const viewingPublicKey = bytesToHex(requireHexKey(String(packet.viewingPublicKey ?? ""), "viewing public key"));
  const createdAt =
    packet.createdAt === undefined ? Date.now() : Number(packet.createdAt);
  if (!Number.isSafeInteger(createdAt) || createdAt <= 0) {
    throw new Error("Vanta Shield recipient viewing-key exchange requires a positive createdAt timestamp.");
  }

  const label =
    typeof packet.label === "string" && packet.label.trim().length > 0
      ? packet.label.trim().slice(0, 80)
      : undefined;
  const fingerprint = deriveRecipientViewingKeyExchangeFingerprint({
    recipientWalletAddress,
    viewingPublicKey,
  });

  return {
    claimBoundary: "direct-viewing-key-exchange-local-only-not-production-recipient-discovery",
    createdAt,
    fingerprint,
    forbiddenPlaintextFields:
      VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_FORBIDDEN_PLAINTEXT_FIELDS,
    ...(label ? { label } : {}),
    productionReady: false,
    recipientWalletAddress,
    scope: "direct-known-counterparty",
    version: VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_VERSION,
    viewingPublicKey,
  };
}

export function importVantaShieldRecipientViewingKeyExchangePacket(
  packet: unknown,
): VantaShieldRecipientViewingKeyExchangePacket {
  const normalized = createVantaShieldRecipientViewingKeyExchangePacket(
    packet as Record<string, unknown>,
  );

  if (
    (packet as { fingerprint?: unknown }).fingerprint !== undefined &&
    (packet as { fingerprint?: unknown }).fingerprint !== normalized.fingerprint
  ) {
    throw new Error("Vanta Shield recipient viewing-key exchange packet fingerprint mismatch.");
  }

  if (
    (packet as { productionReady?: unknown }).productionReady !== undefined &&
    (packet as { productionReady?: unknown }).productionReady !== false
  ) {
    throw new Error("Vanta Shield recipient viewing-key exchange packet productionReady must remain false.");
  }

  return normalized;
}

function deriveMemoKey({
  ephemeralPublicKey,
  recipientPublicKey,
  sharedSecret,
}: {
  ephemeralPublicKey: Uint8Array;
  recipientPublicKey: Uint8Array;
  sharedSecret: Uint8Array;
}): Uint8Array {
  return hkdf(
    sha256,
    sharedSecret,
    utf8ToBytes(VANTA_SHIELD_VIEWING_MEMO_DOMAIN),
    new Uint8Array([...ephemeralPublicKey, ...recipientPublicKey]),
    32,
  );
}

function deriveMemoEncryptedViewTag({
  ephemeralPublicKey,
  prefix,
  recipientPublicKey,
  sharedSecret,
}: {
  ephemeralPublicKey: Uint8Array;
  prefix: string;
  recipientPublicKey: Uint8Array;
  sharedSecret: Uint8Array;
}): string {
  const material = new Uint8Array([
    ...utf8ToBytes(VANTA_SHIELD_VIEWING_MEMO_TAG_DOMAIN),
    ...utf8ToBytes(prefix),
    ...ephemeralPublicKey,
    ...recipientPublicKey,
    ...sharedSecret,
  ]);
  return `vtag:${bytesToHex(sha256(material)).slice(0, 16)}`;
}

export function createVantaShieldViewingKeypair(): VantaShieldViewingKeypair {
  const secretKey = x25519.utils.randomSecretKey();
  return {
    publicKey: bytesToHex(x25519.getPublicKey(secretKey)),
    secretKey: bytesToHex(secretKey),
    version: VANTA_SHIELD_VIEWING_KEY_VERSION,
  };
}

export function deriveVantaShieldViewingKeypairFromSecretKey(
  secretKeyHex: string,
): VantaShieldViewingKeypair {
  const secretKey = requireHexKey(secretKeyHex, "secret key");
  return exportVantaShieldViewingKeypair({
    publicKey: bytesToHex(x25519.getPublicKey(secretKey)),
    secretKey: bytesToHex(secretKey),
    version: VANTA_SHIELD_VIEWING_KEY_VERSION,
  });
}

export function exportVantaShieldViewingKeypair(
  keypair: VantaShieldViewingKeypair,
): VantaShieldViewingKeypair {
  requireHexKey(keypair.publicKey, "public key");
  requireHexKey(keypair.secretKey, "secret key");
  if (keypair.version !== VANTA_SHIELD_VIEWING_KEY_VERSION) {
    throw new Error("Unsupported Vanta Shield viewing key version.");
  }
  return { ...keypair };
}

export function importVantaShieldViewingKeypair(
  keypair: VantaShieldViewingKeypair,
): VantaShieldViewingKeypair {
  const secretKey = requireHexKey(keypair.secretKey, "secret key");
  const expectedPublicKey = bytesToHex(x25519.getPublicKey(secretKey));
  if (keypair.publicKey !== expectedPublicKey) {
    throw new Error("Vanta Shield viewing key public key does not match the secret key.");
  }
  return exportVantaShieldViewingKeypair(keypair);
}

export function encryptVantaShieldMemoToViewingKey({
  payload,
  prefix,
  viewingPublicKey,
}: EncryptVantaShieldMemoToViewingKeyArgs): string {
  return encryptVantaShieldMemoToViewingKeyPacket({
    payload,
    prefix,
    viewingPublicKey,
  }).memoText;
}

export function encryptVantaShieldMemoToViewingKeyPacket({
  payload,
  prefix,
  viewingPublicKey,
}: EncryptVantaShieldMemoToViewingKeyArgs): VantaShieldMemoViewingKeyPacket {
  const recipientPublicKey = requireHexKey(viewingPublicKey, "public key");
  const ephemeralSecretKey = x25519.utils.randomSecretKey();
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralSecretKey);
  const sharedSecret = x25519.getSharedSecret(ephemeralSecretKey, recipientPublicKey);
  const key = deriveMemoKey({
    ephemeralPublicKey,
    recipientPublicKey,
    sharedSecret,
  });
  const nonce = new Uint8Array(24);
  crypto.getRandomValues(nonce);
  const cipher = xchacha20poly1305(key, nonce);
  const plaintext = utf8ToBytes(canonicalJsonStringify(payload));
  const ciphertext = cipher.encrypt(plaintext);

  const body = new Uint8Array(1 + ephemeralPublicKey.length + nonce.length + ciphertext.length);
  body[0] = VANTA_SHIELD_VIEWING_MEMO_VERSION_BYTE;
  body.set(ephemeralPublicKey, 1);
  body.set(nonce, 1 + ephemeralPublicKey.length);
  body.set(ciphertext, 1 + ephemeralPublicKey.length + nonce.length);

  return {
    encryptedViewTag: deriveMemoEncryptedViewTag({
      ephemeralPublicKey,
      prefix,
      recipientPublicKey,
      sharedSecret,
    }),
    memoText: `${prefix}${base64UrlEncode(body)}`,
    version: VANTA_SHIELD_MEMO_VIEW_TAG_VERSION,
  };
}

export function deriveVantaShieldMemoEncryptedViewTag({
  memoText,
  prefix,
  viewingSecretKey,
}: DecryptVantaShieldMemoWithViewingKeyArgs): string | null {
  const trimmed = memoText.trim();
  const start = trimmed.indexOf(prefix);
  if (start === -1) {
    return null;
  }

  let body: Uint8Array;
  try {
    body = base64UrlDecode(trimmed.slice(start + prefix.length).trim());
  } catch {
    return null;
  }

  if (body.length < 1 + 32 + 24 + 16 || body[0] !== VANTA_SHIELD_VIEWING_MEMO_VERSION_BYTE) {
    return null;
  }

  const viewingSecretBytes = requireHexKey(viewingSecretKey, "secret key");
  const ephemeralPublicKey = body.slice(1, 33);
  const recipientPublicKey = x25519.getPublicKey(viewingSecretBytes);
  const sharedSecret = x25519.getSharedSecret(viewingSecretBytes, ephemeralPublicKey);
  return deriveMemoEncryptedViewTag({
    ephemeralPublicKey,
    prefix,
    recipientPublicKey,
    sharedSecret,
  });
}

export function decryptVantaShieldMemoWithViewingKey<T = unknown>({
  memoText,
  prefix,
  viewingSecretKey,
}: DecryptVantaShieldMemoWithViewingKeyArgs): T | null {
  const trimmed = memoText.trim();
  const start = trimmed.indexOf(prefix);
  if (start === -1) {
    return null;
  }

  let body: Uint8Array;
  try {
    body = base64UrlDecode(trimmed.slice(start + prefix.length).trim());
  } catch {
    return null;
  }

  if (body.length < 1 + 32 + 24 + 16 || body[0] !== VANTA_SHIELD_VIEWING_MEMO_VERSION_BYTE) {
    return null;
  }

  const viewingSecretBytes = requireHexKey(viewingSecretKey, "secret key");
  const ephemeralPublicKey = body.slice(1, 33);
  const nonce = body.slice(33, 57);
  const ciphertext = body.slice(57);
  const recipientPublicKey = x25519.getPublicKey(viewingSecretBytes);
  const sharedSecret = x25519.getSharedSecret(viewingSecretBytes, ephemeralPublicKey);
  const key = deriveMemoKey({
    ephemeralPublicKey,
    recipientPublicKey,
    sharedSecret,
  });

  try {
    const plaintext = xchacha20poly1305(key, nonce).decrypt(ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}
