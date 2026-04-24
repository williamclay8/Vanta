import type {
  VantaPrivateCoreOperatorProofRecord,
  VantaPrivateCoreOperatorReleaseRecord,
} from "@/zk/vantaPrivateCoreOperatorClient";

export const VANTA_TRANSACTION_EVIDENCE_VERSION = "vanta-transaction-evidence-0.1";

export type VantaTransactionEvidenceFlow = "shield" | "send" | "swap" | "unshield" | "pay";

export type VantaTransactionEvidenceScope =
  | "preview"
  | "devnet-wallet-tx"
  | "local-operator-harness"
  | "production";

export type VantaTransactionEvidence = {
  version: typeof VANTA_TRANSACTION_EVIDENCE_VERSION;
  flow: VantaTransactionEvidenceFlow;
  scope: VantaTransactionEvidenceScope;
  wallet: {
    status:
      | "not-required-for-local-proof-record"
      | "signature-recorded"
      | "signature-unavailable"
      | "preview-only";
    signature: string | null;
    slot: number | null;
    confirmationStatus: string | null;
  };
  proof: {
    status: "verified" | "pending" | "not-applicable";
    lane: string | null;
    proofId: string | null;
    noteCommitmentBound: boolean;
    nullifierBound: boolean;
    rootBound: boolean;
  };
  operator: {
    status: "pending-or-recorded" | "recorded" | "pending" | "not-applicable";
    releaseRecordKind: "proof-backed-release-record" | "none";
    requestId: string | null;
  };
  operatorTrace?: {
    source:
      | "artifact-fallback"
      | "local-private-core-operator-store"
      | "live-private-core-operator-summary";
    proofId: string | null;
    releaseRequestId: string | null;
    redactedOperatorReceipt: {
      kind: "redacted-private-core-release-receipt";
      completedAt: number | null;
      nullifierPrefix: string | null;
      proofId: string | null;
      releaseDestinationPrefix: string | null;
      releasedAmount: string | null;
      releasedAssetId: string | null;
      requestId: string | null;
      rootPrefix: string | null;
    } | null;
    transitionSignature: string | null;
    confirmationStatus: string | null;
    confirmationDetails: {
      confirmations: number | null;
      err: unknown | null;
      liveMainnetFundsMoved: false;
      observedAt: string | null;
      operatorReachable: boolean;
      signatureStatusSource:
        | "none"
        | "solana-rpc-getSignatureStatuses"
        | "local-browser-wait";
      slot: number | null;
      status:
        | "live-operator-summary-confirmed"
        | "local-operator-store-confirmed"
        | "rpc-signature-finalized"
        | "rpc-signature-confirmed"
        | "rpc-signature-processed"
        | "rpc-signature-error"
        | "not-confirmed";
    };
  };
  settlement: {
    status: "not-live-mainnet-settlement" | "preview-only" | "live-mainnet-settlement-complete";
    liveMainnetFundsMoved: boolean;
  };
  observedAt?: string;
  reviewNotes?: string[];
};

export type VantaTransactionEvidencePacket = {
  version: typeof VANTA_TRANSACTION_EVIDENCE_VERSION;
  packetKind: "point-in-time-transaction-evidence";
  evidencePacketId: string;
  checkedAt: string;
  generatedBy: "scripts/write-vanta-transaction-evidence.mjs";
  pointInTime: true;
  mainnetReady: false;
  productionReady: false;
  realFundsMoved: false;
  productionSettlementClaimAllowed: false;
  canonicalCheckRef: "npm run mainnet:transaction-evidence-check";
  firstAdoptedFlow: "unshield";
  truthBoundary: "evidence-describes-current-implementation-not-production-settlement";
  flows: VantaTransactionEvidence[];
  safety: string;
  deploymentTruth: string;
  nextOperatorAction: string;
};

type CreateUnshieldTransactionEvidenceArgs = {
  confirmationDetails?: {
    confirmationStatus: string | null;
    confirmations: number | null;
    err: unknown | null;
    signatureStatusSource: "solana-rpc-getSignatureStatuses" | "local-browser-wait";
    slot: number | null;
    status:
      | "rpc-signature-finalized"
      | "rpc-signature-confirmed"
      | "rpc-signature-processed"
      | "rpc-signature-error";
  } | null;
  latestProof: VantaPrivateCoreOperatorProofRecord | null;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  observedAt?: string | null;
  source?:
    | "artifact-fallback"
    | "local-private-core-operator-store"
    | "live-private-core-operator-summary";
  transitionSignature: string | null;
};

