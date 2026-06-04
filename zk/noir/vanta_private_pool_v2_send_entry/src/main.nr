use dep::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 20;

fn compute_nullifier(input_commitment: Field, owner_secret: Field) -> Field {
    bn254::hash_2([input_commitment, owner_secret])
}

fn compute_owner_commitment(owner_secret: Field) -> Field {
    bn254::hash_1([owner_secret])
}

fn compute_input_commitment(
    owner_commitment: Field,
    asset_id_commitment: Field,
    input_amount: u128,
    input_blinding: Field,
    input_derivation_tag: Field,
) -> Field {
    bn254::hash_5([
        owner_commitment,
        asset_id_commitment,
        input_amount as Field,
        input_blinding,
        input_derivation_tag,
    ])
}

fn compute_output_commitment(
    output_owner_commitment: Field,
    asset_id_commitment: Field,
    output_amount: u128,
    output_blinding: Field,
    output_derivation_tag: Field,
) -> Field {
    bn254::hash_5([
        output_owner_commitment,
        asset_id_commitment,
        output_amount as Field,
        output_blinding,
        output_derivation_tag,
    ])
}

fn compute_send_economics_commitment(
    input_amount: u128,
    recipient_amount: u128,
    change_amount: u128,
    relayer_fee: u128,
    economics_blinding: Field,
) -> Field {
    bn254::hash_5([
        input_amount as Field,
        recipient_amount as Field,
        change_amount as Field,
        relayer_fee as Field,
        economics_blinding,
    ])
}

fn hash_merkle_leaf(commitment: Field) -> Field {
    bn254::hash_1([commitment])
}

fn hash_merkle_node(left: Field, right: Field) -> Field {
    bn254::hash_2([left, right])
}

fn assert_direction_bit(bit: Field) {
    assert(bit * (bit - 1) == 0);
}

fn compute_root_from_leaf(
    leaf_value: Field,
    path: [Field; MERKLE_DEPTH],
    path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut current = hash_merkle_leaf(leaf_value);

    for i in 0..MERKLE_DEPTH {
        let sibling = path[i];
        let is_current_right = path_direction_bits[i];

        assert_direction_bit(is_current_right);

        if is_current_right == 1 {
            current = hash_merkle_node(sibling, current);
        } else {
            current = hash_merkle_node(current, sibling);
        }
    }

    current
}

fn compute_root(
    input_commitment: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    compute_root_from_leaf(
        input_commitment,
        membership_path,
        membership_path_direction_bits,
    )
}

fn compute_leaf_index_from_direction_bits(
    direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut leaf_index = 0;
    let mut bit_weight = 1;

    for i in 0..MERKLE_DEPTH {
        let direction_bit = direction_bits[i];

        assert_direction_bit(direction_bit);

        leaf_index = leaf_index + direction_bit * bit_weight;
        bit_weight = bit_weight * 2;
    }

    leaf_index
}

fn bind_send_public_inputs(
    request_version: Field,
    input_root: Field,
    input_commitment: Field,
    nullifier: Field,
    recipient_output_commitment: Field,
    change_output_commitment: Field,
    asset_id_commitment: Field,
    economics_commitment: Field,
    relayer_fee: u128,
    valid_until_slot: Field,
    owner_commitment: Field,
    send_context_tag: Field,
    recipient_memo_ciphertext_body_hash_field: Field,
    change_memo_ciphertext_body_hash_field: Field,
    recipient_leaf_index: Field,
    recipient_output_root: Field,
    change_leaf_index: Field,
    change_output_root: Field,
) -> Field {
    let output_transition = bn254::hash_4([
        recipient_leaf_index,
        recipient_output_root,
        change_leaf_index,
        change_output_root,
    ]);
    let memo_discovery = bn254::hash_2([
        recipient_memo_ciphertext_body_hash_field,
        change_memo_ciphertext_body_hash_field,
    ]);
    let economics_terms = bn254::hash_3([
        economics_commitment,
        relayer_fee as Field,
        valid_until_slot,
    ]);

    bn254::hash_12([
        request_version,
        input_root,
        input_commitment,
        nullifier,
        recipient_output_commitment,
        change_output_commitment,
        asset_id_commitment,
        economics_terms,
        owner_commitment,
        send_context_tag,
        output_transition,
        memo_discovery,
    ])
}

