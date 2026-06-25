# Phase 2 June 16 Research Circuit Specs

Status: design + starter Noir circuits only. No generated proof, browser worker, Solana verifier, production privacy, legal/compliance approval, audit acceptance, signing, broadcast, deployment, or real-funds claim is moved.

Source discipline:

- The requested June 16 momentum-bank section was not present in the local `zk-solana-momentum-2026-06.md` file when implementation started.
- A Hermes cron receipt was recovered from `/Users/clay/.hermes/cron/output/f056aad8568e/2026-06-16_00-20-41.md` and restored into the momentum bank.
- `Helius LaserStream Upgrade`, `Noir profiler tool`, `Arcium at Solana Summit Germany`, and `ZkMedusa token mechanics update` are treated as `cron-output-backed`.
- Voidral, Nulla Network, Fhenix, RedactMoney, and the Arcium 224M MPC-round detail are treated as `pasted-brief-backed`.
- Earlier DarkDrop, Noir-on-Solana, Medusa, Midnight, Concordium, Arcium, zkRune/Xona, Helius/Light, ZK Bounty, Privacy Cash, and TrustBoost signals are treated as `prior momentum-bank-backed support` where present in the local bank and existing Vanta docs.

## T22 - `vanta_unlinkable_transfer_plus`

Purpose: extend the existing DarkDrop-inspired credit-note circuit into a more general anonymity-pool / unlinkable-wallet private transfer sketch.

Private inputs:

- `amount`
- `sender_note_secret`
- `recipient_secret`
- `recipient_blinding`
- `note_blinding`
- `transfer_blinding`

Public inputs:

- `amount_bucket_min`
- `amount_bucket_max`
- `asset_id`
- `anonymity_root`
- `relayer_context`
- `spend_context`
- `recipient_commitment`
- `deposit_commitment`
- `transfer_commitment`
- `nullifier`

Assertions:

- exact amount remains private but falls inside a public bucket
- sender note binds to an asset, amount, and note blinding
- recipient commitment binds without exposing recipient secret
- transfer commitment binds deposit, recipient, relayer context, and transfer blinding
- nullifier binds sender note secret, spend context, and anonymity root
- relayer context and anonymity root must be nonzero

Vanta integration path:

1. Keep `vanta_private_credit_note_transfer` as the June 10 T5 baseline.
2. Add `vanta_unlinkable_transfer_plus` as the T22 design target.
3. Add a proof request/result packet only after witness normalization and redaction tests exist.
4. Add Solana nullifier/receipt design before any mutation path.

Claim boundary: this is not a mixer, not a live anonymity pool, not relayer privacy, not amount privacy in production, not a production verifier, and not mainnet readiness.

## T23 - `vanta_agent_eligibility_gate`

Purpose: prove a wallet, user, or agent satisfies an eligibility policy without revealing wallet history, age bucket, activity bucket, private policy facts, or full identity.

Private inputs:

- `reputation_score`
- `account_age_bucket`
- `tx_count_bucket`
- `risk_flag`
- `passport_secret`
- `policy_secret`

Public inputs:

- `policy_id`
- `policy_hash`
- `verifier_id`
- `min_reputation_score`
- `min_account_age_bucket`
- `min_tx_count_bucket`
- `agent_id_commitment`
- `eligibility_commitment`
- `eligibility_nullifier`
- `settlement_policy_hash`

Assertions:

- score, account age, and transaction-count buckets satisfy public thresholds
- `risk_flag == 0`
- eligibility commitment binds private score buckets and secrets to the policy hash
- nullifier binds passport secret, policy id, and settlement policy hash
- policy, verifier, and settlement policy hashes are nonzero

Vanta integration path:

1. Preserve existing Medusa-style `vanta_private_reputation_gate` plan as the broader primitive.
2. Use `vanta_agent_eligibility_gate` as the x402-style proof-header slice: one policy, one proof receipt, no witness crossing the boundary.
3. Add future TS packet fields: `proofHeaderName`, `policyHash`, `eligibilityNullifier`, `redactedFields`, `settlementPolicyHash`, `claimBoundary`.
4. Fail closed on unknown policy, missing local prover, stale verifier key, duplicate nullifier, or unsupported settlement route.

Claim boundary: this is not x402 endpoint support, not Xona integration, not Medusa integration, not live USDC settlement, not wallet authorization, and not production agent privacy.

