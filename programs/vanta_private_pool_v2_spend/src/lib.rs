#[allow(deprecated)]
use solana_poseidon::{hashv as poseidon_hashv, Endianness, Parameters};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    instruction::Instruction,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction, system_program,
    sysvar::{rent::Rent, Sysvar},
};

entrypoint!(process_instruction);

const TAG_INIT: u8 = 0;
const TAG_SPEND: u8 = 1;
const TAG_REGISTER_ROOT: u8 = 2;
const TAG_SPEND_WITH_PROOF: u8 = 3;
const TAG_REGISTER_PROVENANCED_ROOT: u8 = 4;
const TAG_REGISTER_VERIFIER_KEY: u8 = 5;
const TAG_UNSHIELD: u8 = 6;
const TAG_REGISTER_VAULT_ASSET: u8 = 7; // future: register vault_asset_record (kind=SPL/SOL=2), SOL vault PDA creation, releaseEnabled flag (per design doc §11 + VANTA_ZK_REVIEW U2.1)
const TAG_SHIELD: u8 = 8;
const TAG_APPEND_TREE_LEAF: u8 = 9;

mod spl_token {
    pub mod instruction {
        use solana_program::{
            instruction::{AccountMeta, Instruction},
            program_error::ProgramError,
            pubkey::Pubkey,
        };

        pub fn transfer_checked(
            token_program: &Pubkey,
            source: &Pubkey,
            mint: &Pubkey,
            destination: &Pubkey,
            authority: &Pubkey,
            signers: &[&Pubkey],
            amount: u64,
            decimals: u8,
        ) -> Result<Instruction, ProgramError> {
            if !signers.is_empty() {
                return Err(ProgramError::InvalidInstructionData);
            }

            let mut data = Vec::with_capacity(10);
            data.push(12);
            data.extend_from_slice(&amount.to_le_bytes());
            data.push(decimals);

            Ok(Instruction {
                program_id: *token_program,
                accounts: vec![
                    AccountMeta::new(*source, false),
                    AccountMeta::new_readonly(*mint, false),
                    AccountMeta::new(*destination, false),
                    AccountMeta::new_readonly(*authority, true),
                ],
                data,
            })
        }
    }
}

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
const NULLIFIER_MARKER_SEED: &[u8] = b"vanta2nul";
const OUTPUT_RECORD_SEED: &[u8] = b"vanta2out";
const ROOT_RECORD_SEED: &[u8] = b"vanta2root";
const TREE_LEAF_MARKER_SEED: &[u8] = b"vanta2leaf";
const VAULT_AUTHORITY_SEED: &[u8] = b"vanta2vault";
const VERIFIER_KEY_SEED: &[u8] = b"vanta2vkey";
const VAULT_ASSET_SEED: &[u8] = b"vanta2asset";

// Native SOL + TAG6 support (per authoritative design doc §11 "TAG6 Future-Proofing & Native SOL On-Chain Boundary",
// Phase 4, success criteria, Native SOL + TAG6 Readiness Checklist; status note immediate priority;
// VANTA_ZK_REVIEW.md U2.1 Native SOL Support in TAG_UNSHIELD=6 with PDA seeds, VAULT_ASSET_KIND_SOL=2,
// system CPI logic, sentinel usage).
// All changes keep "as private as possible" (program-owned PDA custody + on-chain proof verification).
// Sentinel = 32 zero bytes (explicit bypass in preflights); unified tree compatible (no re-shield).
const NATIVE_SOL_ASSET_ID_SENTINEL: [u8; 32] = [0u8; 32];
const VAULT_ASSET_KIND_SPL: u8 = 1;
const VAULT_ASSET_KIND_SOL: u8 = 2;

const ASSET_RECORD_SEED: &[u8] = VAULT_ASSET_SEED;
const SOL_VAULT_SEED: &[u8] = b"vanta2solvault"; // exact per design doc §11 + VANTA_ZK_REVIEW U2.1 (alt generalized "vanta2vault" + kind)
const ASSET_RECORD_MAGIC: &[u8; 8] = VAULT_ASSET_MAGIC; // for vault_asset_record PDA header

// Reusable PDA derivation helper for SOL vault (program-owned lamports custody).
// Seeds exactly match design doc §11 data model and VANTA_ZK_REVIEW U2.1.
// Used in process_unshield (TAG_UNSHIELD=6 SOL branch) and future TAG_REGISTER_VAULT_ASSET + TAG_SHIELD.
fn sol_vault_pda(program_id: &Pubkey, pool_state: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            SOL_VAULT_SEED,
            pool_state.as_ref(),
            &NATIVE_SOL_ASSET_ID_SENTINEL,
        ],
        program_id,
    )
}

// Reusable asset registry PDA derivation (generalized for SOL sentinel or SPL mint-derived).
fn vault_asset_record_pda(
    program_id: &Pubkey,
    pool_state: &Pubkey,
    asset_id: &[u8; 32],
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[ASSET_RECORD_SEED, pool_state.as_ref(), asset_id],
        program_id,
    )
}

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
const POOL_VERIFIER_WIRED: u8 = 1;

const HASH_LEN: usize = 32;
const MERKLE_TREE_DEPTH: usize = 20;
const TREE_ZERO_NODE_COUNT: usize = MERKLE_TREE_DEPTH + 1;
const TREE_CAPACITY: u64 = 1u64 << MERKLE_TREE_DEPTH;
const EXIT_AMOUNT_LEN: usize = 8;
const RESERVED_GROTH16_PROOF_LEN: usize = 256;
const SPEND_WITH_PROOF_GNARK_PROOF_LEN: usize = 324;
const SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN: usize = 44;
const SPEND_WITH_PROOF_VERIFIER_INPUT_LEN: usize =
    SPEND_WITH_PROOF_GNARK_PROOF_LEN + SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN;
const GNARK_PUBLIC_WITNESS_HEADER_LEN: usize = 12;
const GNARK_PUBLIC_WITNESS_VALUE_OFFSET: usize = GNARK_PUBLIC_WITNESS_HEADER_LEN;
const GNARK_PUBLIC_WITNESS_ONE_PUBLIC_INPUT_HEADER: [u8; GNARK_PUBLIC_WITNESS_HEADER_LEN] =
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1];
const SPEND_PAYLOAD_LEN: usize = 1 + HASH_LEN * 5;
const REGISTER_ROOT_PAYLOAD_LEN: usize = 1 + HASH_LEN;
const PROVENANCED_ROOT_PAYLOAD_LEN: usize = 1 + HASH_LEN * 3 + 8 + 4 + 1;
const APPEND_TREE_LEAF_PAYLOAD_LEN: usize = 1 + HASH_LEN * 4 + 1;
const SHIELD_ASSET_ID_OFFSET: usize = 0;
const SHIELD_AMOUNT_OFFSET: usize = SHIELD_ASSET_ID_OFFSET + HASH_LEN;
const SHIELD_OUTPUT_COMMITMENT_OFFSET: usize = SHIELD_AMOUNT_OFFSET + EXIT_AMOUNT_LEN;
const SHIELD_PUBLIC_INPUT_HASH_OFFSET: usize = SHIELD_OUTPUT_COMMITMENT_OFFSET + HASH_LEN;
const SHIELD_ASSET_KIND_OFFSET: usize = SHIELD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN;
const SHIELD_DECIMALS_OFFSET: usize = SHIELD_ASSET_KIND_OFFSET + 1;
const SHIELD_VERIFIER_KEY_HASH_OFFSET: usize = SHIELD_DECIMALS_OFFSET + 1;
const SHIELD_PROOF_OFFSET: usize = SHIELD_VERIFIER_KEY_HASH_OFFSET + HASH_LEN;
const SHIELD_GNARK_PROOF_LEN: usize = SPEND_WITH_PROOF_GNARK_PROOF_LEN;
const SHIELD_GNARK_PUBLIC_WITNESS_LEN: usize = SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN;
const SHIELD_PUBLIC_WITNESS_OFFSET: usize = SHIELD_PROOF_OFFSET + SHIELD_GNARK_PROOF_LEN;
const SHIELD_VERIFIER_INPUT_LEN: usize = SHIELD_GNARK_PROOF_LEN + SHIELD_GNARK_PUBLIC_WITNESS_LEN;
const SHIELD_PAYLOAD_LEN: usize =
    1 + HASH_LEN * 4 + EXIT_AMOUNT_LEN + 2 + SHIELD_VERIFIER_INPUT_LEN;
const REGISTER_VERIFIER_KEY_PAYLOAD_LEN: usize = 1 + HASH_LEN * 2;
const REGISTER_VAULT_ASSET_PAYLOAD_LEN: usize = 1 + HASH_LEN * 4 + 1;
const SPEND_WITH_PROOF_PROOF_OFFSET: usize = HASH_LEN * 6;
const SPEND_WITH_PROOF_PUBLIC_WITNESS_OFFSET: usize =
    SPEND_WITH_PROOF_PROOF_OFFSET + SPEND_WITH_PROOF_GNARK_PROOF_LEN;
const SPEND_WITH_PROOF_PAYLOAD_LEN: usize = 1 + HASH_LEN * 6 + SPEND_WITH_PROOF_VERIFIER_INPUT_LEN;
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
const TREE_POOL_OFFSET: usize = HEADER_LEN;
const TREE_DEPTH_OFFSET: usize = TREE_POOL_OFFSET + HASH_LEN;
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
const SPEND_WITH_PROOF_VERIFIER_PROGRAM_ACCOUNT_INDEX: usize = 8;
const VAULT_ASSET_ACCOUNT_LEN: usize = HEADER_LEN + HASH_LEN * 6 + 2;
const VAULT_ASSET_POOL_OFFSET: usize = HEADER_LEN;
const VAULT_ASSET_EXIT_ASSET_ID_OFFSET: usize = VAULT_ASSET_POOL_OFFSET + HASH_LEN;
const VAULT_ASSET_MINT_OFFSET: usize = VAULT_ASSET_EXIT_ASSET_ID_OFFSET + HASH_LEN;
const VAULT_ASSET_VAULT_AUTHORITY_OFFSET: usize = VAULT_ASSET_MINT_OFFSET + HASH_LEN;
const VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET: usize = VAULT_ASSET_VAULT_AUTHORITY_OFFSET + HASH_LEN;
const VAULT_ASSET_TOKEN_PROGRAM_OFFSET: usize = VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET + HASH_LEN;
const VAULT_ASSET_KIND_OFFSET: usize = VAULT_ASSET_TOKEN_PROGRAM_OFFSET + HASH_LEN;
const VAULT_ASSET_RELEASE_ENABLED_OFFSET: usize = VAULT_ASSET_KIND_OFFSET + 1;
const TOKEN_ACCOUNT_LEN: usize = 165;
const TOKEN_ACCOUNT_MINT_OFFSET: usize = 0;
const TOKEN_ACCOUNT_OWNER_OFFSET: usize = 32;
const MINT_DECIMALS_OFFSET: usize = 44;
const SPL_TOKEN_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const UNSHIELD_ACCEPTED_ROOT_OFFSET: usize = HASH_LEN;
const UNSHIELD_EXIT_DESTINATION_OFFSET: usize = UNSHIELD_ACCEPTED_ROOT_OFFSET + HASH_LEN;
const UNSHIELD_EXIT_ASSET_ID_OFFSET: usize = UNSHIELD_EXIT_DESTINATION_OFFSET + HASH_LEN;
const UNSHIELD_EXIT_AMOUNT_OFFSET: usize = UNSHIELD_EXIT_ASSET_ID_OFFSET + HASH_LEN;
const UNSHIELD_PUBLIC_INPUT_HASH_OFFSET: usize = UNSHIELD_EXIT_AMOUNT_OFFSET + EXIT_AMOUNT_LEN;
const UNSHIELD_VERIFIER_KEY_HASH_OFFSET: usize = UNSHIELD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN;
const UNSHIELD_PROOF_OFFSET: usize = UNSHIELD_VERIFIER_KEY_HASH_OFFSET + HASH_LEN;
const UNSHIELD_GNARK_PROOF_LEN: usize = SPEND_WITH_PROOF_GNARK_PROOF_LEN;
const UNSHIELD_GNARK_PUBLIC_WITNESS_LEN: usize = SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN;
const UNSHIELD_PUBLIC_WITNESS_OFFSET: usize = UNSHIELD_PROOF_OFFSET + UNSHIELD_GNARK_PROOF_LEN;
const UNSHIELD_VERIFIER_INPUT_LEN: usize =
    UNSHIELD_GNARK_PROOF_LEN + UNSHIELD_GNARK_PUBLIC_WITNESS_LEN;
const UNSHIELD_PAYLOAD_LEN: usize =
    1 + HASH_LEN * 6 + EXIT_AMOUNT_LEN + UNSHIELD_VERIFIER_INPUT_LEN;
const UNSHIELD_VERIFIER_PROGRAM_ACCOUNT_INDEX: usize = 11;
const UNSHIELD_RELAYER_ACCOUNT_INDEX: usize = 12;
const UNSHIELD_SYSTEM_PROGRAM_ACCOUNT_INDEX: usize = 13;

const ERR_DUPLICATE_NULLIFIER: u32 = 1;
const ERR_OUTPUT_QUEUE_FULL: u32 = 3;
const ERR_INVALID_HEADER: u32 = 4;
const ERR_STATE_COUNT_MISMATCH: u32 = 5;
const ERR_UNAUTHORIZED_OPERATOR: u32 = 6;
const ERR_ALREADY_INITIALIZED: u32 = 7;
const ERR_POOL_ACCOUNT_MISMATCH: u32 = 8;
const ERR_ROOT_HISTORY_FULL: u32 = 9;
const ERR_DUPLICATE_ROOT: u32 = 10;
const ERR_UNKNOWN_ACCEPTED_ROOT: u32 = 11;
const ERR_NULLIFIER_MARKER_MISMATCH: u32 = 12;
const ERR_OUTPUT_RECORD_MISMATCH: u32 = 13;
const ERR_PROOF_VERIFIER_NOT_WIRED: u32 = 14;

// TAG_UNSHIELD + Native SOL errors (fail-closed until full verifier + registry)
const ERR_UNSHIELD_RELEASE_NOT_WIRED: u32 = 15;
const ERR_VAULT_AUTHORITY_MISMATCH: u32 = 16;
const ERR_VERIFIER_KEY_MISMATCH: u32 = 17;
const ERR_ROOT_RECORD_MISMATCH: u32 = 18;
const ERR_VAULT_ASSET_MISMATCH: u32 = 19;
const ERR_VAULT_TOKEN_ACCOUNT_MISMATCH: u32 = 20;
const ERR_DESTINATION_TOKEN_ACCOUNT_MISMATCH: u32 = 21;
const ERR_TOKEN_PROGRAM_MISMATCH: u32 = 22;
const ERR_INVALID_ASSET_KIND: u32 = 23;
// M7 fix (2026-05-22): dedicated error so a re-registration of a vault-asset
// record with mismatched mint/authority/token-account/token-program/kind is
// distinguishable from the generic ERR_VAULT_ASSET_MISMATCH ("wrong PDA")
// case. ensure_vault_asset_record() already rejects mismatched re-registration
// today; this code makes the failure surface unambiguous to operators and to
// any future Crucible test asserting idempotency.
const ERR_VAULT_ASSET_ALREADY_REGISTERED_WITH_DIFFERENT_PARAMS: u32 = 24;
const ERR_ROOT_TRANSITION_NOOP: u32 = 25; // L6 fix (2026-05-22): TAG_REGISTER_PROVENANCED_ROOT no-op rejection
const ERR_TREE_STATE_MISMATCH: u32 = 26;
const ERR_TREE_CAPACITY_FULL: u32 = 27;
const ERR_TREE_ROOT_MISMATCH: u32 = 28;
const ERR_DUPLICATE_TREE_LEAF: u32 = 29;
const ERR_TREE_LEAF_MARKER_MISMATCH: u32 = 30;
const ERR_POSEIDON_HASH_FAILED: u32 = 31;
const ERR_VAULT_PDA_MISMATCH: u32 = ERR_VAULT_AUTHORITY_MISMATCH;
const ERR_SENTINEL_ASSET_ID_MISMATCH: u32 = ERR_VAULT_ASSET_MISMATCH;
const ERR_UNSHIELD_NOT_WIRED: u32 = ERR_UNSHIELD_RELEASE_NOT_WIRED; // placeholder until Groth16 + tree_state fully integrated for TAG6

#[derive(Clone, Copy)]
struct VerifiedSpendPreflight {
    nullifier: [u8; HASH_LEN],
    output0: [u8; HASH_LEN],
    output1: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
    verifier_program_id: Pubkey,
    gnark_proof: [u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN],
    gnark_public_witness: [u8; SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN],
    output_index: u64,
}

