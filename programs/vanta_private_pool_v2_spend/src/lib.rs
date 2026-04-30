use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

const TAG_INIT: u8 = 0;
const TAG_SPEND: u8 = 1;

const VERSION: u8 = 1;
const POOL_MAGIC: &[u8; 8] = b"VNTA2POL";
const NULLIFIER_MAGIC: &[u8; 8] = b"VNTA2NUL";
const OUTPUT_MAGIC: &[u8; 8] = b"VNTA2OUT";

const HEADER_LEN: usize = 16;
const COUNT_OFFSET: usize = 12;
const POOL_STATE_LEN: usize = 56;
const POOL_SPEND_COUNT_OFFSET: usize = 16;
const POOL_LAST_PUBLIC_INPUT_HASH_OFFSET: usize = 24;

const HASH_LEN: usize = 32;
const SPEND_PAYLOAD_LEN: usize = 1 + HASH_LEN * 4;
const OUTPUT_RECORD_LEN: usize = HASH_LEN * 3;

const ERR_DUPLICATE_NULLIFIER: u32 = 1;
const ERR_NULLIFIER_SET_FULL: u32 = 2;
const ERR_OUTPUT_QUEUE_FULL: u32 = 3;
const ERR_INVALID_HEADER: u32 = 4;
const ERR_STATE_COUNT_MISMATCH: u32 = 5;

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

    require_writable_program_account(program_id, pool_state)?;
    require_writable_program_account(program_id, nullifier_set)?;
    require_writable_program_account(program_id, output_queue)?;

    {
        let mut data = pool_state.try_borrow_mut_data()?;
        if data.len() < POOL_STATE_LEN {
            return Err(ProgramError::AccountDataTooSmall);
        }

        data.fill(0);
        data[..8].copy_from_slice(POOL_MAGIC);
        data[8] = VERSION;
    }

    init_fixed_slot_account(nullifier_set, NULLIFIER_MAGIC, HASH_LEN)?;
    init_fixed_slot_account(output_queue, OUTPUT_MAGIC, OUTPUT_RECORD_LEN)?;

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

    require_writable_program_account(program_id, pool_state)?;
    require_writable_program_account(program_id, nullifier_set)?;
    require_writable_program_account(program_id, output_queue)?;

    let nullifier = &rest[0..32];
    let output0 = &rest[32..64];
    let output1 = &rest[64..96];
    let public_input_hash = &rest[96..128];

    let mut pool_data = pool_state.try_borrow_mut_data()?;
    let mut nullifier_data = nullifier_set.try_borrow_mut_data()?;
    let mut output_data = output_queue.try_borrow_mut_data()?;

    require_pool_header(&pool_data)?;
    require_fixed_slot_header(&nullifier_data, NULLIFIER_MAGIC, HASH_LEN)?;
    require_fixed_slot_header(&output_data, OUTPUT_MAGIC, OUTPUT_RECORD_LEN)?;

    let spend_count = read_u64(&pool_data, POOL_SPEND_COUNT_OFFSET)? as usize;
    let nullifier_count = read_count(&nullifier_data)? as usize;
    let output_count = read_count(&output_data)? as usize;
    if spend_count != nullifier_count || spend_count != output_count {
        return Err(ProgramError::Custom(ERR_STATE_COUNT_MISMATCH));
    }

    let nullifier_capacity = fixed_slot_capacity(&nullifier_data, HASH_LEN)?;
    let output_capacity = fixed_slot_capacity(&output_data, OUTPUT_RECORD_LEN)?;
    if nullifier_count >= nullifier_capacity {
        return Err(ProgramError::Custom(ERR_NULLIFIER_SET_FULL));
    }
    if output_count >= output_capacity {
        return Err(ProgramError::Custom(ERR_OUTPUT_QUEUE_FULL));
    }

    for slot in nullifier_slots(&nullifier_data) {
        if slot == nullifier {
            return Err(ProgramError::Custom(ERR_DUPLICATE_NULLIFIER));
        }
    }

    write_nullifier(&mut nullifier_data, nullifier_count, nullifier)?;
    write_output_record(
        &mut output_data,
        output_count,
        output0,
        output1,
        public_input_hash,
    )?;
    write_count(&mut nullifier_data, nullifier_count + 1)?;
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

fn require_writable_program_account(program_id: &Pubkey, account: &AccountInfo) -> ProgramResult {
    if !account.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }
    if account.owner != program_id {
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

    data.fill(0);
    data[..8].copy_from_slice(magic);
    data[8] = VERSION;
    Ok(())
}

fn require_pool_header(data: &[u8]) -> ProgramResult {
    if data.len() < POOL_STATE_LEN || &data[..8] != POOL_MAGIC || data[8] != VERSION {
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

fn fixed_slot_capacity(data: &[u8], slot_len: usize) -> Result<usize, ProgramError> {
    if data.len() < HEADER_LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }
    Ok((data.len() - HEADER_LEN) / slot_len)
}

fn nullifier_slots(data: &[u8]) -> impl Iterator<Item = &[u8]> {
    data[HEADER_LEN..].chunks_exact(HASH_LEN)
}

fn write_nullifier(data: &mut [u8], index: usize, nullifier: &[u8]) -> ProgramResult {
    let start = HEADER_LEN + index * HASH_LEN;
    let end = start + HASH_LEN;
    if end > data.len() {
        return Err(ProgramError::AccountDataTooSmall);
    }
    data[start..end].copy_from_slice(nullifier);
    Ok(())
}

fn write_output_record(
    data: &mut [u8],
    index: usize,
    output0: &[u8],
    output1: &[u8],
    public_input_hash: &[u8],
) -> ProgramResult {
    let start = HEADER_LEN + index * OUTPUT_RECORD_LEN;
    let end = start + OUTPUT_RECORD_LEN;
    if end > data.len() {
        return Err(ProgramError::AccountDataTooSmall);
    }

    data[start..start + HASH_LEN].copy_from_slice(output0);
    data[start + HASH_LEN..start + HASH_LEN * 2].copy_from_slice(output1);
    data[start + HASH_LEN * 2..end].copy_from_slice(public_input_hash);
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
