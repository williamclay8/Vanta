# Native SOL TAG6 — Owner Sign-off + External Gate Request Package

**Package ID:** `TAG6-EXTERNAL-GATE-REQUEST-2026-05-14`  
**Date:** 2026-05-14  
**Prepared by:** Clay

---

## 1. Owner Statement & Authorization

I, Clay, owner of the Vanta protocol, hereby request external review and/or bounded real-funds approval for the Native SOL TAG6 path in accordance with design doc §12.

This request is made only after the completion of all local preparation work and the formal issuance of **Deployment Directive `DEPLOY-NATIVE-SOL-TAG6-2026-05-14`** (attached below).

I have reviewed the full body of local evidence and the canonical documentation. I am satisfied that the requirements of design doc §12 have been met for the pre-deployment phase.

---

## 2. Locked Deployment Directive

**Deployment Directive — Native SOL TAG6 Mainnet Path**

**Date:** 2026-05-14  
**Owner:** Clay  
**Directive ID:** `DEPLOY-NATIVE-SOL-TAG6-2026-05-14`

**Authorization**

I hereby authorize the transition from the current local-evidence-only, fail-closed state into real-world mainnet deployment and live evidence collection for native SOL support in TAG6.

This directive authorizes:

- Mainnet deployment of the `vanta_private_pool_v2_spend` program with the complete Native SOL TAG6 implementation (`VAULT_ASSET_KIND_SOL = 2`, `NATIVE_SOL_ASSET_ID_SENTINEL`, dedicated `vanta2solvault` PDA, system CPI release path, and all associated preflights and events).
- Derivation and initialization of the program-owned SOL vault PDA(s) using the exact seeds specified in design doc §11.
- Execution of `TAG_REGISTER_VAULT_ASSET = 7` to register the SOL vault asset with `assetKind = 2`.
- Use of production secrets and infrastructure (authority keypair, Render/Doppler environment variables, mainnet RPC) as required to carry out the above.

**References**