impl VerifiedSpendPreflight {
    fn verifier_instruction_data(&self) -> [u8; SPEND_WITH_PROOF_VERIFIER_INPUT_LEN] {
        let mut data = [0u8; SPEND_WITH_PROOF_VERIFIER_INPUT_LEN];
        data[..SPEND_WITH_PROOF_GNARK_PROOF_LEN].copy_from_slice(&self.gnark_proof);
        data[SPEND_WITH_PROOF_GNARK_PROOF_LEN..].copy_from_slice(&self.gnark_public_witness);
        data
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct VerifiedShieldPreflight {
    exit_asset_id: [u8; HASH_LEN],
    shield_amount: u64,
    output_commitment: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
    verifier_program_id: Pubkey,
    gnark_proof: [u8; SHIELD_GNARK_PROOF_LEN],
    gnark_public_witness: [u8; SHIELD_GNARK_PUBLIC_WITNESS_LEN],
    asset_kind: u8,
    decimals: u8,
}

impl VerifiedShieldPreflight {
    fn verifier_instruction_data(&self) -> [u8; SHIELD_VERIFIER_INPUT_LEN] {
        let mut data = [0u8; SHIELD_VERIFIER_INPUT_LEN];
        data[..SHIELD_GNARK_PROOF_LEN].copy_from_slice(&self.gnark_proof);
        data[SHIELD_GNARK_PROOF_LEN..].copy_from_slice(&self.gnark_public_witness);
        data
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct VerifiedUnshieldPreflight {
    nullifier: [u8; HASH_LEN],
    accepted_root: [u8; HASH_LEN],
    exit_destination: [u8; HASH_LEN],
    exit_asset_id: [u8; HASH_LEN],
    exit_amount: u64,
    public_input_hash: [u8; HASH_LEN],
    verifier_key_hash: [u8; HASH_LEN],
    verifier_program_id: Pubkey,
    gnark_proof: [u8; UNSHIELD_GNARK_PROOF_LEN],
    gnark_public_witness: [u8; UNSHIELD_GNARK_PUBLIC_WITNESS_LEN],
    asset_kind: u8,
    sol_vault_bump: u8,
}

impl VerifiedUnshieldPreflight {
    fn verifier_instruction_data(&self) -> [u8; UNSHIELD_VERIFIER_INPUT_LEN] {
        let mut data = [0u8; UNSHIELD_VERIFIER_INPUT_LEN];
        data[..UNSHIELD_GNARK_PROOF_LEN].copy_from_slice(&self.gnark_proof);
        data[UNSHIELD_GNARK_PROOF_LEN..].copy_from_slice(&self.gnark_public_witness);
        data
    }
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let (&tag, rest) = instruction_data
        .split_first()
        .ok_or(ProgramError::InvalidInstructionData)?;

    match tag {
        TAG_INIT => process_init(program_id, accounts, rest),
        TAG_SPEND => process_spend(program_id, accounts, rest),
        TAG_REGISTER_ROOT => process_register_root(program_id, accounts, rest),
        TAG_SPEND_WITH_PROOF => process_spend_with_proof(program_id, accounts, rest),
        TAG_REGISTER_PROVENANCED_ROOT => {
            process_register_provenanced_root(program_id, accounts, rest)
        }
        TAG_REGISTER_VERIFIER_KEY => process_register_verifier_key(program_id, accounts, rest),
        TAG_UNSHIELD => process_unshield(program_id, accounts, rest),
        TAG_REGISTER_VAULT_ASSET => process_register_vault_asset(program_id, accounts, rest), // prep stub (fail-closed until vault registry live)
        TAG_SHIELD => process_shield(program_id, accounts, rest),
        TAG_APPEND_TREE_LEAF => process_append_tree_leaf(program_id, accounts, rest),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

fn process_init(program_id: &Pubkey, accounts: &[AccountInfo], rest: &[u8]) -> ProgramResult {
    if !rest.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let nullifier_set = next_account_info(&mut account_iter)?;
    let output_queue = next_account_info(&mut account_iter)?;
    let root_history = next_account_info(&mut account_iter)?;
    let tree_state = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    require_writable_program_account(program_id, pool_state)?;
    require_writable_program_account(program_id, nullifier_set)?;
    require_writable_program_account(program_id, output_queue)?;
    require_writable_program_account(program_id, root_history)?;
    require_writable_program_account(program_id, tree_state)?;

    {
        let mut data = pool_state.try_borrow_mut_data()?;
        if data.len() < POOL_STATE_LEN {
            return Err(ProgramError::AccountDataTooSmall);
        }
        require_uninitialized(&data[..])?;

        data.fill(0);
        data[..8].copy_from_slice(POOL_MAGIC);
        data[8] = VERSION;
        data[POOL_AUTHORITY_OFFSET..POOL_AUTHORITY_OFFSET + HASH_LEN]
            .copy_from_slice(authority.key.as_ref());
        data[POOL_NULLIFIER_SET_OFFSET..POOL_NULLIFIER_SET_OFFSET + HASH_LEN]
            .copy_from_slice(nullifier_set.key.as_ref());
        data[POOL_OUTPUT_QUEUE_OFFSET..POOL_OUTPUT_QUEUE_OFFSET + HASH_LEN]
            .copy_from_slice(output_queue.key.as_ref());
        data[POOL_ROOT_HISTORY_OFFSET..POOL_ROOT_HISTORY_OFFSET + HASH_LEN]
            .copy_from_slice(root_history.key.as_ref());
        data[POOL_TREE_STATE_OFFSET..POOL_TREE_STATE_OFFSET + HASH_LEN]
            .copy_from_slice(tree_state.key.as_ref());
        data[POOL_VERIFIER_WIRED_OFFSET] = POOL_VERIFIER_NOT_WIRED;
    }

    init_fixed_slot_account(nullifier_set, NULLIFIER_MAGIC, HASH_LEN)?;
    init_output_index_account(output_queue)?;
    init_fixed_slot_account(root_history, ROOT_MAGIC, HASH_LEN)?;
    init_tree_state_account(tree_state, pool_state)?;

    msg!("vanta_private_pool_v2_spend: initialized account headers");
    Ok(())
}

fn process_append_tree_leaf(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> ProgramResult {
    if rest.len() + 1 != APPEND_TREE_LEAF_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let output_commitment = &rest[0..HASH_LEN];
    let expected_previous_root = &rest[HASH_LEN..HASH_LEN * 2];
    let expected_new_root = &rest[HASH_LEN * 2..HASH_LEN * 3];
    let transition_public_input_hash = &rest[HASH_LEN * 3..HASH_LEN * 4];
    let transition_kind = rest[HASH_LEN * 4];

    if is_zero_hash(output_commitment)
        || is_zero_hash(expected_previous_root)
        || is_zero_hash(expected_new_root)
        || is_zero_hash(transition_public_input_hash)
        || transition_kind == 0
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let tree_state = next_account_info(&mut account_iter)?;
    let root_history = next_account_info(&mut account_iter)?;
    let root_record = next_account_info(&mut account_iter)?;
    let tree_leaf_marker = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;
    let system_program_info = next_account_info(&mut account_iter)?;

    require_writable_program_account(program_id, pool_state)?;
    require_writable_program_account(program_id, tree_state)?;
    require_writable_program_account(program_id, root_history)?;
    require_writable_account(root_record)?;
    require_writable_account(tree_leaf_marker)?;
    require_system_program(system_program_info)?;
    if !authority.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }

    let pool_data = pool_state.try_borrow_data()?;
    let tree_data = tree_state.try_borrow_data()?;
    let root_data = root_history.try_borrow_data()?;

    require_pool_header(&pool_data)?;
    require_authority(&pool_data, authority)?;
    require_pool_tree_state_binding(&pool_data, tree_state)?;
    require_pool_root_history_binding(&pool_data, root_history)?;
    require_tree_state_header(&tree_data, pool_state)?;
    require_fixed_slot_header(&root_data, ROOT_MAGIC, HASH_LEN)?;

    let current_root = read_hash(&tree_data, TREE_CURRENT_ROOT_OFFSET)?;
    if current_root.as_slice() != expected_previous_root {
        return Err(ProgramError::Custom(ERR_TREE_ROOT_MISMATCH));
    }

    let leaf_index = read_u64(&tree_data, TREE_NEXT_LEAF_INDEX_OFFSET)?;
    if leaf_index >= TREE_CAPACITY {
        return Err(ProgramError::Custom(ERR_TREE_CAPACITY_FULL));
    }

    let (computed_root, next_frontier) =
        compute_program_owned_append_root(&tree_data, leaf_index, output_commitment)?;
    if computed_root.as_slice() != expected_new_root {
        return Err(ProgramError::Custom(ERR_TREE_ROOT_MISMATCH));
    }

    if fixed_slot_contains(&root_data, HASH_LEN, &computed_root)? {
        return Err(ProgramError::Custom(ERR_DUPLICATE_ROOT));
    }

    let root_count = read_count(&root_data)? as usize;
    let root_capacity = fixed_slot_capacity(&root_data, HASH_LEN)?;
    if root_count >= root_capacity {
        return Err(ProgramError::Custom(ERR_ROOT_HISTORY_FULL));
    }

    require_root_record_available(program_id, pool_state, root_record, &computed_root)?;
    require_tree_leaf_marker_available(
        program_id,
        pool_state,
        tree_leaf_marker,
        output_commitment,
    )?;

    drop(root_data);
    drop(tree_data);
    drop(pool_data);

    ensure_root_record(
        program_id,
        pool_state,
        root_record,
        authority,
        system_program_info,
        root_count as u64,
        expected_previous_root,
        &computed_root,
        transition_public_input_hash,
        leaf_index,
        1,
        transition_kind,
    )?;
    ensure_tree_leaf_marker(
        program_id,
        pool_state,
        tree_leaf_marker,
        authority,
        system_program_info,
        output_commitment,
        leaf_index,
    )?;

    let mut tree_data = tree_state.try_borrow_mut_data()?;
    write_u64(&mut tree_data, TREE_NEXT_LEAF_INDEX_OFFSET, leaf_index + 1)?;
    tree_data[TREE_CURRENT_ROOT_OFFSET..TREE_CURRENT_ROOT_OFFSET + HASH_LEN]
        .copy_from_slice(&computed_root);
    for (level, node) in next_frontier.iter().enumerate() {
        let offset = TREE_FRONTIER_OFFSET + level * HASH_LEN;
        tree_data[offset..offset + HASH_LEN].copy_from_slice(node);
    }

    let mut root_data = root_history.try_borrow_mut_data()?;
    write_hash_slot(&mut root_data, root_count, HASH_LEN, &computed_root)?;
    write_count(&mut root_data, root_count + 1)?;

    msg!("vanta_private_pool_v2_spend: appended program-owned Poseidon Merkle tree leaf");
    Ok(())
}

fn process_spend(program_id: &Pubkey, accounts: &[AccountInfo], rest: &[u8]) -> ProgramResult {
    if rest.len() + 1 != SPEND_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let nullifier_set = next_account_info(&mut account_iter)?;
    let output_queue = next_account_info(&mut account_iter)?;
    let root_history = next_account_info(&mut account_iter)?;
    let nullifier_marker = next_account_info(&mut account_iter)?;
    let output_record = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;
    let system_program_info = next_account_info(&mut account_iter)?;

    require_writable_program_account(program_id, pool_state)?;
    require_readonly_program_account(program_id, nullifier_set)?;
    require_writable_program_account(program_id, output_queue)?;
    require_readonly_program_account(program_id, root_history)?;
    require_writable_account(nullifier_marker)?;
    require_writable_account(output_record)?;
    require_system_program(system_program_info)?;
    if !authority.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }

    let nullifier = &rest[0..32];
    let output0 = &rest[32..64];
    let output1 = &rest[64..96];
    let accepted_root = &rest[96..128];
    let public_input_hash = &rest[128..160];

    let mut pool_data = pool_state.try_borrow_mut_data()?;
    let nullifier_data = nullifier_set.try_borrow_data()?;
    let mut output_data = output_queue.try_borrow_mut_data()?;
    let root_data = root_history.try_borrow_data()?;

    require_pool_header(&pool_data)?;
    require_authority(&pool_data, authority)?;
    require_pool_account_bindings(&pool_data, nullifier_set, output_queue, root_history)?;
    require_fixed_slot_header(&nullifier_data, NULLIFIER_MAGIC, HASH_LEN)?;
    require_output_index_header(&output_data)?;
    require_fixed_slot_header(&root_data, ROOT_MAGIC, HASH_LEN)?;

    if !fixed_slot_contains(&root_data, HASH_LEN, accepted_root)? {
        return Err(ProgramError::Custom(ERR_UNKNOWN_ACCEPTED_ROOT));
    }

    let spend_count = read_u64(&pool_data, POOL_SPEND_COUNT_OFFSET)? as usize;
    let output_count = read_count(&output_data)? as usize;
    if spend_count != output_count {
        return Err(ProgramError::Custom(ERR_STATE_COUNT_MISMATCH));
    }
    if output_count == u32::MAX as usize {
        return Err(ProgramError::Custom(ERR_OUTPUT_QUEUE_FULL));
    }

    require_nullifier_marker_available(program_id, pool_state, nullifier_marker, nullifier)?;
    require_output_record_available(
        program_id,
        pool_state,
        output_record,
        output_count as u64,
        output0,
        output1,
        public_input_hash,
    )?;
    ensure_nullifier_marker(
        program_id,
        pool_state,
        nullifier_marker,
        authority,
        system_program_info,
        nullifier,
    )?;
    ensure_output_record(
        program_id,
        pool_state,
        output_record,
        authority,
        system_program_info,
        output_count as u64,
        output0,
        output1,
        public_input_hash,
    )?;
    write_count(&mut output_data, output_count + 1)?;
    write_u64(
        &mut pool_data,
        POOL_SPEND_COUNT_OFFSET,
        (spend_count + 1) as u64,
    )?;
    pool_data[POOL_LAST_PUBLIC_INPUT_HASH_OFFSET..POOL_LAST_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN]
        .copy_from_slice(public_input_hash);

    msg!("vanta_private_pool_v2_spend: accepted spend evidence");
    Ok(())
}

fn process_spend_with_proof(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> ProgramResult {
    // proof-carrying spend ABI is reserved; verifier not wired after root/nullifier/output/verifier-key/verifier-program preflight
    // This path remains fail-closed with ERR_PROOF_VERIFIER_NOT_WIRED until full Groth16 verifier + TAG3 evidence is wired.
    let verified = preflight_spend_with_proof(program_id, accounts, rest)?;
    let verifier_program = spend_with_proof_verifier_program_account(accounts)?;
    verify_spend_with_proof_adapter(&verified, verifier_program)?;
    commit_verified_spend_from_spend_with_proof_accounts(program_id, accounts, &verified)
}

fn spend_with_proof_verifier_program_account<'a, 'b>(
    accounts: &'a [AccountInfo<'b>],
) -> Result<&'a AccountInfo<'b>, ProgramError> {
    accounts
        .get(SPEND_WITH_PROOF_VERIFIER_PROGRAM_ACCOUNT_INDEX)
        .ok_or(ProgramError::NotEnoughAccountKeys)
}

fn preflight_spend_with_proof(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> Result<VerifiedSpendPreflight, ProgramError> {
    if rest.len() + 1 != SPEND_WITH_PROOF_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let nullifier_set = next_account_info(&mut account_iter)?;
    let output_queue = next_account_info(&mut account_iter)?;
    let root_history = next_account_info(&mut account_iter)?;
    let root_record = next_account_info(&mut account_iter)?;
    let nullifier_marker = next_account_info(&mut account_iter)?;
    let output_record = next_account_info(&mut account_iter)?;
    let verifier_key = next_account_info(&mut account_iter)?;
    let verifier_program = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;
    let system_program_info = next_account_info(&mut account_iter)?;

    require_writable_program_account(program_id, pool_state)?;
    require_readonly_program_account(program_id, nullifier_set)?;
    require_writable_program_account(program_id, output_queue)?;
    require_readonly_program_account(program_id, root_history)?;
    require_readonly_program_account(program_id, root_record)?;
    require_writable_account(nullifier_marker)?;
    require_writable_account(output_record)?;
    require_readonly_program_account(program_id, verifier_key)?;
    require_spend_with_proof_verifier_program(program_id, verifier_program)?;
    if !authority.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }
    require_system_program(system_program_info)?;

    let nullifier = &rest[0..32];
    let output0 = &rest[32..64];
    let output1 = &rest[64..96];
    let accepted_root = &rest[96..128];
    let public_input_hash = &rest[128..160];
    let verifier_key_hash = &rest[160..192];
    let proof = &rest[SPEND_WITH_PROOF_PROOF_OFFSET..SPEND_WITH_PROOF_PUBLIC_WITNESS_OFFSET];
    let public_witness = &rest[SPEND_WITH_PROOF_PUBLIC_WITNESS_OFFSET
        ..SPEND_WITH_PROOF_PUBLIC_WITNESS_OFFSET + SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN];

    if is_zero_hash(nullifier)
        || is_zero_hash(output0)
        || is_zero_hash(output1)
        || is_zero_hash(accepted_root)
        || is_zero_hash(public_input_hash)
        || is_zero_hash(verifier_key_hash)
        || proof.iter().all(|byte| *byte == 0)
        || public_witness.iter().all(|byte| *byte == 0)
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    let pool_data = pool_state.try_borrow_data()?;
    let nullifier_data = nullifier_set.try_borrow_data()?;
    let output_data = output_queue.try_borrow_data()?;
    let root_data = root_history.try_borrow_data()?;

    require_pool_header(&pool_data)?;
    require_pool_account_bindings(&pool_data, nullifier_set, output_queue, root_history)?;
    require_fixed_slot_header(&nullifier_data, NULLIFIER_MAGIC, HASH_LEN)?;
    require_output_index_header(&output_data)?;
    require_fixed_slot_header(&root_data, ROOT_MAGIC, HASH_LEN)?;

    if !fixed_slot_contains(&root_data, HASH_LEN, accepted_root)? {
        return Err(ProgramError::Custom(ERR_UNKNOWN_ACCEPTED_ROOT));
    }
    require_root_record(program_id, pool_state, root_record, accepted_root)?;

    let spend_count = read_u64(&pool_data, POOL_SPEND_COUNT_OFFSET)? as usize;
    let output_count = read_count(&output_data)? as usize;
    if spend_count != output_count {
        return Err(ProgramError::Custom(ERR_STATE_COUNT_MISMATCH));
    }
    if output_count == u32::MAX as usize {
        return Err(ProgramError::Custom(ERR_OUTPUT_QUEUE_FULL));
    }

    require_nullifier_marker_available(program_id, pool_state, nullifier_marker, nullifier)?;
    require_output_record_available(
        program_id,
        pool_state,
        output_record,
        output_count as u64,
        output0,
        output1,
        public_input_hash,
    )?;
    require_verifier_key_hash_for_program(
        program_id,
        pool_state,
        verifier_key,
        verifier_key_hash,
        verifier_program.key,
    )?;

    let mut verified = VerifiedSpendPreflight {
        nullifier: [0u8; HASH_LEN],
        output0: [0u8; HASH_LEN],
        output1: [0u8; HASH_LEN],
        public_input_hash: [0u8; HASH_LEN],
        verifier_key_hash: [0u8; HASH_LEN],
        verifier_program_id: *verifier_program.key,
        gnark_proof: [0u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN],
        gnark_public_witness: [0u8; SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN],
        output_index: output_count as u64,
    };
    verified.nullifier.copy_from_slice(nullifier);
    verified.output0.copy_from_slice(output0);
    verified.output1.copy_from_slice(output1);
    verified
        .public_input_hash
        .copy_from_slice(public_input_hash);
    verified
        .verifier_key_hash
        .copy_from_slice(verifier_key_hash);
    verified.gnark_proof.copy_from_slice(proof);
    verified
        .gnark_public_witness
        .copy_from_slice(public_witness);
    Ok(verified)
}

fn verify_spend_with_proof_adapter(
    verified: &VerifiedSpendPreflight,
    verifier_program: &AccountInfo,
) -> ProgramResult {
    if is_zero_hash(&verified.verifier_key_hash)
        || verified.gnark_proof.iter().all(|byte| *byte == 0)
        || verified.gnark_public_witness.iter().all(|byte| *byte == 0)
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    require_spend_with_proof_public_witness_binding(verified)?;
    let verifier_cpi_instruction = spend_with_proof_verifier_cpi_instruction(verified);

    #[cfg(target_os = "solana")]
    {
        invoke_signed(&verifier_cpi_instruction, &[verifier_program.clone()], &[])?;
        Ok(())
    }

    #[cfg(not(target_os = "solana"))]
    {
        let _ = verifier_program;
        let _ = verifier_cpi_instruction;
        Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
    }
}

fn spend_with_proof_verifier_cpi_instruction(verified: &VerifiedSpendPreflight) -> Instruction {
    Instruction {
        program_id: verified.verifier_program_id,
        accounts: Vec::new(),
        data: verified.verifier_instruction_data().to_vec(),
    }
}

fn commit_verified_spend_from_spend_with_proof_accounts(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    verified: &VerifiedSpendPreflight,
) -> ProgramResult {
    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let _nullifier_set = next_account_info(&mut account_iter)?;
    let output_queue = next_account_info(&mut account_iter)?;
    let _root_history = next_account_info(&mut account_iter)?;
    let _root_record = next_account_info(&mut account_iter)?;
    let nullifier_marker = next_account_info(&mut account_iter)?;
    let output_record = next_account_info(&mut account_iter)?;
    let _verifier_key = next_account_info(&mut account_iter)?;
    let _verifier_program = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;
    let system_program_info = next_account_info(&mut account_iter)?;

    commit_verified_spend(
        program_id,
        pool_state,
        output_queue,
        nullifier_marker,
        output_record,
        authority,
        system_program_info,
        verified,
    )
}

fn require_spend_with_proof_public_witness_binding(
    verified: &VerifiedSpendPreflight,
) -> ProgramResult {
    if verified.gnark_public_witness[..GNARK_PUBLIC_WITNESS_HEADER_LEN]
        != GNARK_PUBLIC_WITNESS_ONE_PUBLIC_INPUT_HEADER[..]
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    if verified.gnark_public_witness
        [GNARK_PUBLIC_WITNESS_VALUE_OFFSET..GNARK_PUBLIC_WITNESS_VALUE_OFFSET + HASH_LEN]
        != verified.public_input_hash
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    Ok(())
}

fn require_spend_with_proof_verifier_program(
    program_id: &Pubkey,
    verifier_program: &AccountInfo,
) -> ProgramResult {
    if verifier_program.is_writable || verifier_program.is_signer {
        return Err(ProgramError::InvalidAccountData);
    }
    if verifier_program.key == program_id || !verifier_program.executable {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(())
}

fn commit_verified_spend<'a>(
    program_id: &Pubkey,
    pool_state: &AccountInfo<'a>,
    output_queue: &AccountInfo<'a>,
    nullifier_marker: &AccountInfo<'a>,
    output_record: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    verified: &VerifiedSpendPreflight,
) -> ProgramResult {
    require_writable_program_account(program_id, pool_state)?;
    require_writable_program_account(program_id, output_queue)?;
    require_writable_account(nullifier_marker)?;
    require_writable_account(output_record)?;

    let mut pool_data = pool_state.try_borrow_mut_data()?;
    let mut output_data = output_queue.try_borrow_mut_data()?;
    require_pool_header(&pool_data)?;
    require_output_index_header(&output_data)?;

    let spend_count = read_u64(&pool_data, POOL_SPEND_COUNT_OFFSET)?;
    let output_count = read_count(&output_data)? as u64;
    if spend_count != output_count || output_count != verified.output_index {
        return Err(ProgramError::Custom(ERR_STATE_COUNT_MISMATCH));
    }
    if output_count == u32::MAX as u64 {
        return Err(ProgramError::Custom(ERR_OUTPUT_QUEUE_FULL));
    }

    ensure_nullifier_marker(
        program_id,
        pool_state,
        nullifier_marker,
        authority,
        system_program_info,
        &verified.nullifier,
    )?;
    ensure_output_record(
        program_id,
        pool_state,
        output_record,
        authority,
        system_program_info,
        verified.output_index,
        &verified.output0,
        &verified.output1,
        &verified.public_input_hash,
    )?;
    write_count(&mut output_data, (output_count + 1) as usize)?;
    write_u64(&mut pool_data, POOL_SPEND_COUNT_OFFSET, spend_count + 1)?;
    pool_data[POOL_LAST_PUBLIC_INPUT_HASH_OFFSET..POOL_LAST_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN]
        .copy_from_slice(&verified.public_input_hash);
    Ok(())
}

fn process_register_verifier_key(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> ProgramResult {
    if rest.len() + 1 != REGISTER_VERIFIER_KEY_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let verifier_key_hash = &rest[0..32];
    let mut verifier_program_id_bytes = [0u8; HASH_LEN];
    verifier_program_id_bytes.copy_from_slice(&rest[32..64]);
    let verifier_program_id = Pubkey::new_from_array(verifier_program_id_bytes);
    if is_zero_hash(verifier_key_hash)
        || verifier_program_id == Pubkey::default()
        || verifier_program_id == *program_id
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let verifier_key = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;
    let system_program_info = next_account_info(&mut account_iter)?;

    require_program_account(program_id, pool_state)?;
    require_writable_account(verifier_key)?;
    require_system_program(system_program_info)?;

    let pool_data = pool_state.try_borrow_data()?;
    require_pool_header(&pool_data)?;
    require_authority(&pool_data, authority)?;

    ensure_verifier_key(
        program_id,
        pool_state,
        verifier_key,
        authority,
        system_program_info,
        verifier_key_hash,
        &verifier_program_id,
    )?;

    msg!("vanta_private_pool_v2_spend: registered verifier key hash and verifier program");
    Ok(())
}

fn process_register_provenanced_root(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> ProgramResult {
    if rest.len() + 1 != PROVENANCED_ROOT_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let root_history = next_account_info(&mut account_iter)?;
    let root_record = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;
    let system_program_info = next_account_info(&mut account_iter)?;

    require_program_account(program_id, pool_state)?;
    require_writable_program_account(program_id, root_history)?;
    require_writable_account(root_record)?;
    require_system_program(system_program_info)?;

    let accepted_root = &rest[0..32];
    let previous_root = &rest[32..64];
    let transition_public_input_hash = &rest[64..96];
    let leaf_index_base = read_u64(rest, 96)?;
    let leaf_count = read_u32(rest, 104)?;
    let transition_kind = rest[108];

    if is_zero_hash(accepted_root)
        || is_zero_hash(transition_public_input_hash)
        || leaf_count == 0
        || transition_kind == 0
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    // L6 fix (2026-05-22): reject `accepted_root == previous_root`. A
    // no-op transition has no proof to attest and would only waste a
    // history slot. The existing duplicate-root check below would catch
    // this once the slot was full, but rejecting at the input boundary
    // is clearer and matches the rest of the preflight discipline.
    if accepted_root == previous_root {
        return Err(ProgramError::Custom(ERR_ROOT_TRANSITION_NOOP));
    }

    let pool_data = pool_state.try_borrow_data()?;
    let mut root_data = root_history.try_borrow_mut_data()?;
    require_pool_header(&pool_data)?;
    require_authority(&pool_data, authority)?;
    require_pool_root_history_binding(&pool_data, root_history)?;
    require_fixed_slot_header(&root_data, ROOT_MAGIC, HASH_LEN)?;
    require_previous_root_matches_history(&root_data, previous_root)?;

    if fixed_slot_contains(&root_data, HASH_LEN, accepted_root)? {
        return Err(ProgramError::Custom(ERR_DUPLICATE_ROOT));
    }

    let root_count = read_count(&root_data)? as usize;
    let root_capacity = fixed_slot_capacity(&root_data, HASH_LEN)?;
    if root_count >= root_capacity {
        return Err(ProgramError::Custom(ERR_ROOT_HISTORY_FULL));
    }

    require_root_record_available(program_id, pool_state, root_record, accepted_root)?;
    ensure_root_record(
        program_id,
        pool_state,
        root_record,
        authority,
        system_program_info,
        root_count as u64,
        previous_root,
        accepted_root,
        transition_public_input_hash,
        leaf_index_base,
        leaf_count,
        transition_kind,
    )?;

    write_hash_slot(&mut root_data, root_count, HASH_LEN, accepted_root)?;
    write_count(&mut root_data, root_count + 1)?;

    msg!("vanta_private_pool_v2_spend: registered provenanced accepted root");
    Ok(())
}

fn process_register_root(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> ProgramResult {
    if rest.len() + 1 != REGISTER_ROOT_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let root_history = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;

    require_program_account(program_id, pool_state)?;
    require_writable_program_account(program_id, root_history)?;

    let pool_data = pool_state.try_borrow_data()?;
    let mut root_data = root_history.try_borrow_mut_data()?;
    require_pool_header(&pool_data)?;
    require_authority(&pool_data, authority)?;
    require_pool_root_history_binding(&pool_data, root_history)?;
    require_fixed_slot_header(&root_data, ROOT_MAGIC, HASH_LEN)?;

    let accepted_root = &rest[0..32];
    if fixed_slot_contains(&root_data, HASH_LEN, accepted_root)? {
        return Err(ProgramError::Custom(ERR_DUPLICATE_ROOT));
    }

    let root_count = read_count(&root_data)? as usize;
    let root_capacity = fixed_slot_capacity(&root_data, HASH_LEN)?;
    if root_count >= root_capacity {
        return Err(ProgramError::Custom(ERR_ROOT_HISTORY_FULL));
    }

    write_hash_slot(&mut root_data, root_count, HASH_LEN, accepted_root)?;
    write_count(&mut root_data, root_count + 1)?;

    msg!("vanta_private_pool_v2_spend: registered accepted root");
    Ok(())
}

fn process_shield(program_id: &Pubkey, accounts: &[AccountInfo], rest: &[u8]) -> ProgramResult {
    if rest.len() + 1 != SHIELD_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let exit_asset_id: [u8; HASH_LEN] = rest
        [SHIELD_ASSET_ID_OFFSET..SHIELD_ASSET_ID_OFFSET + HASH_LEN]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    let shield_amount = read_u64(rest, SHIELD_AMOUNT_OFFSET)?;
    let output_commitment =
        &rest[SHIELD_OUTPUT_COMMITMENT_OFFSET..SHIELD_OUTPUT_COMMITMENT_OFFSET + HASH_LEN];
    let shield_public_input_hash =
        &rest[SHIELD_PUBLIC_INPUT_HASH_OFFSET..SHIELD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN];
    let asset_kind = rest[SHIELD_ASSET_KIND_OFFSET];
    let decimals = rest[SHIELD_DECIMALS_OFFSET];
    let verifier_key_hash =
        &rest[SHIELD_VERIFIER_KEY_HASH_OFFSET..SHIELD_VERIFIER_KEY_HASH_OFFSET + HASH_LEN];
    let gnark_proof = &rest[SHIELD_PROOF_OFFSET..SHIELD_PROOF_OFFSET + SHIELD_GNARK_PROOF_LEN];
    let gnark_public_witness = &rest[SHIELD_PUBLIC_WITNESS_OFFSET
        ..SHIELD_PUBLIC_WITNESS_OFFSET + SHIELD_GNARK_PUBLIC_WITNESS_LEN];

    if shield_amount == 0
        || is_zero_hash(output_commitment)
        || is_zero_hash(shield_public_input_hash)
        || is_zero_hash(verifier_key_hash)
        || (asset_kind == VAULT_ASSET_KIND_SPL && is_zero_hash(&exit_asset_id))
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    if asset_kind != VAULT_ASSET_KIND_SOL && asset_kind != VAULT_ASSET_KIND_SPL {
        return Err(ProgramError::Custom(ERR_INVALID_ASSET_KIND));
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let vault_asset_record = next_account_info(&mut account_iter)?;
    let vault_authority = next_account_info(&mut account_iter)?;
    let vault_token_account = next_account_info(&mut account_iter)?;
    let mint = next_account_info(&mut account_iter)?;
    let depositor = next_account_info(&mut account_iter)?;
    let cpi_program = next_account_info(&mut account_iter)?;
    let verifier_key = next_account_info(&mut account_iter)?;
    let verifier_program = next_account_info(&mut account_iter)?;

    require_readonly_program_account(program_id, pool_state)?;
    require_readonly_program_account(program_id, vault_asset_record)?;
    require_readonly_program_account(program_id, verifier_key)?;
    require_spend_with_proof_verifier_program(program_id, verifier_program)?;
    require_writable_account(depositor)?;
    require_verifier_key_hash_for_program(
        program_id,
        pool_state,
        verifier_key,
        verifier_key_hash,
        verifier_program.key,
    )?;

    let mut verified = VerifiedShieldPreflight {
        exit_asset_id,
        shield_amount,
        output_commitment: [0u8; HASH_LEN],
        public_input_hash: [0u8; HASH_LEN],
        verifier_key_hash: [0u8; HASH_LEN],
        verifier_program_id: *verifier_program.key,
        gnark_proof: [0u8; SHIELD_GNARK_PROOF_LEN],
        gnark_public_witness: [0u8; SHIELD_GNARK_PUBLIC_WITNESS_LEN],
        asset_kind,
        decimals,
    };
    verified
        .output_commitment
        .copy_from_slice(output_commitment);
    verified
        .public_input_hash
        .copy_from_slice(shield_public_input_hash);
    verified
        .verifier_key_hash
        .copy_from_slice(verifier_key_hash);
    verified.gnark_proof.copy_from_slice(gnark_proof);
    verified
        .gnark_public_witness
        .copy_from_slice(gnark_public_witness);

    if asset_kind == VAULT_ASSET_KIND_SOL {
        require_registered_sol_vault_asset(
            program_id,
            pool_state,
            vault_asset_record,
            vault_authority,
        )?;
        require_writable_account(vault_authority)?;
        require_system_program(cpi_program)?;

        let pool_data = pool_state.try_borrow_data()?;
        require_pool_verifier_wired(&pool_data, ERR_PROOF_VERIFIER_NOT_WIRED)?;
        verify_shield_with_proof_adapter(&verified, verifier_program)?;

        let sol_vault_holding = vault_authority;
        let transfer_ix = system_instruction::transfer(
            depositor.key,
            sol_vault_holding.key,
            verified.shield_amount,
        );
        invoke_signed(
            &transfer_ix,
            &[
                depositor.clone(),
                sol_vault_holding.clone(),
                cpi_program.clone(),
            ],
            &[],
        )?;
        msg!("vanta_private_pool_v2_spend: shield runtime-gated path accepted native SOL into SOL vault PDA");
    } else if asset_kind == VAULT_ASSET_KIND_SPL {
        require_registered_spl_vault_asset(
            program_id,
            pool_state,
            vault_asset_record,
            vault_authority,
            &exit_asset_id,
            vault_token_account,
            mint,
            cpi_program,
        )?;

        let pool_data = pool_state.try_borrow_data()?;
        require_pool_verifier_wired(&pool_data, ERR_PROOF_VERIFIER_NOT_WIRED)?;
        verify_shield_with_proof_adapter(&verified, verifier_program)?;

        let transfer_ix = spl_token::instruction::transfer_checked(
            cpi_program.key,
            depositor.key,
            mint.key,
            vault_token_account.key,
            depositor.key,
            &[],
            verified.shield_amount,
            verified.decimals,
        )?;
        solana_program::program::invoke(
            &transfer_ix,
            &[
                depositor.clone(),
                mint.clone(),
                vault_token_account.clone(),
                depositor.clone(),
                cpi_program.clone(),
            ],
        )?;
        msg!("vanta_private_pool_v2_spend: shield runtime-gated path accepted SPL into vault token account");
    } else {
        return Err(ProgramError::Custom(ERR_INVALID_ASSET_KIND));
    }

    Ok(())
}

/// process_register_vault_asset (TAG_REGISTER_VAULT_ASSET = 7) stub.
/// Per design doc §11 data model + VANTA_ZK_REVIEW U2.1:
/// - Creates/ inits vault_asset_record PDA ["vanta2asset", pool, asset_id] with kind (1=SPL, 2=SOL), releaseEnabled.
/// - For SOL: also ensures/creates the SOL vault PDA ["vanta2solvault", pool, sentinel] (program-owned lamports account).
/// - Authority (operator init signer) only; one-time registration per asset.
/// - Fail-closed stub for prep phase (ERR_UNSHIELD_NOT_WIRED family or new error until full registry + tree + verifier).
/// - Once live, enables require_vault_asset_record to return real kind without sentinel bypass, and unlocks TAG6 release.
fn process_register_vault_asset(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> ProgramResult {
    if rest.len() + 1 != REGISTER_VAULT_ASSET_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }
    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let vault_asset_record = next_account_info(&mut account_iter)?;
    let vault_authority = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;
    let system_program_info = next_account_info(&mut account_iter)?;

    require_program_account(program_id, pool_state)?;
    require_writable_account(vault_asset_record)?;
    require_system_program(system_program_info)?;

    let exit_asset_id = &rest[0..32];
    let mint = &rest[32..64];
    let vault_token_account = &rest[64..96];
    let token_program = &rest[96..128];
    let asset_kind = rest[128];

    if asset_kind != VAULT_ASSET_KIND_SPL && asset_kind != VAULT_ASSET_KIND_SOL {
        return Err(ProgramError::InvalidInstructionData);
    }
    if asset_kind == VAULT_ASSET_KIND_SPL
        && (is_zero_hash(exit_asset_id)
            || is_zero_hash(mint)
            || is_zero_hash(vault_token_account)
            || token_program != SPL_TOKEN_PROGRAM_ID.as_ref())
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    if asset_kind == VAULT_ASSET_KIND_SOL
        && (exit_asset_id != NATIVE_SOL_ASSET_ID_SENTINEL.as_ref()
            || !is_zero_hash(mint)
            || vault_token_account != vault_authority.key.as_ref()
            || token_program != system_program::ID.as_ref())
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    let pool_data = pool_state.try_borrow_data()?;
    require_pool_header(&pool_data)?;
    require_authority(&pool_data, authority)?;
    if asset_kind == VAULT_ASSET_KIND_SOL {
        require_sol_vault_pda(program_id, pool_state, vault_authority)?;
    } else {
        require_vault_authority(program_id, pool_state, vault_authority, exit_asset_id)?;
    }

    ensure_vault_asset_record(
        program_id,
        pool_state,
        vault_asset_record,
        authority,
        system_program_info,
        exit_asset_id,
        mint,
        vault_authority.key.as_ref(),
        vault_token_account,
        token_program,
        asset_kind,
    )?;

    msg!("vanta_private_pool_v2_spend: registered vault asset with release disabled");
    Ok(())
}

fn require_program_account(program_id: &Pubkey, account: &AccountInfo) -> ProgramResult {
    if account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(())
}

fn require_readonly_program_account(program_id: &Pubkey, account: &AccountInfo) -> ProgramResult {
    if account.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }
    require_program_account(program_id, account)
}

fn require_writable_account(account: &AccountInfo) -> ProgramResult {
    if !account.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(())
}

fn require_writable_program_account(program_id: &Pubkey, account: &AccountInfo) -> ProgramResult {
    if !account.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }
    require_program_account(program_id, account)
}

fn require_system_program(account: &AccountInfo) -> ProgramResult {
    if account.key != &system_program::ID || account.is_writable || account.is_signer {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(())
}

/// General readonly check (for vault_asset_record, etc.; program-owned or not)
fn require_readonly_account(account: &AccountInfo) -> ProgramResult {
    if account.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(())
}

fn require_vault_authority(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    vault_authority: &AccountInfo,
    exit_asset_id: &[u8],
) -> ProgramResult {
    let (expected_authority, _) = Pubkey::find_program_address(
        &[VAULT_AUTHORITY_SEED, pool_state.key.as_ref(), exit_asset_id],
        program_id,
    );
    if *vault_authority.key != expected_authority || vault_authority.is_signer {
        return Err(ProgramError::Custom(ERR_VAULT_AUTHORITY_MISMATCH));
    }
    require_readonly_account(vault_authority)
}

/// SOL-specific vault PDA preflight helper (program-owned lamports custody).
/// Derives using sol_vault_pda, verifies key match, requires writable.
/// Per design: explicit for VAULT_ASSET_KIND_SOL=2 + sentinel; prep allows system owner bootstrap.
fn require_sol_vault_pda(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    vault_holding: &AccountInfo,
) -> Result<u8, ProgramError> {
    let (expected, bump) = sol_vault_pda(program_id, pool_state.key);
    if *vault_holding.key != expected {
        return Err(ProgramError::Custom(ERR_VAULT_PDA_MISMATCH));
    }
    require_writable_account(vault_holding)?;
    // In full prod: assert vault_holding.owner == program_id after create_account via TAG_REGISTER.
    // For prep: tolerate system-owned (CPI transfer still works via invoke_signed with seeds).
    Ok(bump)
}

fn require_registered_sol_vault_asset(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    vault_asset_record: &AccountInfo,
    vault_authority: &AccountInfo,
) -> ProgramResult {
    require_sol_vault_pda(program_id, pool_state, vault_authority)?;
    let asset_kind = require_vault_asset_record(
        program_id,
        pool_state,
        vault_asset_record,
        &NATIVE_SOL_ASSET_ID_SENTINEL,
    )?;
    if asset_kind != VAULT_ASSET_KIND_SOL {
        return Err(ProgramError::Custom(ERR_INVALID_ASSET_KIND));
    }

    let asset_data = vault_asset_record.try_borrow_data()?;
    if asset_data.len() >= VAULT_ASSET_ACCOUNT_LEN {
        if &asset_data[VAULT_ASSET_MINT_OFFSET..VAULT_ASSET_MINT_OFFSET + HASH_LEN]
            != &[0u8; HASH_LEN]
            || &asset_data
                [VAULT_ASSET_VAULT_AUTHORITY_OFFSET..VAULT_ASSET_VAULT_AUTHORITY_OFFSET + HASH_LEN]
                != vault_authority.key.as_ref()
            || &asset_data[VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET
                ..VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET + HASH_LEN]
                != vault_authority.key.as_ref()
            || &asset_data[VAULT_ASSET_TOKEN_PROGRAM_OFFSET
                ..VAULT_ASSET_TOKEN_PROGRAM_OFFSET + HASH_LEN]
                != system_program::ID.as_ref()
        {
            return Err(ProgramError::Custom(ERR_VAULT_ASSET_MISMATCH));
        }
    }

    Ok(())
}

fn require_registered_spl_vault_asset(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    vault_asset_record: &AccountInfo,
    vault_authority: &AccountInfo,
    exit_asset_id: &[u8; HASH_LEN],
    vault_token_account: &AccountInfo,
    mint: &AccountInfo,
    token_program: &AccountInfo,
) -> ProgramResult {
    require_vault_authority(program_id, pool_state, vault_authority, exit_asset_id)?;
    let asset_kind =
        require_vault_asset_record(program_id, pool_state, vault_asset_record, exit_asset_id)?;
    if asset_kind != VAULT_ASSET_KIND_SPL {
        return Err(ProgramError::Custom(ERR_INVALID_ASSET_KIND));
    }

    let asset_data = vault_asset_record.try_borrow_data()?;
    require_spl_release_accounts(
        &asset_data,
        vault_token_account,
        vault_token_account,
        mint,
        token_program,
        vault_authority,
        vault_authority.key.as_ref(),
    )
}

/// Generalized preflight for vault asset record PDA (["vanta2asset", pool, asset_id])
/// Returns the parsed asset_kind (u8) from a minimal layout: [magic8, ver, kind, ...]
///
/// Per design doc §11 "Data Model Definition for Native SOL in Future On-Chain Program"
/// and VANTA_ZK_REVIEW.md U2.1:
/// - Supports VAULT_ASSET_KIND_SOL = 2 with NATIVE_SOL_ASSET_ID_SENTINEL (zero 32-byte).
/// - Explicit zero-sentinel bypass for asset_id checks (no mint/token shape for sentinel).
/// - PDA seeds exactly: ASSET_RECORD_SEED + pool_state + sentinel (matches TS indexer + client helpers).
/// - Fail-closed: production requires registered entry via future TAG_REGISTER_VAULT_ASSET=7
///   with releaseEnabled=1 and kind=2. Sentinel notes from v2 indexer (Phase 1+) remain valid.
fn require_vault_asset_record(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    vault_asset_record: &AccountInfo,
    expected_asset_id: &[u8; 32],
) -> Result<u8, ProgramError> {
    let (expected, _bump) = vault_asset_record_pda(program_id, pool_state.key, expected_asset_id);
    if *vault_asset_record.key != expected {
        return Err(ProgramError::Custom(ERR_VAULT_ASSET_MISMATCH));
    }
    require_readonly_account(vault_asset_record)?;

    let asset_data = vault_asset_record.try_borrow_data()?;
    require_vault_asset_record_data(&asset_data, pool_state, expected_asset_id)?;
    // releaseEnabled semantics (current vs future):
    //   - WRITE: TAG_REGISTER_VAULT_ASSET writes `releaseEnabled = 0` (see line ~933).
    //   - READ (today): TAG_UNSHIELD requires `releaseEnabled == 0` here. Non-zero is
    //     reserved as a future "release-authorized" flag once the verifier is wired in;
    //     production should eventually require releaseEnabled == 1, but only at the
    //     same time the proof/root/nullifier path is real.
    //     the production-private migration must invert this check at the same time it
    //     wires real verifier/root/nullifier acceptance.
    //   - Until then the entire TAG_UNSHIELD release path returns ERR_UNSHIELD_NOT_WIRED
    //     after this check, so the inverted-looking comparison is intentionally fail-closed.
    if asset_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] != 0 {
        return Err(ProgramError::Custom(ERR_VAULT_ASSET_MISMATCH));
    }
    Ok(asset_data[VAULT_ASSET_KIND_OFFSET])
}

fn require_vault_asset_record_data(
    asset_data: &[u8],
    pool_state: &AccountInfo,
    expected_asset_id: &[u8],
) -> ProgramResult {
    if asset_data.len() < VAULT_ASSET_ACCOUNT_LEN
        || &asset_data[..8] != VAULT_ASSET_MAGIC
        || asset_data[8] != VERSION
        || read_count(asset_data)? != 1
    {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    if &asset_data[VAULT_ASSET_POOL_OFFSET..VAULT_ASSET_POOL_OFFSET + HASH_LEN]
        != pool_state.key.as_ref()
        || &asset_data
            [VAULT_ASSET_EXIT_ASSET_ID_OFFSET..VAULT_ASSET_EXIT_ASSET_ID_OFFSET + HASH_LEN]
            != expected_asset_id
    {
        return Err(ProgramError::Custom(ERR_VAULT_ASSET_MISMATCH));
    }
    Ok(())
}

fn ensure_vault_asset_record<'a>(
    program_id: &Pubkey,
    pool_state: &AccountInfo<'a>,
    vault_asset_record: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    exit_asset_id: &[u8],
    mint: &[u8],
    vault_authority: &[u8],
    vault_token_account: &[u8],
    token_program: &[u8],
    asset_kind: u8,
) -> ProgramResult {
    let (expected_record, bump) = Pubkey::find_program_address(
        &[VAULT_ASSET_SEED, pool_state.key.as_ref(), exit_asset_id],
        program_id,
    );
    if expected_record != *vault_asset_record.key {
        return Err(ProgramError::Custom(ERR_VAULT_ASSET_MISMATCH));
    }

    if vault_asset_record.owner == program_id {
        let mut data = vault_asset_record.try_borrow_mut_data()?;
        if data.iter().all(|byte| *byte == 0) {
            return write_vault_asset_account(
                &mut data,
                pool_state,
                exit_asset_id,
                mint,
                vault_authority,
                vault_token_account,
                token_program,
                asset_kind,
            );
        }
        require_vault_asset_record_data(&data, pool_state, exit_asset_id)?;
        require_vault_asset_record_payload(
            &data,
            mint,
            vault_authority,
            vault_token_account,
            token_program,
            asset_kind,
        )?;
        return Ok(());
    }

    if vault_asset_record.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    {
        let data = vault_asset_record.try_borrow_data()?;
        if !data.is_empty() || vault_asset_record.lamports() != 0 {
            return Err(ProgramError::Custom(ERR_VAULT_ASSET_MISMATCH));
        }
    }

    let rent_lamports = Rent::get()?.minimum_balance(VAULT_ASSET_ACCOUNT_LEN);
    let create_record = system_instruction::create_account(
        authority.key,
        vault_asset_record.key,
        rent_lamports,
        VAULT_ASSET_ACCOUNT_LEN as u64,
        program_id,
    );
    invoke_signed(
        &create_record,
        &[
            authority.clone(),
            vault_asset_record.clone(),
            system_program_info.clone(),
        ],
        &[&[
            VAULT_ASSET_SEED,
            pool_state.key.as_ref(),
            exit_asset_id,
            &[bump],
        ]],
    )?;

    let mut data = vault_asset_record.try_borrow_mut_data()?;
    write_vault_asset_account(
        &mut data,
        pool_state,
        exit_asset_id,
        mint,
        vault_authority,
        vault_token_account,
        token_program,
        asset_kind,
    )
}

fn write_vault_asset_account(
    data: &mut [u8],
    pool_state: &AccountInfo,
    exit_asset_id: &[u8],
    mint: &[u8],
    vault_authority: &[u8],
    vault_token_account: &[u8],
    token_program: &[u8],
    asset_kind: u8,
) -> ProgramResult {
    if data.len() < VAULT_ASSET_ACCOUNT_LEN
        || exit_asset_id.len() != HASH_LEN
        || mint.len() != HASH_LEN
        || vault_authority.len() != HASH_LEN
        || vault_token_account.len() != HASH_LEN
        || token_program.len() != HASH_LEN
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    data.fill(0);
    data[..8].copy_from_slice(VAULT_ASSET_MAGIC);
    data[8] = VERSION;
    write_count(data, 1)?;
    data[VAULT_ASSET_POOL_OFFSET..VAULT_ASSET_POOL_OFFSET + HASH_LEN]
        .copy_from_slice(pool_state.key.as_ref());
    data[VAULT_ASSET_EXIT_ASSET_ID_OFFSET..VAULT_ASSET_EXIT_ASSET_ID_OFFSET + HASH_LEN]
        .copy_from_slice(exit_asset_id);
    data[VAULT_ASSET_MINT_OFFSET..VAULT_ASSET_MINT_OFFSET + HASH_LEN].copy_from_slice(mint);
    data[VAULT_ASSET_VAULT_AUTHORITY_OFFSET..VAULT_ASSET_VAULT_AUTHORITY_OFFSET + HASH_LEN]
        .copy_from_slice(vault_authority);
    data[VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET..VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET + HASH_LEN]
        .copy_from_slice(vault_token_account);
    data[VAULT_ASSET_TOKEN_PROGRAM_OFFSET..VAULT_ASSET_TOKEN_PROGRAM_OFFSET + HASH_LEN]
        .copy_from_slice(token_program);
    data[VAULT_ASSET_KIND_OFFSET] = asset_kind;
    data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] = 0;
    Ok(())
}

fn require_vault_asset_record_payload(
    data: &[u8],
    mint: &[u8],
    vault_authority: &[u8],
    vault_token_account: &[u8],
    token_program: &[u8],
    asset_kind: u8,
) -> ProgramResult {
    // M7 fix (2026-05-22): an already-initialized vault-asset record whose
    // payload disagrees with the caller's supplied params is a re-registration
    // attempt with mismatched data, not a PDA-derivation mismatch. Surface
    // ERR_VAULT_ASSET_ALREADY_REGISTERED_WITH_DIFFERENT_PARAMS so operators
    // see the difference between "wrong account" and "this asset is already
    // registered with different params; refusing to overwrite."
    if data[VAULT_ASSET_KIND_OFFSET] != asset_kind
        || data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] != 0
        || &data[VAULT_ASSET_MINT_OFFSET..VAULT_ASSET_MINT_OFFSET + HASH_LEN] != mint
        || &data[VAULT_ASSET_VAULT_AUTHORITY_OFFSET..VAULT_ASSET_VAULT_AUTHORITY_OFFSET + HASH_LEN]
            != vault_authority
        || &data[VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET
            ..VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET + HASH_LEN]
            != vault_token_account
        || &data[VAULT_ASSET_TOKEN_PROGRAM_OFFSET..VAULT_ASSET_TOKEN_PROGRAM_OFFSET + HASH_LEN]
            != token_program
    {
        return Err(ProgramError::Custom(
            ERR_VAULT_ASSET_ALREADY_REGISTERED_WITH_DIFFERENT_PARAMS,
        ));
    }
    Ok(())
}

fn require_spl_release_accounts(
    vault_asset_data: &[u8],
    vault_token_account: &AccountInfo,
    destination_token_account: &AccountInfo,
    mint: &AccountInfo,
    token_program: &AccountInfo,
    vault_authority: &AccountInfo,
    exit_destination: &[u8],
) -> ProgramResult {
    if token_program.key != &SPL_TOKEN_PROGRAM_ID
        || mint.owner != token_program.key
        || vault_token_account.owner != token_program.key
        || destination_token_account.owner != token_program.key
    {
        return Err(ProgramError::Custom(ERR_TOKEN_PROGRAM_MISMATCH));
    }
    require_writable_account(vault_token_account)?;
    require_writable_account(destination_token_account)?;
    require_readonly_account(mint)?;
    require_readonly_account(token_program)?;

    let mint_key = &vault_asset_data[VAULT_ASSET_MINT_OFFSET..VAULT_ASSET_MINT_OFFSET + HASH_LEN];
    let vault_token_key = &vault_asset_data
        [VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET..VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET + HASH_LEN];
    let token_program_key = &vault_asset_data
        [VAULT_ASSET_TOKEN_PROGRAM_OFFSET..VAULT_ASSET_TOKEN_PROGRAM_OFFSET + HASH_LEN];
    let vault_authority_key = &vault_asset_data
        [VAULT_ASSET_VAULT_AUTHORITY_OFFSET..VAULT_ASSET_VAULT_AUTHORITY_OFFSET + HASH_LEN];

    if mint_key != mint.key.as_ref() || token_program_key != token_program.key.as_ref() {
        return Err(ProgramError::Custom(ERR_TOKEN_PROGRAM_MISMATCH));
    }
    if vault_token_key != vault_token_account.key.as_ref()
        || vault_authority_key != vault_authority.key.as_ref()
    {
        return Err(ProgramError::Custom(ERR_VAULT_TOKEN_ACCOUNT_MISMATCH));
    }

    let vault_data = vault_token_account.try_borrow_data()?;
    if vault_data.len() < TOKEN_ACCOUNT_LEN
        || &vault_data[TOKEN_ACCOUNT_MINT_OFFSET..TOKEN_ACCOUNT_MINT_OFFSET + HASH_LEN]
            != mint.key.as_ref()
        || &vault_data[TOKEN_ACCOUNT_OWNER_OFFSET..TOKEN_ACCOUNT_OWNER_OFFSET + HASH_LEN]
            != vault_authority.key.as_ref()
    {
        return Err(ProgramError::Custom(ERR_VAULT_TOKEN_ACCOUNT_MISMATCH));
    }

    let destination_data = destination_token_account.try_borrow_data()?;
    if destination_data.len() < TOKEN_ACCOUNT_LEN
        || &destination_data[TOKEN_ACCOUNT_MINT_OFFSET..TOKEN_ACCOUNT_MINT_OFFSET + HASH_LEN]
            != mint.key.as_ref()
        || &destination_data[TOKEN_ACCOUNT_OWNER_OFFSET..TOKEN_ACCOUNT_OWNER_OFFSET + HASH_LEN]
            != exit_destination
    {
        return Err(ProgramError::Custom(ERR_DESTINATION_TOKEN_ACCOUNT_MISMATCH));
    }

    Ok(())
}

fn require_sol_release_accounts(
    sol_vault_holding: &AccountInfo,
    vault_token_account_slot: &AccountInfo,
    destination: &AccountInfo,
    mint_slot: &AccountInfo,
    token_program_slot: &AccountInfo,
    exit_destination: &[u8],
) -> ProgramResult {
    require_system_program(mint_slot)?;
    require_system_program(token_program_slot)?;
    require_writable_account(sol_vault_holding)?;
    require_writable_account(destination)?;
    if sol_vault_holding.key.as_ref() != vault_token_account_slot.key.as_ref() {
        return Err(ProgramError::Custom(ERR_VAULT_TOKEN_ACCOUNT_MISMATCH));
    }
    if destination.key.as_ref() != exit_destination {
        return Err(ProgramError::Custom(ERR_DESTINATION_TOKEN_ACCOUNT_MISMATCH));
    }
    if destination.owner != &system_program::ID {
        return Err(ProgramError::Custom(ERR_DESTINATION_TOKEN_ACCOUNT_MISMATCH));
    }
    Ok(())
}

fn read_mint_decimals(mint: &AccountInfo) -> Result<u8, ProgramError> {
    let mint_data = mint.try_borrow_data()?;
    if mint_data.len() <= MINT_DECIMALS_OFFSET {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(mint_data[MINT_DECIMALS_OFFSET])
}

fn init_fixed_slot_account(
    account: &AccountInfo,
    magic: &[u8; 8],
    slot_len: usize,
) -> ProgramResult {
    let mut data = account.try_borrow_mut_data()?;
    if fixed_slot_capacity(&data, slot_len)? == 0 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    require_uninitialized(&data[..])?;

    data.fill(0);
    data[..8].copy_from_slice(magic);
    data[8] = VERSION;
    Ok(())
}

fn init_output_index_account(account: &AccountInfo) -> ProgramResult {
    let mut data = account.try_borrow_mut_data()?;
    if data.len() < HEADER_LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }
    require_uninitialized(&data[..])?;

    data.fill(0);
    data[..8].copy_from_slice(OUTPUT_MAGIC);
    data[8] = VERSION;
    Ok(())
}

fn init_tree_state_account(tree_state: &AccountInfo, pool_state: &AccountInfo) -> ProgramResult {
    let mut data = tree_state.try_borrow_mut_data()?;
    if data.len() < TREE_STATE_LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }
    require_uninitialized(&data[..])?;

    let zero_nodes = compute_empty_tree_nodes()?;
    data.fill(0);
    data[..8].copy_from_slice(TREE_MAGIC);
    data[8] = VERSION;
    write_count(&mut data, 1)?;
    data[TREE_POOL_OFFSET..TREE_POOL_OFFSET + HASH_LEN].copy_from_slice(pool_state.key.as_ref());
    data[TREE_DEPTH_OFFSET] = MERKLE_TREE_DEPTH as u8;
    write_u64(&mut data, TREE_NEXT_LEAF_INDEX_OFFSET, 0)?;
    data[TREE_CURRENT_ROOT_OFFSET..TREE_CURRENT_ROOT_OFFSET + HASH_LEN]
        .copy_from_slice(&zero_nodes[MERKLE_TREE_DEPTH]);
    Ok(())
}

fn require_pool_header(data: &[u8]) -> ProgramResult {
    if data.len() < POOL_STATE_LEN || &data[..8] != POOL_MAGIC || data[8] != VERSION {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    Ok(())
}

fn pool_verifier_wired(data: &[u8]) -> Result<bool, ProgramError> {
    require_pool_header(data)?;
    match data[POOL_VERIFIER_WIRED_OFFSET] {
        POOL_VERIFIER_NOT_WIRED => Ok(false),
        POOL_VERIFIER_WIRED => Ok(true),
        _ => Err(ProgramError::InvalidAccountData),
    }
}

fn require_pool_verifier_wired(data: &[u8], not_wired_error: u32) -> ProgramResult {
    if pool_verifier_wired(data)? {
        return Ok(());
    }
    Err(ProgramError::Custom(not_wired_error))
}

fn require_uninitialized(data: &[u8]) -> ProgramResult {
    if data.iter().any(|byte| *byte != 0) {
        return Err(ProgramError::Custom(ERR_ALREADY_INITIALIZED));
    }
    Ok(())
}

fn require_authority(pool_data: &[u8], authority: &AccountInfo) -> ProgramResult {
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if pool_data[POOL_AUTHORITY_OFFSET..POOL_AUTHORITY_OFFSET + HASH_LEN] != *authority.key.as_ref()
    {
        return Err(ProgramError::Custom(ERR_UNAUTHORIZED_OPERATOR));
    }
    Ok(())
}

fn require_pool_account_bindings(
    pool_data: &[u8],
    nullifier_set: &AccountInfo,
    output_queue: &AccountInfo,
    root_history: &AccountInfo,
) -> ProgramResult {
    if pool_data[POOL_NULLIFIER_SET_OFFSET..POOL_NULLIFIER_SET_OFFSET + HASH_LEN]
        != *nullifier_set.key.as_ref()
    {
        return Err(ProgramError::Custom(ERR_POOL_ACCOUNT_MISMATCH));
    }
    if pool_data[POOL_OUTPUT_QUEUE_OFFSET..POOL_OUTPUT_QUEUE_OFFSET + HASH_LEN]
        != *output_queue.key.as_ref()
    {
        return Err(ProgramError::Custom(ERR_POOL_ACCOUNT_MISMATCH));
    }
    require_pool_root_history_binding(pool_data, root_history)
}

fn require_pool_root_history_binding(
    pool_data: &[u8],
    root_history: &AccountInfo,
) -> ProgramResult {
    if pool_data[POOL_ROOT_HISTORY_OFFSET..POOL_ROOT_HISTORY_OFFSET + HASH_LEN]
        != *root_history.key.as_ref()
    {
        return Err(ProgramError::Custom(ERR_POOL_ACCOUNT_MISMATCH));
    }
    Ok(())
}

fn require_pool_tree_state_binding(pool_data: &[u8], tree_state: &AccountInfo) -> ProgramResult {
    if pool_data[POOL_TREE_STATE_OFFSET..POOL_TREE_STATE_OFFSET + HASH_LEN]
        != *tree_state.key.as_ref()
    {
        return Err(ProgramError::Custom(ERR_POOL_ACCOUNT_MISMATCH));
    }
    Ok(())
}

fn require_tree_state_header(data: &[u8], pool_state: &AccountInfo) -> ProgramResult {
    if data.len() < TREE_STATE_LEN
        || &data[..8] != TREE_MAGIC
        || data[8] != VERSION
        || read_count(data)? != 1
        || data[TREE_DEPTH_OFFSET] != MERKLE_TREE_DEPTH as u8
    {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    if data[TREE_POOL_OFFSET..TREE_POOL_OFFSET + HASH_LEN] != *pool_state.key.as_ref() {
        return Err(ProgramError::Custom(ERR_TREE_STATE_MISMATCH));
    }
    if read_u64(data, TREE_NEXT_LEAF_INDEX_OFFSET)? > TREE_CAPACITY {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    Ok(())
}

fn require_fixed_slot_header(data: &[u8], magic: &[u8; 8], slot_len: usize) -> ProgramResult {
    if data.len() < HEADER_LEN || &data[..8] != magic || data[8] != VERSION {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    let count = read_count(data)? as usize;
    if count > fixed_slot_capacity(data, slot_len)? {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    Ok(())
}

fn require_output_index_header(data: &[u8]) -> ProgramResult {
    if data.len() < HEADER_LEN || &data[..8] != OUTPUT_MAGIC || data[8] != VERSION {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    Ok(())
}

fn fixed_slot_capacity(data: &[u8], slot_len: usize) -> Result<usize, ProgramError> {
    if data.len() < HEADER_LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }
    Ok((data.len() - HEADER_LEN) / slot_len)
}

fn fixed_slot_contains(data: &[u8], slot_len: usize, value: &[u8]) -> Result<bool, ProgramError> {
    let count = read_count(data)? as usize;
    Ok(data[HEADER_LEN..]
        .chunks_exact(slot_len)
        .take(count)
        .any(|slot| slot == value))
}

fn ensure_nullifier_marker<'a>(
    program_id: &Pubkey,
    pool_state: &AccountInfo<'a>,
    nullifier_marker: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    nullifier: &[u8],
) -> ProgramResult {
    let (expected_marker, bump) = Pubkey::find_program_address(
        &[NULLIFIER_MARKER_SEED, pool_state.key.as_ref(), nullifier],
        program_id,
    );
    if expected_marker != *nullifier_marker.key {
        return Err(ProgramError::Custom(ERR_NULLIFIER_MARKER_MISMATCH));
    }

    if nullifier_marker.owner == program_id {
        let mut marker_data = nullifier_marker.try_borrow_mut_data()?;
        return mark_program_owned_nullifier_marker(&mut marker_data, pool_state, nullifier);
    }

    if nullifier_marker.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    {
        let marker_data = nullifier_marker.try_borrow_data()?;
        if !marker_data.is_empty() || nullifier_marker.lamports() != 0 {
            return Err(ProgramError::Custom(ERR_NULLIFIER_MARKER_MISMATCH));
        }
    }

    let rent_lamports = Rent::get()?.minimum_balance(NULLIFIER_MARKER_LEN);
    let create_marker = system_instruction::create_account(
        authority.key,
        nullifier_marker.key,
        rent_lamports,
        NULLIFIER_MARKER_LEN as u64,
        program_id,
    );
    invoke_signed(
        &create_marker,
        &[
            authority.clone(),
            nullifier_marker.clone(),
            system_program_info.clone(),
        ],
        &[&[
            NULLIFIER_MARKER_SEED,
            pool_state.key.as_ref(),
            nullifier,
            &[bump],
        ]],
    )?;

    let mut marker_data = nullifier_marker.try_borrow_mut_data()?;
    mark_program_owned_nullifier_marker(&mut marker_data, pool_state, nullifier)
}

fn require_nullifier_marker_available(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    nullifier_marker: &AccountInfo,
    nullifier: &[u8],
) -> ProgramResult {
    let (expected_marker, _) = Pubkey::find_program_address(
        &[NULLIFIER_MARKER_SEED, pool_state.key.as_ref(), nullifier],
        program_id,
    );
    if expected_marker != *nullifier_marker.key {
        return Err(ProgramError::Custom(ERR_NULLIFIER_MARKER_MISMATCH));
    }

    if nullifier_marker.owner == program_id {
        let marker_data = nullifier_marker.try_borrow_data()?;
        if marker_data.iter().all(|byte| *byte == 0) {
            if marker_data.len() < NULLIFIER_MARKER_LEN {
                return Err(ProgramError::AccountDataTooSmall);
            }
            return Ok(());
        }
        require_nullifier_marker(&marker_data, pool_state, nullifier)?;
        return Err(ProgramError::Custom(ERR_DUPLICATE_NULLIFIER));
    }

    if nullifier_marker.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    let marker_data = nullifier_marker.try_borrow_data()?;
    if !marker_data.is_empty() || nullifier_marker.lamports() != 0 {
        return Err(ProgramError::Custom(ERR_NULLIFIER_MARKER_MISMATCH));
    }
    Ok(())
}

fn mark_program_owned_nullifier_marker(
    marker_data: &mut [u8],
    pool_state: &AccountInfo,
    nullifier: &[u8],
) -> ProgramResult {
    if marker_data.len() < NULLIFIER_MARKER_LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }

    let marker_slice = &mut marker_data[..NULLIFIER_MARKER_LEN];
    if marker_slice.iter().all(|byte| *byte == 0) {
        write_nullifier_marker(marker_slice, pool_state, nullifier)?;
        return Ok(());
    }

    require_nullifier_marker(marker_slice, pool_state, nullifier)?;
    Err(ProgramError::Custom(ERR_DUPLICATE_NULLIFIER))
}

fn require_nullifier_marker(
    marker_data: &[u8],
    pool_state: &AccountInfo,
    nullifier: &[u8],
) -> ProgramResult {
    if marker_data.len() < NULLIFIER_MARKER_LEN
        || &marker_data[..8] != NULLIFIER_MARKER_MAGIC
        || marker_data[8] != VERSION
        || read_count(marker_data)? != 1
    {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    if marker_data[NULLIFIER_MARKER_POOL_OFFSET..NULLIFIER_MARKER_POOL_OFFSET + HASH_LEN]
        != *pool_state.key.as_ref()
        || &marker_data
            [NULLIFIER_MARKER_NULLIFIER_OFFSET..NULLIFIER_MARKER_NULLIFIER_OFFSET + HASH_LEN]
            != nullifier
    {
        return Err(ProgramError::Custom(ERR_NULLIFIER_MARKER_MISMATCH));
    }
    Ok(())
}

fn write_nullifier_marker(
    marker_data: &mut [u8],
    pool_state: &AccountInfo,
    nullifier: &[u8],
) -> ProgramResult {
    if nullifier.len() != HASH_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }
    marker_data.fill(0);
    marker_data[..8].copy_from_slice(NULLIFIER_MARKER_MAGIC);
    marker_data[8] = VERSION;
    write_count(marker_data, 1)?;
    marker_data[NULLIFIER_MARKER_POOL_OFFSET..NULLIFIER_MARKER_POOL_OFFSET + HASH_LEN]
        .copy_from_slice(pool_state.key.as_ref());
    marker_data[NULLIFIER_MARKER_NULLIFIER_OFFSET..NULLIFIER_MARKER_NULLIFIER_OFFSET + HASH_LEN]
        .copy_from_slice(nullifier);
    Ok(())
}

fn ensure_output_record<'a>(
    program_id: &Pubkey,
    pool_state: &AccountInfo<'a>,
    output_record: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    output_index: u64,
    output0: &[u8],
    output1: &[u8],
    public_input_hash: &[u8],
) -> ProgramResult {
    let (expected_record, bump) = Pubkey::find_program_address(
        &[
            OUTPUT_RECORD_SEED,
            pool_state.key.as_ref(),
            public_input_hash,
        ],
        program_id,
    );
    if expected_record != *output_record.key {
        return Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH));
    }

    if output_record.owner == program_id {
        let mut record_data = output_record.try_borrow_mut_data()?;
        if record_data.iter().all(|byte| *byte == 0) {
            return write_output_record(
                &mut record_data,
                pool_state,
                output_index,
                output0,
                output1,
                public_input_hash,
            );
        }
        require_output_record(
            &record_data,
            pool_state,
            output_index,
            output0,
            output1,
            public_input_hash,
        )?;
        return Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH));
    }

    if output_record.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    {
        let record_data = output_record.try_borrow_data()?;
        if !record_data.is_empty() || output_record.lamports() != 0 {
            return Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH));
        }
    }

