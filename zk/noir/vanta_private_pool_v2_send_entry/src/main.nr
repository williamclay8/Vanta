use ::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 3;

fn compute_nullifier(input_commitment: Field, owner_secret: Field) -> Field {
    bn254::hash_2([input_commitment, owner_secret])
}

fn compute_send_economics_commitment(
    input_amount: Field,
    recipient_amount: Field,
    change_amount: Field,
    economics_blinding: Field,
) -> Field {
    bn254::hash_4([
        input_amount,
        recipient_amount,
        change_amount,
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
    direction_bits[0]
        + direction_bits[1] * 2
        + direction_bits[2] * 4
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
    owner_commitment: Field,
    send_context_tag: Field,
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

    bn254::hash_11([
        request_version,
        input_root,
        input_commitment,
        nullifier,
        recipient_output_commitment,
        change_output_commitment,
        asset_id_commitment,
        economics_commitment,
        owner_commitment,
        send_context_tag,
        output_transition,
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
    recipient_leaf_index: Field,
    recipient_output_root: Field,
    recipient_append_path: [Field; MERKLE_DEPTH],
    recipient_append_path_direction_bits: [Field; MERKLE_DEPTH],
    change_leaf_index: Field,
    change_output_root: Field,
    change_append_path: [Field; MERKLE_DEPTH],
    change_append_path_direction_bits: [Field; MERKLE_DEPTH],
    input_amount: Field,
    recipient_amount: Field,
    change_amount: Field,
    economics_blinding: Field,
    owner_secret: Field,
) {
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

    assert(input_amount == recipient_amount + change_amount);

    let computed_economics_commitment = compute_send_economics_commitment(
        input_amount,
        recipient_amount,
        change_amount,
        economics_blinding,
    );
    assert(computed_economics_commitment == economics_commitment);

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
        owner_commitment,
        send_context_tag,
        recipient_leaf_index,
        recipient_output_root,
        change_leaf_index,
        change_output_root,
    );

    assert(computed_public_input_hash == send_public_input_hash);
}
