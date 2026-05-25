import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function requirePhrase(source, phrase, label) {
  assert.ok(source.includes(phrase), `${label} missing ${phrase}`);
}

const packageJson = JSON.parse(read("package.json"));
const shieldState = read("src/solana/vantaShieldState.ts");
const actionMemoCheck = read("scripts/check-vanta-action-memo-encryption.mjs");
const sendMigrationCheck = read("scripts/check-vanta-send-discovery-migration-policy.mjs");
const sendTrustContract = read("src/solana/sendTrustContract.ts");
const sendStatus = read("src/readiness/sendMainnetProductionStatus.mjs");
const serviceNetwork = read("operator/private-pool-v2-service-network.mjs");
const privatePoolServer = read("operator/private-pool-v2-server.mjs");
const threatModel = read("docs/threat-model.md");
const auditTrackerState = read("docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml");

const legacyPrefixes = [
  "vanta:shield-note:v1:",
  "vanta:send-note:v1:",
  "vanta:unshield-note:v1:",
  "vanta:swap-note:v1:",
  "vanta:sol-unshield-note:v1:",
  "vanta:native-sol-shield-note:v1:",
  "vanta:spent-marker:v1:",
];

for (const phrase of [
  "VANTA_LEGACY_V1_MEMO_QUARANTINE_POLICY_VERSION",
  "vanta-legacy-v1-memo-quarantine-0.1",
  "getVantaLegacyV1MemoQuarantinePolicy",
  "createLegacyV1SendMemoMigrationPacket",
  "legacy-v1-plaintext-memos-quarantined-parse-compatible-history",
  "freshV2EncryptedRequiredForNewMemos: true",
  "freshV2ViewingKeyAeadRequiredForNewActionMemos: true",
  "legacyV1ParseCompatible: true",
  "migrated: false",
  "productionPrivacyClaimsEligible: false",
  "privacyClaimsExcluded: true",
  "reviewedMigrationOrSegregationEvidence: false",
  "local-legacy-v1-send-memo-migration-tooling-not-production-recipient-discovery",
  "legacy v1 plaintext memo chain history is parse-compatible history only",
]) {
  requirePhrase(shieldState, phrase, "src/solana/vantaShieldState.ts");
}

for (const prefix of legacyPrefixes) {
  requirePhrase(shieldState, prefix, "src/solana/vantaShieldState.ts");
}

for (const phrase of [
  "extractMemoPayload(memo, VANTA_SHIELD_MEMO_PREFIX)",
  "extractMemoPayload(memo, VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX)",
  "extractMemoPayload(memo, VANTA_SEND_MEMO_PREFIX)",
  "extractMemoPayload(memo, VANTA_UNSHIELD_MEMO_PREFIX)",
  "extractMemoPayload(memo, VANTA_SWAP_MEMO_PREFIX)",
  "extractMemoPayload(memo, VANTA_SOL_UNSHIELD_MEMO_PREFIX)",
  "extractMemoPayload(memo, VANTA_SPENT_MARKER_MEMO_PREFIX)",
]) {
  requirePhrase(shieldState, phrase, "src/solana/vantaShieldState.ts");
}

for (const phrase of [
  "createEncryptedMemoInstruction(\n    VANTA_SHIELD_MEMO_PREFIX_V2",
  "createEncryptedMemoInstruction(\n    VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX_V2",
  "createActionMemoInstruction(VANTA_SEND_MEMO_PREFIX_V2",
  "createActionMemoInstruction(VANTA_UNSHIELD_MEMO_PREFIX_V2",
  "createActionMemoInstruction(VANTA_SWAP_MEMO_PREFIX_V2",
  "createActionMemoInstruction(VANTA_SOL_UNSHIELD_MEMO_PREFIX_V2",
  "createActionMemoInstruction(VANTA_SPENT_MARKER_MEMO_PREFIX_V2",
]) {
  requirePhrase(shieldState, phrase, "src/solana/vantaShieldState.ts");
}

for (const phrase of [
  "getVantaLegacyV1MemoQuarantinePolicy",
  "legacy-v1-plaintext-memos-quarantined-parse-compatible-history",
  "productionPrivacyClaimsEligible === false",
  "privacyClaimsExcluded === true",
]) {
  requirePhrase(actionMemoCheck, phrase, "scripts/check-vanta-action-memo-encryption.mjs");
}

for (const phrase of [
  "legacyHistoryScope?.legacyV1EligibleForProductionPrivacyClaims",
  "legacyHistoryScope?.reviewedMigrationOrSegregationEvidence",
  "legacy v1 plaintext history outside production privacy scope",
]) {
  requirePhrase(
    sendMigrationCheck,
    phrase,
    "scripts/check-vanta-send-discovery-migration-policy.mjs",
  );
}

for (const phrase of [
  "Send is in guarded beta",
  "direct key exchange",
  "Full private recipient discovery is not yet live",
]) {
  requirePhrase(sendTrustContract, phrase, "src/solana/sendTrustContract.ts");
}

for (const [source, label] of [
  [sendStatus, "src/readiness/sendMainnetProductionStatus.mjs"],
  [serviceNetwork, "operator/private-pool-v2-service-network.mjs"],
  [privatePoolServer, "operator/private-pool-v2-server.mjs"],
]) {
  requirePhrase(source, "legacyV1EligibleForProductionPrivacyClaims", label);
  requirePhrase(source, "legacyV1ParseCompatible", label);
  requirePhrase(source, "production Send privacy claims are scoped to fresh v2 AEAD sends", label);
}

for (const phrase of [
  "legacy v1 plaintext memo history is migrated, quarantined, or excluded from claims",
  "Legacy v1 plaintext memo history is quarantined as parse-compatible history only",
]) {
  requirePhrase(threatModel, phrase, "docs/threat-model.md");
}

for (const phrase of [
  "R12-LEGACY-V1-MEMO-QUARANTINE",
  "status: local-implemented",
  "npm run actions:legacy-v1-memo-quarantine-check",
]) {
  requirePhrase(auditTrackerState, phrase, "state.yaml");
}

assert.equal(
  packageJson.scripts["actions:legacy-v1-memo-quarantine-check"],
  "node scripts/check-vanta-legacy-v1-memo-quarantine.mjs",
  "package.json must expose actions:legacy-v1-memo-quarantine-check.",
);
assert.ok(
  packageJson.scripts["actions:memo-encryption-check"]?.includes(
    "npm run actions:legacy-v1-memo-quarantine-check",
  ),
  "actions:memo-encryption-check must include the legacy v1 memo quarantine guard.",
);
assert.ok(
  packageJson.scripts["actions:memo-encryption-check"]?.includes(
    "npm run actions:legacy-v1-send-memo-migration-check",
  ),
  "actions:memo-encryption-check must include the legacy v1 Send memo migration guard.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes(
    "npm run actions:legacy-v1-memo-quarantine-check",
  ),
  "truth:privacy-claim-gate must include the legacy v1 memo quarantine guard.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes(
    "npm run actions:legacy-v1-send-memo-migration-check",
  ),
  "truth:privacy-claim-gate must include the legacy v1 Send memo migration guard.",
);
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"]?.includes(
    "npm run actions:legacy-v1-memo-quarantine-check",
  ),
  "zk:feedback-loop-check must include the legacy v1 memo quarantine guard.",
);
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"]?.includes(
    "npm run actions:legacy-v1-send-memo-migration-check",
  ),
  "zk:feedback-loop-check must include the legacy v1 Send memo migration guard.",
);

console.log("Vanta legacy v1 memo quarantine check: PASS");