This directive is issued only after the full body of local work documented in:
- Design document: `2026-05-14-native-sol-private-pool-v2-integration.md` (§11 Native SOL On-Chain Boundary + full §12 Budget & External Review Discipline)
- Status note: `2026-05-14-native-sol-v2-integration-status.md` (Native SOL + TAG6 Readiness Checklist, Post-Deployment Monitoring Checklist, and Recommended Next Actions #8/#9)
- All completed Full Blast waves, including the Deeper Integration Wave (2026-05-14/15)

The TAG6 Blocker Removal Toolkit is now the canonical implementation of the §12 gates across verification chains, subagent discoverability, audit surfaces, runbooks, and long-term monitoring.

**Scope and Constraints**

- **Initial deployment shall be bounded.** Only the minimum SOL required for program deployment rent, SOL vault PDA rent, and the TAG7 registration transaction shall be used in the first deployment.
- The official deployment tooling must be used (`programs/vanta_private_pool_v2_spend/scripts/deploy-vanta-private-pool-v2-tag6-sol.mjs`). A dry-run must be executed and reviewed before any real transaction is submitted.
- Immediately following deployment and registration, the official live evidence collection sequence must be executed using the TAG6 toolkit (via doppler).
- **No production or privacy flags may be changed** until the Live Evidence Gate defined in the status note is satisfied with real mainnet data and this §12 package has been updated and reviewed.

**Owner Attestation**

I have reviewed the complete local evidence from all Full Blast waves, the current state and deep integration of the TAG6 Blocker Removal Toolkit, and the requirements set forth in design doc §12 and the status note. I am satisfied that the local preparation meets the standard required before crossing into mainnet deployment and live evidence collection.

I accept responsibility for this phase and for maintaining the strict truth boundaries defined in the governing documents.

**Signed**  
Clay  
2026-05-14

---

## 3. Canonical References

- **Design Document**: `2026-05-14-native-sol-private-pool-v2-integration.md`  
  (Full §12 “Budget & External Review Discipline”, §11 Native SOL On-Chain Boundary, Phase 4, Native SOL + TAG6 Readiness Checklist)
- **Status Note**: `2026-05-14-native-sol-v2-integration-status.md`  
  (Native SOL + TAG6 Readiness Checklist, Post-Deployment Monitoring Checklist, Recommended Next Actions #8/#9, Lumi Hygiene Summary)
- **Deeper Integration Wave Completion** (2026-05-14/15): The TAG6 Blocker Removal Toolkit is now the canonical implementation across all verify chains, subagent systems, audit surfaces, and operational runbooks.

---

## 4. Local Evidence Summary (Pre-Deployment)

- All Pre-Deployment items in the status note Post-Deployment Monitoring Checklist are complete and green.
- The TAG6 Blocker Removal Toolkit is the **official implementation** of the §12 gates:
  - `run-tag6-full-predeploy-checklist.mjs` (master orchestrator)
  - `verify-full-tag6-release-evidence.mjs`
  - `probe-production-native-sol-sentinel-snapshot.mjs`
  - `scan-onchain-tag6-sol-releases.mjs`
  - `generate-tag6-external-gate-request-package.mjs`
  - Supporting checks (`native-sol-tag6-wiring-check`, `native-sol-sentinel-in-snapshot-check`, `native-sol-unshield-proof-request-check`)
- Latest master pre-deploy checklist run: **GREEN** (see evidence below).
- All major composites now include the TAG6 toolkit:
  - `private-pool-v2:verify`
  - `truth:privacy-claim-gate`
  - `zk:review-guards-check`
  - `zk:feedback-loop-check`
  - `mainnet:readiness-check`
  - `mainnet:external-gates-check`
- `privacy-audit:tracker-check`: PASS

**Evidence Location**: `scripts/native-sol-tag6/examples/` (timestamped reports and bundles)

---

## 5. Scope of This Request

I am requesting the following:

- [ ] Independent security audit of the `vanta_private_pool_v2_spend` program with Native SOL TAG6 changes
- [ ] Legal / compliance review of the Native SOL TAG6 custody and release model
- [ ] Bounded real-funds approval for initial mainnet deployment and limited user testing

**Note**: I am **not** requesting production privacy claims or flag elevation at this stage. All production/privacy/custody flags remain strictly fail-closed until real mainnet live evidence is collected and this package is updated with that evidence.

---

## 6. Post-Deployment Plan (Live Evidence Gate)

After mainnet deployment:

1. Execute the official live evidence sequence using the TAG6 toolkit (via doppler):
   - Sentinel snapshot probe
   - On-chain TAG6 SOL release scanner
   - Full TAG6 release evidence verifier
   - External Gate Request Package generator
2. Collect required evidence:
   - Production indexer snapshot with ≥1 real sentinel native SOL commitments (verifiable merkle proof)
   - ≥1 (target 3+) proof-verified mainnet TAG6 unshield transactions meeting all criteria in design doc §12 (system CPI from exact `vanta2solvault` PDA, no operator keypair, UnshieldEvent, `public_inputs_hash` match, etc.)
3. Update this package with real transaction data, PDA addresses, snapshot hashes, and verifier outputs.
4. Complete owner sign-off on the updated evidence package.
5. Proceed with external engagement only after the above is complete.

---

## 7. Lumi Hygiene & Evidence Locations

- All local evidence and toolkit outputs are stored in `scripts/native-sol-tag6/examples/`
- Deployment and registration transactions will be recorded in:
  - `01 Daily/2026-05-14.md`
  - `wiki/meta/log.md`
  - `wiki/analyses/2026-05-14-native-sol-v2-integration-status.md`
- Official package outputs: `ops/mainnet/tag6-gate-requests/`
- All artifacts reference design doc §12 and the status note.

---

## 8. Owner Attestation (Current)

I have reviewed the complete local evidence from all Full Blast waves, the current state and deep integration of the TAG6 Blocker Removal Toolkit, and the requirements set forth in design doc §12 and the status note. I am satisfied that the local preparation meets the standard required before crossing into mainnet deployment and live evidence collection.

I accept responsibility for this phase and for maintaining the strict truth boundaries defined in the governing documents.

**Signed**  
Clay  
2026-05-14

---

**Attachments / References**:
- Locked Deployment Directive: `DEPLOY-NATIVE-SOL-TAG6-2026-05-14.md` (same directory)
- Design document: `2026-05-14-native-sol-private-pool-v2-integration.md`
- Status note: `2026-05-14-native-sol-v2-integration-status.md`
- TAG6 Blocker Removal Toolkit: `scripts/native-sol-tag6/`

---

*This is the initial pre-deployment draft. It will be updated with live mainnet evidence after deployment.*