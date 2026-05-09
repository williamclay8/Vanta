use ::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 3;

fn compute_nullifier(input_commitment: Field, owner_secret: Field) -> Field {
    bn254::hash_2([input_commitment, owner_secret])
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
    input_commitment: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut current = hash_merkle_leaf(input_commitment);

    for i in 0..MERKLE_DEPTH {
        let sibling = membership_path[i];
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

fn compute_leaf_index_from_direction_bits(
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    membership_path_direction_bits[0]
        + membership_path_direction_bits[1] * 2
        + membership_path_direction_bits[2] * 4
}

fn compute_append_root(
    previous_root: Field,
    output_commitment: Field,
    leaf_index: Field,
) -> Field {
    bn254::hash_3([previous_root, output_commitment, leaf_index])
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
    change_leaf_index: Field,
    change_output_root: Field,
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

    let computed_recipient_output_root = compute_append_root(
        input_root,
        recipient_output_commitment,
        recipient_leaf_index,
    );
    assert(computed_recipient_output_root == recipient_output_root);

    let computed_change_output_root = compute_append_root(
        recipient_output_root,
        change_output_commitment,
        change_leaf_index,
    );
    assert(computed_change_output_root == change_output_root);

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