export function createUnshieldTransactionEvidence(
  args: CreateUnshieldTransactionEvidenceArgs,
): VantaTransactionEvidence {
  const proofVerified = args.latestProof?.verified === true;
  const releaseRecorded = Boolean(args.latestRelease);
  const proofId = args.latestProof?.proofId ?? args.latestRelease?.proofId ?? null;
  const confirmationStatus =
    args.confirmationDetails?.confirmationStatus ??
    (args.transitionSignature ? "confirmed-by-local-browser-wait" : null);
  const source =
    args.source ??
    (args.latestProof || args.latestRelease ? "local-private-core-operator-store" : "artifact-fallback");

  return {
    version: VANTA_TRANSACTION_EVIDENCE_VERSION,
    flow: "unshield",
    scope: "local-operator-harness",
    wallet: {
      status: args.transitionSignature
        ? "signature-recorded"
        : "not-required-for-local-proof-record",
      signature: args.transitionSignature,
      slot: args.confirmationDetails?.slot ?? null,
      confirmationStatus,
    },
    proof: {
      status: proofVerified ? "verified" : "pending",
      lane: args.latestProof?.provingHashLane ?? null,
      proofId,
      noteCommitmentBound: proofVerified,
      nullifierBound: proofVerified,
      rootBound: proofVerified,
    },
    operator: {
      status: releaseRecorded ? "recorded" : "pending",
      releaseRecordKind: releaseRecorded ? "proof-backed-release-record" : "none",
      requestId: args.latestRelease?.requestId ?? null,
    },
    operatorTrace: {
      source,
      proofId,
      releaseRequestId: args.latestRelease?.requestId ?? null,
      redactedOperatorReceipt: args.latestRelease
        ? {
            kind: "redacted-private-core-release-receipt",
            completedAt: args.latestRelease.completedAt,
            nullifierPrefix: redactPrefix(args.latestRelease.nullifier),
            proofId: args.latestRelease.proofId,
            releaseDestinationPrefix: redactPrefix(args.latestRelease.releaseDestination),
            releasedAmount: args.latestRelease.releasedAmount,
            releasedAssetId: args.latestRelease.releasedAssetId,
            requestId: args.latestRelease.requestId,
            rootPrefix: redactPrefix(args.latestRelease.root),
          }
        : null,
      transitionSignature: args.transitionSignature,
      confirmationStatus,
      confirmationDetails: {
        confirmations: args.confirmationDetails?.confirmations ?? null,
        err: args.confirmationDetails?.err ?? null,
        liveMainnetFundsMoved: false,
        observedAt: args.observedAt ?? null,
        operatorReachable: source === "live-private-core-operator-summary",
        signatureStatusSource: args.confirmationDetails?.signatureStatusSource ?? "none",
        slot: args.confirmationDetails?.slot ?? null,
        status: args.confirmationDetails?.status ??
          (source === "live-private-core-operator-summary" && releaseRecorded
            ? "live-operator-summary-confirmed"
            : releaseRecorded
              ? "local-operator-store-confirmed"
              : "not-confirmed"),
      },
    },
    settlement: {
      status: "not-live-mainnet-settlement",
      liveMainnetFundsMoved: false,
    },
  };
}

function redactPrefix(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.slice(0, 14);
}

export function createTransactionEvidencePacket(args: {
  checkedAt: string;
  evidencePacketId: string;
  flows: VantaTransactionEvidence[];
}): VantaTransactionEvidencePacket {
  return {
    version: VANTA_TRANSACTION_EVIDENCE_VERSION,
    packetKind: "point-in-time-transaction-evidence",
    evidencePacketId: args.evidencePacketId,
    checkedAt: args.checkedAt,
    generatedBy: "scripts/write-vanta-transaction-evidence.mjs",
    pointInTime: true,
    mainnetReady: false,
    productionReady: false,
    realFundsMoved: false,
    productionSettlementClaimAllowed: false,
    canonicalCheckRef: "npm run mainnet:transaction-evidence-check",
    firstAdoptedFlow: "unshield",
    truthBoundary: "evidence-describes-current-implementation-not-production-settlement",
    flows: args.flows,
    safety:
      "This evidence file is refs-only. It must not store private inputs, seed phrases, signed transaction material, signed intent payloads, bearer values, database URLs, raw customer data, or credential-bearing URLs.",
    deploymentTruth:
      "Transaction Evidence v0.1 records the current devnet, local, preview, and operator-harness trace boundary. It does not prove mainnet finality, production settlement, audit approval, custody, or privacy guarantees.",
    nextOperatorAction:
      "Add point-in-time signature, slot, account-diff, proof, nullifier, root, and redacted operator receipt evidence when a flow moves from preview or local harness into a real settlement path.",
  };
}
