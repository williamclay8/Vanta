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
assert.equal(readiness.strictReady, false);
assert.equal(readiness.fullyPrivateShieldClaimAllowed, false);
assert.equal(readiness.livePrivateShieldClaimAllowed, false);
assert.equal(readiness.liveProductionClaimAllowed, false);
assert.equal(readiness.mainnetReady, false);
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
assert.equal(
  packageJson.scripts["shield:privacy-readiness-check"],
  "node scripts/check-vanta-shield-privacy-readiness.mjs",
  "package.json must expose shield:privacy-readiness-check.",
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
