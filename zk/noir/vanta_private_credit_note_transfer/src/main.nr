use ::poseidon::poseidon::bn254;

fn hash_deposit_commitment(
    asset_id: Field,
    amount: u64,
    deposit_secret: Field,
    deposit_blinding: Field,
) -> Field {
    bn254::hash_4([asset_id, amount as Field, deposit_secret, deposit_blinding])
}

fn hash_claim_code_commitment(claim_secret: Field, recipient_commitment: Field) -> Field {
    bn254::hash_2([claim_secret, recipient_commitment])
}

fn hash_credit_note_commitment(
    asset_id: Field,
    amount: u64,
    claim_code_commitment: Field,
    credit_blinding: Field,
) -> Field {
    bn254::hash_4([asset_id, amount as Field, claim_code_commitment, credit_blinding])
}

fn hash_withdraw_nullifier(
    deposit_secret: Field,
    claim_secret: Field,
    withdraw_context: Field,
) -> Field {
    bn254::hash_3([deposit_secret, claim_secret, withdraw_context])
}

fn main(
    amount: u64,
    deposit_secret: Field,
    claim_secret: Field,
    deposit_blinding: Field,
    credit_blinding: Field,
    amount_bucket_min: pub u64,
    amount_bucket_max: pub u64,
    asset_id: pub Field,
    recipient_commitment: pub Field,
    withdraw_context: pub Field,
    deposit_commitment: pub Field,
    claim_code_commitment: pub Field,
    credit_note_commitment: pub Field,
    nullifier: pub Field,
) {
    assert(amount > 0);
    assert(amount >= amount_bucket_min);
    assert(amount <= amount_bucket_max);
    assert(amount_bucket_max >= amount_bucket_min);

    let computed_deposit_commitment = hash_deposit_commitment(
        asset_id,
        amount,
        deposit_secret,
        deposit_blinding,
    );
    assert(computed_deposit_commitment == deposit_commitment);

    let computed_claim_code_commitment = hash_claim_code_commitment(
        claim_secret,
        recipient_commitment,
    );
    assert(computed_claim_code_commitment == claim_code_commitment);

    let computed_credit_note_commitment = hash_credit_note_commitment(
        asset_id,
        amount,
        claim_code_commitment,
        credit_blinding,
    );
    assert(computed_credit_note_commitment == credit_note_commitment);

    let computed_nullifier = hash_withdraw_nullifier(
        deposit_secret,
        claim_secret,
        withdraw_context,
    );
    assert(computed_nullifier == nullifier);
}

#[test]
fn test_credit_note_transfer() {
    let amount = 700;
    let asset_id = 1;
    let deposit_secret = 12345;
    let claim_secret = 22222;
    let recipient_commitment = 33333;
    let deposit_blinding = 67890;
    let credit_blinding = 99999;
    let withdraw_context = 77;
    let deposit_commitment = hash_deposit_commitment(asset_id, amount, deposit_secret, deposit_blinding);
    let claim_code_commitment = hash_claim_code_commitment(claim_secret, recipient_commitment);
    let credit_note_commitment = hash_credit_note_commitment(asset_id, amount, claim_code_commitment, credit_blinding);
    let nullifier = hash_withdraw_nullifier(deposit_secret, claim_secret, withdraw_context);

    main(amount, deposit_secret, claim_secret, deposit_blinding, credit_blinding, 100, 1000, asset_id, recipient_commitment, withdraw_context, deposit_commitment, claim_code_commitment, credit_note_commitment, nullifier);
}