## T25 - `vanta_clean_provenance_disclosure`

Purpose: add a compliance-aware clean-provenance predicate to selective disclosure without exposing account graph, transaction history, or identity.

Private inputs:

- `provenance_score`
- `risk_bucket`
- `account_graph_secret`
- `pool_membership_secret`
- `provenance_blinding`

Public inputs:

- `min_provenance_score`
- `max_risk_bucket`
- `policy_hash`
- `verifier_id`
- `disclosure_purpose_hash`
- `provenance_commitment`
- `membership_nullifier`
- `expiry_slot`
- `current_slot_floor`

Assertions:

- provenance score is at least the public threshold
- risk bucket is no higher than the public maximum
- expiry has not passed relative to the circuit's public slot floor
- provenance commitment binds private provenance score, risk bucket, account graph secret, and blinding
- membership nullifier binds pool membership secret, policy hash, and purpose hash

Vanta integration path:

1. Keep selective disclosure v0.3 as the policy-scoped disclosure spine.
2. Add clean provenance as an optional predicate id for institutional/RWA packets.
3. Require receipts to state that account graph, raw transaction history, and identity stayed private.
4. No legal/compliance claim moves until reviewer/auditor/legal evidence exists.

Claim boundary: this is not Privacy Pools integration, not sanction-screening, not clean-funds certification, not legal/compliance approval, not regulator acceptance, and not production institutional readiness.

## T29 - Noir Profiler Cost Discipline

Purpose: keep Phase 2 Noir starter circuits from being promoted beyond design/starter status until profiling and cost evidence exist.

Recovered cron signal:

- Noir profiler ships with the Noir/Nargo toolchain.
- Interactive flamegraphs can expose ACIR opcode, gate, real proving-cost, execution-opcode, and unconstrained-function hotspots.
- The cron receipt cited dynamic array write optimization as an example of cost reduction.

Required future hardening receipt:

```json
{
  "schemaVersion": "vanta-noir-profiler-receipt-candidate-v0.1",
  "circuitId": "vanta_agent_eligibility_gate",
  "tool": "noir-profiler",
  "acirOpcodeCount": "<measured-count>",
  "gateCostSummary": "<redacted-summary>",
  "hotspotsReviewed": true,
  "claimBoundary": "profiling-receipt-only-not-proof-generation-or-circuit-soundness"
}
```

Claim boundary: this is not generated proof evidence, not audit acceptance, not circuit soundness, not production proving performance, and not a mature-circuit claim.

## Receipt / Registry Formats

Future proof request public packet:

```json
{
  "schemaVersion": "vanta-phase2-product-proof-request-v0.2-candidate",
  "adapterId": "agentEligibilityGate",
  "circuit": "vanta_agent_eligibility_gate",
  "publicInputs": {},
  "publicInputHash": "sha256:<stable-json>",
  "proofRuntime": "browser-worker-noir-js-candidate",
  "privateInputsDisclosed": false,
  "witnessDisclosed": false,
  "claimBoundary": "beta-june16-proof-request-shape-not-proof-generation-or-production-private"
}
```

Future verifier registry record:

```json
{
  "schemaVersion": "vanta-verifier-registry-candidate-v0.1",
  "circuitId": "vanta_agent_eligibility_gate",
  "verifierProgramId": "<solana-program-id-ref>",
  "verifyingKeyHash": "sha256:<vk>",
  "policyHash": "poseidon:<policy>",
  "status": "blocked-until-generated-proof-and-review"
}
```

Future receipt record:

```json
{
  "schemaVersion": "vanta-proof-receipt-candidate-v0.1",
  "circuitId": "vanta_clean_provenance_disclosure",
  "publicInputHash": "sha256:<stable-json>",
  "policyHash": "poseidon:<policy>",
  "verifierId": "poseidon:<verifier>",
  "nullifier": "poseidon:<nullifier>",
  "redactedFields": ["account_graph", "wallet_history", "identity", "witness"],
  "claimBoundary": "local-design-only-not-production-private"
}
```

## Verification Commands

Local circuit checks:

```bash
nargo test
```

from each directory:

- `zk/noir/vanta_unlinkable_transfer_plus`
- `zk/noir/vanta_agent_eligibility_gate`
- `zk/noir/vanta_clean_provenance_disclosure`

Aggregate artifact check:

```bash
node scripts/check-twitter-pass-2026-06-16-research-artifacts.mjs
```
