use ::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 20;

fn compute_nullifier(input_commitment: Field, owner_secret: Field) -> Field {
    bn254::hash_2([input_commitment, owner_secret])
}

fn compute_owner_commitment(owner_secret: Field) -> Field {
    bn254::hash_1([owner_secret])
}

fn compute_input_commitment(
    owner_commitment: Field,
    asset_id: Field,
    amount: u128,
    input_blinding: Field,
    input_derivation_tag: Field,
) -> Field {
    bn254::hash_5([
        owner_commitment,
        asset_id,
        amount as Field,
        input_blinding,
        input_derivation_tag,
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
            current = hash_merkle_node(sibling, current);
        } else {
            current = hash_merkle_node(current, sibling);
        }
    }

    current
}

fn compute_leaf_index_from_direction_bits(
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) -> Field {
    let mut leaf_index = 0;
    let mut bit_weight = 1;

    for i in 0..MERKLE_DEPTH {
        let direction_bit = membership_path_direction_bits[i];

        assert_direction_bit(direction_bit);

        leaf_index = leaf_index + direction_bit * bit_weight;
        bit_weight = bit_weight * 2;
    }

    leaf_index
}

fn bind_claim_public_inputs(
    request_version: Field,
    asset_id: Field,
    amount: u128,
    owner_commitment: Field,
    tree_id: Field,
    leaf_index: Field,
    input_commitment: Field,
    input_root: Field,
    nullifier: Field,
    destination: Field,
    relayer_id: Field,
    relayer_fee: u128,
    net_payout: u128,
    quote_expires_at_slot: Field,
) -> Field {
    let input_membership = bn254::hash_3([tree_id, leaf_index, input_root]);
    let claim_terms = bn254::hash_5([
        destination,
        relayer_id,
        relayer_fee as Field,
        net_payout as Field,
        quote_expires_at_slot,
    ]);

    bn254::hash_11([
        request_version,
        asset_id,
        amount as Field,
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
    amount: u128,
    owner_commitment: Field,
    tree_id: Field,
    leaf_index: Field,
    input_commitment: Field,
    input_root: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
    nullifier: Field,
    destination: Field,
    relayer_id: Field,
    relayer_fee: u128,
    net_payout: u128,
    quote_expires_at_slot: Field,
    owner_secret: Field,
    input_blinding: Field,
    input_derivation_tag: Field,
) {
    let computed_owner_commitment = compute_owner_commitment(owner_secret);
    assert(computed_owner_commitment == owner_commitment);

    let computed_input_commitment = compute_input_commitment(
        owner_commitment,
        asset_id,
        amount,
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

    let computed_leaf_index = compute_leaf_index_from_direction_bits(
        membership_path_direction_bits,
    );
    assert(computed_leaf_index == leaf_index);

    let computed_nullifier = compute_nullifier(input_commitment, owner_secret);
    assert(computed_nullifier == nullifier);

    assert(relayer_fee <= amount);
    assert(amount as Field == net_payout as Field + relayer_fee as Field);

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
        net_payout,
        quote_expires_at_slot,
    );

    assert(computed_public_input_hash == claim_public_input_hash);
}
