import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type {
  VantaPrivatePoolV2Commitment,
  VantaPrivatePoolV2Protocol,
} from "../privacy/privatePoolV2Types";
import type {
  VantaPayAsset,
  VantaPayCheckoutSession,
  VantaPayPrivateExitReceipt,
  VantaPayPrivateRailReceipt,
  VantaPayPrivacyRail,
} from "./vantaPayTypes";

export const VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION =
  "vanta-pay-private-settlement-adapter-0.1" as const;
export const VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY = {
  lifecycleModel: "preview-approve-execute-settle",
  refundState: "merchant-visible",
  withdrawalState: "merchant-visible",
  reconciliationState: "merchant-visible",
} as const;

export type VantaPayPrivateSettlementAdapterArgs = {
  now?: string;
  privatePoolOperatorAuthToken?: string;
  privatePoolOperatorUrl?: string;
  protocol?: VantaPrivatePoolV2Protocol;
  rail?: VantaPayPrivacyRail;
};

export type VantaPaySettleCheckoutSessionArgs = {
  session: VantaPayCheckoutSession;
};

export type VantaPaySettleWithdrawalArgs = {
  amount: string;
  asset: VantaPayAsset;
  destination: string;
  merchantId: string;
};

const defaultNow = "2026-04-19T20:10:00.000Z";
const textEncoder = new TextEncoder();

function hashHex(...parts: readonly string[]) {
  return `0x${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f"))))}`;
}

function hashId(prefix: string, ...parts: readonly string[]) {
  return `${prefix}_${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f")))).slice(0, 24)}`;
}

