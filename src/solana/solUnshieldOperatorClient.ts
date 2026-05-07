import { liveSwapPair } from "@/solana/shieldConfig";
import { recordLocallyReleasedSolNoteReferenceHash } from "@/solana/operatorStateClient";
import type { SignedSolUnshieldIntent } from "@/solana/solUnshieldAuth";

type SolUnshieldOperatorResponse = {
  consumedNoteId?: string;
  releaseReceipt?: SolUnshieldOperatorReleaseReceipt;
  requestId: string;
  signature: string;
};

type SolUnshieldOperatorReleaseReceipt = {
  kind: "vanta-unshield-operator-release-receipt-v1";
  requestId: string;
  consumedNoteId: string;
  transitionNoteId: string;
  releaseSignature: string;
  releaseIntentHash: string;
  proofStatus: string;
  replayStatus: "accepted-first-use";
  spendabilityBasis: "canonical-spendable-note-ledger";
};

export async function requestOperatorSolUnshield(
  payload: SignedSolUnshieldIntent,
): Promise<SolUnshieldOperatorResponse> {
  const response = await fetch(liveSwapPair.solUnshieldOperatorUrl, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The SOL unshield operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<SolUnshieldOperatorResponse>;

  if (typeof parsed.signature !== "string" || parsed.signature.length === 0) {
    throw new Error("The SOL unshield operator did not return a valid signature.");
  }

  if (typeof parsed.requestId !== "string" || parsed.requestId.length === 0) {
    throw new Error("The SOL unshield operator did not return a valid request id.");
  }

  if (parsed.requestId !== payload.requestId) {
    throw new Error("The SOL unshield operator returned a mismatched request id.");
  }

  if (parsed.consumedNoteId !== payload.consumedNoteId) {
    throw new Error("The SOL unshield operator returned a mismatched consumed note id.");
  }

  assertValidReleaseReceipt(parsed.releaseReceipt, {
    consumedNoteId: payload.consumedNoteId,
    requestId: payload.requestId,
    signature: parsed.signature,
    transitionNoteId: payload.transitionNoteId,
  });
  recordLocallyReleasedSolNoteReferenceHash(payload.consumedNoteId);

  return {
    consumedNoteId: parsed.consumedNoteId,
    releaseReceipt: parsed.releaseReceipt,
    requestId: parsed.requestId,
    signature: parsed.signature,
  };
}

function assertValidReleaseReceipt(
  receipt: SolUnshieldOperatorReleaseReceipt | undefined,
  expected: {
    consumedNoteId: string;
    requestId: string;
    signature: string;
    transitionNoteId: string;
  },
) {
  if (!receipt || receipt.kind !== "vanta-unshield-operator-release-receipt-v1") {
    throw new Error("The SOL unshield operator did not return a typed release receipt.");
  }

  if (
    receipt.requestId !== expected.requestId ||
    receipt.consumedNoteId !== expected.consumedNoteId ||
    receipt.transitionNoteId !== expected.transitionNoteId ||
    receipt.releaseSignature !== expected.signature ||
    receipt.replayStatus !== "accepted-first-use" ||
    receipt.spendabilityBasis !== "canonical-spendable-note-ledger" ||
    !receipt.releaseIntentHash.startsWith("sha256:")
  ) {
    throw new Error("The SOL unshield operator returned a mismatched release receipt.");
  }
}
