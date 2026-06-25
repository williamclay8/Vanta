# Twitter Intelligence Requirements - 2026-06-10

This file turns the June 10 2026 five-lane X research run into repo-local product gates. It is a claim-control artifact, not a marketing page and not external proof of Vanta adoption.

Exact X post URLs were not present in the prompt or the local vault, and public search did not recover stable URLs. Each item keeps a `pending-from-2026-06-10-x-run` reference slot so the links can be backfilled without weakening the guard.

## T1 - Velocity/PMF

Arcium and ZINC make usage velocity concrete: 1M+ computations, ZINC top-3 revenue on Solana, and a growing set of private DeFi dApps are the benchmark shape. Vanta must track private_defi_velocity_metrics, not only proof completeness.

Required fields:

- `arcium_computations_observed: ">=1000000"`
- `zinc_revenue_rank_signal: "top-3-solana"`
- `private_defi_velocity_metrics`
- encrypted compute velocity metrics for private payments, prediction markets, sealed-bid launches, and UmbraPrivacy-like flows

Limitation: these are benchmark metrics, not Vanta usage evidence.

## T2 - Local Proving / Client-Side Groth16

zkRune, browser Groth16, Noir + React proof generation, and the Fable 90s -> 6s performance signal make local proving a product requirement. Vanta must keep request packets witnessless, browser-worker-shaped, and fail-closed.

Required fields:

- `client_side_groth16_patterns`
- `browser_groth16_perf_target_seconds: 6`
- `private_inputs_never_leave_client: true`
- zkAgent Passport-style agent authorization proof requests for spending limits and human-in-the-loop approval

Limitation: current request/result packets are not generated proofs.

## T3 - Institutional Lane / Coinbase Signals

ARX on Coinbase roadmap is a market signal for institutional attention around confidential execution. Vanta should use this to sharpen the institutional lane, RWA compliance, and selective disclosure, while avoiding listing, partnership, or compliance claims.

Required fields:

- `institutional_lane_details`
- `institutional_coinbase_signal`
- `rwa_compliance_circuit`
- ARX/Coinbase roadmap signal as watch-only

Limitation: Coinbase roadmap presence is not Vanta evidence.

## T4 - Hybrid ZK / Confidential Compute

Arcium / ZINC are now the primary confidential-compute benchmark. Vanta's hybrid ZK lane must compare against MPC privacy primitives, confidential execution, on-chain verification, and private DeFi velocity.

Required fields:

- `confidential_compute_benchmark`
- Arcium / ZINC
- MPC privacy primitives
- confidential execution
- on-chain verification

Limitation: Vanta does not claim production MPC or confidential-compute execution.

## T5 - Private Transfers / Credit Notes

DarkDrop's credit-note / dead-drop architecture is the highest-signal private-transfer primitive from the run: Merkle vault deposit -> encrypted claim code -> ZK proof creates credit note -> withdraw without a visible Transfer instruction, with direct lamport manipulation as the cited mechanism.

Required fields:

- DarkDrop
- credit notes
- dead drops
- Merkle vault deposit
- encrypted claim code
- direct lamport manipulation
- `vanta_private_credit_note_transfer`

Limitation: Vanta's circuit is local predicate evidence only and does not move funds.

## Supporting Pattern - Proofra_zk

Proofra_zk's 100% creator fees -> buyback + lock/burn pattern is recorded as a sustainability pattern only.

Required fields:

- Proofra_zk
- 100% creator fees
- buyback + lock/burn
- not a Vanta token launch

## Verification

Run:

```bash
npm run twitter-pass-2026-06-10-velocity-pmf-check
npm run client-side-proving-enforced-check
npm run institutional-coinbase-signal-check
npm run confidential-compute-benchmark-check
npm run credit-note-transfer-primitive-check
npm run agent-authorization-proof-request-check
npm run tokenomics-sustainability-pattern-check
npm run twitter-intelligence:check
```

These commands prove repo-local wiring only. They do not prove live adoption, production privacy, audit acceptance, trusted setup completion, mainnet readiness, exchange listings, partnership status, legal/compliance approval, or real funds movement.
