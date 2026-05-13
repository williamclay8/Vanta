use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
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
const TAG_UNSHIELD: u8 = 6;

const VERSION: u8 = 1;
const POOL_MAGIC: &[u8; 8] = b"VNTA2POL";
const NULLIFIER_MAGIC: &[u8; 8] = b"VNTA2NUL";
const NULLIFIER_MARKER_MAGIC: &[u8; 8] = b"VNTA2NMK";
const OUTPUT_MAGIC: &[u8; 8] = b"VNTA2OUT";
const OUTPUT_RECORD_MAGIC: &[u8; 8] = b"VNTA2ORC";
const ROOT_MAGIC: &[u8; 8] = b"VNTA2ROT";
const ROOT_RECORD_MAGIC: &[u8; 8] = b"VNTA2RRC";
const VERIFIER_KEY_MAGIC: &[u8; 8] = b"VNTA2VKY";
const NULLIFIER_MARKER_SEED: &[u8] = b"vanta2nul";
const OUTPUT_RECORD_SEED: &[u8] = b"vanta2out";
const ROOT_RECORD_SEED: &[u8] = b"vanta2root";
const VAULT_AUTHORITY_SEED: &[u8] = b"vanta2vault";
const VERIFIER_KEY_SEED: &[u8] = b"vanta2vkey";

const HEADER_LEN: usize = 16;
const COUNT_OFFSET: usize = 12;
const POOL_STATE_LEN: usize = 184;
const POOL_SPEND_COUNT_OFFSET: usize = 16;
const POOL_AUTHORITY_OFFSET: usize = 24;
const POOL_LAST_PUBLIC_INPUT_HASH_OFFSET: usize = 56;
const POOL_NULLIFIER_SET_OFFSET: usize = 88;
const POOL_OUTPUT_QUEUE_OFFSET: usize = 120;
const POOL_ROOT_HISTORY_OFFSET: usize = 152;

const HASH_LEN: usize = 32;
const EXIT_AMOUNT_LEN: usize = 8;
const SPEND_PAYLOAD_LEN: usize = 1 + HASH_LEN * 5;
const RESERVED_GROTH16_PROOF_LEN: usize = 256;
const SPEND_WITH_PROOF_PAYLOAD_LEN: usize =
    SPEND_PAYLOAD_LEN + HASH_LEN + RESERVED_GROTH16_PROOF_LEN;
const PROVENANCED_ROOT_ACCEPTED_ROOT_OFFSET: usize = 0;
const PROVENANCED_ROOT_PREVIOUS_ROOT_OFFSET: usize = HASH_LEN;
const PROVENANCED_ROOT_TRANSITION_PUBLIC_INPUT_HASH_OFFSET: usize = HASH_LEN * 2;
const PROVENANCED_ROOT_LEAF_INDEX_BASE_OFFSET: usize = HASH_LEN * 3;
const PROVENANCED_ROOT_LEAF_COUNT_OFFSET: usize = PROVENANCED_ROOT_LEAF_INDEX_BASE_OFFSET + 8;
const PROVENANCED_ROOT_TRANSITION_KIND_OFFSET: usize = PROVENANCED_ROOT_LEAF_COUNT_OFFSET + 4;
const PROVENANCED_ROOT_PAYLOAD_LEN: usize = 1 + PROVENANCED_ROOT_TRANSITION_KIND_OFFSET + 1;
const UNSHIELD_ACCEPTED_ROOT_OFFSET: usize = HASH_LEN;
const UNSHIELD_EXIT_DESTINATION_OFFSET: usize = HASH_LEN * 2;
const UNSHIELD_EXIT_ASSET_ID_OFFSET: usize = HASH_LEN * 3;
const UNSHIELD_EXIT_AMOUNT_OFFSET: usize = HASH_LEN * 4;
const UNSHIELD_PUBLIC_INPUT_HASH_OFFSET: usize = UNSHIELD_EXIT_AMOUNT_OFFSET + EXIT_AMOUNT_LEN;
const UNSHIELD_PROOF_OFFSET: usize = UNSHIELD_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN;
const UNSHIELD_PAYLOAD_LEN: usize = 1 + UNSHIELD_PROOF_OFFSET + RESERVED_GROTH16_PROOF_LEN;
const REGISTER_ROOT_PAYLOAD_LEN: usize = 1 + HASH_LEN;
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
const VERIFIER_KEY_ACCOUNT_LEN: usize = HEADER_LEN + HASH_LEN * 2;
const VERIFIER_KEY_POOL_OFFSET: usize = HEADER_LEN;
const VERIFIER_KEY_HASH_OFFSET: usize = HEADER_LEN + HASH_LEN;

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
const ERR_UNSHIELD_RELEASE_NOT_WIRED: u32 = 15;
const ERR_VAULT_AUTHORITY_MISMATCH: u32 = 16;
const ERR_VERIFIER_KEY_MISMATCH: u32 = 17;
const ERR_ROOT_RECORD_MISMATCH: u32 = 18;

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
        TAG_UNSHIELD => process_unshield(program_id, accounts, rest),
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
    let authority = next_account_info(&mut account_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    require_writable_program_account(program_id, pool_state)?;
    require_writable_program_account(program_id, nullifier_set)?;
    require_writable_program_account(program_id, output_queue)?;
    require_writable_program_account(program_id, root_history)?;

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
    }

    init_fixed_slot_account(nullifier_set, NULLIFIER_MAGIC, HASH_LEN)?;
    init_output_index_account(output_queue)?;
    init_fixed_slot_account(root_history, ROOT_MAGIC, HASH_LEN)?;

    msg!("vanta_private_pool_v2_spend: initialized account headers");
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

    require_readonly_program_account(program_id, pool_state)?;
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

