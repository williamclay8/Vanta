# PPA-AUDIT-001 - Two-Firm External Audit Engagement Plan

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 7 - audit + launch
- Recommended remediation order: 21
- Finding: Contract two independent audit firms, one ZK-specialist and one Solana-program-specialist.
- Status: blocked-external-plan-open on 2026-05-25.

## Current Truth

Band 7 cannot be satisfied by a repo-local edit. The current repo has local verifier, custody, relayer, discovery, and claim-gate evidence, but external audit engagement refs are absent.

The two required audit lanes are separate:

- ZK specialist: circuit source, ACIR/source hashes, public-input layout, proof tuple, production VK hash, verifier adapter evidence, artifact bundle, and Send/Swap output binding.
- Solana program specialist: spend/verifier SBF lineage, PDA vault custody, `TAG_REGISTER_VAULT_ASSET`, `TAG_REGISTER_VERIFIER_KEY`, `TAG_SPEND_WITH_PROOF`, `TAG_UNSHIELD`, nullifier/root ordering, token/SOL CPI release shape, and runtime verifier gate behavior.

No audit firm has been contracted in this slice. No report, acceptance, deployment, verifier wiring, release enablement, or claim lift is created by this plan.

## Required External Refs

- ZK audit firm identity ref, independence/conflict disclosure ref, and signed engagement/SOW acceptance ref.
- ZK scope ref covering the active `groth16-tag3-solana-v0` backend direction, production artifact bundle, VK hash, public-input binding, Send/Swap output binding, and verifier adapter mutation/no-mutation evidence.
- Solana audit firm identity ref, independence/conflict disclosure ref, and signed engagement/SOW acceptance ref.
- Solana scope ref covering the spend program, verifier program interface, SBF/live lineage, PDA vault custody, tag-5 verifier-key binding, tag-6 release ordering, SPL token authority, native SOL vault PDA, and root/nullifier/output record invariants.
- Shared deliverables refs for audit kickoff, reviewer packet receipt, findings register, finding dispositions, final report or acceptance letter, and reviewer signoff.
- Refs-only evidence packet location, with no raw proof, witness, private key, bearer credential, signed transaction, or live private data committed to the repo.

## Planned Files

- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-audit-001-two-firm-audit-engagement-plan.md`

After Clay approves a follow-up implementation slice, add a fail-closed refs-only audit engagement evidence gate under `ops/mainnet/` and `scripts/` so placeholder, single-firm, same-firm, missing-scope, or secret-bearing packets cannot promote.

## Planned Acceptance Checks After Follow-Up Approval

- Missing both audit firms fails.
- Only one firm fails.
- Same firm reused for both lanes fails.
- Generic security review without ZK circuit scope fails.
- Generic security review without Solana program/SBF/custody scope fails.
- Missing independence/conflict disclosure fails.
- Missing signed engagement/SOW acceptance refs fails.
- Missing finding-disposition and final-review acceptance refs fails.
- Any raw proof, witness, proving key, private key, bearer credential, signed transaction, or live private data marker fails.
- Truth gates remain fail-closed until accepted audit refs, verifier evidence, SBF/live lineage, and live anonymity evidence all exist.

## Blocker Before Completion

Clay must choose and contract two independent external reviewers through the appropriate legal/commercial path. Required inputs include named firms or reviewers, scope, budget/terms approval, signed acceptance refs, and reviewer-owned deliverable refs.

This repo can prepare request packets and fail-closed intake gates. It cannot create the external contracting facts.

## Verification For This Tracker Slice

- `npm run privacy-audit:tracker-check`
- `git diff --check`

## Truth Boundary

This is a tracker-only plan. It does not contract auditors, open a bounty, publish a report, accept reviewer findings, change public claims, deploy programs, register verifier keys, release funds, or make any privacy/audit/launch claim true.