    let rent_lamports = Rent::get()?.minimum_balance(OUTPUT_RECORD_PDA_LEN);
    let create_record = system_instruction::create_account(
        authority.key,
        output_record.key,
        rent_lamports,
        OUTPUT_RECORD_PDA_LEN as u64,
        program_id,
    );
    invoke_signed(
        &create_record,
        &[
            authority.clone(),
            output_record.clone(),
            system_program_info.clone(),
        ],
        &[&[
            OUTPUT_RECORD_SEED,
            pool_state.key.as_ref(),
            public_input_hash,
            &[bump],
        ]],
    )?;

    let mut record_data = output_record.try_borrow_mut_data()?;
    write_output_record(
        &mut record_data,
        pool_state,
        output_index,
        output0,
        output1,
        public_input_hash,
    )
}

// L7 note (2026-05-22): The output record PDA is content-addressed via the
// `public_input_hash` seed below — NOT just `output_index`. A given
// public_input_hash binds (nullifier, output0, output1, accepted_root,
// asset/amount preimage) via the future Groth16 verifier and the existing
// Poseidon binding in `bind_private_spend_public_inputs` (see
// `zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr`).
// Two different spends therefore cannot collide on the same PDA, and the
// init-or-match payload check below additionally rejects replays.
fn require_output_record_available(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    output_record: &AccountInfo,
    output_index: u64,
    output0: &[u8],
    output1: &[u8],
    public_input_hash: &[u8],
) -> ProgramResult {
    let (expected_record, _) = Pubkey::find_program_address(
        &[
            OUTPUT_RECORD_SEED,
            pool_state.key.as_ref(),
            public_input_hash,
        ],
        program_id,
    );
    if expected_record != *output_record.key {
        return Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH));
    }

    if output_record.owner == program_id {
        let record_data = output_record.try_borrow_data()?;
        if record_data.iter().all(|byte| *byte == 0) {
            if record_data.len() < OUTPUT_RECORD_PDA_LEN {
                return Err(ProgramError::AccountDataTooSmall);
            }
            return Ok(());
        }
        require_output_record(
            &record_data,
            pool_state,
            output_index,
            output0,
            output1,
            public_input_hash,
        )?;
        return Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH));
    }

    if output_record.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    let record_data = output_record.try_borrow_data()?;
    if !record_data.is_empty() || output_record.lamports() != 0 {
        return Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH));
    }
    Ok(())
}

fn require_output_record(
    record_data: &[u8],
    pool_state: &AccountInfo,
    output_index: u64,
    output0: &[u8],
    output1: &[u8],
    public_input_hash: &[u8],
) -> ProgramResult {
    if record_data.len() < OUTPUT_RECORD_PDA_LEN
        || &record_data[..8] != OUTPUT_RECORD_MAGIC
        || record_data[8] != VERSION
        || read_count(record_data)? != 1
    {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    if read_u64(record_data, OUTPUT_RECORD_INDEX_OFFSET)? != output_index {
        return Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH));
    }
    if record_data[OUTPUT_RECORD_POOL_OFFSET..OUTPUT_RECORD_POOL_OFFSET + HASH_LEN]
        != *pool_state.key.as_ref()
        || &record_data[OUTPUT_RECORD_OUTPUT0_OFFSET..OUTPUT_RECORD_OUTPUT0_OFFSET + HASH_LEN]
            != output0
        || &record_data[OUTPUT_RECORD_OUTPUT1_OFFSET..OUTPUT_RECORD_OUTPUT1_OFFSET + HASH_LEN]
            != output1
        || &record_data[OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET
            ..OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN]
            != public_input_hash
    {
        return Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH));
    }
    Ok(())
}

fn write_hash_slot(data: &mut [u8], index: usize, slot_len: usize, value: &[u8]) -> ProgramResult {
    let start = HEADER_LEN + index * slot_len;
    let end = start + slot_len;
    if end > data.len() {
        return Err(ProgramError::AccountDataTooSmall);
    }
    if value.len() != slot_len {
        return Err(ProgramError::InvalidInstructionData);
    }
    data[start..end].copy_from_slice(value);
    Ok(())
}

fn write_output_record(
    data: &mut [u8],
    pool_state: &AccountInfo,
    output_index: u64,
    output0: &[u8],
    output1: &[u8],
    public_input_hash: &[u8],
) -> ProgramResult {
    if data.len() < OUTPUT_RECORD_PDA_LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }

    data.fill(0);
    data[..8].copy_from_slice(OUTPUT_RECORD_MAGIC);
    data[8] = VERSION;
    write_count(data, 1)?;
    write_u64(data, OUTPUT_RECORD_INDEX_OFFSET, output_index)?;
    data[OUTPUT_RECORD_POOL_OFFSET..OUTPUT_RECORD_POOL_OFFSET + HASH_LEN]
        .copy_from_slice(pool_state.key.as_ref());
    data[OUTPUT_RECORD_OUTPUT0_OFFSET..OUTPUT_RECORD_OUTPUT0_OFFSET + HASH_LEN]
        .copy_from_slice(output0);
    data[OUTPUT_RECORD_OUTPUT1_OFFSET..OUTPUT_RECORD_OUTPUT1_OFFSET + HASH_LEN]
        .copy_from_slice(output1);
    data[OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET..OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN]
        .copy_from_slice(public_input_hash);
    Ok(())
}

#[allow(deprecated)]
fn poseidon_hash_leaf(leaf: &[u8]) -> Result<[u8; HASH_LEN], ProgramError> {
    if leaf.len() != HASH_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }
    poseidon_hashv(Parameters::Bn254X5, Endianness::BigEndian, &[leaf])
        .map(|hash| hash.to_bytes())
        .map_err(|_| ProgramError::Custom(ERR_POSEIDON_HASH_FAILED))
}

#[allow(deprecated)]
fn poseidon_hash_node(left: &[u8], right: &[u8]) -> Result<[u8; HASH_LEN], ProgramError> {
    if left.len() != HASH_LEN || right.len() != HASH_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }
    poseidon_hashv(Parameters::Bn254X5, Endianness::BigEndian, &[left, right])
        .map(|hash| hash.to_bytes())
        .map_err(|_| ProgramError::Custom(ERR_POSEIDON_HASH_FAILED))
}

fn compute_empty_tree_nodes() -> Result<[[u8; HASH_LEN]; TREE_ZERO_NODE_COUNT], ProgramError> {
    let mut zero_nodes = [[0u8; HASH_LEN]; TREE_ZERO_NODE_COUNT];
    zero_nodes[0] = poseidon_hash_leaf(&[0u8; HASH_LEN])?;
    for level in 1..TREE_ZERO_NODE_COUNT {
        zero_nodes[level] = poseidon_hash_node(&zero_nodes[level - 1], &zero_nodes[level - 1])?;
    }
    Ok(zero_nodes)
}

fn compute_program_owned_append_root(
    tree_data: &[u8],
    leaf_index: u64,
    output_commitment: &[u8],
) -> Result<([u8; HASH_LEN], [[u8; HASH_LEN]; MERKLE_TREE_DEPTH]), ProgramError> {
    let zero_nodes = compute_empty_tree_nodes()?;
    let mut frontier = [[0u8; HASH_LEN]; MERKLE_TREE_DEPTH];
    for level in 0..MERKLE_TREE_DEPTH {
        frontier[level] = read_hash(tree_data, TREE_FRONTIER_OFFSET + level * HASH_LEN)?;
    }

    let mut current = poseidon_hash_leaf(output_commitment)?;
    for level in 0..MERKLE_TREE_DEPTH {
        if ((leaf_index >> level) & 1) == 0 {
            frontier[level] = current;
            current = poseidon_hash_node(&current, &zero_nodes[level])?;
        } else {
            let left = frontier[level];
            if left.iter().all(|byte| *byte == 0) {
                return Err(ProgramError::Custom(ERR_TREE_STATE_MISMATCH));
            }
            current = poseidon_hash_node(&left, &current)?;
        }
    }

    Ok((current, frontier))
}

fn require_tree_leaf_marker_available(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    tree_leaf_marker: &AccountInfo,
    output_commitment: &[u8],
) -> ProgramResult {
    let (expected_marker, _) = Pubkey::find_program_address(
        &[
            TREE_LEAF_MARKER_SEED,
            pool_state.key.as_ref(),
            output_commitment,
        ],
        program_id,
    );
    if expected_marker != *tree_leaf_marker.key {
        return Err(ProgramError::Custom(ERR_TREE_LEAF_MARKER_MISMATCH));
    }

    if tree_leaf_marker.owner == program_id {
        let marker_data = tree_leaf_marker.try_borrow_data()?;
        if marker_data.iter().all(|byte| *byte == 0) {
            if marker_data.len() < TREE_LEAF_MARKER_LEN {
                return Err(ProgramError::AccountDataTooSmall);
            }
            return Ok(());
        }
        require_tree_leaf_marker(&marker_data, pool_state, output_commitment)?;
        return Err(ProgramError::Custom(ERR_DUPLICATE_TREE_LEAF));
    }

    if tree_leaf_marker.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    let marker_data = tree_leaf_marker.try_borrow_data()?;
    if !marker_data.is_empty() || tree_leaf_marker.lamports() != 0 {
        return Err(ProgramError::Custom(ERR_TREE_LEAF_MARKER_MISMATCH));
    }
    Ok(())
}

