use ::poseidon::poseidon::bn254;

fn bind_shield_public_inputs(
    request_version: Field,
    source_mint: Field,
    target_mint: Field,
    target_asset_id: Field,
    amount: Field,
    owner_commitment: Field,
    route_commitment: Field,
    tree_id: Field,
    leaf_index: Field,
    output_commitment: Field,
    previous_root: Field,
    output_root: Field,
) -> Field {
    let root_transition = bn254::hash_2([previous_root, output_root]);

    bn254::hash_11([
        request_version,
        source_mint,
        target_mint,
        target_asset_id,
        amount,
        owner_commitment,
        route_commitment,
        tree_id,
        leaf_index,
        output_commitment,
        root_transition,
    ])
}

fn compute_append_root(
    previous_root: Field,
    output_commitment: Field,
    leaf_index: Field,
) -> Field {
    bn254::hash_3([previous_root, output_commitment, leaf_index])
}

fn main(
    shield_public_input_hash: pub Field,
    request_version: Field,
    source_mint: Field,
    target_mint: Field,
    target_asset_id: Field,
    amount: Field,
    owner_commitment: Field,
    route_commitment: Field,
    tree_id: Field,
    leaf_index: Field,
    output_commitment: Field,
    previous_root: Field,
    output_root: Field,
) {
    let computed_output_root = compute_append_root(
        previous_root,
        output_commitment,
        leaf_index,
    );
    assert(computed_output_root == output_root);

    let computed_public_input_hash = bind_shield_public_inputs(
        request_version,
        source_mint,
        target_mint,
        target_asset_id,
        amount,
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
