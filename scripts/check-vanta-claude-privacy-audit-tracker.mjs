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
const n2Ppv2SwapInputPreimageNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-n2-ppv2-swap-input-preimage.md",
);
const n2PrivateCoreProofOwnerNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-n2-private-core-proof-owner.md",
);
const architectureBlockerNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-architecture-blocker-map.md",
);
const n5CiGateNotePath = resolve(trackerRoot, "notes/2026-05-14-n5-ci-gate.md");
const r8aProverRelayPrivacyTradeoffNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r8a-prover-relay-privacy-tradeoff.md",
);
const r11aLiveAnonymitySetProbeNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r11a-live-anonymity-set-probe.md",
);
const r13aLiveMetaDescriptionScrapeNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r13a-live-meta-description-scrape.md",
);
const r15aOperatorKeypairEnvLockdownNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r15a-operator-keypair-env-lockdown.md",
);
const completionAuditNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-completion-audit.md",
);
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
  n2Ppv2SwapInputPreimageNotePath,
  n2PrivateCoreProofOwnerNotePath,
  architectureBlockerNotePath,
  n5CiGateNotePath,
  r8aProverRelayPrivacyTradeoffNotePath,
  r11aLiveAnonymitySetProbeNotePath,
  r13aLiveMetaDescriptionScrapeNotePath,
  r15aOperatorKeypairEnvLockdownNotePath,
  completionAuditNotePath,
  privacyAuditWorkflowPath,
]) {
  assert.ok(existsSync(path), `Missing Claude privacy audit tracker artifact: ${path}`);
}

