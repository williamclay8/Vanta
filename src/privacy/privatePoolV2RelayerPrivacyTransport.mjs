import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_VERSION =
  "vanta-private-pool-v2-relayer-privacy-transport-0.1";

export const VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_CLAIM_BOUNDARY =
  "local refs-only Tor/blinded-token relayer privacy-transport contract; not live anonymity, audit, or production privacy evidence";

export const VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODES = Object.freeze([
  "tor-onion",
  "blinded-token",
]);

export const VANTA_PRIVATE_POOL_V2_RELAYER_FORBIDDEN_PERSISTENCE_FIELDS = Object.freeze([
  "authorization",
  "authToken",
  "bearerToken",
  "blindedToken",
  "blindedTokenPreimage",
  "cf-connecting-ip",
  "cfConnectingIp",
  "forwarded",
  "ip",
  "ipAddress",
  "onionPrivateKey",
  "rawIpAddress",
  "rawToken",
  "token",
  "tokenPreimage",
  "user-agent",
  "userAgent",
  "x-forwarded-for",
  "x-real-ip",
  "xForwardedFor",
  "xRealIp",
]);

const supportedModeSet = new Set(VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODES);
const forbiddenKeySet = new Set(
  [
    ...VANTA_PRIVATE_POOL_V2_RELAYER_FORBIDDEN_PERSISTENCE_FIELDS,
    "databaseUrl",
    "keypair",
    "mnemonic",
    "onion_private_key",
    "privateKey",
    "rawSecret",
    "seedPhrase",
  ].map(normalizeKey),
);
const forbiddenUserWalletKeySet = new Set(
  [
    "owner",
    "ownerPubkey",
    "sourceWallet",
    "user",
    "userAddress",
    "userId",
    "wallet",
    "walletAddress",
    "walletPubkey",
  ].map(normalizeKey),
);
const forbiddenValuePatterns = [
  /\bBearer\s+/u,
  /DATABASE_URL=/iu,
  /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\//iu,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/u,
  /\b(?:onion|token|wallet|user)[_-]?(?:private|secret|preimage)\b/iu,
];

const commonRefShapeByField = {
  deploymentRef: ["blinded-token-service:", "deploy:", "render-deploy:", "tor-onion-service:"],
  logRedactionReviewRef: ["log-redaction:", "review:"],
  retentionPolicyRef: ["retention-policy:", "review:"],
  reviewerAcceptanceRef: ["review:", "reviewer:"],
};

const torRefShapeByField = {
  onionHostFingerprintRef: ["sha256:", "tor-onion-fingerprint:"],
  onionServiceRef: ["deploy:", "render-deploy:", "tor-onion-service:"],
  reverseProxyRedactionRef: ["log-redaction:", "review:"],
};

const blindedTokenRefShapeByField = {
  issuerRef: ["blinded-token-issuer:", "privacy-pass-issuer:", "review:"],
  replayCacheRef: ["blinded-token-replay-cache:", "redis-ref:", "review:"],
  tokenFamilyRef: ["blinded-token-family:", "privacy-pass-token-family:", "sha256:"],
  verifierRef: ["blinded-token-verifier:", "privacy-pass-verifier:", "review:"],
};

function normalizeKey(key) {
  return String(key).replace(/[-_\s]/gu, "").toLowerCase();
}

function requirePlainObject(value, fieldName) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`Vanta relayer privacy transport requires ${fieldName} to be an object.`);
  }
  return value;
}

function requireSupportedMode(mode) {
  if (!supportedModeSet.has(mode)) {
    throw new Error(
      `Vanta relayer privacy transport mode must be one of ${VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODES.join(", ")}.`,
    );
  }
  return mode;
}

