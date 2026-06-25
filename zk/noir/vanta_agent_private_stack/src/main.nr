use dep::poseidon::poseidon::bn254;

fn hash_agent_private_stack_commitment(agent_memory_root: Field, spending_limit: Field, blinding: Field) -> Field {
    bn254::hash_3([agent_memory_root, spending_limit, blinding])
}

fn main(
    agent_memory_root: Field,
    gpu_compute_flag: Field,
    spending_limit: Field,
    human_approval: Field,
    blinding: Field,
    threshold: Field,
    expected_memory: Field,
    limit_threshold: Field,
    commitment: Field,
    period_start: Field,
    period_end: Field
) {
    let computed = hash_agent_private_stack_commitment(agent_memory_root, spending_limit, blinding);
    assert(computed == commitment);

    assert(agent_memory_root == expected_memory);
    assert(spending_limit > limit_threshold);
    assert(gpu_compute_flag == 1);
    assert(human_approval == 1);
    assert(agent_memory_root != 0);
}

#[test]
fn test_agent_private_stack() {
    let agent_memory_root = 555555555;
    let gpu_compute_flag = 1;
    let spending_limit = 1000;
    let human_approval = 1;
    let blinding = 111111111;
    let threshold = 100;
    let expected_memory = 555555555;
    let limit_threshold = 500;
    let period_start = 20260601;
    let period_end = 20260630;

    let commitment = hash_agent_private_stack_commitment(agent_memory_root, spending_limit, blinding);

    main(agent_memory_root, gpu_compute_flag, spending_limit, human_approval, blinding, threshold, expected_memory, limit_threshold, commitment, period_start, period_end);
}