const goal = read(goalPath);
const state = read(statePath);
const note = read(notePath);
const n2BlockerNote = read(n2BlockerNotePath);
const n2ImplementationPathNote = read(n2ImplementationPathNotePath);
const n2Ppv2SwapInputPreimageNote = read(n2Ppv2SwapInputPreimageNotePath);
const n2PrivateCoreProofOwnerNote = read(n2PrivateCoreProofOwnerNotePath);
const architectureBlockerNote = read(architectureBlockerNotePath);
const n5CiGateNote = read(n5CiGateNotePath);
const r8aProverRelayPrivacyTradeoffNote = read(r8aProverRelayPrivacyTradeoffNotePath);
const r11aLiveAnonymitySetProbeNote = read(r11aLiveAnonymitySetProbeNotePath);
const r13aLiveMetaDescriptionScrapeNote = read(r13aLiveMetaDescriptionScrapeNotePath);
const r15aOperatorKeypairEnvLockdownNote = read(r15aOperatorKeypairEnvLockdownNotePath);
const completionAuditNote = read(completionAuditNotePath);
const privacyAuditWorkflow = read(privacyAuditWorkflowPath);
const proverRelayTradeoffs = read(resolve(repoRoot, "docs/zk/prover-relay-privacy-tradeoffs.md"));
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
  n2Section.includes("status: local-implemented"),
  "N2 must remain local-implemented after the approved PPv2 Swap and Private Core proof-owner closures.",
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
  "status_must_remain: \"local-implemented\"",
  "Private Core Send/Swap now declare provingOwnerKeyMode = poseidon-proof-owner-key-v0",
  "Private Core Send/Swap still keep source-layer X25519 owner authorization prechecked off-circuit",
  "Do not claim Private Core Send/Swap prove X25519 ownership in circuit.",
  "remaining_design_blockers",
  "N2-PPV2-SWAP-INPUT-PREIMAGE",
  "status: local-implemented",
  "Private Pool v2 Swap-to-shielded now recomputes input_commitment from owner_commitment, input_asset_id_commitment, input_amount, input_blinding, and input_derivation_tag",
  "invalid-input-commitment-preimage fixtures",
  "decision_approved_by: \"Clay\"",
  "approval_answer: \"yes\"",
  "input_commitment = poseidon5(owner_commitment, input_asset_id_commitment, input_amount, input_blinding, input_derivation_tag)",
  "N2-PRIVATE-CORE-SENDER-AUTH",
  "sender_proving_owner_key_hi/lo",
  "sender_proving_owner_key_lo = poseidon2([sender_secret_key_hi, sender_secret_key_lo])",
  "provingOwnerKeyMode = poseidon-proof-owner-key-v0",
  "operator/private-core-proof.mjs serializes sender_proving_owner_key_hi/lo",
  "approval_question",
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
  "audit_remaining_work_backlog",
  "R12-LEGACY-V1-MEMO-QUARANTINE",
  "R7A-DEPLOYED-BYTECODE-HASH-SOURCE-MATCH",
  "R8A-PROVER-RELAY-PRIVACY-TRADEOFF",
  "docs/zk/prover-relay-privacy-tradeoffs.md documents opt-in remote prover/prover relay trade-offs",
  "R9A-CIPHERTEXT-BODY-HASH-DISCOVERY-BINDING",
  "R10A-SERVICE-STUB-REPLACEMENT",
  "R11A-LIVE-ANONYMITY-SET-PROBE",
  "status: local-implemented-live-read-verified",
  "npm run private-pool-v2:live-anonymity-set-probe-check",
  "scripts/check-vanta-live-anonymity-set-probe.mjs fetches https://vantaprivacy.xyz/.well-known/vanta-audit.json by default.",
  "R13A-LIVE-META-DESCRIPTION-SCRAPE",
  "npm run public:live-meta-description-check",
  "scripts/check-vanta-live-meta-description.mjs fetches https://vantaprivacy.xyz by default",
  "R14-ARGON2ID-VAULT-KDF",
  "R15-OPERATOR-KEYPAIR-ENV-LOCKDOWN",
  "R15A-OPERATOR-KEYPAIR-ENV-LOCKDOWN-GUARD",
  "local-implemented-with-a2-exception",
  "npm run operator:keypair-env-lockdown-check",
  "scripts/check-vanta-operator-keypair-env-lockdown.mjs scans operator/*.mjs for raw Solana keypair env loading.",
  "R19-THREAT-MODEL",
  "R20-MAINNET-ONCHAIN-REPLAY-TEST",
  "R21-E2E-DEPOSIT-SEND-FRESH-EXIT-PRIVACY-TEST",
  "audit_completion_checklist",
  "active-not-complete",
  ".github/workflows/privacy-audit.yml",
  "Vanta Privacy Audit Gates / Privacy audit gates",
  "Hosted GitHub Actions run must execute and pass before N5 is CI-verified.",
]) {
  assert.ok(state.includes(phrase), `state.yaml missing ${phrase}`);
}

for (const phrase of [
  "N2-PPV2-SWAP-INPUT-PREIMAGE",
  "N2-PRIVATE-CORE-SENDER-AUTH",
  "Clay approved this path on 2026-05-14",
  "local-implemented",
  "invalid-input-commitment-preimage",
  "invalid-owner-auth fixtures",
  "x25519-secret-prechecked-off-circuit",
  "Do not claim Private Core Send/Swap prove X25519 ownership in circuit.",
]) {
  assert.ok(n2BlockerNote.includes(phrase), `N2 blocker note missing ${phrase}`);
}

for (const phrase of [
  "approved-and-local-implemented",
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
  "Approval answer: yes.",
  "Do not use this local N2 closure to claim production privacy",
]) {
  assert.ok(
    n2ImplementationPathNote.includes(phrase),
    `N2 implementation path note missing ${phrase}`,
  );
}

for (const phrase of [
  "N2 Private Core Proof-Owner Closure - 2026-05-14",
  "Clay approved the Private Core Send/Swap owner decision on 2026-05-14.",
  "provingOwnerKeyMode = poseidon-proof-owner-key-v0",
  "ownerAuthorizationMode = x25519-secret-prechecked-off-circuit",
  "sender_proving_owner_key_hi",
  "sender_proving_owner_key_lo = poseidon2([sender_secret_key_hi, sender_secret_key_lo])",
  "invalid-owner-auth",
  "operator/private-core-proof.mjs",
  "does not prove X25519 ownership in circuit",
]) {
  assert.ok(
    n2PrivateCoreProofOwnerNote.includes(phrase),
    `N2 Private Core proof-owner note missing ${phrase}`,
  );
}

