use ::poseidon::poseidon::bn254;

// Selective Disclosure Primitive for Vanta (Product 1/Compliance Gateway + extensions for others)
// Proves:
// - amount > threshold (range/inequality)
// - jurisdiction == expected_jurisdiction
// Without revealing exact amount or other private data.
// Ties to a commitment for verifiability (amount + blinding).
//
// Public inputs: threshold, expected_jurisdiction, amount_commitment (for binding)
// Private inputs: amount, jurisdiction, blinding
//
// This is the starting real Noir circuit for the pre-circuit JS simulations in the 5 products.
// Future: expand to time-bound, more attributes, integration with Private Pool v2 Merkle, velocity aggregates.

fn hash_amount_commitment(amount: u64, blinding: Field) -> Field {
    bn254::hash_2([amount as Field, blinding])
}

fn main(
    amount: u64,                      // private, bounded so Noir can compare it
    jurisdiction: Field,              // private
    blinding: Field,                  // private
    threshold: pub u64,               // public, bounded so Noir can compare it
    expected_jurisdiction: pub Field, // public
    amount_commitment: pub Field,     // public (binding)
) {
    // Bind the private amount to the public commitment
    let computed_commitment = hash_amount_commitment(amount, blinding);
    assert(computed_commitment == amount_commitment);

    // Prove amount > threshold (selective disclosure for "amountAboveThreshold").
    // Ordered values stay bounded integers; commitments cast them into Field.
    assert(amount > threshold);

    // Prove jurisdiction match (selective disclosure for "jurisdictionMatch")
    assert(jurisdiction == expected_jurisdiction);

    // In real use: this proof can be generated client-side, sent to regulator with the public inputs + proof.
    // Verifier checks the proof against VK, without learning private amount/jurisdiction.
}

#[test]
fn test_selective_disclosure() {
    // Example test values (amount 150 > 100, jurisdiction US=1)
    let amount = 150;
    let jurisdiction = 1;
    let blinding = 123456789;
    let threshold = 100;
    let expected_jurisdiction = 1;
    let commitment = hash_amount_commitment(amount, blinding);

    main(amount, jurisdiction, blinding, threshold, expected_jurisdiction, commitment);
}
