# 2026-05-14 Completion Audit

## Objective

Use Full Blast subagents to process the 2026-05-14 Vanta privacy audit, decide the implementation path, and drive the audit findings toward implemented, verified, tracked work.

## Success Criteria

- Every explicit audit finding has a tracker row or backlog row.
- Every implemented claim has file evidence and at least one verification command.
- Every incomplete item is marked as blocked, pending, or partial with the specific reason.
- No production-private, proof-verified, anonymity, program-owned custody, fresh-exit, or live-mainnet readiness claim is allowed without matching positive evidence.
- Lumi state is explicit: local, committed, pushed, deployed/live.

## Prompt-To-Artifact Checklist

| Audit requirement | Evidence artifact | Current status | Verification / blocker |
|---|---|---:|---|
| Save the audit in a durable format | `goal.md`, `state.yaml`, `2026-05-14-intake.md` | Done | `npm run privacy-audit:tracker-check` |
| Preserve revised live website evidence | `state.yaml` live evidence and intake note | Done | `npm run public:audit-discovery-check` |
| N1 Shield output commitment binding | N1 tracker row and Shield circuit/fixture receipts | Local implemented | `npm run private-pool-v2:shield-circuit-check` |
| N2 owner/input binding across lanes | N2 tracker row, PPv2 Swap closure note, Private Core proof-owner closure note | Local implemented | PPv2 Send/Claim/Swap/actual-private-spend and Private Core Send/Swap have local binding guards; this does not imply production privacy or in-circuit X25519 |
| N3 website meta/caveats | N3 tracker row and truth-copy checks | Local implemented | `npm run truth:privacy-claim-gate` |
| N4 stale/live SBF lineage | N4 tracker row | Blocked | Requires deploy/live approval and receipts |
| N5 frontend operator-env CI gate | N5 tracker row, `.github/workflows/privacy-audit.yml`, N5 CI note | Local implemented, pending CI run | Hosted GitHub Actions must run green |
| On-chain tag-3 verifier | A1 / R1 | Blocked | `ERR_PROOF_VERIFIER_NOT_WIRED` remains expected |
| On-chain tag-6 release | A1/A2 / R4 | Blocked | `ERR_UNSHIELD_RELEASE_NOT_WIRED` remains expected |
| Program-owned PDA vault | A2 / R4 | Blocked | Current release model is operator-keypair public exit |
| Program-owned shared tree | A3 / R5 | Blocked | Root provenance is not proof of transition correctness |
| Fresh-address exit privacy | A2 self-wallet blocker / R6 | Partial local contract implemented, blocked on proof-bound release | Clay approved proof-bound fresh-address exit; local Unshield proof/protocol/plan surfaces now require `proofBoundDestinationCommitment`, but current operator still rejects `destinationOwner !== requester` until proof-bound TAG_UNSHIELD release and program-owned custody exist |
| Proof-bound destination contract | R6A | Local implemented, fail-closed | `npm run private-pool-v2:unshield-proof-request-check`; `npm run private-pool-v2:protocol-client-check`; `npm run private-pool-v2:http-smoke`; `npm run private-pool-v2:restart-check` |
| Deployed bytecode/source hash match | R7A | Blocked / approval-gated | Requires deployment/live bytecode receipt after approval |
| Real browser prover in live paths | A4 / R8 | Blocked | C01 verifier compatibility and production runtime evidence absent |
| Prover-relay privacy trade-off docs | R8A | Local implemented | `docs/zk/prover-relay-privacy-tradeoffs.md` is enforced by `npm run zk:h08-production-prover-runtime-options-check` |
| Recipient discovery/indexer | A5 / R9 | Partial local implementation, pending production discovery | Clay approved hybrid discovery; local direct viewing-key exchange plus public proof-owner key exchange exist for known counterparties, but production still needs deployed exchange/indexed encrypted view tags, service behavior, and UX |
| Direct viewing-key exchange | R9B | Local implemented, local-only | `npm run send:direct-viewing-key-exchange-check`; not production recipient discovery |
| Direct proof-owner key exchange | R9C | Local implemented, local-only | `npm run send:direct-viewing-key-exchange-check`; public-key material only, external Send proof path remains blocked |
| Ciphertext body-hash discovery binding | R9A | Local implemented, local-only | proof-bound body-hash fields feed the local verifier-mirrored Send discovery handoff |
| Service separation | A5 / R10 | Partial local implemented, pending live production controls | Local role services are separated and guarded; live receipts, least-privilege secret-manager evidence, provider observability/alerting controls, multi-replica recovery review, and external review remain absent |
| Service stub replacement | R10A | Local implemented | Role-specific entrypoints are enforced by `npm run private-pool-v2:service-network-check` |
| Role-service production controls | R10B | Local implemented, production evidence partial | role storage and replay evidence gates pass locally; not live production settlement evidence |
| Anonymity-set volume | A6 / R11 | Blocked | Live distinct commitments remain below threshold |
| Live anonymity-set probe | R11A | Local implemented, live-read verified | `npm run private-pool-v2:live-anonymity-set-probe-check` observed live depth `2 / 1024` and fail-closed claim flags |
| Legacy v1 plaintext memo quarantine | R12 | Local implemented | `npm run actions:legacy-v1-memo-quarantine-check` |
| Live meta-description scrape | R13A | Local implemented, live-read verified | `npm run public:live-meta-description-check` observed the beta-safe crawler description on `https://vantaprivacy.xyz` |
| Argon2id vault KDF migration | R14 | Local implemented | `npm run private-vault:crypto-check` |
| Operator keypair env lockdown | R15 | Local implemented with A2 exception | Pay, Swap auth, Jupiter local-only signer policy, and rebalance-related operator files are guarded; Unshield vault signer remains tracked under A2 |
| Operator keypair env lockdown guard | R15A | Local implemented | `npm run operator:keypair-env-lockdown-check` scans operator raw keypair env loading and keeps exceptions explicit |
| Positive proof-verified claim gate | R16 | Local implemented, fail-closed; blocked on tag-3 valid-proof success | `npm run zk:c01-positive-proof-verified-claim-gate-check`; not proof-verified spend evidence |
| Browser localStorage Merkle mirror | R18 | Blocked on program-owned tree | Current localStorage chain remains non-privacy primitive |
| Threat model | R19 | Local implemented | `docs/threat-model.md`; `npm run docs:source-of-truth-check` |
| Mainnet on-chain replay test | R20 | Blocked / approval-gated | Requires mainnet-condition test approval and safe live-state handling |
| Deposit-send-fresh-exit privacy test | R21 | Blocked | Architecture does not yet permit proof-bound fresh-address exit |

