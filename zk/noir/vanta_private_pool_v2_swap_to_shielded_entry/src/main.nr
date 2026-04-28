use ::poseidon::poseidon::bn254;

fn compute_nullifier_or_replay_commitment(
    input_commitment: Field,
    owner_secret: Field,
) -> Field {
    bn254::hash_2([input_commitment, owner_secret])
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