fn ensure_tree_leaf_marker<'a>(
    program_id: &Pubkey,
    pool_state: &AccountInfo<'a>,
    tree_leaf_marker: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    output_commitment: &[u8],
    leaf_index: u64,
) -> ProgramResult {
    let (expected_marker, bump) = Pubkey::find_program_address(
        &[
            TREE_LEAF_MARKER_SEED,
            pool_state.key.as_ref(),
            output_commitment,
        ],
        program_id,
    );
    if expected_marker != *tree_leaf_marker.key {
        return Err(ProgramError::Custom(ERR_TREE_LEAF_MARKER_MISMATCH));
    }

    if tree_leaf_marker.owner == program_id {
        let mut marker_data = tree_leaf_marker.try_borrow_mut_data()?;
        if marker_data.iter().all(|byte| *byte == 0) {
            return write_tree_leaf_marker(
                &mut marker_data,
                pool_state,
                output_commitment,
                leaf_index,
            );
        }
        require_tree_leaf_marker(&marker_data, pool_state, output_commitment)?;
        return Err(ProgramError::Custom(ERR_DUPLICATE_TREE_LEAF));
    }

    if tree_leaf_marker.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    {
        let marker_data = tree_leaf_marker.try_borrow_data()?;
        if !marker_data.is_empty() || tree_leaf_marker.lamports() != 0 {
            return Err(ProgramError::Custom(ERR_TREE_LEAF_MARKER_MISMATCH));
        }
    }

    let rent_lamports = Rent::get()?.minimum_balance(TREE_LEAF_MARKER_LEN);
    let create_marker = system_instruction::create_account(
        authority.key,
        tree_leaf_marker.key,
        rent_lamports,
        TREE_LEAF_MARKER_LEN as u64,
        program_id,
    );
    invoke_signed(
        &create_marker,
        &[
            authority.clone(),
            tree_leaf_marker.clone(),
            system_program_info.clone(),
        ],
        &[&[
            TREE_LEAF_MARKER_SEED,
            pool_state.key.as_ref(),
            output_commitment,
            &[bump],
        ]],
    )?;

    let mut marker_data = tree_leaf_marker.try_borrow_mut_data()?;
    write_tree_leaf_marker(&mut marker_data, pool_state, output_commitment, leaf_index)
}

fn require_tree_leaf_marker(
    marker_data: &[u8],
    pool_state: &AccountInfo,
    output_commitment: &[u8],
) -> ProgramResult {
    if marker_data.len() < TREE_LEAF_MARKER_LEN
        || &marker_data[..8] != TREE_LEAF_MARKER_MAGIC
        || marker_data[8] != VERSION
        || read_count(marker_data)? != 1
    {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    if marker_data[TREE_LEAF_MARKER_POOL_OFFSET..TREE_LEAF_MARKER_POOL_OFFSET + HASH_LEN]
        != *pool_state.key.as_ref()
        || &marker_data[TREE_LEAF_MARKER_LEAF_OFFSET..TREE_LEAF_MARKER_LEAF_OFFSET + HASH_LEN]
            != output_commitment
    {
        return Err(ProgramError::Custom(ERR_TREE_LEAF_MARKER_MISMATCH));
    }
    Ok(())
}

fn write_tree_leaf_marker(
    data: &mut [u8],
    pool_state: &AccountInfo,
    output_commitment: &[u8],
    leaf_index: u64,
) -> ProgramResult {
    if data.len() < TREE_LEAF_MARKER_LEN || output_commitment.len() != HASH_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    data.fill(0);
    data[..8].copy_from_slice(TREE_LEAF_MARKER_MAGIC);
    data[8] = VERSION;
    write_count(data, 1)?;
    data[TREE_LEAF_MARKER_POOL_OFFSET..TREE_LEAF_MARKER_POOL_OFFSET + HASH_LEN]
        .copy_from_slice(pool_state.key.as_ref());
    data[TREE_LEAF_MARKER_LEAF_OFFSET..TREE_LEAF_MARKER_LEAF_OFFSET + HASH_LEN]
        .copy_from_slice(output_commitment);
    write_u64(data, TREE_LEAF_MARKER_INDEX_OFFSET, leaf_index)?;
    Ok(())
}

fn require_previous_root_matches_history(root_data: &[u8], previous_root: &[u8]) -> ProgramResult {
    let root_count = read_count(root_data)? as usize;
    if root_count == 0 {
        if previous_root.iter().any(|byte| *byte != 0) {
            return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
        }
        return Ok(());
    }

    let last_root_offset = HEADER_LEN + (root_count - 1) * HASH_LEN;
    let last_root = root_data
        .get(last_root_offset..last_root_offset + HASH_LEN)
        .ok_or(ProgramError::AccountDataTooSmall)?;
    if last_root != previous_root {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }
    Ok(())
}

fn require_root_record_available(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    root_record: &AccountInfo,
    accepted_root: &[u8],
) -> ProgramResult {
    let (expected_record, _) = Pubkey::find_program_address(
        &[ROOT_RECORD_SEED, pool_state.key.as_ref(), accepted_root],
        program_id,
    );
    if expected_record != *root_record.key {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }

    if root_record.owner == program_id {
        let record_data = root_record.try_borrow_data()?;
        if record_data.iter().all(|byte| *byte == 0) {
            if record_data.len() < ROOT_RECORD_ACCOUNT_LEN {
                return Err(ProgramError::AccountDataTooSmall);
            }
            return Ok(());
        }
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }

    if root_record.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    let record_data_ref = root_record.try_borrow_data()?;
    let record_data = &record_data_ref[..];
    if !record_data.is_empty() || root_record.lamports() != 0 {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }
    Ok(())
}

fn ensure_root_record<'a>(
    program_id: &Pubkey,
    pool_state: &AccountInfo<'a>,
    root_record: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    sequence: u64,
    previous_root: &[u8],
    accepted_root: &[u8],
    transition_public_input_hash: &[u8],
    leaf_index_base: u64,
    leaf_count: u32,
    transition_kind: u8,
) -> ProgramResult {
    let (expected_record, bump) = Pubkey::find_program_address(
        &[ROOT_RECORD_SEED, pool_state.key.as_ref(), accepted_root],
        program_id,
    );
    if expected_record != *root_record.key {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }

    if root_record.owner == program_id {
        let mut record_data = root_record.try_borrow_mut_data()?;
        if record_data.iter().all(|byte| *byte == 0) {
            return write_root_record(
                &mut record_data,
                pool_state,
                sequence,
                previous_root,
                accepted_root,
                transition_public_input_hash,
                leaf_index_base,
                leaf_count,
                transition_kind,
            );
        }
        return require_root_record(program_id, pool_state, root_record, accepted_root);
    }

    if root_record.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    {
        let record_data = root_record.try_borrow_data()?;
        if !record_data.is_empty() || root_record.lamports() != 0 {
            return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
        }
    }

    let rent_lamports = Rent::get()?.minimum_balance(ROOT_RECORD_ACCOUNT_LEN);
    let create_record = system_instruction::create_account(
        authority.key,
        root_record.key,
        rent_lamports,
        ROOT_RECORD_ACCOUNT_LEN as u64,
        program_id,
    );
    invoke_signed(
        &create_record,
        &[
            authority.clone(),
            root_record.clone(),
            system_program_info.clone(),
        ],
        &[&[
            ROOT_RECORD_SEED,
            pool_state.key.as_ref(),
            accepted_root,
            &[bump],
        ]],
    )?;

    let mut record_data = root_record.try_borrow_mut_data()?;
    write_root_record(
        &mut record_data,
        pool_state,
        sequence,
        previous_root,
        accepted_root,
        transition_public_input_hash,
        leaf_index_base,
        leaf_count,
        transition_kind,
    )
}

fn require_root_record(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    root_record: &AccountInfo,
    accepted_root: &[u8],
) -> ProgramResult {
    let (expected_record, _) = Pubkey::find_program_address(
        &[ROOT_RECORD_SEED, pool_state.key.as_ref(), accepted_root],
        program_id,
    );
    if expected_record != *root_record.key {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }

    let record_data_ref = root_record.try_borrow_data()?;
    let record_data = &record_data_ref[..];
    if record_data.len() != ROOT_RECORD_ACCOUNT_LEN
        || &record_data[..8] != ROOT_RECORD_MAGIC
        || record_data[8] != VERSION
        || read_count(&record_data)? != 1
    {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    if read_u32(record_data, ROOT_RECORD_LEAF_COUNT_OFFSET)? == 0 {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }
    if &record_data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN]
        != pool_state.key.as_ref()
        || &record_data
            [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN]
            != accepted_root
    {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }
    Ok(())
}

fn write_root_record(
    data: &mut [u8],
    pool_state: &AccountInfo,
    sequence: u64,
    previous_root: &[u8],
    accepted_root: &[u8],
    transition_public_input_hash: &[u8],
    leaf_index_base: u64,
    leaf_count: u32,
    transition_kind: u8,
) -> ProgramResult {
    if data.len() < ROOT_RECORD_ACCOUNT_LEN
        || previous_root.len() != HASH_LEN
        || accepted_root.len() != HASH_LEN
        || transition_public_input_hash.len() != HASH_LEN
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    data.fill(0);
    data[..8].copy_from_slice(ROOT_RECORD_MAGIC);
    data[8] = VERSION;
    write_count(data, 1)?;
    write_u64(data, ROOT_RECORD_SEQUENCE_OFFSET, sequence)?;
    data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN]
        .copy_from_slice(pool_state.key.as_ref());
    data[ROOT_RECORD_PREVIOUS_ROOT_OFFSET..ROOT_RECORD_PREVIOUS_ROOT_OFFSET + HASH_LEN]
        .copy_from_slice(previous_root);
    data[ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN]
        .copy_from_slice(accepted_root);
    data[ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET
        ..ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN]
        .copy_from_slice(transition_public_input_hash);
    write_u64(data, ROOT_RECORD_LEAF_INDEX_BASE_OFFSET, leaf_index_base)?;
    write_u32(data, ROOT_RECORD_LEAF_COUNT_OFFSET, leaf_count)?;
    data[ROOT_RECORD_TRANSITION_KIND_OFFSET] = transition_kind;
    Ok(())
}

fn ensure_verifier_key<'a>(
    program_id: &Pubkey,
    pool_state: &AccountInfo<'a>,
    verifier_key: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    verifier_key_hash: &[u8],
    verifier_program_id: &Pubkey,
) -> ProgramResult {
    let (expected_key, bump) = Pubkey::find_program_address(
        &[
            VERIFIER_KEY_SEED,
            pool_state.key.as_ref(),
            verifier_key_hash,
        ],
        program_id,
    );
    if expected_key != *verifier_key.key {
        return Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH));
    }

    if verifier_key.owner == program_id {
        let mut key_data = verifier_key.try_borrow_mut_data()?;
        if key_data.iter().all(|byte| *byte == 0) {
            return write_verifier_key_account(
                &mut key_data,
                pool_state,
                verifier_key_hash,
                verifier_program_id,
            );
        }
        return require_verifier_key_record_data(
            &key_data,
            pool_state,
            verifier_key_hash,
            Some(verifier_program_id),
        );
    }

    if verifier_key.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    {
        let key_data = verifier_key.try_borrow_data()?;
        if !key_data.is_empty() || verifier_key.lamports() != 0 {
            return Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH));
        }
    }

    let rent_lamports = Rent::get()?.minimum_balance(VERIFIER_KEY_ACCOUNT_LEN);
    let create_key = system_instruction::create_account(
        authority.key,
        verifier_key.key,
        rent_lamports,
        VERIFIER_KEY_ACCOUNT_LEN as u64,
        program_id,
    );
    invoke_signed(
        &create_key,
        &[
            authority.clone(),
            verifier_key.clone(),
            system_program_info.clone(),
        ],
        &[&[
            VERIFIER_KEY_SEED,
            pool_state.key.as_ref(),
            verifier_key_hash,
            &[bump],
        ]],
    )?;

    let mut key_data = verifier_key.try_borrow_mut_data()?;
    write_verifier_key_account(
        &mut key_data,
        pool_state,
        verifier_key_hash,
        verifier_program_id,
    )
}

fn require_verifier_key_hash(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    verifier_key: &AccountInfo,
    verifier_key_hash: &[u8],
) -> ProgramResult {
    let (expected_key, _) = Pubkey::find_program_address(
        &[
            VERIFIER_KEY_SEED,
            pool_state.key.as_ref(),
            verifier_key_hash,
        ],
        program_id,
    );
    if expected_key != *verifier_key.key {
        return Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH));
    }

    let key_data = verifier_key.try_borrow_data()?;
    require_verifier_key_record_data(&key_data, pool_state, verifier_key_hash, None)
}

fn require_verifier_key_hash_for_program(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    verifier_key: &AccountInfo,
    verifier_key_hash: &[u8],
    verifier_program_id: &Pubkey,
) -> ProgramResult {
    let (expected_key, _) = Pubkey::find_program_address(
        &[
            VERIFIER_KEY_SEED,
            pool_state.key.as_ref(),
            verifier_key_hash,
        ],
        program_id,
    );
    if expected_key != *verifier_key.key {
        return Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH));
    }

    let key_data = verifier_key.try_borrow_data()?;
    require_verifier_key_record_data(
        &key_data,
        pool_state,
        verifier_key_hash,
        Some(verifier_program_id),
    )
}

fn require_verifier_key_record_data(
    key_data: &[u8],
    pool_state: &AccountInfo,
    verifier_key_hash: &[u8],
    verifier_program_id: Option<&Pubkey>,
) -> ProgramResult {
    if key_data.len() < VERIFIER_KEY_ACCOUNT_LEN
        || &key_data[..8] != VERIFIER_KEY_MAGIC
        || key_data[8] != VERSION
        || read_count(key_data)? != 1
    {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    if &key_data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN]
        != pool_state.key.as_ref()
        || &key_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
            != verifier_key_hash
    {
        return Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH));
    }
    if verifier_program_id.is_some_and(|program_id| {
        &key_data[VERIFIER_KEY_PROGRAM_ID_OFFSET..VERIFIER_KEY_PROGRAM_ID_OFFSET + HASH_LEN]
            != program_id.as_ref()
    }) {
        return Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH));
    }
    Ok(())
}

fn write_verifier_key_account(
    data: &mut [u8],
    pool_state: &AccountInfo,
    verifier_key_hash: &[u8],
    verifier_program_id: &Pubkey,
) -> ProgramResult {
    if data.len() < VERIFIER_KEY_ACCOUNT_LEN || verifier_key_hash.len() != HASH_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    data.fill(0);
    data[..8].copy_from_slice(VERIFIER_KEY_MAGIC);
    data[8] = VERSION;
    write_count(data, 1)?;
    data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN]
        .copy_from_slice(pool_state.key.as_ref());
    data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
        .copy_from_slice(verifier_key_hash);
    data[VERIFIER_KEY_PROGRAM_ID_OFFSET..VERIFIER_KEY_PROGRAM_ID_OFFSET + HASH_LEN]
        .copy_from_slice(verifier_program_id.as_ref());
    Ok(())
}

fn is_zero_hash(value: &[u8]) -> bool {
    value.len() == HASH_LEN && value.iter().all(|byte| *byte == 0)
}

fn read_count(data: &[u8]) -> Result<u32, ProgramError> {
    read_u32(data, COUNT_OFFSET)
}

fn write_count(data: &mut [u8], count: usize) -> ProgramResult {
    let count = u32::try_from(count).map_err(|_| ProgramError::InvalidAccountData)?;
    write_u32(data, COUNT_OFFSET, count)
}

fn read_u32(data: &[u8], offset: usize) -> Result<u32, ProgramError> {
    let bytes = data
        .get(offset..offset + 4)
        .ok_or(ProgramError::AccountDataTooSmall)?;
    Ok(u32::from_le_bytes(bytes.try_into().unwrap()))
}

fn write_u32(data: &mut [u8], offset: usize, value: u32) -> ProgramResult {
    let bytes = data
        .get_mut(offset..offset + 4)
        .ok_or(ProgramError::AccountDataTooSmall)?;
    bytes.copy_from_slice(&value.to_le_bytes());
    Ok(())
}

fn read_u64(data: &[u8], offset: usize) -> Result<u64, ProgramError> {
    let bytes = data
        .get(offset..offset + 8)
        .ok_or(ProgramError::AccountDataTooSmall)?;
    Ok(u64::from_le_bytes(bytes.try_into().unwrap()))
}

fn read_hash(data: &[u8], offset: usize) -> Result<[u8; HASH_LEN], ProgramError> {
    let bytes = data
        .get(offset..offset + HASH_LEN)
        .ok_or(ProgramError::AccountDataTooSmall)?;
    let mut value = [0u8; HASH_LEN];
    value.copy_from_slice(bytes);
    Ok(value)
}

fn write_u64(data: &mut [u8], offset: usize, value: u64) -> ProgramResult {
    let bytes = data
        .get_mut(offset..offset + 8)
        .ok_or(ProgramError::AccountDataTooSmall)?;
    bytes.copy_from_slice(&value.to_le_bytes());
    Ok(())
}

/// Emit minimal UnshieldEvent for indexer consumption (privacy-first: only cryptographic anchors).
/// Shape identical for SOL and SPL (per design doc §11 + VANTA_ZK_REVIEW U2.1).
/// Indexer correlates via on-chain SystemProgram transfer log (or Token transfer) for amount/asset.
/// For ShieldEvent (future TAG_SHIELD complement): { commitment, leaf_index: u32, root }.
/// Uses msg! prefix parsable by private-pool-v2-indexer (vanta-onchain-state.mjs etc.).
/// No asset/amount/dest in event body (preserves "as private as possible").
fn emit_unshield_event(nullifier: &[u8; 32], root: &[u8; 32]) {
    // Structured msg! logs for indexer consumption (private-pool-v2-indexer via vanta-onchain-state.mjs etc.).
    // Privacy-first: only cryptographic anchors (nullifier, root). Amount/asset/dest visible via SystemProgram transfer log (unavoidable for native SOL, same as SPL Token transfer).
    // Uses Pubkey base58 for easy test/Crucible log parsing of the 32-byte values.
    // Cross-ref: design doc §11 "Event Emission", VANTA_ZK_REVIEW U2.1, success criteria (indexer ingests ShieldEvent/UnshieldEvent).
    // For future TAG_SHIELD complement: emit_shield_event(commitment, leaf_index, root).
    msg!("VANTA2_UNSHIELD_EVENT");
    msg!("nullifier: {}", Pubkey::new_from_array(*nullifier));
    msg!("root: {}", Pubkey::new_from_array(*root));
    msg!("asset_kind:SOL|sentinel:true|program_owned_pda:true"); // hint for SOL path
    msg!("vanta_private_pool_v2_spend: UnshieldEvent emitted (nullifier+root only; see design doc §11 for SOL boundary)");
}

/// process_unshield for TAG_UNSHIELD = 6 (native SOL support first-class)
/// Per authoritative references:
/// - Design doc (2026-05-14-native-sol-private-pool-v2-integration.md) §11 data model, Phase 4, Native SOL + TAG6 Readiness Checklist
/// - Status note (2026-05-14-native-sol-v2-integration-status.md): immediate priority on on-chain TAG6 SOL foundation
/// - VANTA_ZK_REVIEW.md U2.1: PDA seeds, VAULT_ASSET_KIND_SOL=2, system CPI logic, sentinel usage, no operator keypair
///
/// Generalized preflights for asset_kind (SOL=2 + SPL=1), sentinel validation (zero bypass),
/// SOL vault PDA derivation (["vanta2solvault", pool, sentinel]), system_program CPI branch,
/// nullifier consumption (reusing marker logic), minimal UnshieldEvent emission (via emit_unshield_event).
/// Proof verification + tree recent_roots + full Groth16 + vault registry are stubs (fail-closed ERR_UNSHIELD_NOT_WIRED).
/// "as private as possible": program-owned PDA custody, PDA-signed system::transfer CPI, on-chain proof gate.
/// Account list for the unified reserved proof path (SPL + native SOL TAG6):
/// 0.pool_state 1.root_history 2.root_record 3.nullifier_marker
/// 4.vault_authority (SPL) or sol_vault_holding (SOL) 5.vault_asset
/// 6.vault_token_account (SPL) or sol_vault_holding slot (SOL)
/// 7.destination_token_account (SPL) or destination system account (SOL)
/// 8.mint (SPL) or system_program (SOL) 9.token_program (SPL) or system_program (SOL)
/// 10.verifier_key 11.verifier_program 12.relayer 13.system_program
/// Uses explicit SOL_VAULT_SEED + sentinel derivation in the unified reserved proof path.
fn process_unshield(program_id: &Pubkey, accounts: &[AccountInfo], rest: &[u8]) -> ProgramResult {
    if rest.len() + 1 != UNSHIELD_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let verified = preflight_unshield_release(program_id, accounts, rest)?;
    let verifier_program = unshield_verifier_program_account(accounts)?;
    verify_unshield_with_proof_adapter(&verified, verifier_program)?;
    commit_verified_unshield_release(program_id, accounts, &verified)
}

fn invoke_sol_vault_transfer_reserved<'a>(
    pool_state: &AccountInfo<'a>,
    sol_vault_holding: &AccountInfo<'a>,
    destination: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    exit_amount: u64,
    bump: u8,
) -> ProgramResult {
    let transfer_ix =
        system_instruction::transfer(sol_vault_holding.key, destination.key, exit_amount);
    invoke_signed(
        &transfer_ix,
        &[
            sol_vault_holding.clone(),
            destination.clone(),
            system_program_info.clone(),
        ],
        &[&[
            SOL_VAULT_SEED,
            pool_state.key.as_ref(),
            &NATIVE_SOL_ASSET_ID_SENTINEL,
            &[bump],
        ]],
    )
}

#[allow(dead_code)]
fn invoke_spl_vault_transfer_checked_reserved<'a>(
    program_id: &Pubkey,
    pool_state: &AccountInfo<'a>,
    vault_token_account: &AccountInfo<'a>,
    mint: &AccountInfo<'a>,
    destination_token_account: &AccountInfo<'a>,
    vault_authority: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    exit_asset_id: [u8; HASH_LEN],
    exit_amount: u64,
    decimals: u8,
) -> ProgramResult {
    let (expected_authority, vault_bump) = Pubkey::find_program_address(
        &[
            VAULT_AUTHORITY_SEED,
            pool_state.key.as_ref(),
            &exit_asset_id,
        ],
        program_id,
    );
    if *vault_authority.key != expected_authority {
        return Err(ProgramError::Custom(ERR_VAULT_AUTHORITY_MISMATCH));
    }

    let transfer_ix = spl_token::instruction::transfer_checked(
        token_program.key,
        vault_token_account.key,
        mint.key,
        destination_token_account.key,
        vault_authority.key,
        &[],
        exit_amount,
        decimals,
    )?;

    invoke_signed(
        &transfer_ix,
        &[
            vault_token_account.clone(),
            mint.clone(),
            destination_token_account.clone(),
            vault_authority.clone(),
            token_program.clone(),
        ],
        &[&[
            VAULT_AUTHORITY_SEED,
            pool_state.key.as_ref(),
            &exit_asset_id,
            &[vault_bump],
        ]],
    )
}

fn unshield_verifier_program_account<'a, 'b>(
    accounts: &'a [AccountInfo<'b>],
) -> Result<&'a AccountInfo<'b>, ProgramError> {
    accounts
        .get(UNSHIELD_VERIFIER_PROGRAM_ACCOUNT_INDEX)
        .ok_or(ProgramError::NotEnoughAccountKeys)
}

fn preflight_unshield_release(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> Result<VerifiedUnshieldPreflight, ProgramError> {
    if rest.len() + 1 != UNSHIELD_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let nullifier = &rest[0..HASH_LEN];
    let accepted_root =
        &rest[UNSHIELD_ACCEPTED_ROOT_OFFSET..UNSHIELD_ACCEPTED_ROOT_OFFSET + HASH_LEN];
    let exit_destination =
        &rest[UNSHIELD_EXIT_DESTINATION_OFFSET..UNSHIELD_EXIT_DESTINATION_OFFSET + HASH_LEN];
    let exit_asset_id =
        &rest[UNSHIELD_EXIT_ASSET_ID_OFFSET..UNSHIELD_EXIT_ASSET_ID_OFFSET + HASH_LEN];
    let exit_amount = read_u64(rest, UNSHIELD_EXIT_AMOUNT_OFFSET)?;
    let public_input_hash =
        &rest[UNSHIELD_PUBLIC_INPUT_HASH_OFFSET..UNSHIELD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN];
    let verifier_key_hash =
        &rest[UNSHIELD_VERIFIER_KEY_HASH_OFFSET..UNSHIELD_VERIFIER_KEY_HASH_OFFSET + HASH_LEN];
    let gnark_proof = &rest[UNSHIELD_PROOF_OFFSET..UNSHIELD_PUBLIC_WITNESS_OFFSET];
    let gnark_public_witness = &rest[UNSHIELD_PUBLIC_WITNESS_OFFSET
        ..UNSHIELD_PUBLIC_WITNESS_OFFSET + UNSHIELD_GNARK_PUBLIC_WITNESS_LEN];
    let exit_asset_id_array: [u8; HASH_LEN] = exit_asset_id
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    let is_native_sol = exit_asset_id_array == NATIVE_SOL_ASSET_ID_SENTINEL;

    if is_zero_hash(nullifier)
        || is_zero_hash(accepted_root)
        || is_zero_hash(exit_destination)
        || (!is_native_sol && is_zero_hash(&exit_asset_id_array))
        || exit_amount == 0
        || is_zero_hash(public_input_hash)
        || is_zero_hash(verifier_key_hash)
        || gnark_proof.iter().all(|byte| *byte == 0)
        || gnark_public_witness.iter().all(|byte| *byte == 0)
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let root_history = next_account_info(&mut account_iter)?;
    let root_record = next_account_info(&mut account_iter)?;
    let nullifier_marker = next_account_info(&mut account_iter)?;
    let vault_authority = next_account_info(&mut account_iter)?;
    let vault_asset = next_account_info(&mut account_iter)?;
    let vault_token_account = next_account_info(&mut account_iter)?;
    let destination_token_account = next_account_info(&mut account_iter)?;
    let mint = next_account_info(&mut account_iter)?;
    let token_program = next_account_info(&mut account_iter)?;
    let verifier_key = next_account_info(&mut account_iter)?;
    let verifier_program = next_account_info(&mut account_iter)?;
    let relayer = next_account_info(&mut account_iter)?;
    let system_program_info = next_account_info(&mut account_iter)?;

    require_readonly_program_account(program_id, pool_state)?;
    require_readonly_program_account(program_id, root_history)?;
    require_readonly_program_account(program_id, root_record)?;
    require_writable_account(nullifier_marker)?;
    require_readonly_program_account(program_id, vault_asset)?;
    require_readonly_program_account(program_id, verifier_key)?;
    require_spend_with_proof_verifier_program(program_id, verifier_program)?;
    if !relayer.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }
    require_system_program(system_program_info)?;

    let pool_data = pool_state.try_borrow_data()?;
    let root_data = root_history.try_borrow_data()?;
    require_pool_header(&pool_data)?;
    require_pool_root_history_binding(&pool_data, root_history)?;
    require_fixed_slot_header(&root_data, ROOT_MAGIC, HASH_LEN)?;
    if !fixed_slot_contains(&root_data, HASH_LEN, accepted_root)? {
        return Err(ProgramError::Custom(ERR_UNKNOWN_ACCEPTED_ROOT));
    }
    require_root_record(program_id, pool_state, root_record, accepted_root)?;
    require_nullifier_marker_available(program_id, pool_state, nullifier_marker, nullifier)?;

    let asset_kind =
        require_vault_asset_record(program_id, pool_state, vault_asset, &exit_asset_id_array)?;
    let mut sol_vault_bump = 0u8;
    if asset_kind == VAULT_ASSET_KIND_SOL {
        if exit_asset_id_array != NATIVE_SOL_ASSET_ID_SENTINEL {
            return Err(ProgramError::Custom(ERR_SENTINEL_ASSET_ID_MISMATCH));
        }
        sol_vault_bump = require_sol_vault_pda(program_id, pool_state, vault_authority)?;
        require_registered_sol_vault_asset(
            program_id,
            pool_state,
            vault_asset,
            vault_authority,
        )?;
        require_sol_release_accounts(
            vault_authority,
            vault_token_account,
            destination_token_account,
            mint,
            token_program,
            exit_destination,
        )?;
    } else if asset_kind == VAULT_ASSET_KIND_SPL {
        require_vault_authority(program_id, pool_state, vault_authority, exit_asset_id)?;
        let asset_data = vault_asset.try_borrow_data()?;
        require_spl_release_accounts(
            &asset_data,
            vault_token_account,
            destination_token_account,
            mint,
            token_program,
            vault_authority,
            exit_destination,
        )?;
    } else {
        return Err(ProgramError::Custom(ERR_INVALID_ASSET_KIND));
    }

    require_verifier_key_hash_for_program(
        program_id,
        pool_state,
        verifier_key,
        verifier_key_hash,
        verifier_program.key,
    )?;
    require_pool_verifier_wired(&pool_data, ERR_UNSHIELD_NOT_WIRED)?;

    let mut verified = VerifiedUnshieldPreflight {
        nullifier: [0u8; HASH_LEN],
        accepted_root: [0u8; HASH_LEN],
        exit_destination: [0u8; HASH_LEN],
        exit_asset_id: [0u8; HASH_LEN],
        exit_amount: 0,
        public_input_hash: [0u8; HASH_LEN],
        verifier_key_hash: [0u8; HASH_LEN],
        verifier_program_id: *verifier_program.key,
        gnark_proof: [0u8; UNSHIELD_GNARK_PROOF_LEN],
        gnark_public_witness: [0u8; UNSHIELD_GNARK_PUBLIC_WITNESS_LEN],
        asset_kind,
        sol_vault_bump,
    };
    verified.nullifier.copy_from_slice(nullifier);
    verified.accepted_root.copy_from_slice(accepted_root);
    verified.exit_destination.copy_from_slice(exit_destination);
    verified.exit_asset_id.copy_from_slice(exit_asset_id);
    verified.exit_amount = exit_amount;
    verified
        .public_input_hash
        .copy_from_slice(public_input_hash);
    verified
        .verifier_key_hash
        .copy_from_slice(verifier_key_hash);
    verified.gnark_proof.copy_from_slice(gnark_proof);
    verified
        .gnark_public_witness
        .copy_from_slice(gnark_public_witness);
    Ok(verified)
}

fn verify_shield_with_proof_adapter(
    verified: &VerifiedShieldPreflight,
    verifier_program: &AccountInfo,
) -> ProgramResult {
    if is_zero_hash(&verified.output_commitment)
        || is_zero_hash(&verified.public_input_hash)
        || is_zero_hash(&verified.verifier_key_hash)
        || verified.gnark_proof.iter().all(|byte| *byte == 0)
        || verified.gnark_public_witness.iter().all(|byte| *byte == 0)
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    require_shield_public_witness_binding(verified)?;
    let verifier_cpi_instruction = shield_verifier_cpi_instruction(verified);

    #[cfg(target_os = "solana")]
    {
        invoke_signed(&verifier_cpi_instruction, &[verifier_program.clone()], &[])?;
        Ok(())
    }

    #[cfg(not(target_os = "solana"))]
    {
        let _ = verifier_program;
        let _ = verifier_cpi_instruction;
        Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
    }
}

fn shield_verifier_cpi_instruction(verified: &VerifiedShieldPreflight) -> Instruction {
    Instruction {
        program_id: verified.verifier_program_id,
        accounts: Vec::new(),
        data: verified.verifier_instruction_data().to_vec(),
    }
}

fn require_shield_public_witness_binding(verified: &VerifiedShieldPreflight) -> ProgramResult {
    if verified.gnark_public_witness[..GNARK_PUBLIC_WITNESS_HEADER_LEN]
        != GNARK_PUBLIC_WITNESS_ONE_PUBLIC_INPUT_HEADER[..]
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    if verified.gnark_public_witness
        [GNARK_PUBLIC_WITNESS_VALUE_OFFSET..GNARK_PUBLIC_WITNESS_VALUE_OFFSET + HASH_LEN]
        != verified.public_input_hash
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    Ok(())
}

