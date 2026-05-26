# Vanta Key Custody Runbook

Status: operator-trusted beta runbook. Launch status unchanged. This runbook records the repo-local custody control plan and refs-only intake contract; it is not custody approval, legal approval, external reviewer acceptance, or permission to move claim gates.

## No Secret Material In This Runbook

This file must never contain raw wallet keys, private keys, seed phrases, mnemonic material, keypair files, encrypted key backups, backup decryption material, bearer tokens, database URLs, webhook secrets, provider tokens, signed transactions, owner secrets, viewing-key plaintext, note blindings, proof witnesses, or customer data.

Use references only:

- secret-manager item names
- policy document refs
- multisig proposal refs
- Turnkey policy refs
- HSM/key-management provider refs
- access-audit log refs
- reviewer decision refs

## Roles And Custody Surfaces

- Protocol admin/signing actions: initialize pools, register roots, register verifier keys, register vault assets, and perform approved migrations. These should move to a multisig such as Squads with explicit threshold, signer rotation, and proposal review.
- Program-owned vault authority: future SOL and SPL release authority must be the documented PDA path, not an operator wallet secret.
- Liquidity signing: Turnkey-backed liquidity policy refs must constrain destination, amount class, program id, and action scope.
- Relayer fee wallet: fee-payer custody must have its own funding cap, rotation path, and revocation owner.
- Shield viewing-key material: backup, recovery, and access must be governed by refs-only policy documents and access logs.
- Break-glass owner: emergency authority must be separate from routine operator execution and require a recorded approval ref.

## Access And Approval

Before any production-like custody action:

1. Record the action class, owner, service, environment, max funds-at-risk ref, and rollback ref.
2. Confirm the signer path is least privilege for that action.
3. Confirm the action does not require sharing secret values with agents, chat, logs, docs, screenshots, or tickets.
4. Require the relevant multisig/HSM/Turnkey custody refs.
5. Require a reviewer or approver ref when the action touches real funds, custody-like authority, or launch scope.

## Custody Ref Intake

The refs-only intake packet is:

```text
ops/mainnet/production-key-custody.template.json
```

It should be filled with refs, not values, for:

- `VANTA_SHIELD_PRODUCTION_KEY_CUSTODY_REF`
- `VANTA_SHIELD_VIEWING_KEY_BACKUP_POLICY_REF`
- `VANTA_SHIELD_VIEWING_KEY_RECOVERY_POLICY_REF`
- `VANTA_OPERATOR_KEY_ACCESS_POLICY_REF`
- `VANTA_RELAYER_FEE_WALLET_CUSTODY_REF`
- `VANTA_KEY_ROTATION_RUNBOOK_REF`
- `VANTA_KEY_REVOCATION_RUNBOOK_REF`
- `VANTA_KEY_ACCESS_AUDIT_LOG_REF`
- `VANTA_CUSTODY_REVIEW_REF`
- `VANTA_KEY_CUSTODY_RUNBOOK_REF`
- `VANTA_INCIDENT_RESPONSE_RUNBOOK_REF`

## Rotation And Revocation

Rotation and revocation must have:

- owner ref
- affected service/key class
- trigger reason
- old secret-manager ref, never the value
- new secret-manager ref, never the value
- deploy/restart or policy-update ref
- verification command ref
- access-audit log ref
- rollback or stop condition

If key exposure is suspected, rotate or revoke before collecting optional debugging detail.

## Emergency Freeze

Use emergency freeze when a custody-like path, signer, relayer, release path, or route can mutate state or move funds outside the approved action window.

Minimum freeze steps:

1. Stop or suspend affected service routes.
2. Disable scheduled drains, relayer submission, or live signing paths.
3. Mark approval and readiness surfaces blocked.
4. Preserve sanitized evidence refs.
5. Rotate/revoke affected credentials if exposure is possible.
6. Resume only after the incident-response runbook closure criteria are met.

## Break-Glass Controls

Break-glass use requires:

- explicit action ref
- approving owner ref
- signer/quorum ref
- time window
- funds-at-risk cap ref
- rollback ref
- post-action access audit
- post-action review

Break-glass must not become the routine operator path.

## Access Audit

Every custody-like action should leave an access-audit ref that can answer:

- who approved the action
- which signer or service identity was used
- what action class was allowed
- when the window opened and closed
- whether any policy, secret, signer, or fee wallet changed
- which verification commands passed after the action

## Claim Gates Stay Locked

Key-custody documentation does not unlock privacy, custody, audit, legal, launch, or live-settlement claims. The claim gates move only after the matching external refs, deployed evidence, and reviewer acceptance exist and the executable guards pass.

## External Refs Required Before Claim Movement

- custody reviewer decision ref
- multisig threshold and signer roster ref
- Turnkey/HSM policy refs
- Shield viewing-key backup and recovery policy refs
- relayer fee-wallet custody ref
- key rotation and revocation refs
- key access-audit log refs
- incident-response runbook ref

## Verification Commands

```bash
npm run compliance:ops-publication-check
npm run mainnet:external-gates-production-claim-check
npm run shield:privacy-readiness-check
npm run security:limitations-check
```
