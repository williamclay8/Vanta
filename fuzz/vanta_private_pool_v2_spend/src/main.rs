use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use crucible_fuzzer::anchor_lang::system_program;
use crucible_fuzzer::*;
use crucible_test_context::TxOutcome;
use solana_keypair::Keypair;
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use std::rc::Rc;

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
const OUTPUT_RECORD_LEN: usize = HASH_LEN * 3;

const ERR_DUPLICATE_NULLIFIER: u32 = 1;
const ERR_NULLIFIER_SET_FULL: u32 = 2;
const ERR_OUTPUT_QUEUE_FULL: u32 = 3;
const ERR_INVALID_HEADER: u32 = 4;
const ERR_STATE_COUNT_MISMATCH: u32 = 5;

#[derive(Clone)]
struct OutputRecord {
    output0: [u8; HASH_LEN],
    output1: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
}

#[derive(Clone)]
struct VantaPrivatePoolV2Spend {
    ctx: TestContext,
    program_id: Pubkey,
    payer: Rc<Keypair>,
    pool_state: Pubkey,
    nullifier_set: Pubkey,
    output_queue: Pubkey,
    wrong_pool_state: Pubkey,
    wrong_nullifier_set: Pubkey,
    wrong_output_queue: Pubkey,
    initialized: bool,
    state_error_code: Option<u32>,
    expected_count: usize,
    nullifier_capacity: usize,
    output_capacity: usize,
    accepted_nullifiers: Vec<[u8; HASH_LEN]>,
    output_records: Vec<OutputRecord>,
    latest_public_input_hash: [u8; HASH_LEN],
}

#[fuzz_fixture]
impl VantaPrivatePoolV2Spend {
    pub fn setup() -> Self {
        let mut ctx = TestContext::new();
        let program_id = Pubkey::new_unique();

        ctx.add_program(
            &program_id,
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

        let pool_state = Pubkey::new_unique();
        let nullifier_set = Pubkey::new_unique();
        let output_queue = Pubkey::new_unique();
        create_program_accounts(
            &mut ctx,
            &program_id,
            pool_state,
            nullifier_set,
            output_queue,
            4,
            4,
        );

        let wrong_pool_state = Pubkey::new_unique();
        let wrong_nullifier_set = Pubkey::new_unique();
        let wrong_output_queue = Pubkey::new_unique();
        create_system_account(&mut ctx, wrong_pool_state, POOL_STATE_LEN);
        create_system_account(&mut ctx, wrong_nullifier_set, fixed_slot_len(4, HASH_LEN));
        create_system_account(
            &mut ctx,
            wrong_output_queue,
            fixed_slot_len(4, OUTPUT_RECORD_LEN),
        );

        Self {
            ctx,
            program_id,
            payer,
            pool_state,
            nullifier_set,
            output_queue,
            wrong_pool_state,
            wrong_nullifier_set,
            wrong_output_queue,
            initialized: false,
            state_error_code: None,
            expected_count: 0,
            nullifier_capacity: 4,
            output_capacity: 4,
            accepted_nullifiers: Vec::new(),
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
        self.reset_accounts(4, 3);
        self.send_valid_init();
    }

    pub fn action_spend(&mut self, seed: u64) {
        let payload = spend_payload(seed);
        let before = self.snapshot_accounts();
        let outcome = self.call(payload.data, self.program_accounts());
        self.check_spend_outcome(seed, outcome, before);
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
                make_hash(7, 23),
            ),
            nullifier,
            output0: make_hash(7, 21),
            output1: make_hash(7, 22),
            public_input_hash: make_hash(7, 23),
        };
        let before = self.snapshot_accounts();
        let outcome = self.call(payload.data, self.program_accounts());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(
            outcome.as_ref().and_then(TxOutcome::error_code),
            Some(ERR_DUPLICATE_NULLIFIER)
        );
        fuzz_assert_eq!(before, self.snapshot_accounts(), "duplicate nullifier mutated state");
    }