## Completion Decision

Goal is not complete.

The audit is now tracked and N1, N2, N3, N5, R6A, R8A, R9A, R9B, R9C, R10A, R10B, R11A, R12, R13A, R14, R15/R15A, R16, and R19 source-level/local gates have implementation evidence. Clay has also approved the R9 hybrid recipient-discovery direction and R6 proof-bound fresh-address exit direction. The remaining blockers include deploy/live approval gates, hosted CI evidence, and substantive privacy architecture work. Do not call this goal complete until `state.yaml` has no partial, pending, or blocked rows except rows explicitly accepted as out-of-scope by Clay.

## Current Lumi Snapshot

- Local: tracker, implementation-path, threat-model, legacy-v1 memo quarantine, Argon2id vault KDF, R6A proof-bound destination contract, R9 decision-blocker, R9A ciphertext body-hash discovery-binding, R9B direct viewing-key exchange, R9C direct proof-owner key exchange, R10A service-entrypoint artifacts, R10B role-service production-control evidence artifacts, and R16 positive proof-verified claim-gate artifacts exist.
- Committed: the app branch includes the R6A/R9B base commit `51809b9` (`Add direct-key and proof-bound exit scaffolds`) and records R9C in the current tracker state; use `git log` for the exact current head.
- Pushed: `codex/vanta-zk-review-hardening` is ahead of origin; the latest audit tracker/source-level commits are not pushed. Use `git status` for the exact count.
- Deployed/live: latest tracker/docs/circuit/CI/memo-quarantine/vault-KDF/service-entrypoint/role-service-control/proof-verified-claim-gate/direct-key/discovery-binding/proof-bound-destination slices are not deployed; live-read checks are read-only evidence, not deployment evidence for the current branch.