fn process_register_provenanced_root(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> ProgramResult {
    if rest.len() + 1 != PROVENANCED_ROOT_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let accepted_root = &rest
        [PROVENANCED_ROOT_ACCEPTED_ROOT_OFFSET..PROVENANCED_ROOT_ACCEPTED_ROOT_OFFSET + HASH_LEN];
    let previous_root = &rest
        [PROVENANCED_ROOT_PREVIOUS_ROOT_OFFSET..PROVENANCED_ROOT_PREVIOUS_ROOT_OFFSET + HASH_LEN];
    let transition_public_input_hash = &rest[PROVENANCED_ROOT_TRANSITION_PUBLIC_INPUT_HASH_OFFSET
        ..PROVENANCED_ROOT_TRANSITION_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN];
    let leaf_index_base = read_u64(rest, PROVENANCED_ROOT_LEAF_INDEX_BASE_OFFSET)?;
    let leaf_count = read_u32(rest, PROVENANCED_ROOT_LEAF_COUNT_OFFSET)?;
    let transition_kind = rest[PROVENANCED_ROOT_TRANSITION_KIND_OFFSET];

    if accepted_root.iter().all(|byte| *byte == 0)
        || transition_public_input_hash.iter().all(|byte| *byte == 0)
        || leaf_count == 0
        || transition_kind == 0
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let root_history = next_account_info(&mut account_iter)?;
    let root_record = next_account_info(&mut account_iter)?;
    let authority = next_account_info(&mut account_iter)?;
    let system_program_info = next_account_info(&mut account_iter)?;

    require_readonly_program_account(program_id, pool_state)?;
    require_writable_program_account(program_id, root_history)?;
    require_writable_account(root_record)?;
    require_system_program(system_program_info)?;
    if root_record.owner != program_id && !authority.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }

    let pool_data = pool_state.try_borrow_data()?;
    let mut root_data = root_history.try_borrow_mut_data()?;
    require_pool_header(&pool_data)?;
    require_authority(&pool_data, authority)?;
    require_pool_root_history_binding(&pool_data, root_history)?;
    require_fixed_slot_header(&root_data, ROOT_MAGIC, HASH_LEN)?;
    require_root_record_available(program_id, pool_state, root_record, accepted_root)?;

    if fixed_slot_contains(&root_data, HASH_LEN, accepted_root)? {
        return Err(ProgramError::Custom(ERR_DUPLICATE_ROOT));
    }

    let root_count = read_count(&root_data)? as usize;
    let root_capacity = fixed_slot_capacity(&root_data, HASH_LEN)?;
    if root_count >= root_capacity {
        return Err(ProgramError::Custom(ERR_ROOT_HISTORY_FULL));
    }
    require_previous_root_matches_history(&root_data, root_count, previous_root)?;

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

fn process_spend_with_proof(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    rest: &[u8],
) -> ProgramResult {
    if rest.len() + 1 != SPEND_WITH_PROOF_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let nullifier = &rest[0..32];
    let output0 = &rest[32..64];
    let output1 = &rest[64..96];
    let accepted_root = &rest[96..128];
    let public_input_hash = &rest[128..160];
    let verifier_key_hash = &rest[160..192];
    let proof = &rest[192..448];
    if nullifier.iter().all(|byte| *byte == 0)
        || output0.iter().all(|byte| *byte == 0)
        || output1.iter().all(|byte| *byte == 0)
        || accepted_root.iter().all(|byte| *byte == 0)
        || public_input_hash.iter().all(|byte| *byte == 0)
        || verifier_key_hash.iter().all(|byte| *byte == 0)
        || proof.iter().all(|byte| *byte == 0)
    {
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

    require_readonly_program_account(program_id, pool_state)?;
    require_readonly_program_account(program_id, nullifier_set)?;
    require_readonly_program_account(program_id, output_queue)?;
    require_readonly_program_account(program_id, root_history)?;
    require_writable_account(nullifier_marker)?;
    require_writable_account(output_record)?;

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
    require_verifier_key_hash(program_id, pool_state, verifier_key, verifier_key_hash)?;

    msg!("vanta_private_pool_v2_spend: proof-carrying spend ABI is reserved; verifier not wired after root/nullifier/output/verifier-key preflight");
    Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
}

fn process_unshield(program_id: &Pubkey, accounts: &[AccountInfo], rest: &[u8]) -> ProgramResult {
    if rest.len() + 1 != UNSHIELD_PAYLOAD_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let nullifier = &rest[0..HASH_LEN];
    let accepted_root = &rest[UNSHIELD_ACCEPTED_ROOT_OFFSET..UNSHIELD_EXIT_DESTINATION_OFFSET];
    let exit_destination = &rest[UNSHIELD_EXIT_DESTINATION_OFFSET..UNSHIELD_EXIT_ASSET_ID_OFFSET];
    let exit_asset_id = &rest[UNSHIELD_EXIT_ASSET_ID_OFFSET..UNSHIELD_EXIT_AMOUNT_OFFSET];
    let exit_amount = &rest[UNSHIELD_EXIT_AMOUNT_OFFSET..UNSHIELD_PUBLIC_INPUT_HASH_OFFSET];
    let public_input_hash = &rest[UNSHIELD_PUBLIC_INPUT_HASH_OFFSET..UNSHIELD_PROOF_OFFSET];
    let proof = &rest[UNSHIELD_PROOF_OFFSET..UNSHIELD_PROOF_OFFSET + RESERVED_GROTH16_PROOF_LEN];

    if nullifier.iter().all(|byte| *byte == 0)
        || accepted_root.iter().all(|byte| *byte == 0)
        || exit_destination.iter().all(|byte| *byte == 0)
        || exit_asset_id.iter().all(|byte| *byte == 0)
        || exit_amount.iter().all(|byte| *byte == 0)
        || public_input_hash.iter().all(|byte| *byte == 0)
        || proof.iter().all(|byte| *byte == 0)
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut account_iter = accounts.iter();
    let pool_state = next_account_info(&mut account_iter)?;
    let root_history = next_account_info(&mut account_iter)?;
    let root_record = next_account_info(&mut account_iter)?;
    let nullifier_marker = next_account_info(&mut account_iter)?;
    let vault_authority = next_account_info(&mut account_iter)?;

    require_program_account(program_id, pool_state)?;
    require_readonly_program_account(program_id, root_history)?;
    require_writable_account(nullifier_marker)?;

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
    require_vault_authority(program_id, pool_state, vault_authority, exit_asset_id)?;

    msg!("vanta_private_pool_v2_spend: proof-verified unshield release ABI passed root/root-record/nullifier/vault-authority preflight; release not wired");
    Err(ProgramError::Custom(ERR_UNSHIELD_RELEASE_NOT_WIRED))
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

fn require_pool_header(data: &[u8]) -> ProgramResult {
    if data.len() < POOL_STATE_LEN || &data[..8] != POOL_MAGIC || data[8] != VERSION {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    Ok(())
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
        require_root_record_data(record_data.as_ref(), pool_state, accepted_root)?;
        return Err(ProgramError::Custom(ERR_DUPLICATE_ROOT));
    }

    if root_record.owner != &system_program::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    let record_data = root_record.try_borrow_data()?;
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
        require_root_record_data(record_data.as_ref(), pool_state, accepted_root)?;
        return Err(ProgramError::Custom(ERR_DUPLICATE_ROOT));
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
    require_readonly_program_account(program_id, root_record)?;
    let record_data = root_record.try_borrow_data()?;
    require_root_record_data(record_data.as_ref(), pool_state, accepted_root)
}

fn require_root_record_data(
    record_data: &[u8],
    pool_state: &AccountInfo,
    accepted_root: &[u8],
) -> ProgramResult {
    if record_data.len() != ROOT_RECORD_ACCOUNT_LEN
        || &record_data[..8] != ROOT_RECORD_MAGIC
        || record_data[8] != VERSION
        || read_count(record_data)? != 1
    {
        return Err(ProgramError::Custom(ERR_INVALID_HEADER));
    }
    if record_data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN]
        != *pool_state.key.as_ref()
        || &record_data
            [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN]
            != accepted_root
    {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }
    let transition_public_input_hash = &record_data[ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET
        ..ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN];
    if transition_public_input_hash.iter().all(|byte| *byte == 0)
        || read_u32(record_data, ROOT_RECORD_LEAF_COUNT_OFFSET)? == 0
        || record_data[ROOT_RECORD_TRANSITION_KIND_OFFSET] == 0
    {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }
    Ok(())
}

fn require_previous_root_matches_history(
    root_data: &[u8],
    root_count: usize,
    previous_root: &[u8],
) -> ProgramResult {
    if previous_root.len() != HASH_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }
    if root_count == 0 {
        if previous_root.iter().any(|byte| *byte != 0) {
            return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
        }
        return Ok(());
    }

    let start = HEADER_LEN + (root_count - 1) * HASH_LEN;
    let last_root = root_data
        .get(start..start + HASH_LEN)
        .ok_or(ProgramError::AccountDataTooSmall)?;
    if last_root != previous_root {
        return Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH));
    }
    Ok(())
}

