# Meteora Mainnet Indexing Decision Rule

Use this checkpoint for the constrained USDC -> SOL Meteora DLMM mainnet swap lane.

## Trigger condition

Apply this rule if the configured pool still does not resolve at:

```text
https://dlmm-api.mainnet.meteora.ag/pair/61NMGEcS5M4HT4aJyK4c3qap3YsgXTrbKHn4tNtXVtrU
```

and still returns:

- `404`
- `pair not found`

For the current incident, the blocked-after threshold is **2026-04-08**.

## What it means

If that condition is still true on or after the threshold date, Vanta should stop treating the problem as ordinary propagation delay.

The architectural conclusion is:

`Meteora mainnet indexing is not reliable enough to be the sole runtime dependency for Vanta's current swap-lane health and context path.`

## Required posture

If the threshold is crossed, do all three:

1. Mark the current Meteora-aware mainnet lane as externally blocked.
2. Stop passive waiting as the only plan.
3. Choose one mitigation path intentionally.

Record these facts explicitly:

- the pool exists on-chain
- the configured pool address is real
- the current operator fetch pattern is valid
- the failure is Meteora mainnet API/indexer availability
- the lane is blocked by external venue-indexing dependency, not by Vanta config or pool creation

## Mitigation paths

### Path A

Keep the current architecture, but classify the lane as blocked by external infra.

Choose this if:

- Meteora indexing still seems likely to catch up soon
- the operator path should stay unchanged for now
- preserving the exact current lane design matters more than short-term runtime proof

### Path B

Add an alternate non-indexer-dependent context path.

Choose this if:

- Vanta should preserve Meteora venue truth
- the team no longer trusts the mainnet API/indexer as the only runtime source

Preferred effect:

- derive enough pool context from on-chain or SDK paths
- stop making health depend entirely on the public indexer
- strengthen the architecture instead of weakening venue checks

Current repo status:

- the operator now supports `VANTA_METEORA_DLMM_CONTEXT_SOURCE=api_then_sdk`
- if the indexed pair endpoint 404s, the operator can fall back to the DLMM SDK plus Solana RPC
- this keeps the Meteora venue truth while removing the public mainnet indexer as the sole runtime dependency

### Path C

Temporarily narrow the swap truth.

Choose this if:

- broader runtime proof is needed now
- more infra work is not justified first

Effect:

- stop claiming the current Meteora-aware lane is live
- disable or narrow swap claims
- continue validating the rest of Vanta honestly

## What not to do

If the pool is still unindexed after the threshold, do not:

- keep claiming the lane is effectively live
- fake health as healthy
- guess alternate pool data
- weaken venue checks
- blur the reason for failure

The correct statement is:

`the lane is blocked by external venue-indexing unreliability`

## Decision statement

Use this exact posture if the threshold is crossed:

> The USDC -> SOL Meteora DLMM pool exists on-chain, but Meteora mainnet's indexed API still does not surface it. Vanta will no longer treat this as ordinary propagation delay. The swap lane is blocked by external indexer availability, and the next step is to either add an alternate context path or temporarily narrow the swap truth until venue context becomes reliably accessible.

## Operational check

Run:

```bash
npm run check:swap-lane
```

The script will classify the result as one of:

- `indexed`
- `pending_propagation_watch`
- `external_indexer_block`
- `unexpected_response`

Recommended default if the threshold is crossed:

- prefer Path B if feasible
- otherwise use Path C honestly