    pub fn action_bad_payload(&mut self, selector: u8) {
        let data = match selector % 5 {
            0 => vec![],
            1 => vec![99],
            2 => vec![TAG_INIT, 1],
            3 => vec![TAG_SPEND],
            _ => {
                let mut data = spend_payload(42).data;
                data.push(0);
                data
            }
        };
        let before = self.snapshot_accounts();
        let outcome = self.call(data, self.program_accounts());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(before, self.snapshot_accounts(), "bad payload mutated state");
    }

    pub fn action_non_writable_spend(&mut self, seed: u64) {
        let before = self.snapshot_accounts();
        let outcome = self.call(spend_payload(seed).data, self.readonly_program_accounts());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(before, self.snapshot_accounts(), "non-writable call mutated state");
    }

    pub fn action_wrong_owner_spend(&mut self, seed: u64) {
        let before = self.snapshot_accounts();
        let outcome = self.call(spend_payload(seed).data, self.wrong_owner_accounts());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
        fuzz_assert_eq!(before, self.snapshot_accounts(), "wrong-owner call mutated state");
    }

    pub fn action_corrupt_header(&mut self, selector: u8) {
        if !self.initialized {
            return;
        }
        let target = match selector % 3 {
            0 => self.pool_state,
            1 => self.nullifier_set,
            _ => self.output_queue,
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
        if self.expected_count + 1 > self.nullifier_capacity {
            return;
        }
        let mismatched = (self.expected_count + 1) as u32;
        self.ctx
            .update_account(&self.nullifier_set, |data| {
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

    fuzz_assert_eq!(&pool[..8], POOL_MAGIC);
    fuzz_assert_eq!(pool[8], VERSION);
    fuzz_assert_eq!(&nullifiers[..8], NULLIFIER_MAGIC);
    fuzz_assert_eq!(nullifiers[8], VERSION);
    fuzz_assert_eq!(&outputs[..8], OUTPUT_MAGIC);
    fuzz_assert_eq!(outputs[8], VERSION);

    fuzz_assert_eq!(
        read_u64(&pool, POOL_SPEND_COUNT_OFFSET) as usize,
        fixture.expected_count
    );
    fuzz_assert_eq!(read_u32(&nullifiers, COUNT_OFFSET) as usize, fixture.expected_count);
    fuzz_assert_eq!(read_u32(&outputs, COUNT_OFFSET) as usize, fixture.expected_count);

    fuzz_assert_eq!(
        &pool[POOL_LAST_PUBLIC_INPUT_HASH_OFFSET
            ..POOL_LAST_PUBLIC_INPUT_HASH_OFFSET + HASH_LEN],
        &fixture.latest_public_input_hash
    );

    for (index, nullifier) in fixture.accepted_nullifiers.iter().enumerate() {
        let start = HEADER_LEN + index * HASH_LEN;
        fuzz_assert_eq!(&nullifiers[start..start + HASH_LEN], nullifier);
    }

    for (index, output) in fixture.output_records.iter().enumerate() {
        let start = HEADER_LEN + index * OUTPUT_RECORD_LEN;
        fuzz_assert_eq!(&outputs[start..start + HASH_LEN], &output.output0);
        fuzz_assert_eq!(
            &outputs[start + HASH_LEN..start + HASH_LEN * 2],
            &output.output1
        );
        fuzz_assert_eq!(
            &outputs[start + HASH_LEN * 2..start + OUTPUT_RECORD_LEN],
            &output.public_input_hash
        );
    }
}

impl VantaPrivatePoolV2Spend {
    fn reset_accounts(&mut self, nullifier_capacity: usize, output_capacity: usize) {
        create_program_accounts(
            &mut self.ctx,
            &self.program_id,
            self.pool_state,
            self.nullifier_set,
            self.output_queue,
            nullifier_capacity,
            output_capacity,
        );
        self.initialized = false;
        self.state_error_code = None;
        self.expected_count = 0;
        self.nullifier_capacity = nullifier_capacity;
        self.output_capacity = output_capacity;
        self.accepted_nullifiers.clear();
        self.output_records.clear();
        self.latest_public_input_hash = [0; HASH_LEN];
    }

    fn send_valid_init(&mut self) {
        let before = self.snapshot_accounts();
        let outcome = self.call(vec![TAG_INIT], self.program_accounts());
        fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
        if outcome.is_some_and(|o| o.is_success()) {
            self.initialized = true;
            self.state_error_code = None;
            self.expected_count = 0;
            self.accepted_nullifiers.clear();
            self.output_records.clear();
            self.latest_public_input_hash = [0; HASH_LEN];
        } else {
            fuzz_assert_eq!(before, self.snapshot_accounts(), "failed init mutated state");
        }
    }

    fn check_spend_outcome(
        &mut self,
        seed: u64,
        outcome: Option<TxOutcome>,
        before: Vec<Vec<u8>>,
    ) {
        let payload = spend_payload(seed);
        let expected_error = self.expected_spend_error(&payload.nullifier);

        match expected_error {
            None => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_success));
                if outcome.is_some_and(|o| o.is_success()) {
                    self.expected_count += 1;
                    self.accepted_nullifiers.push(payload.nullifier);
                    self.output_records.push(OutputRecord {
                        output0: payload.output0,
                        output1: payload.output1,
                        public_input_hash: payload.public_input_hash,
                    });
                    self.latest_public_input_hash = payload.public_input_hash;
                }
            }
            Some(code) => {
                fuzz_assert!(outcome.as_ref().is_some_and(TxOutcome::is_error));
                fuzz_assert_eq!(outcome.as_ref().and_then(TxOutcome::error_code), Some(code));
                fuzz_assert_eq!(before, self.snapshot_accounts(), "failed spend mutated state");
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
        if self.expected_count >= self.nullifier_capacity {
            return Some(ERR_NULLIFIER_SET_FULL);
        }
        if self.expected_count >= self.output_capacity {
            return Some(ERR_OUTPUT_QUEUE_FULL);
        }
        if self.accepted_nullifiers.iter().any(|seen| seen == nullifier) {
            return Some(ERR_DUPLICATE_NULLIFIER);
        }
        None
    }

    fn call(&mut self, data: Vec<u8>, accounts: Vec<AccountMeta>) -> Option<TxOutcome> {
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

    fn program_accounts(&self) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.pool_state, false),
            AccountMeta::new(self.nullifier_set, false),
            AccountMeta::new(self.output_queue, false),
        ]
    }

    fn readonly_program_accounts(&self) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new_readonly(self.pool_state, false),
            AccountMeta::new_readonly(self.nullifier_set, false),
            AccountMeta::new_readonly(self.output_queue, false),
        ]
    }

    fn wrong_owner_accounts(&self) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.wrong_pool_state, false),
            AccountMeta::new(self.wrong_nullifier_set, false),
            AccountMeta::new(self.wrong_output_queue, false),
        ]
    }

    fn snapshot_accounts(&self) -> Vec<Vec<u8>> {
        vec![
            self.account_data(self.pool_state),
            self.account_data(self.nullifier_set),
            self.account_data(self.output_queue),
        ]
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

fn spend_payload(seed: u64) -> SpendPayload {
    let nullifier = make_hash(seed, 1);
    let output0 = make_hash(seed, 2);
    let output1 = make_hash(seed, 3);
    let public_input_hash = make_hash(seed, 4);
    SpendPayload {
        data: spend_data(nullifier, output0, output1, public_input_hash),
        nullifier,
        output0,
        output1,
        public_input_hash,
    }
}

fn spend_data(
    nullifier: [u8; HASH_LEN],
    output0: [u8; HASH_LEN],
    output1: [u8; HASH_LEN],
    public_input_hash: [u8; HASH_LEN],
) -> Vec<u8> {
    let mut data = Vec::with_capacity(1 + HASH_LEN * 4);
    data.push(TAG_SPEND);
    data.extend_from_slice(&nullifier);
    data.extend_from_slice(&output0);
    data.extend_from_slice(&output1);
    data.extend_from_slice(&public_input_hash);
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

fn create_program_accounts(
    ctx: &mut TestContext,
    program_id: &Pubkey,
    pool_state: Pubkey,
    nullifier_set: Pubkey,
    output_queue: Pubkey,
    nullifier_capacity: usize,
    output_capacity: usize,
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
        .size(fixed_slot_len(output_capacity, OUTPUT_RECORD_LEN))
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
