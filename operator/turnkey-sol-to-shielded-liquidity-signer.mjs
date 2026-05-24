import { createHash } from "node:crypto";

export const turnkeyLiquiditySignerDryRunReviewVersion =
  "vanta-turnkey-liquidity-signer-dry-run-review-0.1";

const approvalStates = new Set([
  "review-required-not-approved",
  "approved-for-dry-run-only",
]);

const refPrefixes = [
  "aws-sm://",
  "azure-kv://",
  "doppler:",
  "gcp-sm://",
  "hsm:",
  "op://",
  "ref:",
  "secret://",
  "test-ref:",
  "turnkey:",
];

const forbiddenPacketKeys = new Set([
  "keypair",
  "mnemonic",
  "privateKey",
  "rawSecret",
  "rawTransaction",
  "secretKey",
  "seedPhrase",
  "serializedTransaction",
  "signedTransaction",
  "swapTransaction",
  "value",
]);

const rawSecretValuePatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\b(?:seed phrase|mnemonic|private key|secret key)\b/iu,
  /\b(?:sk_live_|sk_test_|whsec_|xprv)/iu,
  /\bbearer\s+[a-z0-9._-]{12,}/iu,
  /\[[\d,\s]{96,}\]/u,
  /\{[^{}]*(?:secretKey|privateKey|mnemonic|seedPhrase)[^{}]*\}/iu,
];

