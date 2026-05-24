import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import {
  getTurnkeyLiveSignerReadiness,
  readTurnkeyLiveSignerConfig,
  signJupiterTransactionWithTurnkey,
} from "../operator/turnkey-sol-to-shielded-live-signer.mjs";

const liveSignerSource = readFileSync("operator/turnkey-sol-to-shielded-live-signer.mjs", "utf8");
const adapterSource = readFileSync("operator/jupiter-sol-to-shielded-route-adapter.mjs", "utf8");

assert.match(liveSignerSource, /@turnkey\/sdk-server/u);
assert.match(liveSignerSource, /@turnkey\/solana/u);
assert.match(liveSignerSource, /VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED/u);
assert.match(liveSignerSource, /VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF/u);
assert.match(adapterSource, /signJupiterTransactionWithTurnkey/u);
assert.match(adapterSource, /getLiquiditySignerRuntime/u);
assert.match(adapterSource, /userPublicKey: liquiditySigner\.liquidityPublicKey/u);
assert.match(adapterSource, /signedTransaction\.serialize\(\)/u);

for (const source of [liveSignerSource, adapterSource]) {
  assert.doesNotMatch(source, /@turnkey\/sdk-browser/u);
  assert.doesNotMatch(source, /\b(?:window|document|localStorage|sessionStorage)\b|import\.meta\.env/u);
}
assert.doesNotMatch(liveSignerSource, /VITE_/u);
assert.doesNotMatch(liveSignerSource, /Keypair\.fromSecretKey/u);
assert.doesNotMatch(liveSignerSource, /\b(?:readFileSync|writeFileSync|createReadStream)\b/u);

function publicKeyFromByte(value) {
  return new PublicKey(Uint8Array.from({ length: 32 }, () => value));
}

function createFixtureJupiterTransaction() {
  const liquidityPublicKey = publicKeyFromByte(31);
  const destinationPublicKey = publicKeyFromByte(32);
  const recentBlockhash = publicKeyFromByte(33).toBase58();
  const instruction = new TransactionInstruction({
    data: Buffer.from("vanta-live-turnkey-signer-fixture", "utf8"),
    keys: [
      {
        isSigner: true,
        isWritable: true,
        pubkey: liquidityPublicKey,
      },
      {
        isSigner: false,
        isWritable: true,
        pubkey: destinationPublicKey,
      },
    ],
    programId: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
  });
  const message = new TransactionMessage({
    instructions: [instruction],
    payerKey: liquidityPublicKey,
    recentBlockhash,
  }).compileToV0Message();

  return {
    liquidityPublicKey,
    transaction: new VersionedTransaction(message),
  };
}

const { liquidityPublicKey, transaction } = createFixtureJupiterTransaction();
const fakeEnv = {
  VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY: liquidityPublicKey.toBase58(),
  VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF:
    "test-ref:VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF",
  VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF:
    "test-ref:VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
  VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED: "true",
  VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF:
    "test-ref:turnkey-liquidity-live-signing-approval",
  VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF:
    "test-ref:turnkey-liquidity-signer-dry-run-review",
  VANTA_TURNKEY_API_PRIVATE_KEY: "tk-test-credential-placeholder",
  VANTA_TURNKEY_API_PRIVATE_KEY_REF: "test-ref:VANTA_TURNKEY_API_PRIVATE_KEY_REF",
  VANTA_TURNKEY_API_PUBLIC_KEY: "tk-test-public-credential-placeholder",
  VANTA_TURNKEY_API_PUBLIC_KEY_REF: "test-ref:VANTA_TURNKEY_API_PUBLIC_KEY_REF",
  VANTA_TURNKEY_ORGANIZATION_ID: "org_test_vanta_liquidity",
  VANTA_TURNKEY_ORGANIZATION_ID_REF: "test-ref:VANTA_TURNKEY_ORGANIZATION_ID_REF",
  VANTA_TURNKEY_POLICY_ID: "policy_test_vanta_liquidity",
  VANTA_TURNKEY_POLICY_ID_REF: "test-ref:VANTA_TURNKEY_POLICY_ID_REF",
  VANTA_TURNKEY_SIGN_WITH: liquidityPublicKey.toBase58(),
  VANTA_TURNKEY_SIGN_WITH_REF: "test-ref:VANTA_TURNKEY_SIGN_WITH_REF",
};

