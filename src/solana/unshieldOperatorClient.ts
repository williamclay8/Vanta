import type { SignedUnshieldIntent } from "@/solana/unshieldAuth";

type UnshieldOperatorResponse = {
  consumedNoteId?: string;
  noteId?: string;
  releaseReceipt?: UnshieldOperatorReleaseReceipt;
  requestId: string;
  signature: string;
};

type UnshieldOperatorReleaseReceipt = {
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

export async function requestOperatorUnshield(
  payload: SignedUnshieldIntent,
  operatorUrl: string,
): Promise<UnshieldOperatorResponse> {
  const response = await fetch(operatorUrl, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The unshield operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<UnshieldOperatorResponse>;

  if (typeof parsed.signature !== "string" || parsed.signature.length === 0) {
    throw new Error("The unshield operator did not return a valid signature.");
  }

  if (typeof parsed.requestId !== "string" || parsed.requestId.length === 0) {
    throw new Error("The unshield operator did not return a valid request id.");
  }

  if (parsed.requestId !== payload.requestId) {
    throw new Error("The unshield operator returned a mismatched request id.");
  }

  const consumedNoteId = parsed.consumedNoteId ?? parsed.noteId;
  if (consumedNoteId !== payload.noteId) {
    throw new Error("The unshield operator returned a mismatched consumed note id.");
  }

  assertValidReleaseReceipt(parsed.releaseReceipt, {
    consumedNoteId: payload.noteId,
    requestId: payload.requestId,
    signature: parsed.signature,
    transitionNoteId: payload.transitionNoteId,
  });

  return {
    consumedNoteId,
    releaseReceipt: parsed.releaseReceipt,
    requestId: parsed.requestId,
    signature: parsed.signature,
  };
}

function assertValidReleaseReceipt(
  receipt: UnshieldOperatorReleaseReceipt | undefined,
  expected: {
    consumedNoteId: string;
    requestId: string;
    signature: string;
    transitionNoteId: string;
  },
) {
  if (!receipt || receipt.kind !== "vanta-unshield-operator-release-receipt-v1") {
    throw new Error("The unshield operator did not return a typed release receipt.");
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
    throw new Error("The unshield operator returned a mismatched release receipt.");
  }
}