fn verify_unshield_with_proof_adapter(
    verified: &VerifiedUnshieldPreflight,
    verifier_program: &AccountInfo,
) -> ProgramResult {
    if is_zero_hash(&verified.verifier_key_hash)
        || verified.gnark_proof.iter().all(|byte| *byte == 0)
        || verified.gnark_public_witness.iter().all(|byte| *byte == 0)
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    require_unshield_public_witness_binding(verified)?;
    let verifier_cpi_instruction = unshield_verifier_cpi_instruction(verified);

    #[cfg(target_os = "solana")]
    {
        invoke_signed(&verifier_cpi_instruction, &[verifier_program.clone()], &[])?;
        Ok(())
    }

    #[cfg(not(target_os = "solana"))]
    {
        let _ = verifier_program;
        let _ = verifier_cpi_instruction;
        Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
    }
}

fn unshield_verifier_cpi_instruction(verified: &VerifiedUnshieldPreflight) -> Instruction {
    Instruction {
        program_id: verified.verifier_program_id,
        accounts: Vec::new(),
        data: verified.verifier_instruction_data().to_vec(),
    }
}

fn require_unshield_public_witness_binding(
    verified: &VerifiedUnshieldPreflight,
) -> ProgramResult {
    if verified.gnark_public_witness[..GNARK_PUBLIC_WITNESS_HEADER_LEN]
        != GNARK_PUBLIC_WITNESS_ONE_PUBLIC_INPUT_HEADER[..]
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    if verified.gnark_public_witness
        [GNARK_PUBLIC_WITNESS_VALUE_OFFSET..GNARK_PUBLIC_WITNESS_VALUE_OFFSET + HASH_LEN]
        != verified.public_input_hash
    {
        return Err(ProgramError::InvalidInstructionData);
    }
    Ok(())
}

