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
const r4aTag6VerifierKeyPreflightNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r4a-tag6-verifier-key-preflight.md",
);
const n5CiGateNotePath = resolve(trackerRoot, "notes/2026-05-14-n5-ci-gate.md");
const r8aProverRelayPrivacyTradeoffNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r8a-prover-relay-privacy-tradeoff.md",
);
const r9aCiphertextBodyHashDiscoveryBindingNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r9a-ciphertext-body-hash-discovery-binding.md",
);
const r9RecipientDiscoveryDecisionBlockerNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r9-recipient-discovery-decision-blocker.md",
);
const r9RecipientDiscoveryApprovedPathNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r9-recipient-discovery-approved-path.md",
);
const r9bDirectViewingKeyExchangeNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r9b-direct-viewing-key-exchange.md",
);
const r9cDirectProofOwnerKeyExchangeNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r9c-direct-proof-owner-key-exchange.md",
);
const r6FreshAddressExitApprovedPathNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r6-fresh-address-exit-approved-path.md",
);
const r6aProofBoundDestinationContractNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r6a-proof-bound-destination-contract.md",
);
const r10aServiceEntrypointsNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r10a-service-entrypoints.md",
);
const r10bRoleServiceProductionControlsNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r10b-role-service-production-controls.md",
);
const r11aLiveAnonymitySetProbeNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r11a-live-anonymity-set-probe.md",
);
const r12LegacyV1MemoQuarantineNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r12-legacy-v1-memo-quarantine.md",
);
const r13aLiveMetaDescriptionScrapeNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r13a-live-meta-description-scrape.md",
);
const r14Argon2idVaultKdfNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r14-argon2id-vault-kdf.md",
);
const r15aOperatorKeypairEnvLockdownNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r15a-operator-keypair-env-lockdown.md",
);
const r16PositiveProofVerifiedClaimGateNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r16-positive-proof-verified-claim-gate.md",
);
const r19ThreatModelNotePath = resolve(
  trackerRoot,
  "notes/2026-05-14-r19-threat-model.md",
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
  r4aTag6VerifierKeyPreflightNotePath,
  n5CiGateNotePath,
  r8aProverRelayPrivacyTradeoffNotePath,
  r9aCiphertextBodyHashDiscoveryBindingNotePath,
  r9RecipientDiscoveryDecisionBlockerNotePath,
  r9RecipientDiscoveryApprovedPathNotePath,
  r9bDirectViewingKeyExchangeNotePath,
  r9cDirectProofOwnerKeyExchangeNotePath,
  r6FreshAddressExitApprovedPathNotePath,
  r6aProofBoundDestinationContractNotePath,
  r10aServiceEntrypointsNotePath,
  r10bRoleServiceProductionControlsNotePath,
  r11aLiveAnonymitySetProbeNotePath,
  r12LegacyV1MemoQuarantineNotePath,
  r13aLiveMetaDescriptionScrapeNotePath,
  r14Argon2idVaultKdfNotePath,
  r15aOperatorKeypairEnvLockdownNotePath,
  r16PositiveProofVerifiedClaimGateNotePath,
  r19ThreatModelNotePath,
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
const r4aTag6VerifierKeyPreflightNote = read(r4aTag6VerifierKeyPreflightNotePath);
const n5CiGateNote = read(n5CiGateNotePath);
const r8aProverRelayPrivacyTradeoffNote = read(r8aProverRelayPrivacyTradeoffNotePath);
const r9aCiphertextBodyHashDiscoveryBindingNote = read(
  r9aCiphertextBodyHashDiscoveryBindingNotePath,
);
const r9RecipientDiscoveryDecisionBlockerNote = read(
  r9RecipientDiscoveryDecisionBlockerNotePath,
);
const r9RecipientDiscoveryApprovedPathNote = read(r9RecipientDiscoveryApprovedPathNotePath);
const r9bDirectViewingKeyExchangeNote = read(r9bDirectViewingKeyExchangeNotePath);
const r9cDirectProofOwnerKeyExchangeNote = read(r9cDirectProofOwnerKeyExchangeNotePath);
const r6FreshAddressExitApprovedPathNote = read(r6FreshAddressExitApprovedPathNotePath);
const r6aProofBoundDestinationContractNote = read(r6aProofBoundDestinationContractNotePath);
const r10aServiceEntrypointsNote = read(r10aServiceEntrypointsNotePath);
const r10bRoleServiceProductionControlsNote = read(r10bRoleServiceProductionControlsNotePath);
const r11aLiveAnonymitySetProbeNote = read(r11aLiveAnonymitySetProbeNotePath);
const r12LegacyV1MemoQuarantineNote = read(r12LegacyV1MemoQuarantineNotePath);
const r13aLiveMetaDescriptionScrapeNote = read(r13aLiveMetaDescriptionScrapeNotePath);
const r14Argon2idVaultKdfNote = read(r14Argon2idVaultKdfNotePath);
const r15aOperatorKeypairEnvLockdownNote = read(r15aOperatorKeypairEnvLockdownNotePath);
const r16PositiveProofVerifiedClaimGateNote = read(r16PositiveProofVerifiedClaimGateNotePath);
const r19ThreatModelNote = read(r19ThreatModelNotePath);
const completionAuditNote = read(completionAuditNotePath);
const privacyAuditWorkflow = read(privacyAuditWorkflowPath);
const proverRelayTradeoffs = read(resolve(repoRoot, "docs/zk/prover-relay-privacy-tradeoffs.md"));
const threatModel = read(resolve(repoRoot, "docs/threat-model.md"));
const shieldState = read(resolve(repoRoot, "src/solana/vantaShieldState.ts"));
const privateVaultCrypto = read(resolve(repoRoot, "src/privateVault/privateVaultCrypto.ts"));
const serviceNetworkSource = read(resolve(repoRoot, "operator/private-pool-v2-service-network.mjs"));
const roleEntrypointSources = [
  read(resolve(repoRoot, "operator/private-pool-v2-indexer-server.mjs")),
  read(resolve(repoRoot, "operator/private-pool-v2-prover-server.mjs")),
  read(resolve(repoRoot, "operator/private-pool-v2-relayer-server.mjs")),
  read(resolve(repoRoot, "operator/private-pool-v2-verifier-server.mjs")),
].join("\n");
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
const r3SectionMatch = state.match(/  - id: R3-OWNER-INPUT-BINDING\n[\s\S]*?\n  - id: R4-PDA-VAULT-UNSHIELD\n/);
assert.ok(r3SectionMatch, "state.yaml missing bounded R3 owner/input binding backlog row");
const r3Section = r3SectionMatch[0];
assert.ok(
  r3Section.includes("status: local-implemented"),
  "R3 owner/input binding backlog row must mirror N2 local implementation status.",
);
assert.ok(
  r3Section.includes("tracker_ref: \"N2\""),
  "R3 owner/input binding backlog row must stay tied to N2.",
);
const r9SectionMatch = state.match(/  - id: R9-RECIPIENT-DISCOVERY\n[\s\S]*?\n  - id: R9A-CIPHERTEXT-BODY-HASH-DISCOVERY-BINDING\n/);
assert.ok(r9SectionMatch, "state.yaml missing bounded R9 recipient discovery backlog row");
const r9Section = r9SectionMatch[0];
assert.ok(
  r9Section.includes("status: partial-local-implemented-pending-production-discovery"),
  "R9 production recipient discovery must record local direct-key progress while remaining pending production discovery.",
);
assert.ok(
  r9Section.includes("approved_decision:"),
  "R9 production recipient discovery must preserve the approved owner decision.",
);
assert.ok(
  r9Section.includes("selected_model: \"hybrid discovery\""),
  "R9 production recipient discovery must record hybrid discovery as the selected model.",
);
assert.ok(
  r9Section.includes("R9B local direct viewing-key exchange scaffold is implemented"),
  "R9 production recipient discovery must point to the R9B local direct-key scaffold.",
);
const a2FreshExitSectionMatch = state.match(
  /  - id: A2-SELF-WALLET-EXIT-ONLY\n[\s\S]*?\n  - id: A3-ROOTS-NOT-PROGRAM-OWNED-SHARED-TREE\n/,
);
assert.ok(a2FreshExitSectionMatch, "state.yaml missing bounded A2 self-wallet exit row");
const a2FreshExitSection = a2FreshExitSectionMatch[0];
assert.ok(
  a2FreshExitSection.includes("status: partial-local-contract-implemented-blocked-on-proof-bound-release"),
  "A2 fresh-address exit must record local proof-bound destination contract progress.",
);
assert.ok(
  a2FreshExitSection.includes("approved_direction:"),
  "A2 fresh-address exit must preserve the approved owner direction.",
);
assert.ok(
  a2FreshExitSection.includes("destinationOwner != requester only when the destination is proof-bound"),
  "A2 fresh-address exit must stay limited to proof-bound destination release.",
);
assert.ok(
  a2FreshExitSection.includes("proofBoundDestinationCommitment"),
  "A2 fresh-address exit must preserve the local proof-bound destination commitment contract evidence.",
);

for (const phrase of [
  "output_commitment is unconstrained",
  "Owner secret/input commitment binding",
  "local-implemented",
  "blocked-approval-gated",
  "received-historical-current-live-read-checks-pass",
  "user_reported_local_live_bundle_hash_match",
  "local-implemented-pending-ci-run",
  "index-BhWFlXXv.js",
  "npm run public:live-meta-description-check",
  "npm run private-pool-v2:live-anonymity-set-probe-check",
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
  "root/root-record/verifier-key/nullifier/vault-asset/token-account shape",
  "A2-OPERATOR-KEYPAIR-CUSTODY",
  "loadKeypairFromEnv(vaultSignerSecretKeyEnvName)",
  "A2-SELF-WALLET-EXIT-ONLY",
  "destinationOwner !== requester",
  "partial-local-contract-implemented-blocked-on-proof-bound-release",
  "proofBoundDestinationCommitment",
  "R6A-PROOF-BOUND-DESTINATION-CONTRACT",
  "R4A-TAG6-VERIFIER-KEY-PREFLIGHT",
  "unshieldInstructionLen: 457",
  "sourceOnlyVerifierKeyPreflightReady: true",
  "status: local-implemented-fail-closed",
  "root/root-record/verifier-key/nullifier/vault-asset/token-account preflight",
  "proof-bound-destination-commitment",
  "A3-ROOTS-NOT-PROGRAM-OWNED-SHARED-TREE",
  "not proof that the root transition is correct",
  "audit_remaining_work_backlog",
  "R12-LEGACY-V1-MEMO-QUARANTINE",
  "R7A-DEPLOYED-BYTECODE-HASH-SOURCE-MATCH",
  "R8A-PROVER-RELAY-PRIVACY-TRADEOFF",
  "docs/zk/prover-relay-privacy-tradeoffs.md documents opt-in remote prover/prover relay trade-offs",
  "R9A-CIPHERTEXT-BODY-HASH-DISCOVERY-BINDING",
  "status: local-implemented-local-only",
  "local verifier-mirrored discovery handoff",
  "proof-bound ciphertext body-hash fields feed the local Send discovery/indexer handoff",
  "send-memo-indexer-body-hash-handoff-not-deployed",
  "not production recipient discovery",
  "partial-local-implemented-pending-production-discovery-controls",
  "R9-RECIPIENT-DISCOVERY",
  "status: partial-local-implemented-pending-production-discovery",
  "Clay approved hybrid discovery on 2026-05-14",
  "R9B-DIRECT-VIEWING-KEY-EXCHANGE",
  "R9C-DIRECT-PROOF-OWNER-KEY-EXCHANGE",
  "recipientOwnerPublicKey",
  "external Send proof path is enabled",
  "direct-known-counterparty",
  "direct-key-beta-not-production-recipient-discovery",
  "R10A-SERVICE-STUB-REPLACEMENT",
  "R10B-ROLE-SERVICE-PRODUCTION-CONTROLS",
  "role-service replay barrier",
  "npm run private-pool-v2:role-storage-check",
  "npm run private-pool-v2:service-network-check",
  "npm run mainnet:role-service-replay-evidence-check",
  "npm run mainnet:observability-sink-check",
  "R16-POSITIVE-PROOF-VERIFIED-CLAIM-GATE",
  "local-implemented-fail-closed-blocked-on-tag3-valid-proof",
  "npm run zk:c01-positive-proof-verified-claim-gate-check",
  "ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json",
  "not production privacy",
  "partial-local-implemented-pending-production-controls",
  "operator/private-pool-v2-service-network.mjs exposes role-specific service start functions for indexer, prover, relayer, and verifier.",
  "operator/private-pool-v2-{indexer,prover,relayer,verifier}-server.mjs now export role-specific entrypoint descriptors",
  "startVantaPrivatePoolV2IndexerService",
  "startVantaPrivatePoolV2ProverService",
  "startVantaPrivatePoolV2RelayerService",
  "startVantaPrivatePoolV2VerifierService",
  "R11A-LIVE-ANONYMITY-SET-PROBE",
  "status: local-implemented-live-read-verified",
  "npm run private-pool-v2:live-anonymity-set-probe-check",
  "scripts/check-vanta-live-anonymity-set-probe.mjs fetches https://vantaprivacy.xyz/.well-known/vanta-audit.json by default.",
  "R13A-LIVE-META-DESCRIPTION-SCRAPE",
  "npm run public:live-meta-description-check",
  "scripts/check-vanta-live-meta-description.mjs fetches https://vantaprivacy.xyz by default",
  "R14-ARGON2ID-VAULT-KDF",
  "src/privateVault/privateVaultCrypto.ts writes new vault envelopes with argon2id-aes-gcm-sha256.v3.",
  "PBKDF2 v2 at 600_000 iterations and legacy v1 at absent/120_000 iterations remain decryptable for existing vault payloads.",
  "R12-LEGACY-V1-MEMO-QUARANTINE",
  "npm run actions:legacy-v1-memo-quarantine-check",
  "getVantaLegacyV1MemoQuarantinePolicy() covering Shield, Send, Unshield, Swap, SOL Unshield, Native SOL Shield, and spent-marker v1 prefixes",
  "R15-OPERATOR-KEYPAIR-ENV-LOCKDOWN",
  "R15A-OPERATOR-KEYPAIR-ENV-LOCKDOWN-GUARD",
  "local-implemented-with-a2-exception",
  "npm run operator:keypair-env-lockdown-check",
  "scripts/check-vanta-operator-keypair-env-lockdown.mjs scans operator/*.mjs for raw Solana keypair env loading.",
  "R19-THREAT-MODEL",
  "docs/threat-model.md documents the current pre-mainnet actors, assets, trust boundaries, adversaries, non-claims, and verification commands.",
  "scripts/check-vanta-docs-source-of-truth.mjs requires the threat model to preserve beta-truth phrases",
  "R20-MAINNET-ONCHAIN-REPLAY-TEST",
  "R21-E2E-DEPOSIT-SEND-FRESH-EXIT-PRIVACY-TEST",
  "audit_completion_checklist",
  "active-not-complete",
  "R6A/R9B base commit is 51809b9",
  "Use git log for the exact current head.",
  "Use git status for the exact count.",
  "not deployment of the current branch head",
  "No remaining small local-only audit quick-fix is open after R4A/R6A/R9B/R9C/R10B/R16",
  ".github/workflows/privacy-audit.yml",
  "Vanta Privacy Audit Gates / Privacy audit gates",
  "Hosted GitHub Actions run must execute and pass before N5 is CI-verified.",
]) {
  assert.ok(state.includes(phrase), `state.yaml missing ${phrase}`);
}

for (const phrase of [
  "R4A TAG_UNSHIELD verifier-key preflight",
  "457-byte",
  "verifierKeyHash",
  "sourceOnlyVerifierKeyPreflightReady: true",
  "ERR_UNSHIELD_RELEASE_NOT_WIRED",
  "not proof verification",
  "not program-owned custody",
  "npm run private-pool-v2:onchain-unshield-custody-check",
  "npm run private-pool-v2:sbf-abi-check",
  "npm run private-pool-v2:crucible-check",
]) {
  assert.ok(
    r4aTag6VerifierKeyPreflightNote.includes(phrase),
    `R4A TAG_UNSHIELD verifier-key preflight note missing ${phrase}`,
  );
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
  "R12 Legacy V1 Memo Quarantine - 2026-05-14",
  "Status: local implemented.",
  "getVantaLegacyV1MemoQuarantinePolicy()",
  "npm run actions:legacy-v1-memo-quarantine-check",
  "actions:memo-encryption-check",
  "truth:privacy-claim-gate",
  "zk:feedback-loop-check",
  "Legacy v1 plaintext memo chain history remains parse-compatible history only.",
  "not eligible for production privacy claims",
  "excluded from production privacy, anonymity, proof-verified, and mainnet-private claims",
  "not memo migration",
  "not recipient discovery deployment",
]) {
  assert.ok(
    r12LegacyV1MemoQuarantineNote.includes(phrase),
    `R12 legacy v1 memo quarantine note missing ${phrase}`,
  );
}

