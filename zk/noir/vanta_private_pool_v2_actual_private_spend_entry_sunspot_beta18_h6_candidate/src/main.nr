use dep::poseidon::poseidon::bn254;

global MERKLE_DEPTH: u32 = 20;

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

fn compute_nullifier(input_commitment: Field, note_secret: Field, pool_id: Field) -> Field {
    bn254::hash_3([input_commitment, note_secret, pool_id])
}

fn compute_input_commitment(
    note_secret: Field,
    pool_id: Field,
    asset_cohort: Field,
    input_blinding: Field,
    input_derivation_tag: Field,
) -> Field {
    bn254::hash_5([
        note_secret,
        pool_id,
        asset_cohort,
        input_blinding,
        input_derivation_tag,
    ])
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
) -> Field {
    let output_commitment_hash = bn254::hash_2([
        output_commitment_0,
        output_commitment_1,
    ]);
    let membership_binding = bn254::hash_3([
        accepted_root,
        input_commitment,
        leaf_index,
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

// H6 fix (2026-05-22): in-circuit decomposition of `context_hash`.
//
// Before this change, `context_hash` was an opaque private Field input;
// the circuit included it in `bind_private_spend_public_inputs` but never
// verified its preimage. The off-circuit rail constructs context_hash as
// hash(merchant, denomination, settlement_epoch, nullifier), and a
// malicious or compromised relayer that mutated the off-circuit hash had
// no in-circuit check stopping them.
//
// We now mirror the `derive_consume_context_tag` pattern in
// `vanta_private_core_single_note_unshield/src/main.nr`: take the
// preimage components as private Field inputs, recompute the tag with
// the same Poseidon shape, and assert equality with the supplied
// `context_hash`. The hash is `poseidon6` over
// `(merchant_address_hi, merchant_address_lo, denomination,
//   settlement_epoch_hi, settlement_epoch_lo, nullifier)` so that
// every component a payment receipt commits to is bound in-circuit.
//
// This adds new private inputs to `main`. Callers (off-circuit rail,
// fixture, Prover.toml) must supply them; existing Prover.toml fixtures
// without these fields will fail to load until updated. The on-chain
// public-input layout in `process_spend_with_proof` is unchanged - the
// `public_input_hash` byte slot still binds the same Poseidon11 shape;
// only the circuit's witness-time constraints are stricter.
fn derive_actual_private_spend_context_tag(
    context_preimage_merchant_address_hi: Field,
    context_preimage_merchant_address_lo: Field,
    context_preimage_denomination: Field,
    context_preimage_settlement_epoch_hi: Field,
    context_preimage_settlement_epoch_lo: Field,
    nullifier: Field,
) -> Field {
    bn254::hash_6([
        context_preimage_merchant_address_hi,
        context_preimage_merchant_address_lo,
        context_preimage_denomination,
        context_preimage_settlement_epoch_hi,
        context_preimage_settlement_epoch_lo,
        nullifier,
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
    input_blinding: Field,
    input_derivation_tag: Field,
    // H6: context_hash preimage components, asserted in-circuit below.
    context_preimage_merchant_address_hi: Field,
    context_preimage_merchant_address_lo: Field,
    context_preimage_denomination: Field,
    context_preimage_settlement_epoch_hi: Field,
    context_preimage_settlement_epoch_lo: Field,
    membership_path: [Field; MERKLE_DEPTH],
    membership_path_direction_bits: [Field; MERKLE_DEPTH],
) {
    let computed_input_commitment = compute_input_commitment(
        note_secret,
        pool_id,
        asset_cohort,
        input_blinding,
        input_derivation_tag,
    );
    assert(computed_input_commitment == input_commitment);

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

    // H6: bind context_hash to its preimage. A relayer that mutates the
    // off-circuit context hash without updating the preimage fields will
    // fail this assertion before the proof completes.
    let computed_context_hash = derive_actual_private_spend_context_tag(
        context_preimage_merchant_address_hi,
        context_preimage_merchant_address_lo,
        context_preimage_denomination,
        context_preimage_settlement_epoch_hi,
        context_preimage_settlement_epoch_lo,
        nullifier,
    );
    assert(computed_context_hash == context_hash);

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
    );

    assert(computed_public_input_hash == private_spend_public_input_hash);
}
