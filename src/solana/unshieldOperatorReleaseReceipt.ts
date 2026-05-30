export type UnshieldOperatorLiveReleaseReceipt = {
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

export type UnshieldProgramReleaseReceipt = {
  kind: "vanta-unshield-program-release-receipt-v1";
  requestId: string;
  consumedNoteId: string;
  transitionNoteId: string;
  releaseSignature: string | null;
  releaseIntentHash: string;
  proofStatus: string;
  replayStatus: string;
  spendabilityBasis: string;
  releaseModel?: string;
  programInstructionTag?: string;
  programTxSignature?: string | null;
};

export type UnshieldOperatorReleaseReceipt =
  | UnshieldOperatorLiveReleaseReceipt
  | UnshieldProgramReleaseReceipt;

export type UnshieldOperatorIntentIdentity = {
  consumedNoteId: string;
  requestId: string;
  transitionNoteId: string;
};

export type ParsedUnshieldOperatorSuccess = {
  consumedNoteId: string;
  releaseReceipt: UnshieldOperatorReleaseReceipt;
  requestId: string;
  signature: string;
};

export function parseUnshieldOperatorResponseBody(rawText: string): unknown {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return null;
  }

  return JSON.parse(trimmed) as unknown;
}

export function tryParseBlockedUnshieldOperatorResponse(
  parsed: unknown,
  status: number,
  expected: UnshieldOperatorIntentIdentity,
): string | null {
  if (status !== 503 || !parsed || typeof parsed !== "object") {
    return null;
  }

  const body = parsed as Record<string, unknown>;

  if (body.blocked !== true) {
    return null;
  }

  if (typeof body.requestId !== "string" || body.requestId !== expected.requestId) {
    throw new Error("The unshield operator returned a mismatched blocked request id.");
  }

  const consumedNoteId =
    typeof body.consumedNoteId === "string"
      ? body.consumedNoteId
      : typeof body.noteId === "string"
        ? body.noteId
        : null;

  if (consumedNoteId !== expected.consumedNoteId) {
    throw new Error("The unshield operator returned a mismatched blocked consumed note id.");
  }

  assertValidProgramReleaseReceipt(body.releaseReceipt, expected, {
    requireFailClosedPosture: true,
    requireNullReleaseSignature: true,
  });

  if (typeof body.reason === "string" && body.reason.trim()) {
    return body.reason.trim();
  }

  return "Withdrawals are temporarily paused until on-chain verifier wiring ships.";
}

export function parseSuccessfulUnshieldOperatorResponse(
  parsed: unknown,
  expected: UnshieldOperatorIntentIdentity,
): ParsedUnshieldOperatorSuccess {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("The unshield operator returned an invalid response body.");
  }

  const body = parsed as Record<string, unknown>;

  if (typeof body.requestId !== "string" || body.requestId.length === 0) {
    throw new Error("The unshield operator did not return a valid request id.");
  }

  if (body.requestId !== expected.requestId) {
    throw new Error("The unshield operator returned a mismatched request id.");
  }

  const consumedNoteId =
    typeof body.consumedNoteId === "string"
      ? body.consumedNoteId
      : typeof body.noteId === "string"
        ? body.noteId
        : null;

  if (consumedNoteId !== expected.consumedNoteId) {
    throw new Error("The unshield operator returned a mismatched consumed note id.");
  }

  if (typeof body.signature !== "string" || body.signature.length === 0) {
    throw new Error("The unshield operator did not return a valid signature.");
  }

  const releaseReceipt = assertValidReleaseReceipt(body.releaseReceipt, {
    ...expected,
    signature: body.signature,
  });

  return {
    consumedNoteId,
    releaseReceipt,
    requestId: body.requestId,
    signature: body.signature,
  };
}

function assertValidReleaseReceipt(
  receipt: unknown,
  expected: UnshieldOperatorIntentIdentity & { signature: string },
): UnshieldOperatorReleaseReceipt {
  if (!receipt || typeof receipt !== "object") {
    throw new Error("The unshield operator did not return a typed release receipt.");
  }

  const typedReceipt = receipt as UnshieldOperatorReleaseReceipt;

  if (typedReceipt.kind === "vanta-unshield-operator-release-receipt-v1") {
    assertValidLiveReleaseReceipt(typedReceipt, expected);
    return typedReceipt;
  }

  if (typedReceipt.kind === "vanta-unshield-program-release-receipt-v1") {
    assertValidProgramReleaseReceipt(typedReceipt, expected, {
      requireMatchingReleaseSignature: expected.signature,
    });
    return typedReceipt;
  }

  throw new Error("The unshield operator returned an unsupported release receipt kind.");
}

function assertValidLiveReleaseReceipt(
  receipt: UnshieldOperatorLiveReleaseReceipt,
  expected: UnshieldOperatorIntentIdentity & { signature: string },
) {
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

function assertValidProgramReleaseReceipt(
  receipt: unknown,
  expected: UnshieldOperatorIntentIdentity,
  options: {
    requireFailClosedPosture?: boolean;
    requireMatchingReleaseSignature?: string;
    requireNullReleaseSignature?: boolean;
  } = {},
) {
  if (!receipt || typeof receipt !== "object") {
    throw new Error("The unshield operator did not return a typed program release receipt.");
  }

  const typedReceipt = receipt as UnshieldProgramReleaseReceipt;

  if (typedReceipt.kind !== "vanta-unshield-program-release-receipt-v1") {
    throw new Error("The unshield operator did not return a typed program release receipt.");
  }

  if (
    typedReceipt.requestId !== expected.requestId ||
    typedReceipt.consumedNoteId !== expected.consumedNoteId ||
    typedReceipt.transitionNoteId !== expected.transitionNoteId ||
    !typedReceipt.releaseIntentHash.startsWith("sha256:")
  ) {
    throw new Error("The unshield operator returned a mismatched program release receipt.");
  }

  if (options.requireNullReleaseSignature) {
    if (typedReceipt.releaseSignature !== null) {
      throw new Error("The blocked unshield operator response must not claim a release signature.");
    }
  }

  if (options.requireMatchingReleaseSignature) {
    if (typedReceipt.releaseSignature !== options.requireMatchingReleaseSignature) {
      throw new Error("The unshield operator returned a mismatched program release signature.");
    }
  }

  if (options.requireFailClosedPosture) {
    if (typedReceipt.replayStatus !== "not-consumed-no-program-tx") {
      throw new Error("The blocked unshield operator response must stay fail-closed.");
    }

    if (typedReceipt.spendabilityBasis !== "pending-onchain-root-proof-nullifier-verification") {
      throw new Error("The blocked unshield operator response must not claim ledger spendability.");
    }

    if (typedReceipt.releaseModel !== "program-tag-unshield-pda-cpi-fail-closed") {
      throw new Error("The blocked unshield operator response must preserve the program relay model.");
    }
  }
}

export function isUnshieldOperatorLiveReleaseReceipt(
  receipt: UnshieldOperatorReleaseReceipt,
): receipt is UnshieldOperatorLiveReleaseReceipt {
  return receipt.kind === "vanta-unshield-operator-release-receipt-v1";
}

export function isUnshieldOperatorProgramReleaseReceipt(
  receipt: UnshieldOperatorReleaseReceipt,
): receipt is UnshieldProgramReleaseReceipt {
  return receipt.kind === "vanta-unshield-program-release-receipt-v1";
}
