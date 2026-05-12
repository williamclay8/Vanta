import { strict as assert } from "node:assert";
import {
  createWalletMessageIntentSafetySummary,
  signWalletMessageIntentWithSafety,
  validateWalletMessageIntentSafetySummary,
} from "../src/wallet/walletMessageIntentSafety.mjs";

const now = Date.now();
const baseInput = {
  amount: "12.50",
  asset: "USDC",
  connectedWalletAddress: "wallet_abc",
  expiresAt: now + 300_000,
  humanApprovedSummary: true,
  intentKind: "swap-intent",
  issuedAt: now,
  message: "vanta:swap-intent:v2\nrequestId:req_123\namount:12.50",
  owner: "wallet_abc",
  recipient: "operator_vault",
  requestId: "req_123",
  requester: "wallet_abc",
};

const summary = createWalletMessageIntentSafetySummary(baseInput);
assert.equal(summary.kind, "vanta-wallet-message-intent-safety-summary");
assert.equal(summary.version, "vanta-wallet-message-intent-safety-0.1");
assert.equal(summary.intentKind, "swap-intent");
assert.equal(summary.requiresNonceOrRequestId, true);
assert.equal(summary.requiresWalletMessageApproval, true);
assert.equal(summary.requiresHumanApproval, true);
assert.ok(summary.messagePreview.includes("vanta:swap-intent:v2"));

assert.deepEqual(validateWalletMessageIntentSafetySummary(summary, baseInput), {
  accepted: true,
  reason: "message-intent-ready-for-wallet-approval",
});

assert.equal(
  validateWalletMessageIntentSafetySummary(summary, {
    ...baseInput,
    connectedWalletAddress: "different_wallet",
  }).reason,
  "wallet-requester-mismatch",
);
assert.equal(
  validateWalletMessageIntentSafetySummary(summary, {
    ...baseInput,
    humanApprovedSummary: false,
  }).reason,
  "human-approval-required",
);
assert.equal(
  validateWalletMessageIntentSafetySummary(summary, {
    ...baseInput,
    now: baseInput.expiresAt + 1,
  }).reason,
  "message-intent-expired",
);
assert.equal(
  validateWalletMessageIntentSafetySummary(summary, {
    ...baseInput,
    privateKeyMaterialHandled: true,
  }).reason,
  "private-key-material-handled",
);
assert.throws(
  () =>
    createWalletMessageIntentSafetySummary({
      ...baseInput,
      asset: "owner-key-hierarchy",
      intentKind: "shield-master-seed",
      message: "vanta:shield-master-seed:v1\nnot-a-transaction:true",
      recipient: "local-owner-key-hierarchy",
      requestId: "seed_123",
    }),
  /unsupported intentKind/u,
  "Shield master-seed derivation needs a dedicated safety envelope, not the existing action intent allowlist.",
);

let signedMessageText = null;
const signed = await signWalletMessageIntentWithSafety({
  ...baseInput,
  signMessage: async (messageBytes) => {
    signedMessageText = new TextDecoder().decode(messageBytes);
    return new Uint8Array([1, 2, 3, 4]);
  },
});
assert.equal(signed.signed, true);
assert.equal(signed.signatureBase64, "AQIDBA==");
assert.ok(signedMessageText.includes("requestId:req_123"));

const blocked = await signWalletMessageIntentWithSafety({
  ...baseInput,
  humanApprovedSummary: false,
  signMessage: async () => {
    throw new Error("signMessage must not be called when summary is not approved.");
  },
});
assert.equal(blocked.signed, false);
assert.equal(blocked.signatureBytes, null);
assert.equal(blocked.decision.reason, "human-approval-required");

console.log("Vanta wallet message-intent safety check: PASS");
