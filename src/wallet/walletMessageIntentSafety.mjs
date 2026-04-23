const SUPPORTED_INTENT_KINDS = new Set([
  "swap-intent",
  "unshield-intent",
  "sol-unshield-intent",
]);

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta wallet message-intent safety requires ${fieldName}.`);
  }

  return value.trim();
}

function requireFiniteTimestamp(value, fieldName) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Vanta wallet message-intent safety requires ${fieldName}.`);
  }

  return Number(value);
}

function normalizeMessage(message) {
  if (message instanceof Uint8Array) {
    return {
      bytes: message,
      text: new TextDecoder().decode(message),
    };
  }

  const text = requireText(message, "message");

  return {
    bytes: new TextEncoder().encode(text),
    text,
  };
}

function encodeBase64(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function createWalletMessageIntentSafetySummary(input) {
  const intentKind = requireText(input.intentKind, "intentKind");
  if (!SUPPORTED_INTENT_KINDS.has(intentKind)) {
    throw new Error(`Vanta wallet message-intent safety received unsupported intentKind: ${intentKind}.`);
  }

  const issuedAt = requireFiniteTimestamp(input.issuedAt, "issuedAt");
  const expiresAt = requireFiniteTimestamp(input.expiresAt, "expiresAt");
  if (expiresAt <= issuedAt) {
    throw new Error("Vanta wallet message-intent safety requires expiresAt after issuedAt.");
  }

  const message = normalizeMessage(input.message);

  return {
    amount: requireText(input.amount, "amount"),
    asset: requireText(input.asset, "asset"),
    expiresAt,
    intentKind,
    issuedAt,
    kind: "vanta-wallet-message-intent-safety-summary",
    messagePreview: message.text.slice(0, 280),
    owner: requireText(input.owner, "owner"),
    recipient: requireText(input.recipient, "recipient"),
    requestId: requireText(input.requestId, "requestId"),
    requester: requireText(input.requester, "requester"),
    requiresHumanApproval: true,
    requiresNonceOrRequestId: true,
    requiresWalletMessageApproval: true,
    version: "vanta-wallet-message-intent-safety-0.1",
  };
}

export function validateWalletMessageIntentSafetySummary(summary, options = {}) {
  if (summary?.kind !== "vanta-wallet-message-intent-safety-summary") {
    return {
      accepted: false,
      reason: "invalid-message-intent-summary-kind",
    };
  }

  if (!SUPPORTED_INTENT_KINDS.has(summary.intentKind)) {
    return {
      accepted: false,
      reason: "unsupported-intent-kind",
    };
  }

  const now = Number.isFinite(options.now) ? Number(options.now) : Date.now();
  if (summary.expiresAt <= now) {
    return {
      accepted: false,
      reason: "message-intent-expired",
    };
  }

  if (!summary.requestId) {
    return {
      accepted: false,
      reason: "message-intent-request-id-required",
    };
  }

  if (options.connectedWalletAddress && options.connectedWalletAddress !== summary.requester) {
    return {
      accepted: false,
      reason: "wallet-requester-mismatch",
    };
  }

  if (options.privateKeyMaterialHandled) {
    return {
      accepted: false,
      reason: "private-key-material-handled",
    };
  }

  if (!options.humanApprovedSummary) {
    return {
      accepted: false,
      reason: "human-approval-required",
    };
  }

  return {
    accepted: true,
    reason: "message-intent-ready-for-wallet-approval",
  };
}

export async function signWalletMessageIntentWithSafety(input) {
  if (typeof input.signMessage !== "function") {
    throw new Error("Vanta wallet message-intent safety requires signMessage.");
  }

  const message = normalizeMessage(input.message);
  const summary = createWalletMessageIntentSafetySummary({
    ...input,
    message: message.bytes,
  });
  const decision = validateWalletMessageIntentSafetySummary(summary, {
    connectedWalletAddress: input.connectedWalletAddress,
    humanApprovedSummary: input.humanApprovedSummary,
    now: input.now,
    privateKeyMaterialHandled: input.privateKeyMaterialHandled,
  });

  if (!decision.accepted) {
    return {
      decision,
      signatureBase64: null,
      signatureBytes: null,
      signed: false,
      summary,
    };
  }

  const signatureBytes = await input.signMessage(message.bytes);

  return {
    decision,
    signatureBase64: encodeBase64(signatureBytes),
    signatureBytes,
    signed: true,
    summary,
  };
}
