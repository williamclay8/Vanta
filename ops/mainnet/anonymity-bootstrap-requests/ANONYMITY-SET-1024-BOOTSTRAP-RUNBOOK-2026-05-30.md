# Anonymity Set 1024 Bootstrap Runbook

Status: active bootstrap prep. This file is not production anonymity evidence, not reviewer acceptance, and not a privacy-claim lift.

## Purpose

Grow the **stablecoin-usdc-v1** mainnet cohort from the current measured depth (**2 distinct commitments**) to the published threshold (**1024 distinct commitments**) using a closed-alpha, operator-bonded, fixed-denomination shield bootstrap.

## Current measured state

| Field | Value |
|---|---|
| Cohort | `stablecoin-usdc-v1-mainnet-private-pool-v2` |
| Distinct commitments | **2** |
| Threshold | **1024** |
| Remaining | **1022** |
| Status | `measured-below-threshold` |
| Reviewer accepted | **false** |

Canonical measurement:

```bash
npm run private-pool-v2:anonymity-set-metrics-json
```

Live measurement (when RPC + output queue env are set):

```bash
export VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL="<mainnet-rpc>"
export VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE="<output-queue-pubkey>"
export VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID="<spend-program-pubkey>"
npm run private-pool-v2:anonymity-set-metrics-json
```

Public fail-closed probe:

```bash
npm run private-pool-v2:live-anonymity-set-probe-check
```

## Fixed-denomination rule

Use **one fixed USDC bucket** for every bootstrap shield. Recommended starting bucket: **10.000000 USDC**.

Do not mix arbitrary amounts during bootstrap. Mixed amounts fragment the anonymity set and weaken linkability resistance even if the raw commitment count rises.

## Phase 0 — Preflight and bounded approval

1. Confirm local bootstrap tooling:

```bash
npm run anonymity:1024-bootstrap-prep-check
npm run anonymity:1024-bootstrap-checklist -- --json
```

2. Run mainnet preflight:

```bash
npm run mainnet:preflight
```

3. Record a **fresh bounded approval window** for exactly one shared-cohort deposit plus bootstrap shield batches:

```bash
npm run mainnet:real-funds-approval-preview
# after review:
npm run mainnet:real-funds-approval-write
```

Required refs are listed by:

```bash
npm run mainnet:shared-cohort-next-action
```

**Do not move mainnet funds outside an active approval window.**

## Phase 1 — Shared cohort deposit

Before counting bootstrap shields toward the cohort:

1. Execute the shared-cohort deposit inside the approval window.
2. Capture a real `solana-tx:<signature>` ref.
3. Review it:

```bash
npm run mainnet:actual-private-shared-cohort-deposit-review-check
```

Optional note packet (refs-only):

```bash
npm run mainnet:actual-private-shared-cohort-deposit-note
```

Current blocker ref shape:

```text
solana-tx:<shared-cohort-deposit-mainnet-signature>
```

## Phase 2 — Batch operator-bonded shields

Target math:

- Start: 2 commitments
- Goal: 1024 commitments
- Remaining shields (minimum): **1022** distinct output commitments

Suggested batching:

| Batch size | Approx batches |
|---|---|
| 25 shields | 41 batches |
| 50 shields | 21 batches |
| 100 shields | 11 batches |

Per batch:

1. Run shield preflight:

```bash
npm run shield:verify
```

2. Execute **fixed-denomination** shields only inside the active approval window.
3. Record the batch using:

- `ops/mainnet/anonymity-bootstrap-requests/anonymity-bootstrap-batch-record.template.json`

Store reviewed batch records outside git if they contain sensitive operator context; keep only refs in committed evidence.

4. Reconcile indexer output commitments before starting the next batch.

## Phase 3 — Measure after every batch

After each batch:

```bash
npm run private-pool-v2:anonymity-set-metrics-json
npm run anonymity:1024-bootstrap-status
```

Milestone gates:

| Milestone | Action |
|---|---|
| 64 | Save measurement receipt draft; confirm indexer evidence matches live count |
| 256 | Mid-bootstrap checkpoint; review fixed-denomination compliance |
| 512 | Pre-threshold checkpoint; prepare reviewer packet refs |
| 1024 | Update anonymity evidence + public manifest only after reviewed receipts |

Measurement receipt template:

- `ops/mainnet/anonymity-bootstrap-requests/anonymity-bootstrap-measurement-receipt.template.json`

## Phase 4 — Promote evidence (only with reviewed refs)

When a milestone is real and indexer-reviewed:

1. Update `ops/mainnet/private-pool-v2-anonymity-set.evidence.json`
2. Re-run:

```bash
npm run private-pool-v2:anonymity-set-evidence-check
npm run private-pool-v2:anonymity-set-readiness-check
npm run mainnet:actual-private-settlement-lineage-check
npm run truth:privacy-claim-gate
```

**Do not set `privacyClaimAllowed: true` or `reviewerAccepted: true` without independent reviewer acceptance refs.**

## What bootstrap does not close

Growing to 1024 does **not** by itself close:

- C01 verifier / SBF-live lineage gates
- Proof-verified on-chain release
- Independent anonymity measurement review
- Production-private or live-mainnet-private claims

Those remain fail-closed until their own evidence exists.

## Canonical commands

```bash
npm run anonymity:1024-bootstrap-prep-check
npm run anonymity:1024-bootstrap-checklist
npm run anonymity:1024-bootstrap-status
npm run private-pool-v2:anonymity-set-metrics-check
npm run private-pool-v2:anonymity-set-readiness-check
npm run private-pool-v2:live-anonymity-set-probe-check
npm run mainnet:shared-cohort-next-action-check
```

## Safety

- No private keys, seed phrases, bearer tokens, DB URLs, or signed transaction bytes in git.
- Use doppler for production secrets.
- Stop immediately if approval window expires or stop-condition fires.
