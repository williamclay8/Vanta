use ::poseidon::poseidon::bn254;

fn compute_nullifier(input_commitment: Field, owner_secret: Field) -> Field {
    bn254::hash_2([input_commitment, owner_secret])
}

fn bind_claim_public_inputs(
    request_version: Field,
    asset_id: Field,
    amount: Field,
    owner_commitment: Field,
    tree_id: Field,
    leaf_index: Field,
    input_commitment: Field,
    input_root: Field,
    nullifier: Field,
    destination: Field,
    relayer_id: Field,
    relayer_fee: Field,
    quote_expires_at_slot: Field,
) -> Field {
    let input_membership = bn254::hash_3([tree_id, leaf_index, input_root]);
    let claim_terms = bn254::hash_4([
        destination,
        relayer_id,
        relayer_fee,
        quote_expires_at_slot,
    ]);

    bn254::hash_11([
        request_version,
        asset_id,
        amount,
        owner_commitment,
        input_membership,
        input_commitment,
        nullifier,
        claim_terms,
        tree_id,
        leaf_index,
        input_root,
    ])
}

fn main(
    claim_public_input_hash: pub Field,
    request_version: Field,
    asset_id: Field,
    amount: Field,
    owner_commitment: Field,
    tree_id: Field,
    leaf_index: Field,
    input_commitment: Field,
    input_root: Field,
    nullifier: Field,
    destination: Field,
    relayer_id: Field,
    relayer_fee: Field,
    quote_expires_at_slot: Field,
    owner_secret: Field,
) {
    let computed_nullifier = compute_nullifier(input_commitment, owner_secret);
    assert(computed_nullifier == nullifier);

    let computed_public_input_hash = bind_claim_public_inputs(
        request_version,
        asset_id,
        amount,
        owner_commitment,
        tree_id,
        leaf_index,
        input_commitment,
        input_root,
        nullifier,
        destination,
        relayer_id,
        relayer_fee,
        quote_expires_at_slot,
    );

    assert(computed_public_input_hash == claim_public_input_hash);
}
