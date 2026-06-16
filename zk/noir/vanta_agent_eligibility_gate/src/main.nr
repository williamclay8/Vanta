use ::poseidon::poseidon::bn254;

fn hash_agent_id_commitment(passport_secret: Field, policy_secret: Field) -> Field {
    bn254::hash_2([passport_secret, policy_secret])
}

fn hash_eligibility_commitment(
    reputation_score: u64,
    account_age_bucket: u64,
    tx_count_bucket: u64,
    risk_flag: Field,
    passport_secret: Field,
    policy_secret: Field,
    policy_hash: Field,
) -> Field {
    let score_commitment = bn254::hash_4([
        reputation_score as Field,
        account_age_bucket as Field,
        tx_count_bucket as Field,
        risk_flag,
    ]);
    bn254::hash_4([score_commitment, passport_secret, policy_secret, policy_hash])
}

fn hash_eligibility_nullifier(
    passport_secret: Field,
    policy_id: Field,
    settlement_policy_hash: Field,
) -> Field {
    bn254::hash_3([passport_secret, policy_id, settlement_policy_hash])
}

fn main(
    reputation_score: u64,
    account_age_bucket: u64,
    tx_count_bucket: u64,
    risk_flag: Field,
    passport_secret: Field,
    policy_secret: Field,
    policy_id: pub Field,
    policy_hash: pub Field,
    verifier_id: pub Field,
    min_reputation_score: pub u64,
    min_account_age_bucket: pub u64,
    min_tx_count_bucket: pub u64,
    agent_id_commitment: pub Field,
    eligibility_commitment: pub Field,
    eligibility_nullifier: pub Field,
    settlement_policy_hash: pub Field,
) {
    assert(policy_id != 0);
    assert(policy_hash != 0);
    assert(verifier_id != 0);
    assert(settlement_policy_hash != 0);
    assert(risk_flag == 0);
    assert(reputation_score >= min_reputation_score);
    assert(account_age_bucket >= min_account_age_bucket);
    assert(tx_count_bucket >= min_tx_count_bucket);

    let computed_agent_id_commitment = hash_agent_id_commitment(passport_secret, policy_secret);
    assert(computed_agent_id_commitment == agent_id_commitment);

    let computed_eligibility_commitment = hash_eligibility_commitment(
        reputation_score,
        account_age_bucket,
        tx_count_bucket,
        risk_flag,
        passport_secret,
        policy_secret,
        policy_hash,
    );
    assert(computed_eligibility_commitment == eligibility_commitment);

    let computed_nullifier = hash_eligibility_nullifier(
        passport_secret,
        policy_id,
        settlement_policy_hash,
    );
    assert(computed_nullifier == eligibility_nullifier);
}

#[test]
fn test_agent_eligibility_gate() {
    let reputation_score = 900;
    let account_age_bucket = 180;
    let tx_count_bucket = 75;
    let risk_flag = 0;
    let passport_secret = 1234567;
    let policy_secret = 555555;
    let policy_id = 42;
    let policy_hash = 100200300;
    let verifier_id = 707070;
    let settlement_policy_hash = 919191;

    let agent_id_commitment = hash_agent_id_commitment(passport_secret, policy_secret);
    let eligibility_commitment = hash_eligibility_commitment(
        reputation_score,
        account_age_bucket,
        tx_count_bucket,
        risk_flag,
        passport_secret,
        policy_secret,
        policy_hash,
    );
    let eligibility_nullifier = hash_eligibility_nullifier(
        passport_secret,
        policy_id,
        settlement_policy_hash,
    );

    main(
        reputation_score,
        account_age_bucket,
        tx_count_bucket,
        risk_flag,
        passport_secret,
        policy_secret,
        policy_id,
        policy_hash,
        verifier_id,
        700,
        90,
        25,
        agent_id_commitment,
        eligibility_commitment,
        eligibility_nullifier,
        settlement_policy_hash,
    );
}
