import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const trackerRoot = resolve(repoRoot, "docs/goals/2026-05-14-claude-privacy-audit-tracker");
const goalPath = resolve(trackerRoot, "goal.md");
const statePath = resolve(trackerRoot, "state.yaml");
const notePath = resolve(trackerRoot, "notes/2026-05-14-intake.md");
const n2BlockerNotePath = resolve(trackerRoot, "notes/2026-05-14-n2-design-blockers.md");
const n2ImplementationPathNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-n2-implementation-path.md",
);
const architectureBlockerNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-architecture-blocker-map.md",
);
const n5CiGateNotePath = resolve(trackerRoot, "notes/2026-05-14-n5-ci-gate.md");
const packagePath = resolve(repoRoot, "package.json");
const privacyAuditWorkflowPath = resolve(repoRoot, ".github/workflows/privacy-audit.yml");

function read(path) {
  return readFileSync(path, "utf8");
}

for (const path of [
  goalPath,
  statePath,
  notePath,
  n2BlockerNotePath,
  n2ImplementationPathNotePath,
  architectureBlockerNotePath,
  n5CiGateNotePath,
  privacyAuditWorkflowPath,
]) {
  assert.ok(existsSync(path), `Missing Claude privacy audit tracker artifact: ${path}`);
}

const goal = read(goalPath);
const state = read(statePath);
const note = read(notePath);
const n2BlockerNote = read(n2BlockerNotePath);
const n2ImplementationPathNote = read(n2ImplementationPathNotePath);
const architectureBlockerNote = read(architectureBlockerNotePath);
const n5CiGateNote = read(n5CiGateNotePath);
const privacyAuditWorkflow = read(privacyAuditWorkflowPath);
const packageJson = JSON.parse(read(packagePath));

for (const phrase of [
  "Claude Privacy Audit Tracker (2026-05-14)",
  "Vanta privacy audit - 2026-05-14",
  "local, committed, pushed, deployed/live",
  "production privacy",
]) {
  assert.ok(goal.includes(phrase), `goal.md missing ${phrase}`);
}

for (const label of ["N1", "N2", "N3", "N4", "N5"]) {
  assert.ok(state.includes(`id: ${label}`), `state.yaml missing ${label}`);
  assert.ok(note.includes(`| ${label} |`), `intake note missing table row for ${label}`);
}

const n2SectionMatch = state.match(/  - id: N2\n[\s\S]*?\n  - id: N3\n/);
assert.ok(n2SectionMatch, "state.yaml missing bounded N2 section");
const n2Section = n2SectionMatch[0];
assert.ok(
  n2Section.includes("status: partial-local-implemented"),
  "N2 must remain partial until the remaining design blockers are implemented or superseded.",
);

for (const phrase of [
  "output_commitment is unconstrained",
  "Owner secret/input commitment binding",
  "local-implemented",
  "blocked-approval-gated",
  "local-implemented-pending-ci-run",
  "index-BhWFlXXv.js",
  "current_distinct_commitments: 2",
  "minimum_distinct_commitments: 1024",
  "privacy_claim_allowed: false",
  "anonymity_claim_allowed: false",
  "completion_guard",
  "status_must_remain: \"partial-local-implemented\"",
  "N2 is not complete while Private Pool v2 Swap-to-shielded lacks a documented canonical input commitment preimage",
  "N2 is not complete while Private Core Send/Swap use x25519-secret-prechecked-off-circuit owner authorization",
  "a nonzero sender_secret_key assertion is not sender authorization",
  "Do not mark N2 complete based only on owner_secret -> owner_commitment binding in Swap-to-shielded.",
  "Do not mark N2 complete based only on keeping Private Core sender_secret_key live/nonzero.",
  "remaining_design_blockers",
  "N2-PPV2-SWAP-INPUT-PREIMAGE",
  "input_commitment = poseidon5(owner_commitment, input_asset_id_commitment, input_amount, input_blinding, input_derivation_tag)",
  "N2-PRIVATE-CORE-SENDER-AUTH",
  "provingOwnerKeyMode = poseidon-proof-owner-key-v0",
  "prefer distinct proving-owner fields",
  "approval_question",
  "blocked-architecture-decision",
  "x25519-secret-prechecked-off-circuit",
  "architecture_blocker_map",
  "A1-TAG3-PROOF-VERIFIER-NOT-WIRED",
  "ERR_PROOF_VERIFIER_NOT_WIRED / custom error 14",
  "A1-TAG6-UNSHIELD-RELEASE-NOT-WIRED",
  "ERR_UNSHIELD_RELEASE_NOT_WIRED / custom error 15",
  "A2-OPERATOR-KEYPAIR-CUSTODY",
  "loadKeypairFromEnv(vaultSignerSecretKeyEnvName)",
  "A2-SELF-WALLET-EXIT-ONLY",
  "destinationOwner !== requester",
  "A3-ROOTS-NOT-PROGRAM-OWNED-SHARED-TREE",
  "not proof that the root transition is correct",
  ".github/workflows/privacy-audit.yml",
  "Vanta Privacy Audit Gates / Privacy audit gates",
  "Hosted GitHub Actions run must execute and pass before N5 is CI-verified.",
]) {
  assert.ok(state.includes(phrase), `state.yaml missing ${phrase}`);
}

