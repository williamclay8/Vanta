# vanta_passport_reputation_gate

June 17 ZkMedusa-passport-inspired starter circuit for Vanta Phase 2.

This circuit extends `vanta_agent_eligibility_gate` with explicit passport reputation, tier gating, claim-wallet commitment, and private allowlist membership. It is intended for a one-call local verification wrapper: prove locally, publish only a proof header/receipt, and fail closed when policy, verifier, allowlist, or nullifier state is unknown.

The claim-wallet fields are a candidate commitment shape only. They do not prove wallet-source isolation, network/log unlinkability, fresh-wallet operational safety, or correlation resistance until browser-worker, logging, receipt, wallet-isolation, and correlation tests exist.

## Predicate

Private witness:

- `reputation_score`
- `wallet_age_bucket`
- `volume_tier`
- `risk_flag`
- `passport_secret`
- `claim_wallet_secret`
- `claim_wallet_blinding`
- `allowlist_leaf_secret`
- `allowlist_path`
- `allowlist_path_indices`

Public inputs:

- `policy_id`
- `policy_hash`
- `verifier_id`
- `issuer_hash`
- `min_reputation_score`
- `min_wallet_age_bucket`
- `min_volume_tier`
- `allowlist_root`
- `passport_commitment`
- `claim_wallet_commitment`
- `eligibility_nullifier`
- `expiry_slot`
- `current_slot_floor`

The circuit binds:

- score, age, and tier meet public policy thresholds
- `risk_flag == 0`
- passport commitment hides wallet-history inputs while binding issuer and policy
- claim-wallet commitment sketches how a fresh claim wallet could present eligibility while keeping main-wallet details out of the public inputs
- allowlist membership is proven against a fixed-depth private Merkle path
- nullifier binds passport secret, policy, verifier, and epoch to prevent replay
- policy, verifier, issuer, allowlist root, and expiry are fail-closed public controls

## Claim Boundary

This is not a ZkMedusa integration, not a verified SDK import, not a production allowlist, not live Solana verification, not wallet authorization, and not production private reputation. It is a Vanta-compatible circuit shape derived from June 17 research signals.

The Poseidon dependency follows the repo's existing Noir starter-circuit pattern: `noir-lang/poseidon` tag `v0.1.1`. That tag resolved during promotion to commit `ba04f0a3b53b2a2037debe41d55c1595b1bde507`, but this Nargo version requires a `tag` key and rejected a `rev` dependency declaration. Treat this as provenance evidence, not a lockfile-level immutability guarantee.

## Verification

```bash
nargo test
```
