# vanta_private_perps_risk

Private perps risk circuit for Vanta Phase 2.

The circuit binds a private notional/collateral witness to a public position commitment and proves that the position is within public leverage and maintenance constraints.

## Verification

```bash
npm run zk:private-perps-risk-circuit-check
```

## Claim Boundary

This is not a derivatives venue, not liquidation execution, not production privacy, not audited risk logic, and not mainnet settlement.
