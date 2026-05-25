import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  VANTA_PRIVATE_POOL_V2_RELAYER_FORBIDDEN_PERSISTENCE_FIELDS,
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_CLAIM_BOUNDARY,
  assertNoRelayerPrivacyTransportPersistentMetadata,
  assertProductionRelayerPrivacyTransportConfig,
  buildVantaPrivatePoolV2RelayerPrivacyTransportStatus,
  normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence,
} from "../src/privacy/privatePoolV2RelayerPrivacyTransport.mjs";
import { createVantaPrivatePoolV2RelayerQueue } from "../src/privacy/privatePoolV2RelayerQueue.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const threatModel = readFileSync(resolve(repoRoot, "docs/threat-model.md"), "utf8");
const securityLimitations = readFileSync(resolve(repoRoot, "SECURITY_LIMITATIONS.md"), "utf8");
const operatorRunbook = readFileSync(resolve(repoRoot, "docs/operator-runbook.md"), "utf8");
const trackerState = readFileSync(
  resolve(repoRoot, "docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml"),
  "utf8",
);

const commonProductionTransportEnv = {
  NODE_ENV: "production",
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_DEPLOYMENT_REF:
    "tor-onion-service:relayer-privacy-transport-fixture",
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED: "true",
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_LOG_REDACTION_REVIEW_REF:
    "review:relayer-privacy-transport-log-redaction-fixture",
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_RETENTION_POLICY_REF:
    "retention-policy:relayer-privacy-transport-fixture",
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_REVIEWER_ACCEPTANCE_REF:
    "reviewer:relayer-privacy-transport-fixture",
};

const torProductionTransportEnv = {
  ...commonProductionTransportEnv,
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODE: "tor-onion",
  VANTA_PRIVATE_POOL_V2_RELAYER_TOR_ONION_HOST_FINGERPRINT_REF:
    "sha256:" + "ab".repeat(32),
  VANTA_PRIVATE_POOL_V2_RELAYER_TOR_ONION_SERVICE_REF:
    "tor-onion-service:relayer-privacy-transport-fixture",
  VANTA_PRIVATE_POOL_V2_RELAYER_TOR_REVERSE_PROXY_REDACTION_REF:
    "review:relayer-privacy-transport-reverse-proxy-redaction-fixture",
};

const blindedTokenProductionTransportEnv = {
  ...commonProductionTransportEnv,
  VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_FAMILY_REF:
    "blinded-token-family:relayer-privacy-transport-fixture",
  VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_ISSUER_REF:
    "blinded-token-issuer:relayer-privacy-transport-fixture",
  VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_REPLAY_CACHE_REF:
    "blinded-token-replay-cache:relayer-privacy-transport-fixture",
  VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_VERIFIER_REF:
    "blinded-token-verifier:relayer-privacy-transport-fixture",
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_DEPLOYMENT_REF:
    "blinded-token-service:relayer-privacy-transport-fixture",
  VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODE: "blinded-token",
};

const localStatus = buildVantaPrivatePoolV2RelayerPrivacyTransportStatus({});
assert.equal(localStatus.implemented, true);
assert.equal(localStatus.privacyTransportReady, false);
assert.equal(localStatus.productionReady, false);
assert.equal(localStatus.privacyClaimAllowed, false);
assert.equal(localStatus.activeMode, null);
assert.deepEqual(localStatus.supportedModes, ["tor-onion", "blinded-token"]);
assert.equal(localStatus.claimBoundary, VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_CLAIM_BOUNDARY);

assert.throws(
  () => assertProductionRelayerPrivacyTransportConfig({ NODE_ENV: "production" }),
  /VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED=true/,
);
assert.throws(
  () =>
    assertProductionRelayerPrivacyTransportConfig({
      ...torProductionTransportEnv,
      VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_ENABLED: "true",
      VANTA_PRIVATE_POOL_V2_RELAYER_TOR_ONION_ENABLED: "true",
    }),
  /exactly one privacy transport mode/,
);
assert.throws(
  () =>
    assertProductionRelayerPrivacyTransportConfig({
      ...torProductionTransportEnv,
      VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODE: "direct-http",
    }),
  /mode must be one of/,
);
assert.throws(
  () =>
    assertProductionRelayerPrivacyTransportConfig({
      NODE_ENV: "production",
      VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED: "true",
      VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODE: "tor-onion",
    }),
  /requires deploymentRef/,
);

const acceptedTor = assertProductionRelayerPrivacyTransportConfig(torProductionTransportEnv);
assert.equal(acceptedTor.activeMode, "tor-onion");
assert.equal(acceptedTor.privacyTransportReady, true);
assert.equal(acceptedTor.productionReady, false);
assert.equal(
  acceptedTor.torOnion.onionServiceRef,
  "tor-onion-service:relayer-privacy-transport-fixture",
);

const acceptedBlinded = assertProductionRelayerPrivacyTransportConfig(blindedTokenProductionTransportEnv);
assert.equal(acceptedBlinded.activeMode, "blinded-token");
assert.equal(acceptedBlinded.privacyTransportReady, true);
assert.equal(acceptedBlinded.productionReady, false);
assert.equal(
  acceptedBlinded.blindedToken.replayCacheRef,
  "blinded-token-replay-cache:relayer-privacy-transport-fixture",
);

