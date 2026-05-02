use ::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 3;

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

fn compute_nullifier(input_commitment: Field, note_secret: Field, pool_id: Field) -> Field {
    bn254::hash_3([input_commitment, note_secret, pool_id])
}

fn compute_leaf_index_from_direction_bits(
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    membership_path_direction_bits[0]
        + membership_path_direction_bits[1] * 2
        + membership_path_direction_bits[2] * 4
}

fn bind_private_spend_public_inputs(
    request_version: Field,
    pool_id: Field,
    asset_cohort: Field,
    accepted_root: Field,
    input_commitment: Field,
    leaf_index: Field,
    nullifier: Field,
    output_commitment_0: Field,
    output_commitment_1: Field,
    context_hash: Field,
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let output_commitment_hash = bn254::hash_2([
        output_commitment_0,
        output_commitment_1,
    ]);
    let membership_binding = bn254::hash_6([
        accepted_root,
        input_commitment,
        leaf_index,
        membership_path_direction_bits[0],
        membership_path_direction_bits[1],
        membership_path_direction_bits[2],
    ]);

    bn254::hash_11([
        request_version,
        pool_id,
        asset_cohort,
        membership_binding,
        nullifier,
        output_commitment_hash,
        context_hash,
        output_commitment_0,
        output_commitment_1,
        accepted_root,
        leaf_index,
    ])
}

fn main(
    private_spend_public_input_hash: pub Field,
    request_version: Field,
    pool_id: Field,
    asset_cohort: Field,
    accepted_root: Field,
    input_commitment: Field,
    leaf_index: Field,
    nullifier: Field,
    output_commitment_0: Field,
    output_commitment_1: Field,
    context_hash: Field,
    note_secret: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) {
    let computed_root = compute_root(
        input_commitment,
        membership_path,
        membership_path_direction_bits,
    );
    assert(computed_root == accepted_root);

    let computed_nullifier = compute_nullifier(input_commitment, note_secret, pool_id);
    assert(computed_nullifier == nullifier);

    let computed_leaf_index = compute_leaf_index_from_direction_bits(
        membership_path_direction_bits,
    );
    assert(computed_leaf_index == leaf_index);

    let computed_public_input_hash = bind_private_spend_public_inputs(
        request_version,
        pool_id,
        asset_cohort,
        accepted_root,
        input_commitment,
        leaf_index,
        nullifier,
        output_commitment_0,
        output_commitment_1,
        context_hash,
        membership_path_direction_bits,
    );

    assert(computed_public_input_hash == private_spend_public_input_hash);
}
