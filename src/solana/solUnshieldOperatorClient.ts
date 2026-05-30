import { liveSwapPair } from "@/solana/shieldConfig";
import { recordLocallyReleasedSolNoteReferenceHash } from "@/solana/operatorStateClient";
import type { SignedSolUnshieldIntent } from "@/solana/solUnshieldAuth";
import {
  parseSuccessfulUnshieldOperatorResponse,
  parseUnshieldOperatorResponseBody,
  tryParseBlockedUnshieldOperatorResponse,
  type UnshieldOperatorReleaseReceipt,
} from "@/solana/unshieldOperatorReleaseReceipt";

type SolUnshieldOperatorResponse = {
  consumedNoteId?: string;
  releaseReceipt?: UnshieldOperatorReleaseReceipt;
  requestId: string;
  signature: string;
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

  const rawText = await response.text();
  let parsed: unknown = null;

  try {
    parsed = parseUnshieldOperatorResponseBody(rawText);
  } catch {
    if (!response.ok) {
      throw new Error(rawText || "The SOL unshield operator rejected the request.");
    }

    throw new Error("The SOL unshield operator returned an invalid response body.");
  }

  if (!response.ok) {
    const blockedReason = tryParseBlockedUnshieldOperatorResponse(parsed, response.status, {
      consumedNoteId: payload.consumedNoteId,
      requestId: payload.requestId,
      transitionNoteId: payload.transitionNoteId,
    });

    if (blockedReason) {
      throw new Error(blockedReason);
    }

    throw new Error(
      typeof rawText === "string" && rawText.trim()
        ? rawText
        : "The SOL unshield operator rejected the request.",
    );
  }

  const success = parseSuccessfulUnshieldOperatorResponse(parsed, {
    consumedNoteId: payload.consumedNoteId,
    requestId: payload.requestId,
    transitionNoteId: payload.transitionNoteId,
  });
  recordLocallyReleasedSolNoteReferenceHash(payload.consumedNoteId);

  return {
    consumedNoteId: success.consumedNoteId,
    releaseReceipt: success.releaseReceipt,
    requestId: success.requestId,
    signature: success.signature,
  };
}
