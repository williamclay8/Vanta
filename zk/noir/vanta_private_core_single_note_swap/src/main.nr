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

fn derive_swap_context_tag(
    input_nullifier: Field,
    output_commitment: Field,
    input_asset_id_hi: Field,
    input_asset_id_lo: Field,
    output_asset_id_hi: Field,
    output_asset_id_lo: Field,
    input_amount_lo: Field,
    input_amount_hi: Field,
    output_amount_lo: Field,
    output_amount_hi: Field,
    input_note_version: Field,
    output_note_version: Field,
) -> Field {
    bn254::hash_8([
        input_nullifier,
        output_commitment,
        input_asset_id_hi + input_asset_id_lo,
        output_asset_id_hi + output_asset_id_lo,
        input_amount_lo + input_amount_hi,
        output_amount_lo + output_amount_hi,
        input_note_version,
        output_note_version,
    ])
}

fn main(
    state_root: pub Field,
    input_nullifier: pub Field,
    output_commitment: pub Field,
    input_asset_id_hi: pub Field,
    input_asset_id_lo: pub Field,
    output_asset_id_hi: pub Field,
    output_asset_id_lo: pub Field,
    input_amount_lo: pub Field,
    input_amount_hi: pub Field,
    output_amount_lo: pub Field,
    output_amount_hi: pub Field,
    input_note_version: pub Field,
    output_note_version: pub Field,
    swap_context_tag_hi: pub Field,
    swap_context_tag_lo: pub Field,
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
    output_note_type_code: Field,
    output_owner_public_key_hi: Field,
    output_owner_public_key_lo: Field,
    output_note_nonce_hi: Field,
    output_note_nonce_lo: Field,
    output_note_secret_hi: Field,
    output_note_secret_lo: Field,
    output_blinding_hi: Field,
    output_blinding_lo: Field,
    output_derivation_tag_hi: Field,
    output_derivation_tag_lo: Field,
) {
    assert(input_note_version == 0);
    assert(output_note_version == 0);
    assert(input_note_type_code == 0);
    assert(output_note_type_code == 0);
    let sender_secret_stub = sender_secret_key_hi + sender_secret_key_lo;
    assert(sender_secret_stub == sender_secret_key_hi + sender_secret_key_lo);

    let input_commitment = hash_note_commitment(
        input_note_version,
        input_note_type_code,
        input_asset_id_hi,
        input_asset_id_lo,
        input_amount_lo,
        input_amount_hi,
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

    let computed_output_commitment = hash_note_commitment(
        output_note_version,
        output_note_type_code,
        output_asset_id_hi,
        output_asset_id_lo,
        output_amount_lo,
        output_amount_hi,
        output_owner_public_key_hi,
        output_owner_public_key_lo,
        output_note_nonce_hi,
        output_note_nonce_lo,
        output_note_secret_hi,
        output_note_secret_lo,
        output_blinding_hi,
        output_blinding_lo,
        output_derivation_tag_hi,
        output_derivation_tag_lo,
    );
    assert(computed_output_commitment == output_commitment);

    assert(input_asset_id_hi + input_asset_id_lo != output_asset_id_hi + output_asset_id_lo);
    assert(input_amount_lo + input_amount_hi != 0);
    assert(output_amount_lo + output_amount_hi != 0);

    let computed_swap_context_tag = derive_swap_context_tag(
        input_nullifier,
        output_commitment,
        input_asset_id_hi,
        input_asset_id_lo,
        output_asset_id_hi,
        output_asset_id_lo,
        input_amount_lo,
        input_amount_hi,
        output_amount_lo,
        output_amount_hi,
        input_note_version,
        output_note_version,
    );
    assert(computed_swap_context_tag == swap_context_tag_hi + swap_context_tag_lo);
}
