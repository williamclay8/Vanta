import { PublicKey } from "@solana/web3.js";
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";

import {
  assertReferenceOnlyValue,
  fingerprintVersionedTransactionMessage,
} from "./turnkey-sol-to-shielded-liquidity-signer.mjs";

const turnkeyApiBaseUrl = "https://api.turnkey.com";

function readCompactEnv(env, key) {
  const value = String(env[key] ?? "").trim();
  if (!value) {
    throw new Error(`Turnkey live liquidity signer requires ${key}.`);
  }
  if (value.length > 512 || /[\r\n]/u.test(value)) {
    throw new Error(`${key} must be a compact single-line runtime value.`);
  }
  return value;
}

function assertPublicKey(value, label) {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`${label} must be a Solana public key.`);
  }
}

function readTurnkeyApiBaseUrl(env) {
  const value = String(env.VANTA_TURNKEY_API_BASE_URL ?? turnkeyApiBaseUrl).trim() || turnkeyApiBaseUrl;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VANTA_TURNKEY_API_BASE_URL must be a valid Turnkey API URL.");
  }

  if (
    url.origin !== turnkeyApiBaseUrl ||
    !["", "/"].includes(url.pathname) ||
    url.search ||
    url.hash
  ) {
    throw new Error("VANTA_TURNKEY_API_BASE_URL must resolve to https://api.turnkey.com.");
  }

  return turnkeyApiBaseUrl;
}

export function getTurnkeyLiveSignerReadiness(env = process.env) {
  const signerRefConfigured = Boolean(String(env.VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF ?? "").trim());
  const liquidityPublicKeyRefConfigured = Boolean(
    String(env.VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF ?? "").trim(),
  );
  const organizationConfigured = Boolean(String(env.VANTA_TURNKEY_ORGANIZATION_ID ?? "").trim());
  const organizationIdRefConfigured = Boolean(String(env.VANTA_TURNKEY_ORGANIZATION_ID_REF ?? "").trim());
  const apiPublicKeyConfigured = Boolean(String(env.VANTA_TURNKEY_API_PUBLIC_KEY ?? "").trim());
  const apiPublicKeyRefConfigured = Boolean(String(env.VANTA_TURNKEY_API_PUBLIC_KEY_REF ?? "").trim());
  const apiPrivateKeyConfigured = Boolean(String(env.VANTA_TURNKEY_API_PRIVATE_KEY ?? "").trim());
  const apiPrivateKeyRefConfigured = Boolean(String(env.VANTA_TURNKEY_API_PRIVATE_KEY_REF ?? "").trim());
  const signWithConfigured = Boolean(String(env.VANTA_TURNKEY_SIGN_WITH ?? "").trim());
  const signWithRefConfigured = Boolean(String(env.VANTA_TURNKEY_SIGN_WITH_REF ?? "").trim());
  const policyIdConfigured = Boolean(String(env.VANTA_TURNKEY_POLICY_ID ?? "").trim());
  const policyIdRefConfigured = Boolean(String(env.VANTA_TURNKEY_POLICY_ID_REF ?? "").trim());
  const reviewPacketRefConfigured = Boolean(
    String(env.VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF ?? "").trim(),
  );
  const approvalRefConfigured = Boolean(
    String(env.VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF ?? "").trim(),
  );
  const liveSigningApproved = env.VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED === "true";
  const rawLiquidityPublicKey = String(env.VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY ?? "").trim();
  const liquidityPublicKeyConfigured = Boolean(rawLiquidityPublicKey);
  let liquidityPublicKeyValid = false;
  if (liquidityPublicKeyConfigured) {
    try {
      assertPublicKey(rawLiquidityPublicKey, "Turnkey liquidity signer public key");
      liquidityPublicKeyValid = true;
    } catch {
      liquidityPublicKeyValid = false;
    }
  }

  const sdkConfigured =
    organizationConfigured &&
    apiPublicKeyConfigured &&
    apiPrivateKeyConfigured &&
    signWithConfigured &&
    policyIdConfigured;
  const ready =
    signerRefConfigured &&
    sdkConfigured &&
    liquidityPublicKeyRefConfigured &&
    organizationIdRefConfigured &&
    apiPublicKeyRefConfigured &&
    apiPrivateKeyRefConfigured &&
    signWithRefConfigured &&
    policyIdRefConfigured &&
    reviewPacketRefConfigured &&
    approvalRefConfigured &&
    liveSigningApproved &&
    liquidityPublicKeyValid;

  return {
    apiPrivateKeyConfigured,
    apiPrivateKeyRefConfigured,
    apiPublicKeyConfigured,
    apiPublicKeyRefConfigured,
    approvalRefConfigured,
    liquidityPublicKeyConfigured,
    liquidityPublicKeyRefConfigured,
    liquidityPublicKeyValid,
    liveSigningApproved,
    organizationConfigured,
    organizationIdRefConfigured,
    policyIdConfigured,
    policyIdRefConfigured,
    ready,
    reviewPacketRefConfigured,
    sdkConfigured,
    signWithConfigured,
    signWithRefConfigured,
    signerRefConfigured,
  };
}

