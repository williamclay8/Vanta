# Native SOL TAG6 — Post-Deployment Instructions

**Purpose**: Step-by-step guide for the human/operator to execute after Clay issues the deployment directive (`DEPLOY-NATIVE-SOL-TAG6-2026-05-14`). These instructions ensure the Live Evidence Gate (design doc §12) is properly satisfied using the official TAG6 Blocker Removal Toolkit.

**References**:
- Design document: `2026-05-14-native-sol-private-pool-v2-integration.md` §12 (Live Evidence Gate + Owner Sign-off Template)
- Status note: `2026-05-14-native-sol-v2-integration-status.md` (Post-Deployment Monitoring Checklist)
- Locked Deployment Directive: `DEPLOY-NATIVE-SOL-TAG6-2026-05-14.md`
- Post-Deployment Package Template: `TAG6-EXTERNAL-GATE-REQUEST-POST-DEPLOY-TEMPLATE-2026-05-14.md`

---

## 1. Final Pre-Deployment Check (Recommended)

Before executing any real mainnet transactions:

```bash
# Run the full pre-deploy checklist one last time
npm run private-pool-v2:tag6-full-predeploy-checklist -- --dry-run --json

# Or directly:
node scripts/native-sol-tag6/run-tag6-full-predeploy-checklist.mjs --dry-run --json
```

**Expected result**: GREEN report.

Save the output to:
`ops/mainnet/tag6-gate-requests/final-predeploy-check-YYYY-MM-DD.json`

---

## 2. Deployment Execution

### 2.1 Dry-Run Review (Mandatory)

Always run a full dry-run first with your actual values:

```bash
node programs/vanta_private_pool_v2_spend/scripts/deploy-vanta-private-pool-v2-tag6-sol.mjs \
  --dry-run \
  --pool-state <YOUR_POOL_STATE_PUBKEY> \
  --program-id <TARGET_PROGRAM_ID> \
  --keypair <PATH_TO_AUTHORITY_KEYPAIR> \
  --rpc https://api.mainnet-beta.solana.com
```

Review the output carefully:
- PDA derivations (especially the `vanta2solvault` PDA)
- SBF binary verification
- TAG7 registration instruction data

### 2.2 Real Deployment

Once the dry-run looks correct and Clay has given final confirmation:

```bash
# Recommended: Use doppler for secrets
doppler run --config prd --project vanta -- \
  node programs/vanta_private_pool_v2_spend/scripts/deploy-vanta-private-pool-v2-tag6-sol.mjs \
    --pool-state <YOUR_POOL_STATE_PUBKEY> \
    --program-id <TARGET_PROGRAM_ID> \
    --keypair <PATH_TO_AUTHORITY_KEYPAIR> \
    --rpc $SOLANA_RPC_URL
```

**Record immediately**:
- Program ID
- SOL Vault PDA address + bump
- Vault Asset Registry PDA
- Deployment transaction signature
- TAG7 registration transaction signature
- Amount of SOL used for rent

Add these values to:
- `TAG6-EXTERNAL-GATE-REQUEST-POST-DEPLOY-TEMPLATE-2026-05-14.md` (Section 3)
- Daily note (`01 Daily/`)
- `wiki/meta/log.md`

---

## 3. Live Evidence Collection Sequence (Critical)

This sequence must be executed **as soon as possible** after deployment and TAG7 registration. All commands should be run via doppler in production.

### 3.1 Step 1: Probe Production Indexer for Sentinel SOL Commitments

```bash
doppler run --config prd --project vanta -- \
  node scripts/probe-production-native-sol-sentinel-snapshot.mjs \
    --production \
    --sample-limit 20 \
    --json
```

**What to capture**:
- Snapshot timestamp
- Current root hash
- Number of commitments using `NATIVE_SOL_ASSET_ID_SENTINEL`
- At least one sample commitment + leaf index + merkle proof

Save output to: `ops/mainnet/tag6-gate-requests/snapshot-probe-YYYY-MM-DD.json`

Update the Post-Deploy Template (Section 4.1).

### 3.2 Step 2: Scan for Real TAG6 SOL Releases

