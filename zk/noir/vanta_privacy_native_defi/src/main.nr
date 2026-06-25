use dep::poseidon::poseidon::bn254;

fn hash_privacy_native_defi_commitment(private_flow_hash: Field, verifiable_exec: Field, blinding: Field) -> Field {
    bn254::hash_3([private_flow_hash, verifiable_exec, blinding])
}

fn main(
    private_flow_hash: Field,
    composable_flag: Field,
    verifiable_exec: Field,
    selective_attr: Field,
    blinding: Field,
    threshold: Field,
    expected_flow: Field,
    composable_threshold: Field,
    commitment: Field,
    period_start: Field,
    period_end: Field
) {
    let computed = hash_privacy_native_defi_commitment(private_flow_hash, verifiable_exec, blinding);
    assert(computed == commitment);

    assert(private_flow_hash == expected_flow);
    assert(composable_flag == composable_threshold);
    assert(verifiable_exec == 1);
    assert(selective_attr == 1);
}

#[test]
fn test_privacy_native_defi() {
    let private_flow_hash = 777777777;
    let composable_flag = 1;
    let verifiable_exec = 1;
    let selective_attr = 1;
    let blinding = 111111111;
    let threshold = 100;
    let expected_flow = 777777777;
    let composable_threshold = 1;
    let period_start = 20260601;
    let period_end = 20260630;

    let commitment = hash_privacy_native_defi_commitment(private_flow_hash, verifiable_exec, blinding);

    main(private_flow_hash, composable_flag, verifiable_exec, selective_attr, blinding, threshold, expected_flow, composable_threshold, commitment, period_start, period_end);
}