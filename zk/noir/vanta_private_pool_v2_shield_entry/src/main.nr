use ::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 3;

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
    append_path: [Field; MERKLE_DEPTH],
    append_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut current = hash_merkle_leaf(leaf_value);

    for i in 0..MERKLE_DEPTH {
        let sibling = append_path[i];
        let is_current_right = append_path_direction_bits[i];

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
    append_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    append_path_direction_bits[0]
        + append_path_direction_bits[1] * 2
        + append_path_direction_bits[2] * 4
}

fn bind_shield_public_inputs(
    request_version: Field,
    economics_commitment: Field,
    owner_commitment: Field,
    route_commitment: Field,
    tree_id: Field,
    leaf_index: Field,
    output_commitment: Field,
    previous_root: Field,
    output_root: Field,
) -> Field {
    let root_transition = bn254::hash_2([previous_root, output_root]);

    bn254::hash_8([
        request_version,
        economics_commitment,
        owner_commitment,
        route_commitment,
        tree_id,
        leaf_index,
        output_commitment,
        root_transition,
    ])
}

fn compute_economics_commitment(
    source_mint: Field,
    target_mint: Field,
    target_asset_id: Field,
    amount: u128,
    economics_blinding: Field,
) -> Field {
    bn254::hash_5([
        source_mint,
        target_mint,
        target_asset_id,
        amount as Field,
        economics_blinding,
    ])
}

fn main(
    shield_public_input_hash: pub Field,
    request_version: Field,
    source_mint: Field,
    target_mint: Field,
    target_asset_id: Field,
    amount: u128,
    economics_blinding: Field,
    economics_commitment: Field,
    owner_commitment: Field,
    route_commitment: Field,
    tree_id: Field,
    leaf_index: Field,
    output_commitment: Field,
    previous_root: Field,
    output_root: Field,
    append_path: [Field; MERKLE_DEPTH],
    append_path_direction_bits: [Field; MERKLE_DEPTH],
) {
    let computed_previous_root = compute_root_from_leaf(
        0,
        append_path,
        append_path_direction_bits,
    );
    assert(computed_previous_root == previous_root);

    let computed_output_root = compute_root_from_leaf(
        output_commitment,
        append_path,
        append_path_direction_bits,
    );
    assert(computed_output_root == output_root);

    let computed_leaf_index = compute_leaf_index_from_direction_bits(
        append_path_direction_bits,
    );
    assert(computed_leaf_index == leaf_index);

    let computed_economics_commitment = compute_economics_commitment(
        source_mint,
        target_mint,
        target_asset_id,
        amount,
        economics_blinding,
    );
    assert(computed_economics_commitment == economics_commitment);

    let computed_public_input_hash = bind_shield_public_inputs(
        request_version,
        economics_commitment,
        owner_commitment,
        route_commitment,
        tree_id,
        leaf_index,
        output_commitment,
        previous_root,
        output_root,
    );

    assert(computed_public_input_hash == shield_public_input_hash);
}
