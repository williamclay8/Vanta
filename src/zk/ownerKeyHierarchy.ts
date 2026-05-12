import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";
import { poseidon1, poseidon2 } from "poseidon-lite";
import {
  deriveVantaShieldViewingKeypairFromSecretKey,
  type VantaShieldViewingKeypair,
} from "../solana/vantaShieldViewingKey";
import type { CanonicalNoteOwnerContext } from "./canonicalNote";

export const VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION =
  "vanta-shield-owner-key-hierarchy-0.1" as const;
export const VANTA_SHIELD_MASTER_SEED_MESSAGE_VERSION =
  "vanta-shield-master-seed-v1" as const;
export const VANTA_SHIELD_MASTER_SEED_WALLET_MESSAGE = [
  `vanta:shield-master-seed:${VANTA_SHIELD_MASTER_SEED_MESSAGE_VERSION}`,
  "purpose:derive local Shield recovery, viewing, and spending keys",
  "scope:Vanta Shield owner key hierarchy",
  "not-a-transaction:true",
].join("\n");

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const DEFAULT_APP_DOMAIN = "vanta";
const OWNER_KEY_HIERARCHY_DOMAIN = "vanta:shield-owner-key-hierarchy:0.1";

export type VantaShieldOwnerKeyHierarchyContext = {
  appDomain?: string;
  cluster: string;
  hierarchyVersion?: typeof VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION;
  walletAddress: string;
};

export type NormalizedVantaShieldOwnerKeyHierarchyContext = {
  appDomain: string;
  cluster: string;
  hierarchyVersion: typeof VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION;
  walletAddress: string;
};

export type VantaShieldOwnerKeyHierarchy = {
  context: NormalizedVantaShieldOwnerKeyHierarchyContext;
  derivationContext: string;
  ownerPublicKey: string;
  ownerPublicKeyField: string;
  recoverySecret: string;
  spendingPublicKey: string;
  spendingPublicKeyField: string;
  spendingSecret: string;
  spendingSecretField: string;
  version: typeof VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION;
  viewingKeypair: VantaShieldViewingKeypair;
  viewingPublicKey: string;
  viewingPublicKeyField: string;
  viewingSecretKey: string;
};

export type DeriveVantaShieldOwnerKeyHierarchyArgs = {
  context: VantaShieldOwnerKeyHierarchyContext;
  masterSeed: string | Uint8Array;
};

export function deriveVantaShieldOwnerKeyHierarchyFromMasterSeed({
  context,
  masterSeed,
}: DeriveVantaShieldOwnerKeyHierarchyArgs): VantaShieldOwnerKeyHierarchy {
  const normalizedContext = normalizeContext(context);
  const masterSeedBytes = normalizeMasterSeed(masterSeed);
  const spendingSecretBytes = deriveHierarchyBytes(
    masterSeedBytes,
    normalizedContext,
    "spending-secret-v1",
  );
  const viewingSecretBytes = deriveHierarchyBytes(
    masterSeedBytes,
    normalizedContext,
    "viewing-secret-v1",
  );
  const recoverySecretBytes = deriveHierarchyBytes(
    masterSeedBytes,
    normalizedContext,
    "owner-recovery-secret-v1",
  );
  const spendingSecretField = bytesToField(spendingSecretBytes);
  const spendingPublicKeyField = poseidon1([spendingSecretField]);
  const viewingKeypair = deriveVantaShieldViewingKeypairFromSecretKey(
    bytesToHex(viewingSecretBytes),
  );
  const viewingPublicKeyField = bytesToField(hexToBytes(viewingKeypair.publicKey));
  const ownerPublicKeyField = poseidon2([spendingPublicKeyField, viewingPublicKeyField]);

  return {
    context: normalizedContext,
    derivationContext: createDerivationContext(normalizedContext),
    ownerPublicKey: fieldToHex(ownerPublicKeyField),
    ownerPublicKeyField: ownerPublicKeyField.toString(10),
    recoverySecret: `0x${bytesToHex(recoverySecretBytes)}`,
    spendingPublicKey: fieldToHex(spendingPublicKeyField),
    spendingPublicKeyField: spendingPublicKeyField.toString(10),
    spendingSecret: `0x${bytesToHex(spendingSecretBytes)}`,
    spendingSecretField: spendingSecretField.toString(10),
    version: VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION,
    viewingKeypair,
    viewingPublicKey: viewingKeypair.publicKey,
    viewingPublicKeyField: viewingPublicKeyField.toString(10),
    viewingSecretKey: viewingKeypair.secretKey,
  };
}