for (const phrase of [
  "N2 PPv2 Swap Input Preimage Closure - 2026-05-14",
  "Clay approved the PPv2 Swap-to-shielded owner decision on 2026-05-14.",
  "input_commitment = poseidon5(owner_commitment, input_asset_id_commitment, input_amount, input_blinding, input_derivation_tag)",
  "settlement_commitment",
  "route_commitment",
  "economics_commitment",
  "asserts `computed_input_commitment == input_commitment`",
  "invalid-input-commitment-preimage",
  "Red-first: `npm run zk:circuit-soundness-lint` failed before implementation",
  "npm run private-pool-v2:swap-to-shielded-circuit-check",
  "npm run private-pool-v2:swap-to-shielded-browser-worker-prover-check",
  "npm run private-pool-v2:local-bb-fixture-prover-check",
  "N2 remains partial because Private Core Send/Swap still need the approved explicit Poseidon proof-owner authorization model.",
]) {
  assert.ok(
    n2Ppv2SwapInputPreimageNote.includes(phrase),
    `N2 PPv2 Swap input-preimage note missing ${phrase}`,
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
  "R8A Prover Relay Privacy Trade-Off - 2026-05-14",
  "Local implemented.",
  "opt-in remote prover and prover-relay privacy trade-offs",
  "Remote proving must be explicit opt-in.",
  "Remote provers can receive privacy-sensitive proof inputs and metadata.",
  "Browser-worker proving remains dev-only evidence",
  "Relay separation alone is not anonymity.",
  "`selectedProverRuntime` is `null`",
  "npm run zk:h08-production-prover-runtime-options-check",
  "not a selected production prover runtime",
]) {
  assert.ok(
    r8aProverRelayPrivacyTradeoffNote.includes(phrase),
    `R8A prover relay privacy trade-off note missing ${phrase}`,
  );
}

for (const phrase of [
  "Prover Relay Privacy Trade-Offs",
  "Vanta production privacy is not enabled.",
  "A remote prover or prover relay must be explicit opt-in.",
  "The product must not silently move witness generation or proof construction from the user's device to a remote service.",
  "A remote prover can receive sensitive proof inputs needed to construct the proof",
  "Browser-worker proving can keep witness material on the user's device, but the current implementation is dev-only evidence.",
  "Separation alone is not anonymity",
  "users can choose local proving vs remote proving with clear trade-off copy",
  "not production-private proof infrastructure",
]) {
  assert.ok(proverRelayTradeoffs.includes(phrase), `prover relay trade-off doc missing ${phrase}`);
}

for (const phrase of [
  "R11A Live Anonymity-Set Probe - 2026-05-14",
  "Local implemented, live-read verified.",
  "fails closed if the live manifest allows anonymity/privacy claims while commitment depth is below the published threshold",
  "https://vantaprivacy.xyz/.well-known/vanta-audit.json",
  "currentDistinctCommitments: 2",
  "minimumDistinctCommitments: 1024",
  "depthBelowThreshold: true",
  "anonymityClaimAllowed",
  "privacyClaimAllowed",
  "npm run private-pool-v2:live-anonymity-set-probe-check",
  "not anonymity-set growth",
]) {
  assert.ok(
    r11aLiveAnonymitySetProbeNote.includes(phrase),
    `R11A live anonymity-set probe note missing ${phrase}`,
  );
}