fn require_vault_authority(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    vault_authority: &AccountInfo,
    exit_asset_id: &[u8],
) -> ProgramResult {
    if exit_asset_id.len() != HASH_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

    let (expected_authority, _) = Pubkey::find_program_address(
        &[VAULT_AUTHORITY_SEED, pool_state.key.as_ref(), exit_asset_id],
        program_id,
    );
    if expected_authority != *vault_authority.key {
        return Err(ProgramError::Custom(ERR_VAULT_AUTHORITY_MISMATCH));
    }
    if vault_authority.is_writable || vault_authority.is_signer {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(())
}

fn require_verifier_key_hash(
    program_id: &Pubkey,
    pool_state: &AccountInfo,
    verifier_key: &AccountInfo,
    verifier_key_hash: &[u8],
) -> ProgramResult {
    if verifier_key_hash.len() != HASH_LEN {
        return Err(ProgramError::InvalidInstructionData);
    }

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
    require_readonly_program_account(program_id, verifier_key)?;

    let key_data = verifier_key.try_borrow_data()?;
    if key_data.len() < VERIFIER_KEY_ACCOUNT_LEN
        || &key_data[..8] != VERIFIER_KEY_MAGIC
        || key_data[8] != VERSION
        || read_count(&key_data)? != 1
        || key_data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN]
            != *pool_state.key.as_ref()
        || &key_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
            != verifier_key_hash
    {
        return Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH));
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
    if data.len() != ROOT_RECORD_ACCOUNT_LEN
        || previous_root.len() != HASH_LEN
        || accepted_root.len() != HASH_LEN
        || transition_public_input_hash.len() != HASH_LEN
        || leaf_count == 0
        || transition_kind == 0
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

