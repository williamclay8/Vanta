import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const jsonMode = process.argv.includes("--json");

const requiredFiles = [
  {
    path: "src/privacy/privatePoolV2Types.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION",
      "VantaPrivatePoolV2Asset",
      "VantaPrivatePoolV2Indexer",
      "VantaPrivatePoolV2Relayer",
      "VantaPrivatePoolV2Prover",
      "VantaPrivatePoolV2ProofSystem",
      "VantaPrivatePoolV2VerifierRegistry",
      "VantaPrivatePoolV2Protocol",
    ],
  },
	  {
	    path: "src/privacy/privatePoolV2CapabilityProfile.ts",
	    exports: [
	      "getVantaPrivatePoolV2CapabilityProfile",
	      "createVantaPrivatePoolV2PrivacyAdapter",
	    ],
	  },
  {
    path: "src/privacy/privatePoolV2Benchmark.ts",
    exports: ["getVantaPrivatePoolV2BenchmarkSnapshot"],
  },
  {
    path: "src/privacy/privatePoolV2MockRuntime.ts",
    exports: ["createVantaPrivatePoolV2MockRuntime"],
  },
  {
    path: "src/privacy/privatePoolV2RemoteServices.ts",
    exports: [
      "createVantaPrivatePoolV2RemoteIndexer",
      "createVantaPrivatePoolV2RemoteProver",
      "createVantaPrivatePoolV2RemoteRelayer",
      "createVantaPrivatePoolV2RemoteRuntime",
      "createVantaPrivatePoolV2RemoteVerifierRegistry",
    ],
  },
  {
    path: "src/privacy/privatePoolV2LocalIndexer.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_LOCAL_INDEXER_SCHEME",
      "createVantaPrivatePoolV2LocalIndexer",
      "VantaPrivatePoolV2LocalIndexer",
    ],
  },
  {
    path: "src/privacy/privatePoolV2LocalRelayer.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_LOCAL_RELAYER_SCHEME",
      "createVantaPrivatePoolV2LocalRelayer",
      "VantaPrivatePoolV2LocalRelayer",
    ],
  },
  {
    path: "src/privacy/privatePoolV2LocalProver.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_LOCAL_PROVER_SCHEME",
      "createVantaPrivatePoolV2LocalProver",
      "VantaPrivatePoolV2LocalProver",
    ],
  },
  {
    path: "src/privacy/privatePoolV2LocalVerifierRegistry.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_LOCAL_VERIFIER_REGISTRY_SCHEME",
      "createVantaPrivatePoolV2LocalVerifierRegistry",
      "VantaPrivatePoolV2LocalVerifierRegistry",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ProofRequests.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_SHIELD_PROOF_REQUEST_VERSION",
      "VANTA_PRIVATE_POOL_V2_CLAIM_PROOF_REQUEST_VERSION",
	      "VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_PROOF_REQUEST_VERSION",
	      "VANTA_PRIVATE_POOL_V2_SEND_PROOF_REQUEST_VERSION",
	      "VANTA_PRIVATE_POOL_V2_UNSHIELD_PROOF_REQUEST_VERSION",
	      "VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_PROOF_REQUEST_VERSION",
      "VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID",
      "VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS",
      "createVantaPrivatePoolV2ShieldProofRequest",
      "createVantaPrivatePoolV2ClaimProofRequest",
	      "createVantaPrivatePoolV2HiddenEconomicsProofRequest",
	      "createVantaPrivatePoolV2SendProofRequest",
	      "computeVantaPrivatePoolV2UnshieldPublicInputHash",
	      "createVantaPrivatePoolV2UnshieldProofRequest",
	      "createVantaPrivatePoolV2SwapToShieldedProofRequest",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ShieldCapabilityAdapter.ts",
    exports: [
      "PrivatePoolV2ShieldCapabilityProofRequestArgs",
      "createPrivatePoolV2ShieldProofRequestFromCapability",
    ],
  },
  {
    path: "src/privacy/privatePoolV2SettlementPolicy.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY_VERSION",
      "VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY",
      "VantaPrivatePoolV2SettlementPolicy",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ShieldCircuitFixture.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_SHIELD_CIRCUIT_FIXTURE_VERSION",
      "createVantaPrivatePoolV2ShieldCircuitFixture",
      "computeVantaPrivatePoolV2ShieldEconomicsCommitment",
      "computeVantaPrivatePoolV2ShieldPublicInputHash",
      "serializeVantaPrivatePoolV2ShieldCircuitFixtureToToml",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ClaimCircuitFixture.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_CLAIM_CIRCUIT_FIXTURE_VERSION",
      "createVantaPrivatePoolV2ClaimCircuitFixture",
      "computeVantaPrivatePoolV2ClaimNullifier",
      "computeVantaPrivatePoolV2ClaimPublicInputHash",
      "serializeVantaPrivatePoolV2ClaimCircuitFixtureToToml",
    ],
  },
  {
    path: "src/privacy/privatePoolV2SendCircuitFixture.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_SEND_CIRCUIT_FIXTURE_VERSION",
      "createVantaPrivatePoolV2SendCircuitFixture",
      "computeVantaPrivatePoolV2SendRootFromLeaf",
      "computeVantaPrivatePoolV2SendNullifier",
      "computeVantaPrivatePoolV2SendEconomicsCommitment",
      "computeVantaPrivatePoolV2SendPublicInputHash",
      "serializeVantaPrivatePoolV2SendCircuitFixtureToToml",
    ],
  },
  {
    path: "src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_CIRCUIT_FIXTURE_VERSION",
      "createVantaPrivatePoolV2SwapToShieldedCircuitFixture",
      "computeVantaPrivatePoolV2SwapToShieldedRootFromLeaf",
      "computeVantaPrivatePoolV2SwapToShieldedNullifierOrReplayCommitment",
      "computeVantaPrivatePoolV2SwapToShieldedPublicInputHash",
      "serializeVantaPrivatePoolV2SwapToShieldedCircuitFixtureToToml",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ActualPrivateSpendCircuitFixture.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_ACTUAL_PRIVATE_SPEND_CIRCUIT_FIXTURE_VERSION",
      "createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture",
      "computeVantaPrivatePoolV2ActualPrivateSpendNullifier",
      "computeVantaPrivatePoolV2ActualPrivateSpendPublicInputHash",
      "computeVantaPrivatePoolV2ActualPrivateSpendRoot",
      "serializeVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureToToml",
    ],
  },
];

