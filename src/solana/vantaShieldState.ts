import {
  toAddress,
  type SolanaClient,
  type TransactionInstructionInput,
} from "@solana/client";
import { Connection } from "@solana/web3.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { sha256 } from "@noble/hashes/sha256";
import { utf8ToBytes } from "@noble/hashes/utils";
import {
  ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
  getLiveShieldTokenAsset,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import { endpoint, readRpcFallbackEndpoints } from "@/solana/client";
import { hasMatchingNativeSolShieldTransfer } from "@/solana/nativeSolShield";
import {
  decryptVantaShieldMemoWithViewingKey,
  encryptVantaShieldMemoToViewingKey,
  encryptVantaShieldMemoToViewingKeyPacket,
} from "@/solana/vantaShieldViewingKey";

export const VANTA_SHIELD_MEMO_PROGRAM =
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const VANTA_SHIELD_MEMO_PREFIX = "vanta:shield-note:v1:";
const VANTA_SEND_MEMO_PREFIX = "vanta:send-note:v1:";
const VANTA_UNSHIELD_MEMO_PREFIX = "vanta:unshield-note:v1:";
const VANTA_SWAP_MEMO_PREFIX = "vanta:swap-note:v1:";
const VANTA_SOL_UNSHIELD_MEMO_PREFIX = "vanta:sol-unshield-note:v1:";
export const VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX = "vanta:native-sol-shield-note:v1:";
export const VANTA_SHIELD_MEMO_PREFIX_V2 = "vanta:shield-note:v2:";
export const VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX_V2 = "vanta:native-sol-shield-note:v2:";
export const VANTA_SEND_MEMO_PREFIX_V2 = "vanta:send-note:v2:";
export const VANTA_UNSHIELD_MEMO_PREFIX_V2 = "vanta:unshield-note:v2:";
export const VANTA_SWAP_MEMO_PREFIX_V2 = "vanta:swap-note:v2:";
export const VANTA_SOL_UNSHIELD_MEMO_PREFIX_V2 = "vanta:sol-unshield-note:v2:";
export const VANTA_SPENT_MARKER_MEMO_PREFIX_V2 = "vanta:spent-marker:v2:";
export const VANTA_SEND_HISTORY_PRIVACY_SCOPE_VERSION =
  "vanta-send-history-privacy-scope-0.1";
export const VANTA_LEGACY_V1_MEMO_QUARANTINE_POLICY_VERSION =
  "vanta-legacy-v1-memo-quarantine-0.1";
export const VANTA_NATIVE_SOL_SAME_TRANSACTION_DEPOSIT_SIGNATURE =
  "vanta-native-sol-same-transaction-deposit";
export const VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE =
  "vanta-token-same-transaction-deposit";
const VANTA_SHIELD_MEMO_KEY_DOMAIN_V1 = "vanta-shield-memo-key:v1";
const VANTA_SHIELD_MEMO_VERSION_BYTE = 0x01;
const VANTA_SPENT_MARKER_MEMO_PREFIX = "vanta:spent-marker:v1:";
export const VANTA_NATIVE_SOL_ASSET_ID =
  "So11111111111111111111111111111111111111112";
const shieldStateRpcEndpoint = endpoint;
const shieldStateReadRpcEndpoints = readRpcFallbackEndpoints.includes(
  shieldStateRpcEndpoint,
)
  ? readRpcFallbackEndpoints
  : [shieldStateRpcEndpoint, ...readRpcFallbackEndpoints];

type ShieldMemoEncryptionOptions = {
  viewingPublicKey?: string | null;
};

type SignatureMemoEntry = {
  memo: string | null;
  signature: string;
  transaction?: unknown;
};

type ShieldMemoDecryptionOptions = {
  viewingSecretKey?: string | null;
};

export type VantaShieldTokenAsset = LiveShieldTokenAssetKey;

type BaseVantaNote = {
  amount: number;
  asset: VantaShieldTokenAsset;
  createdAt: number;
  mintAddress: string;
  noteId: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
};

export type VantaShieldNote = BaseVantaNote & {
  depositSignature: string;
  kind: "shield";
  origin: "deposit" | "change" | "swap_output" | "recipient_self";
  parentNoteId?: string;
  parentSendNoteId?: string;
  parentSwapNoteId?: string;
};

export type VantaSendNote = BaseVantaNote & {
  changeAmount: number;
  changeNoteId?: string;
  consumedNoteId: string;
  kind: "send";
  memoPrivacyScope?: VantaSendMemoPrivacyScope;
  productionPrivacyScopeEligible?: boolean;
  recipient: string;
};

export type VantaSendMemoPrivacyScope =
  | "fresh-v2-viewing-key-aead"
  | "legacy-v1-plaintext-history";

export type VantaUnshieldNote = BaseVantaNote & {
  consumedNoteId: string;
  destinationOwner: string;
  kind: "unshield";
};

export type VantaSwapNote = {
  createdAt: number;
  consumedNoteId: string;
  inputAmount: number;
  inputAsset: VantaShieldTokenAsset | "SOL";
  kind: "swap";
  noteId: string;
  outputAmount: number;
  outputAsset: VantaShieldTokenAsset | "SOL";
  outputNoteId: string;
  owner: string;
  quoteExpiresAt?: number;
  quoteId?: string;
  quoteTimestamp?: number;
  stateSignature: string;
  vaultOwner: string;
  venueFamily?: "Aggregator" | "DLMM";
  venueName?: string;
  venueNetwork?: "Mainnet";
  venuePoolAddress?: string;
};

export type VantaShieldedSolNote = {
  amount: number;
  asset: "SOL";
  consumedByTransitionId?: string;
  consumedByTransitionKind?: "swap" | "sol_unshield";
  createdAt: number;
  depositSignature?: string;
  lifecycleStatus: VantaNoteLifecycleStatus;
  noteId: string;
  owner: string;
  sourceSwapNoteId: string;
  spentMarkerId?: string;
  stateSignature: string;
  vaultOwner: string;
};

export type VantaSolUnshieldNote = {
  amount: number;
  asset: "SOL";
  assetId: string;
  consumedNoteId: string;
  createdAt: number;
  destinationOwner: string;
  kind: "sol_unshield";
  noteId: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
};

export type VantaTransitionKind =
  | VantaSendNote["kind"]
  | VantaUnshieldNote["kind"]
  | VantaSwapNote["kind"]
  | VantaSolUnshieldNote["kind"];

export type VantaSpentMarker = {
  asset: VantaShieldTokenAsset | "SOL";
  assetId: string;
  consumedNoteId: string;
  createdAt: number;
  kind: "spent_marker";
  markerId: string;
  owner: string;
  stateSignature: string;
  transitionKind: VantaTransitionKind;
  transitionNoteId: string;
  vaultOwner: string;
};

export type VantaShieldActivity =
  | VantaShieldNote
  | VantaSendNote
  | VantaUnshieldNote
  | VantaSwapNote
  | VantaSolUnshieldNote
  | VantaSpentMarker;

export type VantaNoteLifecycleStatus = "spendable" | "pending" | "consumed";

export type VantaAppNoteState = {
  amount: number;
  asset: VantaShieldTokenAsset;
  consumedByTransitionId?: string;
  consumedByTransitionKind?: VantaTransitionKind;
  createdAt: number;
  lifecycleStatus: VantaNoteLifecycleStatus;
  noteId: string;
  parentNoteId?: string;
  parentSendNoteId?: string;
  sourceType: "deposit" | "change_derived" | "swap_derived";
  spentMarkerId?: string;
  stateSignature: string;
};

export type VantaNoteStatusSummary = {
  changeDerived: number;
  consumed: number;
  swapDerived: number;
  spendable: number;
  total: number;
};

export type VantaLifecycleActivityType =
  | "shield"
  | "send"
  | "change_note_created"
  | "swap_output_created"
  | "unshield"
  | "swap"
  | "sol_unshield";

export type VantaLifecycleStateImpact =
  | "public_to_shielded"
  | "shielded_transfer"
  | "shielded_to_shielded"
  | "shielded_to_public"
  | "shielded_swap";

export type VantaLifecycleActivity = {
  amount: number;
  amountLabel?: string;
  createdAt: number;
  description: string;
  noteId?: string;
  sourceState: "Public Wallet" | "Shielded State";
  targetState: "Public Wallet" | "Shielded State";
  title: string;
  type: VantaLifecycleActivityType;
  impact: VantaLifecycleStateImpact;
};

export type VantaShieldAccountState = {
  accountId: string;
  activity: VantaShieldActivity[];
  asset: VantaShieldTokenAsset;
  balance: number;
  changeNotes: VantaShieldNote[];
  lifecycleActivities: VantaLifecycleActivity[];
  mintAddress: string;
  noteStates: VantaAppNoteState[];
  noteStatusSummary: VantaNoteStatusSummary;
  owner: string;
  sendNotes: VantaSendNote[];
  shieldNotes: VantaShieldNote[];
  shieldedSolBalance: number;
  consumedShieldedSolNotes: VantaShieldedSolNote[];
  shieldedSolNotes: VantaShieldedSolNote[];
  solUnshieldNotes: VantaSolUnshieldNote[];
  source: "vanta_onchain_notes";
  spendableShieldedSolNotes: VantaShieldedSolNote[];
  spendableShieldNotes: VantaShieldNote[];
  spentMarkers: VantaSpentMarker[];
  spentShieldNotes: VantaShieldNote[];
  status: "ready";
  swapNotes: VantaSwapNote[];
  unshieldNotes: VantaUnshieldNote[];
  vaultOwner: string;
};

type ShieldMemoPayload = {
  amount: string;
  asset: VantaShieldTokenAsset;
  createdAt: number;
  depositSignature: string;
  kind: "shield";
  mintAddress: string;
  noteId?: string;
  owner: string;
  vaultOwner: string;
};

type SendMemoPayload = {
  amount: string;
  asset: "USDC";
  changeAmount: string;
  changeNoteId?: string;
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  createdAt: number;
  kind: "send";
  mintAddress: string;
  noteId?: string;
  owner: string;
  recipient: string;
  vaultOwner: string;
};

type SendRecipientDiscoveryMemoPayload = {
  amount: string;
  asset: "USDC";
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  createdAt: number;
  kind: "send_recipient_note";
  mintAddress: string;
  recipient: string;
  recipientNoteId?: string;
  sendNoteId: string;
  vaultOwner: string;
};

type SendChangeDiscoveryMemoPayload = {
  amount: string;
  asset: "USDC";
  changeNoteId: string;
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  createdAt: number;
  kind: "send_change_note";
  mintAddress: string;
  owner: string;
  sendNoteId: string;
  vaultOwner: string;
};

type SendDualAeadMemoOptions = {
  changeViewingPublicKey?: string | null;
  recipientViewingPublicKey?: string | null;
};

type PreparedSendMemoIds = {
  changeNoteId?: string;
  noteId: string;
  recipientNoteId?: string;
};

export type VantaSendDiscoveryHandoff = {
  audience: "recipient" | "change";
  bodyHashScheme: "sha256-memo-ciphertext-body";
  claimBoundary: "local-encrypted-view-tag-body-hash-handoff-not-production-recipient-discovery";
  encryptedViewTag: string;
  forbiddenPlaintextFields: readonly string[];
  memoCiphertextBodyHash: string;
  memoPrefix: typeof VANTA_SEND_MEMO_PREFIX_V2;
  productionReady: false;
  proofBinding: "private-pool-v2-send-public-input-hash-local-only";
  version: "vanta-send-discovery-handoff-0.1";
};

type PreparedSendDualAeadMemoLeg = {
  audience: "recipient" | "change";
  ciphertextBodyHash: string;
  discoveryHandoff: VantaSendDiscoveryHandoff;
  instruction: TransactionInstructionInput;
};

export type PreparedSendDualAeadMemo = PreparedSendMemoIds & {
  changeMemo?: PreparedSendDualAeadMemoLeg;
  changeMemoCiphertextBodyHash?: string;
  kind: "vanta-send-dual-aead-scaffold-v0";
  recipientMemo: PreparedSendDualAeadMemoLeg;
  recipientMemoCiphertextBodyHash: string;
};

type UnshieldMemoPayload = {
  amount: string;
  asset: VantaShieldTokenAsset;
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  createdAt: number;
  destinationOwner: string;
  kind: "unshield";
  mintAddress: string;
  noteId?: string;
  owner: string;
  vaultOwner: string;
};

type SwapMemoPayload = {
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  createdAt: number;
  inputAmount: string;
  inputAsset: VantaShieldTokenAsset | "SOL";
  kind: "swap";
  mintAddress: string;
  noteId?: string;
  outputAmount: string;
  outputAsset: VantaShieldTokenAsset | "SOL";
  outputNoteId?: string;
  owner: string;
  quoteExpiresAt?: number;
  quoteId?: string;
  quoteTimestamp?: number;
  vaultOwner: string;
  venueFamily?: "Aggregator" | "DLMM";
  venueName?: string;
  venueNetwork?: "Mainnet";
  venuePoolAddress?: string;
};

type SwapMemoWirePayload = {
  ca: number;
  cn?: string;
  cs?: string;
  ia: string;
  ii: VantaShieldTokenAsset | "SOL";
  k: "swap";
  ma: string;
  ni: string;
  oa: string;
  oi: VantaShieldTokenAsset | "SOL";
  on: string;
  ow: string;
  qe?: number;
  qi?: string;
  qt?: number;
  vf?: "Aggregator" | "DLMM";
  vn?: string;
  vo: string;
  vp?: string;
  vw?: "Mainnet";
};

type SolUnshieldMemoPayload = {
  amount: string;
  asset: "SOL";
  assetId: string;
  consumedNoteId: string;
  createdAt: number;
  destinationOwner: string;
  kind: "sol_unshield";
  noteId?: string;
  owner: string;
  vaultOwner: string;
};

type NativeSolShieldMemoPayload = {
  amount: string;
  asset: "SOL";
  assetId: string;
  createdAt: number;
  depositSignature: string;
  kind: "native_sol_shield";
  noteId?: string;
  owner: string;
  vaultOwner: string;
};

type SpentMarkerMemoPayload = {
  asset: VantaShieldTokenAsset | "SOL";
  assetId?: string;
  consumedNoteId: string;
  createdAt: number;
  kind: "spent_marker";
  markerId?: string;
  mintAddress?: string;
  owner: string;
  sendNoteId?: string;
  transitionKind?: VantaTransitionKind;
  transitionNoteId?: string;
  vaultOwner: string;
};

function createMemoInstruction(prefix: string, payload: object): TransactionInstructionInput {
  const memoPayload = `${prefix}${JSON.stringify(payload)}`;

  return {
    accounts: [],
    data: new TextEncoder().encode(memoPayload),
    programAddress: toAddress(VANTA_SHIELD_MEMO_PROGRAM),
  };
}

function createActionMemoInstruction(
  encryptedPrefix: string,
  payload: object,
  ownerPubkey: string,
  options: ShieldMemoEncryptionOptions = {},
): TransactionInstructionInput {
  if (!options.viewingPublicKey) {
    throw new Error("Vanta action memo encryption requires a Shield viewing public key.");
  }
  return createEncryptedMemoInstruction(encryptedPrefix, payload, ownerPubkey, options);
}

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
  // btoa is available in browsers and modern Node (>= 16) globals.
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
  let binary: string;
  if (typeof atob === "function") {
    binary = atob(normalized);
  } else {
    binary = Buffer.from(normalized, "base64").toString("binary");
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function bytesToLowerHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decodeMemoInstructionText(instruction: TransactionInstructionInput) {
  return new TextDecoder().decode(instruction.data);
}

function memoCiphertextBodyHash(memoText: string, prefix: string) {
  const trimmed = memoText.trim();
  const start = trimmed.indexOf(prefix);
  if (start === -1) {
    throw new Error("Vanta memo ciphertext hash requires the expected memo prefix.");
  }
  const ciphertextBody = trimmed.slice(start + prefix.length).trim();
  if (!ciphertextBody) {
    throw new Error("Vanta memo ciphertext hash requires a non-empty ciphertext body.");
  }
  const domain = utf8ToBytes("vanta-send-memo-ciphertext-body-hash:v0");
  const prefixBytes = utf8ToBytes(prefix);
  const bodyBytes = base64UrlDecode(ciphertextBody);
  const material = new Uint8Array(domain.length + prefixBytes.length + bodyBytes.length);
  material.set(domain, 0);
  material.set(prefixBytes, domain.length);
  material.set(bodyBytes, domain.length + prefixBytes.length);
  return `sha256:${bytesToLowerHex(sha256(material))}`;
}

function deriveShieldMemoSymmetricKey(ownerPubkey: string): Uint8Array {
  // TODO(viewing-key): replace this owner-derived placeholder with a proper
  // ECDH(owner_viewing_key, ephemeral_pubkey) key agreement before mainnet so
  // anyone scraping the chain cannot reproduce the memo key from a public
  // pubkey alone. For the v2 prototype we hash the UTF-8 base58-encoded owner
  // string with a domain separator; this only frustrates passive scrapers.
  const domain = utf8ToBytes(VANTA_SHIELD_MEMO_KEY_DOMAIN_V1);
  const owner = utf8ToBytes(ownerPubkey);
  const material = new Uint8Array(domain.length + owner.length);
  material.set(domain, 0);
  material.set(owner, domain.length);
  return sha256(material);
}

function createEncryptedMemoInstruction(
  prefix: string,
  payload: object,
  ownerPubkey: string,
  options: ShieldMemoEncryptionOptions = {},
): TransactionInstructionInput {
  if (options.viewingPublicKey) {
    return {
      accounts: [],
      data: new TextEncoder().encode(
        encryptVantaShieldMemoToViewingKey({
          payload,
          prefix,
          viewingPublicKey: options.viewingPublicKey,
        }),
      ),
      programAddress: toAddress(VANTA_SHIELD_MEMO_PROGRAM),
    };
  }

  // Legacy fallback for already-written v2 memos and non-browser test callers
  // that have not yet been passed an explicit viewing key.
  const key = deriveShieldMemoSymmetricKey(ownerPubkey);
  const nonce = new Uint8Array(24);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(nonce);
  } else {
    // Fallback for environments without WebCrypto. Should not happen in browser
    // or modern Node (>= 19), but keeps the helper safe under test harnesses.
    const nodeCrypto = (globalThis as { crypto?: Crypto }).crypto;
    if (nodeCrypto && typeof nodeCrypto.getRandomValues === "function") {
      nodeCrypto.getRandomValues(nonce);
    } else {
      throw new Error("Vanta shield memo encryption requires crypto.getRandomValues");
    }
  }
  const cipher = xchacha20poly1305(key, nonce);
  const plaintext = utf8ToBytes(canonicalJsonStringify(payload));
  const ciphertext = cipher.encrypt(plaintext);

  const body = new Uint8Array(1 + nonce.length + ciphertext.length);
  body[0] = VANTA_SHIELD_MEMO_VERSION_BYTE;
  body.set(nonce, 1);
  body.set(ciphertext, 1 + nonce.length);

  const memoPayload = `${prefix}${base64UrlEncode(body)}`;

  return {
    accounts: [],
    data: new TextEncoder().encode(memoPayload),
    programAddress: toAddress(VANTA_SHIELD_MEMO_PROGRAM),
  };
}

function tryDecryptShieldMemoBody<T>(
  memoText: string,
  prefix: string,
  ownerPubkey: string,
  options: ShieldMemoDecryptionOptions = {},
): T | null {
  if (typeof memoText !== "string") {
    return null;
  }

  if (options.viewingSecretKey) {
    const viewingKeyPayload = decryptVantaShieldMemoWithViewingKey<T>({
      memoText,
      prefix,
      viewingSecretKey: options.viewingSecretKey,
    });
    if (viewingKeyPayload) {
      return viewingKeyPayload;
    }
  }

  const trimmed = memoText.trim();
  const start = trimmed.indexOf(prefix);
  if (start === -1) {
    return null;
  }

  const encoded = trimmed.slice(start + prefix.length).trim();
  if (encoded.length === 0) {
    return null;
  }

  let body: Uint8Array;
  try {
    body = base64UrlDecode(encoded);
  } catch {
    return null;
  }

  if (body.length < 1 + 24 + 16) {
    return null;
  }
  if (body[0] !== VANTA_SHIELD_MEMO_VERSION_BYTE) {
    return null;
  }

  const nonce = body.slice(1, 1 + 24);
  const ciphertext = body.slice(1 + 24);
  const key = deriveShieldMemoSymmetricKey(ownerPubkey);

  let plaintext: Uint8Array;
  try {
    const cipher = xchacha20poly1305(key, nonce);
    plaintext = cipher.decrypt(ciphertext);
  } catch {
    return null;
  }

  try {
    const text = new TextDecoder().decode(plaintext);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function tryDecryptShieldMemo(
  memoText: string,
  ownerPubkey: string,
  options: ShieldMemoDecryptionOptions = {},
): ShieldMemoPayload | null {
  return tryDecryptShieldMemoBody<ShieldMemoPayload>(
    memoText,
    VANTA_SHIELD_MEMO_PREFIX_V2,
    ownerPubkey,
    options,
  );
}

export function tryDecryptNativeSolShieldMemo(
  memoText: string,
  ownerPubkey: string,
  options: ShieldMemoDecryptionOptions = {},
): NativeSolShieldMemoPayload | null {
  return tryDecryptShieldMemoBody<NativeSolShieldMemoPayload>(
    memoText,
    VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX_V2,
    ownerPubkey,
    options,
  );
}

function hashString(input: string) {
  let hash = 0xcbf29ce484222325n;

  for (const char of input) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, "0");
}

function isShieldTokenAsset(value: unknown): value is VantaShieldTokenAsset {
  return (
    typeof value === "string" &&
    (ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS as readonly string[]).includes(value)
  );
}

function resolveShieldTokenAssetFromMint(mintAddress: string): VantaShieldTokenAsset | null {
  for (const assetKey of ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS) {
    const asset = getLiveShieldTokenAsset(assetKey);
    if (asset.mintAddress === mintAddress) {
      return asset.assetKey;
    }
  }

  return null;
}

function formatShieldTokenAmount(asset: VantaShieldTokenAsset, amount: number) {
  const decimals = Math.min(getLiveShieldTokenAsset(asset).decimals, 4);
  return `${amount.toFixed(decimals)} ${asset}`;
}

function getShieldAssetAmountDecimals(asset: VantaShieldTokenAsset | "SOL") {
  if (asset === "SOL") {
    return 9;
  }

  return getLiveShieldTokenAsset(asset).decimals;
}

function createDeterministicNoteId(parts: Record<string, string | number>) {
  const material = Object.entries(parts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  return `vnta_note_${hashString(material)}`;
}

function extractMemoPayload(
  memo: string | null | undefined,
  prefix: string,
) {
  if (!memo) {
    return null;
  }

  const trimmedMemo = memo.trim();
  const memoStart = trimmedMemo.indexOf(prefix);

  if (memoStart === -1) {
    return null;
  }

  return trimmedMemo.slice(memoStart + prefix.length);
}

export function getVantaSendHistoryPrivacyScopePolicy() {
  return {
    version: VANTA_SEND_HISTORY_PRIVACY_SCOPE_VERSION,
    freshV2OnlyProductionClaims: true,
    freshV2ProductionPrivacyScope:
      "fresh v2 viewing-key AEAD Send memos created after the scope policy",
    legacyV1ParseCompatible: true,
    legacyV1EligibleForProductionPrivacyClaims: false,
    legacyV1Scope: "historical plaintext compatibility only",
    migrationStatus: "not-migrated",
    productionReady: false,
    scopeBoundary:
      "production Send privacy claims are scoped to fresh v2 AEAD sends unless legacy v1 plaintext history is migrated or segregated with reviewed evidence",
  } as const;
}

export function getVantaLegacyV1MemoQuarantinePolicy() {
  return {
    version: VANTA_LEGACY_V1_MEMO_QUARANTINE_POLICY_VERSION,
    status: "legacy-v1-plaintext-memos-quarantined-parse-compatible-history",
    appliesToPrefixes: [
      VANTA_SHIELD_MEMO_PREFIX,
      VANTA_SEND_MEMO_PREFIX,
      VANTA_UNSHIELD_MEMO_PREFIX,
      VANTA_SWAP_MEMO_PREFIX,
      VANTA_SOL_UNSHIELD_MEMO_PREFIX,
      VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX,
      VANTA_SPENT_MARKER_MEMO_PREFIX,
    ],
    freshV2EncryptedRequiredForNewMemos: true,
    freshV2ViewingKeyAeadRequiredForNewActionMemos: true,
    legacyV1ParseCompatible: true,
    migrated: false,
    productionPrivacyClaimsEligible: false,
    privacyClaimsExcluded: true,
    quarantineBoundary:
      "legacy v1 plaintext memo chain history is parse-compatible history only and is excluded from production privacy, anonymity, proof-verified, and mainnet-private claims unless migrated or segregated with reviewed evidence",
  } as const;
}

function createShieldNoteId(payload: Omit<ShieldMemoPayload, "kind" | "noteId">) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    createdAt: payload.createdAt,
    depositSignature: payload.depositSignature,
    kind: "shield",
    mintAddress: payload.mintAddress,
    owner: payload.owner,
    vaultOwner: payload.vaultOwner,
  });
}

