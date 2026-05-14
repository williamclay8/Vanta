import { strict as assert } from "node:assert";

const defaultDiscoveryUrl = "https://vantaprivacy.xyz/.well-known/vanta-audit.json";
const discoveryUrl = process.env.VANTA_PUBLIC_AUDIT_DISCOVERY_URL ?? defaultDiscoveryUrl;

function numberField(value, fieldName) {
  const numeric = Number(value);
  assert.ok(Number.isFinite(numeric), `Live audit discovery ${fieldName} must be numeric.`);
  return numeric;
}

function booleanField(value, fieldName) {
  assert.equal(typeof value, "boolean", `Live audit discovery ${fieldName} must be boolean.`);
  return value;
}

const response = await fetch(discoveryUrl, {
  headers: {
    Accept: "application/json",
  },
  signal: AbortSignal.timeout(15_000),
});

assert.equal(
  response.ok,
  true,
  `Live audit discovery fetch must succeed for ${discoveryUrl}; got ${response.status}.`,
);

const discovery = await response.json();
assert.equal(discovery.path, "/.well-known/vanta-audit.json");
assert.equal(discovery.refsOnly, true);

const depthBlocker = discovery.currentBlockers?.find(
  (entry) => entry?.id === "public-anonymity-depth",
);
assert.ok(depthBlocker, "Live audit discovery must expose public-anonymity-depth blocker.");

const currentDistinctCommitments = numberField(
  depthBlocker.currentDistinctCommitments,
  "currentBlockers.public-anonymity-depth.currentDistinctCommitments",
);
const minimumDistinctCommitments = numberField(
  depthBlocker.minimumDistinctCommitments,
  "currentBlockers.public-anonymity-depth.minimumDistinctCommitments",
);
assert.ok(minimumDistinctCommitments > 0, "Live anonymity threshold must be positive.");
assert.equal(depthBlocker.evidenceRef, "ops/mainnet/private-pool-v2-anonymity-set.evidence.json");

const depthBelowThreshold = currentDistinctCommitments < minimumDistinctCommitments;
if (depthBelowThreshold) {
  assert.equal(depthBlocker.status, "blocked");
  assert.match(
    String(depthBlocker.claim ?? ""),
    /does not claim live anonymity|production-private mainnet settlement/iu,
    "Below-threshold live depth must carry a no-anonymity/no-production-private claim.",
  );
  assert.equal(booleanField(discovery.anonymityClaimAllowed, "anonymityClaimAllowed"), false);
  assert.equal(booleanField(discovery.privacyClaimAllowed, "privacyClaimAllowed"), false);
  assert.equal(booleanField(discovery.productionReady, "productionReady"), false);
  assert.equal(booleanField(discovery.mainnetReady, "mainnetReady"), false);
}

if (booleanField(discovery.anonymityClaimAllowed, "anonymityClaimAllowed")) {
  assert.ok(
    currentDistinctCommitments >= minimumDistinctCommitments,
    "Live anonymity claims must fail closed while commitments are below threshold.",
  );
  assert.equal(booleanField(discovery.thirdPartyAuditAccepted, "thirdPartyAuditAccepted"), true);
  assert.equal(booleanField(discovery.liveDeploymentVerified, "liveDeploymentVerified"), true);
}

console.log("Vanta live anonymity-set probe: PASS");
console.log(
  JSON.stringify(
    {
      currentDistinctCommitments,
      depthBelowThreshold,
      discoveryUrl,
      minimumDistinctCommitments,
    },
    null,
    2,
  ),
);
