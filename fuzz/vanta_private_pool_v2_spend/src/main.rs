use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    system_program,
};
use crucible_fuzzer::*;
use crucible_test_context::TxOutcome;
use solana_keypair::Keypair;
#[allow(deprecated)]
use solana_poseidon::{hashv as poseidon_hashv, Endianness, Parameters};
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use std::rc::Rc;

const TAG_INIT: u8 = 0;
const TAG_SPEND: u8 = 1;
const TAG_REGISTER_ROOT: u8 = 2;
const TAG_SPEND_WITH_PROOF: u8 = 3;
const TAG_REGISTER_PROVENANCED_ROOT: u8 = 4;
const TAG_REGISTER_VERIFIER_KEY: u8 = 5;
const TAG_UNSHIELD: u8 = 6;
const TAG_REGISTER_VAULT_ASSET: u8 = 7;
const TAG_APPEND_TREE_LEAF: u8 = 9;

const VERSION: u8 = 1;
const POOL_MAGIC: &[u8; 8] = b"VNTA2POL";
const NULLIFIER_MAGIC: &[u8; 8] = b"VNTA2NUL";
const NULLIFIER_MARKER_MAGIC: &[u8; 8] = b"VNTA2NMK";
const OUTPUT_MAGIC: &[u8; 8] = b"VNTA2OUT";
const OUTPUT_RECORD_MAGIC: &[u8; 8] = b"VNTA2ORC";
const ROOT_MAGIC: &[u8; 8] = b"VNTA2ROT";
const ROOT_RECORD_MAGIC: &[u8; 8] = b"VNTA2RRC";
const TREE_MAGIC: &[u8; 8] = b"VNTA2TRE";
const TREE_LEAF_MARKER_MAGIC: &[u8; 8] = b"VNTA2LEF";
const VERIFIER_KEY_MAGIC: &[u8; 8] = b"VNTA2VKY";
const VAULT_ASSET_MAGIC: &[u8; 8] = b"VNTA2AST";

/// Production Readiness Artifact — Crucible SOL-specific scenarios (per design doc + status note Recommended Next Action #7)
/// TODO (on-chain TAG6 SOL impl): Extend invariant_test harness with:
/// - SOL vault PDA registration (VAULT_ASSET_KIND_SOL=2, sentinel asset_id, system account lamports holder)
/// - TAG_UNSHIELD=6 for SOL: system_program account present, system_instruction::transfer CPI from PDA (signed), no token CPI
/// - Sentinel bypass preflight (zero asset_id allowed only for sentinel in SOL path)
/// - Duplicate nullifier / invalid proof no-mutation for SOL unshield (lamports not released)
/// - Indexer cross-ref: UnshieldEvent + on-chain transfer log match for amount/sentinel
/// - Crucible actions: native_sol_shield_deposit (SystemProgram.transfer + memo), native_sol_unshield_proof_request (sentinel note in unified tree)
/// Current harness: SPL-only (VAULT_ASSET_KIND_SPL) with unified 569-byte gnark unshield payload + 14-account metas.
/// SOL TAG6 unshield scenarios remain TODO. Run `npm run private-pool-v2:crucible-check` (dry-run) in regression.
/// References: 2026-05-14-native-sol-private-pool-v2-integration.md §11, VANTA_ZK_REVIEW.md U2.1, architecture blocker map A1-TAG6, mainnet worksheet SOL PDA entries.
/// All SOL TAG6 scenarios remain fail-closed until program impl + live evidence. Lumi hygiene recorded in wiki/meta/log.md + daily note.
const NULLIFIER_MARKER_SEED: &[u8] = b"vanta2nul";
const OUTPUT_RECORD_SEED: &[u8] = b"vanta2out";
const ROOT_RECORD_SEED: &[u8] = b"vanta2root";
const TREE_LEAF_MARKER_SEED: &[u8] = b"vanta2leaf";
const VAULT_AUTHORITY_SEED: &[u8] = b"vanta2vault";
const VERIFIER_KEY_SEED: &[u8] = b"vanta2vkey";
const VAULT_ASSET_SEED: &[u8] = b"vanta2asset";

const HEADER_LEN: usize = 16;
const COUNT_OFFSET: usize = 12;
const POOL_STATE_LEN: usize = 224;
const POOL_SPEND_COUNT_OFFSET: usize = 16;
const POOL_AUTHORITY_OFFSET: usize = 24;
const POOL_LAST_PUBLIC_INPUT_HASH_OFFSET: usize = 56;
const POOL_NULLIFIER_SET_OFFSET: usize = 88;
const POOL_OUTPUT_QUEUE_OFFSET: usize = 120;
const POOL_ROOT_HISTORY_OFFSET: usize = 152;
const POOL_TREE_STATE_OFFSET: usize = 184;
const POOL_VERIFIER_WIRED_OFFSET: usize = POOL_TREE_STATE_OFFSET + HASH_LEN;
const POOL_VERIFIER_NOT_WIRED: u8 = 0;

const HASH_LEN: usize = 32;
const MERKLE_TREE_DEPTH: usize = 20;
const TREE_ZERO_NODE_COUNT: usize = MERKLE_TREE_DEPTH + 1;
const TREE_CAPACITY: u64 = 1u64 << MERKLE_TREE_DEPTH;
const EXIT_AMOUNT_LEN: usize = 8;
const SPEND_WITH_PROOF_GNARK_PROOF_LEN: usize = 324;
const SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN: usize = 44;
const UNSHIELD_GNARK_PROOF_LEN: usize = SPEND_WITH_PROOF_GNARK_PROOF_LEN;
const UNSHIELD_GNARK_PUBLIC_WITNESS_LEN: usize = SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN;
const OUTPUT_RECORD_PDA_LEN: usize = HEADER_LEN + 8 + HASH_LEN * 4;
const OUTPUT_RECORD_INDEX_OFFSET: usize = HEADER_LEN;
const OUTPUT_RECORD_POOL_OFFSET: usize = HEADER_LEN + 8;
const OUTPUT_RECORD_OUTPUT0_OFFSET: usize = OUTPUT_RECORD_POOL_OFFSET + HASH_LEN;
const OUTPUT_RECORD_OUTPUT1_OFFSET: usize = OUTPUT_RECORD_OUTPUT0_OFFSET + HASH_LEN;
const OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET: usize = OUTPUT_RECORD_OUTPUT1_OFFSET + HASH_LEN;
const NULLIFIER_MARKER_LEN: usize = HEADER_LEN + HASH_LEN * 2;
const NULLIFIER_MARKER_POOL_OFFSET: usize = HEADER_LEN;
const NULLIFIER_MARKER_NULLIFIER_OFFSET: usize = HEADER_LEN + HASH_LEN;
const ROOT_RECORD_ACCOUNT_LEN: usize = HEADER_LEN + 8 + HASH_LEN * 4 + 8 + 4 + 1;
const ROOT_RECORD_SEQUENCE_OFFSET: usize = HEADER_LEN;
const ROOT_RECORD_POOL_OFFSET: usize = HEADER_LEN + 8;
const ROOT_RECORD_PREVIOUS_ROOT_OFFSET: usize = ROOT_RECORD_POOL_OFFSET + HASH_LEN;
const ROOT_RECORD_ACCEPTED_ROOT_OFFSET: usize = ROOT_RECORD_PREVIOUS_ROOT_OFFSET + HASH_LEN;
const ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET: usize =
    ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN;
const ROOT_RECORD_LEAF_INDEX_BASE_OFFSET: usize =
    ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN;
const ROOT_RECORD_LEAF_COUNT_OFFSET: usize = ROOT_RECORD_LEAF_INDEX_BASE_OFFSET + 8;
const ROOT_RECORD_TRANSITION_KIND_OFFSET: usize = ROOT_RECORD_LEAF_COUNT_OFFSET + 4;
const TREE_STATE_LEN: usize = 736;
const TREE_DEPTH_OFFSET: usize = HEADER_LEN + HASH_LEN;
const TREE_NEXT_LEAF_INDEX_OFFSET: usize = TREE_DEPTH_OFFSET + 8;
const TREE_CURRENT_ROOT_OFFSET: usize = TREE_NEXT_LEAF_INDEX_OFFSET + 8;
const TREE_FRONTIER_OFFSET: usize = TREE_CURRENT_ROOT_OFFSET + HASH_LEN;
const TREE_LEAF_MARKER_LEN: usize = HEADER_LEN + HASH_LEN * 2 + 8;
const TREE_LEAF_MARKER_POOL_OFFSET: usize = HEADER_LEN;
const TREE_LEAF_MARKER_LEAF_OFFSET: usize = TREE_LEAF_MARKER_POOL_OFFSET + HASH_LEN;
const TREE_LEAF_MARKER_INDEX_OFFSET: usize = TREE_LEAF_MARKER_LEAF_OFFSET + HASH_LEN;
const VERIFIER_KEY_ACCOUNT_LEN: usize = HEADER_LEN + HASH_LEN * 3;
const VERIFIER_KEY_POOL_OFFSET: usize = HEADER_LEN;
const VERIFIER_KEY_HASH_OFFSET: usize = HEADER_LEN + HASH_LEN;
const VERIFIER_KEY_PROGRAM_ID_OFFSET: usize = VERIFIER_KEY_HASH_OFFSET + HASH_LEN;
const VAULT_ASSET_ACCOUNT_LEN: usize = HEADER_LEN + HASH_LEN * 6 + 2;
const VAULT_ASSET_POOL_OFFSET: usize = HEADER_LEN;
const VAULT_ASSET_EXIT_ASSET_ID_OFFSET: usize = VAULT_ASSET_POOL_OFFSET + HASH_LEN;
const VAULT_ASSET_MINT_OFFSET: usize = VAULT_ASSET_EXIT_ASSET_ID_OFFSET + HASH_LEN;
const VAULT_ASSET_VAULT_AUTHORITY_OFFSET: usize = VAULT_ASSET_MINT_OFFSET + HASH_LEN;
const VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET: usize = VAULT_ASSET_VAULT_AUTHORITY_OFFSET + HASH_LEN;
const VAULT_ASSET_TOKEN_PROGRAM_OFFSET: usize = VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET + HASH_LEN;
const VAULT_ASSET_KIND_OFFSET: usize = VAULT_ASSET_TOKEN_PROGRAM_OFFSET + HASH_LEN;
const VAULT_ASSET_RELEASE_ENABLED_OFFSET: usize = VAULT_ASSET_KIND_OFFSET + 1;
const VAULT_ASSET_KIND_SPL: u8 = 1;
const SPL_TOKEN_PROGRAM_ID: Pubkey =
    solana_pubkey::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_ACCOUNT_LEN: usize = 165;
const TOKEN_ACCOUNT_MINT_OFFSET: usize = 0;
const TOKEN_ACCOUNT_OWNER_OFFSET: usize = 32;

const ERR_DUPLICATE_NULLIFIER: u32 = 1;
const ERR_OUTPUT_QUEUE_FULL: u32 = 3;
const ERR_INVALID_HEADER: u32 = 4;
const ERR_STATE_COUNT_MISMATCH: u32 = 5;
const ERR_UNAUTHORIZED_OPERATOR: u32 = 6;
const ERR_ROOT_HISTORY_FULL: u32 = 9;
const ERR_DUPLICATE_ROOT: u32 = 10;
const ERR_UNKNOWN_ACCEPTED_ROOT: u32 = 11;
const ERR_NULLIFIER_MARKER_MISMATCH: u32 = 12;
const ERR_OUTPUT_RECORD_MISMATCH: u32 = 13;
const ERR_PROOF_VERIFIER_NOT_WIRED: u32 = 14;
const ERR_UNSHIELD_RELEASE_NOT_WIRED: u32 = 15;
const ERR_VAULT_AUTHORITY_MISMATCH: u32 = 16;
const ERR_VERIFIER_KEY_MISMATCH: u32 = 17;
const ERR_ROOT_RECORD_MISMATCH: u32 = 18;
const ERR_VAULT_ASSET_MISMATCH: u32 = 19;
const ERR_VAULT_TOKEN_ACCOUNT_MISMATCH: u32 = 20;
const ERR_DESTINATION_TOKEN_ACCOUNT_MISMATCH: u32 = 21;
const ERR_TOKEN_PROGRAM_MISMATCH: u32 = 22;
const ERR_TREE_ROOT_MISMATCH: u32 = 28;
const ERR_DUPLICATE_TREE_LEAF: u32 = 29;

#[derive(Clone)]
struct OutputRecord {
    output_index: u64,
    output0: [u8; HASH_LEN],
    output1: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
}

#[derive(Clone)]
struct RootRecord {
    sequence: u64,
    previous_root: [u8; HASH_LEN],
    accepted_root: [u8; HASH_LEN],
    transition_public_input_hash: [u8; HASH_LEN],
    leaf_index_base: u64,
    leaf_count: u32,
    transition_kind: u8,
}

#[derive(Clone)]
struct VaultAssetRecord {
    exit_asset_id: [u8; HASH_LEN],
    mint: Pubkey,
    vault_authority: Pubkey,
    vault_token_account: Pubkey,
    token_program: Pubkey,
    asset_kind: u8,
}

#[derive(Clone)]
struct VantaPrivatePoolV2Spend {
    ctx: TestContext,
    program_id: Pubkey,
    payer: Rc<Keypair>,
    operator_authority: Rc<Keypair>,
    wrong_operator_authority: Rc<Keypair>,
    pool_state: Pubkey,
    nullifier_set: Pubkey,
    output_queue: Pubkey,
    root_history: Pubkey,
    tree_state: Pubkey,
    c01_verifier_program: Pubkey,
    wrong_pool_state: Pubkey,
    wrong_nullifier_set: Pubkey,
    wrong_output_queue: Pubkey,
    wrong_root_history: Pubkey,
    wrong_tree_state: Pubkey,
    initialized: bool,
    state_error_code: Option<u32>,
    expected_count: usize,
    root_capacity: usize,
    accepted_nullifiers: Vec<[u8; HASH_LEN]>,
    accepted_roots: Vec<[u8; HASH_LEN]>,
    legacy_roots: Vec<[u8; HASH_LEN]>,
    root_records: Vec<RootRecord>,
    appended_tree_leaves: Vec<[u8; HASH_LEN]>,
    registered_verifier_keys: Vec<[u8; HASH_LEN]>,
    registered_vault_assets: Vec<VaultAssetRecord>,
    output_records: Vec<OutputRecord>,
    latest_public_input_hash: [u8; HASH_LEN],
}

#[fuzz_fixture]
impl VantaPrivatePoolV2Spend {
    pub fn setup() -> Self {
        let mut ctx = TestContext::new().with_compute_budget(600_000);
        let program_id = Pubkey::new_unique();

        ctx.add_program(
            &program_id,
            "../../programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so",
        )
        .unwrap();
        let c01_verifier_program = Pubkey::new_unique();
        ctx.add_program(
            &c01_verifier_program,
            "../../programs/vanta_private_pool_v2_spend/target/deploy/vanta_private_pool_v2_spend.so",
        )
        .unwrap();

        let payer = Rc::new(Keypair::new());
        ctx.create_account()
            .pubkey(payer.pubkey())
            .lamports(100_000_000_000)
            .owner(system_program::ID)
            .create()
            .unwrap();
        let operator_authority = Rc::new(Keypair::new());
        let wrong_operator_authority = Rc::new(Keypair::new());
        create_system_account(&mut ctx, operator_authority.pubkey(), 0);
        create_system_account(&mut ctx, wrong_operator_authority.pubkey(), 0);

        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let tree_state = Pubkey::new_unique();
        create_program_accounts(
            &mut ctx,
            &program_id,
            pool_state,
            nullifier_set,
            output_queue,
            root_history,
            tree_state,
            4,
            4,
        );

        let wrong_pool_state = Pubkey::new_unique();
        let wrong_nullifier_set = Pubkey::new_unique();
        let wrong_output_queue = Pubkey::new_unique();
        let wrong_root_history = Pubkey::new_unique();
        let wrong_tree_state = Pubkey::new_unique();
        create_system_account(&mut ctx, wrong_pool_state, POOL_STATE_LEN);
        create_system_account(&mut ctx, wrong_nullifier_set, fixed_slot_len(4, HASH_LEN));
        create_system_account(&mut ctx, wrong_output_queue, HEADER_LEN);
        create_system_account(&mut ctx, wrong_root_history, fixed_slot_len(4, HASH_LEN));
        ctx.create_account()
            .pubkey(wrong_tree_state)
            .lamports(1_000_000)
            .owner(program_id)
            .size(TREE_STATE_LEN)
            .create()
            .unwrap();

        Self {
            ctx,
            program_id,
            payer,
            operator_authority,
            wrong_operator_authority,
            pool_state,
            nullifier_set,
            output_queue,
            root_history,
            tree_state,
            c01_verifier_program,
            wrong_pool_state,
            wrong_nullifier_set,
            wrong_output_queue,
            wrong_root_history,
            wrong_tree_state,
            initialized: false,
            state_error_code: None,
            expected_count: 0,
            root_capacity: 4,
            accepted_nullifiers: Vec::new(),
            accepted_roots: Vec::new(),
            legacy_roots: Vec::new(),
            root_records: Vec::new(),
            appended_tree_leaves: Vec::new(),
            registered_verifier_keys: Vec::new(),
            registered_vault_assets: Vec::new(),
            output_records: Vec::new(),
            latest_public_input_hash: [0; HASH_LEN],
        }
    }

