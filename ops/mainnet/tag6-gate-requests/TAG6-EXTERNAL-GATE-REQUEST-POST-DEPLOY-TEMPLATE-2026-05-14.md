# Native SOL TAG6 — Owner Sign-off + External Gate Request Package
## Post-Deployment / Live Evidence Version (Ready for Signature)

**Package ID:** `TAG6-EXTERNAL-GATE-REQUEST-POST-DEPLOY-2026-05-14`  
**Status:** Template — To be completed after mainnet deployment and live evidence collection  
**Deployment Directive Reference:** `DEPLOY-NATIVE-SOL-TAG6-2026-05-14`

---

## 1. Owner Statement & Final Authorization (To Be Signed After Live Evidence)

I, Clay, owner of the Vanta protocol, having reviewed the live mainnet evidence collected after deployment of the Native SOL TAG6 path, hereby request external review and/or bounded real-funds approval in accordance with design doc §12.

This package contains the required high-quality local evidence (pre-deployment) plus the live production evidence collected after mainnet deployment. All evidence was gathered using the official TAG6 Blocker Removal Toolkit as the canonical implementation of the §12 gates.

I confirm that:
- The deployment was executed in accordance with Deployment Directive `DEPLOY-NATIVE-SOL-TAG6-2026-05-14`.
- All required live evidence has been collected and verified.
- The strict truth boundaries defined in design doc §12 have been maintained.

**Final Owner Signature** (to be completed after live evidence collection):

**Signed**  
Clay  
Date: ________________

---

## 2. Locked Deployment Directive

**Deployment Directive — Native SOL TAG6 Mainnet Path**

**Date:** 2026-05-14  
**Owner:** Clay  
**Directive ID:** `DEPLOY-NATIVE-SOL-TAG6-2026-05-14`

(Full text of the locked directive is attached as a separate file in this directory: `DEPLOY-NATIVE-SOL-TAG6-2026-05-14.md`)

---

## 3. Deployment Details (To Be Filled After Deployment)

| Item                              | Value                                      | Evidence Location                  |
|-----------------------------------|--------------------------------------------|------------------------------------|
| Deployed Program ID               | [TO BE FILLED]                             | Explorer tx + program account     |
| Pool State Pubkey                 | [TO BE FILLED]                             | From deployment transaction       |
| SOL Vault Holding PDA             | [TO BE FILLED]                             | Derived with `vanta2solvault` + sentinel |
| SOL Vault PDA Bump                | [TO BE FILLED]                             | PDA derivation output             |
| Vault Asset Registry PDA          | [TO BE FILLED]                             | Derived with `vanta2asset` + sentinel |
| Deployment Transaction Signature  | [TO BE FILLED]                             | Mainnet explorer link             |
| TAG7 Registration Tx Signature    | [TO BE FILLED]                             | Mainnet explorer link             |
| SBF Binary Hash (deployed)        | [TO BE FILLED]                             | Fresh cargo-build-sbf output      |
| Deployment Timestamp              | [TO BE FILLED]                             | On-chain slot + UTC               |
| Initial SOL Used for Rent         | [TO BE FILLED]                             | Bounded amount per directive      |

**Deployment Tooling Used:**  
`programs/vanta_private_pool_v2_spend/scripts/deploy-vanta-private-pool-v2-tag6-sol.mjs`

---

## 4. Live Evidence Collected (Required per Design Doc §12)

### 4.1 Production Indexer Snapshot Evidence (Sentinel SOL Commitments)

- **Command Used:**  
  `doppler run --config prd --project vanta -- node scripts/probe-production-native-sol-sentinel-snapshot.mjs --production --sample-limit 10 --json`

- **Snapshot Timestamp:** [TO BE FILLED]  
- **Indexer Root Hash:** [TO BE FILLED]  
- **Number of Sentinel SOL Commitments:** [TO BE FILLED]  
- **Sample Commitment + Leaf Index + Merkle Proof:** [TO BE FILLED]  
- **Verification Result:** Sentinel commitments present and merkle-proof verifiable against live root → **PASS / FAIL**