function sha256Hex(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function fingerprintVersionedTransactionMessage(transaction) {
  if (!transaction?.message || typeof transaction.message.serialize !== "function") {
    throw new Error("A Solana VersionedTransaction-like object with a serializable message is required.");
  }

  return sha256Hex(Buffer.from(transaction.message.serialize()));
}

export function assertReferenceOnlyValue(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${label} is required and must be a reference, not key material.`);
  }
  if (normalized.length > 256 || /[\r\n]/u.test(normalized)) {
    throw new Error(`${label} must be a compact single-line reference.`);
  }
  if (/^[{[]/u.test(normalized)) {
    throw new Error(`${label} must not be JSON, serialized key material, or a raw keypair.`);
  }
  for (const pattern of rawSecretValuePatterns) {
    if (pattern.test(normalized)) {
      throw new Error(`${label} looks like a secret value, not a governed signer reference.`);
    }
  }
  if (!refPrefixes.some((prefix) => normalized.startsWith(prefix)) && !normalized.endsWith("_REF")) {
    throw new Error(`${label} must use a governed reference prefix or a *_REF token.`);
  }

  return normalized;
}

export function assertNoRawProductionLiquidityKeypair({
  nodeEnv,
  rawLiquidityKeypairJsonConfigured,
  rawLiquidityKeypairPathConfigured,
}) {
  const rawConfigured = Boolean(rawLiquidityKeypairJsonConfigured || rawLiquidityKeypairPathConfigured);
  if (nodeEnv === "production" && rawConfigured) {
    throw new Error(
      "VANTA_SOL_TO_SHIELDED raw liquidity keypairs are local-only. Production must use VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF with a wrapped external signer/HSM boundary.",
    );
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function scanPacketForRawValues(value, path = "reviewPacket") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanPacketForRawValues(entry, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (forbiddenPacketKeys.has(key)) {
        throw new Error(`Review packet must not contain raw transaction or secret field ${path}.${key}.`);
      }
      scanPacketForRawValues(entry, `${path}.${key}`);
    }
    return;
  }

  if (typeof value !== "string") {
    return;
  }

  for (const pattern of rawSecretValuePatterns) {
    if (pattern.test(value)) {
      throw new Error(`Review packet contains a raw-looking secret value at ${path}.`);
    }
  }
}

export function createTurnkeyLiquiditySignerReviewPacket({
  amount,
  approvalState,
  asset,
  controls,
  destination,
  instructionSummary,
  liquidityPublicKey,
  policyIdRef,
  signWithRef,
  signerRef,
  simulationRef,
  transaction,
}) {
  assertPlainObject(amount, "amount");
  assertPlainObject(asset, "asset");
  assertPlainObject(destination, "destination");
  assertPlainObject(controls, "controls");
  if (!Array.isArray(instructionSummary) || instructionSummary.length === 0) {
    throw new Error("instructionSummary must include at least one Jupiter fixture instruction.");
  }
  if (!approvalStates.has(approvalState)) {
    throw new Error("approvalState must explicitly remain review-required or dry-run-only.");
  }

  const normalizedSignerRef = assertReferenceOnlyValue(signerRef, "signerRef");
  const normalizedSignWithRef = assertReferenceOnlyValue(signWithRef, "signWithRef");
  const normalizedPolicyIdRef = assertReferenceOnlyValue(policyIdRef, "policyIdRef");
  const normalizedSimulationRef = assertReferenceOnlyValue(simulationRef, "simulationRef");

  const packet = {
    version: turnkeyLiquiditySignerDryRunReviewVersion,
    mode: "dry-run-no-live-call",
    routeProvider: "Jupiter",
    signer: {
      signerRef: normalizedSignerRef,
      signWithRef: normalizedSignWithRef,
      policyIdRef: normalizedPolicyIdRef,
      liquidityPublicKey: String(liquidityPublicKey),
      keyMaterialObserved: false,
    },
    transaction: {
      fixture: "offline-jupiter-versioned-transaction-v0",
      fingerprint: fingerprintVersionedTransactionMessage(transaction),
      instructionSummary,
    },
    simulation: {
      simulationRef: normalizedSimulationRef,
      status: "fixture-reviewed-no-live-rpc",
    },
    amount,
    asset,
    destination,
    approval: {
      state: approvalState,
      liveModeAllowed: false,
    },
    controls: {
      ...controls,
      broadcastAttempted: false,
      fixtureOnly: true,
      liquiditySignerMode: "wrapped-external-signer",
      liveCallsAttempted: false,
      mockedTurnkeyClient: true,
      movesFunds: false,
      noBroadcast: true,
      noLiveCall: true,
      noNetwork: true,
      noSecretValueReads: true,
      noSecretValuePrints: true,
      rawProductionKeypairAccepted: false,
      signedPayloadProduced: false,
      turnkeyActivityCreated: false,
    },
  };

  assertReviewPacketSanitized(packet);
  return packet;
}

export function assertReviewPacketSanitized(packet) {
  scanPacketForRawValues(packet);

  if (packet?.controls?.noLiveCall !== true) {
    throw new Error("Review packet must explicitly mark noLiveCall=true.");
  }
  if (packet?.controls?.noNetwork !== true) {
    throw new Error("Review packet must explicitly mark noNetwork=true.");
  }
  if (packet?.controls?.noBroadcast !== true) {
    throw new Error("Review packet must explicitly mark noBroadcast=true.");
  }
  if (packet?.controls?.noSecretValueReads !== true || packet?.controls?.noSecretValuePrints !== true) {
    throw new Error("Review packet must explicitly mark secret-value reads and prints as blocked.");
  }
  if (packet?.approval?.liveModeAllowed !== false) {
    throw new Error("Review packet must not approve live mode.");
  }
}

export async function runTurnkeyLiquiditySignerDryRun({
  amount,
  approvalState = "review-required-not-approved",
  asset,
  destination,
  instructionSummary,
  liquidityPublicKey,
  policyIdRef,
  signWithRef,
  signerRef,
  simulationRef,
  transaction,
  turnkeyClient,
}) {
  if (!turnkeyClient || turnkeyClient.mockTurnkeyClient !== true) {
    throw new Error("Dry run requires an injected mock Turnkey client; live Turnkey clients are not allowed.");
  }
  if (typeof turnkeyClient.signTransaction !== "function") {
    throw new Error("Dry run mock Turnkey client must expose signTransaction.");
  }

  const reviewPacket = createTurnkeyLiquiditySignerReviewPacket({
    amount,
    approvalState,
    asset,
    controls: {
      broadcastCalls: 0,
      liveTurnkeyCalls: 0,
      networkCalls: 0,
    },
    destination,
    instructionSummary,
    liquidityPublicKey,
    policyIdRef,
    signWithRef,
    signerRef,
    simulationRef,
    transaction,
  });

  const mockResult = await turnkeyClient.signTransaction({
    dryRun: true,
    liquidityPublicKey: reviewPacket.signer.liquidityPublicKey,
    policyIdRef: reviewPacket.signer.policyIdRef,
    signWithRef: reviewPacket.signer.signWithRef,
    signerRef: reviewPacket.signer.signerRef,
    transaction,
    transactionFingerprint: reviewPacket.transaction.fingerprint,
  });

  if (mockResult?.transactionFingerprint !== reviewPacket.transaction.fingerprint) {
    throw new Error("Mock Turnkey signing result must preserve the reviewed transaction fingerprint.");
  }

  return {
    mode: "dry-run-no-live-call",
    mockTurnkeyClientCalled: true,
    reviewPacket: {
      ...reviewPacket,
      controls: {
        ...reviewPacket.controls,
        mockTurnkeyClientCalls: 1,
      },
    },
  };
}