function createSendNoteId(payload: Omit<SendMemoPayload, "kind" | "noteId" | "changeNoteId">) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    changeAmount: payload.changeAmount,
    consumedNoteId: payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
    createdAt: payload.createdAt,
    kind: "send",
    mintAddress: payload.mintAddress,
    owner: payload.owner,
    recipient: payload.recipient,
    vaultOwner: payload.vaultOwner,
  });
}

function createUnshieldNoteId(
  payload: Omit<UnshieldMemoPayload, "kind" | "noteId">,
) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    consumedNoteId: payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
    createdAt: payload.createdAt,
    destinationOwner: payload.destinationOwner,
    kind: "unshield",
    mintAddress: payload.mintAddress,
    owner: payload.owner,
    vaultOwner: payload.vaultOwner,
  });
}

function createSwapNoteId(payload: Omit<SwapMemoPayload, "kind" | "noteId" | "outputNoteId">) {
  return createDeterministicNoteId({
    consumedNoteId: payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
    createdAt: payload.createdAt,
    inputAmount: payload.inputAmount,
    inputAsset: payload.inputAsset,
    kind: "swap",
    mintAddress: payload.mintAddress,
    outputAmount: payload.outputAmount,
    outputAsset: payload.outputAsset,
    owner: payload.owner,
    quoteId: payload.quoteId ?? "no_quote",
    vaultOwner: payload.vaultOwner,
  });
}