const requiredTextFiles = [
  {
    path: "src/privacy/privatePoolV2SettlementPolicy.ts",
    markers: [
      "mockProofRealFundsBlocked",
      "productionDurableStoreRequired",
      "productionProofSystemRequired",
    ],
  },
  {
    path: "src/privacy/privatePoolV2CapabilityProfile.ts",
    markers: [
      "currentVerifiedPrivacyFlags",
      "targetPrivacyFlags",
      "privacyClaimAllowed: false",
      "productionPrivateReady: false",
      "requiredBlockingEvidence",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_shield_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_shield_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr",
    markers: [
      "bind_shield_public_inputs",
      "compute_economics_commitment",
      "economics_blinding",
      "economics_commitment",
      "bn254::hash_5",
      "bn254::hash_8",
      "compute_root_from_leaf",
      "append_path",
      "assert(computed_previous_root == previous_root)",
      "assert(computed_economics_commitment == economics_commitment)",
      "assert(computed_output_root == output_root)",
      "assert(computed_public_input_hash == shield_public_input_hash)",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_claim_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_claim_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_claim_entry/src/main.nr",
    markers: [
      "bind_claim_public_inputs",
      "compute_root",
      "compute_nullifier",
      "membership_path",
      "assert(computed_input_root == input_root)",
      "assert(computed_nullifier == nullifier)",
      "assert(computed_public_input_hash == claim_public_input_hash)",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_send_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_send_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_send_entry/src/main.nr",
    markers: [
      "bind_send_public_inputs",
      "compute_send_economics_commitment",
      "compute_root",
      "compute_nullifier",
      "compute_root_from_leaf",
      "membership_path",
      "recipient_append_path",
      "change_append_path",
      "input_amount: u128",
      "recipient_amount: u128",
      "change_amount: u128",
      "assert(computed_input_root == input_root)",
      "assert(computed_nullifier == nullifier)",
      "assert(input_amount == recipient_amount + change_amount)",
      "assert(computed_economics_commitment == economics_commitment)",
      "assert(computed_recipient_previous_root == input_root)",
      "assert(computed_recipient_output_root == recipient_output_root)",
      "assert(computed_change_previous_root == recipient_output_root)",
      "assert(computed_change_output_root == change_output_root)",
      "assert(computed_public_input_hash == send_public_input_hash)",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_swap_to_shielded_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr",
    markers: [
      "bind_swap_public_inputs",
      "compute_root",
      "compute_nullifier",
      "compute_root_from_leaf",
      "membership_path",
      "output_append_path",
      "assert(computed_input_root == input_root)",
      "assert(computed_nullifier_or_replay_commitment == nullifier_or_replay_commitment)",
      "assert(computed_previous_root == input_root)",
      "assert(computed_output_root == output_root)",
      "assert(computed_public_input_hash == swap_public_input_hash)",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_actual_private_spend_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr",
    markers: [
      "bind_private_spend_public_inputs",
      "compute_root",
      "compute_nullifier",
      "assert(computed_root == accepted_root)",
      "assert(computed_nullifier == nullifier)",
      "assert(computed_public_input_hash == private_spend_public_input_hash)",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-shield-circuit.mjs",
    markers: ["invalid-binding", "invalid-root", "forged-append-path", "fixture restore: PASS"],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-claim-circuit.mjs",
    markers: ["invalid-binding", "invalid-nullifier", "forged-input-membership", "fixture restore: PASS"],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-send-circuit.mjs",
    markers: [
      "invalid-binding",
      "invalid-nullifier",
      "invalid-output-root",
      "invalid-amount-conservation",
      "forged-recipient-append-path",
      "forged-change-append-path",
      "forged-input-membership",
      "fixture restore: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-swap-to-shielded-circuit.mjs",
    markers: [
      "invalid-binding",
      "invalid-nullifier",
      "invalid-output-root",
      "forged-output-append-path",
      "forged-input-membership",
      "fixture restore: PASS",
    ],
  },
  {
    path: "scripts/write-vanta-private-pool-v2-send-fixture.mjs",
    markers: [
      "privatePoolV2SendCircuitFixture.ts",
      "createVantaPrivatePoolV2SendCircuitFixture",
      "serializeVantaPrivatePoolV2SendCircuitFixtureToToml",
    ],
  },
  {
    path: "scripts/write-vanta-private-pool-v2-claim-fixture.mjs",
    markers: [
      "privatePoolV2ClaimCircuitFixture.ts",
      "createVantaPrivatePoolV2ClaimCircuitFixture",
      "serializeVantaPrivatePoolV2ClaimCircuitFixtureToToml",
    ],
  },
  {
    path: "scripts/write-vanta-private-pool-v2-swap-to-shielded-fixture.mjs",
    markers: [
      "privatePoolV2SwapToShieldedCircuitFixture.ts",
      "createVantaPrivatePoolV2SwapToShieldedCircuitFixture",
      "serializeVantaPrivatePoolV2SwapToShieldedCircuitFixtureToToml",
    ],
  },
  {
    path: "scripts/write-vanta-private-pool-v2-actual-private-spend-fixture.mjs",
    markers: [
      "privatePoolV2ActualPrivateSpendCircuitFixture.ts",
      "createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture",
      "serializeVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureToToml",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-local-runtime.mjs",
    markers: [
      "local indexer append: PASS",
      "local verifier shield commitment append: PASS",
      "local verifier shield receipt: PASS",
      "Expected local shield receipt to preserve mock proof system.",
      "local verifier claim receipt: PASS",
      "local verifier nullifier replay rejection: PASS",
      "local verifier private-send nullifier and output append: PASS",
      "local verifier private-send atomic rejection: PASS",
      "local indexer nullifier replay rejection: PASS",
      "local claim proof verify: PASS",
      "local prover tamper rejection: PASS",
      "local relayer replay rejection: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-remote-services.mjs",
    markers: [
      "Vanta Private Pool v2 remote services check: PASS",
      "createVantaPrivatePoolV2RemoteRuntime",
      "https://indexer.example",
    ],
  },
  {
    path: "operator/private-pool-v2-service-network.mjs",
    markers: [
      "applyPrivateSendTransition",
      "/v1/private-sends",
      "isStatefulPrivateSendRequest",
      "private-send:${nullifier}",
      "recipientOutputCommitment",
      "changeOutputCommitment",
      "proofSystem: proof.proofSystem",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-service-network.mjs",
    markers: [
      "private-pool-v2 service-network private-send transition: PASS",
      "private-send:field:service-network-send-nullifier",
      "Expected rejected private-send transition not to append partial remote outputs.",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-shield-proof-request.mjs",
    markers: [
      "shield proof request public inputs: PASS",
      "shield proof request positive amount guard: PASS",
      "shield proof request owner guard: PASS",
      "shield proof request economics guard: PASS",
      "economics-commitment:field:economics",
      "hidden:economic-terms",
      "claim proof request public inputs: PASS",
      "claim proof request nullifier guard: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-shield-circuit.mjs",
    markers: [
      "invalid-economics-commitment fixture write: PASS",
      "invalid-economics-commitment fixture: expected failure observed",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-swap-to-shielded-proof-request.mjs",
    markers: [
      "private-pool-v2 swap proof request public inputs: PASS",
      "private-pool-v2 swap proof request input-root guard: PASS",
      "private-pool-v2 swap proof request output guard: PASS",
      "swap-public-input-hash:field:swap-public-input-hash",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ShieldCapabilityAdapter.ts",
    markers: [
      "capability.sourceAsset.mintAddress",
      "capability.targetShieldAsset.assetKey",
      "capability.targetShieldAsset.mintAddress",
      "createCapabilityRouteCommitment",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-shield-capability-adapter.mjs",
    markers: [
      "private-pool-v2 shield capability direct proof request: PASS",
      "private-pool-v2 shield capability routed proof request: PASS",
      "private-pool-v2 shield capability unsupported guard: PASS",
    ],
  },
  {
    path: "scripts/prove-vanta-private-pool-v2-circuit.mjs",
    markers: [
      "barretenberg-ultrahonk",
      "swap-to-shielded",
      "actual-private-spend",
      "vanta_private_pool_v2_swap_to_shielded_entry",
      "vanta_private_pool_v2_actual_private_spend_entry",
      "proof generation: PASS",
      "proof verification: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-actual-private-spend-circuit.mjs",
    markers: [
      "invalid-binding",
      "invalid-membership-root",
      "invalid-nullifier",
      "fixture restore: PASS",
    ],
  },
	  {
	    path: "scripts/print-vanta-private-pool-v2-status.mjs",
	    markers: [
	      "Private Pool V2 status",
	      "currentVerifiedPrivacyFlags",
	      "targetPrivacyFlags",
	      "privacyClaimAllowed",
	      "productionPrivateReady",
	      "requiredBlockingEvidence",
	      "nullifierReplayGuard",
	      "reservationMode",
	      "uniquenessScope",
      "productionGate",
      "productionBlockers",
      "protocolActionProofModes",
      "receiptCount",
      "settlementPolicy",
      "verifierRegistry",
      "private-pool-v2:swap-to-shielded-circuit-check",
      "private-pool-v2:swap-to-shielded-prove",
      "private-pool-v2:verify",
    ],
	  },
  {
    path: "operator/private-pool-v2-server.mjs",
    markers: [
      "VANTA_PRIVATE_POOL_V2_STORE_PATH",
      "VANTA_PRIVATE_POOL_V2_DATABASE_URL",
      "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE",
      "remote-services",
      "VANTA_PRIVATE_POOL_V2_INDEXER_URL",
      "VANTA_PRIVATE_POOL_V2_PROVER_URL",
      "VANTA_PRIVATE_POOL_V2_RELAYER_URL",
      "VANTA_PRIVATE_POOL_V2_VERIFIER_URL",
      "settlementPolicy",
      "VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY",
      "proofTrustBoundary",
      "proofTrustBoundaryPayload",
      "mockProofRealFundsAllowed",
      "VANTA_PRIVATE_POOL_V2_REQUIRE_PRODUCTION_PROOF_SYSTEM",
      "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services",
      "shieldRouteEvidence",
      "privatePoolV2SettlementPolicy.ts",
      "protocolActionProofModes",
      "productionReady",
      "reservationMode",
      "durableStoreConfigured",
      "uniquenessScope",
      "/state/private-pool-v2-status",
      "/state/private-pool-v2-receipts",
      "/private-pool-v2/proofs",
      "/private-pool-v2/public/shield-receipts",
      "VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_DEPOSIT_EVIDENCE_MODE",
      "X-Vanta-Shield-Receipt-Deposit-Evidence",
      "getParsedTransaction",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-mock-proof-boundary.mjs",
    markers: [
      "private-pool-v2 production mock runtime rejection: PASS",
      "private-pool-v2 mock proof status boundary: PASS",
      "private-pool-v2 mock proof settlement rejection: PASS",
      "private-pool-v2 direct mock proof rejection: PASS",
      "VANTA_PRIVATE_POOL_V2_REQUIRE_PRODUCTION_PROOF_SYSTEM",
    ],
  },
  {
    path: "operator/private-pool-v2-store.mjs",
    markers: [
      "createPrivatePoolV2ReceiptStore",
      "load",
      "save",
      "snapshotStore",
      "stateVersion",
    ],
  },
  {
    path: ".env.example",
    markers: [
      "VANTA_PRIVATE_POOL_V2_OPERATOR_PORT",
      "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
      "VANTA_PRIVATE_POOL_V2_STORE_PATH",
      "VANTA_PRIVATE_POOL_V2_DATABASE_URL",
      "VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_DEPOSIT_EVIDENCE_MODE",
      "VANTA_PRIVATE_POOL_V2_PUBLIC_SHIELD_RECEIPT_RPC_URL",
      "VITE_VANTA_PRIVATE_POOL_V2_RECEIPT_API_URL",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-operator-http.mjs",
    markers: [
      "private-pool-v2 http status: PASS",
      "private-pool-v2 production database guard: PASS",
      "Expected operator status to be explicit about production readiness.",
      "Expected operator status to expose configured durable storage.",
      "Expected production durable-store settlement policy.",
      "private-pool-v2 http shield proof: PASS",
      "private-pool-v2 http claim replay rejection: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-operator-restart.mjs",
    markers: [
      "private-pool-v2 restart committed transitions accepted: PASS",
      "private-pool-v2 restart receipts restored: PASS",
      "private-pool-v2 restart claim replay rejection: PASS",
      "private-pool-v2 restart protocol settlement replay guard backfill: PASS",
      "private-pool-v2 restart committed transition replay rejection: PASS",
    ],
  },
  {
    path: "programs/vanta_private_pool_v2_spend/src/lib.rs",
    markers: [
      "POOL_AUTHORITY_OFFSET",
      "POOL_LAST_PUBLIC_INPUT_HASH_OFFSET",
      "POOL_NULLIFIER_SET_OFFSET",
      "POOL_OUTPUT_QUEUE_OFFSET",
      "POOL_ROOT_HISTORY_OFFSET",
      "TAG_REGISTER_ROOT",
      "NULLIFIER_MARKER_MAGIC",
      "NULLIFIER_MARKER_SEED",
      "ERR_UNAUTHORIZED_OPERATOR",
      "ERR_ALREADY_INITIALIZED",
      "ERR_POOL_ACCOUNT_MISMATCH",
      "ERR_ROOT_HISTORY_FULL",
      "ERR_DUPLICATE_ROOT",
      "ERR_UNKNOWN_ACCEPTED_ROOT",
      "ERR_NULLIFIER_MARKER_MISMATCH",
      "require_authority",
      "require_readonly_program_account",
      "require_uninitialized",
      "require_pool_account_bindings",
      "require_pool_root_history_binding",
      "fixed_slot_contains",
      "ensure_nullifier_marker",
      "system_instruction::create_account",
      "authority.is_signer",
      "accepted spend evidence",
      "registered accepted root",
    ],
  },
  {
    path: "programs/vanta_private_pool_v2_spend/README.md",
    markers: [
      "no proof verification",
      "operator_authority",
      "must match the pubkey stored during init",
      "pool_state`: 184 bytes",
      "root_history",
      "nullifier_marker",
      "[2, acceptedRoot:32]",
      "[1, nullifier:32, output0:32, output1:32, acceptedRoot:32, publicInputHash:32]",
      "Init is one-time",
      "[\"vanta2nul\", pool_state, nullifier]",
      "supplied `nullifier_set`, `output_queue`, and `root_history` match the pubkeys stored in `pool_state` during init",
      "signer is not the initialized operator authority",
      "supplied nullifier marker PDA",
    ],
  },
  {
    path: "fuzz/vanta_private_pool_v2_spend/src/main.rs",
    markers: [
      "action_unsigned_spend",
      "action_wrong_authority_spend",
      "duplicate nullifier mutated state",
      "failed spend mutated state",
      "POOL_LAST_PUBLIC_INPUT_HASH_OFFSET",
      "POOL_NULLIFIER_SET_OFFSET",
      "POOL_OUTPUT_QUEUE_OFFSET",
      "POOL_ROOT_HISTORY_OFFSET",
      "action_register_root",
      "ERR_UNKNOWN_ACCEPTED_ROOT",
      "NULLIFIER_MARKER_MAGIC",
      "nullifier_marker_pubkey",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-solana-spend-transaction-builder.mjs",
    markers: [
      "requires exactly 7 spend accounts",
      "requires accounts\\[1\\] to be the read-only nullifier set header account",
      "requires accounts\\[3\\] to be the read-only root history account",
      "requires accounts\\[4\\] to be the writable nullifier marker PDA",
      "requires accounts\\[4\\] to match the spend nullifier PDA marker",
      "requires accounts\\[5\\] to be the writable operator authority signer",
      "requires accounts\\[6\\] to be the read-only System Program",
      "operatorAuthority",
      "requires tag=1 and 161-byte spend instruction data",
      "requires relayerFeePayer to equal operatorAuthority",
      "cannot use the Memo program",
      "Vanta Private Pool v2 Solana spend transaction builder check: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-solana-spend-transaction-printer.mjs",
    markers: [
      "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_AUTHORITY",
      "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_ROOT_HISTORY",
      "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_MARKER",
      "operatorAuthority",
      "rootHistory",
      "nullifierMarker",
      "private-pool-v2:solana-spend-transaction-check",
      "Vanta Private Pool v2 Solana spend transaction printer check: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-solana-relayer-submission.mjs",
    markers: [
      "submitPrivateSpend",
      "simulate:true",
      "builderIntegratedSubmission",
      "Vanta Private Pool v2 Solana relayer submission check: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-sbf-abi-status.mjs",
    markers: [
      "target/deploy/vanta_private_pool_v2_spend.so",
      "cargo-build-sbf",
      "const POOL_STATE_LEN: usize = 184;",
      "const SPEND_PAYLOAD_LEN: usize = 1 + HASH_LEN * 5;",
      "NULLIFIER_MARKER_SEED",
      "spendAccountCount: 7",
      "abiFresh",
      "stale-sbf-binary",
      "--check",
    ],
  },
];

const requiredPackageScripts = [
  "private-pool-v2:contract-check",
  "private-pool-v2:benchmark-json",
  "private-pool-v2:local-indexer-check",
  "private-pool-v2:local-relayer-check",
  "private-pool-v2:local-prover-check",
  "private-pool-v2:local-verifier-check",
  "private-pool-v2:mock-proof-boundary-check",
  "private-pool-v2:shield-proof-request-check",
  "private-pool-v2:send-proof-request-check",
  "private-pool-v2:swap-to-shielded-proof-request-check",
  "private-pool-v2:hidden-economics-request-check",
  "private-pool-v2:shield-capability-adapter-check",
  "private-pool-v2:shield-circuit-check",
  "private-pool-v2:send-circuit-check",
  "private-pool-v2:swap-to-shielded-circuit-check",
  "private-pool-v2:actual-private-spend-circuit-check",
  "private-pool-v2:local-runtime-check",
  "private-pool-v2:claim-proof-request-check",
  "private-pool-v2:verify",
  "private-pool-v2:claim-circuit-check",
  "private-pool-v2:shield-prove",
  "private-pool-v2:send-prove",
  "private-pool-v2:swap-to-shielded-prove",
  "private-pool-v2:actual-private-spend-prove",
  "private-pool-v2:claim-prove",
  "private-pool-v2:status",
  "private-pool-v2:status-json",
  "private-pool-v2:sbf-abi-status",
  "private-pool-v2:sbf-abi-status-json",
  "private-pool-v2:sbf-abi-check",
  "private-pool-v2:operator",
  "private-pool-v2:http-smoke",
  "private-pool-v2:restart-check",
  "private-pool-v2:service-network-check",
  "private-pool-v2:role-storage-check",
  "private-pool-v2:protocol-client-check",
  "private-pool-v2:postgres-store-check",
  "zk:canonical-note-proving-commitment-check",
  "zk:review-guards-check",
  "private-pool-v2:solana-spend-transaction-builder-check",
  "private-pool-v2:solana-spend-transaction-check",
  "private-pool-v2:solana-relayer-submission-check",
  "private-pool-v2:crucible-check",
];

const requiredVerifyScripts = [
  "npm run zk:review-guards-check",
  "npm run private-pool-v2:solana-spend-transaction-builder-check",
  "npm run private-pool-v2:solana-spend-transaction-check",
  "npm run private-pool-v2:solana-relayer-submission-check",
  "npm run private-pool-v2:sbf-abi-check",
  "npm run private-pool-v2:crucible-check",
];

const failures = [];

for (const file of requiredFiles) {
  const absolutePath = resolve(repoRoot, file.path);

  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${file.path}`);
    continue;
  }

  const source = readFileSync(absolutePath, "utf8");

  for (const exportName of file.exports) {
    const exportPattern = new RegExp(
      `export\\s+(?:class|const|type|interface|function)\\s+${exportName}\\b`,
    );

    if (!exportPattern.test(source)) {
      failures.push(`Missing export ${exportName} in ${file.path}`);
    }
  }
}

for (const file of requiredTextFiles) {
  const absolutePath = resolve(repoRoot, file.path);

  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${file.path}`);
    continue;
  }

  const source = readFileSync(absolutePath, "utf8");

  for (const marker of file.markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker ${marker} in ${file.path}`);
    }
  }
}

const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

for (const scriptName of requiredPackageScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    failures.push(`Missing package script ${scriptName}`);
  }
}

for (const scriptCall of requiredVerifyScripts) {
  if (!packageJson.scripts?.["private-pool-v2:verify"]?.includes(scriptCall)) {
    failures.push(`private-pool-v2:verify must include ${scriptCall}`);
  }
}

if (failures.length > 0) {
  const result = {
    benchmark: "vanta-private-pool-v2-contract-check",
    failures,
    ok: false,
    requiredFiles,
    requiredTextFiles,
    requiredPackageScripts,
  };

  if (jsonMode) {
    console.error(JSON.stringify(result, null, 2));
  } else {
    console.error("Private Pool V2 contract check: FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }

  process.exit(1);
}

const result = {
  benchmark: "vanta-private-pool-v2-contract-check",
  contractVersion: "vanta-private-pool-v2-contract-0.1",
  files: [...requiredFiles.map((file) => file.path), ...requiredTextFiles.map((file) => file.path)],
  ok: true,
  packageScripts: requiredPackageScripts,
  summary:
    "Private Pool V2 has the benchmark contract, capability profile, and snapshot surface needed to build the Vanta-owned Option B lane.",
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Private Pool V2 contract check: PASS");
  for (const file of [...requiredFiles, ...requiredTextFiles]) {
    console.log(`- ${file.path}`);
  }
}
