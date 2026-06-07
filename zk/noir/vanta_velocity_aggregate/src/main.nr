use ::poseidon::poseidon::bn254;

// Vanta Private Velocity Intelligence Aggregate Circuit (Product 5 + extensions to SDK, Compliance, RWA, Perps)
// Proves private velocity aggregate (e.g. sum of private transfers/volume in period) > threshold
// Without revealing exact sum, individual txs, or full history.
// Binds to commitment for verifiability.
// Supports compliance facts (jurisdiction, accredited) as in selective disclosure.
// Ties to 5 Products: velocity intelligence platform, SDK primitives (predicate composer), institutional tracking.

// Public: threshold, velocity_commitment, period bounds (for audit), optional compliance publics
// Private: velocity_sum, blinding, jurisdiction, accredited, period details if needed

fn hash_velocity_commitment(velocity_sum: u64, blinding: Field) -> Field {
    bn254::hash_2([velocity_sum as Field, blinding])
}

fn main(
    velocity_sum: u64,                // private, bounded so Noir can compare it
    blinding: Field,                  // private
    jurisdiction: Field,              // private (for compliance)
    accredited: Field,                // private (for compliance)
    threshold: pub u64,               // public, bounded so Noir can compare it
    velocity_commitment: pub Field,   // public binding
    period_start: pub u64,            // public (for time-bound)
    period_end: pub u64,              // public
    expected_jurisdiction: pub Field, // public optional
    expected_accredited: pub Field,   // public optional
) {
    // Bind private velocity to public commitment
    let computed_commitment = hash_velocity_commitment(velocity_sum, blinding);
    assert(computed_commitment == velocity_commitment);

    // Prove velocity above threshold (private aggregate > public threshold).
    // Ordered values stay bounded integers; commitments cast them into Field.
    assert(velocity_sum > threshold);

    // Time-bound (period) is public for auditability; private details hidden
    // (In full: could aggregate multiple commitments with nullifiers in period)
    assert(period_end > period_start);

    // Optional compliance selective facts (can be used in composer with other predicates)
    if expected_jurisdiction != 0 {
        assert(jurisdiction == expected_jurisdiction);
    }
    if expected_accredited != 0 {
        assert(accredited == expected_accredited);
    }

    // This proof enables redacted dashboards (e.g. "velocity in 100k-1M range") and institutional selective disclosure.
}

#[test]
fn test_velocity_aggregate() {
    let velocity_sum = 450000;
    let blinding = 987654321;
    let jurisdiction = 1;
    let accredited = 1;
    let threshold = 300000;
    let period_start = 0;
    let period_end = 86400;
    let expected_jurisdiction = 1;
    let expected_accredited = 1;
    let commitment = hash_velocity_commitment(velocity_sum, blinding);

    main(velocity_sum, blinding, jurisdiction, accredited, threshold, commitment, period_start, period_end, expected_jurisdiction, expected_accredited);
}