function normalizeAmount(value: string, asset: VantaPayAsset) {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Settlement amount must be a positive decimal string.");
  }

  const decimals = asset === "SOL" ? 9 : 6;
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Settlement amount exceeds supported ${asset} precision of ${decimals} decimals.`);
  }

  const baseUnits = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
  if (baseUnits <= 0n) {
    throw new Error("Settlement amount must be a positive decimal string.");
  }

  const scale = 10n ** BigInt(decimals);
  const normalizedWhole = (baseUnits / scale).toString(10);
  const normalizedFraction = (baseUnits % scale).toString(10).padStart(decimals, "0");
  const trimmedFraction = normalizedFraction.replace(/0+$/, "");
  const displayFraction =
    trimmedFraction.length === 0
      ? "00"
      : trimmedFraction.padEnd(Math.max(trimmedFraction.length, 2), "0");
  return `${normalizedWhole}.${displayFraction}`;
}

function amountToBaseUnits(amount: string, asset: VantaPayAsset) {
  const [whole = "0", fraction = ""] = normalizeAmount(amount, asset).split(".");
  const decimals = asset === "SOL" ? 9 : 6;
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(`${whole}${paddedFraction}`);
}

function treeIdForAsset(asset: VantaPayAsset) {
  return hashHex(VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION, "tree", asset).slice(0, 34);
}

function assetIdForAsset(asset: VantaPayAsset) {
  return hashHex(VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION, "asset", asset);
}

function hashLeaf(record: Omit<VantaPrivatePoolV2Commitment, "merkleRoot">) {
  return hashHex(
    "sha256-append-only-private-pool-v2-local-indexer-0.1",
    "leaf",
    record.treeId,
    String(record.leafIndex),
    record.assetId,
    record.commitment,
  );
}

function hashNode(treeId: string, depth: number, left: string, right: string) {
  return hashHex(
    "sha256-append-only-private-pool-v2-local-indexer-0.1",
    "node",
    treeId,
    String(depth),
    left,
    right,
  );
}

function emptyRoot(treeId: string) {
  return hashHex("sha256-append-only-private-pool-v2-local-indexer-0.1", "empty-root", treeId);
}

function merkleRootFor(
  treeId: string,
  records: readonly Omit<VantaPrivatePoolV2Commitment, "merkleRoot">[],
) {
  if (records.length === 0) {
    return emptyRoot(treeId);
  }

  let layer = records.map((record) => hashLeaf(record));
  let depth = 0;

  while (layer.length > 1) {
    const nextLayer: string[] = [];

    for (let index = 0; index < layer.length; index += 2) {
      const left = layer[index]!;
      const right = layer[index + 1] ?? left;
      nextLayer.push(hashNode(treeId, depth, left, right));
    }

    layer = nextLayer;
    depth += 1;
  }

  return layer[0] ?? emptyRoot(treeId);
}

function requirePrivatePoolSurfaces(protocol: VantaPrivatePoolV2Protocol) {
  if (!protocol.indexer || !protocol.prover || !protocol.verifierRegistry) {
    throw new Error("Private Pool v2 settlement requires indexer, prover, and verifier surfaces.");
  }

  const readiness = protocol.readiness();
  if (!readiness.ready) {
    throw new Error(`Private Pool v2 settlement is not ready: ${readiness.blockers.join(" ")}`);
  }

  return {
    indexer: protocol.indexer,
    prover: protocol.prover,
    relayer: protocol.relayer,
    verifierRegistry: protocol.verifierRegistry,
  };
}

async function createDefaultPrivatePoolProtocol(): Promise<VantaPrivatePoolV2Protocol> {
  // Lazily load the privacy mock runtime so importing the Pay runtime stays Node-safe.
  const { createVantaPrivatePoolV2MockRuntime } = await import("../privacy/privatePoolV2MockRuntime");
  return createVantaPrivatePoolV2MockRuntime();
}

async function createVantaPrivatePoolV2ShieldProofRequest(args: unknown) {
  // This helper intentionally loads the proof request factory only when settlement runs.
  const { createVantaPrivatePoolV2ShieldProofRequest: buildShieldProofRequest } = await import(
    "../privacy/privatePoolV2ProofRequests"
  );
  return buildShieldProofRequest(args as never);
}

async function createVantaPrivatePoolV2ClaimProofRequest(args: unknown) {
  // This helper intentionally loads the proof request factory only when settlement runs.
  const { createVantaPrivatePoolV2ClaimProofRequest: buildClaimProofRequest } = await import(
    "../privacy/privatePoolV2ProofRequests"
  );
  return buildClaimProofRequest(args as never);
}

export function createVantaPayPrivateSettlementAdapter({
  now = defaultNow,
  privatePoolOperatorAuthToken,
  privatePoolOperatorUrl,
  protocol,
  rail = "umbra",
}: VantaPayPrivateSettlementAdapterArgs = {}) {
  let defaultProtocol: Promise<VantaPrivatePoolV2Protocol> | null = null;

  function getActiveProtocol() {
    if (protocol) {
      return Promise.resolve(protocol);
    }

    defaultProtocol ??= createDefaultPrivatePoolProtocol();
    return defaultProtocol;
  }

  async function settleThroughPrivatePoolOperator<T>(body: Record<string, unknown>) {
    if (!privatePoolOperatorUrl) {
      return null;
    }

    const response = await fetch(`${privatePoolOperatorUrl}/private-pool-v2/pay-settlements`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...(privatePoolOperatorAuthToken
          ? { Authorization: `Bearer ${privatePoolOperatorAuthToken}` }
          : {}),
      },
      method: "POST",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        `Private Pool v2 operator rejected Pay settlement: ${payload.error ?? response.status}`,
      );
    }

    return payload as T;
  }

  async function settleCheckoutSession({
    session,
  }: VantaPaySettleCheckoutSessionArgs): Promise<VantaPayPrivateRailReceipt> {
    const operatorSettlement = await settleThroughPrivatePoolOperator<{
      privateRailReceipt: VantaPayPrivateRailReceipt;
    }>({
      kind: "checkout",
      session,
    });
    if (operatorSettlement) {
      return operatorSettlement.privateRailReceipt;
    }

    const activeProtocol = await getActiveProtocol();
    const { indexer, prover, verifierRegistry } = requirePrivatePoolSurfaces(activeProtocol);
    const amountBaseUnits = amountToBaseUnits(session.amount, session.currency);
    const assetId = assetIdForAsset(session.currency);
    const treeId = treeIdForAsset(session.currency);
    const existingCommitments = await indexer.listCommitments({ treeId });
    const leafIndex = existingCommitments.length;
    const outputCommitment = hashHex(
      VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION,
      "checkout-output",
      session.id,
      session.clientToken,
      session.amount,
      session.currency,
    );
    const leaf = {
      assetId,
      commitment: outputCommitment,
      leafIndex,
      treeId,
    };
    const merkleRoot = merkleRootFor(treeId, [...existingCommitments, leaf]);
    const request = await createVantaPrivatePoolV2ShieldProofRequest({
      amountBaseUnits,
      ownerCommitment: hashHex("merchant", session.merchantId),
      previousRoot: await indexer.getCurrentRoot(treeId),
      sourceMintAddress: session.currency,
      targetAssetId: assetId,
      targetMintAddress: session.currency,
      treeCommitment: {
        ...leaf,
        merkleRoot,
      },
    });
    const proof = await prover.prove(request);
    const localReceipt = await verifierRegistry.acceptProof({ proof, request });

    return {
      amount: session.amount,
      asset: session.currency,
      auditDisclosureId: hashId("aud", session.id, localReceipt.receiptId),
      checkoutSessionId: session.id,
      createdAt: now,
      id: hashId("prail", session.id, localReceipt.receiptId),
      object: "private_rail_receipt",
      proofReceiptId: `ppv2_${localReceipt.receiptId.slice(2, 26)}`,
      rail,
      status: "confirmed",
    };
  }

  async function settleWithdrawal({
    amount,
    asset,
    destination,
    merchantId,
  }: VantaPaySettleWithdrawalArgs): Promise<VantaPayPrivateExitReceipt> {
    const operatorSettlement = await settleThroughPrivatePoolOperator<{
      privateExitReceipt: VantaPayPrivateExitReceipt;
    }>({
      amount,
      asset,
      destination,
      kind: "withdrawal",
      merchantId,
    });
    if (operatorSettlement) {
      return operatorSettlement.privateExitReceipt;
    }

    const activeProtocol = await getActiveProtocol();
    const { indexer, prover, relayer, verifierRegistry } = requirePrivatePoolSurfaces(activeProtocol);
    if (!relayer) {
      throw new Error("Private Pool v2 settlement requires a relayer for withdrawals.");
    }

    const normalizedAmount = normalizeAmount(amount, asset);
    const treeId = treeIdForAsset(asset);
    const commitments = await indexer.listCommitments({ assetId: assetIdForAsset(asset), treeId });
    const sourceCommitment = commitments[0];
    if (!sourceCommitment) {
      throw new Error(`No private settlement commitment available for ${asset}.`);
    }

    const quote = await relayer.quoteClaim({
      amountBaseUnits: amountToBaseUnits(normalizedAmount, asset),
      assetId: sourceCommitment.assetId,
      destinationAddress: destination,
    });
    const merkleProof = await indexer.getMerkleProof(sourceCommitment.commitment);
    const nullifier = hashHex(
      VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION,
      "withdrawal-nullifier",
      merchantId,
      destination,
      normalizedAmount,
      asset,
      sourceCommitment.commitment,
    );
    const request = await createVantaPrivatePoolV2ClaimProofRequest({
      amountBaseUnits: amountToBaseUnits(normalizedAmount, asset),
      destinationAddress: destination,
      merkleProof,
      nullifier,
      ownerCommitment: hashHex("merchant", merchantId),
      quote,
    });
    const proof = await prover.prove(request);
    const localReceipt = await verifierRegistry.acceptProof({ proof, request });

    return {
      amount: normalizedAmount,
      asset,
      createdAt: now,
      destination,
      id: hashId("pexit", localReceipt.receiptId, destination),
      object: "private_exit_receipt",
      rail,
      status: "confirmed",
    };
  }

  return {
    privateSettlement: VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY,
    protocol,
    settleCheckoutSession,
    settleWithdrawal,
    version: VANTA_PAY_PRIVATE_SETTLEMENT_ADAPTER_VERSION,
  };
}
