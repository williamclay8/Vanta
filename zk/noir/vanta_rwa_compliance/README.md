# vanta_rwa_compliance

RWA compliance circuit for Vanta Phase 2.

The circuit proves a private RWA amount is above a public minimum, the holder owns the private owner secret behind a public owner commitment, and selected compliance facts match public expectations.

This supports the June 10 institutional Coinbase-signal lane and RWA compliance work. It is local circuit evidence only.

## Verification

```bash
npm run zk:rwa-compliance-circuit-check
npm run institutional-coinbase-signal-check
```

## Claim Boundary

Not production RWA tokenization, not legal/compliance approval, not a security offering, not audited, and not mainnet ready.
