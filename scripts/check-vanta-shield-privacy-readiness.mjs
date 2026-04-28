import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createVantaShieldPrivacyReadiness } from "../src/readiness/shieldPrivacyReadiness.mjs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const readiness = createVantaShieldPrivacyReadiness({
  committedSettlementReady: true,
  decoyBatchingReady: true,
  durableProductionServicesReady: false,
  independentAuditReady: false,
  liveMainnetSettlementReady: false,
  nativeSolShieldReady: true,
  productionAnonymitySetReady: false,
  productionKeyCustodyReady: false,
  relayerSeparationReady: false,
  routeEvidenceReady: true,
  universalTargetReady: true,
  viewingKeyCustodyReady: true,
  viewingKeyMemoReady: true,
});

assert.equal(readiness.version, "vanta-shield-privacy-readiness-0.1");
assert.equal(readiness.kind, "vanta-shield-privacy-readiness");
assert.equal(readiness.failClosed, true);
assert.equal(readiness.gateCommand, "npm run shield:privacy-readiness-check");
assert.equal(readiness.localCommittedSettlementReady, true);
assert.equal(readiness.localViewingKeyMemoReady, true);
assert.equal(readiness.localViewingKeyCustodyReady, true);
assert.equal(readiness.localDecoyBatchingReady, true);
assert.equal(readiness.localNativeSolShieldReady, true);
assert.equal(readiness.localUniversalTargetReady, true);
assert.equal(readiness.localRouteEvidenceReady, true);
assert.equal(readiness.localCapabilities.committedSettlementReady, true);
assert.equal(readiness.localCapabilities.viewingKeyMemoReady, true);
assert.equal(readiness.localCapabilities.viewingKeyCustodyReady, true);
assert.equal(readiness.localCapabilities.decoyBatchingReady, true);
assert.equal(readiness.localCapabilities.nativeSolShieldReady, true);
assert.equal(readiness.localCapabilities.universalTargetReady, true);
assert.equal(readiness.localCapabilities.routeEvidenceReady, true);
assert.equal(readiness.claimAllowed, false);
assert.equal(readiness.privacyClaimAllowed, false);
assert.equal(readiness.strictReady, false);
assert.equal(readiness.fullyPrivateShieldClaimAllowed, false);
assert.equal(readiness.livePrivateShieldClaimAllowed, false);
assert.equal(readiness.liveProductionClaimAllowed, false);
assert.equal(readiness.mainnetReady, false);
assert.deepEqual(
  readiness.productionGateBlockers.map((blocker) => blocker.id),
  ["production-anonymity-set", "durable-production-services", "relayer-separation"],
);
assert.deepEqual(
  readiness.externalGateBlockers.map((blocker) => blocker.id),
  ["independent-audit", "live-mainnet-settlement", "production-key-custody"],
);
assert.ok(
  readiness.requiredEvidenceRefs.includes("VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF"),
  "Shield readiness must name anonymity-set evidence.",
);
assert.ok(
  readiness.requiredEvidenceRefs.includes("ops/mainnet/private-pool-v2-anonymity-set.evidence.json"),
  "Shield readiness must name anonymity-set evidence packet.",
);
assert.ok(
  readiness.requiredEvidenceRefs.includes("npm run private-pool-v2:anonymity-set-evidence-check"),
  "Shield readiness must name anonymity-set evidence check.",
);
assert.ok(
  readiness.requiredEvidenceRefs.includes("ops/mainnet/private-pool-v2-relayer-separation.evidence.json"),
  "Shield readiness must name relayer-separation evidence packet.",
);
assert.ok(
  readiness.requiredEvidenceRefs.includes("npm run private-pool-v2:relayer-separation-evidence-check"),
  "Shield readiness must name relayer-separation evidence check.",
);
assert.ok(
  readiness.requiredEvidenceRefs.includes("VANTA_PRIVATE_POOL_V2_AUDIT_REF"),
  "Shield readiness must name audit evidence.",
);
assert.ok(
  readiness.requiredEvidenceRefs.includes("VANTA_SHIELD_PRODUCTION_KEY_CUSTODY_REF"),
  "Shield readiness must name production key-custody evidence.",
);
assert.ok(
  readiness.currentEvidenceRefs.includes("npm run shield:privacy-readiness-check"),
  "Shield readiness must name its check command as current evidence.",
);
assert.ok(readiness.currentTruth.includes("viewing-key encrypted memos"));
assert.ok(readiness.currentTruth.includes("production privacy claims remain blocked"));
assert.ok(readiness.blockers.includes("production-anonymity-set"));
assert.ok(readiness.blockers.includes("durable-production-services"));
assert.ok(readiness.blockers.includes("relayer-separation"));
assert.ok(readiness.blockers.includes("independent-audit"));
assert.ok(readiness.blockers.includes("live-mainnet-settlement"));
assert.ok(readiness.blockers.includes("production-key-custody"));
assert.ok(!readiness.blockers.includes("viewing-key-memo"));
assert.ok(!readiness.blockers.includes("committed-settlement"));
const allInputsReady = createVantaShieldPrivacyReadiness({
  committedSettlementReady: true,
  decoyBatchingReady: true,
  durableProductionServicesReady: true,
  independentAuditReady: true,
  liveMainnetSettlementReady: true,
  nativeSolShieldReady: true,
  productionAnonymitySetReady: true,
  productionKeyCustodyReady: true,
  relayerSeparationReady: true,
  routeEvidenceReady: true,
  universalTargetReady: true,
  viewingKeyCustodyReady: true,
  viewingKeyMemoReady: true,
});
assert.equal(allInputsReady.strictReady, false, "Shield readiness must stay fail-closed.");
assert.equal(allInputsReady.claimAllowed, false, "Shield privacy claims must stay blocked.");
assert.equal(
  packageJson.scripts["shield:privacy-readiness-check"],
  "node scripts/check-vanta-shield-privacy-readiness.mjs",
  "package.json must expose shield:privacy-readiness-check.",
);
assert.equal(
  packageJson.scripts["shield:privacy-readiness"],
  "node scripts/print-vanta-shield-privacy-readiness.mjs",
  "package.json must expose shield:privacy-readiness.",
);
assert.equal(
  packageJson.scripts["shield:privacy-readiness-json"],
  "node scripts/print-vanta-shield-privacy-readiness.mjs --json",
  "package.json must expose shield:privacy-readiness-json.",
);
assert.ok(
  packageJson.scripts["shield:verify"].includes("npm run shield:privacy-readiness-check"),
  "shield:verify must include shield:privacy-readiness-check.",
);
assert.ok(
  packageJson.scripts["shield:verify"].includes("npm run shield:memo-encryption-check") &&
    packageJson.scripts["shield:verify"].includes("npm run shield:viewing-key-custody-check") &&
    packageJson.scripts["shield:verify"].includes("npm run shield:decoy-batcher-check"),
  "shield:verify must include memo, custody, and decoy privacy checks.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run shield:privacy-readiness-check"),
  "mainnet:preflight must include shield:privacy-readiness-check.",
);

console.log("Vanta Shield privacy readiness check: PASS");