export function createWalletDerivedCanonicalNoteOwnerContext(
  args: DeriveVantaShieldOwnerKeyHierarchyArgs,
): CanonicalNoteOwnerContext {
  const hierarchy = deriveVantaShieldOwnerKeyHierarchyFromMasterSeed(args);
  return {
    derivationContext: hierarchy.derivationContext,
    ownerPublicKey: hierarchy.ownerPublicKey,
    recoverySecret: hierarchy.recoverySecret,
  };
}

function normalizeContext(
  context: VantaShieldOwnerKeyHierarchyContext,
): NormalizedVantaShieldOwnerKeyHierarchyContext {
  const hierarchyVersion =
    context.hierarchyVersion ?? VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION;

  if (hierarchyVersion !== VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION) {
    throw new Error(`Unsupported Vanta Shield owner key hierarchy version: ${hierarchyVersion}.`);
  }

  return {
    appDomain: normalizeText(context.appDomain ?? DEFAULT_APP_DOMAIN, "appDomain"),
    cluster: normalizeText(context.cluster, "cluster"),
    hierarchyVersion,
    walletAddress: normalizeText(context.walletAddress, "walletAddress"),
  };
}

function normalizeMasterSeed(masterSeed: string | Uint8Array): Uint8Array {
  if (masterSeed instanceof Uint8Array) {
    if (masterSeed.byteLength !== 32) {
      throw new Error("Vanta Shield owner key hierarchy requires a 32-byte master seed.");
    }

    const copy = new Uint8Array(32);
    copy.set(masterSeed);
    return copy;
  }

  const normalized = masterSeed.trim().replace(/^0x/u, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(normalized)) {
    throw new Error("Vanta Shield owner key hierarchy requires a 32-byte hex master seed.");
  }

  return hexToBytes(normalized);
}

function deriveHierarchyBytes(
  masterSeed: Uint8Array,
  context: NormalizedVantaShieldOwnerKeyHierarchyContext,
  label: string,
) {
  const salt = sha256(utf8ToBytes(serializeContext(context)));
  return hkdf(
    sha256,
    masterSeed,
    salt,
    utf8ToBytes(`${OWNER_KEY_HIERARCHY_DOMAIN}:${label}`),
    32,
  );
}

function serializeContext(context: NormalizedVantaShieldOwnerKeyHierarchyContext) {
  return [
    OWNER_KEY_HIERARCHY_DOMAIN,
    `version:${context.hierarchyVersion}`,
    `appDomain:${context.appDomain}`,
    `cluster:${context.cluster}`,
    `walletAddress:${context.walletAddress}`,
  ].join("\n");
}

function createDerivationContext(context: NormalizedVantaShieldOwnerKeyHierarchyContext) {
  return [
    "owner-key-hierarchy",
    context.hierarchyVersion,
    context.appDomain,
    context.cluster,
    context.walletAddress,
  ].join(":");
}

function normalizeText(value: string, fieldName: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`Vanta Shield owner key hierarchy requires ${fieldName}.`);
  }

  return trimmed;
}

function bytesToField(bytes: Uint8Array) {
  let value = 0n;

  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  return value % BN254_SCALAR_FIELD;
}

function fieldToHex(value: bigint) {
  if (value < 0n || value >= BN254_SCALAR_FIELD) {
    throw new Error("Vanta Shield owner key hierarchy field is outside BN254.");
  }

  return `0x${value.toString(16).padStart(64, "0")}`;
}
