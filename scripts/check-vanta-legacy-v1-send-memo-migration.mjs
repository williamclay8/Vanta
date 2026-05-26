import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaSendMainnetProductionStatus } from "../src/readiness/sendMainnetProductionStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function requirePhrase(source, phrase, label) {
  assert.ok(source.includes(phrase), `${label} missing ${phrase}`);
}

const packageJson = JSON.parse(read("package.json"));
const shieldState = read("src/solana/vantaShieldState.ts");
const sendMigrationPolicyCheck = read("scripts/check-vanta-send-discovery-migration-policy.mjs");
const quarantineCheck = read("scripts/check-vanta-legacy-v1-memo-quarantine.mjs");
const trustPacketSource = read("scripts/print-vanta-protocol-trust-packet.mjs");
const auditTrackerState = read("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");
const ppaDiscovery002State =
  auditTrackerState.match(/- id: PPA-DISCOVERY-002[\s\S]*?(?=\n        - id:|\n\naudit_completion_checklist:)/u)?.[0] ?? "";
const planNote = read(
  "docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-discovery-002-legacy-v1-send-memo-migration-plan.md",
);

for (const phrase of [
  "VANTA_LEGACY_V1_SEND_MEMO_MIGRATION_VERSION",
  "vanta-legacy-v1-send-memo-migration-0.1",
  "createLegacyV1SendMemoMigrationPacket",
  "parseLegacyV1SendMemoPayloadForMigration",
  "sanitizeLegacyV1SendMemoMigrationLeg",
  "local-v2-discovery-packet-created",
  "local-legacy-v1-send-memo-migration-tooling-not-production-recipient-discovery",
  "reviewedMigrationOrSegregationEvidence: false",
  "legacyV1EligibleForProductionPrivacyClaims: false",
  "missing-recipient-viewing-public-key",
  "missing-change-viewing-public-key",
  "fresh-v2-send-memo-not-remigrated",
  "malformed-legacy-v1-send-memo-segregation-required",
  "not-legacy-v1-send-memo",
  "VANTA_SEND_MEMO_PREFIX_V2",
  "createPreparedSendDualAeadMemo(payload",
  "recipientMemoCiphertextBodyHash",
  "changeMemoCiphertextBodyHash",
  "encryptedViewTag",
]) {
  requirePhrase(shieldState, phrase, "src/solana/vantaShieldState.ts");
}

for (const phrase of [
  "legacyV1SendHistoryLocalMigrationToolingCovered = true",
  "reviewedLegacyV1SendMigrationOrSegregationEvidence = false",
  "legacy-v1-send-history-reviewed-migration-or-segregation-evidence-missing",
  "local-migration-tooling-only-reviewed-evidence-missing",
  "localMigrationToolingCovered",
  "segregatedWithReviewedEvidence: false",
]) {
  requirePhrase(
    read("src/readiness/sendMainnetProductionStatus.mjs"),
    phrase,
    "src/readiness/sendMainnetProductionStatus.mjs",
  );
}

for (const phrase of [
  "reviewed legacy v1 migration/segregation evidence blocker",
  "local legacy-v1 migration tooling",
  "legacy-v1-send-history-reviewed-migration-or-segregation-evidence-missing",
  "reviewedMigrationOrSegregationEvidence: false",
]) {
  requirePhrase(trustPacketSource, phrase, "scripts/print-vanta-protocol-trust-packet.mjs");
}

for (const phrase of [
  "reviewedMigrationOrSegregationEvidence",
  "legacy-v1-send-history-reviewed-migration-or-segregation-evidence-missing",
]) {
  requirePhrase(
    sendMigrationPolicyCheck,
    phrase,
    "scripts/check-vanta-send-discovery-migration-policy.mjs",
  );
}

for (const phrase of [
  "actions:legacy-v1-send-memo-migration-check",
  "createLegacyV1SendMemoMigrationPacket",
]) {
  requirePhrase(quarantineCheck, phrase, "scripts/check-vanta-legacy-v1-memo-quarantine.mjs");
}

for (const phrase of [
  "PPA-DISCOVERY-002",
  "status: implemented-verified-local",
  "npm run actions:legacy-v1-send-memo-migration-check",
  "reviewed legacy v1 migration or segregation evidence",
]) {
  requirePhrase(ppaDiscovery002State, phrase, "state.yaml PPA-DISCOVERY-002 section");
}

for (const phrase of [
  "Red-first: `npm run actions:legacy-v1-send-memo-migration-check` fails",
  "local migration/segregation tooling",
  "does not rewrite historical on-chain memos",
]) {
  requirePhrase(planNote, phrase, "PPA-DISCOVERY-002 plan note");
}

assert.equal(
  packageJson.scripts["actions:legacy-v1-send-memo-migration-check"],
  "node scripts/check-vanta-legacy-v1-send-memo-migration.mjs",
  "package.json must expose actions:legacy-v1-send-memo-migration-check.",
);

for (const [scriptName, scriptValue] of [
  ["actions:memo-encryption-check", packageJson.scripts["actions:memo-encryption-check"]],
  ["truth:privacy-claim-gate", packageJson.scripts["truth:privacy-claim-gate"]],
  ["zk:feedback-loop-check", packageJson.scripts["zk:feedback-loop-check"]],
]) {
  assert.ok(
    scriptValue?.includes("npm run actions:legacy-v1-send-memo-migration-check"),
    `${scriptName} must include the legacy v1 Send memo migration guard.`,
  );
}

const status = createVantaSendMainnetProductionStatus();
assert.equal(status.status, "blocked", "Send must remain blocked.");
assert.equal(status.privacyClaimAllowed, false, "Send privacy claims must remain locked.");
assert.equal(
  status.sendDiscoveryHandoff?.legacyHistoryScope?.localMigrationToolingCovered,
  true,
  "Send status must expose local legacy-v1 migration tooling coverage.",
);
assert.equal(
  status.sendDiscoveryHandoff?.legacyHistoryScope?.reviewedMigrationOrSegregationEvidence,
  false,
  "Send status must not claim reviewed legacy-v1 migration/segregation evidence.",
);
assert.equal(
  status.sendDiscoveryHandoff?.legacyHistoryScope?.legacyV1EligibleForProductionPrivacyClaims,
  false,
  "Legacy v1 Send history must remain outside production privacy claims.",
);
assert.ok(
  status.blockers.includes(
    "legacy-v1-send-history-reviewed-migration-or-segregation-evidence-missing",
  ),
  "Send status must keep the reviewed legacy-v1 migration/segregation evidence blocker.",
);

const trustPacket = JSON.parse(
  execFileSync("node", ["scripts/print-vanta-protocol-trust-packet.mjs", "--action=send", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

assert.equal(
  trustPacket.legacyHistoryScope?.localMigrationToolingCovered,
  true,
  "Send trust packet must expose local legacy-v1 migration tooling coverage.",
);
assert.equal(
  trustPacket.legacyHistoryScope?.reviewedMigrationOrSegregationEvidence,
  false,
  "Send trust packet must not claim reviewed legacy-v1 migration/segregation evidence.",
);
assert.ok(
  trustPacket.remainingBlockers.includes(
    "legacy-v1-send-history-reviewed-migration-or-segregation-evidence-missing",
  ),
  "Send trust packet must keep the reviewed legacy-v1 migration/segregation evidence blocker.",
);

console.log("Vanta legacy v1 Send memo migration check: PASS");