```bash
doppler run --config prd --project vanta -- \
  node scripts/scan-onchain-tag6-sol-releases.mjs \
    --production \
    --program-id <DEPLOYED_PROGRAM_ID> \
    --pool-state <POOL_STATE> \
    --sol-vault-pda <SOL_VAULT_PDA> \
    --limit 100 \
    --json
```

Look for transactions that:
- Contain `TAG_UNSHIELD = 6`
- Performed a system transfer from the exact SOL vault PDA
- Have no operator keypair as signer on the transfer
- Emitted an `UnshieldEvent`

Save promising transaction signatures. These will be fed into the verifier.

### 3.3 Step 3: Full Verification of TAG6 Releases

For each candidate transaction, run:

```bash
doppler run --config prd --project vanta -- \
  node scripts/verify-full-tag6-release-evidence.mjs \
    --production \
    --tx <MAINNET_TX_SIGNATURE> \
    --receipt <PATH_TO_OFFCHAIN_RECEIPT_JSON> \
    --json
```

**Required for each verified release**:
- PDA derivation matches
- System CPI came from the correct `vanta2solvault` PDA
- No operator keypair signed the funds movement
- `public_inputs_hash` matches the off-chain receipt
- Nullifier marker was consumed
- UnshieldEvent was emitted
- Indexer has the event

Save each verifier output to:
`ops/mainnet/tag6-gate-requests/verify-<TX_SIGNATURE>.json`

Update Section 4.2 of the Post-Deploy Template.

**Target**: Minimum 1, ideally 3+ independent verified TAG6 SOL releases.

---

## 4. Generate the Final §12 Package

Once you have sufficient live evidence, run the generator:

```bash
node scripts/native-sol-tag6/generate-tag6-external-gate-request-package.mjs \
  --owner-statement "I have reviewed §12 + status checklist; all local evidence green from completed waves and live mainnet evidence collected after deployment of DEPLOY-NATIVE-SOL-TAG6-2026-05-14. Live evidence satisfies the Post-Deployment Monitoring Checklist." \
  --live-tx-sigs "<TX1>,<TX2>,<TX3>" \
  --snapshot-hash "<ROOT_OR_SNAPSHOT_ID>" \
  --output-dir ops/mainnet/tag6-gate-requests
```

This will produce an updated, signed-ready package.

Alternatively, manually populate the template:
`TAG6-EXTERNAL-GATE-REQUEST-POST-DEPLOY-TEMPLATE-2026-05-14.md`

---

## 5. Lumi Hygiene & Record Keeping (Mandatory)

After deployment and evidence collection, immediately update:

1. **Daily note** (`01 Daily/YYYY-MM-DD.md`)
2. **Status note** (`wiki/analyses/2026-05-14-native-sol-v2-integration-status.md`)
3. **wiki/meta/log.md**

For each, record:
- Program ID
- SOL Vault PDA
- Deployment tx + TAG7 tx
- Snapshot probe output summary
- Verified TAG6 release tx signatures
- Links to evidence files in `ops/mainnet/tag6-gate-requests/`

---

## 6. Final Checklist Before Signing the Package

- [ ] Deployment completed and recorded
- [ ] At least one (target 3+) fully verified TAG6 SOL release(s) with JSON outputs
- [ ] Production indexer snapshot contains real sentinel commitments with verifiable merkle proofs
- [ ] All data entered into `TAG6-EXTERNAL-GATE-REQUEST-POST-DEPLOY-TEMPLATE-2026-05-14.md`
- [ ] Package generated or template fully populated
- [ ] Lumi hygiene entries added to daily note, status note, and log
- [ ] Owner has reviewed all evidence
- [ ] Ready for final signature in Section 5 of the post-deploy template

---

## 7. Safety & Fail-Closed Reminders

- Never flip `productionCustodyReadyForSol`, `privacyClaimAllowed`, or related flags until the full Live Evidence Gate is satisfied **and** the signed §12 package has been reviewed.
- If any verification step fails (PDA mismatch, operator keypair on funds, missing events, etc.), stop and open a blocker.
- All production runs must use `doppler run --config prd --project vanta -- ...`

---

**This document should be followed in order after the deployment directive is executed.**

**Owner**: Clay  
**Last Updated**: 2026-05-14  
**Toolkit Version**: Post Deeper Integration Wave (2026-05-14/15)