for (const phrase of [
  "VANTA_LEGACY_V1_MEMO_QUARANTINE_POLICY_VERSION",
  "vanta-legacy-v1-memo-quarantine-0.1",
  "getVantaLegacyV1MemoQuarantinePolicy",
  "legacy-v1-plaintext-memos-quarantined-parse-compatible-history",
  "freshV2EncryptedRequiredForNewMemos: true",
  "freshV2ViewingKeyAeadRequiredForNewActionMemos: true",
  "legacyV1ParseCompatible: true",
  "productionPrivacyClaimsEligible: false",
  "privacyClaimsExcluded: true",
]) {
  assert.ok(shieldState.includes(phrase), `vantaShieldState legacy v1 policy missing ${phrase}`);
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
  "R14 Argon2id Vault KDF - 2026-05-14",
  "Status: local implemented.",
  "argon2id-aes-gcm-sha256.v3",
  "memory `65_536` KiB",
  "time cost `3`",
  "parallelism `1`",
  "derived key bytes `32`",
  "version `19`",
  "pbkdf2-aes-gcm-sha256.v2",
  "600_000",
  "pbkdf2-aes-gcm-sha256.v1",
  "120_000",
  "npm run private-vault:crypto-check",
  "Red-first: `npm run private-mode:contract-check` failed before implementation",
  "not production-private proof",
]) {
  assert.ok(
    r14Argon2idVaultKdfNote.includes(phrase),
    `R14 Argon2id vault KDF note missing ${phrase}`,
  );
}