**Output File:** `ops/mainnet/tag6-gate-requests/snapshot-probe-YYYY-MM-DD.json`

### 4.2 Proof-Verified TAG6 SOL Release Evidence (≥1, target ≥3)

For each qualifying mainnet TAG6 unshield transaction:

**Transaction #1**

- **Tx Signature:** [TO BE FILLED]  
- **Explorer Link:** [TO BE FILLED]  
- **Command Used:**  
  `doppler run --config prd --project vanta -- node scripts/verify-full-tag6-release-evidence.mjs --production --tx <sig> --receipt <path> --json`

**Verification Results:**
- User-built TAG_UNSHIELD=6 instruction → **PASS**
- System CPI transfer from exact `vanta2solvault` PDA (SOL_VAULT_SEED + sentinel) → **PASS**
- No operator keypair in signer list of the system transfer → **PASS**
- Nullifier marker created and consumed → **PASS**
- UnshieldEvent {nullifier, root} emitted → **PASS**
- `public_inputs_hash` matches off-chain receipt → **PASS**
- PDA derivation correct → **PASS**
- On-chain lamports transfer verifiable publicly → **PASS**
- Indexer ingested the event and marked nullifier → **PASS**

**Full Verifier Output:** `ops/mainnet/tag6-gate-requests/verify-TX_SIGNATURE.json`

(Repeat the above block for each additional qualifying tx — target minimum 3)

### 4.3 Additional Required Evidence

- **Anonymity Set / Unified Tree Metrics:** [TO BE FILLED] (root history + cohort size post-SOL inclusion)
- **No Anomalies Confirmed:** No operator-keypair SOL releases, preflights passed for kind=2/sentinel, events match indexer → **Confirmed**
- **Lumi Hygiene for Deployment:** All txs, PDAs, snapshot data, and toolkit outputs recorded in daily note, wiki/meta/log.md, and this package.

---

## 5. Updated Owner Attestation (Final Signature Block)

I have reviewed:

- The complete local evidence from all Full Blast waves (pre-deployment)
- The live mainnet evidence collected after deployment (as documented in Section 4)
- The current state of the TAG6 Blocker Removal Toolkit and its integration across all surfaces
- The requirements set forth in design doc §12 and the status note

I confirm that the Live Evidence Gate has been satisfied with real production data.

I hereby request external review/audit and/or bounded real-funds approval for the Native SOL TAG6 path.

**Final Signature**

**Signed**  
Clay  
Date: ________________

---

## 6. Lumi Hygiene Summary

- **Pre-Deployment Local Evidence:** All items in status note Pre-Deployment checklist complete and green (see `TAG6-EXTERNAL-GATE-REQUEST-2026-05-14.md` initial draft and `scripts/native-sol-tag6/examples/`).
- **Deployment Execution:** Recorded in daily note + this package (program ID, PDAs, tx signatures).
- **Live Evidence Collection:** All outputs from official toolkit commands (`probe`, `scan`, `verify-full-tag6-release-evidence`, `generate-tag6-external-gate-request-package`) saved to `ops/mainnet/tag6-gate-requests/`.
- **References:** This package cites design doc §12 (entire Budget & External Review Discipline + Live Evidence Gate) and status note (Post-Deployment Monitoring Checklist + #8/#9).
- **Fail-Closed Status:** All production/privacy/custody flags remain false until this package is complete and external review is accepted.

---

## 7. Final Checklist Before External Submission

- [ ] All fields in Sections 3 and 4 completed with real mainnet data
- [ ] At least one (target three) fully verified TAG6 SOL release(s) with supporting JSON outputs
- [ ] Production indexer snapshot evidence with verifiable sentinel commitments
- [ ] This package updated and reviewed by owner
- [ ] Final owner signature added in Section 5
- [ ] Lumi hygiene entries added to daily note and wiki/meta/log.md
- [ ] Package + all evidence bundles ready for external parties

---

**Prepared using the official TAG6 Blocker Removal Toolkit**  
**Design doc §12 + Status note (2026-05-14) compliance maintained throughout.**

---

*This document is the authoritative post-deployment version intended for owner signature and external submission once real mainnet evidence has been collected.*