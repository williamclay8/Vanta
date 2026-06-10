use ::poseidon::poseidon::bn254;

fn hash_position_commitment(
    market_id: Field,
    notional_amount: u64,
    collateral_amount: u64,
    position_secret: Field,
    blinding: Field,
) -> Field {
    bn254::hash_5([
        market_id,
        notional_amount as Field,
        collateral_amount as Field,
        position_secret,
        blinding,
    ])
}

fn hash_liquidation_context(
    market_id: Field,
    maintenance_bps: u64,
    mark_price_bps: u64,
) -> Field {
    bn254::hash_3([market_id, maintenance_bps as Field, mark_price_bps as Field])
}

fn main(
    notional_amount: u64,
    collateral_amount: u64,
    position_secret: Field,
    blinding: Field,
    market_id: pub Field,
    max_leverage: pub u64,
    maintenance_bps: pub u64,
    mark_price_bps: pub u64,
    position_commitment: pub Field,
    liquidation_context: pub Field,
) {
    let computed_position_commitment = hash_position_commitment(
        market_id,
        notional_amount,
        collateral_amount,
        position_secret,
        blinding,
    );
    assert(computed_position_commitment == position_commitment);
    assert(hash_liquidation_context(market_id, maintenance_bps, mark_price_bps) == liquidation_context);

    let collateral_capacity = (collateral_amount as u128) * (max_leverage as u128);
    let notional_value = notional_amount as u128;
    assert(collateral_capacity >= notional_value);

    let collateral_bps_value = (collateral_amount as u128) * 10000;
    let maintenance_value = (notional_amount as u128) * (maintenance_bps as u128);
    assert(collateral_bps_value >= maintenance_value);
}

#[test]
fn test_private_perps_risk() {
    let notional_amount = 100000;
    let collateral_amount = 25000;
    let position_secret = 77777;
    let blinding = 66666;
    let market_id = 12;
    let max_leverage = 5;
    let maintenance_bps = 175;
    let mark_price_bps = 9000;
    let position_commitment = hash_position_commitment(market_id, notional_amount, collateral_amount, position_secret, blinding);
    let liquidation_context = hash_liquidation_context(market_id, maintenance_bps, mark_price_bps);

    main(notional_amount, collateral_amount, position_secret, blinding, market_id, max_leverage, maintenance_bps, mark_price_bps, position_commitment, liquidation_context);
}