function createSolUnshieldNoteId(
  payload: Omit<SolUnshieldMemoPayload, "kind" | "noteId">,
) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    assetId: payload.assetId,
    consumedNoteId: payload.consumedNoteId,
    createdAt: payload.createdAt,
    destinationOwner: payload.destinationOwner,
    kind: "sol_unshield",
    owner: payload.owner,
    vaultOwner: payload.vaultOwner,
  });
}

function createNativeSolShieldNoteId(
  payload: Omit<NativeSolShieldMemoPayload, "kind" | "noteId">,
) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    assetId: payload.assetId,
    createdAt: payload.createdAt,
    depositSignature: payload.depositSignature,
    kind: "native_sol_shield",
    owner: payload.owner,
    vaultOwner: payload.vaultOwner,
  });
}

function createSwapOutputNoteId(args: {
  createdAt: number;
  outputAsset: VantaShieldTokenAsset | "SOL";
  outputAmount: string;
  owner: string;
  sourceSwapNoteId: string;
}) {
  return createDeterministicNoteId({
    asset: args.outputAsset,
    createdAt: args.createdAt,
    kind: "swap_output",
    outputAmount: args.outputAmount,
    owner: args.owner,
    sourceSwapNoteId: args.sourceSwapNoteId,
  });
}

function createChangeNoteId(args: {
  amount: string;
  createdAt: number;
  mintAddress: string;
  owner: string;
  parentNoteId: string;
  parentSendNoteId: string;
  vaultOwner: string;
}) {
  return createDeterministicNoteId({
    amount: args.amount,
    asset: "USDC",
    createdAt: args.createdAt,
    kind: "change",
    mintAddress: args.mintAddress,
    owner: args.owner,
    parentNoteId: args.parentNoteId,
    parentSendNoteId: args.parentSendNoteId,
    vaultOwner: args.vaultOwner,
  });
}

export function createRecipientSelfNoteId(args: {
  amount: string;
  createdAt: number;
  mintAddress: string;
  owner: string;
  parentNoteId: string;
  parentSendNoteId: string;
  vaultOwner: string;
}) {
  return createDeterministicNoteId({
    amount: args.amount,
    asset: "USDC",
    createdAt: args.createdAt,
    kind: "recipient_self",
    mintAddress: args.mintAddress,
    owner: args.owner,
    parentNoteId: args.parentNoteId,
    parentSendNoteId: args.parentSendNoteId,
    vaultOwner: args.vaultOwner,
  });
}

function createSpentMarkerId(
  payload: Omit<SpentMarkerMemoPayload, "kind" | "markerId">,
) {
  return createDeterministicNoteId({
    asset: payload.asset,
    assetId: payload.assetId ?? payload.mintAddress ?? VANTA_NATIVE_SOL_ASSET_ID,
    consumedNoteId: payload.consumedNoteId,
    createdAt: payload.createdAt,
    kind: "spent_marker",
    owner: payload.owner,
    transitionKind: payload.transitionKind ?? "send",
    transitionNoteId: payload.transitionNoteId ?? payload.sendNoteId ?? "legacy",
    vaultOwner: payload.vaultOwner,
  }).replace("vnta_note_", "vnta_spent_");
}

function amountsMatch(left: number, right: number) {
  return Math.abs(left - right) <= 0.000001;
}

