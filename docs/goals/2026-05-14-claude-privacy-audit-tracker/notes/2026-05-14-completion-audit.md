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
| Fresh-address exit privacy | A2 self-wallet blocker / R6 | Blocked | Current operator rejects `destinationOwner !== requester` |
| Deployed bytecode/source hash match | R7A | Blocked / approval-gated | Requires deployment/live bytecode receipt after approval |
| Real browser prover in live paths | A4 / R8 | Blocked | C01 verifier compatibility and production runtime evidence absent |
| Prover-relay privacy trade-off docs | R8A | Local implemented | `docs/zk/prover-relay-privacy-tradeoffs.md` is enforced by `npm run zk:h08-production-prover-runtime-options-check` |
| Recipient discovery/indexer | A5 / R9 | Pending design | Requires viewing-key exchange or view-tag/indexer design |
| Ciphertext body-hash discovery binding | R9A | Pending design | Proof-bound body-hash fields must feed the discovery/indexer path |
| Service separation | A5 / R10 | Pending design | Requires prover/relayer/verifier/indexer/operator separation |
| Service stub replacement | R10A | Pending implementation | Prover/relayer/verifier/indexer stubs must become real separated services |
| Anonymity-set volume | A6 / R11 | Blocked | Live distinct commitments remain below threshold |
| Live anonymity-set probe | R11A | Local implemented, live-read verified | `npm run private-pool-v2:live-anonymity-set-probe-check` observed live depth `2 / 1024` and fail-closed claim flags |
| Legacy v1 plaintext memo quarantine | R12 | Local implemented | `npm run actions:legacy-v1-memo-quarantine-check` |
| Live meta-description scrape | R13A | Local implemented, live-read verified | `npm run public:live-meta-description-check` observed the beta-safe crawler description on `https://vantaprivacy.xyz` |
| Argon2id vault KDF migration | R14 | Local implemented | `npm run private-vault:crypto-check` |
| Operator keypair env lockdown | R15 | Local implemented with A2 exception | Pay, Swap auth, Jupiter local-only signer policy, and rebalance-related operator files are guarded; Unshield vault signer remains tracked under A2 |
| Operator keypair env lockdown guard | R15A | Local implemented | `npm run operator:keypair-env-lockdown-check` scans operator raw keypair env loading and keeps exceptions explicit |
| Positive proof-verified claim gate | R16 | Blocked on verifier | Requires tag-3 valid proof success before proof-verified claims |
| Browser localStorage Merkle mirror | R18 | Blocked on program-owned tree | Current localStorage chain remains non-privacy primitive |
| Threat model | R19 | Local implemented | `docs/threat-model.md`; `npm run docs:source-of-truth-check` |
| Mainnet on-chain replay test | R20 | Blocked / approval-gated | Requires mainnet-condition test approval and safe live-state handling |
| Deposit-send-fresh-exit privacy test | R21 | Blocked | Architecture does not yet permit proof-bound fresh-address exit |

## Completion Decision

Goal is not complete.

The audit is now tracked and N1, N2, N3, N5, R8A, R11A, R12, R13A, R14, R15/R15A, and R19 source-level/local gates have implementation evidence, but the remaining blockers include deploy/live approval gates, hosted CI evidence, and substantive privacy architecture work. Do not call this goal complete until `state.yaml` has no partial, pending, or blocked rows except rows explicitly accepted as out-of-scope by Clay.

## Current Lumi Snapshot

- Local: tracker, implementation-path, threat-model, legacy-v1 memo quarantine, and Argon2id vault KDF artifacts exist.
- Committed: app branch includes the local R14 commit titled `Migrate private vault KDF to Argon2id`; use `git log` for the current post-amend hash.
- Pushed: branch is ahead of origin and the latest tracker commits are not pushed.
- Deployed/live: latest tracker/docs/circuit/CI/memo-quarantine/vault-KDF slices are not deployed; live-read checks are read-only evidence, not deployment evidence for the current branch.