for (const phrase of [
  "R13A Live Meta-Description Scrape - 2026-05-14",
  "Local implemented, live-read verified.",
  "scrapes the live crawler-visible meta description",
  "https://vantaprivacy.xyz",
  "Vanta is alpha-stage zk research toward a Solana privacy layer. Not audited. Production privacy is not enabled; live anonymity set blocked. See /.well-known/vanta-audit.json.",
  "zk-powered privacy layer",
  "private payment flows",
  "npm run public:live-meta-description-check",
  "not deployment evidence for current local commits",
]) {
  assert.ok(
    r13aLiveMetaDescriptionScrapeNote.includes(phrase),
    `R13A live meta-description scrape note missing ${phrase}`,
  );
}

for (const phrase of [
  "R15A Operator Keypair Env Lockdown Guard - 2026-05-14",
  "Local implemented.",
  "VANTA_PAY_SECRET_KEY",
  "Keypair.fromSecretKey",
  "loadKeypairFromEnv",
  "VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF",
  "assertLiquiditySignerPolicy()",
  "Unshield server: remains the known A2 operator-keypair public-exit exception.",
  "npm run operator:keypair-env-lockdown-check",
  "not a program-owned custody migration",
]) {
  assert.ok(
    r15aOperatorKeypairEnvLockdownNote.includes(phrase),
    `R15A operator keypair env lockdown note missing ${phrase}`,
  );
}

for (const phrase of [
  "Prompt-To-Artifact Checklist",
  "Goal is not complete.",
  "N2 owner/input binding across lanes",
  "Local implemented",
  "Private Core proof-owner closure note",
  "PPv2 Send/Claim/Swap/actual-private-spend and Private Core Send/Swap have local binding guards",
  "Deployed bytecode/source hash match",
  "Prover-relay privacy trade-off docs",
  "docs/zk/prover-relay-privacy-tradeoffs.md",
  "Ciphertext body-hash discovery binding",
  "Service stub replacement",
  "Live anonymity-set probe",
  "Local implemented, live-read verified",
  "Live meta-description scrape",
  "npm run public:live-meta-description-check",
  "Legacy v1 plaintext memo quarantine",
  "Argon2id vault KDF migration",
  "Operator keypair env lockdown",
  "Local implemented with A2 exception",
  "Operator keypair env lockdown guard",
  "npm run operator:keypair-env-lockdown-check",
  "Positive proof-verified claim gate",
  "Mainnet on-chain replay test",
  "Deposit-send-fresh-exit privacy test",
  "Threat model",
  "branch is ahead of origin",
  "latest tracker/circuit/CI slices are not deployed or live-verified",
]) {
  assert.ok(completionAuditNote.includes(phrase), `completion audit note missing ${phrase}`);
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
  "npm run operator:keypair-env-lockdown-check",
  "npm run private-pool-v2:live-anonymity-set-probe-check",
  "npm run public:live-meta-description-check",
]) {
  assert.ok(state.includes(phrase), `state.yaml missing verification command ${phrase}`);
}

assert.equal(
  packageJson.scripts["privacy-audit:tracker-check"],
  "node scripts/check-vanta-claude-privacy-audit-tracker.mjs",
  "package.json must expose privacy-audit:tracker-check.",
);
assert.equal(
  packageJson.scripts["operator:keypair-env-lockdown-check"],
  "node scripts/check-vanta-operator-keypair-env-lockdown.mjs",
  "package.json must expose operator:keypair-env-lockdown-check.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:live-anonymity-set-probe-check"],
  "node scripts/check-vanta-live-anonymity-set-probe.mjs",
  "package.json must expose private-pool-v2:live-anonymity-set-probe-check.",
);
assert.equal(
  packageJson.scripts["public:live-meta-description-check"],
  "node scripts/check-vanta-live-meta-description.mjs",
  "package.json must expose public:live-meta-description-check.",
);
assert.ok(
  packageJson.scripts["mainnet:secret-handling-check"]?.includes(
    "npm run operator:keypair-env-lockdown-check",
  ),
  "mainnet:secret-handling-check must include operator:keypair-env-lockdown-check.",
);
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"]?.includes("npm run privacy-audit:tracker-check"),
  "zk:feedback-loop-check must include privacy-audit:tracker-check.",
);

console.log("Vanta Claude privacy audit tracker check: PASS");