const torEvidence = normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence({
  deploymentRef: "tor-onion-service:reviewed-relayer-onion-v0",
  logRedactionReviewRef: "review:relayer-log-redaction-v0",
  mode: "tor-onion",
  privacyClaimAllowed: false,
  productionReady: false,
  retentionPolicyRef: "retention-policy:relayer-no-ip-persistence-v0",
  reviewerAcceptanceRef: "reviewer:relayer-privacy-transport-v0",
  secretPolicy: "references-only-no-secret-values",
  torOnion: {
    onionHostFingerprintRef: "sha256:" + "12".repeat(32),
    onionServiceRef: "tor-onion-service:reviewed-relayer-onion-v0",
    reverseProxyRedactionRef: "review:relayer-onion-reverse-proxy-redaction-v0",
  },
});
assert.equal(torEvidence.activeMode, "tor-onion");

const blindedEvidence = normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence({
  blindedToken: {
    issuerRef: "blinded-token-issuer:reviewed-relayer-issuer-v0",
    replayCacheRef: "blinded-token-replay-cache:reviewed-relayer-cache-v0",
    tokenFamilyRef: "blinded-token-family:reviewed-relayer-family-v0",
    verifierRef: "blinded-token-verifier:reviewed-relayer-verifier-v0",
  },
  deploymentRef: "blinded-token-service:reviewed-relayer-blinded-token-v0",
  logRedactionReviewRef: "review:relayer-blinded-token-log-redaction-v0",
  mode: "blinded-token",
  privacyClaimAllowed: false,
  productionReady: false,
  retentionPolicyRef: "retention-policy:relayer-no-ip-persistence-v0",
  reviewerAcceptanceRef: "reviewer:relayer-privacy-transport-v0",
  secretPolicy: "references-only-no-secret-values",
});
assert.equal(blindedEvidence.activeMode, "blinded-token");

const rawPrivateKeyFixture = ["-----BEGIN", "PRIVATE KEY-----not-allowed"].join(" ");

for (const forbiddenPacket of [
  {
    ...torEvidence,
    mode: "tor-onion",
    torOnion: {
      ...torEvidence.torOnion,
      onionPrivateKey: rawPrivateKeyFixture,
    },
  },
  {
    ...torEvidence,
    mode: "tor-onion",
    authorization: "Bearer not-allowed",
  },
  {
    ...blindedEvidence,
    mode: "blinded-token",
    blindedToken: {
      ...blindedEvidence.blindedToken,
      tokenPreimage: "token-private-preimage",
    },
  },
  {
    ...blindedEvidence,
    mode: "blinded-token",
    walletAddress: "wallet:source-user",
  },
]) {
  assert.throws(
    () => normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence(forbiddenPacket),
    /forbids/,
    "Relayer privacy-transport evidence must reject raw secret, token, user, and wallet fields.",
  );
}

const queue = createVantaPrivatePoolV2RelayerQueue({ nowMs: () => 10_000, random: () => 0 });
for (const fieldName of [
  "ip",
  "x-forwarded-for",
  "cf-connecting-ip",
  "rawIpAddress",
  "userAgent",
  "user-agent",
  "authToken",
  "rawToken",
  "tokenPreimage",
  "blindedTokenPreimage",
]) {
  assert.throws(
    () =>
      queue.enqueueRelaySubmission({
        idempotencyKey: `send:no-ip:${fieldName}`,
        kind: "send",
        metadata: {
          [fieldName]: "203.0.113.10",
          proofReceiptId: `receipt:${fieldName}`,
          publicInputCommitment: `commitment:${fieldName}`,
          serializedTransactionRef: "sha256:" + "77".repeat(32),
          settlementId: `settlement:${fieldName}`,
        },
      }),
    /forbids queued relay field/,
    `Relay queue metadata must reject persisted ${fieldName}.`,
  );
}

assert.throws(
  () =>
    assertNoRelayerPrivacyTransportPersistentMetadata({
      headers: { "x-forwarded-for": "203.0.113.10" },
    }),
  /forbids/,
);
assert.ok(
  VANTA_PRIVATE_POOL_V2_RELAYER_FORBIDDEN_PERSISTENCE_FIELDS.includes("x-forwarded-for"),
  "Forbidden persistence fields must include x-forwarded-for.",
);

assert.equal(
  packageJson.scripts["relayer:privacy-transport-check"],
  "node scripts/check-vanta-private-pool-v2-relayer-privacy-transport.mjs",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"].includes("npm run relayer:privacy-transport-check"),
  "private-pool-v2:verify must include the relayer privacy transport guard.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run relayer:privacy-transport-check"),
  "mainnet:preflight must include the relayer privacy transport guard.",
);

for (const source of [threatModel, securityLimitations, operatorRunbook, trackerState]) {
  assert.ok(source.includes("Tor/blinded-token"), "Truth surfaces must name the Tor/blinded-token boundary.");
  assert.ok(source.includes("not live Tor"), "Truth surfaces must avoid live Tor claims.");
  assert.ok(source.includes("not live blinded-token"), "Truth surfaces must avoid live blinded-token claims.");
  assert.ok(source.includes("not production privacy"), "Truth surfaces must avoid production privacy claims.");
}

assert.ok(
  trackerState.includes("PPA-RELAYER-003") &&
    trackerState.includes("implemented-verified-local") &&
    trackerState.includes("npm run relayer:privacy-transport-check: PASS"),
  "Tracker must mark PPA-RELAYER-003 implemented with verification evidence.",
);

console.log("Vanta Private Pool v2 relayer privacy transport check: PASS");