fn commit_verified_unshield_release(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    verified: &VerifiedUnshieldPreflight,
) -> ProgramResult {
    let pool_state = accounts
        .first()
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    let nullifier_marker = accounts
        .get(3)
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    let vault_authority = accounts
        .get(4)
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    let vault_asset = accounts
        .get(5)
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    let vault_token_account = accounts
        .get(6)
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    let destination_token_account = accounts
        .get(7)
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    let mint = accounts.get(8).ok_or(ProgramError::NotEnoughAccountKeys)?;
    let token_program = accounts
        .get(9)
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    let relayer = accounts
        .get(UNSHIELD_RELAYER_ACCOUNT_INDEX)
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    let system_program_info = accounts
        .get(UNSHIELD_SYSTEM_PROGRAM_ACCOUNT_INDEX)
        .ok_or(ProgramError::NotEnoughAccountKeys)?;

    let pool_data = pool_state.try_borrow_data()?;
    require_pool_verifier_wired(&pool_data, ERR_UNSHIELD_NOT_WIRED)?;

    let asset_data = vault_asset.try_borrow_data()?;
    if asset_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] != 1 {
        return Err(ProgramError::Custom(ERR_UNSHIELD_NOT_WIRED));
    }

    ensure_nullifier_marker(
        program_id,
        pool_state,
        nullifier_marker,
        relayer,
        system_program_info,
        &verified.nullifier,
    )?;

    if verified.asset_kind == VAULT_ASSET_KIND_SOL {
        if verified.exit_asset_id != NATIVE_SOL_ASSET_ID_SENTINEL {
            return Err(ProgramError::Custom(ERR_SENTINEL_ASSET_ID_MISMATCH));
        }
        invoke_sol_vault_transfer_reserved(
            pool_state,
            vault_authority,
            destination_token_account,
            system_program_info,
            verified.exit_amount,
            verified.sol_vault_bump,
        )?;
        emit_unshield_event(&verified.nullifier, &verified.accepted_root);
        msg!(
            "vanta_private_pool_v2_spend: accepted proof-verified unshield release evidence for native SOL sentinel asset"
        );
        return Ok(());
    }

    if verified.asset_kind != VAULT_ASSET_KIND_SPL {
        return Err(ProgramError::Custom(ERR_INVALID_ASSET_KIND));
    }

    let decimals = read_mint_decimals(mint)?;
    invoke_spl_vault_transfer_checked_reserved(
        program_id,
        pool_state,
        vault_token_account,
        mint,
        destination_token_account,
        vault_authority,
        token_program,
        verified.exit_asset_id,
        verified.exit_amount,
        decimals,
    )?;

    emit_unshield_event(&verified.nullifier, &verified.accepted_root);
    msg!(
        "vanta_private_pool_v2_spend: accepted proof-verified unshield release evidence for SPL asset"
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::clock::Epoch;

    fn gnark_public_witness_for(
        public_input_hash: &[u8; HASH_LEN],
    ) -> [u8; SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN] {
        let mut public_witness = [0u8; SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN];
        public_witness[..GNARK_PUBLIC_WITNESS_HEADER_LEN]
            .copy_from_slice(&GNARK_PUBLIC_WITNESS_ONE_PUBLIC_INPUT_HEADER);
        public_witness
            [GNARK_PUBLIC_WITNESS_VALUE_OFFSET..GNARK_PUBLIC_WITNESS_VALUE_OFFSET + HASH_LEN]
            .copy_from_slice(public_input_hash);
        public_witness
    }

    fn sol_unshield_reserved_instruction_data(
        nullifier: [u8; HASH_LEN],
        accepted_root: [u8; HASH_LEN],
        exit_destination: [u8; HASH_LEN],
        exit_asset_id: [u8; HASH_LEN],
        exit_amount: u64,
        public_input_hash: [u8; HASH_LEN],
        verifier_key_hash: [u8; HASH_LEN],
    ) -> Vec<u8> {
        let mut data = vec![TAG_UNSHIELD];
        data.extend_from_slice(&nullifier);
        data.extend_from_slice(&accepted_root);
        data.extend_from_slice(&exit_destination);
        data.extend_from_slice(&exit_asset_id);
        data.extend_from_slice(&exit_amount.to_le_bytes());
        data.extend_from_slice(&public_input_hash);
        data.extend_from_slice(&verifier_key_hash);
        data.extend_from_slice(&[8u8; UNSHIELD_GNARK_PROOF_LEN]);
        data.extend_from_slice(&gnark_public_witness_for(&public_input_hash));
        data
    }

    struct SolUnshieldReservedProcessObservation {
        result: ProgramResult,
        marker_lamports: u64,
        marker_data: Vec<u8>,
        vault_lamports: u64,
        dest_lamports: u64,
    }

    fn run_sol_unshield_reserved_process(
        verifier_wired: u8,
        exit_asset_id: [u8; HASH_LEN],
        asset_kind: u8,
        sol_vault_account: Option<Pubkey>,
        nullifier: [u8; HASH_LEN],
        exit_amount: u64,
        public_input_hash: [u8; HASH_LEN],
    ) -> ProgramResult {
        run_sol_unshield_reserved_process_with_observation(
            verifier_wired,
            exit_asset_id,
            asset_kind,
            sol_vault_account,
            nullifier,
            exit_amount,
            public_input_hash,
        )
        .result
    }

    fn run_sol_unshield_reserved_process_with_observation(
        verifier_wired: u8,
        exit_asset_id: [u8; HASH_LEN],
        asset_kind: u8,
        sol_vault_account: Option<Pubkey>,
        nullifier: [u8; HASH_LEN],
        exit_amount: u64,
        public_input_hash: [u8; HASH_LEN],
    ) -> SolUnshieldReservedProcessObservation {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let destination = Pubkey::new_unique();
        let relayer = Pubkey::new_unique();
        let verifier_program_id = Pubkey::new_unique();
        let accepted_root = [2u8; HASH_LEN];
        let verifier_key_hash = [6u8; HASH_LEN];
        let exit_destination = destination.to_bytes();
        let (expected_sol_vault, _) = sol_vault_pda(&program_id, &pool_state);
        let sol_vault_account = sol_vault_account.unwrap_or(expected_sol_vault);
        let (vault_asset_record, _) =
            vault_asset_record_pda(&program_id, &pool_state, &exit_asset_id);
        let root_record = root_record_pubkey(&program_id, &pool_state, &accepted_root);
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &nullifier);
        let verifier_key = verifier_key_pubkey(&program_id, &pool_state, &verifier_key_hash);

        let mut pool_lamports = 1_000_000u64;
        let mut root_lamports = 1_000_000u64;
        let mut root_record_lamports = 1_000_000u64;
        let mut marker_lamports = 0u64;
        let mut asset_rec_lamports = 1_000_000u64;
        let mut vault_lamports = 1_000_000u64;
        let mut vault_slot_lamports = 1_000_000u64;
        let mut dest_lamports = 1_000_000u64;
        let mut mint_lamports = 1_000_000u64;
        let mut token_program_lamports = 1_000_000u64;
        let mut verifier_key_lamports = 1_000_000u64;
        let mut verifier_program_lamports = 1_000_000u64;
        let mut relayer_lamports = 2_000_000u64;
        let mut system_lamports = 1_000_000u64;

        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        pool_data[POOL_ROOT_HISTORY_OFFSET..POOL_ROOT_HISTORY_OFFSET + HASH_LEN]
            .copy_from_slice(root_history.as_ref());
        pool_data[POOL_VERIFIER_WIRED_OFFSET] = verifier_wired;

        let mut root_data = vec![0u8; HEADER_LEN + HASH_LEN];
        root_data[..8].copy_from_slice(ROOT_MAGIC);
        root_data[8] = VERSION;
        write_count(&mut root_data, 1).unwrap();
        write_hash_slot(&mut root_data, 0, HASH_LEN, &accepted_root).unwrap();

        let mut root_record_data = vec![0u8; ROOT_RECORD_ACCOUNT_LEN];
        root_record_data[..8].copy_from_slice(ROOT_RECORD_MAGIC);
        root_record_data[8] = VERSION;
        write_count(&mut root_record_data, 1).unwrap();
        write_u32(&mut root_record_data, ROOT_RECORD_LEAF_COUNT_OFFSET, 1).unwrap();
        root_record_data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        root_record_data
            [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN]
            .copy_from_slice(&accepted_root);

        let mut asset_rec_data = vec![0u8; VAULT_ASSET_ACCOUNT_LEN];
        write_sol_vault_asset_record_data(
            &mut asset_rec_data,
            &pool_state,
            &exit_asset_id,
            &expected_sol_vault,
            asset_kind,
        );

        let mut verifier_key_data = vec![0u8; VERIFIER_KEY_ACCOUNT_LEN];
        verifier_key_data[..8].copy_from_slice(VERIFIER_KEY_MAGIC);
        verifier_key_data[8] = VERSION;
        write_count(&mut verifier_key_data, 1).unwrap();
        verifier_key_data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        verifier_key_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
            .copy_from_slice(&verifier_key_hash);
        verifier_key_data[VERIFIER_KEY_PROGRAM_ID_OFFSET..VERIFIER_KEY_PROGRAM_ID_OFFSET + HASH_LEN]
            .copy_from_slice(verifier_program_id.as_ref());

        let mut pool_data_buf = pool_data;
        let mut root_data_buf = root_data;
        let mut root_record_data_buf = root_record_data;
        let mut marker_data: Vec<u8> = vec![];
        let mut asset_rec_data_buf = asset_rec_data;
        let mut vault_data: Vec<u8> = vec![];
        let mut vault_slot_data: Vec<u8> = vec![];
        let mut dest_data: Vec<u8> = vec![];
        let mut mint_data: Vec<u8> = vec![];
        let mut token_program_data: Vec<u8> = vec![];
        let mut verifier_key_data_buf = verifier_key_data;
        let mut verifier_program_data: Vec<u8> = vec![];
        let mut relayer_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data_buf,
        );
        let roots = account_info(
            &root_history,
            &program_id,
            false,
            false,
            &mut root_lamports,
            &mut root_data_buf,
        );
        let root_rec = account_info(
            &root_record,
            &program_id,
            false,
            false,
            &mut root_record_lamports,
            &mut root_record_data_buf,
        );
        let marker = account_info(
            &nullifier_marker,
            &system_program::ID,
            true,
            false,
            &mut marker_lamports,
            &mut marker_data,
        );
        let vault = account_info(
            &sol_vault_account,
            &program_id,
            true,
            false,
            &mut vault_lamports,
            &mut vault_data,
        );
        let asset_rec = account_info(
            &vault_asset_record,
            &program_id,
            false,
            false,
            &mut asset_rec_lamports,
            &mut asset_rec_data_buf,
        );
        let vault_slot = account_info(
            &sol_vault_account,
            &program_id,
            true,
            false,
            &mut vault_slot_lamports,
            &mut vault_slot_data,
        );
        let dest = account_info(
            &destination,
            &system_program::ID,
            true,
            false,
            &mut dest_lamports,
            &mut dest_data,
        );
        let mint = account_info(
            &system_program::ID,
            &system_program::ID,
            false,
            false,
            &mut mint_lamports,
            &mut mint_data,
        );
        let token_program = account_info(
            &system_program::ID,
            &system_program::ID,
            false,
            false,
            &mut token_program_lamports,
            &mut token_program_data,
        );
        let vkey = account_info(
            &verifier_key,
            &program_id,
            false,
            false,
            &mut verifier_key_lamports,
            &mut verifier_key_data_buf,
        );
        let vprogram = executable_account_info(
            &verifier_program_id,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let relayer_info = account_info(
            &relayer,
            &system_program::ID,
            true,
            true,
            &mut relayer_lamports,
            &mut relayer_data,
        );
        let system = account_info(
            &system_program::ID,
            &system_program::ID,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );

        let accounts = vec![
            pool, roots, root_rec, marker, vault, asset_rec, vault_slot, dest, mint,
            token_program, vkey, vprogram, relayer_info, system,
        ];
        let data = sol_unshield_reserved_instruction_data(
            nullifier,
            accepted_root,
            exit_destination,
            exit_asset_id,
            exit_amount,
            public_input_hash,
            verifier_key_hash,
        );

        let result = process_instruction(&program_id, &accounts, &data);
        drop(accounts);

        SolUnshieldReservedProcessObservation {
            result,
            marker_lamports,
            marker_data,
            vault_lamports,
            dest_lamports,
        }
    }

    #[test]
    fn spend_rejects_signer_that_is_not_the_initialized_authority() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let tree_state = Pubkey::new_unique();
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &[1; HASH_LEN]);
        let output_record = output_record_pubkey(&program_id, &pool_state, &[5; HASH_LEN]);
        let system_program_id = system_program::ID;
        let authority = Pubkey::new_unique();
        let impostor = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut output_record_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut tree_lamports = 1_000_000;
        let mut marker_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut impostor_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut output_record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut tree_data = vec![0; TREE_STATE_LEN];
        let mut marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut signer_data = [];
        let mut system_data = [];

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                true,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                true,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let tree = account_info(
                &tree_state,
                &program_id,
                true,
                false,
                &mut tree_lamports,
                &mut tree_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                false,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, tree, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Ok(())
            );
        }

        let before = (
            pool_data.clone(),
            nullifier_data.clone(),
            output_data.clone(),
            output_record_data.clone(),
            root_data.clone(),
            marker_data.clone(),
        );

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                false,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let marker = account_info(
                &nullifier_marker,
                &program_id,
                true,
                false,
                &mut marker_lamports,
                &mut marker_data,
            );
            let record = account_info(
                &output_record,
                &program_id,
                true,
                false,
                &mut output_record_lamports,
                &mut output_record_data,
            );
            let impostor_info = account_info(
                &impostor,
                &program_id,
                true,
                true,
                &mut impostor_lamports,
                &mut signer_data,
            );
            let system_info = account_info(
                &system_program_id,
                &system_program_id,
                false,
                false,
                &mut system_lamports,
                &mut system_data,
            );
            let accounts = vec![
                pool,
                nullifier,
                output,
                roots,
                marker,
                record,
                impostor_info,
                system_info,
            ];

            assert_eq!(
                process_instruction(&program_id, &accounts, &spend_instruction()),
                Err(ProgramError::Custom(ERR_UNAUTHORIZED_OPERATOR))
            );
        }

        assert_eq!(
            before,
            (
                pool_data,
                nullifier_data,
                output_data,
                output_record_data,
                root_data,
                marker_data
            )
        );
    }

    #[test]
    fn init_rejects_reinitialization_without_mutating_state() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let tree_state = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut tree_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut tree_data = vec![0; TREE_STATE_LEN];
        let mut signer_data = [];

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                true,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                true,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let tree = account_info(
                &tree_state,
                &program_id,
                true,
                false,
                &mut tree_lamports,
                &mut tree_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                false,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, tree, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Ok(())
            );
        }

        let before = (
            pool_data.clone(),
            nullifier_data.clone(),
            output_data.clone(),
            root_data.clone(),
            tree_data.clone(),
        );

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                true,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                true,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let tree = account_info(
                &tree_state,
                &program_id,
                true,
                false,
                &mut tree_lamports,
                &mut tree_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                false,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, tree, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Err(ProgramError::Custom(ERR_ALREADY_INITIALIZED))
            );
        }

        assert_eq!(
            before,
            (pool_data, nullifier_data, output_data, root_data, tree_data)
        );
    }

    #[test]
    fn spend_rejects_mixed_account_triplets() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let wrong_nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let tree_state = Pubkey::new_unique();
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &[1; HASH_LEN]);
        let output_record = output_record_pubkey(&program_id, &pool_state, &[5; HASH_LEN]);
        let system_program_id = system_program::ID;
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut wrong_nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut output_record_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut tree_lamports = 1_000_000;
        let mut marker_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut wrong_nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut output_record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut tree_data = vec![0; TREE_STATE_LEN];
        let mut marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut signer_data = [];
        let mut system_data = [];

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                true,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                true,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let tree = account_info(
                &tree_state,
                &program_id,
                true,
                false,
                &mut tree_lamports,
                &mut tree_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                false,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, tree, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Ok(())
            );
        }
        wrong_nullifier_data.copy_from_slice(&nullifier_data);

        let before = (
            pool_data.clone(),
            wrong_nullifier_data.clone(),
            output_data.clone(),
            output_record_data.clone(),
            root_data.clone(),
            marker_data.clone(),
        );

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let wrong_nullifier = account_info(
                &wrong_nullifier_set,
                &program_id,
                false,
                false,
                &mut wrong_nullifier_lamports,
                &mut wrong_nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let marker = account_info(
                &nullifier_marker,
                &program_id,
                true,
                false,
                &mut marker_lamports,
                &mut marker_data,
            );
            let record = account_info(
                &output_record,
                &program_id,
                true,
                false,
                &mut output_record_lamports,
                &mut output_record_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let system_info = account_info(
                &system_program_id,
                &system_program_id,
                false,
                false,
                &mut system_lamports,
                &mut system_data,
            );
            let accounts = vec![
                pool,
                wrong_nullifier,
                output,
                roots,
                marker,
                record,
                authority_info,
                system_info,
            ];

            assert_eq!(
                process_instruction(&program_id, &accounts, &spend_instruction()),
                Err(ProgramError::Custom(ERR_POOL_ACCOUNT_MISMATCH))
            );
        }

        assert_eq!(
            before,
            (
                pool_data,
                wrong_nullifier_data,
                output_data,
                output_record_data,
                root_data,
                marker_data
            )
        );
    }

    #[test]
    fn spend_requires_registered_accepted_root() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let tree_state = Pubkey::new_unique();
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &[1; HASH_LEN]);
        let output_record = output_record_pubkey(&program_id, &pool_state, &[5; HASH_LEN]);
        let duplicate_output_marker =
            nullifier_marker_pubkey(&program_id, &pool_state, &[9; HASH_LEN]);
        let wrong_output_record = Pubkey::new_unique();
        let system_program_id = system_program::ID;
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut output_record_lamports = 1_000_000;
        let mut wrong_output_record_lamports = 1_000_000;
        let mut duplicate_output_marker_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut tree_lamports = 1_000_000;
        let mut marker_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut output_record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut wrong_output_record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut tree_data = vec![0; TREE_STATE_LEN];
        let mut marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut duplicate_output_marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut signer_data = [];
        let mut system_data = [];

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                true,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                true,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let tree = account_info(
                &tree_state,
                &program_id,
                true,
                false,
                &mut tree_lamports,
                &mut tree_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                false,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, tree, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Ok(())
            );
        }

        let before = (
            pool_data.clone(),
            nullifier_data.clone(),
            output_data.clone(),
            output_record_data.clone(),
            root_data.clone(),
            marker_data.clone(),
        );

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                false,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let marker = account_info(
                &nullifier_marker,
                &program_id,
                true,
                false,
                &mut marker_lamports,
                &mut marker_data,
            );
            let record = account_info(
                &output_record,
                &program_id,
                true,
                false,
                &mut output_record_lamports,
                &mut output_record_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let system_info = account_info(
                &system_program_id,
                &system_program_id,
                false,
                false,
                &mut system_lamports,
                &mut system_data,
            );
            let accounts = vec![
                pool,
                nullifier,
                output,
                roots,
                marker,
                record,
                authority_info,
                system_info,
            ];

            assert_eq!(
                process_instruction(&program_id, &accounts, &spend_instruction()),
                Err(ProgramError::Custom(ERR_UNKNOWN_ACCEPTED_ROOT))
            );
        }

        assert_eq!(
            before,
            (
                pool_data.clone(),
                nullifier_data.clone(),
                output_data.clone(),
                output_record_data.clone(),
                root_data.clone(),
                marker_data.clone()
            )
        );

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                false,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                true,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                false,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, roots, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &register_root_instruction()),
                Ok(())
            );
        }

        let before_bad_record = (
            pool_data.clone(),
            nullifier_data.clone(),
            output_data.clone(),
            output_record_data.clone(),
            wrong_output_record_data.clone(),
            root_data.clone(),
            marker_data.clone(),
        );
        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                false,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let marker = account_info(
                &nullifier_marker,
                &program_id,
                true,
                false,
                &mut marker_lamports,
                &mut marker_data,
            );
            let record = account_info(
                &wrong_output_record,
                &program_id,
                true,
                false,
                &mut wrong_output_record_lamports,
                &mut wrong_output_record_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let system_info = account_info(
                &system_program_id,
                &system_program_id,
                false,
                false,
                &mut system_lamports,
                &mut system_data,
            );
            let accounts = vec![
                pool,
                nullifier,
                output,
                roots,
                marker,
                record,
                authority_info,
                system_info,
            ];

            assert_eq!(
                process_instruction(&program_id, &accounts, &spend_instruction()),
                Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH))
            );
        }
        assert_eq!(
            before_bad_record,
            (
                pool_data.clone(),
                nullifier_data.clone(),
                output_data.clone(),
                output_record_data.clone(),
                wrong_output_record_data.clone(),
                root_data.clone(),
                marker_data.clone()
            )
        );

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                false,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let marker = account_info(
                &nullifier_marker,
                &program_id,
                true,
                false,
                &mut marker_lamports,
                &mut marker_data,
            );
            let record = account_info(
                &output_record,
                &program_id,
                true,
                false,
                &mut output_record_lamports,
                &mut output_record_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let system_info = account_info(
                &system_program_id,
                &system_program_id,
                false,
                false,
                &mut system_lamports,
                &mut system_data,
            );
            let accounts = vec![
                pool,
                nullifier,
                output,
                roots,
                marker,
                record,
                authority_info,
                system_info,
            ];

            assert_eq!(
                process_instruction(&program_id, &accounts, &spend_instruction()),
                Ok(())
            );
        }

        assert_eq!(read_u64(&pool_data, POOL_SPEND_COUNT_OFFSET), Ok(1));
        assert_eq!(read_count(&nullifier_data), Ok(0));
        assert_eq!(read_count(&output_data), Ok(1));
        assert_eq!(read_count(&root_data), Ok(1));
        assert_eq!(&marker_data[..8], NULLIFIER_MARKER_MAGIC);
        assert_eq!(&output_record_data[..8], OUTPUT_RECORD_MAGIC);
        assert_eq!(
            read_u64(&output_record_data, OUTPUT_RECORD_INDEX_OFFSET),
            Ok(0)
        );
        assert_eq!(
            &marker_data
                [NULLIFIER_MARKER_NULLIFIER_OFFSET..NULLIFIER_MARKER_NULLIFIER_OFFSET + HASH_LEN],
            &[1; HASH_LEN]
        );

        let before_duplicate_output_record = (
            pool_data.clone(),
            nullifier_data.clone(),
            output_data.clone(),
            output_record_data.clone(),
            root_data.clone(),
            duplicate_output_marker_data.clone(),
        );
        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                false,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let marker = account_info(
                &duplicate_output_marker,
                &program_id,
                true,
                false,
                &mut duplicate_output_marker_lamports,
                &mut duplicate_output_marker_data,
            );
            let record = account_info(
                &output_record,
                &program_id,
                true,
                false,
                &mut output_record_lamports,
                &mut output_record_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let system_info = account_info(
                &system_program_id,
                &system_program_id,
                false,
                false,
                &mut system_lamports,
                &mut system_data,
            );
            let accounts = vec![
                pool,
                nullifier,
                output,
                roots,
                marker,
                record,
                authority_info,
                system_info,
            ];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &spend_instruction_with(
                        [9; HASH_LEN],
                        [8; HASH_LEN],
                        [7; HASH_LEN],
                        [4; HASH_LEN],
                        [5; HASH_LEN]
                    ),
                ),
                Err(ProgramError::Custom(ERR_OUTPUT_RECORD_MISMATCH))
            );
        }
        assert_eq!(
            before_duplicate_output_record,
            (
                pool_data.clone(),
                nullifier_data.clone(),
                output_data.clone(),
                output_record_data.clone(),
                root_data.clone(),
                duplicate_output_marker_data.clone()
            )
        );

        let before_duplicate = (
            pool_data.clone(),
            nullifier_data.clone(),
            output_data.clone(),
            output_record_data.clone(),
            root_data.clone(),
            marker_data.clone(),
        );
        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let nullifier = account_info(
                &nullifier_set,
                &program_id,
                false,
                false,
                &mut nullifier_lamports,
                &mut nullifier_data,
            );
            let output = account_info(
                &output_queue,
                &program_id,
                true,
                false,
                &mut output_lamports,
                &mut output_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let marker = account_info(
                &nullifier_marker,
                &program_id,
                true,
                false,
                &mut marker_lamports,
                &mut marker_data,
            );
            let record = account_info(
                &output_record,
                &program_id,
                true,
                false,
                &mut output_record_lamports,
                &mut output_record_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let system_info = account_info(
                &system_program_id,
                &system_program_id,
                false,
                false,
                &mut system_lamports,
                &mut system_data,
            );
            let accounts = vec![
                pool,
                nullifier,
                output,
                roots,
                marker,
                record,
                authority_info,
                system_info,
            ];

            assert_eq!(
                process_instruction(&program_id, &accounts, &spend_instruction()),
                Err(ProgramError::Custom(ERR_DUPLICATE_NULLIFIER))
            );
        }

        assert_eq!(
            before_duplicate,
            (
                pool_data,
                nullifier_data,
                output_data,
                output_record_data,
                root_data,
                marker_data
            )
        );
    }

    #[test]
    fn root_record_validation_rejects_malformed_metadata() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let accepted_root = [4u8; HASH_LEN];
        let root_record = root_record_pubkey(&program_id, &pool_state, &accepted_root);
        let mut pool_lamports = 1u64;
        let mut root_record_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut root_record_data = vec![0u8; ROOT_RECORD_ACCOUNT_LEN];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        root_record_data[..8].copy_from_slice(ROOT_RECORD_MAGIC);
        root_record_data[8] = VERSION;
        write_count(&mut root_record_data, 1).unwrap();
        root_record_data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        root_record_data
            [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN]
            .copy_from_slice(&accepted_root);

        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let record = account_info(
            &root_record,
            &program_id,
            false,
            false,
            &mut root_record_lamports,
            &mut root_record_data,
        );

        assert_eq!(
            require_root_record(&program_id, &pool, &record, &accepted_root),
            Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH))
        );
    }

    #[test]
    fn provenanced_root_registration_requires_root_history_lineage() {
        let mut root_data = vec![0u8; HEADER_LEN + HASH_LEN * 2];
        root_data[..8].copy_from_slice(ROOT_MAGIC);
        root_data[8] = VERSION;
        write_count(&mut root_data, 1).unwrap();
        write_hash_slot(&mut root_data, 0, HASH_LEN, &[7u8; HASH_LEN]).unwrap();

        assert_eq!(
            require_previous_root_matches_history(&root_data, &[9u8; HASH_LEN]),
            Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH))
        );
    }

    #[test]
    fn proof_carrying_spend_preflights_accounts_before_fail_closed_verifier() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let nullifier = [1u8; HASH_LEN];
        let output0 = [2u8; HASH_LEN];
        let output1 = [3u8; HASH_LEN];
        let accepted_root = [4u8; HASH_LEN];
        let public_input_hash = [5u8; HASH_LEN];
        let verifier_key_hash = [6u8; HASH_LEN];
        let verifier_program = Pubkey::new_unique();
        let root_record = root_record_pubkey(&program_id, &pool_state, &accepted_root);
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &nullifier);
        let output_record = output_record_pubkey(&program_id, &pool_state, &public_input_hash);
        let verifier_key = verifier_key_pubkey(&program_id, &pool_state, &verifier_key_hash);
        let authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;

        let mut pool_lamports = 1u64;
        let mut nullifier_lamports = 1u64;
        let mut output_lamports = 1u64;
        let mut root_lamports = 1u64;
        let mut root_record_lamports = 1u64;
        let mut marker_lamports = 0u64;
        let mut output_record_lamports = 0u64;
        let mut verifier_key_lamports = 1u64;
        let mut verifier_program_lamports = 1u64;
        let mut authority_lamports = 1u64;
        let mut system_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut nullifier_data = vec![0u8; HEADER_LEN + HASH_LEN];
        let mut output_data = vec![0u8; HEADER_LEN];
        let mut root_data = vec![0u8; HEADER_LEN + HASH_LEN];
        let mut root_record_data = vec![0u8; ROOT_RECORD_ACCOUNT_LEN];
        let mut marker_data: Vec<u8> = vec![];
        let mut output_record_data: Vec<u8> = vec![];
        let mut verifier_key_data = vec![0u8; VERIFIER_KEY_ACCOUNT_LEN];
        let mut verifier_program_data: Vec<u8> = vec![];
        let mut authority_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        pool_data[POOL_NULLIFIER_SET_OFFSET..POOL_NULLIFIER_SET_OFFSET + HASH_LEN]
            .copy_from_slice(nullifier_set.as_ref());
        pool_data[POOL_OUTPUT_QUEUE_OFFSET..POOL_OUTPUT_QUEUE_OFFSET + HASH_LEN]
            .copy_from_slice(output_queue.as_ref());
        pool_data[POOL_ROOT_HISTORY_OFFSET..POOL_ROOT_HISTORY_OFFSET + HASH_LEN]
            .copy_from_slice(root_history.as_ref());
        nullifier_data[..8].copy_from_slice(NULLIFIER_MAGIC);
        nullifier_data[8] = VERSION;
        output_data[..8].copy_from_slice(OUTPUT_MAGIC);
        output_data[8] = VERSION;
        root_data[..8].copy_from_slice(ROOT_MAGIC);
        root_data[8] = VERSION;
        write_count(&mut root_data, 1).unwrap();
        write_hash_slot(&mut root_data, 0, HASH_LEN, &accepted_root).unwrap();

        let root_record_slice = root_record_data.as_mut_slice();
        root_record_slice[..8].copy_from_slice(ROOT_RECORD_MAGIC);
        root_record_slice[8] = VERSION;
        write_count(root_record_slice, 1).unwrap();
        write_u32(root_record_slice, ROOT_RECORD_LEAF_COUNT_OFFSET, 1).unwrap();
        root_record_slice[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        root_record_slice
            [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN]
            .copy_from_slice(&accepted_root);
        verifier_key_data[..8].copy_from_slice(VERIFIER_KEY_MAGIC);
        verifier_key_data[8] = VERSION;
        write_count(&mut verifier_key_data, 1).unwrap();
        verifier_key_data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        verifier_key_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
            .copy_from_slice(&verifier_key_hash);
        verifier_key_data
            [VERIFIER_KEY_PROGRAM_ID_OFFSET..VERIFIER_KEY_PROGRAM_ID_OFFSET + HASH_LEN]
            .copy_from_slice(verifier_program.as_ref());

        let pool = account_info(
            &pool_state,
            &program_id,
            true,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let nulls = account_info(
            &nullifier_set,
            &program_id,
            false,
            false,
            &mut nullifier_lamports,
            &mut nullifier_data,
        );
        let output = account_info(
            &output_queue,
            &program_id,
            true,
            false,
            &mut output_lamports,
            &mut output_data,
        );
        let roots = account_info(
            &root_history,
            &program_id,
            false,
            false,
            &mut root_lamports,
            &mut root_data,
        );
        let root_rec = account_info(
            &root_record,
            &program_id,
            false,
            false,
            &mut root_record_lamports,
            &mut root_record_data,
        );
        let marker = account_info(
            &nullifier_marker,
            &system_program::ID,
            true,
            false,
            &mut marker_lamports,
            &mut marker_data,
        );
        let out_rec = account_info(
            &output_record,
            &system_program::ID,
            true,
            false,
            &mut output_record_lamports,
            &mut output_record_data,
        );
        let vkey = account_info(
            &verifier_key,
            &program_id,
            false,
            false,
            &mut verifier_key_lamports,
            &mut verifier_key_data,
        );
        let vprogram = executable_account_info(
            &verifier_program,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let auth = account_info(
            &authority,
            &system_program::ID,
            true,
            true,
            &mut authority_lamports,
            &mut authority_data,
        );
        let system = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );
        let accounts = vec![
            pool, nulls, output, roots, root_rec, marker, out_rec, vkey, vprogram, auth, system,
        ];
        let mut data = vec![TAG_SPEND_WITH_PROOF];
        data.extend_from_slice(&nullifier);
        data.extend_from_slice(&output0);
        data.extend_from_slice(&output1);
        data.extend_from_slice(&accepted_root);
        data.extend_from_slice(&public_input_hash);
        data.extend_from_slice(&verifier_key_hash);
        data.extend_from_slice(&[8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN]);
        data.extend_from_slice(&gnark_public_witness_for(&public_input_hash));

        let pool_before = accounts[0].try_borrow_data().unwrap().to_vec();
        let output_before = accounts[2].try_borrow_data().unwrap().to_vec();
        let marker_before = accounts[5].try_borrow_data().unwrap().to_vec();
        let output_record_before = accounts[6].try_borrow_data().unwrap().to_vec();
        let verifier_key_before = accounts[7].try_borrow_data().unwrap().to_vec();
        let marker_lamports_before = accounts[5].lamports();
        let output_record_lamports_before = accounts[6].lamports();
        let authority_lamports_before = accounts[9].lamports();

        assert_eq!(
            process_instruction(&program_id, &accounts, &data),
            Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
        );
        assert_eq!(
            accounts[0].try_borrow_data().unwrap().as_ref(),
            pool_before.as_slice()
        );
        assert_eq!(
            accounts[2].try_borrow_data().unwrap().as_ref(),
            output_before.as_slice()
        );
        assert_eq!(
            accounts[5].try_borrow_data().unwrap().as_ref(),
            marker_before.as_slice()
        );
        assert_eq!(
            accounts[6].try_borrow_data().unwrap().as_ref(),
            output_record_before.as_slice()
        );
        assert_eq!(
            accounts[7].try_borrow_data().unwrap().as_ref(),
            verifier_key_before.as_slice()
        );
        assert_eq!(accounts[5].lamports(), marker_lamports_before);
        assert_eq!(accounts[6].lamports(), output_record_lamports_before);
        assert_eq!(accounts[9].lamports(), authority_lamports_before);
    }

    #[test]
    fn proof_carrying_spend_rejects_duplicate_nullifier_before_fail_closed_verifier() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier = [1u8; HASH_LEN];
        let marker_key = nullifier_marker_pubkey(&program_id, &pool_state, &nullifier);
        let mut marker_lamports = 1u64;
        let mut marker_data = vec![0u8; NULLIFIER_MARKER_LEN];
        let mut pool_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        write_nullifier_marker(&mut marker_data, &pool, &nullifier).unwrap();
        let marker = account_info(
            &marker_key,
            &program_id,
            true,
            false,
            &mut marker_lamports,
            &mut marker_data,
        );

        assert_eq!(
            require_nullifier_marker_available(&program_id, &pool, &marker, &nullifier),
            Err(ProgramError::Custom(ERR_DUPLICATE_NULLIFIER))
        );
    }

    #[test]
    fn verified_spend_commit_mutates_only_after_adapter_acceptance() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier = [1u8; HASH_LEN];
        let output0 = [2u8; HASH_LEN];
        let output1 = [3u8; HASH_LEN];
        let public_input_hash = [5u8; HASH_LEN];
        let verifier_key_hash = [6u8; HASH_LEN];
        let output_queue = Pubkey::new_unique();
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &nullifier);
        let output_record = output_record_pubkey(&program_id, &pool_state, &public_input_hash);
        let authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;

        let mut pool_lamports = 1u64;
        let mut output_lamports = 1u64;
        let mut marker_lamports = 0u64;
        let mut output_record_lamports = 0u64;
        let mut authority_lamports = 1u64;
        let mut system_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut output_data = vec![0u8; HEADER_LEN];
        let mut marker_data = vec![0u8; NULLIFIER_MARKER_LEN];
        let mut output_record_data = vec![0u8; OUTPUT_RECORD_PDA_LEN];
        let mut authority_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        output_data[..8].copy_from_slice(OUTPUT_MAGIC);
        output_data[8] = VERSION;

        let pool = account_info(
            &pool_state,
            &program_id,
            true,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let output = account_info(
            &output_queue,
            &program_id,
            true,
            false,
            &mut output_lamports,
            &mut output_data,
        );
        let marker = account_info(
            &nullifier_marker,
            &program_id,
            true,
            false,
            &mut marker_lamports,
            &mut marker_data,
        );
        let out_rec = account_info(
            &output_record,
            &program_id,
            true,
            false,
            &mut output_record_lamports,
            &mut output_record_data,
        );
        let auth = account_info(
            &authority,
            &system_program::ID,
            true,
            true,
            &mut authority_lamports,
            &mut authority_data,
        );
        let system = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );
        let verified = VerifiedSpendPreflight {
            nullifier,
            output0,
            output1,
            public_input_hash,
            verifier_key_hash,
            verifier_program_id: Pubkey::new_unique(),
            gnark_proof: [8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN],
            gnark_public_witness: [9u8; SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN],
            output_index: 0,
        };

        assert_eq!(
            commit_verified_spend(
                &program_id,
                &pool,
                &output,
                &marker,
                &out_rec,
                &auth,
                &system,
                &verified,
            ),
            Ok(())
        );
        assert_eq!(read_u64(&pool_data, POOL_SPEND_COUNT_OFFSET).unwrap(), 1);
        assert_eq!(read_count(&output_data).unwrap(), 1);
        assert_eq!(
            &pool_data
                [POOL_LAST_PUBLIC_INPUT_HASH_OFFSET..POOL_LAST_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
            &public_input_hash
        );
        assert_eq!(&marker_data[..8], NULLIFIER_MARKER_MAGIC);
        assert_eq!(&output_record_data[..8], OUTPUT_RECORD_MAGIC);
        assert_eq!(
            &output_record_data[OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET
                ..OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
            &public_input_hash
        );
    }

    fn selected_gnark_fixture_adapter_accepts(
        verified: &VerifiedSpendPreflight,
        expected_public_input_hash: &[u8; HASH_LEN],
        expected_verifier_key_hash: &[u8; HASH_LEN],
    ) -> ProgramResult {
        if verified.gnark_proof != [8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN]
            || &verified.public_input_hash != expected_public_input_hash
        {
            return Err(ProgramError::InvalidInstructionData);
        }
        require_spend_with_proof_public_witness_binding(verified)?;
        if &verified.verifier_key_hash != expected_verifier_key_hash {
            return Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH));
        }
        Ok(())
    }

    fn commit_after_selected_gnark_fixture_adapter<'a>(
        program_id: &Pubkey,
        pool_state: &AccountInfo<'a>,
        output_queue: &AccountInfo<'a>,
        nullifier_marker: &AccountInfo<'a>,
        output_record: &AccountInfo<'a>,
        authority: &AccountInfo<'a>,
        system_program_info: &AccountInfo<'a>,
        verified: &VerifiedSpendPreflight,
        expected_public_input_hash: &[u8; HASH_LEN],
        expected_verifier_key_hash: &[u8; HASH_LEN],
    ) -> ProgramResult {
        selected_gnark_fixture_adapter_accepts(
            verified,
            expected_public_input_hash,
            expected_verifier_key_hash,
        )?;
        commit_verified_spend(
            program_id,
            pool_state,
            output_queue,
            nullifier_marker,
            output_record,
            authority,
            system_program_info,
            verified,
        )
    }

    fn assert_selected_gnark_fixture_adapter_case(
        proof_byte: u8,
        public_witness_mode: u8,
        verified_public_input_hash: [u8; HASH_LEN],
        verified_verifier_key_hash: [u8; HASH_LEN],
        expected_public_input_hash: [u8; HASH_LEN],
        expected_verifier_key_hash: [u8; HASH_LEN],
        expected_result: ProgramResult,
        expect_mutation: bool,
    ) {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier = [1u8; HASH_LEN];
        let output0 = [2u8; HASH_LEN];
        let output1 = [3u8; HASH_LEN];
        let output_queue = Pubkey::new_unique();
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &nullifier);
        let output_record =
            output_record_pubkey(&program_id, &pool_state, &verified_public_input_hash);
        let authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;

        let mut pool_lamports = 1u64;
        let mut output_lamports = 1u64;
        let mut marker_lamports = 0u64;
        let mut output_record_lamports = 0u64;
        let mut authority_lamports = 1u64;
        let mut system_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut output_data = vec![0u8; HEADER_LEN];
        let mut marker_data = vec![0u8; NULLIFIER_MARKER_LEN];
        let mut output_record_data = vec![0u8; OUTPUT_RECORD_PDA_LEN];
        let mut authority_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        output_data[..8].copy_from_slice(OUTPUT_MAGIC);
        output_data[8] = VERSION;

        let pool = account_info(
            &pool_state,
            &program_id,
            true,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let output = account_info(
            &output_queue,
            &program_id,
            true,
            false,
            &mut output_lamports,
            &mut output_data,
        );
        let marker = account_info(
            &nullifier_marker,
            &program_id,
            true,
            false,
            &mut marker_lamports,
            &mut marker_data,
        );
        let out_rec = account_info(
            &output_record,
            &program_id,
            true,
            false,
            &mut output_record_lamports,
            &mut output_record_data,
        );
        let auth = account_info(
            &authority,
            &system_program::ID,
            true,
            true,
            &mut authority_lamports,
            &mut authority_data,
        );
        let system = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );
        let mut gnark_public_witness = gnark_public_witness_for(&verified_public_input_hash);
        if public_witness_mode != 0 {
            gnark_public_witness = [public_witness_mode; SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN];
        }
        let verified = VerifiedSpendPreflight {
            nullifier,
            output0,
            output1,
            public_input_hash: verified_public_input_hash,
            verifier_key_hash: verified_verifier_key_hash,
            verifier_program_id: Pubkey::new_unique(),
            gnark_proof: [proof_byte; SPEND_WITH_PROOF_GNARK_PROOF_LEN],
            gnark_public_witness,
            output_index: 0,
        };

        let before = (
            pool.try_borrow_data().unwrap().to_vec(),
            output.try_borrow_data().unwrap().to_vec(),
            marker.try_borrow_data().unwrap().to_vec(),
            out_rec.try_borrow_data().unwrap().to_vec(),
            marker.lamports(),
            out_rec.lamports(),
        );

        let result = commit_after_selected_gnark_fixture_adapter(
            &program_id,
            &pool,
            &output,
            &marker,
            &out_rec,
            &auth,
            &system,
            &verified,
            &expected_public_input_hash,
            &expected_verifier_key_hash,
        );

        assert_eq!(result, expected_result);
        if expect_mutation {
            let pool_after = pool.try_borrow_data().unwrap();
            let output_after = output.try_borrow_data().unwrap();
            let marker_after = marker.try_borrow_data().unwrap();
            let output_record_after = out_rec.try_borrow_data().unwrap();
            assert_eq!(read_u64(&pool_after, POOL_SPEND_COUNT_OFFSET).unwrap(), 1);
            assert_eq!(read_count(&output_after).unwrap(), 1);
            assert_eq!(
                &pool_after[POOL_LAST_PUBLIC_INPUT_HASH_OFFSET
                    ..POOL_LAST_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
                &verified_public_input_hash
            );
            assert_eq!(&marker_after[..8], NULLIFIER_MARKER_MAGIC);
            assert_eq!(&output_record_after[..8], OUTPUT_RECORD_MAGIC);
            assert_eq!(
                &output_record_after[OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET
                    ..OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
                &verified_public_input_hash
            );
        } else {
            assert_eq!(
                pool.try_borrow_data().unwrap().as_ref(),
                before.0.as_slice()
            );
            assert_eq!(
                output.try_borrow_data().unwrap().as_ref(),
                before.1.as_slice()
            );
            assert_eq!(
                marker.try_borrow_data().unwrap().as_ref(),
                before.2.as_slice()
            );
            assert_eq!(
                out_rec.try_borrow_data().unwrap().as_ref(),
                before.3.as_slice()
            );
            assert_eq!(marker.lamports(), before.4);
            assert_eq!(out_rec.lamports(), before.5);
        }
    }

    #[test]
    fn selected_gnark_fixture_adapter_valid_proof_mutates_state() {
        assert_selected_gnark_fixture_adapter_case(
            8,
            0,
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            Ok(()),
            true,
        );
    }

    #[test]
    fn selected_gnark_fixture_adapter_invalid_proof_no_mutation() {
        assert_selected_gnark_fixture_adapter_case(
            10,
            0,
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            Err(ProgramError::InvalidInstructionData),
            false,
        );
    }

    #[test]
    fn selected_gnark_fixture_adapter_wrong_public_input_no_mutation() {
        assert_selected_gnark_fixture_adapter_case(
            8,
            0,
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            [7u8; HASH_LEN],
            [6u8; HASH_LEN],
            Err(ProgramError::InvalidInstructionData),
            false,
        );
    }

    #[test]
    fn selected_gnark_fixture_adapter_wrong_verifying_key_no_mutation() {
        assert_selected_gnark_fixture_adapter_case(
            8,
            0,
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            [5u8; HASH_LEN],
            [7u8; HASH_LEN],
            Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH)),
            false,
        );
    }

    #[test]
    fn proof_carrying_spend_commit_capable_account_list_mutates_after_fixture_adapter_acceptance() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let nullifier = [1u8; HASH_LEN];
        let output0 = [2u8; HASH_LEN];
        let output1 = [3u8; HASH_LEN];
        let accepted_root = [4u8; HASH_LEN];
        let public_input_hash = [5u8; HASH_LEN];
        let verifier_key_hash = [6u8; HASH_LEN];
        let verifier_program = Pubkey::new_unique();
        let root_record = root_record_pubkey(&program_id, &pool_state, &accepted_root);
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &nullifier);
        let output_record = output_record_pubkey(&program_id, &pool_state, &public_input_hash);
        let verifier_key = verifier_key_pubkey(&program_id, &pool_state, &verifier_key_hash);
        let authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;

        let mut pool_lamports = 1u64;
        let mut nullifier_lamports = 1u64;
        let mut output_lamports = 1u64;
        let mut root_lamports = 1u64;
        let mut root_record_lamports = 1u64;
        let mut marker_lamports = 0u64;
        let mut output_record_lamports = 0u64;
        let mut verifier_key_lamports = 1u64;
        let mut verifier_program_lamports = 1u64;
        let mut authority_lamports = 1u64;
        let mut system_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut nullifier_data = vec![0u8; HEADER_LEN + HASH_LEN];
        let mut output_data = vec![0u8; HEADER_LEN];
        let mut root_data = vec![0u8; HEADER_LEN + HASH_LEN];
        let mut root_record_data = vec![0u8; ROOT_RECORD_ACCOUNT_LEN];
        let mut marker_data = vec![0u8; NULLIFIER_MARKER_LEN];
        let mut output_record_data = vec![0u8; OUTPUT_RECORD_PDA_LEN];
        let mut verifier_key_data = vec![0u8; VERIFIER_KEY_ACCOUNT_LEN];
        let mut verifier_program_data: Vec<u8> = vec![];
        let mut authority_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        pool_data[POOL_NULLIFIER_SET_OFFSET..POOL_NULLIFIER_SET_OFFSET + HASH_LEN]
            .copy_from_slice(nullifier_set.as_ref());
        pool_data[POOL_OUTPUT_QUEUE_OFFSET..POOL_OUTPUT_QUEUE_OFFSET + HASH_LEN]
            .copy_from_slice(output_queue.as_ref());
        pool_data[POOL_ROOT_HISTORY_OFFSET..POOL_ROOT_HISTORY_OFFSET + HASH_LEN]
            .copy_from_slice(root_history.as_ref());
        nullifier_data[..8].copy_from_slice(NULLIFIER_MAGIC);
        nullifier_data[8] = VERSION;
        output_data[..8].copy_from_slice(OUTPUT_MAGIC);
        output_data[8] = VERSION;
        root_data[..8].copy_from_slice(ROOT_MAGIC);
        root_data[8] = VERSION;
        write_count(&mut root_data, 1).unwrap();
        write_hash_slot(&mut root_data, 0, HASH_LEN, &accepted_root).unwrap();
        root_record_data[..8].copy_from_slice(ROOT_RECORD_MAGIC);
        root_record_data[8] = VERSION;
        write_count(&mut root_record_data, 1).unwrap();
        write_u32(&mut root_record_data, ROOT_RECORD_LEAF_COUNT_OFFSET, 1).unwrap();
        root_record_data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        root_record_data
            [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN]
            .copy_from_slice(&accepted_root);
        verifier_key_data[..8].copy_from_slice(VERIFIER_KEY_MAGIC);
        verifier_key_data[8] = VERSION;
        write_count(&mut verifier_key_data, 1).unwrap();
        verifier_key_data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        verifier_key_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
            .copy_from_slice(&verifier_key_hash);
        verifier_key_data
            [VERIFIER_KEY_PROGRAM_ID_OFFSET..VERIFIER_KEY_PROGRAM_ID_OFFSET + HASH_LEN]
            .copy_from_slice(verifier_program.as_ref());

        let pool = account_info(
            &pool_state,
            &program_id,
            true,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let nulls = account_info(
            &nullifier_set,
            &program_id,
            false,
            false,
            &mut nullifier_lamports,
            &mut nullifier_data,
        );
        let output = account_info(
            &output_queue,
            &program_id,
            true,
            false,
            &mut output_lamports,
            &mut output_data,
        );
        let roots = account_info(
            &root_history,
            &program_id,
            false,
            false,
            &mut root_lamports,
            &mut root_data,
        );
        let root_rec = account_info(
            &root_record,
            &program_id,
            false,
            false,
            &mut root_record_lamports,
            &mut root_record_data,
        );
        let marker = account_info(
            &nullifier_marker,
            &program_id,
            true,
            false,
            &mut marker_lamports,
            &mut marker_data,
        );
        let out_rec = account_info(
            &output_record,
            &program_id,
            true,
            false,
            &mut output_record_lamports,
            &mut output_record_data,
        );
        let vkey = account_info(
            &verifier_key,
            &program_id,
            false,
            false,
            &mut verifier_key_lamports,
            &mut verifier_key_data,
        );
        let vprogram = executable_account_info(
            &verifier_program,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let auth = account_info(
            &authority,
            &system_program::ID,
            true,
            true,
            &mut authority_lamports,
            &mut authority_data,
        );
        let system = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );
        let accounts = vec![
            pool, nulls, output, roots, root_rec, marker, out_rec, vkey, vprogram, auth, system,
        ];
        let mut data = vec![TAG_SPEND_WITH_PROOF];
        data.extend_from_slice(&nullifier);
        data.extend_from_slice(&output0);
        data.extend_from_slice(&output1);
        data.extend_from_slice(&accepted_root);
        data.extend_from_slice(&public_input_hash);
        data.extend_from_slice(&verifier_key_hash);
        data.extend_from_slice(&[8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN]);
        data.extend_from_slice(&gnark_public_witness_for(&public_input_hash));

        let verified = preflight_spend_with_proof(&program_id, &accounts, &data[1..]).unwrap();
        assert_eq!(verified.verifier_program_id, verifier_program);
        selected_gnark_fixture_adapter_accepts(&verified, &public_input_hash, &verifier_key_hash)
            .unwrap();
        assert_eq!(
            commit_verified_spend_from_spend_with_proof_accounts(&program_id, &accounts, &verified,),
            Ok(())
        );

        assert_eq!(read_u64(&pool_data, POOL_SPEND_COUNT_OFFSET).unwrap(), 1);
        assert_eq!(read_count(&output_data).unwrap(), 1);
        assert_eq!(
            &pool_data
                [POOL_LAST_PUBLIC_INPUT_HASH_OFFSET..POOL_LAST_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
            &public_input_hash
        );
        assert_eq!(&marker_data[..8], NULLIFIER_MARKER_MAGIC);
        assert_eq!(&output_record_data[..8], OUTPUT_RECORD_MAGIC);
        assert_eq!(
            &output_record_data[OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET
                ..OUTPUT_RECORD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
            &public_input_hash
        );
    }

    #[test]
    fn proof_carrying_spend_default_adapter_rejects_before_commit() {
        let verifier_program_id = Pubkey::new_unique();
        let mut verifier_program_lamports = 1u64;
        let mut verifier_program_data: Vec<u8> = vec![];
        let verifier_program = executable_account_info(
            &verifier_program_id,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let verified = VerifiedSpendPreflight {
            nullifier: [1u8; HASH_LEN],
            output0: [2u8; HASH_LEN],
            output1: [3u8; HASH_LEN],
            public_input_hash: [5u8; HASH_LEN],
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id,
            gnark_proof: [8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN],
            gnark_public_witness: gnark_public_witness_for(&[5u8; HASH_LEN]),
            output_index: 0,
        };

        assert_eq!(
            verify_spend_with_proof_adapter(&verified, &verifier_program),
            Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
        );
    }

    #[test]
    fn proof_carrying_spend_verifier_instruction_data_matches_gnark_tuple() {
        let public_input_hash = [5u8; HASH_LEN];
        let gnark_proof = [8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN];
        let gnark_public_witness = gnark_public_witness_for(&public_input_hash);
        let verified = VerifiedSpendPreflight {
            nullifier: [1u8; HASH_LEN],
            output0: [2u8; HASH_LEN],
            output1: [3u8; HASH_LEN],
            public_input_hash,
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id: Pubkey::new_unique(),
            gnark_proof,
            gnark_public_witness,
            output_index: 0,
        };

        let verifier_instruction_data = verified.verifier_instruction_data();
        assert_eq!(
            verifier_instruction_data.len(),
            SPEND_WITH_PROOF_VERIFIER_INPUT_LEN
        );
        assert_eq!(
            &verifier_instruction_data[..SPEND_WITH_PROOF_GNARK_PROOF_LEN],
            &gnark_proof
        );
        assert_eq!(
            &verifier_instruction_data[SPEND_WITH_PROOF_GNARK_PROOF_LEN..],
            &gnark_public_witness
        );
        assert_eq!(
            &verifier_instruction_data[SPEND_WITH_PROOF_GNARK_PROOF_LEN
                ..SPEND_WITH_PROOF_GNARK_PROOF_LEN + GNARK_PUBLIC_WITNESS_HEADER_LEN],
            &GNARK_PUBLIC_WITNESS_ONE_PUBLIC_INPUT_HEADER
        );
        assert_eq!(
            &verifier_instruction_data
                [SPEND_WITH_PROOF_GNARK_PROOF_LEN + GNARK_PUBLIC_WITNESS_VALUE_OFFSET..],
            &public_input_hash
        );
    }

    #[test]
    fn proof_carrying_spend_verifier_cpi_instruction_matches_generated_solana_verifier_shape() {
        let public_input_hash = [5u8; HASH_LEN];
        let verifier_program = Pubkey::new_unique();
        let gnark_proof = [8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN];
        let gnark_public_witness = gnark_public_witness_for(&public_input_hash);
        let verified = VerifiedSpendPreflight {
            nullifier: [1u8; HASH_LEN],
            output0: [2u8; HASH_LEN],
            output1: [3u8; HASH_LEN],
            public_input_hash,
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id: verifier_program,
            gnark_proof,
            gnark_public_witness,
            output_index: 0,
        };

        let verifier_cpi_instruction = spend_with_proof_verifier_cpi_instruction(&verified);
        assert_eq!(verifier_cpi_instruction.program_id, verifier_program);
        assert_eq!(verifier_cpi_instruction.accounts.len(), 0);
        assert_eq!(
            verifier_cpi_instruction.data.len(),
            SPEND_WITH_PROOF_VERIFIER_INPUT_LEN
        );
        assert_eq!(
            &verifier_cpi_instruction.data[..SPEND_WITH_PROOF_GNARK_PROOF_LEN],
            &gnark_proof
        );
        assert_eq!(
            &verifier_cpi_instruction.data[SPEND_WITH_PROOF_GNARK_PROOF_LEN..],
            &gnark_public_witness
        );
    }

    #[test]
    fn proof_carrying_spend_requires_readonly_executable_verifier_program_account() {
        let spend_program_id = Pubkey::new_unique();
        let verifier_program = Pubkey::new_unique();
        let mut lamports = 1u64;
        let mut data: Vec<u8> = vec![];
        let executable = executable_account_info(&verifier_program, &mut lamports, &mut data);
        assert_eq!(
            require_spend_with_proof_verifier_program(&spend_program_id, &executable),
            Ok(())
        );

        let mut same_program_lamports = 1u64;
        let mut same_program_data: Vec<u8> = vec![];
        let same_program = executable_account_info(
            &spend_program_id,
            &mut same_program_lamports,
            &mut same_program_data,
        );
        assert_eq!(
            require_spend_with_proof_verifier_program(&spend_program_id, &same_program),
            Err(ProgramError::IncorrectProgramId)
        );

        let mut non_executable_lamports = 1u64;
        let mut non_executable_data: Vec<u8> = vec![];
        let non_executable = account_info(
            &verifier_program,
            &system_program::ID,
            false,
            false,
            &mut non_executable_lamports,
            &mut non_executable_data,
        );
        assert_eq!(
            require_spend_with_proof_verifier_program(&spend_program_id, &non_executable),
            Err(ProgramError::IncorrectProgramId)
        );

        let mut writable_lamports = 1u64;
        let mut writable_data: Vec<u8> = vec![];
        let writable = executable_account_info_with_flags(
            &verifier_program,
            true,
            false,
            &mut writable_lamports,
            &mut writable_data,
        );
        assert_eq!(
            require_spend_with_proof_verifier_program(&spend_program_id, &writable),
            Err(ProgramError::InvalidAccountData)
        );

        let mut signer_lamports = 1u64;
        let mut signer_data: Vec<u8> = vec![];
        let signer = executable_account_info_with_flags(
            &verifier_program,
            false,
            true,
            &mut signer_lamports,
            &mut signer_data,
        );
        assert_eq!(
            require_spend_with_proof_verifier_program(&spend_program_id, &signer),
            Err(ProgramError::InvalidAccountData)
        );
    }

    #[test]
    fn proof_carrying_spend_rejects_wrong_registered_verifier_program_before_not_wired() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let nullifier = [1u8; HASH_LEN];
        let output0 = [2u8; HASH_LEN];
        let output1 = [3u8; HASH_LEN];
        let accepted_root = [4u8; HASH_LEN];
        let public_input_hash = [5u8; HASH_LEN];
        let verifier_key_hash = [6u8; HASH_LEN];
        let registered_verifier_program = Pubkey::new_unique();
        let supplied_verifier_program = Pubkey::new_unique();
        let root_record = root_record_pubkey(&program_id, &pool_state, &accepted_root);
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &nullifier);
        let output_record = output_record_pubkey(&program_id, &pool_state, &public_input_hash);
        let verifier_key = verifier_key_pubkey(&program_id, &pool_state, &verifier_key_hash);
        let authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;

        let mut pool_lamports = 1u64;
        let mut nullifier_lamports = 1u64;
        let mut output_lamports = 1u64;
        let mut root_lamports = 1u64;
        let mut root_record_lamports = 1u64;
        let mut marker_lamports = 0u64;
        let mut output_record_lamports = 0u64;
        let mut verifier_key_lamports = 1u64;
        let mut verifier_program_lamports = 1u64;
        let mut authority_lamports = 1u64;
        let mut system_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut nullifier_data = vec![0u8; HEADER_LEN + HASH_LEN];
        let mut output_data = vec![0u8; HEADER_LEN];
        let mut root_data = vec![0u8; HEADER_LEN + HASH_LEN];
        let mut root_record_data = vec![0u8; ROOT_RECORD_ACCOUNT_LEN];
        let mut marker_data: Vec<u8> = vec![];
        let mut output_record_data: Vec<u8> = vec![];
        let verifier_program_offset = VERIFIER_KEY_HASH_OFFSET + HASH_LEN;
        let mut verifier_key_data = vec![0u8; verifier_program_offset + HASH_LEN];
        let mut verifier_program_data: Vec<u8> = vec![];
        let mut authority_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        pool_data[POOL_NULLIFIER_SET_OFFSET..POOL_NULLIFIER_SET_OFFSET + HASH_LEN]
            .copy_from_slice(nullifier_set.as_ref());
        pool_data[POOL_OUTPUT_QUEUE_OFFSET..POOL_OUTPUT_QUEUE_OFFSET + HASH_LEN]
            .copy_from_slice(output_queue.as_ref());
        pool_data[POOL_ROOT_HISTORY_OFFSET..POOL_ROOT_HISTORY_OFFSET + HASH_LEN]
            .copy_from_slice(root_history.as_ref());
        nullifier_data[..8].copy_from_slice(NULLIFIER_MAGIC);
        nullifier_data[8] = VERSION;
        output_data[..8].copy_from_slice(OUTPUT_MAGIC);
        output_data[8] = VERSION;
        root_data[..8].copy_from_slice(ROOT_MAGIC);
        root_data[8] = VERSION;
        write_count(&mut root_data, 1).unwrap();
        write_hash_slot(&mut root_data, 0, HASH_LEN, &accepted_root).unwrap();
        root_record_data[..8].copy_from_slice(ROOT_RECORD_MAGIC);
        root_record_data[8] = VERSION;
        write_count(&mut root_record_data, 1).unwrap();
        write_u32(&mut root_record_data, ROOT_RECORD_LEAF_COUNT_OFFSET, 1).unwrap();
        root_record_data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        root_record_data
            [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN]
            .copy_from_slice(&accepted_root);
        verifier_key_data[..8].copy_from_slice(VERIFIER_KEY_MAGIC);
        verifier_key_data[8] = VERSION;
        write_count(&mut verifier_key_data, 1).unwrap();
        verifier_key_data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        verifier_key_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
            .copy_from_slice(&verifier_key_hash);
        verifier_key_data[verifier_program_offset..verifier_program_offset + HASH_LEN]
            .copy_from_slice(registered_verifier_program.as_ref());

        let pool = account_info(
            &pool_state,
            &program_id,
            true,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let nulls = account_info(
            &nullifier_set,
            &program_id,
            false,
            false,
            &mut nullifier_lamports,
            &mut nullifier_data,
        );
        let output = account_info(
            &output_queue,
            &program_id,
            true,
            false,
            &mut output_lamports,
            &mut output_data,
        );
        let roots = account_info(
            &root_history,
            &program_id,
            false,
            false,
            &mut root_lamports,
            &mut root_data,
        );
        let root_rec = account_info(
            &root_record,
            &program_id,
            false,
            false,
            &mut root_record_lamports,
            &mut root_record_data,
        );
        let marker = account_info(
            &nullifier_marker,
            &system_program::ID,
            true,
            false,
            &mut marker_lamports,
            &mut marker_data,
        );
        let out_rec = account_info(
            &output_record,
            &system_program::ID,
            true,
            false,
            &mut output_record_lamports,
            &mut output_record_data,
        );
        let vkey = account_info(
            &verifier_key,
            &program_id,
            false,
            false,
            &mut verifier_key_lamports,
            &mut verifier_key_data,
        );
        let vprogram = executable_account_info(
            &supplied_verifier_program,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let auth = account_info(
            &authority,
            &system_program::ID,
            true,
            true,
            &mut authority_lamports,
            &mut authority_data,
        );
        let system = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );
        let accounts = vec![
            pool, nulls, output, roots, root_rec, marker, out_rec, vkey, vprogram, auth, system,
        ];
        let mut data = vec![TAG_SPEND_WITH_PROOF];
        data.extend_from_slice(&nullifier);
        data.extend_from_slice(&output0);
        data.extend_from_slice(&output1);
        data.extend_from_slice(&accepted_root);
        data.extend_from_slice(&public_input_hash);
        data.extend_from_slice(&verifier_key_hash);
        data.extend_from_slice(&[8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN]);
        data.extend_from_slice(&gnark_public_witness_for(&public_input_hash));

        let pool_before = accounts[0].try_borrow_data().unwrap().to_vec();
        let output_before = accounts[2].try_borrow_data().unwrap().to_vec();
        let marker_before = accounts[5].try_borrow_data().unwrap().to_vec();
        let output_record_before = accounts[6].try_borrow_data().unwrap().to_vec();

        assert_eq!(
            process_instruction(&program_id, &accounts, &data),
            Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH))
        );
        assert_eq!(
            accounts[0].try_borrow_data().unwrap().as_ref(),
            pool_before.as_slice()
        );
        assert_eq!(
            accounts[2].try_borrow_data().unwrap().as_ref(),
            output_before.as_slice()
        );
        assert_eq!(
            accounts[5].try_borrow_data().unwrap().as_ref(),
            marker_before.as_slice()
        );
        assert_eq!(
            accounts[6].try_borrow_data().unwrap().as_ref(),
            output_record_before.as_slice()
        );
    }

    #[test]
    fn proof_carrying_spend_public_witness_binding_rejects_wrong_hash_before_not_wired() {
        let mut wrong_public_witness = gnark_public_witness_for(&[7u8; HASH_LEN]);
        wrong_public_witness[SPEND_WITH_PROOF_GNARK_PUBLIC_WITNESS_LEN - 1] = 8;
        let verifier_program_id = Pubkey::new_unique();
        let mut verifier_program_lamports = 1u64;
        let mut verifier_program_data: Vec<u8> = vec![];
        let verifier_program = executable_account_info(
            &verifier_program_id,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let verified = VerifiedSpendPreflight {
            nullifier: [1u8; HASH_LEN],
            output0: [2u8; HASH_LEN],
            output1: [3u8; HASH_LEN],
            public_input_hash: [5u8; HASH_LEN],
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id,
            gnark_proof: [8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN],
            gnark_public_witness: wrong_public_witness,
            output_index: 0,
        };

        assert_eq!(
            verify_spend_with_proof_adapter(&verified, &verifier_program),
            Err(ProgramError::InvalidInstructionData)
        );
    }

    #[test]
    fn proof_carrying_spend_public_witness_binding_rejects_bad_header_before_not_wired() {
        let mut gnark_public_witness = gnark_public_witness_for(&[5u8; HASH_LEN]);
        gnark_public_witness[0] = 1;
        let verifier_program_id = Pubkey::new_unique();
        let mut verifier_program_lamports = 1u64;
        let mut verifier_program_data: Vec<u8> = vec![];
        let verifier_program = executable_account_info(
            &verifier_program_id,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let verified = VerifiedSpendPreflight {
            nullifier: [1u8; HASH_LEN],
            output0: [2u8; HASH_LEN],
            output1: [3u8; HASH_LEN],
            public_input_hash: [5u8; HASH_LEN],
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id,
            gnark_proof: [8u8; SPEND_WITH_PROOF_GNARK_PROOF_LEN],
            gnark_public_witness,
            output_index: 0,
        };

        assert_eq!(
            verify_spend_with_proof_adapter(&verified, &verifier_program),
            Err(ProgramError::InvalidInstructionData)
        );
    }

    #[test]
    fn proof_carrying_spend_rejects_legacy_256_byte_payload_shape() {
        let program_id = Pubkey::new_unique();
        let mut data = vec![TAG_SPEND_WITH_PROOF];
        data.extend_from_slice(&[1u8; HASH_LEN]);
        data.extend_from_slice(&[2u8; HASH_LEN]);
        data.extend_from_slice(&[3u8; HASH_LEN]);
        data.extend_from_slice(&[4u8; HASH_LEN]);
        data.extend_from_slice(&[5u8; HASH_LEN]);
        data.extend_from_slice(&[6u8; HASH_LEN]);
        data.extend_from_slice(&[8u8; RESERVED_GROTH16_PROOF_LEN]);

        assert_eq!(
            process_instruction(&program_id, &[], &data),
            Err(ProgramError::InvalidInstructionData)
        );
    }

    #[test]
    fn proof_carrying_unshield_rejects_legacy_457_byte_payload_shape() {
        let program_id = Pubkey::new_unique();
        let mut rest = Vec::new();
        rest.extend_from_slice(&[1u8; HASH_LEN]);
        rest.extend_from_slice(&[2u8; HASH_LEN]);
        rest.extend_from_slice(&[3u8; HASH_LEN]);
        rest.extend_from_slice(&[4u8; HASH_LEN]);
        rest.extend_from_slice(&1u64.to_le_bytes());
        rest.extend_from_slice(&[5u8; HASH_LEN]);
        rest.extend_from_slice(&[6u8; HASH_LEN]);
        rest.extend_from_slice(&[8u8; RESERVED_GROTH16_PROOF_LEN]);
        assert_eq!(rest.len() + 1, 457);
        assert!(preflight_unshield_release(&program_id, &[], &rest).is_err());
    }

    #[test]
    fn proof_carrying_shield_default_adapter_rejects_before_transfer() {
        let verifier_program_id = Pubkey::new_unique();
        let mut verifier_program_lamports = 1u64;
        let mut verifier_program_data: Vec<u8> = vec![];
        let verifier_program = executable_account_info(
            &verifier_program_id,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let verified = VerifiedShieldPreflight {
            exit_asset_id: [4u8; HASH_LEN],
            shield_amount: 1,
            output_commitment: [7u8; HASH_LEN],
            public_input_hash: [5u8; HASH_LEN],
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id,
            gnark_proof: [8u8; SHIELD_GNARK_PROOF_LEN],
            gnark_public_witness: gnark_public_witness_for(&[5u8; HASH_LEN]),
            asset_kind: VAULT_ASSET_KIND_SPL,
            decimals: 6,
        };

        assert_eq!(
            verify_shield_with_proof_adapter(&verified, &verifier_program),
            Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
        );
    }

    #[test]
    fn proof_carrying_shield_verifier_instruction_data_matches_gnark_tuple() {
        let public_input_hash = [5u8; HASH_LEN];
        let gnark_proof = [8u8; SHIELD_GNARK_PROOF_LEN];
        let gnark_public_witness = gnark_public_witness_for(&public_input_hash);
        let verified = VerifiedShieldPreflight {
            exit_asset_id: [4u8; HASH_LEN],
            shield_amount: 1,
            output_commitment: [7u8; HASH_LEN],
            public_input_hash,
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id: Pubkey::new_unique(),
            gnark_proof,
            gnark_public_witness,
            asset_kind: VAULT_ASSET_KIND_SPL,
            decimals: 6,
        };

        let verifier_instruction_data = verified.verifier_instruction_data();
        assert_eq!(verifier_instruction_data.len(), SHIELD_VERIFIER_INPUT_LEN);
        assert_eq!(
            &verifier_instruction_data[..SHIELD_GNARK_PROOF_LEN],
            &gnark_proof
        );
        assert_eq!(
            &verifier_instruction_data[SHIELD_GNARK_PROOF_LEN..],
            &gnark_public_witness
        );
    }

    #[test]
    fn proof_carrying_shield_public_witness_binding_rejects_wrong_hash_before_not_wired() {
        let mut wrong_public_witness = gnark_public_witness_for(&[5u8; HASH_LEN]);
        wrong_public_witness[GNARK_PUBLIC_WITNESS_VALUE_OFFSET] = 9;
        let verifier_program_id = Pubkey::new_unique();
        let mut verifier_program_lamports = 1u64;
        let mut verifier_program_data: Vec<u8> = vec![];
        let verifier_program = executable_account_info(
            &verifier_program_id,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let verified = VerifiedShieldPreflight {
            exit_asset_id: [4u8; HASH_LEN],
            shield_amount: 1,
            output_commitment: [7u8; HASH_LEN],
            public_input_hash: [5u8; HASH_LEN],
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id,
            gnark_proof: [8u8; SHIELD_GNARK_PROOF_LEN],
            gnark_public_witness: wrong_public_witness,
            asset_kind: VAULT_ASSET_KIND_SPL,
            decimals: 6,
        };

        assert_eq!(
            verify_shield_with_proof_adapter(&verified, &verifier_program),
            Err(ProgramError::InvalidInstructionData)
        );
    }

    #[test]
    fn proof_carrying_unshield_default_adapter_rejects_before_commit() {
        let verifier_program_id = Pubkey::new_unique();
        let mut verifier_program_lamports = 1u64;
        let mut verifier_program_data: Vec<u8> = vec![];
        let verifier_program = executable_account_info(
            &verifier_program_id,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let verified = VerifiedUnshieldPreflight {
            nullifier: [1u8; HASH_LEN],
            accepted_root: [2u8; HASH_LEN],
            exit_destination: [3u8; HASH_LEN],
            exit_asset_id: [4u8; HASH_LEN],
            exit_amount: 1,
            public_input_hash: [5u8; HASH_LEN],
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id,
            gnark_proof: [8u8; UNSHIELD_GNARK_PROOF_LEN],
            gnark_public_witness: gnark_public_witness_for(&[5u8; HASH_LEN]),
            asset_kind: VAULT_ASSET_KIND_SPL,
            sol_vault_bump: 0,
        };

        assert_eq!(
            verify_unshield_with_proof_adapter(&verified, &verifier_program),
            Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
        );
    }

    #[test]
    fn proof_carrying_unshield_verifier_instruction_data_matches_gnark_tuple() {
        let public_input_hash = [5u8; HASH_LEN];
        let gnark_proof = [8u8; UNSHIELD_GNARK_PROOF_LEN];
        let gnark_public_witness = gnark_public_witness_for(&public_input_hash);
        let verified = VerifiedUnshieldPreflight {
            nullifier: [1u8; HASH_LEN],
            accepted_root: [2u8; HASH_LEN],
            exit_destination: [3u8; HASH_LEN],
            exit_asset_id: [4u8; HASH_LEN],
            exit_amount: 1,
            public_input_hash,
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id: Pubkey::new_unique(),
            gnark_proof,
            gnark_public_witness,
            asset_kind: VAULT_ASSET_KIND_SPL,
            sol_vault_bump: 0,
        };

        let verifier_instruction_data = verified.verifier_instruction_data();
        assert_eq!(verifier_instruction_data.len(), UNSHIELD_VERIFIER_INPUT_LEN);
        assert_eq!(
            &verifier_instruction_data[..UNSHIELD_GNARK_PROOF_LEN],
            &gnark_proof
        );
        assert_eq!(
            &verifier_instruction_data[UNSHIELD_GNARK_PROOF_LEN..],
            &gnark_public_witness
        );
    }

    #[test]
    fn proof_carrying_unshield_public_witness_binding_rejects_wrong_hash_before_not_wired() {
        let mut wrong_public_witness = gnark_public_witness_for(&[5u8; HASH_LEN]);
        wrong_public_witness[GNARK_PUBLIC_WITNESS_VALUE_OFFSET] = 9;
        let verifier_program_id = Pubkey::new_unique();
        let mut verifier_program_lamports = 1u64;
        let mut verifier_program_data: Vec<u8> = vec![];
        let verifier_program = executable_account_info(
            &verifier_program_id,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let verified = VerifiedUnshieldPreflight {
            nullifier: [1u8; HASH_LEN],
            accepted_root: [2u8; HASH_LEN],
            exit_destination: [3u8; HASH_LEN],
            exit_asset_id: [4u8; HASH_LEN],
            exit_amount: 1,
            public_input_hash: [5u8; HASH_LEN],
            verifier_key_hash: [6u8; HASH_LEN],
            verifier_program_id,
            gnark_proof: [8u8; UNSHIELD_GNARK_PROOF_LEN],
            gnark_public_witness: wrong_public_witness,
            asset_kind: VAULT_ASSET_KIND_SPL,
            sol_vault_bump: 0,
        };

        assert_eq!(
            verify_unshield_with_proof_adapter(&verified, &verifier_program),
            Err(ProgramError::InvalidInstructionData)
        );
    }

    fn selected_gnark_unshield_fixture_adapter_accepts(
        verified: &VerifiedUnshieldPreflight,
        expected_public_input_hash: &[u8; HASH_LEN],
        expected_verifier_key_hash: &[u8; HASH_LEN],
    ) -> ProgramResult {
        if verified.gnark_proof != [8u8; UNSHIELD_GNARK_PROOF_LEN]
            || &verified.public_input_hash != expected_public_input_hash
        {
            return Err(ProgramError::InvalidInstructionData);
        }
        require_unshield_public_witness_binding(verified)?;
        if &verified.verifier_key_hash != expected_verifier_key_hash {
            return Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH));
        }
        Ok(())
    }

    fn commit_after_selected_gnark_unshield_fixture_adapter<'a>(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'a>],
        verified: &VerifiedUnshieldPreflight,
        expected_public_input_hash: &[u8; HASH_LEN],
        expected_verifier_key_hash: &[u8; HASH_LEN],
    ) -> ProgramResult {
        selected_gnark_unshield_fixture_adapter_accepts(
            verified,
            expected_public_input_hash,
            expected_verifier_key_hash,
        )?;
        commit_verified_unshield_release(program_id, accounts, verified)
    }

    fn assert_selected_gnark_unshield_fixture_adapter_case(
        proof_byte: u8,
        public_witness_mode: u8,
        verified_public_input_hash: [u8; HASH_LEN],
        verified_verifier_key_hash: [u8; HASH_LEN],
        expected_public_input_hash: [u8; HASH_LEN],
        expected_verifier_key_hash: [u8; HASH_LEN],
        expected_result: ProgramResult,
        expect_mutation: bool,
    ) {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let nullifier = [1u8; HASH_LEN];
        let accepted_root = [2u8; HASH_LEN];
        let exit_destination = [3u8; HASH_LEN];
        let exit_amount = 1_000u64;
        let relayer = Pubkey::new_unique();
        let destination = Pubkey::new_unique();
        let verifier_program_id = Pubkey::new_unique();
        let (sol_vault, sol_vault_bump) = sol_vault_pda(&program_id, &pool_state);
        let root_record = root_record_pubkey(&program_id, &pool_state, &accepted_root);
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &nullifier);
        let vault_asset_record =
            vault_asset_record_pda(&program_id, &pool_state, &NATIVE_SOL_ASSET_ID_SENTINEL).0;
        let verifier_key =
            verifier_key_pubkey(&program_id, &pool_state, &verified_verifier_key_hash);
        let system_program_id = system_program::ID;

        let mut pool_lamports = 1_000_000u64;
        let mut root_lamports = 1_000_000u64;
        let mut root_record_lamports = 1_000_000u64;
        let mut marker_lamports = 0u64;
        let mut asset_rec_lamports = 1_000_000u64;
        let mut vault_lamports = 5_000_000u64;
        let mut vault_slot_lamports = 5_000_000u64;
        let mut dest_lamports = 1_000_000u64;
        let mut mint_lamports = 1_000_000u64;
        let mut verifier_key_lamports = 1_000_000u64;
        let mut verifier_program_lamports = 1_000_000u64;
        let mut relayer_lamports = 2_000_000u64;
        let mut token_program_lamports = 1_000_000u64;
        let mut system_lamports = 1_000_000u64;

        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        pool_data[POOL_ROOT_HISTORY_OFFSET..POOL_ROOT_HISTORY_OFFSET + HASH_LEN]
            .copy_from_slice(root_history.as_ref());
        pool_data[POOL_VERIFIER_WIRED_OFFSET] = 1;

        let mut root_data = vec![0u8; HEADER_LEN + HASH_LEN];
        root_data[..8].copy_from_slice(ROOT_MAGIC);
        root_data[8] = VERSION;
        write_count(&mut root_data, 1).unwrap();
        write_hash_slot(&mut root_data, 0, HASH_LEN, &accepted_root).unwrap();

        let mut root_record_data = vec![0u8; ROOT_RECORD_ACCOUNT_LEN];
        root_record_data[..8].copy_from_slice(ROOT_RECORD_MAGIC);
        root_record_data[8] = VERSION;
        write_count(&mut root_record_data, 1).unwrap();
        write_u32(&mut root_record_data, ROOT_RECORD_LEAF_COUNT_OFFSET, 1).unwrap();
        root_record_data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        root_record_data
            [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN]
            .copy_from_slice(&accepted_root);

        let mut asset_rec_data = vec![0u8; VAULT_ASSET_ACCOUNT_LEN];
        write_sol_vault_asset_record_data(
            &mut asset_rec_data,
            &pool_state,
            &NATIVE_SOL_ASSET_ID_SENTINEL,
            &sol_vault,
            VAULT_ASSET_KIND_SOL,
        );
        asset_rec_data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] = 1;

        let mut verifier_key_data = vec![0u8; VERIFIER_KEY_ACCOUNT_LEN];
        verifier_key_data[..8].copy_from_slice(VERIFIER_KEY_MAGIC);
        verifier_key_data[8] = VERSION;
        write_count(&mut verifier_key_data, 1).unwrap();
        verifier_key_data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        verifier_key_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
            .copy_from_slice(&verified_verifier_key_hash);
        verifier_key_data[VERIFIER_KEY_PROGRAM_ID_OFFSET..VERIFIER_KEY_PROGRAM_ID_OFFSET + HASH_LEN]
            .copy_from_slice(verifier_program_id.as_ref());

        let mut marker_data: Vec<u8> = vec![];
        let mut vault_data: Vec<u8> = vec![];
        let mut vault_slot_data: Vec<u8> = vec![];
        let mut dest_data: Vec<u8> = vec![];
        let mut mint_data: Vec<u8> = vec![];
        let mut token_program_data: Vec<u8> = vec![];
        let mut verifier_program_data: Vec<u8> = vec![];
        let mut relayer_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let roots = account_info(
            &root_history,
            &program_id,
            false,
            false,
            &mut root_lamports,
            &mut root_data,
        );
        let root_rec = account_info(
            &root_record,
            &program_id,
            false,
            false,
            &mut root_record_lamports,
            &mut root_record_data,
        );
        let marker = account_info(
            &nullifier_marker,
            &system_program::ID,
            true,
            false,
            &mut marker_lamports,
            &mut marker_data,
        );
        let vault = account_info(
            &sol_vault,
            &program_id,
            true,
            false,
            &mut vault_lamports,
            &mut vault_data,
        );
        let asset_rec = account_info(
            &vault_asset_record,
            &program_id,
            false,
            false,
            &mut asset_rec_lamports,
            &mut asset_rec_data,
        );
        let vault_slot = account_info(
            &sol_vault,
            &program_id,
            true,
            false,
            &mut vault_slot_lamports,
            &mut vault_slot_data,
        );
        let dest = account_info(
            &destination,
            &system_program::ID,
            true,
            false,
            &mut dest_lamports,
            &mut dest_data,
        );
        let before_marker = marker.try_borrow_data().unwrap().to_vec();
        let before_dest_lamports = dest.lamports();
        let before_vault_lamports = vault.lamports();
        let mint = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut mint_lamports,
            &mut mint_data,
        );
        let token_program = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut token_program_lamports,
            &mut token_program_data,
        );
        let vkey = account_info(
            &verifier_key,
            &program_id,
            false,
            false,
            &mut verifier_key_lamports,
            &mut verifier_key_data,
        );
        let vprogram = executable_account_info(
            &verifier_program_id,
            &mut verifier_program_lamports,
            &mut verifier_program_data,
        );
        let auth = account_info(
            &relayer,
            &system_program::ID,
            true,
            true,
            &mut relayer_lamports,
            &mut relayer_data,
        );
        let system = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );

        let mut gnark_public_witness = gnark_public_witness_for(&verified_public_input_hash);
        if public_witness_mode != 0 {
            gnark_public_witness = [public_witness_mode; UNSHIELD_GNARK_PUBLIC_WITNESS_LEN];
        }
        let verified = VerifiedUnshieldPreflight {
            nullifier,
            accepted_root,
            exit_destination,
            exit_asset_id: NATIVE_SOL_ASSET_ID_SENTINEL,
            exit_amount,
            public_input_hash: verified_public_input_hash,
            verifier_key_hash: verified_verifier_key_hash,
            verifier_program_id,
            gnark_proof: [proof_byte; UNSHIELD_GNARK_PROOF_LEN],
            gnark_public_witness,
            asset_kind: VAULT_ASSET_KIND_SOL,
            sol_vault_bump,
        };

        let accounts = vec![
            pool, roots, root_rec, marker, vault, asset_rec, vault_slot, dest, mint,
            token_program, vkey, vprogram, auth, system,
        ];

        let result = commit_after_selected_gnark_unshield_fixture_adapter(
            &program_id,
            &accounts,
            &verified,
            &expected_public_input_hash,
            &expected_verifier_key_hash,
        );

        assert_eq!(result, expected_result);
        if expect_mutation {
            assert_eq!(&accounts[3].try_borrow_data().unwrap()[..8], NULLIFIER_MARKER_MAGIC);
            assert!(accounts[7].lamports() > before_dest_lamports);
            assert!(accounts[4].lamports() < before_vault_lamports);
        } else {
            assert_eq!(
                accounts[3].try_borrow_data().unwrap().as_ref(),
                before_marker.as_slice()
            );
            assert_eq!(accounts[7].lamports(), before_dest_lamports);
            assert_eq!(accounts[4].lamports(), before_vault_lamports);
        }
    }

    #[test]
    fn selected_gnark_unshield_fixture_adapter_valid_proof_accepts_before_commit() {
        let public_input_hash = [5u8; HASH_LEN];
        let verifier_key_hash = [6u8; HASH_LEN];
        let verified = VerifiedUnshieldPreflight {
            nullifier: [1u8; HASH_LEN],
            accepted_root: [2u8; HASH_LEN],
            exit_destination: [3u8; HASH_LEN],
            exit_asset_id: NATIVE_SOL_ASSET_ID_SENTINEL,
            exit_amount: 1_000,
            public_input_hash,
            verifier_key_hash,
            verifier_program_id: Pubkey::new_unique(),
            gnark_proof: [8u8; UNSHIELD_GNARK_PROOF_LEN],
            gnark_public_witness: gnark_public_witness_for(&public_input_hash),
            asset_kind: VAULT_ASSET_KIND_SOL,
            sol_vault_bump: 0,
        };

        assert_eq!(
            selected_gnark_unshield_fixture_adapter_accepts(
                &verified,
                &public_input_hash,
                &verifier_key_hash,
            ),
            Ok(())
        );
    }

    #[test]
    fn selected_gnark_unshield_fixture_adapter_valid_proof_mutates_state() {
        assert_selected_gnark_unshield_fixture_adapter_case(
            8,
            0,
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            Err(ProgramError::UnsupportedSysvar),
            false,
        );
    }

    #[test]
    fn selected_gnark_unshield_fixture_adapter_invalid_proof_no_mutation() {
        assert_selected_gnark_unshield_fixture_adapter_case(
            10,
            0,
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            Err(ProgramError::InvalidInstructionData),
            false,
        );
    }

    #[test]
    fn selected_gnark_unshield_fixture_adapter_wrong_public_input_no_mutation() {
        assert_selected_gnark_unshield_fixture_adapter_case(
            8,
            0,
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            [7u8; HASH_LEN],
            [6u8; HASH_LEN],
            Err(ProgramError::InvalidInstructionData),
            false,
        );
    }

    #[test]
    fn selected_gnark_unshield_fixture_adapter_wrong_verifying_key_no_mutation() {
        assert_selected_gnark_unshield_fixture_adapter_case(
            8,
            0,
            [5u8; HASH_LEN],
            [6u8; HASH_LEN],
            [5u8; HASH_LEN],
            [7u8; HASH_LEN],
            Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH)),
            false,
        );
    }

    #[test]
    fn zero_verifier_key_hash() {
        let program_id = Pubkey::new_unique();
        let verifier_program_id = Pubkey::new_unique();
        let mut data = vec![TAG_REGISTER_VERIFIER_KEY];
        data.extend_from_slice(&[0u8; HASH_LEN]);
        data.extend_from_slice(verifier_program_id.as_ref());
        assert_eq!(
            process_instruction(&program_id, &[], &data),
            Err(ProgramError::InvalidInstructionData)
        );
    }

    #[test]
    fn register_verifier_key_writes_source_only_key_registry_record() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let verifier_key_hash = [6u8; HASH_LEN];
        let verifier_program_id = Pubkey::new_unique();
        let verifier_key = verifier_key_pubkey(&program_id, &pool_state, &verifier_key_hash);
        let authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;
        let mut pool_lamports = 1u64;
        let mut verifier_lamports = 1u64;
        let mut authority_lamports = 1u64;
        let mut system_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut verifier_data = vec![0u8; VERIFIER_KEY_ACCOUNT_LEN];
        let mut authority_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        pool_data[POOL_AUTHORITY_OFFSET..POOL_AUTHORITY_OFFSET + HASH_LEN]
            .copy_from_slice(authority.as_ref());
        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let vkey = account_info(
            &verifier_key,
            &program_id,
            true,
            false,
            &mut verifier_lamports,
            &mut verifier_data,
        );
        let auth = account_info(
            &authority,
            &system_program::ID,
            true,
            true,
            &mut authority_lamports,
            &mut authority_data,
        );
        let system = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );
        let mut data = vec![TAG_REGISTER_VERIFIER_KEY];
        data.extend_from_slice(&verifier_key_hash);
        data.extend_from_slice(verifier_program_id.as_ref());

        assert_eq!(
            process_instruction(&program_id, &[pool, vkey, auth, system], &data),
            Ok(())
        );
        assert_eq!(&verifier_data[..8], VERIFIER_KEY_MAGIC);
        assert_eq!(
            &verifier_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN],
            &verifier_key_hash
        );
        assert_eq!(
            &verifier_data
                [VERIFIER_KEY_PROGRAM_ID_OFFSET..VERIFIER_KEY_PROGRAM_ID_OFFSET + HASH_LEN],
            verifier_program_id.as_ref()
        );
    }

    #[test]
    fn register_verifier_key_records_verifier_program_id() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let verifier_key_hash = [6u8; HASH_LEN];
        let verifier_program_id = Pubkey::new_unique();
        let verifier_key = verifier_key_pubkey(&program_id, &pool_state, &verifier_key_hash);
        let authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;
        let mut pool_lamports = 1u64;
        let mut verifier_lamports = 1u64;
        let mut authority_lamports = 1u64;
        let mut system_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut verifier_data = vec![0u8; VERIFIER_KEY_ACCOUNT_LEN];
        let mut authority_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        pool_data[POOL_AUTHORITY_OFFSET..POOL_AUTHORITY_OFFSET + HASH_LEN]
            .copy_from_slice(authority.as_ref());
        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let vkey = account_info(
            &verifier_key,
            &program_id,
            true,
            false,
            &mut verifier_lamports,
            &mut verifier_data,
        );
        let auth = account_info(
            &authority,
            &system_program::ID,
            true,
            true,
            &mut authority_lamports,
            &mut authority_data,
        );
        let system = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );
        let mut data = vec![TAG_REGISTER_VERIFIER_KEY];
        data.extend_from_slice(&verifier_key_hash);
        data.extend_from_slice(verifier_program_id.as_ref());

        assert_eq!(
            process_instruction(&program_id, &[pool, vkey, auth, system], &data),
            Ok(())
        );
        let verifier_program_offset = VERIFIER_KEY_HASH_OFFSET + HASH_LEN;
        assert_eq!(
            &verifier_data[verifier_program_offset..verifier_program_offset + HASH_LEN],
            verifier_program_id.as_ref()
        );
    }

    #[test]
    fn register_verifier_key_rejects_zero_hash_and_wrong_pda() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let wrong_verifier_key = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;
        let verifier_key_hash = [7u8; HASH_LEN];
        let verifier_program_id = Pubkey::new_unique();
        let mut pool_lamports = 1u64;
        let mut verifier_lamports = 1u64;
        let mut authority_lamports = 1u64;
        let mut system_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut verifier_data = vec![0u8; VERIFIER_KEY_ACCOUNT_LEN];
        let mut authority_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        pool_data[POOL_AUTHORITY_OFFSET..POOL_AUTHORITY_OFFSET + HASH_LEN]
            .copy_from_slice(authority.as_ref());
        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let vkey = account_info(
            &wrong_verifier_key,
            &program_id,
            true,
            false,
            &mut verifier_lamports,
            &mut verifier_data,
        );
        let auth = account_info(
            &authority,
            &system_program::ID,
            true,
            true,
            &mut authority_lamports,
            &mut authority_data,
        );
        let system = account_info(
            &system_program_id,
            &system_program_id,
            false,
            false,
            &mut system_lamports,
            &mut system_data,
        );
        let mut data = vec![TAG_REGISTER_VERIFIER_KEY];
        data.extend_from_slice(&verifier_key_hash);
        data.extend_from_slice(verifier_program_id.as_ref());

        assert_eq!(
            process_instruction(&program_id, &[pool, vkey, auth, system], &data),
            Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH))
        );
    }

    #[test]
    fn register_vault_asset_rejects_existing_metadata_drift() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let exit_asset_id = [9u8; HASH_LEN];
        let asset_key = vault_asset_record_pda(&program_id, &pool_state, &exit_asset_id).0;
        let mut pool_lamports = 1u64;
        let mut asset_lamports = 1u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut asset_data = vec![0u8; VAULT_ASSET_ACCOUNT_LEN];
        let mint = [1u8; HASH_LEN];
        let vault_authority = [2u8; HASH_LEN];
        let vault_token_account = [3u8; HASH_LEN];
        let token_program = SPL_TOKEN_PROGRAM_ID.to_bytes();

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        write_vault_asset_account(
            &mut asset_data,
            &pool,
            &exit_asset_id,
            &mint,
            &vault_authority,
            &vault_token_account,
            &token_program,
            VAULT_ASSET_KIND_SPL,
        )
        .unwrap();
        let asset = account_info(
            &asset_key,
            &program_id,
            true,
            false,
            &mut asset_lamports,
            &mut asset_data,
        );

        assert_eq!(
            ensure_vault_asset_record(
                &program_id,
                &pool,
                &asset,
                &pool,
                &pool,
                &exit_asset_id,
                &[4u8; HASH_LEN],
                &vault_authority,
                &vault_token_account,
                &token_program,
                VAULT_ASSET_KIND_SPL,
            ),
            Err(ProgramError::Custom(
                ERR_VAULT_ASSET_ALREADY_REGISTERED_WITH_DIFFERENT_PARAMS
            ))
        );
    }

    #[test]
    fn append_tree_leaf_writes_program_owned_poseidon_root() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let tree_state = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;
        let output_commitment = [7u8; HASH_LEN];
        let transition_public_input_hash = [8u8; HASH_LEN];

        let mut pool_lamports = 1_000_000u64;
        let mut nullifier_lamports = 1_000_000u64;
        let mut output_lamports = 1_000_000u64;
        let mut root_lamports = 1_000_000u64;
        let mut tree_lamports = 1_000_000u64;
        let mut root_record_lamports = 1_000_000u64;
        let mut marker_lamports = 1_000_000u64;
        let mut authority_lamports = 1_000_000u64;
        let mut system_lamports = 1_000_000u64;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut nullifier_data = vec![0u8; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0u8; HEADER_LEN];
        let mut root_data = vec![0u8; HEADER_LEN + HASH_LEN * 4];
        let mut tree_data = vec![0u8; TREE_STATE_LEN];
        let mut root_record_data = vec![0u8; ROOT_RECORD_ACCOUNT_LEN];
        let mut marker_data = vec![0u8; TREE_LEAF_MARKER_LEN];
        let mut signer_data: Vec<u8> = vec![];
        let mut system_data: Vec<u8> = vec![];

        init_pool_for_tree_test(
            &program_id,
            &pool_state,
            &nullifier_set,
            &output_queue,
            &root_history,
            &tree_state,
            &authority,
            &mut pool_lamports,
            &mut nullifier_lamports,
            &mut output_lamports,
            &mut root_lamports,
            &mut tree_lamports,
            &mut authority_lamports,
            &mut pool_data,
            &mut nullifier_data,
            &mut output_data,
            &mut root_data,
            &mut tree_data,
            &mut signer_data,
        );

        let previous_root = read_hash(&tree_data, TREE_CURRENT_ROOT_OFFSET).unwrap();
        let (expected_root, _) =
            compute_program_owned_append_root(&tree_data, 0, &output_commitment).unwrap();
        let root_record = root_record_pubkey(&program_id, &pool_state, &expected_root);
        let tree_leaf_marker =
            tree_leaf_marker_pubkey(&program_id, &pool_state, &output_commitment);

        {
            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let tree = account_info(
                &tree_state,
                &program_id,
                true,
                false,
                &mut tree_lamports,
                &mut tree_data,
            );
            let roots = account_info(
                &root_history,
                &program_id,
                true,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let record = account_info(
                &root_record,
                &program_id,
                true,
                false,
                &mut root_record_lamports,
                &mut root_record_data,
            );
            let marker = account_info(
                &tree_leaf_marker,
                &program_id,
                true,
                false,
                &mut marker_lamports,
                &mut marker_data,
            );
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let system_info = account_info(
                &system_program_id,
                &system_program_id,
                false,
                false,
                &mut system_lamports,
                &mut system_data,
            );
            let accounts = vec![
                pool,
                tree,
                roots,
                record,
                marker,
                authority_info,
                system_info,
            ];
            let instruction = append_tree_leaf_instruction(
                output_commitment,
                previous_root,
                expected_root,
                transition_public_input_hash,
                1,
            );

            assert_eq!(
                process_instruction(&program_id, &accounts, &instruction),
                Ok(())
            );
        }

        assert_eq!(read_u64(&tree_data, TREE_NEXT_LEAF_INDEX_OFFSET), Ok(1));
        assert_eq!(
            &tree_data[TREE_CURRENT_ROOT_OFFSET..TREE_CURRENT_ROOT_OFFSET + HASH_LEN],
            &expected_root
        );
        assert_eq!(read_count(&root_data), Ok(1));
        assert_eq!(
            &root_data[HEADER_LEN..HEADER_LEN + HASH_LEN],
            &expected_root
        );
        assert_eq!(&root_record_data[..8], ROOT_RECORD_MAGIC);
        assert_eq!(
            read_u64(&root_record_data, ROOT_RECORD_LEAF_INDEX_BASE_OFFSET),
            Ok(0)
        );
        assert_eq!(&marker_data[..8], TREE_LEAF_MARKER_MAGIC);
        assert_eq!(read_u64(&marker_data, TREE_LEAF_MARKER_INDEX_OFFSET), Ok(0));
    }

    #[test]
    fn append_tree_leaf_rejects_wrong_expected_root_without_mutation() {
        let mut fixture = TreeAppendUnitFixture::new();
        fixture.init();
        let output_commitment = [7u8; HASH_LEN];
        let previous_root = fixture.current_tree_root();
        let (mut expected_root, _) =
            compute_program_owned_append_root(&fixture.tree_data, 0, &output_commitment).unwrap();
        expected_root[0] ^= 1;
        let before = fixture.snapshot();

        let result = fixture.call_append(
            output_commitment,
            previous_root,
            expected_root,
            [8u8; HASH_LEN],
            1,
        );

        assert_eq!(result, Err(ProgramError::Custom(ERR_TREE_ROOT_MISMATCH)));
        assert_eq!(before, fixture.snapshot());
    }

    #[test]
    fn append_tree_leaf_rejects_wrong_tree_state_without_mutation() {
        let mut fixture = TreeAppendUnitFixture::new();
        fixture.init();
        let output_commitment = [7u8; HASH_LEN];
        let previous_root = fixture.current_tree_root();
        let (expected_root, _) =
            compute_program_owned_append_root(&fixture.tree_data, 0, &output_commitment).unwrap();
        let before = fixture.snapshot();

        let result = fixture.call_append_with_wrong_tree(
            output_commitment,
            previous_root,
            expected_root,
            [8u8; HASH_LEN],
            1,
        );

        assert_eq!(result, Err(ProgramError::Custom(ERR_POOL_ACCOUNT_MISMATCH)));
        assert_eq!(before, fixture.snapshot());
    }

    #[test]
    fn append_tree_leaf_rejects_duplicate_leaf_without_mutation() {
        let mut fixture = TreeAppendUnitFixture::new();
        fixture.init();
        let output_commitment = [7u8; HASH_LEN];
        let previous_root = fixture.current_tree_root();
        let (expected_root, _) =
            compute_program_owned_append_root(&fixture.tree_data, 0, &output_commitment).unwrap();

        assert_eq!(
            fixture.call_append(
                output_commitment,
                previous_root,
                expected_root,
                [8u8; HASH_LEN],
                1,
            ),
            Ok(())
        );

        let second_previous_root = fixture.current_tree_root();
        let (second_expected_root, _) =
            compute_program_owned_append_root(&fixture.tree_data, 1, &output_commitment).unwrap();
        fixture.root_record_data.fill(0);
        let before = fixture.snapshot();
        let result = fixture.call_append(
            output_commitment,
            second_previous_root,
            second_expected_root,
            [9u8; HASH_LEN],
            1,
        );

        assert_eq!(result, Err(ProgramError::Custom(ERR_DUPLICATE_TREE_LEAF)));
        assert_eq!(before, fixture.snapshot());
    }

    #[test]
    fn append_tree_leaf_rejects_capacity_without_mutation() {
        let mut fixture = TreeAppendUnitFixture::new();
        fixture.init();
        write_u64(
            &mut fixture.tree_data,
            TREE_NEXT_LEAF_INDEX_OFFSET,
            TREE_CAPACITY,
        )
        .unwrap();
        let before = fixture.snapshot();
        let result = fixture.call_append(
            [7u8; HASH_LEN],
            fixture.current_tree_root(),
            [8u8; HASH_LEN],
            [9u8; HASH_LEN],
            1,
        );

        assert_eq!(result, Err(ProgramError::Custom(ERR_TREE_CAPACITY_FULL)));
        assert_eq!(before, fixture.snapshot());
    }

    struct TreeAppendUnitFixture {
        program_id: Pubkey,
        pool_state: Pubkey,
        nullifier_set: Pubkey,
        output_queue: Pubkey,
        root_history: Pubkey,
        tree_state: Pubkey,
        wrong_tree_state: Pubkey,
        authority: Pubkey,
        system_program_id: Pubkey,
        pool_lamports: u64,
        nullifier_lamports: u64,
        output_lamports: u64,
        root_lamports: u64,
        tree_lamports: u64,
        wrong_tree_lamports: u64,
        root_record_lamports: u64,
        marker_lamports: u64,
        authority_lamports: u64,
        system_lamports: u64,
        pool_data: Vec<u8>,
        nullifier_data: Vec<u8>,
        output_data: Vec<u8>,
        root_data: Vec<u8>,
        tree_data: Vec<u8>,
        wrong_tree_data: Vec<u8>,
        root_record_data: Vec<u8>,
        marker_data: Vec<u8>,
        signer_data: Vec<u8>,
        system_data: Vec<u8>,
    }

    impl TreeAppendUnitFixture {
        fn new() -> Self {
            Self {
                program_id: Pubkey::new_unique(),
                pool_state: Pubkey::new_unique(),
                nullifier_set: Pubkey::new_unique(),
                output_queue: Pubkey::new_unique(),
                root_history: Pubkey::new_unique(),
                tree_state: Pubkey::new_unique(),
                wrong_tree_state: Pubkey::new_unique(),
                authority: Pubkey::new_unique(),
                system_program_id: system_program::ID,
                pool_lamports: 1_000_000,
                nullifier_lamports: 1_000_000,
                output_lamports: 1_000_000,
                root_lamports: 1_000_000,
                tree_lamports: 1_000_000,
                wrong_tree_lamports: 1_000_000,
                root_record_lamports: 1_000_000,
                marker_lamports: 1_000_000,
                authority_lamports: 1_000_000,
                system_lamports: 1_000_000,
                pool_data: vec![0u8; POOL_STATE_LEN],
                nullifier_data: vec![0u8; HEADER_LEN + HASH_LEN * 4],
                output_data: vec![0u8; HEADER_LEN],
                root_data: vec![0u8; HEADER_LEN + HASH_LEN * 4],
                tree_data: vec![0u8; TREE_STATE_LEN],
                wrong_tree_data: vec![0u8; TREE_STATE_LEN],
                root_record_data: vec![0u8; ROOT_RECORD_ACCOUNT_LEN],
                marker_data: vec![0u8; TREE_LEAF_MARKER_LEN],
                signer_data: vec![],
                system_data: vec![],
            }
        }

        fn init(&mut self) {
            init_pool_for_tree_test(
                &self.program_id,
                &self.pool_state,
                &self.nullifier_set,
                &self.output_queue,
                &self.root_history,
                &self.tree_state,
                &self.authority,
                &mut self.pool_lamports,
                &mut self.nullifier_lamports,
                &mut self.output_lamports,
                &mut self.root_lamports,
                &mut self.tree_lamports,
                &mut self.authority_lamports,
                &mut self.pool_data,
                &mut self.nullifier_data,
                &mut self.output_data,
                &mut self.root_data,
                &mut self.tree_data,
                &mut self.signer_data,
            );
            self.wrong_tree_data.copy_from_slice(&self.tree_data);
        }

        fn current_tree_root(&self) -> [u8; HASH_LEN] {
            read_hash(&self.tree_data, TREE_CURRENT_ROOT_OFFSET).unwrap()
        }

        fn snapshot(&self) -> Vec<Vec<u8>> {
            vec![
                self.pool_data.clone(),
                self.root_data.clone(),
                self.tree_data.clone(),
                self.wrong_tree_data.clone(),
                self.root_record_data.clone(),
                self.marker_data.clone(),
            ]
        }

        fn call_append(
            &mut self,
            output_commitment: [u8; HASH_LEN],
            previous_root: [u8; HASH_LEN],
            expected_root: [u8; HASH_LEN],
            transition_public_input_hash: [u8; HASH_LEN],
            transition_kind: u8,
        ) -> ProgramResult {
            self.call_append_inner(
                false,
                output_commitment,
                previous_root,
                expected_root,
                transition_public_input_hash,
                transition_kind,
            )
        }

        fn call_append_with_wrong_tree(
            &mut self,
            output_commitment: [u8; HASH_LEN],
            previous_root: [u8; HASH_LEN],
            expected_root: [u8; HASH_LEN],
            transition_public_input_hash: [u8; HASH_LEN],
            transition_kind: u8,
        ) -> ProgramResult {
            self.call_append_inner(
                true,
                output_commitment,
                previous_root,
                expected_root,
                transition_public_input_hash,
                transition_kind,
            )
        }

        fn call_append_inner(
            &mut self,
            use_wrong_tree: bool,
            output_commitment: [u8; HASH_LEN],
            previous_root: [u8; HASH_LEN],
            expected_root: [u8; HASH_LEN],
            transition_public_input_hash: [u8; HASH_LEN],
            transition_kind: u8,
        ) -> ProgramResult {
            let tree_key = if use_wrong_tree {
                self.wrong_tree_state
            } else {
                self.tree_state
            };
            let root_record =
                root_record_pubkey(&self.program_id, &self.pool_state, &expected_root);
            let tree_leaf_marker =
                tree_leaf_marker_pubkey(&self.program_id, &self.pool_state, &output_commitment);
            let pool = account_info(
                &self.pool_state,
                &self.program_id,
                true,
                false,
                &mut self.pool_lamports,
                &mut self.pool_data,
            );
            let tree = if use_wrong_tree {
                account_info(
                    &tree_key,
                    &self.program_id,
                    true,
                    false,
                    &mut self.wrong_tree_lamports,
                    &mut self.wrong_tree_data,
                )
            } else {
                account_info(
                    &tree_key,
                    &self.program_id,
                    true,
                    false,
                    &mut self.tree_lamports,
                    &mut self.tree_data,
                )
            };
            let roots = account_info(
                &self.root_history,
                &self.program_id,
                true,
                false,
                &mut self.root_lamports,
                &mut self.root_data,
            );
            let record = account_info(
                &root_record,
                &self.program_id,
                true,
                false,
                &mut self.root_record_lamports,
                &mut self.root_record_data,
            );
            let marker = account_info(
                &tree_leaf_marker,
                &self.program_id,
                true,
                false,
                &mut self.marker_lamports,
                &mut self.marker_data,
            );
            let authority_info = account_info(
                &self.authority,
                &self.program_id,
                true,
                true,
                &mut self.authority_lamports,
                &mut self.signer_data,
            );
            let system_info = account_info(
                &self.system_program_id,
                &self.system_program_id,
                false,
                false,
                &mut self.system_lamports,
                &mut self.system_data,
            );
            let accounts = vec![
                pool,
                tree,
                roots,
                record,
                marker,
                authority_info,
                system_info,
            ];
            let instruction = append_tree_leaf_instruction(
                output_commitment,
                previous_root,
                expected_root,
                transition_public_input_hash,
                transition_kind,
            );
            process_instruction(&self.program_id, &accounts, &instruction)
        }
    }

    fn init_pool_for_tree_test(
        program_id: &Pubkey,
        pool_state: &Pubkey,
        nullifier_set: &Pubkey,
        output_queue: &Pubkey,
        root_history: &Pubkey,
        tree_state: &Pubkey,
        authority: &Pubkey,
        pool_lamports: &mut u64,
        nullifier_lamports: &mut u64,
        output_lamports: &mut u64,
        root_lamports: &mut u64,
        tree_lamports: &mut u64,
        authority_lamports: &mut u64,
        pool_data: &mut [u8],
        nullifier_data: &mut [u8],
        output_data: &mut [u8],
        root_data: &mut [u8],
        tree_data: &mut [u8],
        signer_data: &mut [u8],
    ) {
        let pool = account_info(
            pool_state,
            program_id,
            true,
            false,
            pool_lamports,
            pool_data,
        );
        let nullifier = account_info(
            nullifier_set,
            program_id,
            true,
            false,
            nullifier_lamports,
            nullifier_data,
        );
        let output = account_info(
            output_queue,
            program_id,
            true,
            false,
            output_lamports,
            output_data,
        );
        let roots = account_info(
            root_history,
            program_id,
            true,
            false,
            root_lamports,
            root_data,
        );
        let tree = account_info(
            tree_state,
            program_id,
            true,
            false,
            tree_lamports,
            tree_data,
        );
        let authority_info = account_info(
            authority,
            program_id,
            false,
            true,
            authority_lamports,
            signer_data,
        );
        let accounts = vec![pool, nullifier, output, roots, tree, authority_info];
        assert_eq!(
            process_instruction(program_id, &accounts, &[TAG_INIT]),
            Ok(())
        );
    }

    // before_duplicate_lamports
    fn account_info<'a>(
        key: &'a Pubkey,
        owner: &'a Pubkey,
        is_writable: bool,
        is_signer: bool,
        lamports: &'a mut u64,
        data: &'a mut [u8],
    ) -> AccountInfo<'a> {
        AccountInfo::new(
            key,
            is_signer,
            is_writable,
            lamports,
            data,
            owner,
            false,
            Epoch::default(),
        )
    }

    fn executable_account_info<'a>(
        key: &'a Pubkey,
        lamports: &'a mut u64,
        data: &'a mut [u8],
    ) -> AccountInfo<'a> {
        executable_account_info_with_flags(key, false, false, lamports, data)
    }

    fn executable_account_info_with_flags<'a>(
        key: &'a Pubkey,
        is_writable: bool,
        is_signer: bool,
        lamports: &'a mut u64,
        data: &'a mut [u8],
    ) -> AccountInfo<'a> {
        AccountInfo::new(
            key,
            is_signer,
            is_writable,
            lamports,
            data,
            &solana_program::bpf_loader::ID,
            true,
            Epoch::default(),
        )
    }

    fn nullifier_marker_pubkey(
        program_id: &Pubkey,
        pool_state: &Pubkey,
        nullifier: &[u8],
    ) -> Pubkey {
        Pubkey::find_program_address(
            &[NULLIFIER_MARKER_SEED, pool_state.as_ref(), nullifier],
            program_id,
        )
        .0
    }

    fn output_record_pubkey(
        program_id: &Pubkey,
        pool_state: &Pubkey,
        public_input_hash: &[u8],
    ) -> Pubkey {
        Pubkey::find_program_address(
            &[OUTPUT_RECORD_SEED, pool_state.as_ref(), public_input_hash],
            program_id,
        )
        .0
    }

    fn root_record_pubkey(
        program_id: &Pubkey,
        pool_state: &Pubkey,
        accepted_root: &[u8],
    ) -> Pubkey {
        Pubkey::find_program_address(
            &[ROOT_RECORD_SEED, pool_state.as_ref(), accepted_root],
            program_id,
        )
        .0
    }

    fn verifier_key_pubkey(
        program_id: &Pubkey,
        pool_state: &Pubkey,
        verifier_key_hash: &[u8],
    ) -> Pubkey {
        Pubkey::find_program_address(
            &[VERIFIER_KEY_SEED, pool_state.as_ref(), verifier_key_hash],
            program_id,
        )
        .0
    }

    fn tree_leaf_marker_pubkey(
        program_id: &Pubkey,
        pool_state: &Pubkey,
        output_commitment: &[u8],
    ) -> Pubkey {
        Pubkey::find_program_address(
            &[
                TREE_LEAF_MARKER_SEED,
                pool_state.as_ref(),
                output_commitment,
            ],
            program_id,
        )
        .0
    }

    fn spend_instruction() -> Vec<u8> {
        spend_instruction_with(
            [1; HASH_LEN],
            [2; HASH_LEN],
            [3; HASH_LEN],
            [4; HASH_LEN],
            [5; HASH_LEN],
        )
    }

    fn spend_instruction_with(
        nullifier: [u8; HASH_LEN],
        output0: [u8; HASH_LEN],
        output1: [u8; HASH_LEN],
        accepted_root: [u8; HASH_LEN],
        public_input_hash: [u8; HASH_LEN],
    ) -> Vec<u8> {
        let mut data = Vec::with_capacity(SPEND_PAYLOAD_LEN);
        data.push(TAG_SPEND);
        data.extend_from_slice(&nullifier);
        data.extend_from_slice(&output0);
        data.extend_from_slice(&output1);
        data.extend_from_slice(&accepted_root);
        data.extend_from_slice(&public_input_hash);
        data
    }

    fn register_root_instruction() -> Vec<u8> {
        let mut data = Vec::with_capacity(REGISTER_ROOT_PAYLOAD_LEN);
        data.push(TAG_REGISTER_ROOT);
        data.extend_from_slice(&[4; HASH_LEN]);
        data
    }

    fn append_tree_leaf_instruction(
        output_commitment: [u8; HASH_LEN],
        previous_root: [u8; HASH_LEN],
        new_root: [u8; HASH_LEN],
        transition_public_input_hash: [u8; HASH_LEN],
        transition_kind: u8,
    ) -> Vec<u8> {
        let mut data = Vec::with_capacity(APPEND_TREE_LEAF_PAYLOAD_LEN);
        data.push(TAG_APPEND_TREE_LEAF);
        data.extend_from_slice(&output_commitment);
        data.extend_from_slice(&previous_root);
        data.extend_from_slice(&new_root);
        data.extend_from_slice(&transition_public_input_hash);
        data.push(transition_kind);
        data
    }

    fn write_sol_vault_asset_record_data(
        data: &mut [u8],
        pool_state: &Pubkey,
        exit_asset_id: &[u8; HASH_LEN],
        sol_vault_holding: &Pubkey,
        asset_kind: u8,
    ) {
        data.fill(0);
        data[..8].copy_from_slice(VAULT_ASSET_MAGIC);
        data[8] = VERSION;
        write_count(data, 1).unwrap();
        data[VAULT_ASSET_POOL_OFFSET..VAULT_ASSET_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        data[VAULT_ASSET_EXIT_ASSET_ID_OFFSET..VAULT_ASSET_EXIT_ASSET_ID_OFFSET + HASH_LEN]
            .copy_from_slice(exit_asset_id);
        data[VAULT_ASSET_VAULT_AUTHORITY_OFFSET..VAULT_ASSET_VAULT_AUTHORITY_OFFSET + HASH_LEN]
            .copy_from_slice(sol_vault_holding.as_ref());
        data[VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET
            ..VAULT_ASSET_VAULT_TOKEN_ACCOUNT_OFFSET + HASH_LEN]
            .copy_from_slice(sol_vault_holding.as_ref());
        data[VAULT_ASSET_TOKEN_PROGRAM_OFFSET..VAULT_ASSET_TOKEN_PROGRAM_OFFSET + HASH_LEN]
            .copy_from_slice(system_program::ID.as_ref());
        data[VAULT_ASSET_KIND_OFFSET] = asset_kind;
        data[VAULT_ASSET_RELEASE_ENABLED_OFFSET] = 0;
    }

    #[test]
    fn tag_init_initializes_verifier_wired_to_zero() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let tree_state = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut tree_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut pool_data = vec![0u8; POOL_STATE_LEN];
        let mut nullifier_data = vec![0u8; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0u8; HEADER_LEN];
        let mut root_data = vec![0u8; HEADER_LEN + HASH_LEN * 4];
        let mut tree_data = vec![0u8; TREE_STATE_LEN];
        let mut signer_data = vec![];

        init_pool_for_tree_test(
            &program_id,
            &pool_state,
            &nullifier_set,
            &output_queue,
            &root_history,
            &tree_state,
            &authority,
            &mut pool_lamports,
            &mut nullifier_lamports,
            &mut output_lamports,
            &mut root_lamports,
            &mut tree_lamports,
            &mut authority_lamports,
            &mut pool_data,
            &mut nullifier_data,
            &mut output_data,
            &mut root_data,
            &mut tree_data,
            &mut signer_data,
        );

        assert_eq!(pool_data[POOL_VERIFIER_WIRED_OFFSET], POOL_VERIFIER_NOT_WIRED);
        assert_eq!(pool_verifier_wired(&pool_data), Ok(false));
    }

    // SOL TAG6 unshield path test (Crucible/fuzz ready, deepened).
    // Verifies TAG_UNSHIELD=6 dispatch, full kind=2 sentinel registry preflight, and
    // the runtime verifier_wired=0 fail-closed boundary before nullifier consume or release CPI.
    // Verifies TAG_UNSHIELD=6 unified reserved SOL path and verifier_wired=0 fail-closed boundary.
    #[test]
    fn unshield_sol_verifier_wired_zero_rejects_before_nullifier_or_release() {
        let observation = run_sol_unshield_reserved_process_with_observation(
            POOL_VERIFIER_NOT_WIRED,
            NATIVE_SOL_ASSET_ID_SENTINEL,
            VAULT_ASSET_KIND_SOL,
            None,
            [11u8; HASH_LEN],
            1,
            [9u8; HASH_LEN],
        );

        assert_eq!(
            observation.result,
            Err(ProgramError::Custom(ERR_UNSHIELD_NOT_WIRED))
        );
        assert_eq!(observation.marker_lamports, 0);
        assert!(observation.marker_data.iter().all(|byte| *byte == 0));
        assert_eq!(observation.vault_lamports, 1_000_000);
        assert_eq!(observation.dest_lamports, 1_000_000);
    }


    #[test]
    fn unshield_sol_rejects_zero_nullifier_amount_or_public_hash() {
        fn run_case(
            nullifier: [u8; HASH_LEN],
            exit_amount: u64,
            public_inputs_hash: [u8; HASH_LEN],
        ) -> ProgramResult {
            let program_id = Pubkey::new_unique();
            let pool_state = Pubkey::new_unique();
            let tree_state = Pubkey::new_unique();
            let nullifier_set = Pubkey::new_unique();
            let destination = Pubkey::new_unique();
            let signer = Pubkey::new_unique();
            let system_program_id = system_program::ID;

            let (vault_asset_record, _) =
                vault_asset_record_pda(&program_id, &pool_state, &NATIVE_SOL_ASSET_ID_SENTINEL);
            let (sol_vault_holding_key, _) = sol_vault_pda(&program_id, &pool_state);
            let nullifier_marker_key =
                nullifier_marker_pubkey(&program_id, &pool_state, &nullifier);

            let mut pool_lamports = 1_000_000u64;
            let mut tree_lamports = 1_000_000u64;
            let mut null_lamports = 1_000_000u64;
            let mut asset_rec_lamports = 1_000_000u64;
            let mut vault_lamports = 1_000_000u64;
            let mut dest_lamports = 1_000_000u64;
            let mut cpi_lamports = 1_000_000u64;
            let mut signer_lamports = 2_000_000u64;
            let mut marker_lamports = 0u64;

            let mut pool_data = vec![0u8; POOL_STATE_LEN];
            pool_data[..8].copy_from_slice(POOL_MAGIC);
            pool_data[8] = VERSION;
            let mut tree_data = vec![0u8; 128];
            let mut null_data = vec![0u8; 64];
            let mut asset_rec_data = vec![0u8; VAULT_ASSET_ACCOUNT_LEN];
            write_sol_vault_asset_record_data(
                &mut asset_rec_data,
                &pool_state,
                &NATIVE_SOL_ASSET_ID_SENTINEL,
                &sol_vault_holding_key,
                VAULT_ASSET_KIND_SOL,
            );
            let mut vault_data: Vec<u8> = vec![0; 0];
            let mut dest_data: Vec<u8> = vec![0; 0];
            let mut cpi_data: Vec<u8> = vec![0; 0];
            let mut signer_data: Vec<u8> = vec![0; 0];
            let mut marker_data: Vec<u8> = vec![0; NULLIFIER_MARKER_LEN];

            let pool = account_info(
                &pool_state,
                &program_id,
                true,
                false,
                &mut pool_lamports,
                &mut pool_data,
            );
            let tree = account_info(
                &tree_state,
                &program_id,
                true,
                false,
                &mut tree_lamports,
                &mut tree_data,
            );
            let nulls = account_info(
                &nullifier_set,
                &program_id,
                false,
                false,
                &mut null_lamports,
                &mut null_data,
            );
            let asset = account_info(
                &vault_asset_record,
                &program_id,
                false,
                false,
                &mut asset_rec_lamports,
                &mut asset_rec_data,
            );
            let vault = account_info(
                &sol_vault_holding_key,
                &program_id,
                true,
                false,
                &mut vault_lamports,
                &mut vault_data,
            );
            let dest = account_info(
                &destination,
                &system_program::ID,
                true,
                false,
                &mut dest_lamports,
                &mut dest_data,
            );
            let cpi = account_info(
                &system_program_id,
                &system_program_id,
                false,
                false,
                &mut cpi_lamports,
                &mut cpi_data,
            );
            let sig = account_info(
                &signer,
                &system_program::ID,
                true,
                true,
                &mut signer_lamports,
                &mut signer_data,
            );
            let marker = account_info(
                &nullifier_marker_key,
                &program_id,
                true,
                false,
                &mut marker_lamports,
                &mut marker_data,
            );
            let accounts = vec![pool, tree, nulls, asset, vault, dest, cpi, sig, marker];

            let mut data = vec![TAG_UNSHIELD];
            data.extend_from_slice(&nullifier);
            data.extend_from_slice(&[1u8; HASH_LEN]);
            data.extend_from_slice(&NATIVE_SOL_ASSET_ID_SENTINEL);
            data.extend_from_slice(&exit_amount.to_le_bytes());
            data.extend_from_slice(&public_inputs_hash);

            process_instruction(&program_id, &accounts, &data)
        }

        assert_eq!(
            run_case([0u8; HASH_LEN], 1, [9u8; HASH_LEN]),
            Err(ProgramError::InvalidInstructionData),
        );
        assert_eq!(
            run_case([12u8; HASH_LEN], 0, [9u8; HASH_LEN]),
            Err(ProgramError::InvalidInstructionData),
        );
        assert_eq!(
            run_case([12u8; HASH_LEN], 1, [0u8; HASH_LEN]),
            Err(ProgramError::InvalidInstructionData),
        );
    }

    // Additional Crucible/fuzz-ready SOL TAG6 preflight tests (per design doc §11 + status note checklist)
    // These exercise sentinel handling, PDA derivation, generalized kind=2 preflights, error paths.
    // Ready for extension into full Crucible invariant fuzz (see fuzz/vanta_private_pool_v2_spend/src/main.rs TODOs).

    #[test]
    fn unshield_sol_sentinel_mismatch_fails() {
        assert_eq!(
            run_sol_unshield_reserved_process(
                POOL_VERIFIER_NOT_WIRED,
                [7u8; HASH_LEN],
                VAULT_ASSET_KIND_SOL,
                None,
                [12u8; HASH_LEN],
                1,
                [9u8; HASH_LEN],
            ),
            Err(ProgramError::Custom(ERR_VAULT_ASSET_MISMATCH))
        );
    }


    #[test]
    fn unshield_sol_vault_pda_mismatch_fails() {
        assert_eq!(
            run_sol_unshield_reserved_process(
                POOL_VERIFIER_NOT_WIRED,
                NATIVE_SOL_ASSET_ID_SENTINEL,
                VAULT_ASSET_KIND_SOL,
                Some(Pubkey::new_unique()),
                [13u8; HASH_LEN],
                1,
                [9u8; HASH_LEN],
            ),
            Err(ProgramError::Custom(ERR_VAULT_PDA_MISMATCH))
        );
    }


    #[test]
    fn unshield_invalid_asset_kind_fails() {
        assert_eq!(
            run_sol_unshield_reserved_process(
                POOL_VERIFIER_NOT_WIRED,
                NATIVE_SOL_ASSET_ID_SENTINEL,
                99u8,
                None,
                [8u8; HASH_LEN],
                1,
                [9u8; HASH_LEN],
            ),
            Err(ProgramError::Custom(ERR_INVALID_ASSET_KIND))
        );
    }


    // A future verifier setter must not make TAG6 release sufficient by itself. Until item 9 lands
    // proof/root/public-input/nullifier acceptance, even verifier_wired=1 returns not-wired before mutation.
    #[test]
    fn unshield_sol_verifier_wired_one_still_rejects_until_verifier_acceptance() {
        assert_eq!(
            run_sol_unshield_reserved_process(
                POOL_VERIFIER_WIRED,
                NATIVE_SOL_ASSET_ID_SENTINEL,
                VAULT_ASSET_KIND_SOL,
                None,
                [42u8; HASH_LEN],
                123_456,
                [7u8; HASH_LEN],
            ),
            Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
        );
    }


    // PDA derivation test exercising the new top-level sol_vault_pda / vault_asset_record_pda helpers.
    // Confirms correct seeds per design doc §11. Ready for Crucible extension (invariant: derived PDA always matches on-chain expectation).
    #[test]
    fn sol_vault_and_asset_record_pda_derivation_matches_design() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();

        let (sol_vault, bump) = sol_vault_pda(&program_id, &pool_state);
        let (expected_manual, manual_bump) = Pubkey::find_program_address(
            &[
                SOL_VAULT_SEED,
                pool_state.as_ref(),
                &NATIVE_SOL_ASSET_ID_SENTINEL,
            ],
            &program_id,
        );
        assert_eq!(sol_vault, expected_manual);
        assert_eq!(bump, manual_bump);

        let (asset_rec, _b) =
            vault_asset_record_pda(&program_id, &pool_state, &NATIVE_SOL_ASSET_ID_SENTINEL);
        let (expected_asset, _) = Pubkey::find_program_address(
            &[
                ASSET_RECORD_SEED,
                pool_state.as_ref(),
                &NATIVE_SOL_ASSET_ID_SENTINEL,
            ],
            &program_id,
        );
        assert_eq!(asset_rec, expected_asset);

        // Non-sentinel (future SPL example) also derives cleanly.
        let spl_mint_id = [0xAAu8; 32];
        let (_spl_asset, _) = vault_asset_record_pda(&program_id, &pool_state, &spl_mint_id);
    }
}
