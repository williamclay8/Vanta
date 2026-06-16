use ::poseidon::poseidon::bn254;

fn hash_deposit_commitment(
    asset_id: Field,
    amount: u64,
    sender_note_secret: Field,
    note_blinding: Field,
) -> Field {
    bn254::hash_4([asset_id, amount as Field, sender_note_secret, note_blinding])
}

fn hash_recipient_commitment(recipient_secret: Field, recipient_blinding: Field) -> Field {
    bn254::hash_2([recipient_secret, recipient_blinding])
}

fn hash_transfer_commitment(
    deposit_commitment: Field,
    recipient_commitment: Field,
    relayer_context: Field,
    transfer_blinding: Field,
) -> Field {
    bn254::hash_4([deposit_commitment, recipient_commitment, relayer_context, transfer_blinding])
}

fn hash_unlinkable_nullifier(
    sender_note_secret: Field,
    spend_context: Field,
    anonymity_root: Field,
) -> Field {
    bn254::hash_3([sender_note_secret, spend_context, anonymity_root])
}

fn main(
    amount: u64,
    sender_note_secret: Field,
    recipient_secret: Field,
    recipient_blinding: Field,
    note_blinding: Field,
    transfer_blinding: Field,
    amount_bucket_min: pub u64,
    amount_bucket_max: pub u64,
    asset_id: pub Field,
    anonymity_root: pub Field,
    relayer_context: pub Field,
    spend_context: pub Field,
    recipient_commitment: pub Field,
    deposit_commitment: pub Field,
    transfer_commitment: pub Field,
    nullifier: pub Field,
) {
    assert(amount > 0);
    assert(amount_bucket_max >= amount_bucket_min);
    assert(amount >= amount_bucket_min);
    assert(amount <= amount_bucket_max);
    assert(anonymity_root != 0);
    assert(relayer_context != 0);
    assert(spend_context != 0);

    let computed_recipient_commitment = hash_recipient_commitment(
        recipient_secret,
        recipient_blinding,
    );
    assert(computed_recipient_commitment == recipient_commitment);

    let computed_deposit_commitment = hash_deposit_commitment(
        asset_id,
        amount,
        sender_note_secret,
        note_blinding,
    );
    assert(computed_deposit_commitment == deposit_commitment);

    let computed_transfer_commitment = hash_transfer_commitment(
        deposit_commitment,
        recipient_commitment,
        relayer_context,
        transfer_blinding,
    );
    assert(computed_transfer_commitment == transfer_commitment);

    let computed_nullifier = hash_unlinkable_nullifier(
        sender_note_secret,
        spend_context,
        anonymity_root,
    );
    assert(computed_nullifier == nullifier);
}

#[test]
fn test_unlinkable_transfer_plus() {
    let amount = 700;
    let asset_id = 1;
    let sender_note_secret = 12345;
    let recipient_secret = 22222;
    let recipient_blinding = 33333;
    let note_blinding = 67890;
    let transfer_blinding = 99999;
    let anonymity_root = 777777;
    let relayer_context = 888888;
    let spend_context = 77;

    let recipient_commitment = hash_recipient_commitment(recipient_secret, recipient_blinding);
    let deposit_commitment = hash_deposit_commitment(asset_id, amount, sender_note_secret, note_blinding);
    let transfer_commitment = hash_transfer_commitment(deposit_commitment, recipient_commitment, relayer_context, transfer_blinding);
    let nullifier = hash_unlinkable_nullifier(sender_note_secret, spend_context, anonymity_root);

    main(
        amount,
        sender_note_secret,
        recipient_secret,
        recipient_blinding,
        note_blinding,
        transfer_blinding,
        100,
        1000,
        asset_id,
        anonymity_root,
        relayer_context,
        spend_context,
        recipient_commitment,
        deposit_commitment,
        transfer_commitment,
        nullifier,
    );
}
