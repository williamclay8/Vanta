use ::poseidon::poseidon::bn254;

fn hash_provenance_commitment(
    provenance_score: u64,
    risk_bucket: u64,
    account_graph_secret: Field,
    provenance_blinding: Field,
) -> Field {
    bn254::hash_4([
        provenance_score as Field,
        risk_bucket as Field,
        account_graph_secret,
        provenance_blinding,
    ])
}

fn hash_membership_nullifier(
    pool_membership_secret: Field,
    policy_hash: Field,
    disclosure_purpose_hash: Field,
) -> Field {
    bn254::hash_3([pool_membership_secret, policy_hash, disclosure_purpose_hash])
}

fn main(
    provenance_score: u64,
    risk_bucket: u64,
    account_graph_secret: Field,
    pool_membership_secret: Field,
    provenance_blinding: Field,
    min_provenance_score: pub u64,
    max_risk_bucket: pub u64,
    policy_hash: pub Field,
    verifier_id: pub Field,
    disclosure_purpose_hash: pub Field,
    provenance_commitment: pub Field,
    membership_nullifier: pub Field,
    expiry_slot: pub u64,
    current_slot_floor: pub u64,
) {
    assert(policy_hash != 0);
    assert(verifier_id != 0);
    assert(disclosure_purpose_hash != 0);
    assert(expiry_slot >= current_slot_floor);
    assert(provenance_score >= min_provenance_score);
    assert(risk_bucket <= max_risk_bucket);

    let computed_provenance_commitment = hash_provenance_commitment(
        provenance_score,
        risk_bucket,
        account_graph_secret,
        provenance_blinding,
    );
    assert(computed_provenance_commitment == provenance_commitment);

    let computed_membership_nullifier = hash_membership_nullifier(
        pool_membership_secret,
        policy_hash,
        disclosure_purpose_hash,
    );
    assert(computed_membership_nullifier == membership_nullifier);
}

#[test]
fn test_clean_provenance_disclosure() {
    let provenance_score = 920;
    let risk_bucket = 2;
    let account_graph_secret = 123123;
    let pool_membership_secret = 456456;
    let provenance_blinding = 789789;
    let policy_hash = 100200300;
    let verifier_id = 707070;
    let disclosure_purpose_hash = 606060;
    let expiry_slot = 999999;
    let current_slot_floor = 900000;

    let provenance_commitment = hash_provenance_commitment(
        provenance_score,
        risk_bucket,
        account_graph_secret,
        provenance_blinding,
    );
    let membership_nullifier = hash_membership_nullifier(
        pool_membership_secret,
        policy_hash,
        disclosure_purpose_hash,
    );

    main(
        provenance_score,
        risk_bucket,
        account_graph_secret,
        pool_membership_secret,
        provenance_blinding,
        800,
        3,
        policy_hash,
        verifier_id,
        disclosure_purpose_hash,
        provenance_commitment,
        membership_nullifier,
        expiry_slot,
        current_slot_floor,
    );
}
