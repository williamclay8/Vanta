use ::poseidon::poseidon::bn254;

fn hash_passport_commitment(
    reputation_score: u64,
    wallet_age_bucket: u64,
    volume_tier: u64,
    risk_flag: Field,
    passport_secret: Field,
    issuer_hash: Field,
    policy_hash: Field,
) -> Field {
    let score_commitment = bn254::hash_4([
        reputation_score as Field,
        wallet_age_bucket as Field,
        volume_tier as Field,
        risk_flag,
    ]);
    bn254::hash_4([score_commitment, passport_secret, issuer_hash, policy_hash])
}

fn hash_claim_wallet_commitment(
    claim_wallet_secret: Field,
    claim_wallet_blinding: Field,
    policy_hash: Field,
) -> Field {
    bn254::hash_3([claim_wallet_secret, claim_wallet_blinding, policy_hash])
}

fn hash_allowlist_leaf(passport_secret: Field, allowlist_leaf_secret: Field) -> Field {
    bn254::hash_2([passport_secret, allowlist_leaf_secret])
}

fn merkle_parent(current: Field, sibling: Field, index: u8) -> Field {
    if index == 0 {
        bn254::hash_2([current, sibling])
    } else {
        assert(index == 1);
        bn254::hash_2([sibling, current])
    }
}

fn compute_allowlist_root(
    leaf: Field,
    allowlist_path: [Field; 3],
    allowlist_path_indices: [u8; 3],
) -> Field {
    let level_0 = merkle_parent(leaf, allowlist_path[0], allowlist_path_indices[0]);
    let level_1 = merkle_parent(level_0, allowlist_path[1], allowlist_path_indices[1]);
    merkle_parent(level_1, allowlist_path[2], allowlist_path_indices[2])
}

fn hash_eligibility_nullifier(
    passport_secret: Field,
    policy_id: Field,
    verifier_id: Field,
    current_slot_floor: u64,
) -> Field {
    bn254::hash_4([
        passport_secret,
        policy_id,
        verifier_id,
        current_slot_floor as Field,
    ])
}

fn main(
    reputation_score: u64,
    wallet_age_bucket: u64,
    volume_tier: u64,
    risk_flag: Field,
    passport_secret: Field,
    claim_wallet_secret: Field,
    claim_wallet_blinding: Field,
    allowlist_leaf_secret: Field,
    allowlist_path: [Field; 3],
    allowlist_path_indices: [u8; 3],
    policy_id: pub Field,
    policy_hash: pub Field,
    verifier_id: pub Field,
    issuer_hash: pub Field,
    min_reputation_score: pub u64,
    min_wallet_age_bucket: pub u64,
    min_volume_tier: pub u64,
    allowlist_root: pub Field,
    passport_commitment: pub Field,
    claim_wallet_commitment: pub Field,
    eligibility_nullifier: pub Field,
    expiry_slot: pub u64,
    current_slot_floor: pub u64,
) {
    assert(policy_id != 0);
    assert(policy_hash != 0);
    assert(verifier_id != 0);
    assert(issuer_hash != 0);
    assert(allowlist_root != 0);
    assert(expiry_slot >= current_slot_floor);
    assert(risk_flag == 0);
    assert(reputation_score >= min_reputation_score);
    assert(wallet_age_bucket >= min_wallet_age_bucket);
    assert(volume_tier >= min_volume_tier);

    let computed_passport_commitment = hash_passport_commitment(
        reputation_score,
        wallet_age_bucket,
        volume_tier,
        risk_flag,
        passport_secret,
        issuer_hash,
        policy_hash,
    );
    assert(computed_passport_commitment == passport_commitment);

    let computed_claim_wallet_commitment = hash_claim_wallet_commitment(
        claim_wallet_secret,
        claim_wallet_blinding,
        policy_hash,
    );
    assert(computed_claim_wallet_commitment == claim_wallet_commitment);

    let allowlist_leaf = hash_allowlist_leaf(passport_secret, allowlist_leaf_secret);
    let computed_allowlist_root = compute_allowlist_root(
        allowlist_leaf,
        allowlist_path,
        allowlist_path_indices,
    );
    assert(computed_allowlist_root == allowlist_root);

    let computed_nullifier = hash_eligibility_nullifier(
        passport_secret,
        policy_id,
        verifier_id,
        current_slot_floor,
    );
    assert(computed_nullifier == eligibility_nullifier);
}

#[test]
fn test_passport_reputation_gate() {
    let reputation_score = 900;
    let wallet_age_bucket = 180;
    let volume_tier = 3;
    let risk_flag = 0;
    let passport_secret = 1234567;
    let claim_wallet_secret = 222222;
    let claim_wallet_blinding = 333333;
    let allowlist_leaf_secret = 444444;
    let policy_id = 42;
    let policy_hash = 100200300;
    let verifier_id = 707070;
    let issuer_hash = 515151;
    let current_slot_floor = 900000;
    let expiry_slot = 999999;
    let allowlist_path = [0, 0, 0];
    let allowlist_path_indices = [0, 0, 0];

    let passport_commitment = hash_passport_commitment(
        reputation_score,
        wallet_age_bucket,
        volume_tier,
        risk_flag,
        passport_secret,
        issuer_hash,
        policy_hash,
    );
    let claim_wallet_commitment = hash_claim_wallet_commitment(
        claim_wallet_secret,
        claim_wallet_blinding,
        policy_hash,
    );
    let allowlist_leaf = hash_allowlist_leaf(passport_secret, allowlist_leaf_secret);
    let allowlist_root = compute_allowlist_root(
        allowlist_leaf,
        allowlist_path,
        allowlist_path_indices,
    );
    let eligibility_nullifier = hash_eligibility_nullifier(
        passport_secret,
        policy_id,
        verifier_id,
        current_slot_floor,
    );

    main(
        reputation_score,
        wallet_age_bucket,
        volume_tier,
        risk_flag,
        passport_secret,
        claim_wallet_secret,
        claim_wallet_blinding,
        allowlist_leaf_secret,
        allowlist_path,
        allowlist_path_indices,
        policy_id,
        policy_hash,
        verifier_id,
        issuer_hash,
        700,
        90,
        2,
        allowlist_root,
        passport_commitment,
        claim_wallet_commitment,
        eligibility_nullifier,
        expiry_slot,
        current_slot_floor,
    );
}