for (const phrase of [
  "argon2id-aes-gcm-sha256.v3",
  "PRIVATE_VAULT_PAYLOAD_SCHEME_V2",
  "pbkdf2-aes-gcm-sha256.v2",
  "PRIVATE_VAULT_ARGON2ID_MEMORY_KIB = 65_536",
  "PRIVATE_VAULT_ARGON2ID_TIME_COST = 3",
  "PRIVATE_VAULT_ARGON2ID_PARALLELISM = 1",
  "PRIVATE_VAULT_ARGON2ID_DERIVED_KEY_BYTES = 32",
  "derivePrivateVaultArgon2idKey",
  "derivePrivateVaultPbkdf2Key",
  "hasValidArgon2idParameters",
]) {
  assert.ok(privateVaultCrypto.includes(phrase), `private vault crypto missing ${phrase}`);
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
  "R19 Threat Model - 2026-05-14",
  "Status: local implemented.",
  "docs/threat-model.md",
  "docs/docs-source-of-truth.md",
  "npm run docs:source-of-truth-check",
  "Vanta production privacy is not enabled.",
  "users, merchants, relayers, operators, counterparties",
  "ERR_PROOF_VERIFIER_NOT_WIRED",
  "ERR_UNSHIELD_RELEASE_NOT_WIRED",
  "operator-keypair public exit",
  "loadKeypairFromEnv(vaultSignerSecretKeyEnvName)",
  "destinationOwner !== requester",
  "browser localStorage records are diagnostics and continuity aids only",
  "recipient discovery",
  "program-owned shared-tree state",
  "legacy v1 plaintext memo quarantine",
  "not production-private proof",
]) {
  assert.ok(r19ThreatModelNote.includes(phrase), `R19 threat-model note missing ${phrase}`);
}