async function fetchParsedTransactionsOneAtATime(
  connection: Connection,
  signatures: readonly string[],
) {
  const transactions = [];

  for (const signature of signatures) {
    const [transaction] = await connection.getParsedTransactions([signature], {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    transactions.push(transaction);
  }

  return transactions;
}

function readParsedMemoText(instruction: unknown) {
  if (!instruction || typeof instruction !== "object") {
    return null;
  }

  const parsedInstruction = instruction as {
    parsed?: unknown;
    program?: unknown;
    programId?: { toBase58?: () => string } | string;
  };
  const programId =
    typeof parsedInstruction.programId === "string"
      ? parsedInstruction.programId
      : parsedInstruction.programId?.toBase58?.();
  const isMemoInstruction =
    parsedInstruction.program === "spl-memo" || programId === VANTA_SHIELD_MEMO_PROGRAM;

  if (!isMemoInstruction) {
    return null;
  }

  return readParsedMemoPayloadText(parsedInstruction.parsed, { allowBareString: true });
}

function readParsedMemoPayloadText(
  value: unknown,
  options: { allowBareString?: boolean } = {},
): string | null {
  if (typeof value === "string") {
    return options.allowBareString ? value : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as Record<string, unknown>;

  for (const key of ["memo", "data", "message", "text", "info"]) {
    const field = parsed[key];

    if (typeof field === "string") {
      return field;
    }

    if (field && typeof field === "object") {
      const memo = readParsedMemoPayloadText(field, { allowBareString: false });

      if (memo) {
        return memo;
      }
    }
  }

  for (const [key, field] of Object.entries(parsed)) {
    if (["memo", "data", "message", "text", "info"].includes(key)) {
      continue;
    }

    const memo = readParsedMemoPayloadText(field, { allowBareString: false });

    if (memo) {
      return memo;
    }
  }

  return null;
}

async function fetchSignatureMemoEntries(args: {
  owner: string;
  signatures: readonly { err: unknown; memo?: string | null; signature: unknown }[];
}) {
  const confirmedSignatures = args.signatures
    .filter((item) => item.err === null)
    .map((item) => ({
      memo: typeof item.memo === "string" ? item.memo : null,
      signature: String(item.signature),
    }));
  const memoEntries = new Map<string, SignatureMemoEntry>();

  for (const entry of confirmedSignatures) {
    if (entry.memo) {
      memoEntries.set(`${entry.signature}:${entry.memo}`, entry);
    }
  }

  if (confirmedSignatures.length === 0) {
    return [];
  }

  for (const readEndpoint of shieldStateReadRpcEndpoints) {
    try {
      const connection = new Connection(readEndpoint, "confirmed");
      const transactions = await fetchParsedTransactionsOneAtATime(
        connection,
        confirmedSignatures.map((entry) => entry.signature),
      );

      for (let index = 0; index < transactions.length; index += 1) {
        const transaction = transactions[index];
        const signature = confirmedSignatures[index]?.signature;

        if (!transaction || !signature) {
          continue;
        }

        for (const instruction of transaction.transaction.message.instructions) {
          const memo = readParsedMemoText(instruction);

          if (memo) {
            memoEntries.set(`${signature}:${memo}`, {
              memo,
              signature,
              transaction,
            });
          }
        }
      }
    } catch {
      // Some public RPCs reject parsed transaction history calls. Keep trying
      // browser-safe read fallbacks before relying on signature summaries.
    }
  }

  return [...memoEntries.values()];
}

export function createShieldMemoInstruction(
  payload: Omit<ShieldMemoPayload, "kind" | "noteId">,
  options: ShieldMemoEncryptionOptions = {},
): TransactionInstructionInput {
  // The noteId remains derived deterministically so other code that consumes
  // it stays byte-identical, but it now lives only inside the encrypted
  // payload so it never appears in cleartext on-chain.
  const fullPayload: ShieldMemoPayload = {
    ...payload,
    kind: "shield",
    noteId: createShieldNoteId(payload),
  };
  return createEncryptedMemoInstruction(
    VANTA_SHIELD_MEMO_PREFIX_V2,
    fullPayload,
    payload.owner,
    options,
  );
}

export function createNativeSolShieldMemoInstruction(
  payload: Omit<NativeSolShieldMemoPayload, "kind" | "noteId" | "asset">,
  options: ShieldMemoEncryptionOptions = {},
): TransactionInstructionInput {
  const fullPayload: NativeSolShieldMemoPayload = {
    ...payload,
    asset: "SOL",
    kind: "native_sol_shield",
    noteId: createNativeSolShieldNoteId({
      ...payload,
      asset: "SOL",
    }),
  };
  return createEncryptedMemoInstruction(
    VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX_V2,
    fullPayload,
    payload.owner,
    options,
  );
}

export function createSendMemoInstruction(
  payload: Omit<SendMemoPayload, "kind" | "noteId" | "changeNoteId">,
  options: ShieldMemoEncryptionOptions = {},
): TransactionInstructionInput {
  return createPreparedSendMemo(payload, options).instruction;
}

function createPreparedSendMemoIds(
  payload: Omit<SendMemoPayload, "kind" | "noteId" | "changeNoteId">,
): PreparedSendMemoIds {
  const noteId = createSendNoteId(payload);
  const recipientNoteId =
    Number(payload.amount) > 0 && payload.recipient === payload.owner
      ? createRecipientSelfNoteId({
          amount: payload.amount,
          createdAt: payload.createdAt,
          mintAddress: payload.mintAddress,
          owner: payload.owner,
          parentNoteId:
            payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
          parentSendNoteId: noteId,
          vaultOwner: payload.vaultOwner,
        })
      : undefined;
  const changeNoteId =
    Number(payload.changeAmount) > 0
      ? createChangeNoteId({
          amount: payload.changeAmount,
          createdAt: payload.createdAt,
          mintAddress: payload.mintAddress,
          owner: payload.owner,
          parentNoteId:
            payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
          parentSendNoteId: noteId,
          vaultOwner: payload.vaultOwner,
        })
      : undefined;

  return {
    changeNoteId,
    noteId,
    recipientNoteId,
  };
}

export function createPreparedSendMemo(
  payload: Omit<SendMemoPayload, "kind" | "noteId" | "changeNoteId">,
  options: ShieldMemoEncryptionOptions = {},
) {
  const ids = createPreparedSendMemoIds(payload);

  return {
    ...ids,
    instruction: createActionMemoInstruction(VANTA_SEND_MEMO_PREFIX_V2, {
      ...payload,
      kind: "send",
      noteId: ids.noteId,
      changeNoteId: ids.changeNoteId,
    } satisfies SendMemoPayload, payload.owner, options),
  };
}

function createPreparedSendDualAeadMemoLeg(
  audience: PreparedSendDualAeadMemoLeg["audience"],
  payload: object,
  viewingPublicKey: string | null | undefined,
): PreparedSendDualAeadMemoLeg {
  if (!viewingPublicKey) {
    throw new Error("Vanta action memo encryption requires a Shield viewing public key.");
  }
  const encryptedMemo = encryptVantaShieldMemoToViewingKeyPacket({
    payload,
    prefix: VANTA_SEND_MEMO_PREFIX_V2,
    viewingPublicKey,
  });
  const instruction = {
    accounts: [],
    data: new TextEncoder().encode(encryptedMemo.memoText),
    programAddress: toAddress(VANTA_SHIELD_MEMO_PROGRAM),
  };
  const ciphertextBodyHash = memoCiphertextBodyHash(
    decodeMemoInstructionText(instruction),
    VANTA_SEND_MEMO_PREFIX_V2,
  );
  const discoveryHandoff: VantaSendDiscoveryHandoff = {
    audience,
    bodyHashScheme: "sha256-memo-ciphertext-body",
    claimBoundary:
      "local-encrypted-view-tag-body-hash-handoff-not-production-recipient-discovery",
    encryptedViewTag: encryptedMemo.encryptedViewTag,
    forbiddenPlaintextFields: [
      "recipient",
      "owner",
      "amount",
      "asset",
      "plaintextMemo",
      "inputCommitment",
      "inputLeafIndex",
      "depositSignature",
      "serializedTransaction",
      "walletPrivateKey",
      "seedPhrase",
      "privateInputs",
      "witness",
    ],
    memoCiphertextBodyHash: ciphertextBodyHash,
    memoPrefix: VANTA_SEND_MEMO_PREFIX_V2,
    productionReady: false,
    proofBinding: "private-pool-v2-send-public-input-hash-local-only",
    version: "vanta-send-discovery-handoff-0.1",
  };

  return {
    audience,
    ciphertextBodyHash,
    discoveryHandoff,
    instruction,
  };
}

export function createPreparedSendDualAeadMemo(
  payload: Omit<SendMemoPayload, "kind" | "noteId" | "changeNoteId">,
  options: SendDualAeadMemoOptions = {},
): PreparedSendDualAeadMemo {
  const ids = createPreparedSendMemoIds(payload);
  const recipientMemo = createPreparedSendDualAeadMemoLeg(
    "recipient",
    {
      amount: payload.amount,
      asset: payload.asset,
      consumedNoteId: payload.consumedNoteId,
      consumedShieldStateSignature: payload.consumedShieldStateSignature,
      createdAt: payload.createdAt,
      kind: "send_recipient_note",
      mintAddress: payload.mintAddress,
      recipient: payload.recipient,
      recipientNoteId: ids.recipientNoteId,
      sendNoteId: ids.noteId,
      vaultOwner: payload.vaultOwner,
    } satisfies SendRecipientDiscoveryMemoPayload,
    options.recipientViewingPublicKey,
  );
  const changeMemo =
    Number(payload.changeAmount) > 0 && ids.changeNoteId
      ? createPreparedSendDualAeadMemoLeg(
          "change",
          {
            amount: payload.changeAmount,
            asset: payload.asset,
            changeNoteId: ids.changeNoteId,
            consumedNoteId: payload.consumedNoteId,
            consumedShieldStateSignature: payload.consumedShieldStateSignature,
            createdAt: payload.createdAt,
            kind: "send_change_note",
            mintAddress: payload.mintAddress,
            owner: payload.owner,
            sendNoteId: ids.noteId,
            vaultOwner: payload.vaultOwner,
          } satisfies SendChangeDiscoveryMemoPayload,
          options.changeViewingPublicKey,
        )
      : undefined;

  return {
    ...ids,
    changeMemo,
    changeMemoCiphertextBodyHash: changeMemo?.ciphertextBodyHash,
    kind: "vanta-send-dual-aead-scaffold-v0",
    recipientMemo,
    recipientMemoCiphertextBodyHash: recipientMemo.ciphertextBodyHash,
  };
}

export function createPreparedUnshieldMemo(
  payload: Omit<UnshieldMemoPayload, "kind" | "noteId">,
  options: ShieldMemoEncryptionOptions = {},
) {
  const noteId = createUnshieldNoteId(payload);

  return {
    instruction: createActionMemoInstruction(VANTA_UNSHIELD_MEMO_PREFIX_V2, {
      ...payload,
      kind: "unshield",
      noteId,
    } satisfies UnshieldMemoPayload, payload.owner, options),
    noteId,
  };
}

export function createPreparedSwapMemo(
  payload: Omit<SwapMemoPayload, "kind" | "noteId" | "outputNoteId">,
  options: ShieldMemoEncryptionOptions = {},
) {
  const noteId = createSwapNoteId(payload);
  const outputNoteId = createSwapOutputNoteId({
    createdAt: payload.createdAt,
    outputAsset: payload.outputAsset,
    outputAmount: payload.outputAmount,
    owner: payload.owner,
    sourceSwapNoteId: noteId,
  });

  return {
    instruction: createActionMemoInstruction(VANTA_SWAP_MEMO_PREFIX_V2, {
      ca: payload.createdAt,
      cn: payload.consumedNoteId,
      cs: payload.consumedShieldStateSignature,
      ia: payload.inputAmount,
      ii: payload.inputAsset,
      k: "swap",
      ma: payload.mintAddress,
      ni: noteId,
      oa: payload.outputAmount,
      oi: payload.outputAsset,
      on: outputNoteId,
      ow: payload.owner,
      qe: payload.quoteExpiresAt,
      qi: payload.quoteId,
      qt: payload.quoteTimestamp,
      vf: payload.venueFamily,
      vn: payload.venueName,
      vo: payload.vaultOwner,
      vp: payload.venuePoolAddress,
      vw: payload.venueNetwork,
    } satisfies SwapMemoWirePayload, payload.owner, options),
    noteId,
    outputNoteId,
  };
}

export function createPreparedSolUnshieldMemo(
  payload: Omit<SolUnshieldMemoPayload, "kind" | "noteId">,
  options: ShieldMemoEncryptionOptions = {},
) {
  const noteId = createSolUnshieldNoteId(payload);

  return {
    instruction: createActionMemoInstruction(VANTA_SOL_UNSHIELD_MEMO_PREFIX_V2, {
      ...payload,
      kind: "sol_unshield",
      noteId,
    } satisfies SolUnshieldMemoPayload, payload.owner, options),
    noteId,
  };
}

export function createSpentMarkerInstruction(
  payload: Omit<SpentMarkerMemoPayload, "kind" | "markerId">,
  options: ShieldMemoEncryptionOptions = {},
): TransactionInstructionInput {
  return createActionMemoInstruction(VANTA_SPENT_MARKER_MEMO_PREFIX_V2, {
    ...payload,
    kind: "spent_marker",
    markerId: createSpentMarkerId(payload),
  } satisfies SpentMarkerMemoPayload, payload.owner, options);
}

export function getShieldAccountId(owner: string, mintAddress: string) {
  return `vanta-shield:${owner}:${mintAddress}`;
}

function shieldNoteFromMemoPayload(
  parsed: Partial<ShieldMemoPayload>,
  stateSignature: string,
): VantaShieldNote | null {
  if (
    parsed.kind !== "shield" ||
    !isShieldTokenAsset(parsed.asset) ||
    typeof parsed.owner !== "string" ||
    typeof parsed.mintAddress !== "string" ||
    typeof parsed.vaultOwner !== "string" ||
    typeof parsed.depositSignature !== "string" ||
    typeof parsed.amount !== "string" ||
    typeof parsed.createdAt !== "number"
  ) {
    return null;
  }

  const parsedAmount = Number(parsed.amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  const depositSignature =
    parsed.depositSignature === VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE
      ? stateSignature
      : parsed.depositSignature;
  const noteId =
    parsed.depositSignature !== VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE &&
    typeof parsed.noteId === "string"
      ? parsed.noteId
      : createShieldNoteId({
          amount: parsed.amount,
          asset: parsed.asset,
          createdAt: parsed.createdAt,
          depositSignature,
          mintAddress: parsed.mintAddress,
          owner: parsed.owner,
          vaultOwner: parsed.vaultOwner,
        });

  return {
    amount: parsedAmount,
    asset: parsed.asset,
    createdAt: parsed.createdAt,
    depositSignature,
    kind: "shield",
    mintAddress: parsed.mintAddress,
    noteId,
    origin: "deposit",
    owner: parsed.owner,
    stateSignature,
    vaultOwner: parsed.vaultOwner,
  };
}

function parseShieldMemo(
  memo: string | null | undefined,
  stateSignature: string,
  owner: string,
  options: ShieldMemoDecryptionOptions = {},
): VantaShieldNote | null {
  const encryptedPayload = tryDecryptShieldMemo(memo ?? "", owner, options);
  if (encryptedPayload) {
    return shieldNoteFromMemoPayload(encryptedPayload, stateSignature);
  }

  const memoPayload = extractMemoPayload(memo, VANTA_SHIELD_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    return shieldNoteFromMemoPayload(
      JSON.parse(memoPayload) as Partial<ShieldMemoPayload>,
      stateSignature,
    );
  } catch {
    return null;
  }
}

function nativeSolShieldNoteFromMemoPayload(
  parsed: Partial<NativeSolShieldMemoPayload>,
  stateSignature: string,
): Omit<VantaShieldedSolNote, "lifecycleStatus"> | null {
  if (
    parsed.kind !== "native_sol_shield" ||
    parsed.asset !== "SOL" ||
    typeof parsed.assetId !== "string" ||
    typeof parsed.owner !== "string" ||
    typeof parsed.vaultOwner !== "string" ||
    typeof parsed.depositSignature !== "string" ||
    typeof parsed.amount !== "string" ||
    typeof parsed.createdAt !== "number"
  ) {
    return null;
  }

  const parsedAmount = Number(parsed.amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  const depositSignature =
    parsed.depositSignature === VANTA_NATIVE_SOL_SAME_TRANSACTION_DEPOSIT_SIGNATURE
      ? stateSignature
      : parsed.depositSignature;
  const noteId =
    typeof parsed.noteId === "string"
      ? parsed.noteId
      : createNativeSolShieldNoteId({
          amount: parsed.amount,
          asset: "SOL",
          assetId: parsed.assetId,
          createdAt: parsed.createdAt,
          depositSignature,
          owner: parsed.owner,
          vaultOwner: parsed.vaultOwner,
        });

  return {
    amount: parsedAmount,
    asset: "SOL",
    createdAt: parsed.createdAt,
    depositSignature,
    noteId,
    owner: parsed.owner,
    sourceSwapNoteId: "native-sol-shield",
    stateSignature,
    vaultOwner: parsed.vaultOwner,
  };
}

function parseNativeSolShieldMemo(
  memo: string | null | undefined,
  stateSignature: string,
  owner: string,
  options: ShieldMemoDecryptionOptions = {},
): Omit<VantaShieldedSolNote, "lifecycleStatus"> | null {
  const encryptedPayload = tryDecryptNativeSolShieldMemo(memo ?? "", owner, options);
  if (encryptedPayload) {
    return nativeSolShieldNoteFromMemoPayload(encryptedPayload, stateSignature);
  }

  const memoPayload = extractMemoPayload(memo, VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    return nativeSolShieldNoteFromMemoPayload(
      JSON.parse(memoPayload) as Partial<NativeSolShieldMemoPayload>,
      stateSignature,
    );
  } catch {
    return null;
  }
}

export function parseSendMemo(
  memo: string | null | undefined,
  stateSignature: string,
  options: ShieldMemoDecryptionOptions = {},
): (Omit<VantaSendNote, "consumedNoteId" | "noteId"> & {
  changeNoteId?: string;
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  noteId?: string;
}) | null {
  const encryptedPayload = tryDecryptShieldMemoBody<SendMemoPayload>(
    memo ?? "",
    VANTA_SEND_MEMO_PREFIX_V2,
    "",
    options,
  );
  const memoPayload = extractMemoPayload(memo, VANTA_SEND_MEMO_PREFIX);

  if (!encryptedPayload && !memoPayload) {
    return null;
  }

  try {
    const memoPrivacyScope: VantaSendMemoPrivacyScope = encryptedPayload
      ? "fresh-v2-viewing-key-aead"
      : "legacy-v1-plaintext-history";
    const parsed = encryptedPayload ?? (JSON.parse(memoPayload ?? "") as Partial<SendMemoPayload>);

    if (
      parsed.kind !== "send" ||
      parsed.asset !== "USDC" ||
      typeof parsed.owner !== "string" ||
      typeof parsed.mintAddress !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.recipient !== "string" ||
      typeof parsed.amount !== "string" ||
      typeof parsed.changeAmount !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    const parsedAmount = Number(parsed.amount);
    const parsedChangeAmount = Number(parsed.changeAmount);

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !Number.isFinite(parsedChangeAmount) ||
      parsedChangeAmount < 0
    ) {
      return null;
    }

    return {
      amount: parsedAmount,
      asset: "USDC",
      changeAmount: parsedChangeAmount,
      changeNoteId:
        typeof parsed.changeNoteId === "string" ? parsed.changeNoteId : undefined,
      consumedNoteId:
        typeof parsed.consumedNoteId === "string" ? parsed.consumedNoteId : undefined,
      consumedShieldStateSignature:
        typeof parsed.consumedShieldStateSignature === "string"
          ? parsed.consumedShieldStateSignature
          : undefined,
      createdAt: parsed.createdAt,
      kind: "send",
      memoPrivacyScope,
      mintAddress: parsed.mintAddress,
      noteId: typeof parsed.noteId === "string" ? parsed.noteId : undefined,
      owner: parsed.owner,
      productionPrivacyScopeEligible:
        memoPrivacyScope === "fresh-v2-viewing-key-aead",
      recipient: parsed.recipient,
      stateSignature,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

export function parseSendRecipientDiscoveryMemo(
  memo: string | null | undefined,
  stateSignature: string,
  options: ShieldMemoDecryptionOptions = {},
): (SendRecipientDiscoveryMemoPayload & { stateSignature: string }) | null {
  const parsed = tryDecryptShieldMemoBody<Partial<SendRecipientDiscoveryMemoPayload>>(
    memo ?? "",
    VANTA_SEND_MEMO_PREFIX_V2,
    "",
    options,
  );

  if (
    parsed?.kind !== "send_recipient_note" ||
    parsed.asset !== "USDC" ||
    typeof parsed.amount !== "string" ||
    typeof parsed.createdAt !== "number" ||
    typeof parsed.mintAddress !== "string" ||
    typeof parsed.recipient !== "string" ||
    typeof parsed.sendNoteId !== "string" ||
    typeof parsed.vaultOwner !== "string"
  ) {
    return null;
  }

  const parsedAmount = Number(parsed.amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  return {
    amount: parsed.amount,
    asset: "USDC",
    consumedNoteId:
      typeof parsed.consumedNoteId === "string" ? parsed.consumedNoteId : undefined,
    consumedShieldStateSignature:
      typeof parsed.consumedShieldStateSignature === "string"
        ? parsed.consumedShieldStateSignature
        : undefined,
    createdAt: parsed.createdAt,
    kind: "send_recipient_note",
    mintAddress: parsed.mintAddress,
    recipient: parsed.recipient,
    recipientNoteId:
      typeof parsed.recipientNoteId === "string" ? parsed.recipientNoteId : undefined,
    sendNoteId: parsed.sendNoteId,
    stateSignature,
    vaultOwner: parsed.vaultOwner,
  };
}

export function parseSendChangeDiscoveryMemo(
  memo: string | null | undefined,
  stateSignature: string,
  options: ShieldMemoDecryptionOptions = {},
): (SendChangeDiscoveryMemoPayload & { stateSignature: string }) | null {
  const parsed = tryDecryptShieldMemoBody<Partial<SendChangeDiscoveryMemoPayload>>(
    memo ?? "",
    VANTA_SEND_MEMO_PREFIX_V2,
    "",
    options,
  );

  if (
    parsed?.kind !== "send_change_note" ||
    parsed.asset !== "USDC" ||
    typeof parsed.amount !== "string" ||
    typeof parsed.changeNoteId !== "string" ||
    typeof parsed.createdAt !== "number" ||
    typeof parsed.mintAddress !== "string" ||
    typeof parsed.owner !== "string" ||
    typeof parsed.sendNoteId !== "string" ||
    typeof parsed.vaultOwner !== "string"
  ) {
    return null;
  }

  const parsedAmount = Number(parsed.amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  return {
    amount: parsed.amount,
    asset: "USDC",
    changeNoteId: parsed.changeNoteId,
    consumedNoteId:
      typeof parsed.consumedNoteId === "string" ? parsed.consumedNoteId : undefined,
    consumedShieldStateSignature:
      typeof parsed.consumedShieldStateSignature === "string"
        ? parsed.consumedShieldStateSignature
        : undefined,
    createdAt: parsed.createdAt,
    kind: "send_change_note",
    mintAddress: parsed.mintAddress,
    owner: parsed.owner,
    sendNoteId: parsed.sendNoteId,
    stateSignature,
    vaultOwner: parsed.vaultOwner,
  };
}

export function parseSpentMarkerMemo(
  memo: string | null | undefined,
  stateSignature: string,
  options: ShieldMemoDecryptionOptions = {},
): VantaSpentMarker | null {
  const encryptedPayload = tryDecryptShieldMemoBody<SpentMarkerMemoPayload>(
    memo ?? "",
    VANTA_SPENT_MARKER_MEMO_PREFIX_V2,
    "",
    options,
  );
  const memoPayload = extractMemoPayload(memo, VANTA_SPENT_MARKER_MEMO_PREFIX);

  if (!encryptedPayload && !memoPayload) {
    return null;
  }

  try {
    const parsed =
      encryptedPayload ?? (JSON.parse(memoPayload ?? "") as Partial<SpentMarkerMemoPayload>);
    const assetId =
      typeof parsed.assetId === "string"
        ? parsed.assetId
        : typeof parsed.mintAddress === "string"
          ? parsed.mintAddress
          : parsed.asset === "SOL"
            ? VANTA_NATIVE_SOL_ASSET_ID
            : undefined;

    if (
      parsed.kind !== "spent_marker" ||
      (!isShieldTokenAsset(parsed.asset) && parsed.asset !== "SOL") ||
      typeof parsed.owner !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.consumedNoteId !== "string" ||
      typeof parsed.createdAt !== "number" ||
      !assetId
    ) {
      return null;
    }

    const transitionNoteId =
      typeof parsed.transitionNoteId === "string"
        ? parsed.transitionNoteId
        : typeof parsed.sendNoteId === "string"
          ? parsed.sendNoteId
          : undefined;
    const transitionKind =
      parsed.transitionKind === "send" ||
      parsed.transitionKind === "unshield" ||
      parsed.transitionKind === "swap" ||
      parsed.transitionKind === "sol_unshield"
        ? parsed.transitionKind
        : typeof parsed.sendNoteId === "string"
          ? "send"
          : undefined;

    if (!transitionNoteId || !transitionKind) {
      return null;
    }

    return {
      asset: parsed.asset,
      assetId,
      consumedNoteId: parsed.consumedNoteId,
      createdAt: parsed.createdAt,
      kind: "spent_marker",
      markerId:
        typeof parsed.markerId === "string"
          ? parsed.markerId
          : createSpentMarkerId({
              asset: parsed.asset,
              assetId,
              consumedNoteId: parsed.consumedNoteId,
              createdAt: parsed.createdAt,
              owner: parsed.owner,
              transitionNoteId,
              transitionKind,
              vaultOwner: parsed.vaultOwner,
            }),
      owner: parsed.owner,
      stateSignature,
      transitionKind,
      transitionNoteId,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

export function parseSolUnshieldMemo(
  memo: string | null | undefined,
  stateSignature: string,
  options: ShieldMemoDecryptionOptions = {},
): (Omit<VantaSolUnshieldNote, "noteId"> & { noteId?: string }) | null {
  const encryptedPayload = tryDecryptShieldMemoBody<SolUnshieldMemoPayload>(
    memo ?? "",
    VANTA_SOL_UNSHIELD_MEMO_PREFIX_V2,
    "",
    options,
  );
  const memoPayload = extractMemoPayload(memo, VANTA_SOL_UNSHIELD_MEMO_PREFIX);

  if (!encryptedPayload && !memoPayload) {
    return null;
  }

  try {
    const parsed =
      encryptedPayload ?? (JSON.parse(memoPayload ?? "") as Partial<SolUnshieldMemoPayload>);

    if (
      parsed.kind !== "sol_unshield" ||
      parsed.asset !== "SOL" ||
      typeof parsed.assetId !== "string" ||
      typeof parsed.owner !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.destinationOwner !== "string" ||
      typeof parsed.consumedNoteId !== "string" ||
      typeof parsed.amount !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    const parsedAmount = Number(parsed.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return null;
    }

    return {
      amount: parsedAmount,
      asset: "SOL",
      assetId: parsed.assetId,
      consumedNoteId: parsed.consumedNoteId,
      createdAt: parsed.createdAt,
      destinationOwner: parsed.destinationOwner,
      kind: "sol_unshield",
      noteId: typeof parsed.noteId === "string" ? parsed.noteId : undefined,
      owner: parsed.owner,
      stateSignature,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

export function parseUnshieldMemo(
  memo: string | null | undefined,
  stateSignature: string,
  options: ShieldMemoDecryptionOptions = {},
): (Omit<VantaUnshieldNote, "consumedNoteId" | "noteId"> & {
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  noteId?: string;
}) | null {
  const encryptedPayload = tryDecryptShieldMemoBody<UnshieldMemoPayload>(
    memo ?? "",
    VANTA_UNSHIELD_MEMO_PREFIX_V2,
    "",
    options,
  );
  const memoPayload = extractMemoPayload(memo, VANTA_UNSHIELD_MEMO_PREFIX);

  if (!encryptedPayload && !memoPayload) {
    return null;
  }

  try {
    const parsed =
      encryptedPayload ?? (JSON.parse(memoPayload ?? "") as Partial<UnshieldMemoPayload>);

    if (
      parsed.kind !== "unshield" ||
      !isShieldTokenAsset(parsed.asset) ||
      typeof parsed.owner !== "string" ||
      typeof parsed.mintAddress !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.destinationOwner !== "string" ||
      typeof parsed.amount !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    const parsedAmount = Number(parsed.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return null;
    }

    return {
      amount: parsedAmount,
      asset: parsed.asset,
      consumedNoteId:
        typeof parsed.consumedNoteId === "string" ? parsed.consumedNoteId : undefined,
      consumedShieldStateSignature:
        typeof parsed.consumedShieldStateSignature === "string"
          ? parsed.consumedShieldStateSignature
          : undefined,
      createdAt: parsed.createdAt,
      destinationOwner: parsed.destinationOwner,
      kind: "unshield",
      mintAddress: parsed.mintAddress,
      noteId: typeof parsed.noteId === "string" ? parsed.noteId : undefined,
      owner: parsed.owner,
      stateSignature,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

export function parseSwapMemo(
  memo: string | null | undefined,
  stateSignature: string,
  options: ShieldMemoDecryptionOptions = {},
): (Omit<VantaSwapNote, "consumedNoteId" | "noteId" | "outputNoteId"> & {
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  noteId?: string;
  outputNoteId?: string;
}) | null {
  const encryptedPayload = tryDecryptShieldMemoBody<SwapMemoPayload & SwapMemoWirePayload>(
    memo ?? "",
    VANTA_SWAP_MEMO_PREFIX_V2,
    "",
    options,
  );
  const memoPayload = extractMemoPayload(memo, VANTA_SWAP_MEMO_PREFIX);

  if (!encryptedPayload && !memoPayload) {
    return null;
  }

  try {
    const parsed =
      encryptedPayload ??
      (JSON.parse(memoPayload ?? "") as Partial<SwapMemoPayload & SwapMemoWirePayload>);
    const kind = parsed.kind ?? parsed.k;
    const inputAsset = parsed.inputAsset ?? parsed.ii;
    const outputAsset = parsed.outputAsset ?? parsed.oi;
    const owner = parsed.owner ?? parsed.ow;
    const mintAddress = parsed.mintAddress ?? parsed.ma;
    const vaultOwner = parsed.vaultOwner ?? parsed.vo;
    const inputAmount = parsed.inputAmount ?? parsed.ia;
    const outputAmount = parsed.outputAmount ?? parsed.oa;
    const createdAt = parsed.createdAt ?? parsed.ca;
    const consumedNoteId = parsed.consumedNoteId ?? parsed.cn;
    const consumedShieldStateSignature =
      parsed.consumedShieldStateSignature ?? parsed.cs;
    const noteId = parsed.noteId ?? parsed.ni;
    const outputNoteId = parsed.outputNoteId ?? parsed.on;
    const quoteExpiresAt = parsed.quoteExpiresAt ?? parsed.qe;
    const quoteId = parsed.quoteId ?? parsed.qi;
    const quoteTimestamp = parsed.quoteTimestamp ?? parsed.qt;
    const venueFamily = parsed.venueFamily ?? parsed.vf;
    const venueName = parsed.venueName ?? parsed.vn;
    const venueNetwork = parsed.venueNetwork ?? parsed.vw;
    const venuePoolAddress = parsed.venuePoolAddress ?? parsed.vp;

    const isSupportedOutputAsset =
      outputAsset === "SOL" || isShieldTokenAsset(outputAsset);

    const isSupportedInputAsset =
      inputAsset === "SOL" || isShieldTokenAsset(inputAsset);

    if (
      kind !== "swap" ||
      !isSupportedInputAsset ||
      !isSupportedOutputAsset ||
      typeof owner !== "string" ||
      typeof mintAddress !== "string" ||
      typeof vaultOwner !== "string" ||
      typeof inputAmount !== "string" ||
      typeof outputAmount !== "string" ||
      typeof createdAt !== "number"
    ) {
      return null;
    }

    const parsedInputAmount = Number(inputAmount);
    const parsedOutputAmount = Number(outputAmount);

    if (
      !Number.isFinite(parsedInputAmount) ||
      parsedInputAmount <= 0 ||
      !Number.isFinite(parsedOutputAmount) ||
      parsedOutputAmount <= 0
    ) {
      return null;
    }

    return {
      consumedNoteId: typeof consumedNoteId === "string" ? consumedNoteId : undefined,
      consumedShieldStateSignature:
        typeof consumedShieldStateSignature === "string"
          ? consumedShieldStateSignature
          : undefined,
      createdAt,
      inputAmount: parsedInputAmount,
      inputAsset,
      kind: "swap",
      noteId: typeof noteId === "string" ? noteId : undefined,
      outputAmount: parsedOutputAmount,
      outputAsset,
      outputNoteId: typeof outputNoteId === "string" ? outputNoteId : undefined,
      owner,
      quoteExpiresAt:
        typeof quoteExpiresAt === "number" && Number.isFinite(quoteExpiresAt)
          ? quoteExpiresAt
          : undefined,
      quoteId: typeof quoteId === "string" ? quoteId : undefined,
      quoteTimestamp:
        typeof quoteTimestamp === "number" && Number.isFinite(quoteTimestamp)
          ? quoteTimestamp
          : undefined,
      stateSignature,
      vaultOwner,
      venueFamily:
        venueFamily === "DLMM" || venueFamily === "Aggregator" ? venueFamily : undefined,
      venueName: typeof venueName === "string" ? venueName : undefined,
      venueNetwork: venueNetwork === "Mainnet" ? "Mainnet" : undefined,
      venuePoolAddress:
        typeof venuePoolAddress === "string" ? venuePoolAddress : undefined,
    };
  } catch {
    return null;
  }
}

// v1 note identity stays intentionally minimal:
// explicit note ids are deterministic structured identifiers, not final commitments.
// Spent markers are the first nullifier-style layer: they separate note identity,
// spend transition metadata, and "this note is no longer spendable" semantics.
export async function fetchVantaShieldAccountState(args: {
  client: SolanaClient;
  mintAddress: string;
  owner: string;
  signatureHints?: readonly string[];
  vaultOwner: string;
  viewingSecretKey?: string | null;
}) {
  const accountAsset = resolveShieldTokenAssetFromMint(args.mintAddress) ?? "USDC";
  const ownerAddress = toAddress(args.owner);
  const signatures = await args.client.runtime.rpc
    .getSignaturesForAddress(ownerAddress, {
      commitment: "confirmed",
      limit: 100,
    })
    .send({ abortSignal: AbortSignal.timeout(20_000) })
    .catch((error) => {
      if ((args.signatureHints?.length ?? 0) > 0) {
        return [];
      }

      throw error;
    });
  const signatureHintEntries = [...(args.signatureHints ?? [])]
    .map((signature) => signature.trim())
    .filter((signature) => signature.length > 0)
    .map((signature) => ({
      err: null,
      memo: null,
      signature,
    }));
  const signatureMemoEntries = await fetchSignatureMemoEntries({
    owner: args.owner,
    signatures: [...signatureHintEntries, ...signatures],
  });

  const depositShieldNotes = signatureMemoEntries
    .map((item) =>
      parseShieldMemo(item.memo, item.signature.toString(), args.owner, {
        viewingSecretKey: args.viewingSecretKey,
      }),
    )
    .filter((note: VantaShieldNote | null): note is VantaShieldNote => {
      return (
        note !== null &&
        note.owner === args.owner &&
        note.mintAddress === args.mintAddress &&
        note.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);
  const directShieldedSolNotes = signatureMemoEntries
    .map((item) => {
      const note = parseNativeSolShieldMemo(item.memo, item.signature.toString(), args.owner, {
        viewingSecretKey: args.viewingSecretKey,
      });

      if (!note) {
        return null;
      }

      return hasMatchingNativeSolShieldTransfer({
        amountDisplay: note.amount.toFixed(9),
        owner: args.owner,
        transaction: item.transaction,
        vaultOwner: args.vaultOwner,
      })
        ? note
        : null;
    })
    .filter((note: Omit<VantaShieldedSolNote, "lifecycleStatus"> | null): note is Omit<VantaShieldedSolNote, "lifecycleStatus"> => {
      return note !== null && note.owner === args.owner && note.vaultOwner === args.vaultOwner;
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const shieldNotesBySignature = new Map(
    depositShieldNotes.map((note) => [note.stateSignature, note] as const),
  );
  const allShieldNotesById = new Map(
    depositShieldNotes.map((note) => [note.noteId, note] as const),
  );
  const consumedNoteIds = new Set<string>();
  const changeNotesByParentSend = new Map<string, VantaShieldNote>();

  const parsedSendNotes = signatureMemoEntries
    .map((item) =>
      parseSendMemo(item.memo, item.signature.toString(), {
        viewingSecretKey: args.viewingSecretKey,
      }),
    )
    .filter((note): note is NonNullable<typeof note> => {
      return (
        note !== null &&
        note.owner === args.owner &&
        note.mintAddress === args.mintAddress &&
        note.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const parsedUnshieldNotes = signatureMemoEntries
    .map((item) =>
      parseUnshieldMemo(item.memo, item.signature.toString(), {
        viewingSecretKey: args.viewingSecretKey,
      }),
    )
    .filter((note): note is NonNullable<typeof note> => {
      return (
        note !== null &&
        note.owner === args.owner &&
        note.mintAddress === args.mintAddress &&
        note.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const parsedSwapNotes = signatureMemoEntries
    .map((item) =>
      parseSwapMemo(item.memo, item.signature.toString(), {
        viewingSecretKey: args.viewingSecretKey,
      }),
    )
    .filter((note): note is NonNullable<typeof note> => {
      return (
        note !== null &&
        note.owner === args.owner &&
        note.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const parsedSolUnshieldNotes = signatureMemoEntries
    .map((item) =>
      parseSolUnshieldMemo(item.memo, item.signature.toString(), {
        viewingSecretKey: args.viewingSecretKey,
      }),
    )
    .filter((note): note is NonNullable<typeof note> => {
      return note !== null && note.owner === args.owner && note.vaultOwner === args.vaultOwner;
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const candidateSendNotes = parsedSendNotes.flatMap((note) => {
    const resolvedConsumedNoteId =
      note.consumedNoteId ??
      (note.consumedShieldStateSignature
        ? shieldNotesBySignature.get(note.consumedShieldStateSignature)?.noteId
        : undefined);

    if (!resolvedConsumedNoteId) {
      return [];
    }

    const roundedSentAmount = Number(note.amount.toFixed(6));
    const roundedChangeAmount = Number(note.changeAmount.toFixed(6));
    const finalizedNoteId =
      note.noteId ??
      createSendNoteId({
        amount: roundedSentAmount.toString(),
        asset: "USDC",
        changeAmount: roundedChangeAmount.toString(),
        consumedNoteId: resolvedConsumedNoteId,
        createdAt: note.createdAt,
        mintAddress: note.mintAddress,
        owner: note.owner,
        recipient: note.recipient,
        vaultOwner: note.vaultOwner,
      });

    return [
      {
        ...note,
        amount: roundedSentAmount,
        changeAmount: roundedChangeAmount,
        consumedNoteId: resolvedConsumedNoteId,
        noteId: finalizedNoteId,
      } satisfies VantaSendNote,
    ];
  });

  const sendNotesById = new Map(
    candidateSendNotes.map((note) => [note.noteId, note] as const),
  );

  const candidateUnshieldNotes = parsedUnshieldNotes.flatMap((note) => {
    const resolvedConsumedNoteId =
      note.consumedNoteId ??
      (note.consumedShieldStateSignature
        ? shieldNotesBySignature.get(note.consumedShieldStateSignature)?.noteId
        : undefined);

    if (!resolvedConsumedNoteId) {
      return [];
    }

    const roundedAmount = Number(note.amount.toFixed(6));
    const finalizedNoteId =
      note.noteId ??
      createUnshieldNoteId({
        amount: roundedAmount.toString(),
        asset: note.asset,
        consumedNoteId: resolvedConsumedNoteId,
        createdAt: note.createdAt,
        destinationOwner: note.destinationOwner,
        mintAddress: note.mintAddress,
        owner: note.owner,
        vaultOwner: note.vaultOwner,
      });

    return [
      {
        ...note,
        amount: roundedAmount,
        consumedNoteId: resolvedConsumedNoteId,
        noteId: finalizedNoteId,
      } satisfies VantaUnshieldNote,
    ];
  });

  const unshieldNotesById = new Map(
    candidateUnshieldNotes.map((note) => [note.noteId, note] as const),
  );

  const candidateSwapNotes = parsedSwapNotes.flatMap((note) => {
    const resolvedConsumedNoteId =
      note.consumedNoteId ??
      (note.consumedShieldStateSignature
        ? shieldNotesBySignature.get(note.consumedShieldStateSignature)?.noteId
        : undefined);

    if (!resolvedConsumedNoteId) {
      return [];
    }

    const roundedInputAmount = Number(
      note.inputAmount.toFixed(getShieldAssetAmountDecimals(note.inputAsset)),
    );
    const roundedOutputAmount = Number(
      note.outputAmount.toFixed(getShieldAssetAmountDecimals(note.outputAsset)),
    );
    const finalizedNoteId =
      note.noteId ??
      createSwapNoteId({
        consumedNoteId: resolvedConsumedNoteId,
        createdAt: note.createdAt,
        inputAmount: roundedInputAmount.toString(),
        inputAsset: note.inputAsset,
        mintAddress: args.mintAddress,
        outputAmount: roundedOutputAmount.toString(),
        outputAsset: note.outputAsset,
        owner: note.owner,
        quoteId: note.quoteId,
        vaultOwner: note.vaultOwner,
      });
    const finalizedOutputNoteId =
      note.outputNoteId ??
      createSwapOutputNoteId({
        createdAt: note.createdAt,
        outputAsset: note.outputAsset,
        outputAmount: roundedOutputAmount.toString(),
        owner: note.owner,
        sourceSwapNoteId: finalizedNoteId,
      });

    return [
      {
        ...note,
        consumedNoteId: resolvedConsumedNoteId,
        inputAmount: roundedInputAmount,
        noteId: finalizedNoteId,
        outputAmount: roundedOutputAmount,
        outputNoteId: finalizedOutputNoteId,
      } satisfies VantaSwapNote,
    ];
  });

  const swapNotesById = new Map(
    candidateSwapNotes.map((note) => [note.noteId, note] as const),
  );
  const candidateSolUnshieldNotes = parsedSolUnshieldNotes.flatMap((note) => {
    const roundedAmount = Number(note.amount.toFixed(9));
    const finalizedNoteId =
      note.noteId ??
      createSolUnshieldNoteId({
        amount: roundedAmount.toString(),
        asset: "SOL",
        assetId: note.assetId,
        consumedNoteId: note.consumedNoteId,
        createdAt: note.createdAt,
        destinationOwner: note.destinationOwner,
        owner: note.owner,
        vaultOwner: note.vaultOwner,
      });

    return [
      {
        ...note,
        amount: roundedAmount,
        noteId: finalizedNoteId,
      } satisfies VantaSolUnshieldNote,
    ];
  });
  const solUnshieldNotesById = new Map(
    candidateSolUnshieldNotes.map((note) => [note.noteId, note] as const),
  );

  const explicitSpentMarkers = signatureMemoEntries
    .map((item) =>
      parseSpentMarkerMemo(item.memo, item.signature.toString(), {
        viewingSecretKey: args.viewingSecretKey,
      }),
    )
    .filter((marker: VantaSpentMarker | null): marker is VantaSpentMarker => {
      return (
        marker !== null &&
        marker.owner === args.owner &&
        marker.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const legacySpentMarkers: VantaSpentMarker[] = [];
  const shieldedSolNotesBySwap = new Map<
    string,
    Omit<VantaShieldedSolNote, "lifecycleStatus">
  >();
  const shieldTokenNotesBySwap = new Map<string, VantaShieldNote>();
  const recipientSelfNotesByParentSend = new Map<string, VantaShieldNote>();
  const consumedSolNoteIds = new Set<string>();

  const shieldSpentMarkers = [...explicitSpentMarkers, ...legacySpentMarkers]
    .filter((marker) => marker.asset !== "SOL")
    .sort((left, right) => left.createdAt - right.createdAt)
    .flatMap((marker) => {
      const transition =
        marker.transitionKind === "send"
          ? sendNotesById.get(marker.transitionNoteId)
          : marker.transitionKind === "unshield"
            ? unshieldNotesById.get(marker.transitionNoteId)
            : swapNotesById.get(marker.transitionNoteId);

      if (!transition || transition.consumedNoteId !== marker.consumedNoteId) {
        return [];
      }

      const consumedShieldNote = allShieldNotesById.get(marker.consumedNoteId);

      if (!consumedShieldNote) {
        return [];
      }

      if (consumedNoteIds.has(marker.consumedNoteId)) {
        return [];
      }

      const roundedInputAmount = Number(consumedShieldNote.amount.toFixed(6));

      if (marker.transitionKind === "send") {
        const sendTransition = transition as VantaSendNote;
        const roundedSentAmount = Number(sendTransition.amount.toFixed(6));
        const roundedChangeAmount = Number(sendTransition.changeAmount.toFixed(6));

        if (roundedSentAmount > roundedInputAmount) {
          return [];
        }

        if (
          !amountsMatch(
            Number((roundedSentAmount + roundedChangeAmount).toFixed(6)),
            roundedInputAmount,
          )
        ) {
          return [];
        }

        consumedNoteIds.add(marker.consumedNoteId);

        if (roundedChangeAmount <= 0) {
          return [marker];
        }

        const changeNoteId =
          typeof sendTransition.changeNoteId === "string"
            ? sendTransition.changeNoteId
            : createChangeNoteId({
                amount: roundedChangeAmount.toString(),
                createdAt: sendTransition.createdAt,
                mintAddress: sendTransition.mintAddress,
                owner: sendTransition.owner,
                parentNoteId: marker.consumedNoteId,
                parentSendNoteId: sendTransition.noteId,
                vaultOwner: sendTransition.vaultOwner,
              });

        const changeNote = {
          amount: roundedChangeAmount,
          asset: accountAsset,
          createdAt: sendTransition.createdAt,
          depositSignature: sendTransition.stateSignature,
          kind: "shield" as const,
          mintAddress: sendTransition.mintAddress,
          noteId: changeNoteId,
          origin: "change" as const,
          owner: sendTransition.owner,
          parentNoteId: marker.consumedNoteId,
          parentSendNoteId: sendTransition.noteId,
          stateSignature: `${sendTransition.stateSignature}:change`,
          vaultOwner: sendTransition.vaultOwner,
        } satisfies VantaShieldNote;

        changeNotesByParentSend.set(sendTransition.noteId, changeNote);
        allShieldNotesById.set(changeNote.noteId, changeNote);

        if (
          roundedSentAmount > 0 &&
          sendTransition.recipient === sendTransition.owner
        ) {
          const recipientSelfNote = {
            amount: roundedSentAmount,
            asset: accountAsset,
            createdAt: sendTransition.createdAt,
            depositSignature: sendTransition.stateSignature,
            kind: "shield" as const,
            mintAddress: sendTransition.mintAddress,
            noteId: createRecipientSelfNoteId({
              amount: roundedSentAmount.toString(),
              createdAt: sendTransition.createdAt,
              mintAddress: sendTransition.mintAddress,
              owner: sendTransition.owner,
              parentNoteId: marker.consumedNoteId,
              parentSendNoteId: sendTransition.noteId,
              vaultOwner: sendTransition.vaultOwner,
            }),
            origin: "recipient_self" as const,
            owner: sendTransition.owner,
            parentNoteId: marker.consumedNoteId,
            parentSendNoteId: sendTransition.noteId,
            stateSignature: `${sendTransition.stateSignature}:recipient-self`,
            vaultOwner: sendTransition.vaultOwner,
          } satisfies VantaShieldNote;

          recipientSelfNotesByParentSend.set(sendTransition.noteId, recipientSelfNote);
          allShieldNotesById.set(recipientSelfNote.noteId, recipientSelfNote);
        }

        return [marker];
      }

      if (marker.transitionKind === "unshield") {
        const unshieldTransition = transition as VantaUnshieldNote;
        const roundedUnshieldAmount = Number(unshieldTransition.amount.toFixed(6));

        if (!amountsMatch(roundedUnshieldAmount, roundedInputAmount)) {
          return [];
        }

        consumedNoteIds.add(marker.consumedNoteId);

        return [marker];
      }

      const swapTransition = transition as VantaSwapNote;
      const roundedSwapInputAmount = Number(
        swapTransition.inputAmount.toFixed(
          getShieldAssetAmountDecimals(swapTransition.inputAsset),
        ),
      );

      if (!amountsMatch(roundedSwapInputAmount, roundedInputAmount)) {
        return [];
      }

      consumedNoteIds.add(marker.consumedNoteId);
      const roundedSwapOutputAmount = Number(
        swapTransition.outputAmount.toFixed(
          getShieldAssetAmountDecimals(swapTransition.outputAsset),
        ),
      );

      if (swapTransition.outputAsset === "SOL") {
        shieldedSolNotesBySwap.set(swapTransition.noteId, {
          amount: roundedSwapOutputAmount,
          asset: "SOL",
          createdAt: swapTransition.createdAt,
          noteId: swapTransition.outputNoteId,
          owner: swapTransition.owner,
          sourceSwapNoteId: swapTransition.noteId,
          stateSignature: `${swapTransition.stateSignature}:sol-output`,
          vaultOwner: swapTransition.vaultOwner,
        });
      } else if (swapTransition.outputAsset === accountAsset) {
        const swapOutputNote = {
          amount: roundedSwapOutputAmount,
          asset: accountAsset,
          createdAt: swapTransition.createdAt,
          depositSignature: swapTransition.stateSignature,
          kind: "shield" as const,
          mintAddress: args.mintAddress,
          noteId: swapTransition.outputNoteId,
          origin: "swap_output" as const,
          owner: swapTransition.owner,
          parentNoteId: marker.consumedNoteId,
          parentSwapNoteId: swapTransition.noteId,
          stateSignature: `${swapTransition.stateSignature}:swap-output`,
          vaultOwner: args.vaultOwner,
        } satisfies VantaShieldNote;

        shieldTokenNotesBySwap.set(swapTransition.noteId, swapOutputNote);
        allShieldNotesById.set(swapOutputNote.noteId, swapOutputNote);
      }

      return [marker];
    });

  const validSendNotes = candidateSendNotes.filter((note) => {
    return shieldSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "send" && marker.transitionNoteId === note.noteId,
    );
  });
  const validUnshieldNotes = candidateUnshieldNotes.filter((note) => {
    return shieldSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "unshield" &&
        marker.transitionNoteId === note.noteId,
    );
  });
  const validShieldInputSwapNotes = candidateSwapNotes.filter((note) => {
    return shieldSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "swap" && marker.transitionNoteId === note.noteId,
    );
  });
  const baseShieldedSolNotes = [
    ...directShieldedSolNotes,
    ...validShieldInputSwapNotes
      .map((note) => shieldedSolNotesBySwap.get(note.noteId))
      .filter((note): note is NonNullable<typeof note> => note !== undefined),
  ];

  const solSpentMarkers = explicitSpentMarkers
    .filter((marker) => marker.asset === "SOL")
    .sort((left, right) => left.createdAt - right.createdAt)
    .flatMap((marker) => {
      if (marker.transitionKind !== "sol_unshield" && marker.transitionKind !== "swap") {
        return [];
      }

      const transition =
        marker.transitionKind === "sol_unshield"
          ? solUnshieldNotesById.get(marker.transitionNoteId)
          : swapNotesById.get(marker.transitionNoteId);
      const consumedNote = baseShieldedSolNotes.find((note) => note.noteId === marker.consumedNoteId);

      if (
        !transition ||
        !consumedNote ||
        transition.consumedNoteId !== marker.consumedNoteId ||
        consumedSolNoteIds.has(marker.consumedNoteId)
      ) {
        return [];
      }

      if (marker.transitionKind === "swap") {
        const swapTransition = transition as VantaSwapNote;

        if (
          swapTransition.inputAsset !== "SOL" ||
          !amountsMatch(
            Number(swapTransition.inputAmount.toFixed(9)),
            Number(consumedNote.amount.toFixed(9)),
          )
        ) {
          return [];
        }

        if (swapTransition.outputAsset === accountAsset) {
          const roundedSwapOutputAmount = Number(
            swapTransition.outputAmount.toFixed(
              getShieldAssetAmountDecimals(swapTransition.outputAsset),
            ),
          );
          const swapOutputNote = {
            amount: roundedSwapOutputAmount,
            asset: accountAsset,
            createdAt: swapTransition.createdAt,
            depositSignature: swapTransition.stateSignature,
            kind: "shield" as const,
            mintAddress: args.mintAddress,
            noteId: swapTransition.outputNoteId,
            origin: "swap_output" as const,
            owner: swapTransition.owner,
            parentNoteId: marker.consumedNoteId,
            parentSwapNoteId: swapTransition.noteId,
            stateSignature: `${swapTransition.stateSignature}:swap-output`,
            vaultOwner: args.vaultOwner,
          } satisfies VantaShieldNote;

          shieldTokenNotesBySwap.set(swapTransition.noteId, swapOutputNote);
          allShieldNotesById.set(swapOutputNote.noteId, swapOutputNote);
        }

        consumedSolNoteIds.add(marker.consumedNoteId);
        return [marker];
      }

      const solUnshieldTransition = transition as VantaSolUnshieldNote;

      if (
        !amountsMatch(
          Number(solUnshieldTransition.amount.toFixed(9)),
          Number(consumedNote.amount.toFixed(9)),
        )
      ) {
        return [];
      }

      consumedSolNoteIds.add(marker.consumedNoteId);
      return [marker];
    });
  const validSolUnshieldNotes = candidateSolUnshieldNotes.filter((note) => {
    return solSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "sol_unshield" &&
        marker.transitionNoteId === note.noteId,
    );
  });
  const validSolInputSwapNotes = candidateSwapNotes.filter((note) => {
    return solSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "swap" && marker.transitionNoteId === note.noteId,
    );
  });
  const validSwapNotes = [
    ...validShieldInputSwapNotes,
    ...validSolInputSwapNotes,
  ].sort((left, right) => left.createdAt - right.createdAt);
  const swapOutputNotes = validSwapNotes
    .map((note) => shieldTokenNotesBySwap.get(note.noteId))
    .filter((note): note is NonNullable<typeof note> => note !== undefined)
    .sort((left, right) => left.createdAt - right.createdAt);
  const spentMarkers = [...shieldSpentMarkers, ...solSpentMarkers].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const spentMarkerByConsumedNoteId = new Map(
    spentMarkers.map((marker) => [marker.consumedNoteId, marker] as const),
  );
  const transitionByConsumedNoteId = new Map(
    [
      ...validSendNotes,
      ...validUnshieldNotes,
      ...validSwapNotes,
      ...validSolUnshieldNotes,
    ].map((transition) => [transition.consumedNoteId, transition] as const),
  );
  const pendingSendByConsumedNoteId = new Map(
    candidateSendNotes
      .filter((note) => {
        if (transitionByConsumedNoteId.has(note.consumedNoteId)) {
          return false;
        }

        const consumedShieldNote = allShieldNotesById.get(note.consumedNoteId);

        if (!consumedShieldNote || consumedNoteIds.has(note.consumedNoteId)) {
          return false;
        }

        const roundedInputAmount = Number(consumedShieldNote.amount.toFixed(6));
        const roundedSentAmount = Number(note.amount.toFixed(6));
        const roundedChangeAmount = Number(note.changeAmount.toFixed(6));

        return (
          roundedSentAmount > 0 &&
          roundedSentAmount <= roundedInputAmount &&
          amountsMatch(
            Number((roundedSentAmount + roundedChangeAmount).toFixed(6)),
            roundedInputAmount,
          )
        );
      })
      .map((note) => [note.consumedNoteId, note] as const),
  );
  const pendingUnshieldByConsumedNoteId = new Map(
    candidateUnshieldNotes.map((note) => [note.consumedNoteId, note] as const),
  );
  const pendingSwapByConsumedNoteId = new Map(
    candidateSwapNotes
      .filter((note) => {
        if (
          note.inputAsset === "SOL" ||
          transitionByConsumedNoteId.has(note.consumedNoteId)
        ) {
          return false;
        }

        const consumedShieldNote = allShieldNotesById.get(note.consumedNoteId);

        if (
          !consumedShieldNote ||
          consumedShieldNote.asset !== note.inputAsset ||
          consumedNoteIds.has(note.consumedNoteId)
        ) {
          return false;
        }

        const inputDecimals = getShieldAssetAmountDecimals(note.inputAsset);

        return amountsMatch(
          Number(note.inputAmount.toFixed(inputDecimals)),
          Number(consumedShieldNote.amount.toFixed(inputDecimals)),
        );
      })
      .map((note) => [note.consumedNoteId, note] as const),
  );
  const pendingSolUnshieldByConsumedNoteId = new Map(
    candidateSolUnshieldNotes.map((note) => [note.consumedNoteId, note] as const),
  );
  const pendingSolSwapByConsumedNoteId = new Map(
    candidateSwapNotes
      .filter((note) => {
        if (
          note.inputAsset !== "SOL" ||
          transitionByConsumedNoteId.has(note.consumedNoteId) ||
          consumedSolNoteIds.has(note.consumedNoteId)
        ) {
          return false;
        }

        const consumedSolNote = baseShieldedSolNotes.find(
          (solNote) => solNote.noteId === note.consumedNoteId,
        );

        return (
          consumedSolNote !== undefined &&
          amountsMatch(
            Number(note.inputAmount.toFixed(9)),
            Number(consumedSolNote.amount.toFixed(9)),
          )
        );
      })
      .map((note) => [note.consumedNoteId, note] as const),
  );

  const changeNotes = [...changeNotesByParentSend.values()].sort((left, right) => {
    return left.createdAt - right.createdAt;
  });
  const recipientSelfNotes = [...recipientSelfNotesByParentSend.values()].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const shieldNotes = [...depositShieldNotes, ...changeNotes, ...recipientSelfNotes, ...swapOutputNotes].sort(
    (left, right) => {
      return left.createdAt - right.createdAt;
    },
  );
  const spentShieldNotes = shieldNotes.filter((note) => {
    return consumedNoteIds.has(note.noteId);
  });
  const spendableShieldNotes = shieldNotes.filter((note) => {
    return (
      !consumedNoteIds.has(note.noteId) &&
      !transitionByConsumedNoteId.has(note.noteId) &&
      !pendingSendByConsumedNoteId.has(note.noteId) &&
      !pendingUnshieldByConsumedNoteId.has(note.noteId) &&
      !pendingSwapByConsumedNoteId.has(note.noteId)
    );
  });
  const shieldedSolNotes = baseShieldedSolNotes
    .map((note) => {
      const spentMarker = spentMarkerByConsumedNoteId.get(note.noteId);
      const pendingUnshieldTransition = pendingSolUnshieldByConsumedNoteId.get(note.noteId);
      const pendingSolSwapTransition = pendingSolSwapByConsumedNoteId.get(note.noteId);
      const consumingTransition =
        transitionByConsumedNoteId.get(note.noteId) ??
        pendingUnshieldTransition ??
        pendingSolSwapTransition;
      const lifecycleStatus = spentMarker
        ? "consumed"
        : pendingUnshieldTransition || pendingSolSwapTransition
          ? "pending"
          : "spendable";

      return {
        ...note,
        consumedByTransitionId:
          consumingTransition?.kind === "sol_unshield" || consumingTransition?.kind === "swap"
            ? consumingTransition.noteId
            : undefined,
        consumedByTransitionKind:
          consumingTransition?.kind === "sol_unshield" || consumingTransition?.kind === "swap"
            ? consumingTransition.kind
            : undefined,
        lifecycleStatus,
        spentMarkerId: spentMarker?.markerId,
      } satisfies VantaShieldedSolNote;
    })
    .sort((left, right) => right.createdAt - left.createdAt);
  const spendableShieldedSolNotes = shieldedSolNotes.filter((note) => {
    return (
      note.lifecycleStatus === "spendable" &&
      !transitionByConsumedNoteId.has(note.noteId) &&
      !pendingSolUnshieldByConsumedNoteId.has(note.noteId) &&
      !pendingSolSwapByConsumedNoteId.has(note.noteId)
    );
  });
  const consumedShieldedSolNotes = shieldedSolNotes.filter((note) => {
    return note.lifecycleStatus === "consumed";
  });
  const activity = [
    ...shieldNotes,
    ...validSendNotes,
    ...validSwapNotes,
    ...validUnshieldNotes,
    ...validSolUnshieldNotes,
    ...spentMarkers,
  ].sort((left, right) => left.createdAt - right.createdAt);
  const noteStates = [...shieldNotes]
    .sort((left, right) => right.createdAt - left.createdAt)
    .map((note) => {
      const spentMarker = spentMarkerByConsumedNoteId.get(note.noteId);
      const pendingSendTransition = pendingSendByConsumedNoteId.get(note.noteId);
      const pendingUnshieldTransition = pendingUnshieldByConsumedNoteId.get(note.noteId);
      const pendingSwapTransition = pendingSwapByConsumedNoteId.get(note.noteId);
      const consumingTransition =
        transitionByConsumedNoteId.get(note.noteId) ??
        pendingSendTransition ??
        pendingUnshieldTransition ??
        pendingSwapTransition;
      const lifecycleStatus = spentMarker
        ? "consumed"
        : pendingSendTransition ? "pending"
          : pendingUnshieldTransition ? "pending"
            : pendingSwapTransition ? "pending"
              : "spendable";

      return {
        amount: note.amount,
        asset: note.asset,
        consumedByTransitionId: consumingTransition?.noteId,
        consumedByTransitionKind: consumingTransition?.kind,
        createdAt: note.createdAt,
        lifecycleStatus,
        noteId: note.noteId,
        parentNoteId: note.parentNoteId,
        parentSendNoteId: note.parentSendNoteId,
        sourceType:
          note.origin === "change"
            ? "change_derived"
            : note.origin === "swap_output"
              ? "swap_derived"
              : "deposit",
        spentMarkerId: spentMarker?.markerId,
        stateSignature: note.stateSignature,
      } satisfies VantaAppNoteState;
    });
  const noteStatusSummary = {
    changeDerived: noteStates.filter((note) => note.sourceType === "change_derived").length,
    consumed: noteStates.filter((note) => note.lifecycleStatus === "consumed").length,
    swapDerived: noteStates.filter((note) => note.sourceType === "swap_derived").length,
    spendable: noteStates.filter((note) => note.lifecycleStatus === "spendable").length,
    total: noteStates.length,
  } satisfies VantaNoteStatusSummary;
  const balance = Number(
    spendableShieldNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(6),
  );
  const shieldedSolBalance = Number(
    spendableShieldedSolNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(9),
  );
  const lifecycleActivities = deriveLifecycleActivities({
    changeNotes,
    sendNotes: validSendNotes,
    shieldNotes,
    solUnshieldNotes: validSolUnshieldNotes,
    swapOutputNotes,
    swapNotes: validSwapNotes,
    unshieldNotes: validUnshieldNotes,
  });

  return {
    accountId: getShieldAccountId(args.owner, args.mintAddress),
    activity,
    asset: accountAsset,
    balance,
    changeNotes,
    lifecycleActivities,
    mintAddress: args.mintAddress,
    noteStates,
    noteStatusSummary,
    owner: args.owner,
    sendNotes: validSendNotes,
    shieldNotes,
    consumedShieldedSolNotes,
    shieldedSolBalance,
    shieldedSolNotes,
    solUnshieldNotes: validSolUnshieldNotes,
    source: "vanta_onchain_notes",
    spendableShieldedSolNotes,
    spendableShieldNotes,
    spentMarkers,
    spentShieldNotes,
    status: "ready",
    swapNotes: validSwapNotes,
    unshieldNotes: validUnshieldNotes,
    vaultOwner: args.vaultOwner,
  } satisfies VantaShieldAccountState;
}

function deriveLifecycleActivities(args: {
  changeNotes: VantaShieldNote[];
  sendNotes: VantaSendNote[];
  shieldNotes: VantaShieldNote[];
  solUnshieldNotes: VantaSolUnshieldNote[];
  swapOutputNotes: VantaShieldNote[];
  swapNotes: VantaSwapNote[];
  unshieldNotes: VantaUnshieldNote[];
}) {
  const shieldActivities = args.shieldNotes
    .filter((note) => note.origin === "deposit")
    .map((note) => {
      return {
        amount: note.amount,
        createdAt: note.createdAt,
        description: `Moved ${formatShieldTokenAmount(note.asset, note.amount)} out of Public Wallet and into Vanta's shielded state.`,
        noteId: note.noteId,
        sourceState: "Public Wallet",
        targetState: "Shielded State",
        title: "Shield",
        type: "shield",
        impact: "public_to_shielded",
      } satisfies VantaLifecycleActivity;
    });

  const sendActivities = args.sendNotes.map((note) => {
    return {
      amount: note.amount,
      createdAt: note.createdAt,
      description:
        note.changeAmount > 0
          ? `Sent ${note.amount.toFixed(2)} USDC from shielded state and preserved ${note.changeAmount.toFixed(2)} USDC as a new change note.`
          : `Sent ${note.amount.toFixed(2)} USDC from shielded state with no shielded value left over.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Shielded State",
      title: "Send",
      type: "send",
      impact: "shielded_transfer",
    } satisfies VantaLifecycleActivity;
  });

  const changeActivities = args.changeNotes.map((note) => {
    return {
      amount: note.amount,
      createdAt: note.createdAt,
      description: `Created a new spendable change note for ${note.amount.toFixed(2)} USDC after a partial send.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Shielded State",
      title: "Change Note Created",
      type: "change_note_created",
      impact: "shielded_to_shielded",
    } satisfies VantaLifecycleActivity;
  });

  const swapOutputActivities = args.swapOutputNotes.map((note) => {
    return {
      amount: note.amount,
      amountLabel: formatShieldTokenAmount(note.asset, note.amount),
      createdAt: note.createdAt,
      description: `Created a new spendable ${note.asset} swap output note inside shielded state.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Shielded State",
      title: "Swap Output Created",
      type: "swap_output_created",
      impact: "shielded_to_shielded",
    } satisfies VantaLifecycleActivity;
  });

  const swapActivities = args.swapNotes.map((note) => {
    const venueSuffix =
      note.venueName && note.venueFamily
        ? ` via ${note.venueName} ${note.venueFamily} on mainnet.`
        : ".";
    const outputLabel =
      note.outputAsset === "SOL"
        ? `${note.outputAmount.toFixed(4)} SOL`
        : formatShieldTokenAmount(note.outputAsset, note.outputAmount);

    return {
      amount: note.inputAmount,
      amountLabel: `${note.inputAmount.toFixed(2)} USDC -> ${outputLabel}`,
      createdAt: note.createdAt,
      description: `Swapped ${note.inputAmount.toFixed(2)} USDC into ${outputLabel} inside Vanta's constrained shielded lifecycle${venueSuffix}`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Shielded State",
      title: "Swap",
      type: "swap",
      impact: "shielded_swap",
    } satisfies VantaLifecycleActivity;
  });

  const unshieldActivities = args.unshieldNotes.map((note) => {
    return {
      amount: note.amount,
      createdAt: note.createdAt,
      description: `Returned ${formatShieldTokenAmount(note.asset, note.amount)} from shielded state back into Public Wallet through the operator release path.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Public Wallet",
      title: "Unshield",
      type: "unshield",
      impact: "shielded_to_public",
    } satisfies VantaLifecycleActivity;
  });

  const solUnshieldActivities = args.solUnshieldNotes.map((note) => {
    return {
      amount: note.amount,
      amountLabel: `${note.amount.toFixed(4)} SOL`,
      createdAt: note.createdAt,
      description: `Returned ${note.amount.toFixed(4)} SOL from shielded state back into Public Wallet through the constrained operator-backed SOL exit.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Public Wallet",
      title: "Unshield SOL",
      type: "sol_unshield",
      impact: "shielded_to_public",
    } satisfies VantaLifecycleActivity;
  });

  return [
    ...shieldActivities,
    ...sendActivities,
    ...changeActivities,
    ...swapOutputActivities,
    ...swapActivities,
    ...unshieldActivities,
    ...solUnshieldActivities,
  ].sort((left, right) => right.createdAt - left.createdAt);
}
