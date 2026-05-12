import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import { signWalletMessageIntentWithSafety } from "../wallet/walletMessageIntentSafety.mjs";
import {
  VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION,
  type VantaShieldOwnerKeyHierarchyContext,
} from "../zk/ownerKeyHierarchy";

export const VANTA_SHIELD_KEY_DERIVATION_INTENT_VERSION = "v1" as const;
export const VANTA_SHIELD_KEY_DERIVATION_INTENT_KIND =
  "shield-key-derivation-intent" as const;
export const VANTA_SHIELD_KEY_DERIVATION_INTENT_TTL_MS = 5 * 60 * 1000;

const MASTER_SEED_DERIVATION_DOMAIN =
  "vanta:shield-key-derivation-intent:signature-to-master-seed:v1";

export type ShieldKeyDerivationIntentPayload = {
  appDomain: string;
  cluster: string;
  doesNotAuthorizeOperator: true;
  doesNotMoveFunds: true;
  hierarchyVersion: typeof VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION;
  notATransaction: true;
  owner: string;
  purpose: "derive-local-shield-viewing-and-spending-keys";
  requester: string;
};

export type ShieldKeyDerivationSafetyEnvelope = {
  connectedWalletAddress: string;
  expiresAt: number;
  humanApprovedSummary: boolean;
  issuedAt: number;
  requestId: string;
};

export type ShieldKeyDerivationSignatureResult = {
  decision: {
    accepted: boolean;
    reason: string;
  };
  ephemeralMasterSeed: string | null;
  signed: boolean;
  summary: {
    messagePreview: string;
    requestId: string;
  };
};

export function createShieldKeyDerivationIntentPayload(
  payload: Omit<
    ShieldKeyDerivationIntentPayload,
    | "doesNotAuthorizeOperator"
    | "doesNotMoveFunds"
    | "hierarchyVersion"
    | "notATransaction"
    | "purpose"
  > &
    Partial<
      Pick<
        ShieldKeyDerivationIntentPayload,
        "appDomain" | "cluster" | "hierarchyVersion"
      >
    >,
): ShieldKeyDerivationIntentPayload {
  return {
    appDomain: normalizeText(payload.appDomain ?? "vanta", "appDomain"),
    cluster: normalizeText(payload.cluster, "cluster"),
    doesNotAuthorizeOperator: true,
    doesNotMoveFunds: true,
    hierarchyVersion:
      payload.hierarchyVersion ?? VANTA_SHIELD_OWNER_KEY_HIERARCHY_VERSION,
    notATransaction: true,
    owner: normalizeText(payload.owner, "owner"),
    purpose: "derive-local-shield-viewing-and-spending-keys",
    requester: normalizeText(payload.requester, "requester"),
  };
}

export function createShieldKeyDerivationSafetyEnvelope(
  input: {
    connectedWalletAddress: string;
    humanApprovedSummary: boolean;
    issuedAt?: number;
    requestId?: string;
  },
): ShieldKeyDerivationSafetyEnvelope {
  const issuedAt = input.issuedAt ?? Date.now();
  return {
    connectedWalletAddress: normalizeText(input.connectedWalletAddress, "connectedWalletAddress"),
    expiresAt: issuedAt + VANTA_SHIELD_KEY_DERIVATION_INTENT_TTL_MS,
    humanApprovedSummary: input.humanApprovedSummary,
    issuedAt,
    requestId: input.requestId ?? crypto.randomUUID(),
  };
}

export function formatShieldKeyDerivationIntentMessage(
  payload: ShieldKeyDerivationIntentPayload,
) {
  const normalized = createShieldKeyDerivationIntentPayload(payload);
  return [
    `vanta:shield-key-derivation-intent:${VANTA_SHIELD_KEY_DERIVATION_INTENT_VERSION}`,
    `requester:${normalized.requester}`,
    `owner:${normalized.owner}`,
    `appDomain:${normalized.appDomain}`,
    `cluster:${normalized.cluster}`,
    `hierarchyVersion:${normalized.hierarchyVersion}`,
    `purpose:${normalized.purpose}`,
    `notATransaction:${normalized.notATransaction}`,
    `doesNotMoveFunds:${normalized.doesNotMoveFunds}`,
    `doesNotAuthorizeOperator:${normalized.doesNotAuthorizeOperator}`,
  ].join("\n");
}

export async function deriveShieldMasterSeedWithSafety({
  envelope,
  payload,
  signMessage,
}: {
  envelope: ShieldKeyDerivationSafetyEnvelope;
  payload: ShieldKeyDerivationIntentPayload;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<ShieldKeyDerivationSignatureResult> {
  const message = formatShieldKeyDerivationIntentMessage(payload);
  const signature = await signWalletMessageIntentWithSafety({
    amount: "0",
    asset: "owner-key-hierarchy",
    connectedWalletAddress: envelope.connectedWalletAddress,
    expiresAt: envelope.expiresAt,
    humanApprovedSummary: envelope.humanApprovedSummary,
    intentKind: VANTA_SHIELD_KEY_DERIVATION_INTENT_KIND,
    issuedAt: envelope.issuedAt,
    message,
    owner: payload.owner,
    privateKeyMaterialHandled: false,
    recipient: "local-owner-key-hierarchy",
    requestId: envelope.requestId,
    requester: payload.requester,
    signMessage,
  });

  if (!signature.signed || !signature.signatureBytes) {
    return {
      decision: signature.decision,
      ephemeralMasterSeed: null,
      signed: false,
      summary: {
        messagePreview: signature.summary.messagePreview,
        requestId: signature.summary.requestId,
      },
    };
  }

  return {
    decision: signature.decision,
    ephemeralMasterSeed: deriveShieldMasterSeedFromSignature({
      payload,
      signatureBytes: signature.signatureBytes,
    }),
    signed: true,
    summary: {
      messagePreview: signature.summary.messagePreview,
      requestId: signature.summary.requestId,
    },
  };
}

export function deriveShieldMasterSeedFromSignature({
  payload,
  signatureBytes,
}: {
  payload: ShieldKeyDerivationIntentPayload;
  signatureBytes: Uint8Array;
}) {
  const message = formatShieldKeyDerivationIntentMessage(payload);
  const seed = hkdf(
    sha256,
    signatureBytes,
    sha256(utf8ToBytes(message)),
    utf8ToBytes(MASTER_SEED_DERIVATION_DOMAIN),
    32,
  );
  return `0x${bytesToHex(seed)}`;
}

export function toOwnerKeyHierarchyContext(
  payload: ShieldKeyDerivationIntentPayload,
): VantaShieldOwnerKeyHierarchyContext {
  const normalized = createShieldKeyDerivationIntentPayload(payload);
  return {
    appDomain: normalized.appDomain,
    cluster: normalized.cluster,
    hierarchyVersion: normalized.hierarchyVersion,
    walletAddress: normalized.owner,
  };
}

function normalizeText(value: string, fieldName: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`Vanta Shield key derivation intent requires ${fieldName}.`);
  }

  return trimmed;
}
