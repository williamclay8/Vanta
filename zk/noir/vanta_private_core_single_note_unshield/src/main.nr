use ::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 3;

fn hash_note_header(note_version: Field, note_type_code: Field) -> Field {
    bn254::hash_2([note_version, note_type_code])
}

fn hash_note_commitment(
    note_version: Field,
    note_type_code: Field,
    asset_id_hi: Field,
    asset_id_lo: Field,
    amount_lo: Field,
    amount_hi: Field,
    owner_public_key_hi: Field,
    owner_public_key_lo: Field,
    note_nonce_hi: Field,
    note_nonce_lo: Field,
    note_secret_hi: Field,
    note_secret_lo: Field,
    blinding_hi: Field,
    blinding_lo: Field,
    derivation_tag_hi: Field,
    derivation_tag_lo: Field,
) -> Field {
    let note_header = hash_note_header(note_version, note_type_code);

    bn254::hash_15([
        note_header,
        asset_id_hi,
        asset_id_lo,
        amount_lo,
        amount_hi,
        owner_public_key_hi,
        owner_public_key_lo,
        note_nonce_hi,
        note_nonce_lo,
        note_secret_hi,
        note_secret_lo,
        blinding_hi,
        blinding_lo,
        derivation_tag_hi,
        derivation_tag_lo,
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

fn compute_root(
    leaf: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut current = leaf;

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

fn compute_leaf_index(membership_path_direction_bits: [Field; MERKLE_DEPTH]) -> Field {
    let mut index = 0;
    let mut bit_weight = 1;

    for i in 0..MERKLE_DEPTH {
        let is_current_right = membership_path_direction_bits[i];
        assert_direction_bit(is_current_right);
        index = index + is_current_right * bit_weight;
        bit_weight = bit_weight * 2;
    }

    index
}

fn derive_nullifier(
    note_secret_hi: Field,
    note_secret_lo: Field,
    note_nonce_hi: Field,
    note_nonce_lo: Field,
    state_root: Field,
    merkle_leaf: Field,
) -> Field {
    bn254::hash_6([
        note_secret_hi,
        note_secret_lo,
        note_nonce_hi,
        note_nonce_lo,
        state_root,
        merkle_leaf,
    ])
}

fn derive_consume_context_tag(
    release_destination_hi: Field,
    release_destination_lo: Field,
    asset_id_hi: Field,
    asset_id_lo: Field,
    amount_lo: Field,
    amount_hi: Field,
    note_version: Field,
    nullifier: Field,
) -> Field {
    bn254::hash_8([
        release_destination_hi,
        release_destination_lo,
        asset_id_hi,
        asset_id_lo,
        amount_lo,
        amount_hi,
        note_version,
        nullifier,
    ])
}

fn derive_unshield_economic_terms_hash(
    release_destination_hi: Field,
    release_destination_lo: Field,
    asset_id_hi: Field,
    asset_id_lo: Field,
    amount_lo: Field,
    amount_hi: Field,
    note_version: Field,
) -> Field {
    bn254::hash_8([
        release_destination_hi,
        release_destination_lo,
        asset_id_hi,
        asset_id_lo,
        amount_lo,
        amount_hi,
        note_version,
        0,
    ])
}

fn main(
    state_root: pub Field,
    nullifier: pub Field,
    unshield_economic_terms_hash: pub Field,
    note_version: pub Field,
    consume_context_tag_hi: pub Field,
    consume_context_tag_lo: pub Field,
    release_destination_hi: Field,
    release_destination_lo: Field,
    asset_id_hi: Field,
    asset_id_lo: Field,
    amount_lo: Field,
    amount_hi: Field,
    note_type_code: Field,
    owner_public_key_hi: Field,
    owner_public_key_lo: Field,
    owner_secret_key_hi: Field,
    owner_secret_key_lo: Field,
    note_nonce_hi: Field,
    note_nonce_lo: Field,
    note_secret_hi: Field,
    note_secret_lo: Field,
    blinding_hi: Field,
    blinding_lo: Field,
    derivation_tag_hi: Field,
    derivation_tag_lo: Field,
    leaf_index: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) {
    assert(note_version == 0);
    assert(note_type_code == 0);

    let commitment = hash_note_commitment(
        note_version,
        note_type_code,
        asset_id_hi,
        asset_id_lo,
        amount_lo,
        amount_hi,
        owner_public_key_hi,
        owner_public_key_lo,
        note_nonce_hi,
        note_nonce_lo,
        note_secret_hi,
        note_secret_lo,
        blinding_hi,
        blinding_lo,
        derivation_tag_hi,
        derivation_tag_lo,
    );

    let leaf = hash_merkle_leaf(commitment);

    let computed_root = compute_root(
        leaf,
        membership_path,
        membership_path_direction_bits,
    );
    assert(computed_root == state_root);

    let computed_nullifier = derive_nullifier(
        note_secret_hi,
        note_secret_lo,
        note_nonce_hi,
        note_nonce_lo,
        state_root,
        leaf,
    );
    assert(computed_nullifier == nullifier);
    let computed_leaf_index = compute_leaf_index(membership_path_direction_bits);
    assert(leaf_index == computed_leaf_index);

    let computed_consume_context_tag = derive_consume_context_tag(
        release_destination_hi,
        release_destination_lo,
        asset_id_hi,
        asset_id_lo,
        amount_lo,
        amount_hi,
        note_version,
        nullifier,
    );
    assert(consume_context_tag_hi == 0);
    assert(computed_consume_context_tag == consume_context_tag_lo);

    let computed_unshield_economic_terms_hash = derive_unshield_economic_terms_hash(
        release_destination_hi,
        release_destination_lo,
        asset_id_hi,
        asset_id_lo,
        amount_lo,
        amount_hi,
        note_version,
    );
    assert(computed_unshield_economic_terms_hash == unshield_economic_terms_hash);

    // v0.1 assumption: owner secret ownership is still prechecked off-circuit.
    // Reject an all-zero placeholder secret so the owner-auth witness is not a
    // no-op while the full in-circuit key relation remains future work.
    assert(owner_secret_key_hi + owner_secret_key_lo != 0);
}
