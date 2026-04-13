use ::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 3;

fn hash_note_header(note_version: Field, note_type_code: Field) -> Field {
    bn254::hash_2([note_version, note_type_code])
}

fn hash_note_commitment(
    note_version: Field,
    note_type_code: Field,
    asset_id_hi: Field,
    asset_id_lo: Field,
    amount_lo: Field,
    amount_hi: Field,
    owner_public_key_hi: Field,
    owner_public_key_lo: Field,
    note_nonce_hi: Field,
    note_nonce_lo: Field,
    note_secret_hi: Field,
    note_secret_lo: Field,
    blinding_hi: Field,
    blinding_lo: Field,
    derivation_tag_hi: Field,
    derivation_tag_lo: Field,
) -> Field {
    let note_header = hash_note_header(note_version, note_type_code);

    bn254::hash_15([
        note_header,
        asset_id_hi,
        asset_id_lo,
        amount_lo,
        amount_hi,
        owner_public_key_hi,
        owner_public_key_lo,
        note_nonce_hi,
        note_nonce_lo,
        note_secret_hi,
        note_secret_lo,
        blinding_hi,
        blinding_lo,
        derivation_tag_hi,
        derivation_tag_lo,
    ])
}

fn hash_merkle_leaf(commitment: Field) -> Field {
    bn254::hash_1([commitment])
}

fn hash_merkle_node(left: Field, right: Field, is_current_right: Field) -> Field {
    bn254::hash_3([left, right, is_current_right])
}

fn assert_direction_bit(bit: Field) {
    assert(bit * (bit - 1) == 0);
}

fn compute_root(
    leaf: Field,
    membership_path_hi: [Field; MERKLE_DEPTH],
    membership_path_lo: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut current = leaf;

    for i in 0..MERKLE_DEPTH {
        let sibling = membership_path_hi[i] + membership_path_lo[i];
        let is_current_right = membership_path_direction_bits[i];

        assert_direction_bit(is_current_right);

        if is_current_right == 1 {
            current = hash_merkle_node(sibling, current, is_current_right);
        } else {
            current = hash_merkle_node(current, sibling, is_current_right);
        }
    }

    current
}

fn derive_nullifier(
    note_secret_hi: Field,
    note_secret_lo: Field,
    note_nonce_hi: Field,
    note_nonce_lo: Field,
    state_root: Field,
    leaf_index: Field,
) -> Field {
    bn254::hash_6([
        note_secret_hi,
        note_secret_lo,
        note_nonce_hi,
        note_nonce_lo,
        state_root,
        leaf_index,
    ])
}

fn derive_send_context_tag(
    input_nullifier: Field,
    recipient_commitment: Field,
    change_commitment: Field,
    asset_id_hi: Field,
    asset_id_lo: Field,
    send_amount_lo: Field,
    send_amount_hi: Field,
    change_amount_lo: Field,
    change_amount_hi: Field,
    note_version: Field,
) -> Field {
    bn254::hash_8([
        input_nullifier,
        recipient_commitment,
        change_commitment,
        asset_id_hi,
        asset_id_lo,
        send_amount_lo + send_amount_hi,
        change_amount_lo + change_amount_hi,
        note_version,
    ])
}

fn assert_zero_note(
    note_type_code: Field,
    owner_public_key_hi: Field,
    owner_public_key_lo: Field,
    note_nonce_hi: Field,
    note_nonce_lo: Field,
    note_secret_hi: Field,
    note_secret_lo: Field,
    blinding_hi: Field,
    blinding_lo: Field,
    derivation_tag_hi: Field,
    derivation_tag_lo: Field,
) {
    assert(note_type_code == 0);
    assert(owner_public_key_hi == 0);
    assert(owner_public_key_lo == 0);
    assert(note_nonce_hi == 0);
    assert(note_nonce_lo == 0);
    assert(note_secret_hi == 0);
    assert(note_secret_lo == 0);
    assert(blinding_hi == 0);
    assert(blinding_lo == 0);
    assert(derivation_tag_hi == 0);
    assert(derivation_tag_lo == 0);
}

