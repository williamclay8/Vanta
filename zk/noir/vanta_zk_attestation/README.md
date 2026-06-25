# vanta_zk_attestation

**Phase 2 Real Noir Circuit** — T9 ZK Attestation Engine (from 2026-06-11 X research pass).

## Purpose
Implements ZK attestation for real-world actions and Secure Enclave metadata binding:
- Validates enclave metadata (ZK Bounty style)
- Proves real-world actions (physical bounties, programmatic payouts) while keeping location/identity private
- Ties to T9 from Twitter Pass Integration 2026-06-11 (ZK Bounty signal)

Supports Phase 2 priorities: RWA compliance, institutional selective disclosure, velocity with external data predicates, agentic systems.

## Nargo Commands
```bash
cd zk/noir/vanta_zk_attestation
nargo build
nargo test
```

## Public Inputs
- threshold, expected_enclave, payout_threshold, commitment, period_start, period_end

## Integration Notes
- Client: noir-wasm path for attestation request packets
- SDK: Extend vantaPhase2ProductProofRequests with zk_attestation shape
- Composer: Combine with selective disclosure for institutional/RWA (amount + jurisdiction + attestation)
- Future: On-chain verifier for bounty/payout flows

## Claim Boundary
beta-selective-disclosure-not-production-private-or-regulator-approved. Local Noir circuit starter only. No production privacy, no live attestation engine, no on-chain deployment, no regulator-approved payouts.

**X Research Signals Embedded**:
- ZK Bounty attestation engine (https://x.com/zk_bounty/status/2065028855975297156)
- SolRouter enclave context, Kausalayer agent stack (supporting)

## Verification Evidence (2026-06-11)
- ls -la + cat/grep confirmed poseidon binding + enclave/action asserts + test
- All predicates present, no leaks

**Lumi**: Local only. Vault synced. No commits/pushes/deploy.