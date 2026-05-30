# TAG6 Live Evidence Prep Runbook

Status: prep runbook only. This file is not live evidence, not external gate acceptance, and not production privacy approval.

## Purpose

Consolidate the post-deploy live evidence path for native SOL TAG6 after local predeploy gates are green. Use this runbook once Clay issues the deployment directive and the program is live on mainnet.

## Current Prep State

- Predeploy checklist: run `npm run private-pool-v2:tag6-full-predeploy-checklist`
- Live evidence prep: run `npm run private-pool-v2:tag6-live-evidence-prep-checklist`
- Live evidence status: **not collected**
- Production snapshot probe: **skeleton only** (`scripts/native-sol-tag6/probe-sentinel-in-production-snapshot.mjs`)

## Step 1 — Confirm Predeploy Green

```bash
npm run private-pool-v2:tag6-full-predeploy-checklist -- --json
```

Save output to `ops/mainnet/tag6-gate-requests/final-predeploy-check-YYYY-MM-DD.json`.

## Step 2 — Derive Deployment PDAs

After pool state is known:

```bash
node scripts/native-sol-tag6/derive-sol-vault-pdas.mjs --pool-state <POOL_STATE_PUBKEY> --json
```

Record vault asset registry PDA and SOL vault holding PDA in the post-deploy template.

## Step 3 — Deploy (Owner Directive Required)

Follow `ops/mainnet/tag6-gate-requests/TAG6-POST-DEPLOY-INSTRUCTIONS-2026-05-14.md` section 2.

Use doppler for secrets:

```bash
doppler run --config prd --project vanta -- \
  node programs/vanta_private_pool_v2_spend/scripts/deploy-vanta-private-pool-v2-tag6-sol.mjs \
    --pool-state <POOL_STATE_PUBKEY> \
    --program-id <TARGET_PROGRAM_ID> \
    --keypair <PATH_TO_AUTHORITY_KEYPAIR> \
    --rpc $SOLANA_RPC_URL
```

## Step 4 — Indexer Snapshot Evidence (Blocked Until Probe Implemented)

The production snapshot probe is currently a skeleton. Before claiming indexer snapshot evidence:

1. Implement the query in `scripts/native-sol-tag6/probe-sentinel-in-production-snapshot.mjs`
2. Run with provider secret via doppler (never commit DB URLs):

```bash
doppler run --config prd --project vanta -- \
  node scripts/native-sol-tag6/probe-sentinel-in-production-snapshot.mjs
```

Success criteria: native SOL sentinel commitments visible in the production indexer snapshot.

## Step 5 — On-Chain TAG6 Release Scan

After at least one mainnet TAG6 SOL unshield:

```bash
node scripts/native-sol-tag6/scan-mainnet-tag6-sol-releases.mjs \
  --rpc https://api.mainnet-beta.solana.com \
  --program-id <PROGRAM_ID> \
  --pool-state <POOL_STATE_PUBKEY>
```

## Step 6 — Receipt Verification (Local Schema)

Fill a reviewed receipt JSON from the template:

- `ops/mainnet/tag6-gate-requests/tag6-live-evidence-receipt.template.json`

Then verify:

```bash
node scripts/native-sol-tag6/verify-full-tag6-sol-release-evidence.mjs \
  --tx <TX_SIGNATURE> \
  --receipt ops/mainnet/tag6-gate-requests/tag6-live-evidence-receipt-<date>.json \
  --json
```

Passing local schema check is only one input. It is not external gate acceptance.

## Step 7 — External Gate Package

Generate the post-deploy external gate request:

```bash
node scripts/native-sol-tag6/generate-tag6-external-gate-request-package.mjs
```

Use `ops/mainnet/tag6-gate-requests/TAG6-EXTERNAL-GATE-REQUEST-POST-DEPLOY-TEMPLATE-2026-05-14.md` as the human-facing shape.

## Canonical Prep Checks

```bash
npm run private-pool-v2:tag6-live-evidence-prep-checklist
npm run private-pool-v2:tag6-live-evidence-prep-check
```

## Non-Claims

This runbook does not deploy programs, does not spend funds, does not query provider secrets into git, does not prove live TAG6 releases until steps 4–6 are completed with real evidence, and does not lift production privacy flags.
