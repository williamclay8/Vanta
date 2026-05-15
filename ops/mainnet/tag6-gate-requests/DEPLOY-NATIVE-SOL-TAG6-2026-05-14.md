# Deployment Directive — Native SOL TAG6 Mainnet Path

**Date:** 2026-05-14  
**Owner:** Clay  
**Directive ID:** `DEPLOY-NATIVE-SOL-TAG6-2026-05-14`

---

## Authorization

I hereby authorize the transition from the current local-evidence-only, fail-closed state into real-world mainnet deployment and live evidence collection for native SOL support in TAG6.

This directive authorizes:

- Mainnet deployment of the `vanta_private_pool_v2_spend` program with the complete Native SOL TAG6 implementation (`VAULT_ASSET_KIND_SOL = 2`, `NATIVE_SOL_ASSET_ID_SENTINEL`, dedicated `vanta2solvault` PDA, system CPI release path, and all associated preflights and events).
- Derivation and initialization of the program-owned SOL vault PDA(s) using the exact seeds specified in design doc §11.
- Execution of `TAG_REGISTER_VAULT_ASSET = 7` to register the SOL vault asset with `assetKind = 2`.
- Use of production secrets and infrastructure (authority keypair, Render/Doppler environment variables, mainnet RPC) as required to carry out the above.

---

## References

This directive is issued only after the full body of local work documented in:

- **Design document**: `2026-05-14-native-sol-private-pool-v2-integration.md` (§11 Native SOL On-Chain Boundary + full §12 Budget & External Review Discipline)
- **Status note**: `2026-05-14-native-sol-v2-integration-status.md` (Native SOL + TAG6 Readiness Checklist, Post-Deployment Monitoring Checklist, and Recommended Next Actions #8/#9)
- All completed Full Blast waves, including the Deeper Integration Wave (2026-05-14/15)

The TAG6 Blocker Removal Toolkit is now the canonical implementation of the §12 gates across verification chains, subagent discoverability, audit surfaces, runbooks, and long-term monitoring.

---

## Scope and Constraints

- **Initial deployment shall be bounded.** Only the minimum SOL required for program deployment rent, SOL vault PDA rent, and the TAG7 registration transaction shall be used in the first deployment. Larger operational balances may be added only after initial verification and evidence collection.
- The official deployment tooling must be used (`programs/vanta_private_pool_v2_spend/scripts/deploy-vanta-private-pool-v2-tag6-sol.mjs`). A dry-run must be executed and reviewed before any real transaction is submitted.
- Immediately following deployment and registration, the official live evidence collection sequence must be executed using the TAG6 toolkit (via doppler):
  - Sentinel snapshot probe
  - On-chain TAG6 SOL release scanner
  - Full TAG6 release evidence verifier
  - External Gate Request Package generator
- **No production or privacy flags may be changed** (`productionCustodyReadyForSol`, `nativeSolProgramOwnedVaultPdaReady`, `nativeSolTagUnshieldSystemCpiReady`, `privacyClaimAllowed`, etc.) until the Live Evidence Gate defined in the status note is satisfied with real mainnet data and the generated §12 Owner Sign-off + External Gate Request Package has been completed and reviewed.

---

## Post-Deployment Obligations

After deployment and asset registration:

1. Execute the full post-deploy live evidence sequence using the official TAG6 toolkit commands (via doppler).
2. Collect and store the required evidence (production indexer snapshot containing real sentinel native SOL commitments + at least one proof-verified mainnet TAG6 SOL release meeting all criteria in design doc §12).
3. Generate the complete §12 Owner Sign-off + External Gate Request Package.
4. Do not initiate external audit, legal/compliance review, or bounded real-funds approval until the above package is complete and this directive plus all local evidence is properly cited.

---

## Owner Attestation

I have reviewed the complete local evidence from all Full Blast waves, the current state and deep integration of the TAG6 Blocker Removal Toolkit, and the requirements set forth in design doc §12 and the status note. I am satisfied that the local preparation meets the standard required before crossing into mainnet deployment and live evidence collection.

I accept responsibility for this phase and for maintaining the strict truth boundaries defined in the governing documents.

**Signed**  
Clay  
2026-05-14

---

**References**:
- Design document: `2026-05-14-native-sol-private-pool-v2-integration.md`
- Status note: `2026-05-14-native-sol-v2-integration-status.md`
- TAG6 Blocker Removal Toolkit: `scripts/native-sol-tag6/`
- Deployment tooling: `programs/vanta_private_pool_v2_spend/scripts/deploy-vanta-private-pool-v2-tag6-sol.mjs`