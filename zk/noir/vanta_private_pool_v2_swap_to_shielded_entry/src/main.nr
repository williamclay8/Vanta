use dep::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 20;

fn compute_nullifier_or_replay_commitment(
    input_commitment: Field,
    owner_secret: Field,
) -> Field {
    bn254::hash_2([input_commitment, owner_secret])
}

fn compute_owner_commitment(owner_secret: Field) -> Field {
    bn254::hash_1([owner_secret])
}

fn compute_input_commitment(
    owner_commitment: Field,
    input_asset_id_commitment: Field,
    input_amount: u128,
    input_blinding: Field,
    input_derivation_tag: Field,
) -> Field {
    bn254::hash_5([
        owner_commitment,
        input_asset_id_commitment,
        input_amount as Field,
        input_blinding,
        input_derivation_tag,
    ])
}

fn compute_output_commitment(
    owner_commitment: Field,
    output_asset_id_commitment: Field,
    output_amount: u128,
    output_blinding: Field,
    output_derivation_tag: Field,
) -> Field {
    bn254::hash_5([
        owner_commitment,
        output_asset_id_commitment,
        output_amount as Field,
        output_blinding,
        output_derivation_tag,
    ])
}

fn compute_swap_economics_commitment(
    input_asset_id_commitment: Field,
    output_asset_id_commitment: Field,
    input_amount: u128,
    output_amount: u128,
    min_output_amount: u128,
    slippage_bps: u128,
    economics_blinding: Field,
) -> Field {
    let asset_terms = bn254::hash_2([
        input_asset_id_commitment,
        output_asset_id_commitment,
    ]);
    let amount_terms = bn254::hash_4([
        input_amount as Field,
        output_amount as Field,
        min_output_amount as Field,
        slippage_bps as Field,
    ]);

    bn254::hash_3([asset_terms, amount_terms, economics_blinding])
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
    valid_until_slot: Field,
) -> Field {
    let output_transition = bn254::hash_2([
        output_leaf_index,
        output_root,
    ]);

    bn254::hash_12([
        request_version,
        input_root,
        input_commitment,
        nullifier_or_replay_commitment,
        settlement_commitment,
        route_commitment,
        economics_commitment,
        output_commitment,
        output_transition,
        owner_commitment,
        swap_context_tag,
        valid_until_slot,
    ])
}

fn main(
    swap_public_input_hash: pub Field,
    request_version: Field,
    input_root: Field,
    input_commitment: Field,
    input_asset_id_commitment: Field,
    input_amount: u128,
    input_blinding: Field,
    input_derivation_tag: Field,
    input_leaf_index: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
    nullifier_or_replay_commitment: Field,
    settlement_commitment: Field,
    route_commitment: Field,
    economics_commitment: Field,
    economics_blinding: Field,
    output_asset_id_commitment: Field,
    output_amount: u128,
    min_output_amount: u128,
    slippage_bps: u128,
    output_blinding: Field,
    output_derivation_tag: Field,
    output_commitment: Field,
    output_leaf_index: Field,
    output_root: Field,
    output_append_path: [Field; MERKLE_DEPTH],
    output_append_path_direction_bits: [Field; MERKLE_DEPTH],
    owner_commitment: Field,
    swap_context_tag: Field,
    valid_until_slot: Field,
    owner_secret: Field,
) {
    let computed_owner_commitment = compute_owner_commitment(owner_secret);
    assert(computed_owner_commitment == owner_commitment);

    let computed_input_commitment = compute_input_commitment(
        owner_commitment,
        input_asset_id_commitment,
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

    let computed_nullifier_or_replay_commitment =
        compute_nullifier_or_replay_commitment(input_commitment, owner_secret);
    assert(computed_nullifier_or_replay_commitment == nullifier_or_replay_commitment);

    assert(output_amount >= min_output_amount);

    let computed_economics_commitment = compute_swap_economics_commitment(
        input_asset_id_commitment,
        output_asset_id_commitment,
        input_amount,
        output_amount,
        min_output_amount,
        slippage_bps,
        economics_blinding,
    );
    assert(computed_economics_commitment == economics_commitment);

    let computed_output_commitment = compute_output_commitment(
        owner_commitment,
        output_asset_id_commitment,
        output_amount,
        output_blinding,
        output_derivation_tag,
    );
    assert(computed_output_commitment == output_commitment);

    let computed_previous_root = compute_root_from_leaf(
        0,
        output_append_path,
        output_append_path_direction_bits,
    );
    assert(computed_previous_root == input_root);

    let computed_output_root = compute_root_from_leaf(
        output_commitment,
        output_append_path,
        output_append_path_direction_bits,
    );
    assert(computed_output_root == output_root);

    let computed_output_leaf_index = compute_leaf_index_from_direction_bits(
        output_append_path_direction_bits,
    );
    assert(computed_output_leaf_index == output_leaf_index);

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
        valid_until_slot,
    );

    assert(computed_public_input_hash == swap_public_input_hash);
}