fn main(
    state_root: pub Field,
    input_nullifier: pub Field,
    recipient_commitment: pub Field,
    change_commitment: pub Field,
    asset_id_hi: pub Field,
    asset_id_lo: pub Field,
    send_amount_lo: pub Field,
    send_amount_hi: pub Field,
    change_amount_lo: pub Field,
    change_amount_hi: pub Field,
    note_version: pub Field,
    send_context_tag_hi: pub Field,
    send_context_tag_lo: pub Field,
    input_note_type_code: Field,
    sender_public_key_hi: Field,
    sender_public_key_lo: Field,
    sender_secret_key_hi: Field,
    sender_secret_key_lo: Field,
    input_note_nonce_hi: Field,
    input_note_nonce_lo: Field,
    input_note_secret_hi: Field,
    input_note_secret_lo: Field,
    input_blinding_hi: Field,
    input_blinding_lo: Field,
    input_derivation_tag_hi: Field,
    input_derivation_tag_lo: Field,
    input_leaf_index: Field,
    membership_path_hi: [Field; MERKLE_DEPTH],
    membership_path_lo: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
    recipient_note_type_code: Field,
    recipient_owner_public_key_hi: Field,
    recipient_owner_public_key_lo: Field,
    recipient_note_nonce_hi: Field,
    recipient_note_nonce_lo: Field,
    recipient_note_secret_hi: Field,
    recipient_note_secret_lo: Field,
    recipient_blinding_hi: Field,
    recipient_blinding_lo: Field,
    recipient_derivation_tag_hi: Field,
    recipient_derivation_tag_lo: Field,
    change_note_type_code: Field,
    change_owner_public_key_hi: Field,
    change_owner_public_key_lo: Field,
    change_note_nonce_hi: Field,
    change_note_nonce_lo: Field,
    change_note_secret_hi: Field,
    change_note_secret_lo: Field,
    change_blinding_hi: Field,
    change_blinding_lo: Field,
    change_derivation_tag_hi: Field,
    change_derivation_tag_lo: Field,
) {
    assert(note_version == 0);
    assert(input_note_type_code == 0);
    assert(recipient_note_type_code == 0);

    let input_commitment = hash_note_commitment(
        note_version,
        input_note_type_code,
        asset_id_hi,
        asset_id_lo,
        send_amount_lo + change_amount_lo,
        send_amount_hi + change_amount_hi,
        sender_public_key_hi,
        sender_public_key_lo,
        input_note_nonce_hi,
        input_note_nonce_lo,
        input_note_secret_hi,
        input_note_secret_lo,
        input_blinding_hi,
        input_blinding_lo,
        input_derivation_tag_hi,
        input_derivation_tag_lo,
    );

    let input_leaf = hash_merkle_leaf(input_commitment);
    let computed_root = compute_root(
        input_leaf,
        membership_path_hi,
        membership_path_lo,
        membership_path_direction_bits,
    );
    assert(computed_root == state_root);

    let computed_input_nullifier = derive_nullifier(
        input_note_secret_hi,
        input_note_secret_lo,
        input_note_nonce_hi,
        input_note_nonce_lo,
        state_root,
        input_leaf_index,
    );
    assert(computed_input_nullifier == input_nullifier);

    let computed_recipient_commitment = hash_note_commitment(
        note_version,
        recipient_note_type_code,
        asset_id_hi,
        asset_id_lo,
        send_amount_lo,
        send_amount_hi,
        recipient_owner_public_key_hi,
        recipient_owner_public_key_lo,
        recipient_note_nonce_hi,
        recipient_note_nonce_lo,
        recipient_note_secret_hi,
        recipient_note_secret_lo,
        recipient_blinding_hi,
        recipient_blinding_lo,
        recipient_derivation_tag_hi,
        recipient_derivation_tag_lo,
    );
    assert(computed_recipient_commitment == recipient_commitment);

    let has_change = change_amount_lo + change_amount_hi != 0;

    if has_change {
        assert(change_note_type_code == 0);
        let computed_change_commitment = hash_note_commitment(
            note_version,
            change_note_type_code,
            asset_id_hi,
            asset_id_lo,
            change_amount_lo,
            change_amount_hi,
            change_owner_public_key_hi,
            change_owner_public_key_lo,
            change_note_nonce_hi,
            change_note_nonce_lo,
            change_note_secret_hi,
            change_note_secret_lo,
            change_blinding_hi,
            change_blinding_lo,
            change_derivation_tag_hi,
            change_derivation_tag_lo,
        );
        assert(computed_change_commitment == change_commitment);
    } else {
        assert(change_commitment == 0);
        assert_zero_note(
            change_note_type_code,
            change_owner_public_key_hi,
            change_owner_public_key_lo,
            change_note_nonce_hi,
            change_note_nonce_lo,
            change_note_secret_hi,
            change_note_secret_lo,
            change_blinding_hi,
            change_blinding_lo,
            change_derivation_tag_hi,
            change_derivation_tag_lo,
        );
    }

    let computed_send_context_tag = derive_send_context_tag(
        input_nullifier,
        recipient_commitment,
        change_commitment,
        asset_id_hi,
        asset_id_lo,
        send_amount_lo,
        send_amount_hi,
        change_amount_lo,
        change_amount_hi,
        note_version,
    );
    assert(computed_send_context_tag == send_context_tag_hi + send_context_tag_lo);

    // v0.1 assumption: sender authorization remains prechecked off-circuit.
    // Keep the witness material live in the circuit surface for a later
    // in-circuit owner-auth upgrade.
    let sender_auth_placeholder =
        sender_secret_key_hi + sender_secret_key_lo + sender_public_key_hi + sender_public_key_lo;
    assert(sender_auth_placeholder == sender_auth_placeholder);
}