for (const phrase of [
  "Vanta Threat Model",
  "Last validated against repo-local code: 2026-05-14.",
  "Vanta production privacy is not enabled",
  "It does not claim anonymous, untraceable, fully private, production-ready, or live mainnet-private settlement.",
  "A remote prover or prover relay must be explicit opt-in.",
  "Browser localStorage records are diagnostics and continuity aids only.",
  "currentDistinctCommitments: 2",
  "minimumDistinctCommitments: 1024",
  "ERR_PROOF_VERIFIER_NOT_WIRED",
  "ERR_UNSHIELD_RELEASE_NOT_WIRED",
  "operator-keypair public exit",
  "destinationOwner !== requester",
  "A program-owned shared tree is not deployed.",
  "Recipient discovery is not production deployed.",
  "Clay approved hybrid discovery on 2026-05-14.",
  "Clay approved the proof-bound fresh-address exit direction on 2026-05-14.",
  "legacy v1 plaintext memo history",
  "npm run private-pool-v2:live-anonymity-set-probe-check",
]) {
  assert.ok(threatModel.includes(phrase), `docs/threat-model.md missing ${phrase}`);
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
  "Recipient discovery/indexer",
  "Partial local implementation, pending production discovery",
  "Clay approved hybrid discovery; local direct viewing-key exchange plus public proof-owner key exchange exist for known counterparties",
  "Direct viewing-key exchange",
  "Local implemented, local-only",
  "Direct proof-owner key exchange",
  "public-key material only, external Send proof path remains blocked",
  "Fresh-address exit privacy",
  "Partial local contract implemented, blocked on proof-bound release",
  "Proof-bound destination contract",
  "npm run private-pool-v2:unshield-proof-request-check",
  "Ciphertext body-hash discovery binding",
  "Local implemented, local-only",
  "proof-bound body-hash fields feed the local verifier-mirrored Send discovery handoff",
  "Service stub replacement",
  "Role-specific entrypoints are enforced by `npm run private-pool-v2:service-network-check`",
  "Role-service production controls",
  "Local implemented, production evidence partial",
  "role storage and replay evidence gates pass locally",
  "Live anonymity-set probe",
  "Local implemented, live-read verified",
  "Live meta-description scrape",
  "npm run public:live-meta-description-check",
  "Legacy v1 plaintext memo quarantine",
  "npm run actions:legacy-v1-memo-quarantine-check",
  "Argon2id vault KDF migration",
  "npm run private-vault:crypto-check",
  "Operator keypair env lockdown",
  "Local implemented with A2 exception",
  "Operator keypair env lockdown guard",
  "npm run operator:keypair-env-lockdown-check",
  "Positive proof-verified claim gate",
  "Local implemented, fail-closed; blocked on tag-3 valid-proof success",
  "npm run zk:c01-positive-proof-verified-claim-gate-check",
  "Threat model",
  "docs/threat-model.md",
  "npm run docs:source-of-truth-check",
  "Mainnet on-chain replay test",
  "Deposit-send-fresh-exit privacy test",
  "R6A/R9B base commit `51809b9`",
  "Use `git status` for the exact count.",
  "R9C direct proof-owner key exchange",
  "latest tracker/docs/circuit/CI/memo-quarantine/vault-KDF/service-entrypoint/role-service-control/proof-verified-claim-gate/direct-key/discovery-binding/proof-bound-destination slices are not deployed",
]) {
  assert.ok(completionAuditNote.includes(phrase), `completion audit note missing ${phrase}`);
}