export function readTurnkeyLiveSignerConfig(env = process.env) {
  const signerRef = assertReferenceOnlyValue(
    env.VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF,
    "VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
  );
  const liquidityPublicKeyRef = assertReferenceOnlyValue(
    env.VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF,
    "VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF",
  );
  const organizationIdRef = assertReferenceOnlyValue(
    env.VANTA_TURNKEY_ORGANIZATION_ID_REF,
    "VANTA_TURNKEY_ORGANIZATION_ID_REF",
  );
  const apiPublicKeyRef = assertReferenceOnlyValue(
    env.VANTA_TURNKEY_API_PUBLIC_KEY_REF,
    "VANTA_TURNKEY_API_PUBLIC_KEY_REF",
  );
  const apiPrivateKeyRef = assertReferenceOnlyValue(
    env.VANTA_TURNKEY_API_PRIVATE_KEY_REF,
    "VANTA_TURNKEY_API_PRIVATE_KEY_REF",
  );
  const signWithRef = assertReferenceOnlyValue(
    env.VANTA_TURNKEY_SIGN_WITH_REF,
    "VANTA_TURNKEY_SIGN_WITH_REF",
  );
  const policyIdRef = assertReferenceOnlyValue(
    env.VANTA_TURNKEY_POLICY_ID_REF,
    "VANTA_TURNKEY_POLICY_ID_REF",
  );
  const reviewPacketRef = assertReferenceOnlyValue(
    env.VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF,
    "VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF",
  );
  const approvalRef = assertReferenceOnlyValue(
    env.VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF,
    "VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF",
  );
  if (env.VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED !== "true") {
    throw new Error(
      "Turnkey live liquidity signing requires VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED=true after dry-run review.",
    );
  }

  const organizationId = readCompactEnv(env, "VANTA_TURNKEY_ORGANIZATION_ID");
  const apiPublicKey = readCompactEnv(env, "VANTA_TURNKEY_API_PUBLIC_KEY");
  const apiPrivateKey = readCompactEnv(env, "VANTA_TURNKEY_API_PRIVATE_KEY");
  const signWith = readCompactEnv(env, "VANTA_TURNKEY_SIGN_WITH");
  const policyId = readCompactEnv(env, "VANTA_TURNKEY_POLICY_ID");
  const liquidityPublicKey = assertPublicKey(
    readCompactEnv(env, "VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY"),
    "VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY",
  );

  return {
    apiBaseUrl: readTurnkeyApiBaseUrl(env),
    apiPrivateKey,
    apiPrivateKeyRef,
    apiPublicKey,
    apiPublicKeyRef,
    approvalRef,
    liquidityPublicKey,
    liquidityPublicKeyRef,
    organizationId,
    organizationIdRef,
    policyId,
    policyIdRef,
    reviewPacketRef,
    signWith,
    signWithRef,
    signerRef,
  };
}

export function createTurnkeySolanaSigner(config, injectedSigner) {
  if (injectedSigner) {
    return injectedSigner;
  }

  const turnkey = new Turnkey({
    apiBaseUrl: config.apiBaseUrl,
    apiPrivateKey: config.apiPrivateKey,
    apiPublicKey: config.apiPublicKey,
    defaultOrganizationId: config.organizationId,
  });

  return new TurnkeySigner({
    client: turnkey.apiClient(),
    organizationId: config.organizationId,
  });
}

export async function signJupiterTransactionWithTurnkey({
  config = readTurnkeyLiveSignerConfig(),
  injectedSigner,
  transaction,
}) {
  if (!transaction?.message || typeof transaction.message.serialize !== "function") {
    throw new Error("Turnkey live liquidity signer requires a VersionedTransaction-like transaction.");
  }

  const unsignedFingerprint = fingerprintVersionedTransactionMessage(transaction);
  const signer = createTurnkeySolanaSigner(config, injectedSigner);
  if (typeof signer.signTransaction !== "function") {
    throw new Error("Turnkey live liquidity signer must expose signTransaction.");
  }

  const signedTransaction = await signer.signTransaction(
    transaction,
    config.signWith,
    config.organizationId,
  );
  const signedFingerprint = fingerprintVersionedTransactionMessage(signedTransaction);
  if (signedFingerprint !== unsignedFingerprint) {
    throw new Error("Turnkey signed transaction changed the reviewed Jupiter transaction message.");
  }

  return {
    approvalRef: config.approvalRef,
    liquidityPublicKey: config.liquidityPublicKey,
    policyIdRef: config.policyIdRef,
    reviewPacketRef: config.reviewPacketRef,
    signedTransaction,
    signWithRef: config.signWithRef,
    signerRef: config.signerRef,
    transactionFingerprint: unsignedFingerprint,
  };
}
