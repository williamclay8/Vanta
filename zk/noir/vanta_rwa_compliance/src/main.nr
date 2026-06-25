use ::poseidon::poseidon::bn254;

fn hash_owner_commitment(owner_secret: Field) -> Field {
    bn254::hash_1([owner_secret])
}

fn hash_rwa_commitment(
    asset_id: Field,
    owner_commitment: Field,
    rwa_id: Field,
    amount: u64,
    blinding: Field,
) -> Field {
    bn254::hash_5([asset_id, owner_commitment, rwa_id, amount as Field, blinding])
}

fn main(
    amount: u64,
    owner_secret: Field,
    jurisdiction: Field,
    accredited: Field,
    rwa_id: Field,
    blinding: Field,
    min_value: pub u64,
    asset_id: pub Field,
    expected_jurisdiction: pub Field,
    expected_accredited: pub Field,
    owner_commitment: pub Field,
    rwa_commitment: pub Field,
) {
    let computed_owner_commitment = hash_owner_commitment(owner_secret);
    assert(computed_owner_commitment == owner_commitment);

    let computed_rwa_commitment = hash_rwa_commitment(
        asset_id,
        owner_commitment,
        rwa_id,
        amount,
        blinding,
    );
    assert(computed_rwa_commitment == rwa_commitment);

    assert(amount >= min_value);
    assert(jurisdiction == expected_jurisdiction);
    assert(accredited == expected_accredited);
}

#[test]
fn test_rwa_compliance() {
    let amount = 250000;
    let owner_secret = 44444;
    let jurisdiction = 1;
    let accredited = 1;
    let rwa_id = 55555;
    let blinding = 88888;
    let asset_id = 9;
    let min_value = 100000;
    let owner_commitment = hash_owner_commitment(owner_secret);
    let rwa_commitment = hash_rwa_commitment(asset_id, owner_commitment, rwa_id, amount, blinding);

    main(amount, owner_secret, jurisdiction, accredited, rwa_id, blinding, min_value, asset_id, 1, 1, owner_commitment, rwa_commitment);
}
