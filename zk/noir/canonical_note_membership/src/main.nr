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
    // Placeholder Poseidon proving lane for the first executable target.
    version
        + asset_id_hi
        + asset_id_lo
        + amount_lo
        + amount_hi
        + owner_public_key
        + note_nonce
        + note_secret
        + blinding
        + derivation_tag
}

fn merkle_root_from_path(
    leaf: Field,
    leaf_index: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_index_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut current = leaf;
    let mut i = 0;
    for sibling in membership_path {
        let direction = membership_path_index_bits[i];
        current = current + sibling + direction + leaf_index; // TODO: replace with Poseidon node hash
        i += 1;
    }
    current
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
        leaf_index,
        membership_path,
        membership_path_index_bits,
    );

    assert(computed_root == membership_root);
}