    pub fn action_init_standard(&mut self) {
        self.reset_accounts(4, 4);
        self.send_valid_init();
    }

    pub fn action_init_nullifier_limited(&mut self) {
        self.reset_accounts(3, 4);
        self.send_valid_init();
    }

    pub fn action_init_output_limited(&mut self) {
        self.reset_accounts(4, 4);
        self.send_valid_init();
    }

    pub fn action_init_root_limited(&mut self) {
        self.reset_accounts(4, 3);
        self.send_valid_init();
    }

    pub fn action_spend(&mut self, seed: u64) {
        let accepted_root = self.accepted_root_for_spend(seed);
        let payload = spend_payload(seed, accepted_root);
        self.ensure_spend_placeholders(&payload);
        let before = self.snapshot_accounts_for_payload(&payload);
        let outcome = self.call_authorized(
            payload.data.clone(),
            self.spend_accounts_for_payload(&payload),
        );
        self.check_spend_outcome(seed, outcome, before);
    }

    pub fn action_register_root(&mut self, seed: u64) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }
        let root = make_hash(seed, 4);
        let record = self.root_record_for_registration(seed, root);
        self.ensure_root_record_placeholder(&record.accepted_root);
        let accounts = self.root_registration_accounts_for_root(&record.accepted_root);
        let before = self.snapshot_account_metas(&accounts);
        let outcome = self.call_authorized(provenanced_root_data(&record), accounts.clone());
        if self.accepted_roots.iter().any(|seen| seen == &root) {
            fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
            fuzz_assert_eq!(
                outcome.as_ref().and_then(TxOutcome::error_code),
                Some(ERR_DUPLICATE_ROOT)
            );
            fuzz_assert_eq!(
                before,
                self.snapshot_account_metas(&accounts),
                "duplicate root mutated state"
            );
            return;
        }
        if self.accepted_roots.len() >= self.root_capacity {
            fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
            fuzz_assert_eq!(
                outcome.as_ref().and_then(TxOutcome::error_code),
                Some(ERR_ROOT_HISTORY_FULL)
            );
            fuzz_assert_eq!(
                before,
                self.snapshot_account_metas(&accounts),
                "full root history mutated state"
            );
            return;
        }
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
        if outcome.is_some_and(|o| o.is_success()) {
            self.accepted_roots.push(root);
            self.root_records.push(record);
        }
    }

    pub fn action_append_tree_leaf(&mut self, seed: u64) {
        if !self.initialized
            || self.state_error_code.is_some()
            || self.accepted_roots.len() >= self.root_capacity
        {
            return;
        }
        let leaf_index = self.tree_next_leaf_index();
        if leaf_index >= TREE_CAPACITY {
            return;
        }
        let output_commitment = make_hash(seed, 91);
        if self
            .appended_tree_leaves
            .iter()
            .any(|seen| seen == &output_commitment)
        {
            return;
        }
        let previous_root = self.tree_current_root();
        let Some(expected_root) =
            compute_program_owned_append_root(&self.account_data(self.tree_state), leaf_index, &output_commitment)
        else {
            return;
        };
        let record = RootRecord {
            sequence: self.accepted_roots.len() as u64,
            previous_root,
            accepted_root: expected_root,
            transition_public_input_hash: make_hash(seed, 92),
            leaf_index_base: leaf_index,
            leaf_count: 1,
            transition_kind: 9,
        };
        self.ensure_root_record_placeholder(&record.accepted_root);
        self.ensure_tree_leaf_marker_placeholder(&output_commitment);
        let accounts = self.tree_append_accounts(&record.accepted_root, &output_commitment);
        let before = self.snapshot_account_metas(&accounts);
        let outcome = self.call_authorized(
            append_tree_leaf_data(&output_commitment, &record),
            accounts.clone(),
        );
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
        if outcome.is_some_and(|o| o.is_success()) {
            self.accepted_roots.push(record.accepted_root);
            self.root_records.push(record.clone());
            self.appended_tree_leaves.push(output_commitment);
            self.assert_tree_state(leaf_index + 1, &record.accepted_root);
            self.assert_root_record(&record);
            self.assert_tree_leaf_marker(&output_commitment, leaf_index);
        } else {
            fuzz_assert_eq!(
                before,
                self.snapshot_account_metas(&accounts),
                "failed append mutated tree accounts"
            );
        }
    }

    pub fn action_append_tree_leaf_wrong_expected_root(&mut self, seed: u64) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }
        let leaf_index = self.tree_next_leaf_index();
        if leaf_index >= TREE_CAPACITY {
            return;
        }
        let output_commitment = make_hash(seed, 93);
        let Some(mut wrong_root) =
            compute_program_owned_append_root(&self.account_data(self.tree_state), leaf_index, &output_commitment)
        else {
            return;
        };
        wrong_root[0] ^= 1;
        let record = RootRecord {
            sequence: self.accepted_roots.len() as u64,
            previous_root: self.tree_current_root(),
            accepted_root: wrong_root,
            transition_public_input_hash: make_hash(seed, 94),
            leaf_index_base: leaf_index,
            leaf_count: 1,
            transition_kind: 9,
        };
        let accounts = self.tree_append_accounts(&record.accepted_root, &output_commitment);
        let before = self.snapshot_existing_account_metas(&accounts);
        let outcome = self.call_authorized(append_tree_leaf_data(&output_commitment, &record), accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            outcome.as_ref().and_then(TxOutcome::error_code),
            Some(ERR_TREE_ROOT_MISMATCH)
        );
        fuzz_assert_eq!(
            before,
            self.snapshot_existing_account_metas(&accounts),
            "wrong expected root append mutated state"
        );
    }

    pub fn action_append_tree_leaf_duplicate_leaf(&mut self, seed: u64) {
        self.action_append_tree_leaf(seed);
        if !self.initialized || self.state_error_code.is_some() || self.appended_tree_leaves.is_empty() {
            return;
        }
        let output_commitment = *self.appended_tree_leaves.last().unwrap();
        let leaf_index = self.tree_next_leaf_index();
        if leaf_index >= TREE_CAPACITY || self.accepted_roots.len() >= self.root_capacity {
            return;
        }
        let Some(expected_root) =
            compute_program_owned_append_root(&self.account_data(self.tree_state), leaf_index, &output_commitment)
        else {
            return;
        };
        let record = RootRecord {
            sequence: self.accepted_roots.len() as u64,
            previous_root: self.tree_current_root(),
            accepted_root: expected_root,
            transition_public_input_hash: make_hash(seed, 95),
            leaf_index_base: leaf_index,
            leaf_count: 1,
            transition_kind: 9,
        };
        self.ensure_root_record_placeholder(&record.accepted_root);
        let accounts = self.tree_append_accounts(&record.accepted_root, &output_commitment);
        let before = self.snapshot_existing_account_metas(&accounts);
        let outcome = self.call_authorized(append_tree_leaf_data(&output_commitment, &record), accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            outcome.as_ref().and_then(TxOutcome::error_code),
            Some(ERR_DUPLICATE_TREE_LEAF)
        );
        fuzz_assert_eq!(
            before,
            self.snapshot_existing_account_metas(&accounts),
            "duplicate tree leaf append mutated state"
        );
    }

    pub fn action_append_tree_leaf_wrong_tree_state(&mut self, seed: u64) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }
        let output_commitment = make_hash(seed, 96);
        let leaf_index = self.tree_next_leaf_index();
        if leaf_index >= TREE_CAPACITY {
            return;
        }
        let Some(expected_root) =
            compute_program_owned_append_root(&self.account_data(self.tree_state), leaf_index, &output_commitment)
        else {
            return;
        };
        let record = RootRecord {
            sequence: self.accepted_roots.len() as u64,
            previous_root: self.tree_current_root(),
            accepted_root: expected_root,
            transition_public_input_hash: make_hash(seed, 97),
            leaf_index_base: leaf_index,
            leaf_count: 1,
            transition_kind: 9,
        };
        let accounts = self.tree_append_accounts_with_wrong_tree(&record.accepted_root, &output_commitment);
        let before = self.snapshot_existing_account_metas(&accounts);
        let outcome = self.call_authorized(append_tree_leaf_data(&output_commitment, &record), accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            before,
            self.snapshot_existing_account_metas(&accounts),
            "wrong tree append mutated state"
        );
    }

    pub fn action_register_root_wrong_lineage(&mut self, seed: u64) {
        if !self.initialized
            || self.state_error_code.is_some()
            || self.accepted_roots.len() >= self.root_capacity
        {
            return;
        }
        let root = make_hash(seed.wrapping_add(17), 4);
        if self.accepted_roots.iter().any(|seen| seen == &root) {
            return;
        }
        let mut record = self.root_record_for_registration(seed, root);
        record.previous_root = make_hash(seed, 81);
        if self.accepted_roots.is_empty() && record.previous_root == [0; HASH_LEN] {
            record.previous_root = [1; HASH_LEN];
        }
        if self
            .accepted_roots
            .last()
            .is_some_and(|expected| expected == &record.previous_root)
        {
            record.previous_root = [2; HASH_LEN];
        }
        self.ensure_root_record_placeholder(&record.accepted_root);
        let accounts = self.root_registration_accounts_for_root(&record.accepted_root);
        let before = self.snapshot_account_metas(&accounts);
        let outcome = self.call_authorized(provenanced_root_data(&record), accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            outcome.as_ref().and_then(TxOutcome::error_code),
            Some(ERR_ROOT_RECORD_MISMATCH)
        );
        fuzz_assert_eq!(
            before,
            self.snapshot_account_metas(&accounts),
            "wrong root lineage mutated state"
        );
    }

    pub fn action_register_legacy_root(&mut self, seed: u64) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }
        let root = make_hash(seed, 2);
        let accounts = self.legacy_root_registration_accounts();
        let before = self.snapshot_account_metas(&accounts);
        let outcome = self.call_authorized(register_root_data(root), accounts.clone());
        if self.accepted_roots.iter().any(|seen| seen == &root) {
            fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
            fuzz_assert_eq!(
                outcome.as_ref().and_then(TxOutcome::error_code),
                Some(ERR_DUPLICATE_ROOT)
            );
            fuzz_assert_eq!(
                before,
                self.snapshot_account_metas(&accounts),
                "duplicate legacy root mutated state"
            );
            return;
        }
        if self.accepted_roots.len() >= self.root_capacity {
            fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
            fuzz_assert_eq!(
                outcome.as_ref().and_then(TxOutcome::error_code),
                Some(ERR_ROOT_HISTORY_FULL)
            );
            fuzz_assert_eq!(
                before,
                self.snapshot_account_metas(&accounts),
                "full legacy root history mutated state"
            );
            return;
        }
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
        if outcome.is_some_and(|o| o.is_success()) {
            self.accepted_roots.push(root);
            self.legacy_roots.push(root);
            self.assert_no_root_record_for_legacy_root(&root);
        }
    }

    pub fn action_register_verifier_key(&mut self, seed: u64, selector: u8) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }
        let mode = selector % 6;
        let verifier_key_hash = if mode == 2 {
            [0; HASH_LEN]
        } else {
            make_hash(seed, 75)
        };
        let accounts = match mode {
            3 => self.verifier_key_registration_accounts_with_wrong_pda(&verifier_key_hash),
            4 => self.verifier_key_registration_accounts_with_wrong_authority(&verifier_key_hash),
            5 => self.verifier_key_registration_accounts_unsigned(&verifier_key_hash),
            _ => self.verifier_key_registration_accounts_for_hash(&verifier_key_hash),
        };
        if mode != 3 && mode != 4 && mode != 5 {
            self.ensure_verifier_key_placeholder(&verifier_key_hash);
        }
        let before = self.snapshot_account_metas(&accounts);
        let data = register_verifier_key_data(verifier_key_hash, self.c01_verifier_program);
        let outcome = match mode {
            4 => self.call_wrong_authority(data, accounts.clone()),
            5 => self.call_unsigned(data, accounts.clone()),
            _ => self.call_authorized(data, accounts.clone()),
        };

        match mode {
            0 => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
                if outcome.is_some_and(|o| o.is_success()) {
                    if !self
                        .registered_verifier_keys
                        .iter()
                        .any(|seen| seen == &verifier_key_hash)
                    {
                        self.registered_verifier_keys.push(verifier_key_hash);
                    }
                    self.assert_verifier_key_account(&verifier_key_hash);
                }
            }
            1 => {
                self.register_verifier_key_for_hash(&verifier_key_hash);
                let replay_before = self.snapshot_account_metas(&accounts);
                let replay = self.call_authorized(
                    register_verifier_key_data(verifier_key_hash, self.c01_verifier_program),
                    accounts.clone(),
                );
                fuzz_assert!(replay.as_ref().is_some_and(TxOutcome::is_success));
                fuzz_assert_eq!(
                    replay_before,
                    self.snapshot_account_metas(&accounts),
                    "idempotent verifier-key replay mutated state"
                );
                self.assert_verifier_key_account(&verifier_key_hash);
                return;
            }
            2 => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
            }
            3 => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
                fuzz_assert_eq!(
                    outcome.as_ref().and_then(TxOutcome::error_code),
                    Some(ERR_VERIFIER_KEY_MISMATCH)
                );
            }
            4 => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
                fuzz_assert_eq!(
                    outcome.as_ref().and_then(TxOutcome::error_code),
                    Some(ERR_UNAUTHORIZED_OPERATOR)
                );
            }
            _ => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
            }
        }

        if mode != 0 {
            fuzz_assert_eq!(
                before,
                self.snapshot_account_metas(&accounts),
                "failed verifier-key registration mutated state"
            );
        }
    }

    pub fn action_register_vault_asset(&mut self, seed: u64, selector: u8) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }

        let mode = selector % 7;
        let mut record = self.vault_asset_record(seed);
        if mode == 2 {
            record.exit_asset_id = [0; HASH_LEN];
        }
        let accounts = match mode {
            3 => self.vault_asset_registration_accounts_with_wrong_pda(&record),
            4 => self.vault_asset_registration_accounts_with_wrong_authority(&record),
            5 => self.vault_asset_registration_accounts_unsigned(&record),
            6 => self.vault_asset_registration_accounts_with_wrong_vault_authority(&record),
            _ => self.vault_asset_registration_accounts_for_record(&record),
        };
        if mode != 3 {
            self.ensure_vault_asset_placeholder(&record.exit_asset_id);
        }
        self.ensure_vault_authority_placeholder(&record.exit_asset_id);
        let before = self.snapshot_account_metas(&accounts);
        let data = register_vault_asset_data(&record);
        let outcome = match mode {
            4 => self.call_wrong_authority(data, accounts.clone()),
            5 => self.call_unsigned(data, accounts.clone()),
            _ => self.call_authorized(data, accounts.clone()),
        };

        match mode {
            0 => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
                if outcome.is_some_and(|o| o.is_success()) {
                    self.remember_registered_vault_asset(record.clone());
                    self.assert_vault_asset_account(&record);
                }
            }
            1 => {
                self.register_vault_asset_for_record(&record);
                let replay_before = self.snapshot_account_metas(&accounts);
                let replay =
                    self.call_authorized(register_vault_asset_data(&record), accounts.clone());
                fuzz_assert!(replay.as_ref().is_some_and(TxOutcome::is_success));
                fuzz_assert_eq!(
                    replay_before,
                    self.snapshot_account_metas(&accounts),
                    "idempotent vault-asset replay mutated state"
                );
                self.assert_vault_asset_account(&record);
                return;
            }
            2 => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
            }
            3 => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
                fuzz_assert_eq!(
                    outcome.as_ref().and_then(TxOutcome::error_code),
                    Some(ERR_VAULT_ASSET_MISMATCH)
                );
            }
            4 => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
                fuzz_assert_eq!(
                    outcome.as_ref().and_then(TxOutcome::error_code),
                    Some(ERR_UNAUTHORIZED_OPERATOR)
                );
            }
            6 => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
                fuzz_assert_eq!(
                    outcome.as_ref().and_then(TxOutcome::error_code),
                    Some(ERR_VAULT_AUTHORITY_MISMATCH)
                );
            }
            _ => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
            }
        }

        if mode != 0 {
            fuzz_assert_eq!(
                before,
                self.snapshot_account_metas(&accounts),
                "failed vault-asset registration mutated state"
            );
        }
    }

    pub fn action_spend_duplicate(&mut self) {
        let Some(nullifier) = self.accepted_nullifiers.last().copied() else {
            return;
        };
        let payload = SpendPayload {
            data: spend_data(
                nullifier,
                make_hash(7, 21),
                make_hash(7, 22),
                self.accepted_roots
                    .last()
                    .copied()
                    .unwrap_or(make_hash(7, 4)),
                make_hash(7, 23),
            ),
            nullifier,
            output0: make_hash(7, 21),
            output1: make_hash(7, 22),
            public_input_hash: make_hash(7, 23),
        };
        self.ensure_spend_placeholders(&payload);
        let before = self.snapshot_accounts_for_payload(&payload);
        let outcome = self.call_authorized(
            payload.data.clone(),
            self.spend_accounts_for_payload(&payload),
        );
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            outcome.as_ref().and_then(TxOutcome::error_code),
            Some(ERR_DUPLICATE_NULLIFIER)
        );
        fuzz_assert_eq!(
            before,
            self.snapshot_accounts_for_payload(&payload),
            "duplicate nullifier mutated state"
        );
    }

    pub fn action_spend_duplicate_output_record(&mut self, seed: u64) {
        let Some(existing_record) = self.output_records.last().cloned() else {
            return;
        };
        let accepted_root = self.accepted_root_for_spend(seed);
        let mut nullifier = make_hash(seed.wrapping_add(10_000), 31);
        while self
            .accepted_nullifiers
            .iter()
            .any(|seen| seen == &nullifier)
        {
            nullifier[0] = nullifier[0].wrapping_add(1);
        }
        let payload = SpendPayload {
            data: spend_data(
                nullifier,
                existing_record.output0,
                existing_record.output1,
                accepted_root,
                existing_record.public_input_hash,
            ),
            nullifier,
            output0: existing_record.output0,
            output1: existing_record.output1,
            public_input_hash: existing_record.public_input_hash,
        };
        self.ensure_spend_placeholders(&payload);
        let before = self.snapshot_accounts_for_payload(&payload);
        let outcome = self.call_authorized(
            payload.data.clone(),
            self.spend_accounts_for_payload(&payload),
        );
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            outcome.as_ref().and_then(TxOutcome::error_code),
            Some(ERR_OUTPUT_RECORD_MISMATCH)
        );
        fuzz_assert_eq!(
            before,
            self.snapshot_accounts_for_payload(&payload),
            "duplicate output-record call mutated state"
        );
    }

    pub fn action_spend_with_proof_preflight(&mut self, seed: u64, selector: u8) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }

        let mode = selector % 9;
        let accepted_root = match mode {
            1 => make_hash(seed, 94),
            6 => {
                self.ensure_legacy_root(seed.wrapping_add(606));
                let Some(root) = self.legacy_roots.last().copied() else {
                    return;
                };
                root
            }
            0 | 2 | 3 | 4 | 5 | 7 => {
                self.ensure_provenanced_root(seed.wrapping_add(505));
                let Some(record) = self.root_records.last().cloned() else {
                    return;
                };
                record.accepted_root
            }
            _ => self.accepted_root_for_spend(seed),
        };
        let mut payload = spend_with_proof_payload(seed, accepted_root);
        if mode == 4 {
            let Some(consumed) = self.accepted_nullifiers.last().copied() else {
                return;
            };
            payload = spend_with_proof_payload_with_nullifier(seed, accepted_root, consumed);
        }
        if mode == 0 {
            self.register_verifier_key_for_hash(&payload.verifier_key_hash);
        }

        self.ensure_spend_with_proof_placeholders(&payload);
        if mode == 7 {
            let pool_before = self.ctx.read_account(&self.pool_state).unwrap();
            let output_before = self.ctx.read_account(&self.output_queue).unwrap();
            self.ctx
                .update_account(&self.pool_state, |data| {
                    data[POOL_SPEND_COUNT_OFFSET..POOL_SPEND_COUNT_OFFSET + 8]
                        .copy_from_slice(&(u32::MAX as u64).to_le_bytes());
                })
                .unwrap();
            self.ctx
                .update_account(&self.output_queue, |data| {
                    data[COUNT_OFFSET..COUNT_OFFSET + 4].copy_from_slice(&u32::MAX.to_le_bytes());
                })
                .unwrap();

            let accounts = self.spend_with_proof_accounts_for_payload(&payload);
            let before = self.snapshot_account_metas(&accounts);
            let outcome = self.call_authorized(payload.data.clone(), accounts.clone());
            fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
            fuzz_assert_eq!(
                outcome.as_ref().and_then(TxOutcome::error_code),
                Some(ERR_OUTPUT_QUEUE_FULL)
            );
            fuzz_assert_eq!(
                before,
                self.snapshot_account_metas(&accounts),
                "spend-with-proof full output counter preflight mutated account bytes or lamports"
            );
            self.ctx
                .write_account(&self.pool_state, pool_before)
                .unwrap();
            self.ctx
                .write_account(&self.output_queue, output_before)
                .unwrap();
            return;
        }

        let (data, accounts, expected_code, forbidden_code) = match mode {
            0 => (
                payload.data.clone(),
                self.spend_with_proof_accounts_for_payload(&payload),
                self.accepted_roots
                    .is_empty()
                    .then_some(ERR_UNKNOWN_ACCEPTED_ROOT)
                    .or(Some(ERR_PROOF_VERIFIER_NOT_WIRED)),
                None,
            ),
            1 => (
                payload.data.clone(),
                self.spend_with_proof_accounts_for_payload(&payload),
                Some(ERR_UNKNOWN_ACCEPTED_ROOT),
                None,
            ),
            2 => (
                payload.data.clone(),
                self.spend_with_proof_accounts_with_wrong_verifier(&payload),
                self.accepted_roots
                    .is_empty()
                    .then_some(ERR_UNKNOWN_ACCEPTED_ROOT)
                    .or(Some(ERR_VERIFIER_KEY_MISMATCH)),
                None,
            ),
            3 => (
                payload.data.clone(),
                self.spend_with_proof_accounts_with_writable_verifier(&payload),
                self.accepted_roots
                    .is_empty()
                    .then_some(ERR_UNKNOWN_ACCEPTED_ROOT),
                None,
            ),
            4 => (
                payload.data.clone(),
                self.spend_with_proof_accounts_for_payload(&payload),
                self.accepted_roots
                    .is_empty()
                    .then_some(ERR_UNKNOWN_ACCEPTED_ROOT)
                    .or(Some(ERR_DUPLICATE_NULLIFIER)),
                None,
            ),
            5 => (
                payload.data.clone(),
                self.spend_with_proof_accounts_with_wrong_root_record(&payload),
                Some(ERR_ROOT_RECORD_MISMATCH),
                None,
            ),
            6 => (
                payload.data.clone(),
                self.spend_with_proof_accounts_for_payload(&payload),
                None,
                Some(ERR_PROOF_VERIFIER_NOT_WIRED),
            ),
            _ => (
                vec![TAG_SPEND_WITH_PROOF],
                self.spend_with_proof_accounts_for_payload(&payload),
                None,
                None,
            ),
        };

        let before = self.snapshot_account_metas(&accounts);
        let outcome = self.call_authorized(data, accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        if let Some(code) = expected_code {
            fuzz_assert_eq!(outcome.as_ref().and_then(TxOutcome::error_code), Some(code));
        }
        if let Some(code) = forbidden_code {
            fuzz_assert!(
                outcome.as_ref().and_then(TxOutcome::error_code) != Some(code),
                "legacy tag 2 root unexpectedly reached proof-verifier not-wired path"
            );
        }
        fuzz_assert_eq!(
            before,
            self.snapshot_account_metas(&accounts),
            "spend-with-proof preflight mutated account bytes or lamports"
        );
    }

    pub fn action_spend_with_proof_sbf_verifier_cpi_rejects_before_commit(&mut self, seed: u64) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }

        self.ensure_provenanced_root(seed.wrapping_add(505));
        let Some(record) = self.root_records.last().cloned() else {
            return;
        };
        let payload = spend_with_proof_payload(seed, record.accepted_root);
        self.register_verifier_key_for_hash(&payload.verifier_key_hash);
        self.ensure_spend_with_proof_placeholders(&payload);

        let accounts = self.spend_with_proof_accounts_for_payload(&payload);
        let before = self.snapshot_existing_account_metas(&accounts);
        let outcome = self.call_authorized(payload.data.clone(), accounts.clone());

        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert!(
            outcome.as_ref().and_then(TxOutcome::error_code) != Some(ERR_PROOF_VERIFIER_NOT_WIRED),
            "SBF verifier CPI rejection must not be the host-only not-wired boundary"
        );
        fuzz_assert_eq!(
            before,
            self.snapshot_existing_account_metas(&accounts),
            "SBF verifier CPI rejection mutated account bytes or lamports"
        );
    }

    pub fn action_unshield_preflight(&mut self, seed: u64, selector: u8) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }

        let mode = selector % 16;
        let accepted_root = match mode {
            1 => make_hash(seed, 44),
            7 => {
                self.ensure_legacy_root(seed.wrapping_add(707));
                let Some(root) = self.legacy_roots.last().copied() else {
                    return;
                };
                root
            }
            0 | 2 | 3 | 4 | 5 | 6 | 8 | 9 | 10 | 11 | 12 | 13 | 14 => {
                self.ensure_provenanced_root(seed.wrapping_add(606));
                let Some(record) = self.root_records.last().cloned() else {
                    return;
                };
                record.accepted_root
            }
            _ => self
                .accepted_roots
                .last()
                .copied()
                .unwrap_or(make_hash(seed, 4)),
        };
        let mut payload = unshield_payload(seed, accepted_root);
        if mode == 5 {
            let Some(consumed) = self.accepted_nullifiers.last().copied() else {
                return;
            };
            payload = unshield_payload_with_nullifier(seed, accepted_root, consumed);
        }

        self.ensure_unshield_placeholders(&payload);
        if matches!(mode, 0 | 2 | 3 | 4 | 5 | 6 | 14) {
            self.register_vault_asset_for_payload(&payload);
            self.ensure_valid_release_accounts(&payload);
        }
        if mode == 8 {
            if self.is_vault_asset_registered(&payload.exit_asset_id) {
                return;
            }
            self.ensure_unregistered_vault_asset_account(&payload.exit_asset_id);
            self.ensure_valid_release_accounts(&payload);
        }
        if mode == 10 {
            self.register_cross_asset_for_payload(seed, &payload);
            self.ensure_valid_release_accounts(&payload);
        }
        if mode == 11 {
            self.register_vault_asset_for_payload(&payload);
            self.ensure_wrong_vault_token_account(&payload);
        }
        if mode == 12 {
            self.register_vault_asset_for_payload(&payload);
            self.ensure_wrong_destination_token_account(&payload);
        }
        if mode == 13 {
            self.register_vault_asset_for_payload(&payload);
            self.ensure_wrong_token_program_accounts(&payload);
        }
        if mode == 14 {
            self.corrupt_vault_asset_release_enabled(&payload.exit_asset_id);
        }
        let (data, accounts, expected_code, forbidden_code) = match mode {
            0 => (
                payload.data.clone(),
                self.unshield_accounts_for_payload(&payload),
                self.accepted_roots
                    .is_empty()
                    .then_some(ERR_UNKNOWN_ACCEPTED_ROOT)
                    .or(Some(ERR_UNSHIELD_RELEASE_NOT_WIRED)),
                None,
            ),
            1 => (
                payload.data.clone(),
                self.unshield_accounts_for_payload(&payload),
                Some(ERR_UNKNOWN_ACCEPTED_ROOT),
                None,
            ),
            2 => (
                payload.data.clone(),
                self.unshield_accounts_with_wrong_marker(&payload),
                self.accepted_roots
                    .is_empty()
                    .then_some(ERR_UNKNOWN_ACCEPTED_ROOT)
                    .or(Some(ERR_NULLIFIER_MARKER_MISMATCH)),
                None,
            ),
            3 => (
                payload.data.clone(),
                self.unshield_accounts_with_wrong_vault(&payload),
                self.accepted_roots
                    .is_empty()
                    .then_some(ERR_UNKNOWN_ACCEPTED_ROOT)
                    .or(Some(ERR_VAULT_AUTHORITY_MISMATCH)),
                None,
            ),
            4 => (
                payload.data.clone(),
                self.unshield_accounts_with_writable_vault(&payload),
                self.accepted_roots
                    .is_empty()
                    .then_some(ERR_UNKNOWN_ACCEPTED_ROOT),
                None,
            ),
            5 => (
                payload.data.clone(),
                self.unshield_accounts_for_payload(&payload),
                Some(ERR_DUPLICATE_NULLIFIER),
                None,
            ),
            6 => (
                payload.data.clone(),
                self.unshield_accounts_with_wrong_root_record(&payload),
                Some(ERR_ROOT_RECORD_MISMATCH),
                None,
            ),
            7 => (
                payload.data.clone(),
                self.unshield_accounts_for_payload(&payload),
                None,
                Some(ERR_UNSHIELD_RELEASE_NOT_WIRED),
            ),
            8 => (
                payload.data.clone(),
                self.unshield_accounts_for_payload(&payload),
                Some(ERR_VAULT_ASSET_MISMATCH),
                None,
            ),
            9 => (
                payload.data.clone(),
                self.unshield_accounts_with_wrong_vault_asset(&payload),
                Some(ERR_VAULT_ASSET_MISMATCH),
                None,
            ),
            10 => (
                payload.data.clone(),
                self.unshield_accounts_with_cross_asset(&payload, seed),
                Some(ERR_VAULT_ASSET_MISMATCH),
                None,
            ),
            11 => (
                payload.data.clone(),
                self.unshield_accounts_for_payload(&payload),
                Some(ERR_VAULT_TOKEN_ACCOUNT_MISMATCH),
                None,
            ),
            12 => (
                payload.data.clone(),
                self.unshield_accounts_for_payload(&payload),
                Some(ERR_DESTINATION_TOKEN_ACCOUNT_MISMATCH),
                None,
            ),
            13 => (
                payload.data.clone(),
                self.unshield_accounts_for_payload(&payload),
                Some(ERR_TOKEN_PROGRAM_MISMATCH),
                None,
            ),
            14 => (
                payload.data.clone(),
                self.unshield_accounts_for_payload(&payload),
                Some(ERR_VAULT_ASSET_MISMATCH),
                None,
            ),
            _ => (
                vec![TAG_UNSHIELD],
                self.unshield_accounts_for_payload(&payload),
                None,
                None,
            ),
        };

        let before = self.snapshot_account_metas(&accounts);
        let outcome = self.call_unsigned(data, accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        if let Some(code) = expected_code {
            fuzz_assert_eq!(outcome.as_ref().and_then(TxOutcome::error_code), Some(code));
        }
        if let Some(code) = forbidden_code {
            fuzz_assert!(
                outcome.as_ref().and_then(TxOutcome::error_code) != Some(code),
                "legacy tag 2 root unexpectedly reached unshield-release not-wired path"
            );
        }
        fuzz_assert_eq!(
            before,
            self.snapshot_account_metas(&accounts),
            "unshield preflight mutated account bytes or lamports"
        );
    }

    pub fn action_bad_payload(&mut self, selector: u8) {
        let data = match selector % 5 {
            0 => vec![],
            1 => vec![99],
            2 => vec![TAG_INIT, 1],
            3 => vec![TAG_SPEND],
            _ => {
                let mut data = spend_payload(42, self.accepted_root_for_spend(42)).data;
                data.push(0);
                data
            }
        };
        let payload = spend_payload(42, self.accepted_root_for_spend(42));
        self.ensure_spend_placeholders(&payload);
        let before = self.snapshot_accounts_for_payload(&payload);
        let outcome = self.call_authorized(data, self.spend_accounts_for_payload(&payload));
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            before,
            self.snapshot_accounts_for_payload(&payload),
            "bad payload mutated state"
        );
    }

    pub fn action_unsigned_spend(&mut self, seed: u64) {
        let payload = spend_payload(seed, self.accepted_root_for_spend(seed));
        self.ensure_spend_placeholders(&payload);
        let before = self.snapshot_accounts_for_payload(&payload);
        let outcome = self.call_unsigned(
            payload.data.clone(),
            self.unsigned_authority_accounts(&payload),
        );
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            before,
            self.snapshot_accounts_for_payload(&payload),
            "unsigned-authority call mutated state"
        );
    }

    pub fn action_wrong_authority_spend(&mut self, seed: u64) {
        let payload = spend_payload(seed, self.accepted_root_for_spend(seed));
        self.ensure_spend_placeholders(&payload);
        let before = self.snapshot_accounts_for_payload(&payload);
        let outcome = self.call_wrong_authority(
            payload.data.clone(),
            self.wrong_authority_accounts(&payload),
        );
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            outcome.as_ref().and_then(TxOutcome::error_code),
            Some(ERR_UNAUTHORIZED_OPERATOR)
        );
        fuzz_assert_eq!(
            before,
            self.snapshot_accounts_for_payload(&payload),
            "wrong-authority call mutated state"
        );
    }

    pub fn action_non_writable_spend(&mut self, seed: u64) {
        let payload = spend_payload(seed, self.accepted_root_for_spend(seed));
        self.ensure_spend_placeholders(&payload);
        let before = self.snapshot_accounts_for_payload(&payload);
        let outcome = self.call_authorized(
            payload.data.clone(),
            self.readonly_program_accounts(&payload),
        );
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            before,
            self.snapshot_accounts_for_payload(&payload),
            "non-writable call mutated state"
        );
    }

    pub fn action_wrong_owner_spend(&mut self, seed: u64) {
        let payload = spend_payload(seed, self.accepted_root_for_spend(seed));
        self.ensure_spend_placeholders(&payload);
        let before = self.snapshot_accounts_for_payload(&payload);
        let outcome =
            self.call_authorized(payload.data.clone(), self.wrong_owner_accounts(&payload));
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            before,
            self.snapshot_accounts_for_payload(&payload),
            "wrong-owner call mutated state"
        );
    }

    pub fn action_corrupt_header(&mut self, selector: u8) {
        if !self.initialized {
            return;
        }
        let target = match selector % 4 {
            0 => self.pool_state,
            1 => self.nullifier_set,
            2 => self.output_queue,
            _ => self.root_history,
        };
        self.ctx
            .update_account(&target, |data| {
                if let Some(first) = data.first_mut() {
                    *first ^= 0xff;
                }
            })
            .unwrap();
        self.state_error_code = Some(ERR_INVALID_HEADER);
    }

    pub fn action_corrupt_count_mismatch(&mut self) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }
        let mismatched = (self.expected_count + 1) as u32;
        self.ctx
            .update_account(&self.output_queue, |data| {
                data[COUNT_OFFSET..COUNT_OFFSET + 4].copy_from_slice(&mismatched.to_le_bytes());
            })
            .unwrap();
        self.state_error_code = Some(ERR_STATE_COUNT_MISMATCH);
    }
}