fn write_u64(data: &mut [u8], offset: usize, value: u64) -> ProgramResult {
    let bytes = data
        .get_mut(offset..offset + 8)
        .ok_or(ProgramError::AccountDataTooSmall)?;
    bytes.copy_from_slice(&value.to_le_bytes());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::clock::Epoch;

    #[test]
    fn spend_rejects_signer_that_is_not_the_initialized_authority() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
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
        let mut marker_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut impostor_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut output_record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

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
    fn provenanced_root_registration_writes_root_record_and_rejects_duplicates() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let accepted_root = [4; HASH_LEN];
        let root_record = root_record_pubkey(&program_id, &pool_state, &accepted_root);
        let wrong_root_record = Pubkey::new_unique();
        let system_program_id = system_program::ID;
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut root_record_lamports = 1_000_000;
        let mut wrong_root_record_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut root_record_data = vec![0; ROOT_RECORD_ACCOUNT_LEN];
        let mut wrong_root_record_data = vec![0; ROOT_RECORD_ACCOUNT_LEN];
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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Ok(())
            );
        }

        let before_wrong_record = (
            pool_data.clone(),
            root_data.clone(),
            root_record_data.clone(),
            wrong_root_record_data.clone(),
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
            let root = account_info(
                &wrong_root_record,
                &program_id,
                true,
                false,
                &mut wrong_root_record_lamports,
                &mut wrong_root_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction()
                ),
                Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH))
            );
        }
        assert_eq!(
            before_wrong_record,
            (
                pool_data.clone(),
                root_data.clone(),
                root_record_data.clone(),
                wrong_root_record_data
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
            let root = account_info(
                &root_record,
                &program_id,
                true,
                false,
                &mut root_record_lamports,
                &mut root_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction()
                ),
                Ok(())
            );
        }

        assert_eq!(read_count(&root_data), Ok(1));
        assert_eq!(
            &root_data[HEADER_LEN..HEADER_LEN + HASH_LEN],
            &accepted_root
        );
        assert_eq!(&root_record_data[..8], ROOT_RECORD_MAGIC);
        assert_eq!(read_count(&root_record_data), Ok(1));
        assert_eq!(
            read_u64(&root_record_data, ROOT_RECORD_SEQUENCE_OFFSET),
            Ok(0)
        );
        assert_eq!(
            &root_record_data[ROOT_RECORD_POOL_OFFSET..ROOT_RECORD_POOL_OFFSET + HASH_LEN],
            pool_state.as_ref()
        );
        assert_eq!(
            &root_record_data
                [ROOT_RECORD_ACCEPTED_ROOT_OFFSET..ROOT_RECORD_ACCEPTED_ROOT_OFFSET + HASH_LEN],
            &accepted_root
        );
        assert_eq!(
            &root_record_data[ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET
                ..ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
            &[8; HASH_LEN]
        );
        assert_eq!(
            read_u64(&root_record_data, ROOT_RECORD_LEAF_INDEX_BASE_OFFSET),
            Ok(9)
        );
        assert_eq!(
            read_u32(&root_record_data, ROOT_RECORD_LEAF_COUNT_OFFSET),
            Ok(2)
        );
        assert_eq!(root_record_data[ROOT_RECORD_TRANSITION_KIND_OFFSET], 1);

        let before_duplicate = (root_data.clone(), root_record_data.clone());
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
            let root = account_info(
                &root_record,
                &program_id,
                true,
                false,
                &mut root_record_lamports,
                &mut root_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction()
                ),
                Err(ProgramError::Custom(ERR_DUPLICATE_ROOT))
            );
        }
        assert_eq!(before_duplicate, (root_data, root_record_data));
    }

    #[test]
    fn provenanced_root_registration_requires_root_history_lineage() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let first_root = [4; HASH_LEN];
        let second_root = [9; HASH_LEN];
        let first_root_record = root_record_pubkey(&program_id, &pool_state, &first_root);
        let second_root_record = root_record_pubkey(&program_id, &pool_state, &second_root);
        let system_program_id = system_program::ID;
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut first_record_lamports = 1_000_000;
        let mut second_record_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut first_record_data = vec![0; ROOT_RECORD_ACCOUNT_LEN];
        let mut second_record_data = vec![0; ROOT_RECORD_ACCOUNT_LEN];
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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Ok(())
            );
        }

        let before_wrong_bootstrap = (root_data.clone(), first_record_data.clone());
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
            let root = account_info(
                &first_root_record,
                &program_id,
                true,
                false,
                &mut first_record_lamports,
                &mut first_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction_with(first_root, [7; HASH_LEN])
                ),
                Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH))
            );
        }
        assert_eq!(
            before_wrong_bootstrap,
            (root_data.clone(), first_record_data.clone())
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
            let root = account_info(
                &first_root_record,
                &program_id,
                true,
                false,
                &mut first_record_lamports,
                &mut first_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction_with(first_root, [0; HASH_LEN])
                ),
                Ok(())
            );
        }

        let before_wrong_lineage = (root_data.clone(), second_record_data.clone());
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
            let root = account_info(
                &second_root_record,
                &program_id,
                true,
                false,
                &mut second_record_lamports,
                &mut second_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction_with(second_root, [8; HASH_LEN])
                ),
                Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH))
            );
        }
        assert_eq!(
            before_wrong_lineage,
            (root_data.clone(), second_record_data.clone())
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
            let root = account_info(
                &second_root_record,
                &program_id,
                true,
                false,
                &mut second_record_lamports,
                &mut second_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction_with(second_root, first_root)
                ),
                Ok(())
            );
        }

        assert_eq!(read_count(&root_data), Ok(2));
        assert_eq!(
            &second_record_data
                [ROOT_RECORD_PREVIOUS_ROOT_OFFSET..ROOT_RECORD_PREVIOUS_ROOT_OFFSET + HASH_LEN],
            &first_root
        );
    }

    #[test]
    fn root_record_validation_rejects_malformed_metadata() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let accepted_root = [4; HASH_LEN];
        let transition_public_input_hash = [8; HASH_LEN];
        let previous_root = [0; HASH_LEN];
        let mut pool_lamports = 1_000_000;
        let mut pool_data = [];
        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let mut record_data = vec![0; ROOT_RECORD_ACCOUNT_LEN];

        assert_eq!(
            write_root_record(
                &mut record_data,
                &pool,
                0,
                &previous_root,
                &accepted_root,
                &transition_public_input_hash,
                9,
                2,
                1
            ),
            Ok(())
        );
        assert_eq!(
            require_root_record_data(&record_data, &pool, &accepted_root),
            Ok(())
        );

        let mut zero_transition_hash = record_data.clone();
        zero_transition_hash[ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET
            ..ROOT_RECORD_TRANSITION_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN]
            .fill(0);
        assert_eq!(
            require_root_record_data(&zero_transition_hash, &pool, &accepted_root),
            Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH))
        );

        let mut zero_leaf_count = record_data.clone();
        assert_eq!(
            write_u32(&mut zero_leaf_count, ROOT_RECORD_LEAF_COUNT_OFFSET, 0),
            Ok(())
        );
        assert_eq!(
            require_root_record_data(&zero_leaf_count, &pool, &accepted_root),
            Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH))
        );

        let mut zero_transition_kind = record_data.clone();
        zero_transition_kind[ROOT_RECORD_TRANSITION_KIND_OFFSET] = 0;
        assert_eq!(
            require_root_record_data(&zero_transition_kind, &pool, &accepted_root),
            Err(ProgramError::Custom(ERR_ROOT_RECORD_MISMATCH))
        );

        let mut oversized_record = record_data;
        oversized_record.push(0);
        assert_eq!(
            require_root_record_data(&oversized_record, &pool, &accepted_root),
            Err(ProgramError::Custom(ERR_INVALID_HEADER))
        );
    }

    #[test]
    fn proof_carrying_spend_preflights_accounts_before_fail_closed_verifier() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let root_record = root_record_pubkey(&program_id, &pool_state, &[4; HASH_LEN]);
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &[1; HASH_LEN]);
        let output_record = output_record_pubkey(&program_id, &pool_state, &[5; HASH_LEN]);
        let verifier_key = verifier_key_pubkey(&program_id, &pool_state, &[6; HASH_LEN]);
        let system_program_id = system_program::ID;
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut root_record_lamports = 1_000_000;
        let mut marker_lamports = 1_000_000;
        let mut record_lamports = 1_000_000;
        let mut verifier_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut root_record_data = vec![0; ROOT_RECORD_ACCOUNT_LEN];
        let mut marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut verifier_data = vec![0; VERIFIER_KEY_ACCOUNT_LEN];
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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Ok(())
            );
        }

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
            let root = account_info(
                &root_record,
                &program_id,
                true,
                false,
                &mut root_record_lamports,
                &mut root_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction()
                ),
                Ok(())
            );
        }
        write_verifier_key_account(&mut verifier_data, &pool_state, &[6; HASH_LEN]).unwrap();

        let before = (
            pool_data.clone(),
            nullifier_data.clone(),
            output_data.clone(),
            root_data.clone(),
            root_record_data.clone(),
            marker_data.clone(),
            record_data.clone(),
            verifier_data.clone(),
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
                false,
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
            let root = account_info(
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
            let record = account_info(
                &output_record,
                &program_id,
                true,
                false,
                &mut record_lamports,
                &mut record_data,
            );
            let verifier = account_info(
                &verifier_key,
                &program_id,
                false,
                false,
                &mut verifier_lamports,
                &mut verifier_data,
            );
            let accounts = vec![
                pool, nullifier, output, roots, root, marker, record, verifier,
            ];

            assert_eq!(
                process_instruction(&program_id, &accounts, &spend_with_proof_instruction()),
                Err(ProgramError::Custom(ERR_PROOF_VERIFIER_NOT_WIRED))
            );
        }

        assert_eq!(
            before,
            (
                pool_data,
                nullifier_data,
                output_data,
                root_data,
                root_record_data,
                marker_data,
                record_data,
                verifier_data,
            )
        );
    }

    #[test]
    fn proof_carrying_spend_requires_accounts_and_registered_root() {
        let program_id = Pubkey::new_unique();

        assert_eq!(
            process_instruction(&program_id, &[], &spend_with_proof_instruction()),
            Err(ProgramError::NotEnoughAccountKeys)
        );

        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let root_record = root_record_pubkey(&program_id, &pool_state, &[4; HASH_LEN]);
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &[1; HASH_LEN]);
        let output_record = output_record_pubkey(&program_id, &pool_state, &[5; HASH_LEN]);
        let verifier_key = verifier_key_pubkey(&program_id, &pool_state, &[6; HASH_LEN]);
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut root_record_lamports = 1_000_000;
        let mut marker_lamports = 1_000_000;
        let mut record_lamports = 1_000_000;
        let mut verifier_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut root_record_data = vec![0; ROOT_RECORD_ACCOUNT_LEN];
        let mut marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut verifier_data = vec![0; VERIFIER_KEY_ACCOUNT_LEN];

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
        write_verifier_key_account(&mut verifier_data, &pool_state, &[6; HASH_LEN]).unwrap();

        let pool = account_info(
            &pool_state,
            &program_id,
            false,
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
            false,
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
        let root = account_info(
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
        let record = account_info(
            &output_record,
            &program_id,
            true,
            false,
            &mut record_lamports,
            &mut record_data,
        );
        let verifier = account_info(
            &verifier_key,
            &program_id,
            false,
            false,
            &mut verifier_lamports,
            &mut verifier_data,
        );
        let accounts = vec![
            pool, nullifier, output, roots, root, marker, record, verifier,
        ];

        assert_eq!(
            process_instruction(&program_id, &accounts, &spend_with_proof_instruction()),
            Err(ProgramError::Custom(ERR_UNKNOWN_ACCEPTED_ROOT))
        );
    }

    #[test]
    fn proof_carrying_spend_rejects_wrong_verifier_key_account() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let wrong_verifier_key = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut verifier_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut verifier_data = vec![0; VERIFIER_KEY_ACCOUNT_LEN];

        pool_data[..8].copy_from_slice(POOL_MAGIC);
        pool_data[8] = VERSION;
        write_verifier_key_account(&mut verifier_data, &pool_state, &[6; HASH_LEN]).unwrap();

        let pool = account_info(
            &pool_state,
            &program_id,
            false,
            false,
            &mut pool_lamports,
            &mut pool_data,
        );
        let verifier = account_info(
            &wrong_verifier_key,
            &program_id,
            false,
            false,
            &mut verifier_lamports,
            &mut verifier_data,
        );

        assert_eq!(
            require_verifier_key_hash(&program_id, &pool, &verifier, &[6; HASH_LEN]),
            Err(ProgramError::Custom(ERR_VERIFIER_KEY_MISMATCH))
        );
    }

    #[test]
    fn proof_carrying_spend_requires_exact_reserved_payload_length() {
        let program_id = Pubkey::new_unique();

        assert_eq!(
            process_instruction(&program_id, &[], &[TAG_SPEND_WITH_PROOF]),
            Err(ProgramError::InvalidInstructionData)
        );

        let mut too_long = spend_with_proof_instruction();
        too_long.push(1);
        assert_eq!(
            process_instruction(&program_id, &[], &too_long),
            Err(ProgramError::InvalidInstructionData)
        );
    }

    #[test]
    fn proof_carrying_spend_rejects_zero_verifier_or_proof_placeholders() {
        let program_id = Pubkey::new_unique();

        let mut zero_verifier_key_hash = spend_with_proof_instruction();
        zero_verifier_key_hash[SPEND_PAYLOAD_LEN..SPEND_PAYLOAD_LEN + HASH_LEN].fill(0);
        assert_eq!(
            process_instruction(&program_id, &[], &zero_verifier_key_hash),
            Err(ProgramError::InvalidInstructionData)
        );

        let mut zero_proof = spend_with_proof_instruction();
        zero_proof[SPEND_PAYLOAD_LEN + HASH_LEN..SPEND_WITH_PROOF_PAYLOAD_LEN].fill(0);
        assert_eq!(
            process_instruction(&program_id, &[], &zero_proof),
            Err(ProgramError::InvalidInstructionData)
        );
    }

    #[test]
    fn unshield_release_preflights_vault_authority_before_fail_closed_release() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let root_record = root_record_pubkey(&program_id, &pool_state, &[4; HASH_LEN]);
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &[1; HASH_LEN]);
        let vault_authority = vault_authority_pubkey(&program_id, &pool_state, &[3; HASH_LEN]);
        let system_program_id = system_program::ID;
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut root_record_lamports = 1_000_000;
        let mut marker_lamports = 1_000_000;
        let mut vault_lamports = 0;
        let mut authority_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut root_record_data = vec![0; ROOT_RECORD_ACCOUNT_LEN];
        let mut marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut vault_data = [];
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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Ok(())
            );
        }

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
            let root = account_info(
                &root_record,
                &program_id,
                true,
                false,
                &mut root_record_lamports,
                &mut root_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction()
                ),
                Ok(())
            );
        }

        let before = (
            pool_data.clone(),
            root_data.clone(),
            root_record_data.clone(),
            marker_data.clone(),
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
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let root = account_info(
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
            let vault = account_info(
                &vault_authority,
                &system_program::ID,
                false,
                false,
                &mut vault_lamports,
                &mut vault_data,
            );
            let accounts = vec![pool, roots, root, marker, vault];

            assert_eq!(
                process_instruction(&program_id, &accounts, &unshield_instruction()),
                Err(ProgramError::Custom(ERR_UNSHIELD_RELEASE_NOT_WIRED))
            );
        }

        assert_eq!(
            before,
            (pool_data, root_data, root_record_data, marker_data)
        );
    }

    #[test]
    fn unshield_release_reserved_shape_requires_preflight_accounts() {
        let program_id = Pubkey::new_unique();

        assert_eq!(
            process_instruction(&program_id, &[], &unshield_instruction()),
            Err(ProgramError::NotEnoughAccountKeys)
        );
    }

    #[test]
    fn unshield_release_requires_exact_reserved_payload_length() {
        let program_id = Pubkey::new_unique();

        assert_eq!(
            process_instruction(&program_id, &[], &[TAG_UNSHIELD]),
            Err(ProgramError::InvalidInstructionData)
        );

        let mut too_long = unshield_instruction();
        too_long.push(1);
        assert_eq!(
            process_instruction(&program_id, &[], &too_long),
            Err(ProgramError::InvalidInstructionData)
        );
    }

    #[test]
    fn unshield_release_rejects_zero_public_or_proof_placeholders() {
        let program_id = Pubkey::new_unique();

        for (start, end) in [
            (1, 1 + HASH_LEN),
            (
                1 + UNSHIELD_ACCEPTED_ROOT_OFFSET,
                1 + UNSHIELD_EXIT_DESTINATION_OFFSET,
            ),
            (
                1 + UNSHIELD_EXIT_DESTINATION_OFFSET,
                1 + UNSHIELD_EXIT_ASSET_ID_OFFSET,
            ),
            (
                1 + UNSHIELD_EXIT_ASSET_ID_OFFSET,
                1 + UNSHIELD_EXIT_AMOUNT_OFFSET,
            ),
            (
                1 + UNSHIELD_EXIT_AMOUNT_OFFSET,
                1 + UNSHIELD_PUBLIC_INPUT_HASH_OFFSET,
            ),
            (
                1 + UNSHIELD_PUBLIC_INPUT_HASH_OFFSET,
                1 + UNSHIELD_PROOF_OFFSET,
            ),
            (1 + UNSHIELD_PROOF_OFFSET, UNSHIELD_PAYLOAD_LEN),
        ] {
            let mut data = unshield_instruction();
            data[start..end].fill(0);
            assert_eq!(
                process_instruction(&program_id, &[], &data),
                Err(ProgramError::InvalidInstructionData)
            );
        }
    }

    #[test]
    fn unshield_release_rejects_unbound_preflight_accounts_without_mutation() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
        let root_record = root_record_pubkey(&program_id, &pool_state, &[4; HASH_LEN]);
        let nullifier_marker = nullifier_marker_pubkey(&program_id, &pool_state, &[1; HASH_LEN]);
        let wrong_nullifier_marker = Pubkey::new_unique();
        let vault_authority = vault_authority_pubkey(&program_id, &pool_state, &[3; HASH_LEN]);
        let wrong_vault_authority = Pubkey::new_unique();
        let system_program_id = system_program::ID;
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut root_record_lamports = 1_000_000;
        let mut marker_lamports = 1_000_000;
        let mut wrong_marker_lamports = 1_000_000;
        let mut consumed_marker_lamports = 1_000_000;
        let mut vault_lamports = 0;
        let mut wrong_vault_lamports = 0;
        let mut authority_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut root_record_data = vec![0; ROOT_RECORD_ACCOUNT_LEN];
        let mut marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut wrong_marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut consumed_marker_data = vec![0; NULLIFIER_MARKER_LEN];
        let mut vault_data = [];
        let mut wrong_vault_data = [];
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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Ok(())
            );
        }

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
            let root = account_info(
                &root_record,
                &program_id,
                true,
                false,
                &mut root_record_lamports,
                &mut root_record_data,
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
            let accounts = vec![pool, roots, root, authority_info, system_info];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &register_provenanced_root_instruction()
                ),
                Ok(())
            );
        }

        let before = (
            pool_data.clone(),
            root_data.clone(),
            root_record_data.clone(),
            marker_data.clone(),
            wrong_marker_data.clone(),
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
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let root = account_info(
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
            let vault = account_info(
                &vault_authority,
                &system_program::ID,
                false,
                false,
                &mut vault_lamports,
                &mut vault_data,
            );
            let accounts = vec![pool, roots, root, marker, vault];

            assert_eq!(
                process_instruction(
                    &program_id,
                    &accounts,
                    &unshield_instruction_with_accepted_root([9; HASH_LEN])
                ),
                Err(ProgramError::Custom(ERR_UNKNOWN_ACCEPTED_ROOT))
            );
        }

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
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let root = account_info(
                &root_record,
                &program_id,
                false,
                false,
                &mut root_record_lamports,
                &mut root_record_data,
            );
            let marker = account_info(
                &wrong_nullifier_marker,
                &program_id,
                true,
                false,
                &mut wrong_marker_lamports,
                &mut wrong_marker_data,
            );
            let vault = account_info(
                &vault_authority,
                &system_program::ID,
                false,
                false,
                &mut vault_lamports,
                &mut vault_data,
            );
            let accounts = vec![pool, roots, root, marker, vault];

            assert_eq!(
                process_instruction(&program_id, &accounts, &unshield_instruction()),
                Err(ProgramError::Custom(ERR_NULLIFIER_MARKER_MISMATCH))
            );
        }

        consumed_marker_data[..8].copy_from_slice(NULLIFIER_MARKER_MAGIC);
        consumed_marker_data[8] = VERSION;
        assert_eq!(write_count(&mut consumed_marker_data, 1), Ok(()));
        consumed_marker_data[NULLIFIER_MARKER_POOL_OFFSET..NULLIFIER_MARKER_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        consumed_marker_data
            [NULLIFIER_MARKER_NULLIFIER_OFFSET..NULLIFIER_MARKER_NULLIFIER_OFFSET + HASH_LEN]
            .copy_from_slice(&[1; HASH_LEN]);
        let before_duplicate_marker = consumed_marker_data.clone();
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
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let root = account_info(
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
                &mut consumed_marker_lamports,
                &mut consumed_marker_data,
            );
            let vault = account_info(
                &vault_authority,
                &system_program::ID,
                false,
                false,
                &mut vault_lamports,
                &mut vault_data,
            );
            let accounts = vec![pool, roots, root, marker, vault];

            assert_eq!(
                process_instruction(&program_id, &accounts, &unshield_instruction()),
                Err(ProgramError::Custom(ERR_DUPLICATE_NULLIFIER))
            );
        }
        assert_eq!(before_duplicate_marker, consumed_marker_data);

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
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let root = account_info(
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
            let vault = account_info(
                &vault_authority,
                &system_program::ID,
                true,
                false,
                &mut vault_lamports,
                &mut vault_data,
            );
            let accounts = vec![pool, roots, root, marker, vault];

            assert_eq!(
                process_instruction(&program_id, &accounts, &unshield_instruction()),
                Err(ProgramError::InvalidAccountData)
            );
        }

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
                false,
                false,
                &mut root_lamports,
                &mut root_data,
            );
            let root = account_info(
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
            let vault = account_info(
                &wrong_vault_authority,
                &system_program::ID,
                false,
                false,
                &mut wrong_vault_lamports,
                &mut wrong_vault_data,
            );
            let accounts = vec![pool, roots, root, marker, vault];

            assert_eq!(
                process_instruction(&program_id, &accounts, &unshield_instruction()),
                Err(ProgramError::Custom(ERR_VAULT_AUTHORITY_MISMATCH))
            );
        }

        assert_eq!(
            before,
            (
                pool_data,
                root_data,
                root_record_data,
                marker_data,
                wrong_marker_data
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
        let authority = Pubkey::new_unique();
        let mut pool_lamports = 1_000_000;
        let mut nullifier_lamports = 1_000_000;
        let mut output_lamports = 1_000_000;
        let mut root_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

            assert_eq!(
                process_instruction(&program_id, &accounts, &[TAG_INIT]),
                Err(ProgramError::Custom(ERR_ALREADY_INITIALIZED))
            );
        }

        assert_eq!(before, (pool_data, nullifier_data, output_data, root_data));
    }

    #[test]
    fn spend_rejects_mixed_account_triplets() {
        let program_id = Pubkey::new_unique();
        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let wrong_nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        let root_history = Pubkey::new_unique();
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
        let mut marker_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut wrong_nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut output_record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

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
        let mut marker_lamports = 1_000_000;
        let mut authority_lamports = 1_000_000;
        let mut system_lamports = 1_000_000;
        let mut pool_data = vec![0; POOL_STATE_LEN];
        let mut nullifier_data = vec![0; HEADER_LEN + HASH_LEN * 4];
        let mut output_data = vec![0; HEADER_LEN];
        let mut output_record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut wrong_output_record_data = vec![0; OUTPUT_RECORD_PDA_LEN];
        let mut root_data = vec![0; HEADER_LEN + HASH_LEN * 4];
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
            let authority_info = account_info(
                &authority,
                &program_id,
                true,
                true,
                &mut authority_lamports,
                &mut signer_data,
            );
            let accounts = vec![pool, nullifier, output, roots, authority_info];

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
                true,
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

    fn vault_authority_pubkey(
        program_id: &Pubkey,
        pool_state: &Pubkey,
        exit_asset_id: &[u8],
    ) -> Pubkey {
        Pubkey::find_program_address(
            &[VAULT_AUTHORITY_SEED, pool_state.as_ref(), exit_asset_id],
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

    fn write_verifier_key_account(
        verifier_data: &mut [u8],
        pool_state: &Pubkey,
        verifier_key_hash: &[u8],
    ) -> ProgramResult {
        if verifier_data.len() < VERIFIER_KEY_ACCOUNT_LEN || verifier_key_hash.len() != HASH_LEN {
            return Err(ProgramError::AccountDataTooSmall);
        }

        verifier_data.fill(0);
        verifier_data[..8].copy_from_slice(VERIFIER_KEY_MAGIC);
        verifier_data[8] = VERSION;
        write_count(verifier_data, 1)?;
        verifier_data[VERIFIER_KEY_POOL_OFFSET..VERIFIER_KEY_POOL_OFFSET + HASH_LEN]
            .copy_from_slice(pool_state.as_ref());
        verifier_data[VERIFIER_KEY_HASH_OFFSET..VERIFIER_KEY_HASH_OFFSET + HASH_LEN]
            .copy_from_slice(verifier_key_hash);
        Ok(())
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

    fn spend_with_proof_instruction() -> Vec<u8> {
        let mut data = spend_instruction_with(
            [1; HASH_LEN],
            [2; HASH_LEN],
            [3; HASH_LEN],
            [4; HASH_LEN],
            [5; HASH_LEN],
        );
        data[0] = TAG_SPEND_WITH_PROOF;
        data.extend_from_slice(&[6; HASH_LEN]);
        data.extend_from_slice(&[7; RESERVED_GROTH16_PROOF_LEN]);
        data
    }

    fn unshield_instruction() -> Vec<u8> {
        unshield_instruction_with_accepted_root([4; HASH_LEN])
    }

    fn unshield_instruction_with_accepted_root(accepted_root: [u8; HASH_LEN]) -> Vec<u8> {
        let mut data = Vec::with_capacity(UNSHIELD_PAYLOAD_LEN);
        data.push(TAG_UNSHIELD);
        data.extend_from_slice(&[1; HASH_LEN]);
        data.extend_from_slice(&accepted_root);
        data.extend_from_slice(&[2; HASH_LEN]);
        data.extend_from_slice(&[3; HASH_LEN]);
        data.extend_from_slice(&[4; EXIT_AMOUNT_LEN]);
        data.extend_from_slice(&[5; HASH_LEN]);
        data.extend_from_slice(&[6; RESERVED_GROTH16_PROOF_LEN]);
        data
    }

    fn register_root_instruction() -> Vec<u8> {
        let mut data = Vec::with_capacity(REGISTER_ROOT_PAYLOAD_LEN);
        data.push(TAG_REGISTER_ROOT);
        data.extend_from_slice(&[4; HASH_LEN]);
        data
    }

    fn register_provenanced_root_instruction() -> Vec<u8> {
        register_provenanced_root_instruction_with([4; HASH_LEN], [0; HASH_LEN])
    }

    fn register_provenanced_root_instruction_with(
        accepted_root: [u8; HASH_LEN],
        previous_root: [u8; HASH_LEN],
    ) -> Vec<u8> {
        let mut data = Vec::with_capacity(PROVENANCED_ROOT_PAYLOAD_LEN);
        data.push(TAG_REGISTER_PROVENANCED_ROOT);
        data.extend_from_slice(&accepted_root);
        data.extend_from_slice(&previous_root);
        data.extend_from_slice(&[8; HASH_LEN]);
        data.extend_from_slice(&9_u64.to_le_bytes());
        data.extend_from_slice(&2_u32.to_le_bytes());
        data.push(1);
        data
    }
}