fn main(
    send_public_input_hash: pub Field,
    request_version: Field,
    input_root: Field,
    input_commitment: Field,
    input_leaf_index: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
    nullifier: Field,
    recipient_output_commitment: Field,
    change_output_commitment: Field,
    asset_id_commitment: Field,
    economics_commitment: Field,
    owner_commitment: Field,
    send_context_tag: Field,
    valid_until_slot: Field,
    recipient_memo_ciphertext_body_hash_field: Field,
    change_memo_ciphertext_body_hash_field: Field,
    recipient_leaf_index: Field,
    recipient_output_root: Field,
    recipient_append_path: [Field; MERKLE_DEPTH],
    recipient_append_path_direction_bits: [Field; MERKLE_DEPTH],
    change_leaf_index: Field,
    change_output_root: Field,
    change_append_path: [Field; MERKLE_DEPTH],
    change_append_path_direction_bits: [Field; MERKLE_DEPTH],
    input_amount: u128,
    recipient_amount: u128,
    change_amount: u128,
    relayer_fee: u128,
    economics_blinding: Field,
    recipient_owner_commitment: Field,
    recipient_output_blinding: Field,
    recipient_output_derivation_tag: Field,
    change_output_blinding: Field,
    change_output_derivation_tag: Field,
    owner_secret: Field,
    input_blinding: Field,
    input_derivation_tag: Field,
) {
    let computed_owner_commitment = compute_owner_commitment(owner_secret);
    assert(computed_owner_commitment == owner_commitment);

    let computed_input_commitment = compute_input_commitment(
        owner_commitment,
        asset_id_commitment,
        input_amount,
        input_blinding,
        input_derivation_tag,
    );
    assert(computed_input_commitment == input_commitment);

    let computed_input_root = compute_root(
        input_commitment,
        membership_path,
        membership_path_direction_bits,
    );
    assert(computed_input_root == input_root);

    let computed_input_leaf_index = compute_leaf_index_from_direction_bits(
        membership_path_direction_bits,
    );
    assert(computed_input_leaf_index == input_leaf_index);

    let computed_nullifier = compute_nullifier(input_commitment, owner_secret);
    assert(computed_nullifier == nullifier);

    assert(relayer_fee <= input_amount);
    assert(
        input_amount as Field
            == recipient_amount as Field + change_amount as Field + relayer_fee as Field,
    );

    let computed_economics_commitment = compute_send_economics_commitment(
        input_amount,
        recipient_amount,
        change_amount,
        relayer_fee,
        economics_blinding,
    );
    assert(computed_economics_commitment == economics_commitment);

    let computed_recipient_output_commitment = compute_output_commitment(
        recipient_owner_commitment,
        asset_id_commitment,
        recipient_amount,
        recipient_output_blinding,
        recipient_output_derivation_tag,
    );
    assert(computed_recipient_output_commitment == recipient_output_commitment);

    let computed_change_output_commitment = compute_output_commitment(
        owner_commitment,
        asset_id_commitment,
        change_amount,
        change_output_blinding,
        change_output_derivation_tag,
    );
    assert(computed_change_output_commitment == change_output_commitment);

    let computed_recipient_previous_root = compute_root_from_leaf(
        0,
        recipient_append_path,
        recipient_append_path_direction_bits,
    );
    assert(computed_recipient_previous_root == input_root);

    let computed_recipient_output_root = compute_root_from_leaf(
        recipient_output_commitment,
        recipient_append_path,
        recipient_append_path_direction_bits,
    );
    assert(computed_recipient_output_root == recipient_output_root);

    let computed_recipient_leaf_index = compute_leaf_index_from_direction_bits(
        recipient_append_path_direction_bits,
    );
    assert(computed_recipient_leaf_index == recipient_leaf_index);

    let computed_change_previous_root = compute_root_from_leaf(
        0,
        change_append_path,
        change_append_path_direction_bits,
    );
    assert(computed_change_previous_root == recipient_output_root);

    let computed_change_output_root = compute_root_from_leaf(
        change_output_commitment,
        change_append_path,
        change_append_path_direction_bits,
    );
    assert(computed_change_output_root == change_output_root);

    let computed_change_leaf_index = compute_leaf_index_from_direction_bits(
        change_append_path_direction_bits,
    );
    assert(computed_change_leaf_index == change_leaf_index);

    let computed_public_input_hash = bind_send_public_inputs(
        request_version,
        input_root,
        input_commitment,
        nullifier,
        recipient_output_commitment,
        change_output_commitment,
        asset_id_commitment,
        economics_commitment,
        relayer_fee,
        valid_until_slot,
        owner_commitment,
        send_context_tag,
        recipient_memo_ciphertext_body_hash_field,
        change_memo_ciphertext_body_hash_field,
        recipient_leaf_index,
        recipient_output_root,
        change_leaf_index,
        change_output_root,
    );

    assert(computed_public_input_hash == send_public_input_hash);
}