for (const phrase of [
  "R16 Positive Proof-Verified Claim Gate - 2026-05-14",
  "Local implemented, fail-closed; blocked on tag-3 valid-proof success.",
  "ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json",
  "npm run zk:c01-positive-proof-verified-claim-gate-check",
  "truth:privacy-claim-gate",
  "zk:review-guards-check",
  "zk:feedback-loop-check",
  "valid-proof success",
  "wrong-public-input",
  "wrong-verifying-key",
  "not tag-3 valid-proof success evidence",
  "not proof-verified spend evidence",
  "not production privacy",
]) {
  assert.ok(r16PositiveProofVerifiedClaimGateNote.includes(phrase), `R16 note missing ${phrase}`);
}

for (const phrase of [
  "R10A Service Entrypoints - 2026-05-14",
  "Local implemented.",
  "role-explicit service entrypoints",
  "vantaPrivatePoolV2IndexerServiceEntrypoint",
  "vantaPrivatePoolV2ProverServiceEntrypoint",
  "vantaPrivatePoolV2RelayerServiceEntrypoint",
  "vantaPrivatePoolV2VerifierServiceEntrypoint",
  "startVantaPrivatePoolV2IndexerService",
  "startVantaPrivatePoolV2ProverService",
  "startVantaPrivatePoolV2RelayerService",
  "startVantaPrivatePoolV2VerifierService",
  "vantaPrivatePoolV2RoleServiceEntrypoints",
  "Red-first: `npm run private-pool-v2:service-network-check` failed before implementation",
  "not production service separation",
]) {
  assert.ok(r10aServiceEntrypointsNote.includes(phrase), `R10A note missing ${phrase}`);
}

