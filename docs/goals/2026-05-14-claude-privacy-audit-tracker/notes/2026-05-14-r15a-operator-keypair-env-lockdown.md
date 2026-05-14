# R15A Operator Keypair Env Lockdown Guard - 2026-05-14

## Status

Local implemented.

## What This Closes

This closes the local guard part of R15A from the Claude privacy audit: Vanta now has a dedicated repo check for operator-side raw Solana keypair env loading beyond the frontend bundle exposure scan.

## Guarded Boundaries

- Pay server: may keep `VANTA_PAY_SECRET_KEY` as a service-auth secret, but cannot load Solana keypair material through `Keypair.fromSecretKey`, `loadKeypairFromEnv`, or raw keypair/private-key env names.
- Swap auth: remains wallet-signature based and cannot grow env secret/keypair handling.
- Jupiter SOL-to-shielded adapter: remains the only local-only liquidity-keypair exception and must enforce `assertLiquiditySignerPolicy()` before parsing raw keypair env JSON. Production must use `VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF` and the wrapped external signer/HSM boundary.
- Rebalance-related operator files: if a rebalance path appears in `operator/`, the guard scans it for raw keypair loading.
- Unshield server: remains the known A2 operator-keypair public-exit exception. This guard keeps that exception explicit; it does not close custody.

## Files

- `scripts/check-vanta-operator-keypair-env-lockdown.mjs`
- `package.json`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-completion-audit.md`

## Verification

- `npm run operator:keypair-env-lockdown-check`

## Truth Boundary

This is a static guard and local audit closure for Pay, Swap auth, Jupiter local-only signer policy, and rebalance-related operator files. It is not a program-owned custody migration, not a Unshield vault-signer removal, not live deployment evidence, not a secret-manager provisioning receipt, and not production privacy.
