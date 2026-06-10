use ::poseidon::poseidon::bn254;

fn hash_human_approval_commitment(
    agent_id: Field,
    policy_epoch: Field,
    approval_secret: Field,
) -> Field {
    bn254::hash_3([agent_id, policy_epoch, approval_secret])
}

fn hash_authorization_nullifier(
    agent_id: Field,
    policy_epoch: Field,
    agent_secret: Field,
) -> Field {
    bn254::hash_3([agent_id, policy_epoch, agent_secret])
}

fn hash_policy_commitment(
    agent_id: Field,
    spending_limit: u64,
    policy_epoch: Field,
    human_approval_commitment: Field,
) -> Field {
    bn254::hash_4([agent_id, spending_limit as Field, policy_epoch, human_approval_commitment])
}

fn main(
    spend_amount: u64,
    approval_secret: Field,
    agent_secret: Field,
    policy_blinding: Field,
    agent_id: pub Field,
    spending_limit: pub u64,
    policy_epoch: pub Field,
    human_approval_commitment: pub Field,
    authorization_nullifier: pub Field,
    policy_commitment: pub Field,
) {
    assert(spend_amount > 0);
    assert(spend_amount <= spending_limit);

    let computed_approval = hash_human_approval_commitment(agent_id, policy_epoch, approval_secret);
    assert(computed_approval == human_approval_commitment);

    let computed_nullifier = hash_authorization_nullifier(agent_id, policy_epoch, agent_secret);
    assert(computed_nullifier == authorization_nullifier);

    let computed_policy_commitment = hash_policy_commitment(
        agent_id,
        spending_limit,
        policy_epoch,
        human_approval_commitment,
    );
    assert(computed_policy_commitment == policy_commitment);

    assert(policy_blinding != 0);
}

#[test]
fn test_agent_spending_limit() {
    let spend_amount = 450;
    let approval_secret = 11111;
    let agent_secret = 22222;
    let policy_blinding = 33333;
    let agent_id = 42;
    let spending_limit = 500;
    let policy_epoch = 20260610;
    let human_approval_commitment = hash_human_approval_commitment(agent_id, policy_epoch, approval_secret);
    let authorization_nullifier = hash_authorization_nullifier(agent_id, policy_epoch, agent_secret);
    let policy_commitment = hash_policy_commitment(agent_id, spending_limit, policy_epoch, human_approval_commitment);

    main(spend_amount, approval_secret, agent_secret, policy_blinding, agent_id, spending_limit, policy_epoch, human_approval_commitment, authorization_nullifier, policy_commitment);
}