for (const phrase of [
  "R10B Role-Service Production Controls - 2026-05-14",
  "Local implemented, production evidence partial.",
  "role-service replay barrier",
  "role storage",
  "service topology",
  "service deployment evidence",
  "relayer separation",
  "observability sink template",
  "secret handling",
  "npm run private-pool-v2:role-storage-check",
  "npm run private-pool-v2:service-network-check",
  "npm run mainnet:role-service-replay-evidence-check",
  "npm run mainnet:role-service-replay-status-check",
  "npm run mainnet:service-topology-check",
  "npm run mainnet:service-deployment-evidence-check",
  "npm run mainnet:observability-sink-check",
  "npm run private-pool-v2:relayer-separation-evidence-check",
  "npm run private-pool-v2:production-relayer-review-check",
  "npm run mainnet:secret-handling-check",
  "not live production settlement evidence",
  "not provider observability/alerting completion",
  "not production privacy",
]) {
  assert.ok(
    r10bRoleServiceProductionControlsNote.includes(phrase),
    `R10B role-service production-controls note missing ${phrase}`,
  );
}

for (const phrase of [
  "R9A Ciphertext Body-Hash Discovery Binding - 2026-05-14",
  "Local implemented, local-only.",
  "proof-bound ciphertext body-hash fields",
  "local verifier-mirrored discovery handoff",
  "memoCiphertextBodyHash",
  "proofBoundMemoCiphertextBodyHash",
  "send-memo-indexer-body-hash-handoff-not-deployed",
  "productionReady: false",
  "npm run private-pool-v2:send-discovery-indexer-handoff-check",
  "npm run private-pool-v2:service-network-check",
  "not production recipient discovery",
]) {
  assert.ok(
    r9aCiphertextBodyHashDiscoveryBindingNote.includes(phrase),
    `R9A note missing ${phrase}`,
  );
}

