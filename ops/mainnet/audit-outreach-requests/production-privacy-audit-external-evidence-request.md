# Production Privacy Audit External Evidence Request

Status: outreach prep packet only. This file is not an audit report, not reviewer selection, not audit acceptance, and not production privacy approval.

## Band 7 Target

Per `PRODUCTION_PRIVACY_AUDIT.md` Band 7 item 21:

- Contract **two independent audit firms**
- Lane A: **ZK specialist** (circuits, proof lanes, public-input binding, nullifier/replay)
- Lane B: **Solana program specialist** (spend program, vault/PDA transition, CPI verifier seam, native SOL TAG6 wiring)

## Machine-Readable Prep Packet

Use these files as the send-list anchor:

- `ops/mainnet/production-privacy-audit-outreach.evidence.json`
- `ops/mainnet/audit-review.packet.template.json`
- `ops/mainnet/mainnet-approval-gates.evidence.json`

Validate locally before outreach:

```bash
npm run audit:outreach-prep-check
npm run audit:outreach-send-package-generate
npm run audit:package-check
```

## Reviewer Handoff Surfaces

Primary human handoff:

- `docs/audit-package.md`
- `PRODUCTION_PRIVACY_AUDIT.md`
- `AUDIT_2026-05-19.md` (prior findings ledger context)

Public discovery (refs-only, not approval):

- `/.well-known/vanta-audit.json`

## Required Returned Refs (Both Lanes)

External returns must stay refs-only. Populate reviewed JSON packets that reference:

- `VANTA_AUDIT_REVIEWER_REF`
- `VANTA_AUDIT_SCOPE_REF`
- `VANTA_AUDIT_REPORT_REF`
- `VANTA_AUDIT_FINDINGS_DISPOSITION_REF`
- `VANTA_AUDIT_FIX_VERIFICATION_REF`
- `VANTA_AUDIT_FINAL_DECISION_REF`

Use `ops/mainnet/audit-review.packet.template.json` as the intake shape.

## Canonical Review Commands (Recipient Local Verification)

The recipient should be able to run:

```bash
npm run mainnet:preflight
npm run mainnet:actual-private-production-evidence-check
npm run private-core:verify
npm run private-pool-v2:verify
npm run shield:verify
npm run pay:verify
npm run audit:package-check
npm run truth:privacy-claim-gate
```

## Separation From Other External Lanes

This audit outreach lane is **separate** from:

- C01 external production verifier artifact review (Reilabs / Groth16 route)
- TAG6 native SOL live evidence collection (post-deploy on-chain + indexer proof)

Do not conflate audit acceptance with C01 closure or TAG6 live evidence.

## Non-Claims

This request packet does not contract reviewers, does not record NDA terms, does not store report bodies in git, does not create an audit claim, and does not lift `releaseEnabled` or privacy-claim gates.
