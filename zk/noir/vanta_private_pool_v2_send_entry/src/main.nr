use ::poseidon::poseidon::bn254;

fn compute_nullifier(input_commitment: Field, owner_secret: Field) -> Field {
    bn254::hash_2([input_commitment, owner_secret])
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