for (const phrase of [
  "R9 Recipient Discovery Decision Blocker - 2026-05-14",
  "Blocked product/protocol design.",
  "production recipient discovery requires an owner product/protocol decision",
  "direct viewing-key exchange",
  "indexed encrypted view tags",
  "hybrid discovery",
  "send-memo-indexer-body-hash-handoff-not-deployed",
  "external-recipient discovery UX",
  "not production recipient discovery",
  "not production privacy",
]) {
  assert.ok(
    r9RecipientDiscoveryDecisionBlockerNote.includes(phrase),
    `R9 recipient discovery decision-blocker note missing ${phrase}`,
  );
}

assert.ok(
  !state.includes(
    "R9 production recipient discovery remains pending even though R9A local ciphertext body-hash handoff binding is implemented.",
  ),
  "state.yaml must not keep the superseded R9A-only completion blocker after R9B direct-key exchange landed.",
);

for (const phrase of [
  "R9 Recipient Discovery Approved Path - 2026-05-14",
  "Approved owner decision.",
  "Clay approved hybrid discovery on 2026-05-14.",
  "direct viewing-key exchange first for merchant/OTC/treasury design partners",
  "indexed encrypted view tags after service/indexer privacy review",
  "local direct viewing-key exchange scaffold",
  "productionReady: false",
  "direct-known-counterparty",
  "direct-key beta only",
  "send-memo-indexer-body-hash-handoff-not-deployed",
  "not production recipient discovery",
  "not production privacy",
]) {
  assert.ok(
    r9RecipientDiscoveryApprovedPathNote.includes(phrase),
    `R9 recipient discovery approved-path note missing ${phrase}`,
  );
}

for (const phrase of [
  "R9B Direct Viewing-Key Exchange - 2026-05-14",
  "Local implemented, local-only.",
  "first approved hybrid discovery phase",
  "VantaShieldRecipientViewingKeyExchangePacket",
  "productionReady: false",
  "direct-known-counterparty",
  "forbidden plaintext/private field rejection",
  "src/solana/vantaRecipientViewingKeyExchange.ts",
  "browser-local storage",
  "external Private Core Send still stays blocked",
  "R9C now adds the public proof-owner key",
  "external Send proof path is enabled",
  "direct-key beta only",
  "npm run send:direct-viewing-key-exchange-check",
  "not production recipient discovery",
]) {
  assert.ok(
    r9bDirectViewingKeyExchangeNote.includes(phrase),
    `R9B direct viewing-key exchange note missing ${phrase}`,
  );
}

for (const phrase of [
  "R9C Direct Proof-Owner Key Exchange - 2026-05-14",
  "Local implemented, local-only.",
  "viewing public key needed for memo encryption",
  "recipient proof-owner public key",
  "recipientOwnerPublicKey",
  "fingerprint includes `recipientOwnerPublicKey`",
  "secretKey",
  "ownerSecret",
  "privateInputs",
  "witness",
  "external Send proof path is enabled",
  "npm run send:direct-viewing-key-exchange-check",
  "npx tsc --noEmit --pretty false",
  "not recipient authentication",
  "not external-recipient execution",
  "not production recipient discovery",
]) {
  assert.ok(
    r9cDirectProofOwnerKeyExchangeNote.includes(phrase),
    `R9C direct proof-owner key exchange note missing ${phrase}`,
  );
}