function requireRef(value, fieldName, allowedPrefixes) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta relayer privacy transport requires ${fieldName}.`);
  }
  const ref = value.trim();
  assertNoRawRelayerPrivacyTransportMaterial(ref, fieldName);
  if (!/^[a-z][a-z0-9-]*:[A-Za-z0-9._:/#-]+$/u.test(ref)) {
    throw new Error(`Vanta relayer privacy transport ${fieldName} must be a refs-only handle.`);
  }
  if (!allowedPrefixes.some((prefix) => ref.startsWith(prefix))) {
    throw new Error(
      `Vanta relayer privacy transport ${fieldName} must start with one of ${allowedPrefixes.join(", ")}.`,
    );
  }
  return ref;
}

function assertNoRawRelayerPrivacyTransportMaterial(value, path = "packet", options = {}) {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    for (const pattern of forbiddenValuePatterns) {
      if (pattern.test(value)) {
        throw new Error(`Vanta relayer privacy transport forbids raw sensitive value at ${path}.`);
      }
    }
    return;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoRawRelayerPrivacyTransportMaterial(entry, `${path}.${index}`, options),
    );
    return;
  }

  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = normalizeKey(key);
      const isEvidenceSectionKey =
        options.allowEvidenceSectionKeys && path === "packet" && key === "blindedToken";
      if (forbiddenKeySet.has(normalizedKey) && !isEvidenceSectionKey) {
        throw new Error(`Vanta relayer privacy transport forbids raw sensitive field ${path}.${key}.`);
      }
      if (options.forbidUserWalletIdentifiers && forbiddenUserWalletKeySet.has(normalizedKey)) {
        throw new Error(`Vanta relayer privacy transport forbids user/wallet field ${path}.${key}.`);
      }
      assertNoRawRelayerPrivacyTransportMaterial(nested, `${path}.${key}`, options);
    }
    return;
  }

  throw new Error(`Vanta relayer privacy transport does not support value at ${path}.`);
}

export function assertNoRelayerPrivacyTransportPersistentMetadata(value, path = "metadata") {
  assertNoRawRelayerPrivacyTransportMaterial(value, path);
}

function normalizeCommonEvidence(packet) {
  return Object.fromEntries(
    Object.entries(commonRefShapeByField).map(([fieldName, prefixes]) => [
      fieldName,
      requireRef(packet[fieldName], fieldName, prefixes),
    ]),
  );
}

function normalizeTorOnionEvidence(packet) {
  const torOnion = requirePlainObject(packet.torOnion, "torOnion");
  return Object.fromEntries(
    Object.entries(torRefShapeByField).map(([fieldName, prefixes]) => [
      fieldName,
      requireRef(torOnion[fieldName], `torOnion.${fieldName}`, prefixes),
    ]),
  );
}

function normalizeBlindedTokenEvidence(packet) {
  const blindedToken = requirePlainObject(packet.blindedToken, "blindedToken");
  return Object.fromEntries(
    Object.entries(blindedTokenRefShapeByField).map(([fieldName, prefixes]) => [
      fieldName,
      requireRef(blindedToken[fieldName], `blindedToken.${fieldName}`, prefixes),
    ]),
  );
}

export function normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence(packet) {
  requirePlainObject(packet, "evidence packet");
  assertNoRawRelayerPrivacyTransportMaterial(packet, "packet", {
    allowEvidenceSectionKeys: true,
    forbidUserWalletIdentifiers: true,
  });

  const version =
    packet.version ?? VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_VERSION;
  if (version !== VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_VERSION) {
    throw new Error(
      `Vanta relayer privacy transport evidence version must be ${VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_VERSION}.`,
    );
  }
  if (packet.secretPolicy !== "references-only-no-secret-values") {
    throw new Error("Vanta relayer privacy transport evidence must be references-only.");
  }
  if (packet.productionReady !== undefined && packet.productionReady !== false) {
    throw new Error("Vanta relayer privacy transport evidence productionReady must remain false.");
  }
  if (packet.privacyClaimAllowed !== undefined && packet.privacyClaimAllowed !== false) {
    throw new Error("Vanta relayer privacy transport evidence privacyClaimAllowed must remain false.");
  }

  const mode = requireSupportedMode(String(packet.mode ?? ""));
  const commonEvidence = normalizeCommonEvidence(packet);

  if (mode === "tor-onion") {
    if (packet.blindedToken !== undefined && packet.blindedToken !== null) {
      throw new Error("Vanta relayer privacy transport evidence must configure exactly one mode.");
    }
    return {
      ...commonEvidence,
      activeMode: mode,
      claimBoundary: VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_CLAIM_BOUNDARY,
      privacyClaimAllowed: false,
      privacyTransportReady: true,
      productionReady: false,
      secretPolicy: "references-only-no-secret-values",
      torOnion: normalizeTorOnionEvidence(packet),
      version,
    };
  }

  if (packet.torOnion !== undefined && packet.torOnion !== null) {
    throw new Error("Vanta relayer privacy transport evidence must configure exactly one mode.");
  }
  return {
    ...commonEvidence,
    activeMode: mode,
    blindedToken: normalizeBlindedTokenEvidence(packet),
    claimBoundary: VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_CLAIM_BOUNDARY,
    privacyClaimAllowed: false,
    privacyTransportReady: true,
    productionReady: false,
    secretPolicy: "references-only-no-secret-values",
    version,
  };
}

function readEvidencePacketFromEnv(env, mode) {
  const evidencePath = env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH;
  if (evidencePath) {
    return JSON.parse(readFileSync(resolve(process.cwd(), evidencePath), "utf8"));
  }

  const common = {
    deploymentRef: env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_DEPLOYMENT_REF,
    logRedactionReviewRef:
      env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_LOG_REDACTION_REVIEW_REF,
    retentionPolicyRef: env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_RETENTION_POLICY_REF,
    reviewerAcceptanceRef:
      env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_REVIEWER_ACCEPTANCE_REF,
  };

  if (mode === "tor-onion") {
    return {
      ...common,
      mode,
      privacyClaimAllowed: false,
      productionReady: false,
      secretPolicy: "references-only-no-secret-values",
      torOnion: {
        onionHostFingerprintRef:
          env.VANTA_PRIVATE_POOL_V2_RELAYER_TOR_ONION_HOST_FINGERPRINT_REF,
        onionServiceRef: env.VANTA_PRIVATE_POOL_V2_RELAYER_TOR_ONION_SERVICE_REF,
        reverseProxyRedactionRef:
          env.VANTA_PRIVATE_POOL_V2_RELAYER_TOR_REVERSE_PROXY_REDACTION_REF,
      },
      version: VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_VERSION,
    };
  }

  return {
    ...common,
    blindedToken: {
      issuerRef: env.VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_ISSUER_REF,
      replayCacheRef: env.VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_REPLAY_CACHE_REF,
      tokenFamilyRef: env.VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_FAMILY_REF,
      verifierRef: env.VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_VERIFIER_REF,
    },
    mode,
    privacyClaimAllowed: false,
    productionReady: false,
    secretPolicy: "references-only-no-secret-values",
    version: VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_VERSION,
  };
}

function activeModesFromEnv(env) {
  const modes = new Set();
  const configuredMode = String(
    env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODE ?? "",
  ).trim();
  if (configuredMode) {
    requireSupportedMode(configuredMode);
    modes.add(configuredMode);
  }
  if (env.VANTA_PRIVATE_POOL_V2_RELAYER_TOR_ONION_ENABLED === "true") {
    modes.add("tor-onion");
  }
  if (env.VANTA_PRIVATE_POOL_V2_RELAYER_BLINDED_TOKEN_ENABLED === "true") {
    modes.add("blinded-token");
  }
  return [...modes];
}

export function assertProductionRelayerPrivacyTransportConfig(env = process.env) {
  if (env.NODE_ENV !== "production") {
    return buildVantaPrivatePoolV2RelayerPrivacyTransportStatus(env);
  }
  if (env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED !== "true") {
    throw new Error(
      "Private Pool v2 production relayer requires VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED=true.",
    );
  }

  const activeModes = activeModesFromEnv(env);
  if (activeModes.length !== 1) {
    throw new Error(
      "Private Pool v2 production relayer requires exactly one privacy transport mode: tor-onion or blinded-token.",
    );
  }

  return normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence(
    readEvidencePacketFromEnv(env, activeModes[0]),
  );
}

export function buildVantaPrivatePoolV2RelayerPrivacyTransportStatus(env = process.env) {
  let activeModes = [];
  let acceptedEvidence = null;
  const blockers = [];

  try {
    activeModes = activeModesFromEnv(env);
    if (env.NODE_ENV === "production" && env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED === "true") {
      if (activeModes.length === 1) {
        acceptedEvidence = normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence(
          readEvidencePacketFromEnv(env, activeModes[0]),
        );
      } else {
        blockers.push("exactly-one-privacy-transport-mode-required");
      }
    }
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : String(error));
  }

  return {
    activeMode: acceptedEvidence?.activeMode ?? null,
    activeModes,
    blockerIds:
      blockers.length > 0
        ? blockers
        : env.NODE_ENV === "production"
          ? []
          : ["external-tor-or-blinded-token-deployment-and-review-required"],
    claimBoundary: VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_CLAIM_BOUNDARY,
    enabled:
      env.NODE_ENV === "production"
        ? env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED === "true"
        : env.VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_ENABLED === "true",
    evidenceRefs: acceptedEvidence
      ? {
          deploymentRef: acceptedEvidence.deploymentRef,
          logRedactionReviewRef: acceptedEvidence.logRedactionReviewRef,
          retentionPolicyRef: acceptedEvidence.retentionPolicyRef,
          reviewerAcceptanceRef: acceptedEvidence.reviewerAcceptanceRef,
        }
      : null,
    forbiddenPersistenceFields: VANTA_PRIVATE_POOL_V2_RELAYER_FORBIDDEN_PERSISTENCE_FIELDS,
    implemented: true,
    privacyClaimAllowed: false,
    privacyTransportReady: Boolean(acceptedEvidence),
    productionReady: false,
    status: acceptedEvidence
      ? "refs-only-privacy-transport-contract-covered-production-readiness-false"
      : "local-privacy-transport-contract-covered-external-evidence-required",
    supportedModes: VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_MODES,
    version: VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_VERSION,
  };
}
