use ::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 3;

fn compute_nullifier_or_replay_commitment(
    input_commitment: Field,
    owner_secret: Field,
) -> Field {
    bn254::hash_2([input_commitment, owner_secret])
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
            current = hash_merkle_node(sibling, current);
        } else {
            current = hash_merkle_node(current, sibling);
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

fn bind_swap_public_inputs(
    request_version: Field,
    input_root: Field,
    input_commitment: Field,
    nullifier_or_replay_commitment: Field,
    settlement_commitment: Field,
    route_commitment: Field,
    economics_commitment: Field,
    output_commitment: Field,
    output_leaf_index: Field,
    output_root: Field,
    owner_commitment: Field,
    swap_context_tag: Field,
) -> Field {
    bn254::hash_12([
        request_version,
        input_root,
        input_commitment,
        nullifier_or_replay_commitment,
        settlement_commitment,
        route_commitment,
        economics_commitment,
        output_commitment,
        output_leaf_index,
        output_root,
        owner_commitment,
        swap_context_tag,
    ])
}

fn main(
    swap_public_input_hash: pub Field,
    request_version: Field,
    input_root: Field,
    input_commitment: Field,
    input_leaf_index: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
    nullifier_or_replay_commitment: Field,
    settlement_commitment: Field,
    route_commitment: Field,
    economics_commitment: Field,
    output_commitment: Field,
    output_leaf_index: Field,
    output_root: Field,
    owner_commitment: Field,
    swap_context_tag: Field,
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

    let computed_nullifier_or_replay_commitment =
        compute_nullifier_or_replay_commitment(input_commitment, owner_secret);
    assert(computed_nullifier_or_replay_commitment == nullifier_or_replay_commitment);

    let computed_output_root = compute_append_root(
        input_root,
        output_commitment,
        output_leaf_index,
    );
    assert(computed_output_root == output_root);

    let computed_public_input_hash = bind_swap_public_inputs(
        request_version,
        input_root,
        input_commitment,
        nullifier_or_replay_commitment,
        settlement_commitment,
        route_commitment,
        economics_commitment,
        output_commitment,
        output_leaf_index,
        output_root,
        owner_commitment,
        swap_context_tag,
    );

    assert(computed_public_input_hash == swap_public_input_hash);
}