#[invariant_test]
fn invariant_test(fixture: &mut VantaPrivatePoolV2Spend) {
    if !fixture.initialized || fixture.state_error_code.is_some() {
        return;
    }

    let pool = fixture.account_data(fixture.pool_state);
    let nullifiers = fixture.account_data(fixture.nullifier_set);
    let outputs = fixture.account_data(fixture.output_queue);
    let roots = fixture.account_data(fixture.root_history);

    fuzz_assert_eq!(&pool[..8], POOL_MAGIC);
    fuzz_assert_eq!(pool[8], VERSION);
    fuzz_assert_eq!(
        &pool[POOL_AUTHORITY_OFFSET..POOL_AUTHORITY_OFFSET + HASH_LEN],
        &fixture.operator_authority.pubkey().to_bytes()
    );
    fuzz_assert_eq!(
        &pool[POOL_NULLIFIER_SET_OFFSET..POOL_NULLIFIER_SET_OFFSET + HASH_LEN],
        &fixture.nullifier_set.to_bytes()
    );
    fuzz_assert_eq!(
        &pool[POOL_OUTPUT_QUEUE_OFFSET..POOL_OUTPUT_QUEUE_OFFSET + HASH_LEN],
        &fixture.output_queue.to_bytes()
    );
    fuzz_assert_eq!(
        &pool[POOL_ROOT_HISTORY_OFFSET..POOL_ROOT_HISTORY_OFFSET + HASH_LEN],
        &fixture.root_history.to_bytes()
    );
    fuzz_assert_eq!(&nullifiers[..8], NULLIFIER_MAGIC);
    fuzz_assert_eq!(nullifiers[8], VERSION);
    fuzz_assert_eq!(&outputs[..8], OUTPUT_MAGIC);
    fuzz_assert_eq!(outputs[8], VERSION);
    fuzz_assert_eq!(&roots[..8], ROOT_MAGIC);
    fuzz_assert_eq!(roots[8], VERSION);

    fuzz_assert_eq!(
        read_u64(&pool, POOL_SPEND_COUNT_OFFSET) as usize,
        fixture.expected_count
    );
    fuzz_assert_eq!(read_u32(&nullifiers, COUNT_OFFSET) as usize, 0);
    fuzz_assert_eq!(
        read_u32(&outputs, COUNT_OFFSET) as usize,
        fixture.expected_count
    );
    fuzz_assert_eq!(
        read_u32(&roots, COUNT_OFFSET) as usize,
        fixture.accepted_roots.len()
    );

    fuzz_assert_eq!(
        &pool[POOL_LAST_PUBLIC_INPUT_HASH_OFFSET..POOL_LAST_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
        &fixture.latest_public_input_hash
    );

    for nullifier in fixture.accepted_nullifiers.iter() {
        fixture.assert_nullifier_marker(nullifier);
    }

    for output in fixture.output_records.iter() {
        fixture.assert_output_record(output);
    }

    for (index, root) in fixture.accepted_roots.iter().enumerate() {
        let start = HEADER_LEN + index * HASH_LEN;
        fuzz_assert_eq!(&roots[start..start + HASH_LEN], root);
    }

    for record in fixture.root_records.iter() {
        fixture.assert_root_record(record);
    }

    for legacy_root in fixture.legacy_roots.iter() {
        fixture.assert_no_root_record_for_legacy_root(legacy_root);
    }

    for verifier_key_hash in fixture.registered_verifier_keys.iter() {
        fixture.assert_verifier_key_account(verifier_key_hash);
    }

    for vault_asset in fixture.registered_vault_assets.iter() {
        fixture.assert_vault_asset_account(vault_asset);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{env, fs, path::Path};

    #[test]
    fn spend_with_proof_sbf_verifier_cpi_rejection_no_mutation() {
        let mut fixture = VantaPrivatePoolV2Spend::setup();
        fixture.action_init_standard();
        fixture.action_spend_with_proof_sbf_verifier_cpi_rejects_before_commit(9_001);
    }

    #[test]
    fn spend_with_proof_local_unsafe_generated_verifier_cpi_acceptance_and_no_mutation() {
        let target_dir = env::var("VANTA_C01_LOCAL_GNARK_TARGET_DIR").unwrap_or_else(|_| {
            "/private/tmp/vanta-c01-sunspot-lane/work/beta18-h6-circuit/target".to_string()
        });
        let verifier_sbf = env::var("VANTA_C01_LOCAL_GNARK_VERIFIER_SBF")
            .unwrap_or_else(|_| format!("{target_dir}/vanta_private_pool_v2_actual_private_spend_entry.so"));
        let wrong_verifier_sbf = env::var("VANTA_C01_LOCAL_GNARK_WRONG_VERIFIER_SBF")
            .unwrap_or_else(|_| {
                "/private/tmp/vanta-c01-sunspot-lane/work/beta18-circuit/target/vanta_private_pool_v2_actual_private_spend_entry.so"
                    .to_string()
            });
        let proof = fs::read(Path::new(&target_dir).join("vanta_private_pool_v2_actual_private_spend_entry.proof"))
            .expect("local unsafe C01 Gnark proof artifact must exist");
        let public_witness =
            fs::read(Path::new(&target_dir).join("vanta_private_pool_v2_actual_private_spend_entry.pw"))
                .expect("local unsafe C01 Gnark public-witness artifact must exist");
        assert_eq!(proof.len(), SPEND_WITH_PROOF_GNARK_PROOF_LEN);
        assert_eq!(public_witness.len(), SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN);

        let mut invalid_proof = proof.clone();
        invalid_proof[0] ^= 0x01;
        let verifier_key_hash = env_hash_or("VANTA_C01_LOCAL_GNARK_VK_SHA256", local_unsafe_h6_sunspot_vk_sha256());
        let wrong_verifier_key_hash = env_hash_or(
            "VANTA_C01_LOCAL_GNARK_WRONG_VK_SHA256",
            local_unsafe_legacy_sunspot_vk_sha256(),
        );

        let mut fixture = VantaPrivatePoolV2Spend::setup();
        fixture.install_c01_verifier_program_from_path(&verifier_sbf);
        let wrong_verifier_program = fixture.add_c01_verifier_program_from_path(&verifier_sbf);
        let wrong_verifying_key_program = fixture.add_c01_verifier_program_from_path(&wrong_verifier_sbf);
        fixture.action_init_standard();
        fixture.action_spend_with_proof_local_unsafe_generated_verifier_accepts_and_mutates(
            9_002,
            &proof,
            &public_witness,
            verifier_key_hash,
        );
        fixture.action_spend_with_proof_local_unsafe_generated_verifier_rejects_without_mutation(
            9_003,
            &invalid_proof,
            &public_witness,
            verifier_key_hash,
        );
        fixture.action_spend_with_proof_local_unsafe_wrong_public_input_rejects_without_mutation(
            9_004,
            &proof,
            &public_witness,
            verifier_key_hash,
            make_hash(9_004, 99),
        );
        fixture.action_spend_with_proof_local_unsafe_wrong_verifier_program_rejects_without_mutation(
            9_005,
            &proof,
            &public_witness,
            verifier_key_hash,
            wrong_verifier_program,
        );
        fixture.action_spend_with_proof_local_unsafe_wrong_verifying_key_rejects_without_mutation(
            9_006,
            &proof,
            &public_witness,
            wrong_verifier_key_hash,
            wrong_verifying_key_program,
        );
    }
}

impl VantaPrivatePoolV2Spend {
    #[cfg(test)]
    fn add_c01_verifier_program_from_path(&mut self, verifier_program_path: &str) -> Pubkey {
        let verifier_program = Pubkey::new_unique();
        self.ctx
            .add_program(&verifier_program, verifier_program_path)
            .unwrap();
        verifier_program
    }

    #[cfg(test)]
    fn install_c01_verifier_program_from_path(&mut self, verifier_program_path: &str) {
        self.c01_verifier_program = self.add_c01_verifier_program_from_path(verifier_program_path);
    }

    #[cfg(test)]
    fn action_spend_with_proof_local_unsafe_generated_verifier_accepts_and_mutates(
        &mut self,
        seed: u64,
        proof: &[u8],
        public_witness: &[u8],
        verifier_key_hash: [u8; HASH_LEN],
    ) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }

        self.ensure_provenanced_root(seed.wrapping_add(606));
        let Some(record) = self.root_records.last().cloned() else {
            return;
        };
        let payload = spend_with_proof_payload_with_gnark_artifacts(
            seed,
            record.accepted_root,
            verifier_key_hash,
            proof,
            public_witness,
        );
        self.register_verifier_key_for_hash(&payload.verifier_key_hash);
        self.ensure_spend_with_proof_placeholders(&payload);

        let outcome = self.call_authorized(
            payload.data.clone(),
            self.spend_with_proof_accounts_for_payload(&payload),
        );
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
        if outcome.is_some_and(|o| o.is_success()) {
            let output_index = self.expected_count as u64;
            self.expected_count += 1;
            self.accepted_nullifiers.push(payload.nullifier);
            self.output_records.push(OutputRecord {
                output_index,
                output0: payload_output0(&payload),
                output1: payload_output1(&payload),
                public_input_hash: payload.public_input_hash,
            });
            self.latest_public_input_hash = payload.public_input_hash;
            self.assert_nullifier_marker(&payload.nullifier);
            self.assert_output_record(self.output_records.last().unwrap());
        }
    }

    #[cfg(test)]
    fn action_spend_with_proof_local_unsafe_generated_verifier_rejects_without_mutation(
        &mut self,
        seed: u64,
        proof: &[u8],
        public_witness: &[u8],
        verifier_key_hash: [u8; HASH_LEN],
    ) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }

        self.ensure_provenanced_root(seed.wrapping_add(707));
        let Some(record) = self.root_records.last().cloned() else {
            return;
        };
        let payload = spend_with_proof_payload_with_gnark_artifacts(
            seed,
            record.accepted_root,
            verifier_key_hash,
            proof,
            public_witness,
        );
        self.register_verifier_key_for_hash(&payload.verifier_key_hash);
        self.ensure_spend_with_proof_placeholders(&payload);

        let accounts = self.spend_with_proof_accounts_for_payload(&payload);
        let before = self.snapshot_existing_account_metas(&accounts);
        let outcome = self.call_authorized(payload.data.clone(), accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            before,
            self.snapshot_existing_account_metas(&accounts),
            "local unsafe generated verifier rejection mutated account bytes or lamports"
        );
    }

    #[cfg(test)]
    fn action_spend_with_proof_local_unsafe_wrong_public_input_rejects_without_mutation(
        &mut self,
        seed: u64,
        proof: &[u8],
        public_witness: &[u8],
        verifier_key_hash: [u8; HASH_LEN],
        wrong_public_input_hash: [u8; HASH_LEN],
    ) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }

        self.ensure_provenanced_root(seed.wrapping_add(808));
        let Some(record) = self.root_records.last().cloned() else {
            return;
        };
        let payload = spend_with_proof_payload_with_gnark_artifacts_and_public_input_hash(
            seed,
            record.accepted_root,
            wrong_public_input_hash,
            verifier_key_hash,
            proof,
            public_witness,
        );
        self.register_verifier_key_for_hash(&payload.verifier_key_hash);
        self.ensure_spend_with_proof_placeholders(&payload);

        let accounts = self.spend_with_proof_accounts_for_payload(&payload);
        let before = self.snapshot_existing_account_metas(&accounts);
        let outcome = self.call_authorized(payload.data.clone(), accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            before,
            self.snapshot_existing_account_metas(&accounts),
            "local unsafe wrong-public-input rejection mutated account bytes or lamports"
        );
    }

    #[cfg(test)]
    fn action_spend_with_proof_local_unsafe_wrong_verifier_program_rejects_without_mutation(
        &mut self,
        seed: u64,
        proof: &[u8],
        public_witness: &[u8],
        verifier_key_hash: [u8; HASH_LEN],
        wrong_verifier_program: Pubkey,
    ) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }

        self.ensure_provenanced_root(seed.wrapping_add(909));
        let Some(record) = self.root_records.last().cloned() else {
            return;
        };
        let payload = spend_with_proof_payload_with_gnark_artifacts(
            seed,
            record.accepted_root,
            verifier_key_hash,
            proof,
            public_witness,
        );
        self.register_verifier_key_for_hash(&payload.verifier_key_hash);
        self.ensure_spend_with_proof_placeholders(&payload);

        let accounts = self
            .spend_with_proof_accounts_for_payload_with_verifier_program(
                &payload,
                wrong_verifier_program,
            );
        let before = self.snapshot_existing_account_metas(&accounts);
        let outcome = self.call_authorized(payload.data.clone(), accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            before,
            self.snapshot_existing_account_metas(&accounts),
            "local unsafe wrong-verifier-program rejection mutated account bytes or lamports"
        );
    }

    #[cfg(test)]
    fn action_spend_with_proof_local_unsafe_wrong_verifying_key_rejects_without_mutation(
        &mut self,
        seed: u64,
        proof: &[u8],
        public_witness: &[u8],
        wrong_verifier_key_hash: [u8; HASH_LEN],
        wrong_verifying_key_program: Pubkey,
    ) {
        if !self.initialized || self.state_error_code.is_some() {
            return;
        }

        self.ensure_provenanced_root(seed.wrapping_add(1_010));
        let Some(record) = self.root_records.last().cloned() else {
            return;
        };
        let payload = spend_with_proof_payload_with_gnark_artifacts(
            seed,
            record.accepted_root,
            wrong_verifier_key_hash,
            proof,
            public_witness,
        );
        self.register_verifier_key_for_hash_with_program(
            &payload.verifier_key_hash,
            wrong_verifying_key_program,
        );
        self.ensure_spend_with_proof_placeholders(&payload);

        let accounts = self.spend_with_proof_accounts_for_payload_with_verifier_program(
            &payload,
            wrong_verifying_key_program,
        );
        let before = self.snapshot_existing_account_metas(&accounts);
        let outcome = self.call_authorized(payload.data.clone(), accounts.clone());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            before,
            self.snapshot_existing_account_metas(&accounts),
            "local unsafe wrong-verifying-key rejection mutated account bytes or lamports"
        );
    }

    fn reset_accounts(&mut self, nullifier_capacity: usize, root_capacity: usize) {
        create_program_accounts(
            &mut self.ctx,
            &self.program_id,
            self.pool_state,
            self.nullifier_set,
            self.output_queue,
            self.root_history,
            self.tree_state,
            nullifier_capacity,
            root_capacity,
        );
        self.ctx
            .create_account()
            .pubkey(self.wrong_tree_state)
            .lamports(1_000_000)
            .owner(self.program_id)
            .size(TREE_STATE_LEN)
            .create()
            .unwrap();
        self.initialized = false;
        self.state_error_code = None;
        self.expected_count = 0;
        self.root_capacity = root_capacity;
        self.accepted_nullifiers.clear();
        self.accepted_roots.clear();
        self.legacy_roots.clear();
        self.root_records.clear();
        self.appended_tree_leaves.clear();
        self.registered_verifier_keys.clear();
        self.registered_vault_assets.clear();
        self.output_records.clear();
        self.latest_public_input_hash = [0; HASH_LEN];
    }

    fn send_valid_init(&mut self) {
        let before = self.snapshot_accounts();
        let outcome = self.call_authorized(vec![TAG_INIT], self.init_accounts());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
        if outcome.is_some_and(|o| o.is_success()) {
            self.initialized = true;
            self.state_error_code = None;
            self.expected_count = 0;
            self.accepted_nullifiers.clear();
            self.accepted_roots.clear();
            self.legacy_roots.clear();
            self.root_records.clear();
            self.appended_tree_leaves.clear();
            self.registered_verifier_keys.clear();
            self.registered_vault_assets.clear();
            self.output_records.clear();
            self.latest_public_input_hash = [0; HASH_LEN];
        } else {
            fuzz_assert_eq!(
                before,
                self.snapshot_accounts(),
                "failed init mutated state"
            );
        }
    }

    fn check_spend_outcome(&mut self, seed: u64, outcome: Option<TxOutcome>, before: Vec<Vec<u8>>) {
        let payload = spend_payload(seed, self.accepted_root_for_spend(seed));
        let expected_error = self.expected_spend_error(&payload.nullifier);

        match expected_error {
            None => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
                if outcome.is_some_and(|o| o.is_success()) {
                    let output_index = self.expected_count as u64;
                    self.expected_count += 1;
                    self.accepted_nullifiers.push(payload.nullifier);
                    self.output_records.push(OutputRecord {
                        output_index,
                        output0: payload.output0,
                        output1: payload.output1,
                        public_input_hash: payload.public_input_hash,
                    });
                    self.latest_public_input_hash = payload.public_input_hash;
                    self.assert_nullifier_marker(&payload.nullifier);
                    self.assert_output_record(self.output_records.last().unwrap());
                }
            }
            Some(code) => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
                fuzz_assert_eq!(outcome.as_ref().and_then(TxOutcome::error_code), Some(code));
                fuzz_assert_eq!(
                    before,
                    self.snapshot_accounts_for_payload(&payload),
                    "failed spend mutated state"
                );
            }
        }
    }

    fn expected_spend_error(&self, nullifier: &[u8; HASH_LEN]) -> Option<u32> {
        if !self.initialized {
            return Some(ERR_INVALID_HEADER);
        }
        if let Some(code) = self.state_error_code {
            return Some(code);
        }
        if self.accepted_roots.is_empty() {
            return Some(ERR_UNKNOWN_ACCEPTED_ROOT);
        }
        if self
            .accepted_nullifiers
            .iter()
            .any(|seen| seen == nullifier)
        {
            return Some(ERR_DUPLICATE_NULLIFIER);
        }
        None
    }

    fn root_record_for_registration(&self, seed: u64, accepted_root: [u8; HASH_LEN]) -> RootRecord {
        RootRecord {
            sequence: self.accepted_roots.len() as u64,
            previous_root: self.accepted_roots.last().copied().unwrap_or([0; HASH_LEN]),
            accepted_root,
            transition_public_input_hash: make_hash(seed, 80),
            leaf_index_base: seed,
            leaf_count: 2,
            transition_kind: 1,
        }
    }

    fn ensure_provenanced_root(&mut self, seed: u64) {
        if self.root_records.is_empty() {
            self.action_register_root(seed);
        }
    }

    fn ensure_legacy_root(&mut self, seed: u64) {
        if self.legacy_roots.is_empty() {
            self.action_register_legacy_root(seed);
        }
    }

    fn register_verifier_key_for_hash(&mut self, verifier_key_hash: &[u8; HASH_LEN]) {
        self.register_verifier_key_for_hash_with_program(verifier_key_hash, self.c01_verifier_program);
    }

    fn register_verifier_key_for_hash_with_program(
        &mut self,
        verifier_key_hash: &[u8; HASH_LEN],
        verifier_program: Pubkey,
    ) {
        if verifier_key_hash.iter().all(|byte| *byte == 0) {
            return;
        }
        self.ensure_verifier_key_placeholder(verifier_key_hash);
        let accounts = self.verifier_key_registration_accounts_for_hash(verifier_key_hash);
        let outcome = self.call_authorized(
            register_verifier_key_data(*verifier_key_hash, verifier_program),
            accounts,
        );
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
        if outcome.is_some_and(|o| o.is_success()) {
            if !self
                .registered_verifier_keys
                .iter()
                .any(|seen| seen == verifier_key_hash)
            {
                self.registered_verifier_keys.push(*verifier_key_hash);
            }
            self.assert_verifier_key_account_for_program(verifier_key_hash, verifier_program);
        }
    }

    fn register_vault_asset_for_payload(&mut self, payload: &UnshieldPayload) {
        let record = self.vault_asset_record_for_payload(payload);
        self.register_vault_asset_for_record(&record);
    }

    fn register_cross_asset_for_payload(&mut self, seed: u64, payload: &UnshieldPayload) {
        let cross_asset_id = make_hash(seed.wrapping_add(9_999), 63);
        if cross_asset_id == payload.exit_asset_id {
            return;
        }
        let record =
            self.vault_asset_record_for_exit_asset(seed.wrapping_add(9_999), cross_asset_id);
        self.register_vault_asset_for_record(&record);
    }

    fn register_vault_asset_for_record(&mut self, record: &VaultAssetRecord) {
        self.ensure_vault_asset_placeholder(&record.exit_asset_id);
        self.ensure_vault_authority_placeholder(&record.exit_asset_id);
        let accounts = self.vault_asset_registration_accounts_for_record(record);
        let outcome = self.call_authorized(register_vault_asset_data(record), accounts);
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
        if outcome.is_some_and(|o| o.is_success()) {
            self.remember_registered_vault_asset(record.clone());
            self.assert_vault_asset_account(record);
        }
    }

    fn remember_registered_vault_asset(&mut self, record: VaultAssetRecord) {
        if let Some(existing) = self
            .registered_vault_assets
            .iter_mut()
            .find(|seen| seen.exit_asset_id == record.exit_asset_id)
        {
            *existing = record;
        } else {
            self.registered_vault_assets.push(record);
        }
    }

    fn is_vault_asset_registered(&self, exit_asset_id: &[u8; HASH_LEN]) -> bool {
        self.registered_vault_assets
            .iter()
            .any(|record| &record.exit_asset_id == exit_asset_id)
    }

    fn vault_asset_record(&self, seed: u64) -> VaultAssetRecord {
        let exit_asset_id = make_hash(seed, 63);
        self.vault_asset_record_for_exit_asset(seed, exit_asset_id)
    }

    fn vault_asset_record_for_payload(&self, payload: &UnshieldPayload) -> VaultAssetRecord {
        VaultAssetRecord {
            exit_asset_id: payload.exit_asset_id,
            mint: payload.mint,
            vault_authority: self.vault_authority_pubkey(&payload.exit_asset_id),
            vault_token_account: payload.vault_token_account,
            token_program: SPL_TOKEN_PROGRAM_ID,
            asset_kind: VAULT_ASSET_KIND_SPL,
        }
    }

    fn vault_asset_record_for_exit_asset(
        &self,
        seed: u64,
        exit_asset_id: [u8; HASH_LEN],
    ) -> VaultAssetRecord {
        VaultAssetRecord {
            exit_asset_id,
            mint: pubkey_from_hash(make_hash(seed, 65)),
            vault_authority: self.vault_authority_pubkey(&exit_asset_id),
            vault_token_account: pubkey_from_hash(make_hash(seed, 66)),
            token_program: SPL_TOKEN_PROGRAM_ID,
            asset_kind: VAULT_ASSET_KIND_SPL,
        }
    }

    fn accepted_root_for_spend(&self, seed: u64) -> [u8; HASH_LEN] {
        self.accepted_roots
            .last()
            .copied()
            .unwrap_or(make_hash(seed, 4))
    }

    fn call_authorized(&mut self, data: Vec<u8>, accounts: Vec<AccountMeta>) -> Option<TxOutcome> {
        let operator_authority = Rc::clone(&self.operator_authority);
        self.call_with_signer(data, accounts, &operator_authority)
    }

    fn call_wrong_authority(
        &mut self,
        data: Vec<u8>,
        accounts: Vec<AccountMeta>,
    ) -> Option<TxOutcome> {
        let wrong_operator_authority = Rc::clone(&self.wrong_operator_authority);
        self.call_with_signer(data, accounts, &wrong_operator_authority)
    }

    fn call_unsigned(&mut self, data: Vec<u8>, accounts: Vec<AccountMeta>) -> Option<TxOutcome> {
        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data,
        };
        self.ctx
            .raw_call(instruction)
            .fee_payer(&self.payer)
            .send()
            .ok()
    }

    fn call_with_signer(
        &mut self,
        data: Vec<u8>,
        accounts: Vec<AccountMeta>,
        signer: &Keypair,
    ) -> Option<TxOutcome> {
        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data,
        };
        self.ctx
            .raw_call(instruction)
            .fee_payer(&self.payer)
            .signers(&[signer])
            .send()
            .ok()
    }

    fn init_accounts(&self) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new(self.nullifier_set, false),
            AccountMeta::new(self.output_queue, false),
            AccountMeta::new(self.root_history, false),
            AccountMeta::new(self.tree_state, false),
            AccountMeta::new_readonly(self.operator_authority.pubkey(), true),
        ]
    }

    fn spend_accounts_for_payload(&self, payload: &SpendPayload) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new_readonly(self.nullifier_set, false),
            AccountMeta::new(self.output_queue, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.output_record_pubkey(&payload.public_input_hash), false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn unshield_trailing_accounts(&self) -> [AccountMeta; 3] {
        [
            AccountMeta::new_readonly(self.c01_verifier_program, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn unshield_accounts_for_payload(&self, payload: &UnshieldPayload) -> Vec<AccountMeta> {
        let mut accounts = vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new_readonly(self.root_record_pubkey(&payload.accepted_root), false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new_readonly(self.vault_authority_pubkey(&payload.exit_asset_id), false),
            AccountMeta::new_readonly(self.vault_asset_pubkey(&payload.exit_asset_id), false),
            AccountMeta::new(payload.vault_token_account, false),
            AccountMeta::new(payload.destination_token_account, false),
            AccountMeta::new_readonly(payload.mint, false),
            AccountMeta::new_readonly(payload.token_program, false),
            AccountMeta::new_readonly(self.verifier_key_pubkey(&payload.verifier_key_hash), false),
        ];
        accounts.extend_from_slice(&self.unshield_trailing_accounts());
        accounts
    }

    fn spend_with_proof_accounts_for_payload(
        &self,
        payload: &SpendWithProofPayload,
    ) -> Vec<AccountMeta> {
        self.spend_with_proof_accounts_for_payload_with_verifier_program(
            payload,
            self.c01_verifier_program,
        )
    }

    fn spend_with_proof_accounts_for_payload_with_verifier_program(
        &self,
        payload: &SpendWithProofPayload,
        verifier_program: Pubkey,
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new_readonly(self.nullifier_set, false),
            AccountMeta::new(self.output_queue, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new_readonly(self.root_record_pubkey(&payload.accepted_root), false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.output_record_pubkey(&payload.public_input_hash), false),
            AccountMeta::new_readonly(self.verifier_key_pubkey(&payload.verifier_key_hash), false),
            AccountMeta::new_readonly(verifier_program, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn spend_with_proof_accounts_with_wrong_verifier(
        &self,
        payload: &SpendWithProofPayload,
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new_readonly(self.nullifier_set, false),
            AccountMeta::new(self.output_queue, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new_readonly(self.root_record_pubkey(&payload.accepted_root), false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.output_record_pubkey(&payload.public_input_hash), false),
            AccountMeta::new_readonly(self.wrong_root_history, false),
            AccountMeta::new_readonly(self.c01_verifier_program, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn spend_with_proof_accounts_with_wrong_root_record(
        &self,
        payload: &SpendWithProofPayload,
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new_readonly(self.nullifier_set, false),
            AccountMeta::new(self.output_queue, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new_readonly(self.wrong_root_history, false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.output_record_pubkey(&payload.public_input_hash), false),
            AccountMeta::new_readonly(self.verifier_key_pubkey(&payload.verifier_key_hash), false),
            AccountMeta::new_readonly(self.c01_verifier_program, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn spend_with_proof_accounts_with_writable_verifier(
        &self,
        payload: &SpendWithProofPayload,
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new_readonly(self.nullifier_set, false),
            AccountMeta::new(self.output_queue, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new_readonly(self.root_record_pubkey(&payload.accepted_root), false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.output_record_pubkey(&payload.public_input_hash), false),
            AccountMeta::new(self.verifier_key_pubkey(&payload.verifier_key_hash), false),
            AccountMeta::new_readonly(self.c01_verifier_program, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn unshield_accounts_with_wrong_marker(&self, payload: &UnshieldPayload) -> Vec<AccountMeta> {
        let mut accounts = vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new_readonly(self.root_record_pubkey(&payload.accepted_root), false),
            AccountMeta::new(self.wrong_nullifier_set, false),
            AccountMeta::new_readonly(self.vault_authority_pubkey(&payload.exit_asset_id), false),
            AccountMeta::new_readonly(self.vault_asset_pubkey(&payload.exit_asset_id), false),
            AccountMeta::new(payload.vault_token_account, false),
            AccountMeta::new(payload.destination_token_account, false),
            AccountMeta::new_readonly(payload.mint, false),
            AccountMeta::new_readonly(payload.token_program, false),
            AccountMeta::new_readonly(self.verifier_key_pubkey(&payload.verifier_key_hash), false),
        ];
        accounts.extend_from_slice(&self.unshield_trailing_accounts());
        accounts
    }

    fn unshield_accounts_with_wrong_vault(&self, payload: &UnshieldPayload) -> Vec<AccountMeta> {
        let mut accounts = vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new_readonly(self.root_record_pubkey(&payload.accepted_root), false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new_readonly(self.wrong_root_history, false),
            AccountMeta::new_readonly(self.vault_asset_pubkey(&payload.exit_asset_id), false),
            AccountMeta::new(payload.vault_token_account, false),
            AccountMeta::new(payload.destination_token_account, false),
            AccountMeta::new_readonly(payload.mint, false),
            AccountMeta::new_readonly(payload.token_program, false),
            AccountMeta::new_readonly(self.verifier_key_pubkey(&payload.verifier_key_hash), false),
        ];
        accounts.extend_from_slice(&self.unshield_trailing_accounts());
        accounts
    }

    fn unshield_accounts_with_writable_vault(&self, payload: &UnshieldPayload) -> Vec<AccountMeta> {
        let mut accounts = vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new_readonly(self.root_record_pubkey(&payload.accepted_root), false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.vault_authority_pubkey(&payload.exit_asset_id), false),
            AccountMeta::new_readonly(self.vault_asset_pubkey(&payload.exit_asset_id), false),
            AccountMeta::new(payload.vault_token_account, false),
            AccountMeta::new(payload.destination_token_account, false),
            AccountMeta::new_readonly(payload.mint, false),
            AccountMeta::new_readonly(payload.token_program, false),
            AccountMeta::new_readonly(self.verifier_key_pubkey(&payload.verifier_key_hash), false),
        ];
        accounts.extend_from_slice(&self.unshield_trailing_accounts());
        accounts
    }

    fn unshield_accounts_with_wrong_root_record(
        &self,
        payload: &UnshieldPayload,
    ) -> Vec<AccountMeta> {
        let mut accounts = vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new_readonly(self.wrong_root_history, false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new_readonly(self.vault_authority_pubkey(&payload.exit_asset_id), false),
            AccountMeta::new_readonly(self.vault_asset_pubkey(&payload.exit_asset_id), false),
            AccountMeta::new(payload.vault_token_account, false),
            AccountMeta::new(payload.destination_token_account, false),
            AccountMeta::new_readonly(payload.mint, false),
            AccountMeta::new_readonly(payload.token_program, false),
            AccountMeta::new_readonly(self.verifier_key_pubkey(&payload.verifier_key_hash), false),
        ];
        accounts.extend_from_slice(&self.unshield_trailing_accounts());
        accounts
    }

    fn unshield_accounts_with_wrong_vault_asset(
        &self,
        payload: &UnshieldPayload,
    ) -> Vec<AccountMeta> {
        let mut accounts = self.unshield_accounts_for_payload(payload);
        accounts[5] = AccountMeta::new_readonly(self.wrong_root_history, false);
        accounts
    }

    fn unshield_accounts_with_cross_asset(
        &self,
        payload: &UnshieldPayload,
        seed: u64,
    ) -> Vec<AccountMeta> {
        let cross_asset_id = make_hash(seed.wrapping_add(9_999), 63);
        let mut accounts = self.unshield_accounts_for_payload(payload);
        accounts[5] = AccountMeta::new_readonly(self.vault_asset_pubkey(&cross_asset_id), false);
        accounts
    }

    fn legacy_root_registration_accounts(&self) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.root_history, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
        ]
    }

    fn root_registration_accounts_for_root(
        &self,
        accepted_root: &[u8; HASH_LEN],
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.root_history, false),
            AccountMeta::new(self.root_record_pubkey(accepted_root), false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn tree_append_accounts(
        &self,
        accepted_root: &[u8; HASH_LEN],
        output_commitment: &[u8; HASH_LEN],
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new(self.tree_state, false),
            AccountMeta::new(self.root_history, false),
            AccountMeta::new(self.root_record_pubkey(accepted_root), false),
            AccountMeta::new(self.tree_leaf_marker_pubkey(output_commitment), false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn tree_append_accounts_with_wrong_tree(
        &self,
        accepted_root: &[u8; HASH_LEN],
        output_commitment: &[u8; HASH_LEN],
    ) -> Vec<AccountMeta> {
        let mut accounts = self.tree_append_accounts(accepted_root, output_commitment);
        accounts[1] = AccountMeta::new(self.wrong_tree_state, false);
        accounts
    }

    fn verifier_key_registration_accounts_for_hash(
        &self,
        verifier_key_hash: &[u8; HASH_LEN],
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.verifier_key_pubkey(verifier_key_hash), false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn verifier_key_registration_accounts_with_wrong_pda(
        &self,
        verifier_key_hash: &[u8; HASH_LEN],
    ) -> Vec<AccountMeta> {
        let _ = verifier_key_hash;
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.wrong_root_history, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn verifier_key_registration_accounts_with_wrong_authority(
        &self,
        verifier_key_hash: &[u8; HASH_LEN],
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.verifier_key_pubkey(verifier_key_hash), false),
            AccountMeta::new(self.wrong_operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn verifier_key_registration_accounts_unsigned(
        &self,
        verifier_key_hash: &[u8; HASH_LEN],
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.verifier_key_pubkey(verifier_key_hash), false),
            AccountMeta::new(self.operator_authority.pubkey(), false),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn vault_asset_registration_accounts_for_record(
        &self,
        record: &VaultAssetRecord,
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.vault_asset_pubkey(&record.exit_asset_id), false),
            AccountMeta::new_readonly(record.vault_authority, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn vault_asset_registration_accounts_with_wrong_pda(
        &self,
        record: &VaultAssetRecord,
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.wrong_root_history, false),
            AccountMeta::new_readonly(record.vault_authority, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn vault_asset_registration_accounts_with_wrong_authority(
        &self,
        record: &VaultAssetRecord,
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.vault_asset_pubkey(&record.exit_asset_id), false),
            AccountMeta::new_readonly(record.vault_authority, false),
            AccountMeta::new(self.wrong_operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn vault_asset_registration_accounts_unsigned(
        &self,
        record: &VaultAssetRecord,
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.vault_asset_pubkey(&record.exit_asset_id), false),
            AccountMeta::new_readonly(record.vault_authority, false),
            AccountMeta::new(self.operator_authority.pubkey(), false),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn vault_asset_registration_accounts_with_wrong_vault_authority(
        &self,
        record: &VaultAssetRecord,
    ) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new(self.vault_asset_pubkey(&record.exit_asset_id), false),
            AccountMeta::new_readonly(self.wrong_root_history, false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn readonly_program_accounts(&self, payload: &SpendPayload) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new_readonly(self.nullifier_set, false),
            AccountMeta::new_readonly(self.output_queue, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.output_record_pubkey(&payload.public_input_hash), false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn unsigned_authority_accounts(&self, payload: &SpendPayload) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new_readonly(self.nullifier_set, false),
            AccountMeta::new(self.output_queue, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.output_record_pubkey(&payload.public_input_hash), false),
            AccountMeta::new(self.operator_authority.pubkey(), false),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn wrong_authority_accounts(&self, payload: &SpendPayload) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new_readonly(self.nullifier_set, false),
            AccountMeta::new(self.output_queue, false),
            AccountMeta::new_readonly(self.root_history, false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.output_record_pubkey(&payload.public_input_hash), false),
            AccountMeta::new(self.wrong_operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn wrong_owner_accounts(&self, payload: &SpendPayload) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.wrong_pool_state, false),
            AccountMeta::new_readonly(self.wrong_nullifier_set, false),
            AccountMeta::new(self.wrong_output_queue, false),
            AccountMeta::new_readonly(self.wrong_root_history, false),
            AccountMeta::new(self.nullifier_marker_pubkey(&payload.nullifier), false),
            AccountMeta::new(self.output_record_pubkey(&payload.public_input_hash), false),
            AccountMeta::new(self.operator_authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ]
    }

    fn snapshot_accounts(&self) -> Vec<Vec<u8>> {
        vec![
            self.account_data(self.pool_state),
            self.account_data(self.nullifier_set),
            self.account_data(self.output_queue),
            self.account_data(self.root_history),
            self.account_data(self.tree_state),
            self.account_data(self.wrong_tree_state),
        ]
    }

    fn snapshot_accounts_for_payload(&self, payload: &SpendPayload) -> Vec<Vec<u8>> {
        let mut accounts = self.snapshot_accounts();
        accounts.push(self.account_data(self.nullifier_marker_pubkey(&payload.nullifier)));
        accounts.push(self.account_data(self.output_record_pubkey(&payload.public_input_hash)));
        accounts
    }

    fn snapshot_account_metas(&self, accounts: &[AccountMeta]) -> Vec<(u64, Vec<u8>)> {
        accounts
            .iter()
            .filter_map(|meta| {
                self.ctx
                    .get_account(&meta.pubkey)
                    .ok()
                    .map(|account| (account.lamports, account.data))
            })
            .collect()
    }

    fn snapshot_existing_account_metas(
        &self,
        accounts: &[AccountMeta],
    ) -> Vec<(Pubkey, u64, Vec<u8>)> {
        accounts
            .iter()
            .filter_map(|meta| {
                self.ctx
                    .get_account(&meta.pubkey)
                    .ok()
                    .map(|account| (meta.pubkey, account.lamports, account.data))
            })
            .collect()
    }

    fn ensure_spend_placeholders(&mut self, payload: &SpendPayload) {
        self.ensure_marker_placeholder(&payload.nullifier);
        self.ensure_output_record_placeholder(&payload.public_input_hash);
    }

    fn ensure_spend_with_proof_placeholders(&mut self, payload: &SpendWithProofPayload) {
        self.ensure_root_record_placeholder(&payload.accepted_root);
        self.ensure_marker_placeholder(&payload.nullifier);
        self.ensure_output_record_placeholder(&payload.public_input_hash);
        self.ensure_verifier_key_account(&payload.verifier_key_hash);
    }

    fn ensure_unshield_placeholders(&mut self, payload: &UnshieldPayload) {
        self.ensure_root_record_placeholder(&payload.accepted_root);
        self.ensure_marker_placeholder(&payload.nullifier);
        self.ensure_vault_authority_placeholder(&payload.exit_asset_id);
        self.ensure_vault_asset_placeholder(&payload.exit_asset_id);
        self.ensure_token_program_account(payload.token_program);
        self.ensure_mint_account(payload.mint, payload.token_program);
        self.ensure_token_account(
            payload.vault_token_account,
            payload.token_program,
            payload.mint,
            self.vault_authority_pubkey(&payload.exit_asset_id),
        );
        self.ensure_token_account(
            payload.destination_token_account,
            payload.token_program,
            payload.mint,
            payload.exit_destination_pubkey(),
        );
        self.ensure_verifier_key_account(&payload.verifier_key_hash);
    }

    fn ensure_marker_placeholder(&mut self, nullifier: &[u8; HASH_LEN]) {
        let marker = self.nullifier_marker_pubkey(nullifier);
        if self.ctx.get_account(&marker).is_ok() {
            return;
        }
        self.ctx
            .create_account()
            .pubkey(marker)
            .lamports(0)
            .owner(system_program::ID)
            .size(0)
            .create()
            .unwrap();
    }

    fn ensure_output_record_placeholder(&mut self, public_input_hash: &[u8; HASH_LEN]) {
        let record = self.output_record_pubkey(public_input_hash);
        if self.ctx.get_account(&record).is_ok() {
            return;
        }
        self.ctx
            .create_account()
            .pubkey(record)
            .lamports(0)
            .owner(system_program::ID)
            .size(0)
            .create()
            .unwrap();
    }

    fn ensure_root_record_placeholder(&mut self, accepted_root: &[u8; HASH_LEN]) {
        let record = self.root_record_pubkey(accepted_root);
        if self.ctx.get_account(&record).is_ok() {
            return;
        }
        self.ctx
            .create_account()
            .pubkey(record)
            .lamports(0)
            .owner(system_program::ID)
            .size(0)
            .create()
            .unwrap();
    }

    fn ensure_tree_leaf_marker_placeholder(&mut self, output_commitment: &[u8; HASH_LEN]) {
        let marker = self.tree_leaf_marker_pubkey(output_commitment);
        if self.ctx.get_account(&marker).is_ok() {
            return;
        }
        self.ctx
            .create_account()
            .pubkey(marker)
            .lamports(0)
            .owner(system_program::ID)
            .size(0)
            .create()
            .unwrap();
    }

    fn ensure_vault_authority_placeholder(&mut self, exit_asset_id: &[u8; HASH_LEN]) {
        let vault_authority = self.vault_authority_pubkey(exit_asset_id);
        if self.ctx.get_account(&vault_authority).is_ok() {
            return;
        }
        self.ctx
            .create_account()
            .pubkey(vault_authority)
            .lamports(0)
            .owner(system_program::ID)
            .size(0)
            .create()
            .unwrap();
    }

    fn ensure_vault_asset_placeholder(&mut self, exit_asset_id: &[u8; HASH_LEN]) {
        let vault_asset = self.vault_asset_pubkey(exit_asset_id);
        if self.ctx.get_account(&vault_asset).is_ok() {
            return;
        }
        self.ctx
            .create_account()
            .pubkey(vault_asset)
            .lamports(0)
            .owner(system_program::ID)
            .size(0)
            .create()
            .unwrap();
    }

    fn ensure_unregistered_vault_asset_account(&mut self, exit_asset_id: &[u8; HASH_LEN]) {
        let vault_asset = self.vault_asset_pubkey(exit_asset_id);
        if self.ctx.get_account(&vault_asset).is_err() {
            self.ctx
                .create_account()
                .pubkey(vault_asset)
                .lamports(1_000_000)
                .owner(self.program_id)
                .size(VAULT_ASSET_ACCOUNT_LEN)
                .create()
                .unwrap();
            return;
        }
        let mut account = self.ctx.read_account(&vault_asset).unwrap();
        account.lamports = 1_000_000;
        account.owner = self.program_id;
        account.data = vec![0; VAULT_ASSET_ACCOUNT_LEN];
        self.ctx.write_account(&vault_asset, account).unwrap();
    }

    fn ensure_valid_release_accounts(&mut self, payload: &UnshieldPayload) {
        self.ensure_token_program_account(payload.token_program);
        self.ensure_mint_account(payload.mint, payload.token_program);
        self.ensure_token_account(
            payload.vault_token_account,
            payload.token_program,
            payload.mint,
            self.vault_authority_pubkey(&payload.exit_asset_id),
        );
        self.ensure_token_account(
            payload.destination_token_account,
            payload.token_program,
            payload.mint,
            payload.exit_destination_pubkey(),
        );
    }

    fn ensure_wrong_vault_token_account(&mut self, payload: &UnshieldPayload) {
        self.ensure_token_program_account(payload.token_program);
        self.ensure_mint_account(payload.mint, payload.token_program);
        self.ensure_token_account(
            payload.vault_token_account,
            payload.token_program,
            payload.mint,
            self.wrong_root_history,
        );
        self.ensure_token_account(
            payload.destination_token_account,
            payload.token_program,
            payload.mint,
            payload.exit_destination_pubkey(),
        );
    }

    fn ensure_wrong_destination_token_account(&mut self, payload: &UnshieldPayload) {
        self.ensure_token_program_account(payload.token_program);
        self.ensure_mint_account(payload.mint, payload.token_program);
        self.ensure_token_account(
            payload.vault_token_account,
            payload.token_program,
            payload.mint,
            self.vault_authority_pubkey(&payload.exit_asset_id),
        );
        self.ensure_token_account(
            payload.destination_token_account,
            payload.token_program,
            payload.mint,
            self.wrong_root_history,
        );
    }

    fn ensure_wrong_token_program_accounts(&mut self, payload: &UnshieldPayload) {
        let wrong_token_program = self.wrong_root_history;
        self.ensure_token_program_account(payload.token_program);
        self.ensure_mint_account(payload.mint, wrong_token_program);
        self.ensure_token_account(
            payload.vault_token_account,
            payload.token_program,
            payload.mint,
            self.vault_authority_pubkey(&payload.exit_asset_id),
        );
        self.ensure_token_account(
            payload.destination_token_account,
            payload.token_program,
            payload.mint,
            payload.exit_destination_pubkey(),
        );
    }

    fn corrupt_vault_asset_release_enabled(&mut self, exit_asset_id: &[u8; HASH_LEN]) {
        let vault_asset = self.vault_asset_pubkey(exit_asset_id);
        let mut account = self.ctx.read_account(&vault_asset).unwrap();
        fuzz_assert_eq!(account.data.len(), VAULT_ASSET_ACCOUNT_LEN);
        account.data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] = 1;
        self.ctx.write_account(&vault_asset, account).unwrap();
    }

    fn ensure_token_program_account(&mut self, token_program: Pubkey) {
        if self.ctx.get_account(&token_program).is_ok() {
            return;
        }
        create_system_account(&mut self.ctx, token_program, 0);
    }

    fn ensure_mint_account(&mut self, mint: Pubkey, token_program: Pubkey) {
        if self.ctx.get_account(&mint).is_err() {
            self.ctx
                .create_account()
                .pubkey(mint)
                .lamports(1_000_000)
                .owner(token_program)
                .size(0)
                .create()
                .unwrap();
            return;
        }
        let mut account = self.ctx.read_account(&mint).unwrap();
        account.owner = token_program;
        self.ctx.write_account(&mint, account).unwrap();
    }

    fn ensure_token_account(
        &mut self,
        token_account: Pubkey,
        token_program: Pubkey,
        mint: Pubkey,
        owner: Pubkey,
    ) {
        if self.ctx.get_account(&token_account).is_err() {
            self.ctx
                .create_account()
                .pubkey(token_account)
                .lamports(1_000_000)
                .owner(token_program)
                .size(TOKEN_ACCOUNT_LEN)
                .create()
                .unwrap();
        } else {
            let mut account = self.ctx.read_account(&token_account).unwrap();
            account.owner = token_program;
            self.ctx.write_account(&token_account, account).unwrap();
        }
        self.ctx
            .update_account(&token_account, |data| {
                data.fill(0);
                data[TOKEN_ACCOUNT_MINT_OFFSET..TOKEN_ACCOUNT_MINT_OFFSET + HASH_LEN]
                    .copy_from_slice(mint.as_ref());
                data[TOKEN_ACCOUNT_OWNER_OFFSET..TOKEN_ACCOUNT_OWNER_OFFSET + HASH_LEN]
                    .copy_from_slice(owner.as_ref());
            })
            .unwrap();
    }

    fn ensure_verifier_key_account(&mut self, verifier_key_hash: &[u8; HASH_LEN]) {
        let verifier_key = self.verifier_key_pubkey(verifier_key_hash);
        if self.ctx.get_account(&verifier_key).is_ok() {
            return;
        }
        self.ctx
            .create_account()
            .pubkey(verifier_key)
            .lamports(1_000_000)
            .owner(self.program_id)
            .size(VERIFIER_KEY_ACCOUNT_LEN)
            .create()
            .unwrap();
        let account_data = verifier_key_account_data(
            &self.pool_state.to_bytes(),
            verifier_key_hash,
            &self.c01_verifier_program,
        );
        self.ctx
            .update_account(&verifier_key, |data| {
                data.copy_from_slice(&account_data);
            })
            .unwrap();
    }

    fn ensure_verifier_key_placeholder(&mut self, verifier_key_hash: &[u8; HASH_LEN]) {
        let verifier_key = self.verifier_key_pubkey(verifier_key_hash);
        if self.ctx.get_account(&verifier_key).is_ok() {
            return;
        }
        self.ctx
            .create_account()
            .pubkey(verifier_key)
            .lamports(0)
            .owner(system_program::ID)
            .size(0)
            .create()
            .unwrap();
    }

    fn assert_nullifier_marker(&self, nullifier: &[u8; HASH_LEN]) {
        let marker_data = self.account_data(self.nullifier_marker_pubkey(nullifier));
        fuzz_assert!(marker_data.len() >= NULLIFIER_MARKER_LEN);
        fuzz_assert_eq!(&marker_data[..8], NULLIFIER_MARKER_MAGIC);
        fuzz_assert_eq!(marker_data[8], VERSION);
        fuzz_assert_eq!(read_u32(&marker_data, COUNT_OFFSET), 1);
        fuzz_assert_eq!(
            &marker_data[NULLIFIER_MARKER_POOL_OFFSET..NULLIFIER_MARKER_POOL_OFFSET + HASH_LEN],
            &self.pool_state.to_bytes()
        );
        fuzz_assert_eq!(
            &marker_data
                [NULLIFIER_MARKER_NULLIFIER_OFFSET..NULLIFIER_MARKER_NULLIFIER_OFFSET + HASH_LEN],
            nullifier
        );
    }

    fn assert_output_record(&self, record: &OutputRecord) {
        let record_data = self.account_data(self.output_record_pubkey(&record.public_input_hash));
        fuzz_assert!(record_data.len() >= OUTPUT_RECORD_PDA_LEN);
        fuzz_assert_eq!(&record_data[..8], OUTPUT_RECORD_MAGIC);
        fuzz_assert_eq!(record_data[8], VERSION);
        fuzz_assert_eq!(read_u32(&record_data, COUNT_OFFSET), 1);
        fuzz_assert_eq!(
            read_u64(&record_data, OUTPUT_RECORD_INDEX_OFFSET),
            record.output_index
        );
        fuzz_assert_eq!(
            &record_data[OUTPUT_RECORD_POOL_OFFSET..OUTPUT_RECORD_POOL_OFFSET + HASH_LEN],
            &self.pool_state.to_bytes()
        );
        fuzz_assert_eq!(
            &record_data[OUTPUT_RECORD_OUTPUT0_OFFSET..OUTPUT_RECORD_OUTPUT0_OFFSET + HASH_LEN],
            &record.output0
        );
        fuzz_assert_eq!(
            &record_data[OUTPUT_RECORD_OUTPUT1_OFFSET..OUTPUT_RECORD_OUTPUT1_OFFSET + HASH_LEN],
            &record.output1
        );
        fuzz_assert_eq!(
            &record_data[OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET
                ..OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
            &record.public_input_hash
        );
    }

    fn assert_root_record(&self, record: &RootRecord) {
        let record_data = self.account_data(self.root_record_pubkey(&record.accepted_root));
        fuzz_assert!(record_data.len() >= ROOT_RECORD_ACCOUNT_LEN);
        fuzz_assert_eq!(&record_data[..8], ROOT_RECORD_MAGIC);
        fuzz_assert_eq!(record_data[8], VERSION);
        fuzz_assert_eq!(read_u32(&record_data, COUNT_OFFSET), 1);
        fuzz_assert_eq!(
            read_u64(&record_data, ROOT_RECORD_SEQUENCE_OFFSET),
            record.sequence
        );
        fuzz_assert_eq!(
            &record_data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN],
            &self.pool_state.to_bytes()
        );
        fuzz_assert_eq!(
            &record_data
                [ROOT_RECORD_PREVIOUS_ROOT_OFFSET..ROOT_RECORD_PREVIOUS_ROOT_OFFSET + HASH_LEN],
            &record.previous_root
        );
        fuzz_assert_eq!(
            &record_data
                [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN],
            &record.accepted_root
        );
        fuzz_assert_eq!(
            &record_data[ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET
                ..ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
            &record.transition_public_input_hash
        );
        fuzz_assert_eq!(
            read_u64(&record_data, ROOT_RECORD_LEAF_INDEX_BASE_OFFSET),
            record.leaf_index_base
        );
        fuzz_assert_eq!(
            read_u32(&record_data, ROOT_RECORD_LEAF_COUNT_OFFSET),
            record.leaf_count
        );
        fuzz_assert_eq!(
            record_data[ROOT_RECORD_TRANSITION_KIND_OFFSET],
            record.transition_kind
        );
    }

    fn assert_tree_state(&self, next_leaf_index: u64, expected_root: &[u8; HASH_LEN]) {
        let tree_data = self.account_data(self.tree_state);
        fuzz_assert!(tree_data.len() >= TREE_STATE_LEN);
        fuzz_assert_eq!(&tree_data[..8], TREE_MAGIC);
        fuzz_assert_eq!(tree_data[8], VERSION);
        fuzz_assert_eq!(read_u32(&tree_data, COUNT_OFFSET), 1);
        fuzz_assert_eq!(tree_data[TREE_DEPTH_OFFSET], MERKLE_TREE_DEPTH as u8);
        fuzz_assert_eq!(read_u64(&tree_data, TREE_NEXT_LEAF_INDEX_OFFSET), next_leaf_index);
        fuzz_assert_eq!(
            &tree_data[TREE_CURRENT_ROOT_OFFSET..TREE_CURRENT_ROOT_OFFSET + HASH_LEN],
            expected_root
        );
    }

    fn assert_tree_leaf_marker(&self, output_commitment: &[u8; HASH_LEN], leaf_index: u64) {
        let marker_data = self.account_data(self.tree_leaf_marker_pubkey(output_commitment));
        fuzz_assert!(marker_data.len() >= TREE_LEAF_MARKER_LEN);
        fuzz_assert_eq!(&marker_data[..8], TREE_LEAF_MARKER_MAGIC);
        fuzz_assert_eq!(marker_data[8], VERSION);
        fuzz_assert_eq!(read_u32(&marker_data, COUNT_OFFSET), 1);
        fuzz_assert_eq!(
            &marker_data[TREE_LEAF_MARKER_POOL_OFFSET..TREE_LEAF_MARKER_POOL_OFFSET + HASH_LEN],
            &self.pool_state.to_bytes()
        );
        fuzz_assert_eq!(
            &marker_data[TREE_LEAF_MARKER_LEAF_OFFSET..TREE_LEAF_MARKER_LEAF_OFFSET + HASH_LEN],
            output_commitment
        );
        fuzz_assert_eq!(read_u64(&marker_data, TREE_LEAF_MARKER_INDEX_OFFSET), leaf_index);
    }

    fn assert_no_root_record_for_legacy_root(&self, accepted_root: &[u8; HASH_LEN]) {
        if let Ok(account) = self
            .ctx
            .get_account(&self.root_record_pubkey(accepted_root))
        {
            let has_root_record_magic = account.data.len() >= ROOT_RECORD_MAGIC.len()
                && &account.data[..ROOT_RECORD_MAGIC.len()] == ROOT_RECORD_MAGIC;
            fuzz_assert!(
                !has_root_record_magic,
                "legacy tag 2 root unexpectedly has provenanced root record"
            );
        }
    }

    fn assert_verifier_key_account(&self, verifier_key_hash: &[u8; HASH_LEN]) {
        self.assert_verifier_key_account_for_program(verifier_key_hash, self.c01_verifier_program);
    }

    fn assert_verifier_key_account_for_program(
        &self,
        verifier_key_hash: &[u8; HASH_LEN],
        verifier_program: Pubkey,
    ) {
        let key_data = self.account_data(self.verifier_key_pubkey(verifier_key_hash));
        fuzz_assert!(key_data.len() >= VERIFIER_KEY_ACCOUNT_LEN);
        fuzz_assert_eq!(&key_data[..8], VERIFIER_KEY_MAGIC);
        fuzz_assert_eq!(key_data[8], VERSION);
        fuzz_assert_eq!(read_u32(&key_data, COUNT_OFFSET), 1);
        fuzz_assert_eq!(
            &key_data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN],
            &self.pool_state.to_bytes()
        );
        fuzz_assert_eq!(
            &key_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN],
            verifier_key_hash
        );
        fuzz_assert_eq!(
            &key_data[VERIFIER_KEY_PROGRAM_ID_OFFSET..VERIFIER_KEY_PROGRAM_ID_OFFSET + HASH_LEN],
            &verifier_program.to_bytes()
        );
    }

    fn assert_vault_asset_account(&self, record: &VaultAssetRecord) {
        let asset_data = self.account_data(self.vault_asset_pubkey(&record.exit_asset_id));
        fuzz_assert_eq!(asset_data.len(), VAULT_ASSET_ACCOUNT_LEN);
        fuzz_assert_eq!(&asset_data[..8], VAULT_ASSET_MAGIC);
        fuzz_assert_eq!(asset_data[8], VERSION);
        fuzz_assert_eq!(read_u32(&asset_data, COUNT_OFFSET), 1);
        fuzz_assert_eq!(
            &asset_data[VAULT_ASSET_POOL_OFFSET..VAULT_ASSET_POOL_OFFSET + HASH_LEN],
            &self.pool_state.to_bytes()
        );
        fuzz_assert_eq!(
            &asset_data
                [VAULT_ASSET_EXIT_ASSET_ID_OFFSET..VAULT_ASSET_EXIT_ASSET_ID_OFFSET + HASH_LEN],
            &record.exit_asset_id
        );
        fuzz_assert_eq!(
            &asset_data[VAULT_ASSET_MINT_OFFSET..VAULT_ASSET_MINT_OFFSET + HASH_LEN],
            record.mint.as_ref()
        );
        fuzz_assert_eq!(
            &asset_data
                [VAULT_ASSET_VAULT_AUTHORITY_OFFSET..VAULT_ASSET_VAULT_AUTHORITY_OFFSET + HASH_LEN],
            record.vault_authority.as_ref()
        );
        fuzz_assert_eq!(
            &asset_data[VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET
                ..VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET + HASH_LEN],
            record.vault_token_account.as_ref()
        );
        fuzz_assert_eq!(
            &asset_data
                [VAULT_ASSET_TOKEN_PROGRAM_OFFSET..VAULT_ASSET_TOKEN_PROGRAM_OFFSET + HASH_LEN],
            record.token_program.as_ref()
        );
        fuzz_assert_eq!(asset_data[VAULT_ASSET_KIND_OFFSET], record.asset_kind);
        fuzz_assert_eq!(asset_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET], 0);
    }

    fn nullifier_marker_pubkey(&self, nullifier: &[u8; HASH_LEN]) -> Pubkey {
        Pubkey::find_program_address(
            &[NULLIFIER_MARKER_SEED, self.pool_state.as_ref(), nullifier],
            &self.program_id,
        )
        .0
    }

    fn output_record_pubkey(&self, public_input_hash: &[u8; HASH_LEN]) -> Pubkey {
        Pubkey::find_program_address(
            &[
                OUTPUT_RECORD_SEED,
                self.pool_state.as_ref(),
                public_input_hash,
            ],
            &self.program_id,
        )
        .0
    }

    fn root_record_pubkey(&self, accepted_root: &[u8; HASH_LEN]) -> Pubkey {
        Pubkey::find_program_address(
            &[ROOT_RECORD_SEED, self.pool_state.as_ref(), accepted_root],
            &self.program_id,
        )
        .0
    }

    fn tree_leaf_marker_pubkey(&self, output_commitment: &[u8; HASH_LEN]) -> Pubkey {
        Pubkey::find_program_address(
            &[
                TREE_LEAF_MARKER_SEED,
                self.pool_state.as_ref(),
                output_commitment,
            ],
            &self.program_id,
        )
        .0
    }

    fn tree_current_root(&self) -> [u8; HASH_LEN] {
        read_hash(&self.account_data(self.tree_state), TREE_CURRENT_ROOT_OFFSET)
    }

    fn tree_next_leaf_index(&self) -> u64 {
        read_u64(&self.account_data(self.tree_state), TREE_NEXT_LEAF_INDEX_OFFSET)
    }

    fn vault_authority_pubkey(&self, exit_asset_id: &[u8; HASH_LEN]) -> Pubkey {
        Pubkey::find_program_address(
            &[
                VAULT_AUTHORITY_SEED,
                self.pool_state.as_ref(),
                exit_asset_id,
            ],
            &self.program_id,
        )
        .0
    }

    fn vault_asset_pubkey(&self, exit_asset_id: &[u8; HASH_LEN]) -> Pubkey {
        Pubkey::find_program_address(
            &[VAULT_ASSET_SEED, self.pool_state.as_ref(), exit_asset_id],
            &self.program_id,
        )
        .0
    }

    fn verifier_key_pubkey(&self, verifier_key_hash: &[u8; HASH_LEN]) -> Pubkey {
        Pubkey::find_program_address(
            &[
                VERIFIER_KEY_SEED,
                self.pool_state.as_ref(),
                verifier_key_hash,
            ],
            &self.program_id,
        )
        .0
    }

    fn account_data(&self, pubkey: Pubkey) -> Vec<u8> {
        self.ctx.get_account(&pubkey).unwrap().data
    }
}

#[derive(Clone)]
struct SpendPayload {
    data: Vec<u8>,
    nullifier: [u8; HASH_LEN],
    output0: [u8; HASH_LEN],
    output1: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
}

#[derive(Clone)]
struct SpendWithProofPayload {
    data: Vec<u8>,
    nullifier: [u8; HASH_LEN],
    accepted_root: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
}

#[derive(Clone)]
struct UnshieldPayload {
    data: Vec<u8>,
    nullifier: [u8; HASH_LEN],
    accepted_root: [u8; HASH_LEN],
    exit_destination: [u8; HASH_LEN],
    exit_asset_id: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
    mint: Pubkey,
    vault_token_account: Pubkey,
    destination_token_account: Pubkey,
    token_program: Pubkey,
}

impl UnshieldPayload {
    fn exit_destination_pubkey(&self) -> Pubkey {
        pubkey_from_hash(self.exit_destination)
    }
}

fn spend_payload(seed: u64, accepted_root: [u8; HASH_LEN]) -> SpendPayload {
    let nullifier = make_hash(seed, 1);
    let output0 = make_hash(seed, 2);
    let output1 = make_hash(seed, 3);
    let public_input_hash = make_hash(seed, 5);
    SpendPayload {
        data: spend_data(
            nullifier,
            output0,
            output1,
            accepted_root,
            public_input_hash,
        ),
        nullifier,
        output0,
        output1,
        public_input_hash,
    }
}

fn spend_with_proof_payload(seed: u64, accepted_root: [u8; HASH_LEN]) -> SpendWithProofPayload {
    spend_with_proof_payload_with_nullifier(seed, accepted_root, make_hash(seed, 71))
}

fn spend_with_proof_payload_with_nullifier(
    seed: u64,
    accepted_root: [u8; HASH_LEN],
    nullifier: [u8; HASH_LEN],
) -> SpendWithProofPayload {
    let output0 = make_hash(seed, 72);
    let output1 = make_hash(seed, 73);
    let public_input_hash = make_hash(seed, 74);
    let verifier_key_hash = make_hash(seed, 75);
    SpendWithProofPayload {
        data: spend_with_proof_data(
            nullifier,
            output0,
            output1,
            accepted_root,
            public_input_hash,
            verifier_key_hash,
        ),
        nullifier,
        accepted_root,
        public_input_hash,
        verifier_key_hash,
    }
}

fn spend_with_proof_payload_with_gnark_artifacts(
    seed: u64,
    accepted_root: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
    proof: &[u8],
    public_witness: &[u8],
) -> SpendWithProofPayload {
    let public_input_hash = gnark_public_witness_input_hash(public_witness);
    spend_with_proof_payload_with_gnark_artifacts_and_public_input_hash(
        seed,
        accepted_root,
        public_input_hash,
        verifier_key_hash,
        proof,
        public_witness,
    )
}

fn spend_with_proof_payload_with_gnark_artifacts_and_public_input_hash(
    seed: u64,
    accepted_root: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
    proof: &[u8],
    public_witness: &[u8],
) -> SpendWithProofPayload {
    let nullifier = make_hash(seed, 71);
    let output0 = make_hash(seed, 72);
    let output1 = make_hash(seed, 73);
    SpendWithProofPayload {
        data: spend_with_proof_data_with_gnark_artifacts(
            nullifier,
            output0,
            output1,
            accepted_root,
            public_input_hash,
            verifier_key_hash,
            proof,
            public_witness,
        ),
        nullifier,
        accepted_root,
        public_input_hash,
        verifier_key_hash,
    }
}

fn unshield_payload(seed: u64, accepted_root: [u8; HASH_LEN]) -> UnshieldPayload {
    unshield_payload_with_nullifier(seed, accepted_root, make_hash(seed, 61))
}

fn unshield_payload_with_nullifier(
    seed: u64,
    accepted_root: [u8; HASH_LEN],
    nullifier: [u8; HASH_LEN],
) -> UnshieldPayload {
    let exit_destination = make_hash(seed, 62);
    let exit_asset_id = make_hash(seed, 63);
    let public_input_hash = make_hash(seed, 64);
    let verifier_key_hash = make_hash(seed, 67);
    UnshieldPayload {
        data: unshield_data(
            nullifier,
            accepted_root,
            exit_destination,
            exit_asset_id,
            public_input_hash,
            verifier_key_hash,
        ),
        nullifier,
        accepted_root,
        exit_destination,
        exit_asset_id,
        verifier_key_hash,
        mint: pubkey_from_hash(make_hash(seed, 65)),
        vault_token_account: pubkey_from_hash(make_hash(seed, 66)),
        destination_token_account: pubkey_from_hash(make_hash(seed, 68)),
        token_program: SPL_TOKEN_PROGRAM_ID,
    }
}

fn spend_data(
    nullifier: [u8; HASH_LEN],
    output0: [u8; HASH_LEN],
    output1: [u8; HASH_LEN],
    accepted_root: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
) -> Vec<u8> {
    let mut data = Vec::with_capacity(1 + HASH_LEN * 5);
    data.push(TAG_SPEND);
    data.extend_from_slice(&nullifier);
    data.extend_from_slice(&output0);
    data.extend_from_slice(&output1);
    data.extend_from_slice(&accepted_root);
    data.extend_from_slice(&public_input_hash);
    data
}

fn spend_with_proof_data(
    nullifier: [u8; HASH_LEN],
    output0: [u8; HASH_LEN],
    output1: [u8; HASH_LEN],
    accepted_root: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
) -> Vec<u8> {
    let mut data = spend_data(
        nullifier,
        output0,
        output1,
        accepted_root,
        public_input_hash,
    );
    data[0] = TAG_SPEND_WITH_PROOF;
    data.extend_from_slice(&verifier_key_hash);
    data.extend_from_slice(&[7; SPEND_WITH_PROOF_GNARK_PROOF_LEN]);
    data.extend_from_slice(&gnark_public_witness_for(&public_input_hash));
    data
}

fn spend_with_proof_data_with_gnark_artifacts(
    nullifier: [u8; HASH_LEN],
    output0: [u8; HASH_LEN],
    output1: [u8; HASH_LEN],
    accepted_root: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
    proof: &[u8],
    public_witness: &[u8],
) -> Vec<u8> {
    assert_eq!(proof.len(), SPEND_WITH_PROOF_GNARK_PROOF_LEN);
    assert_eq!(public_witness.len(), SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN);
    let mut data = spend_data(
        nullifier,
        output0,
        output1,
        accepted_root,
        public_input_hash,
    );
    data[0] = TAG_SPEND_WITH_PROOF;
    data.extend_from_slice(&verifier_key_hash);
    data.extend_from_slice(proof);
    data.extend_from_slice(public_witness);
    data
}

fn gnark_public_witness_input_hash(
    public_witness: &[u8],
) -> [u8; HASH_LEN] {
    assert_eq!(public_witness.len(), SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN);
    assert_eq!(
        &public_witness[..12],
        &[0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1]
    );
    public_witness[12..].try_into().unwrap()
}

fn payload_output0(payload: &SpendWithProofPayload) -> [u8; HASH_LEN] {
    payload.data[1 + HASH_LEN..1 + HASH_LEN * 2]
        .try_into()
        .unwrap()
}

fn payload_output1(payload: &SpendWithProofPayload) -> [u8; HASH_LEN] {
    payload.data[1 + HASH_LEN * 2..1 + HASH_LEN * 3]
        .try_into()
        .unwrap()
}

fn env_hash_or(name: &str, fallback: [u8; HASH_LEN]) -> [u8; HASH_LEN] {
    let Ok(value) = std::env::var(name) else {
        return fallback;
    };
    let value = value.strip_prefix("sha256:").unwrap_or(&value);
    assert_eq!(value.len(), HASH_LEN * 2, "{name} must be a 32-byte hex sha256");

    let mut out = [0u8; HASH_LEN];
    for (index, chunk) in value.as_bytes().chunks_exact(2).enumerate() {
        let high = hex_nibble(chunk[0]);
        let low = hex_nibble(chunk[1]);
        out[index] = (high << 4) | low;
    }
    out
}

fn hex_nibble(byte: u8) -> u8 {
    match byte {
        b'0'..=b'9' => byte - b'0',
        b'a'..=b'f' => byte - b'a' + 10,
        b'A'..=b'F' => byte - b'A' + 10,
        _ => panic!("invalid hex byte"),
    }
}

fn local_unsafe_legacy_sunspot_vk_sha256() -> [u8; HASH_LEN] {
    [
        0xfb, 0xd6, 0xba, 0x8c, 0xe6, 0x4c, 0xc0, 0xb0, 0x32, 0x0a, 0x0d, 0x80, 0x80, 0xfc,
        0xa1, 0x5d, 0x79, 0xca, 0x6c, 0xa2, 0xf7, 0x32, 0x38, 0x1a, 0x95, 0x50, 0x09, 0x2f,
        0x64, 0x5f, 0x0e, 0x1d,
    ]
}

fn local_unsafe_h6_sunspot_vk_sha256() -> [u8; HASH_LEN] {
    [
        0x5e, 0x0a, 0x6f, 0x08, 0x50, 0x3f, 0x53, 0x4c, 0xbb, 0x46, 0x2f, 0x43, 0xfb, 0xf0,
        0xb2, 0x47, 0xe8, 0xaa, 0x2c, 0xe7, 0x5d, 0x1f, 0xa5, 0x8c, 0x23, 0x50, 0xf8, 0x15,
        0x81, 0x79, 0x48, 0xb4,
    ]
}

fn gnark_public_witness_for(
    public_input_hash: &[u8; HASH_LEN],
) -> [u8; SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN] {
    let mut public_witness = [0u8; SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN];
    public_witness[..12].copy_from_slice(&[0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1]);
    public_witness[12..].copy_from_slice(public_input_hash);
    public_witness
}

fn unshield_data(
    nullifier: [u8; HASH_LEN],
    accepted_root: [u8; HASH_LEN],
    exit_destination: [u8; HASH_LEN],
    exit_asset_id: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
) -> Vec<u8> {
    let mut data = Vec::with_capacity(
        1 + HASH_LEN * 6
            + EXIT_AMOUNT_LEN
            + UNSHIELD_GNARK_PROOF_LEN
            + UNSHIELD_GNARK_PUBLIC_WITNESS_LEN,
    );
    data.push(TAG_UNSHIELD);
    data.extend_from_slice(&nullifier);
    data.extend_from_slice(&accepted_root);
    data.extend_from_slice(&exit_destination);
    data.extend_from_slice(&exit_asset_id);
    data.extend_from_slice(&seeded_exit_amount(&exit_asset_id));
    data.extend_from_slice(&public_input_hash);
    data.extend_from_slice(&verifier_key_hash);
    data.extend_from_slice(&[6; UNSHIELD_GNARK_PROOF_LEN]);
    data.extend_from_slice(&gnark_public_witness_for(&public_input_hash));
    data
}

fn verifier_key_account_data(
    pool_state: &[u8; HASH_LEN],
    verifier_key_hash: &[u8; HASH_LEN],
    verifier_program_id: &Pubkey,
) -> Vec<u8> {
    let mut data = vec![0; VERIFIER_KEY_ACCOUNT_LEN];
    data[..8].copy_from_slice(VERIFIER_KEY_MAGIC);
    data[8] = VERSION;
    data[COUNT_OFFSET..COUNT_OFFSET + 4].copy_from_slice(&1_u32.to_le_bytes());
    data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN].copy_from_slice(pool_state);
    data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
        .copy_from_slice(verifier_key_hash);
    data[VERIFIER_KEY_PROGRAM_ID_OFFSET..VERIFIER_KEY_PROGRAM_ID_OFFSET + HASH_LEN]
        .copy_from_slice(verifier_program_id.as_ref());
    data
}

fn seeded_exit_amount(exit_asset_id: &[u8; HASH_LEN]) -> [u8; EXIT_AMOUNT_LEN] {
    exit_asset_id[0..EXIT_AMOUNT_LEN].try_into().unwrap()
}

fn provenanced_root_data(record: &RootRecord) -> Vec<u8> {
    let mut data = Vec::with_capacity(1 + HASH_LEN * 3 + 8 + 4 + 1);
    data.push(TAG_REGISTER_PROVENANCED_ROOT);
    data.extend_from_slice(&record.accepted_root);
    data.extend_from_slice(&record.previous_root);
    data.extend_from_slice(&record.transition_public_input_hash);
    data.extend_from_slice(&record.leaf_index_base.to_le_bytes());
    data.extend_from_slice(&record.leaf_count.to_le_bytes());
    data.push(record.transition_kind);
    data
}

fn register_root_data(accepted_root: [u8; HASH_LEN]) -> Vec<u8> {
    let mut data = Vec::with_capacity(1 + HASH_LEN);
    data.push(TAG_REGISTER_ROOT);
    data.extend_from_slice(&accepted_root);
    data
}

fn register_verifier_key_data(
    verifier_key_hash: [u8; HASH_LEN],
    verifier_program_id: Pubkey,
) -> Vec<u8> {
    let mut data = Vec::with_capacity(1 + HASH_LEN * 2);
    data.push(TAG_REGISTER_VERIFIER_KEY);
    data.extend_from_slice(&verifier_key_hash);
    data.extend_from_slice(verifier_program_id.as_ref());
    data
}

fn register_vault_asset_data(record: &VaultAssetRecord) -> Vec<u8> {
    let mut data = Vec::with_capacity(1 + HASH_LEN * 4 + 1);
    data.push(TAG_REGISTER_VAULT_ASSET);
    data.extend_from_slice(&record.exit_asset_id);
    data.extend_from_slice(record.mint.as_ref());
    data.extend_from_slice(record.vault_token_account.as_ref());
    data.extend_from_slice(record.token_program.as_ref());
    data.push(record.asset_kind);
    data
}

fn make_hash(seed: u64, domain: u8) -> [u8; HASH_LEN] {
    let mut out = [domain; HASH_LEN];
    out[0..8].copy_from_slice(&seed.to_le_bytes());
    out[8..16].copy_from_slice(&seed.rotate_left(17).to_le_bytes());
    out[16..24].copy_from_slice(&(seed ^ ((domain as u64) << 56)).to_le_bytes());
    out[24..32].copy_from_slice(&seed.wrapping_mul(0x9e37_79b9_7f4a_7c15).to_le_bytes());
    out
}

fn pubkey_from_hash(hash: [u8; HASH_LEN]) -> Pubkey {
    Pubkey::new_from_array(hash)
}

fn create_program_accounts(
    ctx: &mut TestContext,
    program_id: &Pubkey,
    pool_state: Pubkey,
    nullifier_set: Pubkey,
    output_queue: Pubkey,
    root_history: Pubkey,
    tree_state: Pubkey,
    nullifier_capacity: usize,
    root_capacity: usize,
) {
    ctx.create_account()
        .pubkey(pool_state)
        .lamports(1_000_000)
        .owner(*program_id)
        .size(POOL_STATE_LEN)
        .create()
        .unwrap();
    ctx.create_account()
        .pubkey(nullifier_set)
        .lamports(1_000_000)
        .owner(*program_id)
        .size(fixed_slot_len(nullifier_capacity, HASH_LEN))
        .create()
        .unwrap();
    ctx.create_account()
        .pubkey(output_queue)
        .lamports(1_000_000)
        .owner(*program_id)
        .size(HEADER_LEN)
        .create()
        .unwrap();
    ctx.create_account()
        .pubkey(root_history)
        .lamports(1_000_000)
        .owner(*program_id)
        .size(fixed_slot_len(root_capacity, HASH_LEN))
        .create()
        .unwrap();
    ctx.create_account()
        .pubkey(tree_state)
        .lamports(1_000_000)
        .owner(*program_id)
        .size(TREE_STATE_LEN)
        .create()
        .unwrap();
}

fn create_system_account(ctx: &mut TestContext, pubkey: Pubkey, size: usize) {
    ctx.create_account()
        .pubkey(pubkey)
        .lamports(1_000_000)
        .owner(system_program::ID)
        .size(size)
        .create()
        .unwrap();
}

fn fixed_slot_len(capacity: usize, slot_len: usize) -> usize {
    HEADER_LEN + capacity * slot_len
}

fn read_u32(data: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes(data[offset..offset + 4].try_into().unwrap())
}

fn read_u64(data: &[u8], offset: usize) -> u64 {
    u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap())
}

fn read_hash(data: &[u8], offset: usize) -> [u8; HASH_LEN] {
    data[offset..offset + HASH_LEN].try_into().unwrap()
}

#[allow(deprecated)]
fn poseidon_hash_leaf(leaf: &[u8; HASH_LEN]) -> Option<[u8; HASH_LEN]> {
    poseidon_hashv(Parameters::Bn254X5, Endianness::BigEndian, &[leaf])
        .ok()
        .map(|hash| hash.to_bytes())
}

#[allow(deprecated)]
fn poseidon_hash_node(left: &[u8; HASH_LEN], right: &[u8; HASH_LEN]) -> Option<[u8; HASH_LEN]> {
    poseidon_hashv(Parameters::Bn254X5, Endianness::BigEndian, &[left, right])
        .ok()
        .map(|hash| hash.to_bytes())
}

fn compute_empty_tree_nodes() -> Option<[[u8; HASH_LEN]; TREE_ZERO_NODE_COUNT]> {
    let mut zero_nodes = [[0u8; HASH_LEN]; TREE_ZERO_NODE_COUNT];
    zero_nodes[0] = poseidon_hash_leaf(&[0u8; HASH_LEN])?;
    for level in 1..TREE_ZERO_NODE_COUNT {
        zero_nodes[level] = poseidon_hash_node(&zero_nodes[level - 1], &zero_nodes[level - 1])?;
    }
    Some(zero_nodes)
}

fn compute_program_owned_append_root(
    tree_data: &[u8],
    leaf_index: u64,
    output_commitment: &[u8; HASH_LEN],
) -> Option<[u8; HASH_LEN]> {
    let zero_nodes = compute_empty_tree_nodes()?;
    let mut frontier = [[0u8; HASH_LEN]; MERKLE_TREE_DEPTH];
    for level in 0..MERKLE_TREE_DEPTH {
        frontier[level] = read_hash(tree_data, TREE_FRONTIER_OFFSET + level * HASH_LEN);
    }

    let mut current = poseidon_hash_leaf(output_commitment)?;
    for level in 0..MERKLE_TREE_DEPTH {
        if ((leaf_index >> level) & 1) == 0 {
            frontier[level] = current;
            current = poseidon_hash_node(&current, &zero_nodes[level])?;
        } else {
            current = poseidon_hash_node(&frontier[level], &current)?;
        }
    }
    Some(current)
}

fn append_tree_leaf_data(output_commitment: &[u8; HASH_LEN], record: &RootRecord) -> Vec<u8> {
    let mut data = Vec::with_capacity(1 + HASH_LEN * 4 + 1);
    data.push(TAG_APPEND_TREE_LEAF);
    data.extend_from_slice(output_commitment);
    data.extend_from_slice(&record.previous_root);
    data.extend_from_slice(&record.accepted_root);
    data.extend_from_slice(&record.transition_public_input_hash);
    data.push(record.transition_kind);
    data
}
