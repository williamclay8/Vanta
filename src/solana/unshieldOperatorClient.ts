import type { SignedUnshieldIntent } from "@/solana/unshieldAuth";
import {
  parseSuccessfulUnshieldOperatorResponse,
  parseUnshieldOperatorResponseBody,
  tryParseBlockedUnshieldOperatorResponse,
  type UnshieldOperatorReleaseReceipt,
} from "@/solana/unshieldOperatorReleaseReceipt";

type UnshieldOperatorResponse = {
  consumedNoteId?: string;
  noteId?: string;
  releaseReceipt?: UnshieldOperatorReleaseReceipt;
  requestId: string;
  signature: string;
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

  const rawText = await response.text();
  let parsed: unknown = null;

  try {
    parsed = parseUnshieldOperatorResponseBody(rawText);
  } catch {
    if (!response.ok) {
      throw new Error(rawText || "The unshield operator rejected the request.");
    }

    throw new Error("The unshield operator returned an invalid response body.");
  }

  if (!response.ok) {
    const blockedReason = tryParseBlockedUnshieldOperatorResponse(parsed, response.status, {
      consumedNoteId: payload.noteId,
      requestId: payload.requestId,
      transitionNoteId: payload.transitionNoteId,
    });

    if (blockedReason) {
      throw new Error(blockedReason);
    }

    throw new Error(
      typeof rawText === "string" && rawText.trim()
        ? rawText
        : "The unshield operator rejected the request.",
    );
  }

  const success = parseSuccessfulUnshieldOperatorResponse(parsed, {
    consumedNoteId: payload.noteId,
    requestId: payload.requestId,
    transitionNoteId: payload.transitionNoteId,
  });

  return {
    consumedNoteId: success.consumedNoteId,
    releaseReceipt: success.releaseReceipt,
    requestId: success.requestId,
    signature: success.signature,
  };
}