for (const phrase of [
  "N2-PPV2-SWAP-INPUT-PREIMAGE",
  "N2-PRIVATE-CORE-SENDER-AUTH",
  "blocked-architecture-decision",
  "not a safe one-line Noir assertion",
  "invalid-input-commitment-preimage",
  "invalid-owner-auth fixtures",
  "x25519-secret-prechecked-off-circuit",
  "Do not mark N2 `local-implemented`",
]) {
  assert.ok(n2BlockerNote.includes(phrase), `N2 blocker note missing ${phrase}`);
}

for (const phrase of [
  "proposed-requires-architecture-approval",
  "input_commitment = poseidon5([",
  "input_asset_id_commitment",
  "invalid-input-commitment-preimage",
  "Swap-to-shielded consume the same owner/asset/amount/blinding/derivation note preimage convention",
  "extend the existing Private Core Unshield hybrid proof-owner model",
  "provingOwnerKeyMode = poseidon-proof-owner-key-v0",
  "Prefer distinct proving-owner fields",
  "sender_proving_owner_key_hi = 0",
  "sender_proving_owner_key_lo = poseidon2([sender_secret_key_hi, sender_secret_key_lo])",
  "invalid-owner-auth",
  "Do not implement either path until the relevant approval question is answered",
]) {
  assert.ok(
    n2ImplementationPathNote.includes(phrase),
    `N2 implementation path note missing ${phrase}`,
  );
}

for (const phrase of [
  "A1-TAG3-PROOF-VERIFIER-NOT-WIRED",
  "TAG_SPEND_WITH_PROOF = 3",
  "ERR_PROOF_VERIFIER_NOT_WIRED",
  "custom error `14`",
  "A1-TAG6-UNSHIELD-RELEASE-NOT-WIRED",
  "TAG_UNSHIELD = 6",
  "ERR_UNSHIELD_RELEASE_NOT_WIRED",
  "custom error `15`",
  "A2-OPERATOR-KEYPAIR-CUSTODY",
  "loadKeypairFromEnv(vaultSignerSecretKeyEnvName)",
  "operator-keypair-public-exit",
  "A2-SELF-WALLET-EXIT-ONLY",
  "destinationOwner !== requester",
  "A3-ROOTS-NOT-PROGRAM-OWNED-SHARED-TREE",
  "not proof that the root transition is correct",
  "npm run zk:c01-onchain-proof-boundary-check",
  "npm run private-pool-v2:onchain-unshield-custody-check",
  "npm run unshield:public-exit-surface-check",
  "npm run private-pool-v2:root-provenance-check",
]) {
  assert.ok(
    architectureBlockerNote.includes(phrase),
    `architecture blocker note missing ${phrase}`,
  );
}

for (const phrase of [
  "local-implemented-pending-ci-run",
  ".github/workflows/privacy-audit.yml",
  "npm run privacy-audit:tracker-check",
  "npm run frontend:operator-env-exposure-check",
  "GitHub Actions runs this workflow",
]) {
  assert.ok(n5CiGateNote.includes(phrase), `N5 CI gate note missing ${phrase}`);
}

for (const phrase of [
  "name: Vanta Privacy Audit Gates",
  "pull_request:",
  "branches:",
  "- main",
  "- \"codex/**\"",
  "uses: actions/checkout@v4",
  "uses: actions/setup-node@v4",
  "node-version-file: .node-version",
  "run: npm ci",
  "run: npm run privacy-audit:tracker-check",
  "run: npm run frontend:operator-env-exposure-check",
]) {
  assert.ok(privacyAuditWorkflow.includes(phrase), `privacy audit workflow missing ${phrase}`);
}

for (const phrase of [
  "62 JS chunks",
  "currentDistinctCommitments: 2",
  "minimumDistinctCommitments: 1024",
  "VITE_OPERATOR_*",
  "operator vault custody",
  "self-wallet exit",
  "browser-local recovery",
]) {
  assert.ok(note.includes(phrase), `intake note missing ${phrase}`);
}

for (const phrase of [
  "npm run private-pool-v2:shield-circuit-check",
  "npm run private-pool-v2:send-circuit-check",
  "npm run private-pool-v2:claim-circuit-check",
  "npm run private-pool-v2:claim-browser-worker-prover-check",
  "npm run private-pool-v2:claim-proof-artifact-consistency-check",
  "npm run private-pool-v2:claim-operator-no-witness-check",
  "npm run private-pool-v2:swap-to-shielded-circuit-check",
  "npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check",
  "npm run private-pool-v2:swap-to-shielded-proof-artifact-consistency-check",
  "npm run private-pool-v2:swap-to-shielded-operator-no-witness-check",
  "npm run private-pool-v2:actual-private-spend-circuit-check",
  "npm run private-pool-v2:actual-private-spend-witness-prover-check",
  "npm run private-pool-v2:actual-private-spend-browser-worker-prover-check",
  "npm run private-pool-v2:actual-private-spend-proof-artifact-consistency-check",
  "npm run private-pool-v2:actual-private-spend-operator-no-witness-check",
  "npm run private-core:send-check",
  "npm run private-core:swap-check",
  "npm run truth:privacy-claim-gate",
  "npm run frontend:operator-env-exposure-check",
]) {
  assert.ok(state.includes(phrase), `state.yaml missing verification command ${phrase}`);
}

assert.equal(
  packageJson.scripts["privacy-audit:tracker-check"],
  "node scripts/check-vanta-claude-privacy-audit-tracker.mjs",
  "package.json must expose privacy-audit:tracker-check.",
);
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"]?.includes("npm run privacy-audit:tracker-check"),
  "zk:feedback-loop-check must include privacy-audit:tracker-check.",
);

console.log("Vanta Claude privacy audit tracker check: PASS");
