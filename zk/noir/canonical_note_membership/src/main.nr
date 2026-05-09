use ::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 20;

fn hash_note(
    version: Field,
    asset_id_hi: Field,
    asset_id_lo: Field,
    amount_lo: Field,
    amount_hi: Field,
    owner_public_key: Field,
    note_nonce: Field,
    note_secret: Field,
    blinding: Field,
    derivation_tag: Field,
) -> Field {
    bn254::hash_10([
        version,
        asset_id_hi,
        asset_id_lo,
        amount_lo,
        amount_hi,
        owner_public_key,
        note_nonce,
        note_secret,
        blinding,
        derivation_tag,
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

fn merkle_root_from_path(
    leaf: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_index_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut current = hash_merkle_leaf(leaf);

    for i in 0..MERKLE_DEPTH {
        let sibling = membership_path[i];
        let direction = membership_path_index_bits[i];

        assert_direction_bit(direction);

        if direction == 1 {
            current = hash_merkle_node(sibling, current);
        } else {
            current = hash_merkle_node(current, sibling);
        }
    }

    current
}

fn compute_leaf_index_from_direction_bits(
    membership_path_index_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut computed_leaf_index = 0;
    let mut multiplier = 1;

    for i in 0..MERKLE_DEPTH {
        let direction = membership_path_index_bits[i];

        assert_direction_bit(direction);

        computed_leaf_index += direction * multiplier;
        multiplier *= 2;
    }

    computed_leaf_index
}

pub fn main(
    commitment: pub Field,
    membership_root: pub Field,
    version: Field,
    asset_id_hi: Field,
    asset_id_lo: Field,
    amount_lo: Field,
    amount_hi: Field,
    owner_public_key: Field,
    note_nonce: Field,
    note_secret: Field,
    blinding: Field,
    derivation_tag: Field,
    leaf_index: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_index_bits: [Field; MERKLE_DEPTH],
) {
    let computed_commitment = hash_note(
        version,
        asset_id_hi,
        asset_id_lo,
        amount_lo,
        amount_hi,
        owner_public_key,
        note_nonce,
        note_secret,
        blinding,
        derivation_tag,
    );

    assert(computed_commitment == commitment);

    let computed_root = merkle_root_from_path(
        computed_commitment,
        membership_path,
        membership_path_index_bits,
    );

    assert(computed_root == membership_root);

    let computed_leaf_index = compute_leaf_index_from_direction_bits(
        membership_path_index_bits,
    );
    assert(computed_leaf_index == leaf_index);
}