for (const phrase of [
  "R6 Fresh-Address Exit Approved Path - 2026-05-14",
  "Approved owner decision.",
  "Clay approved proof-bound fresh-address exit on 2026-05-14.",
  "destinationOwner != requester only when the destination is proof-bound",
  "proofBoundDestinationCommitment",
  "sha256:<64 lowercase hex>",
  "program-owned vault PDA",
  "TAG_UNSHIELD",
  "ERR_UNSHIELD_RELEASE_NOT_WIRED",
  "not fresh-address exit privacy",
  "not production privacy",
]) {
  assert.ok(
    r6FreshAddressExitApprovedPathNote.includes(phrase),
    `R6 fresh-address exit approved-path note missing ${phrase}`,
  );
}

for (const phrase of [
  "R6A Proof-Bound Destination Contract - 2026-05-14",
  "Local implemented, fail-closed.",
  "first local contract slice",
  "proofBoundDestinationCommitment",
  "sha256:<64 lowercase hex>",
  "proof-bound-destination-commitment",
  "operator/private-pool-v2-server.mjs",
  "fingerprints and replay checks",
  "src/privacy/privatePoolV2ProtocolSettlementClient.ts",
  "src/mainnet/actualPrivateSettlementPlan.mjs",
  "src/data/context/PrivacyFlowContext.tsx",
  "src/pay/vantaPayPrivateSettlementAdapter.ts",
  "npm run private-pool-v2:unshield-proof-request-check",
  "npm run private-pool-v2:protocol-client-check",
  "not fresh-address exit privacy",
  "destinationOwner != requester",
]) {
  assert.ok(
    r6aProofBoundDestinationContractNote.includes(phrase),
    `R6A proof-bound destination contract note missing ${phrase}`,
  );
}

for (const phrase of [
  "vantaPrivatePoolV2RoleServiceEntrypoints",
  "getVantaPrivatePoolV2RoleServiceEntrypoint",
  "startVantaPrivatePoolV2IndexerService",
  "startVantaPrivatePoolV2ProverService",
  "startVantaPrivatePoolV2RelayerService",
  "startVantaPrivatePoolV2VerifierService",
  "not production shared-tree evidence",
  "not production prover runtime evidence",
  "not real-funds relayer readiness",
  "not on-chain proof verification evidence",
]) {
  assert.ok(serviceNetworkSource.includes(phrase), `service network source missing ${phrase}`);
}

for (const phrase of [
  "vantaPrivatePoolV2IndexerServiceEntrypoint",
  "vantaPrivatePoolV2ProverServiceEntrypoint",
  "vantaPrivatePoolV2RelayerServiceEntrypoint",
  "vantaPrivatePoolV2VerifierServiceEntrypoint",
  "startVantaPrivatePoolV2IndexerService",
  "startVantaPrivatePoolV2ProverService",
  "startVantaPrivatePoolV2RelayerService",
  "startVantaPrivatePoolV2VerifierService",
]) {
  assert.ok(roleEntrypointSources.includes(phrase), `role entrypoint source missing ${phrase}`);
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
  "Initial Intake Lumi Hygiene (Historical)",
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
  "npm run send:direct-viewing-key-exchange-check",
  "npm run private-pool-v2:unshield-proof-request-check",
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
  packageJson.scripts["actions:legacy-v1-memo-quarantine-check"],
  "node scripts/check-vanta-legacy-v1-memo-quarantine.mjs",
  "package.json must expose actions:legacy-v1-memo-quarantine-check.",
);
assert.equal(
  packageJson.scripts["private-vault:crypto-check"],
  "node scripts/check-vanta-private-mode-contract.mjs",
  "package.json must expose private-vault:crypto-check.",
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
assert.equal(
  packageJson.scripts["send:direct-viewing-key-exchange-check"],
  "node scripts/check-vanta-send-direct-viewing-key-exchange.mjs",
  "package.json must expose send:direct-viewing-key-exchange-check.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:unshield-proof-request-check"],
  "node scripts/check-vanta-private-pool-v2-unshield-proof-request.mjs",
  "package.json must expose private-pool-v2:unshield-proof-request-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes(
    "npm run send:direct-viewing-key-exchange-check",
  ),
  "truth:privacy-claim-gate must include send:direct-viewing-key-exchange-check.",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"]?.includes(
    "npm run private-pool-v2:unshield-proof-request-check",
  ),
  "private-pool-v2:verify must include private-pool-v2:unshield-proof-request-check.",
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
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"]?.includes("npm run private-vault:crypto-check"),
  "zk:feedback-loop-check must include private-vault:crypto-check.",
);

console.log("Vanta Claude privacy audit tracker check: PASS");