const readiness = getTurnkeyLiveSignerReadiness(fakeEnv);
assert.equal(readiness.ready, true);
assert.equal(readiness.sdkConfigured, true);
assert.equal(readiness.liveSigningApproved, true);
assert.equal(readiness.reviewPacketRefConfigured, true);
assert.equal(readiness.approvalRefConfigured, true);
assert.equal(readiness.liquidityPublicKeyConfigured, true);
assert.equal(readiness.liquidityPublicKeyRefConfigured, true);
assert.equal(readiness.liquidityPublicKeyValid, true);
assert.equal(readiness.signWithRefConfigured, true);

const readinessText = JSON.stringify(readiness);
for (const value of [
  fakeEnv.VANTA_TURNKEY_API_PRIVATE_KEY,
  fakeEnv.VANTA_TURNKEY_API_PUBLIC_KEY,
  fakeEnv.VANTA_TURNKEY_SIGN_WITH,
]) {
  assert.ok(!readinessText.includes(value), "Readiness status must not expose runtime credential values.");
}

const config = readTurnkeyLiveSignerConfig(fakeEnv);
assert.equal(config.organizationId, fakeEnv.VANTA_TURNKEY_ORGANIZATION_ID);
assert.equal(config.signWith, fakeEnv.VANTA_TURNKEY_SIGN_WITH);
assert.equal(config.liquidityPublicKey, liquidityPublicKey.toBase58());
assert.equal(config.liquidityPublicKeyRef, fakeEnv.VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF);
assert.equal(config.signerRef, fakeEnv.VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF);
assert.equal(config.policyIdRef, fakeEnv.VANTA_TURNKEY_POLICY_ID_REF);
assert.equal(config.reviewPacketRef, fakeEnv.VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF);
assert.equal(config.approvalRef, fakeEnv.VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF);
assert.equal(config.signWithRef, fakeEnv.VANTA_TURNKEY_SIGN_WITH_REF);

assert.throws(
  () =>
    readTurnkeyLiveSignerConfig({
      ...fakeEnv,
      VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED: "false",
    }),
  /LIVE_SIGNING_APPROVED=true/u,
);
assert.equal(
  getTurnkeyLiveSignerReadiness({
    ...fakeEnv,
    VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY: "",
  }).ready,
  false,
);
assert.throws(
  () =>
    readTurnkeyLiveSignerConfig({
      ...fakeEnv,
      VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY: "",
    }),
  /VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY/u,
);
assert.throws(
  () =>
    readTurnkeyLiveSignerConfig({
      ...fakeEnv,
      VANTA_TURNKEY_API_BASE_URL: "https://turnkey.invalid.example",
    }),
  /https:\/\/api\.turnkey\.com/u,
);

let signerCalls = 0;
const fakeSigner = {
  async signTransaction(unsignedTransaction, signWith, organizationId) {
    signerCalls += 1;
    assert.equal(unsignedTransaction, transaction);
    assert.equal(signWith, fakeEnv.VANTA_TURNKEY_SIGN_WITH);
    assert.equal(organizationId, fakeEnv.VANTA_TURNKEY_ORGANIZATION_ID);
    return unsignedTransaction;
  },
};

const signed = await signJupiterTransactionWithTurnkey({
  config,
  injectedSigner: fakeSigner,
  transaction,
});

assert.equal(signerCalls, 1);
assert.equal(signed.signedTransaction, transaction);
assert.equal(signed.liquidityPublicKey, liquidityPublicKey.toBase58());
assert.equal(signed.signerRef, fakeEnv.VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF);
assert.equal(signed.signWithRef, fakeEnv.VANTA_TURNKEY_SIGN_WITH_REF);
assert.equal(signed.policyIdRef, fakeEnv.VANTA_TURNKEY_POLICY_ID_REF);
assert.equal(signed.approvalRef, fakeEnv.VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF);
assert.match(signed.transactionFingerprint, /^sha256:[0-9a-f]{64}$/u);

console.log("Vanta Turnkey liquidity live signer adapter check: PASS");
