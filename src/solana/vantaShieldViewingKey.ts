import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";

export const VANTA_SHIELD_VIEWING_KEY_VERSION = "vanta-shield-viewing-key-0.1" as const;
const VANTA_SHIELD_VIEWING_MEMO_VERSION_BYTE = 0x02;
const VANTA_SHIELD_VIEWING_MEMO_DOMAIN = "vanta-shield-viewing-memo-ecdh-x25519-xchacha20-0.1";

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

export type DecryptVantaShieldMemoWithViewingKeyArgs = {
  memoText: string;
  prefix: string;
  viewingSecretKey: string;
};

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

export function createVantaShieldViewingKeypair(): VantaShieldViewingKeypair {
  const secretKey = x25519.utils.randomSecretKey();
  return {
    publicKey: bytesToHex(x25519.getPublicKey(secretKey)),
    secretKey: bytesToHex(secretKey),
    version: VANTA_SHIELD_VIEWING_KEY_VERSION,
  };
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

  return `${prefix}${base64UrlEncode(body)}`;
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
