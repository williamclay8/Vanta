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
| N2 owner/input binding across lanes | N2 tracker row, blocker note, implementation-path note | Partial | Clay approved both owner decisions on 2026-05-14; Swap input preimage and Private Core Send/Swap sender auth now require implementation and verification |
| N3 website meta/caveats | N3 tracker row and truth-copy checks | Local implemented | `npm run truth:privacy-claim-gate` |
| N4 stale/live SBF lineage | N4 tracker row | Blocked | Requires deploy/live approval and receipts |
| N5 frontend operator-env CI gate | N5 tracker row, `.github/workflows/privacy-audit.yml`, N5 CI note | Local implemented, pending CI run | Hosted GitHub Actions must run green |
| On-chain tag-3 verifier | A1 / R1 | Blocked | `ERR_PROOF_VERIFIER_NOT_WIRED` remains expected |
| On-chain tag-6 release | A1/A2 / R4 | Blocked | `ERR_UNSHIELD_RELEASE_NOT_WIRED` remains expected |
| Program-owned PDA vault | A2 / R4 | Blocked | Current release model is operator-keypair public exit |
| Program-owned shared tree | A3 / R5 | Blocked | Root provenance is not proof of transition correctness |
| Fresh-address exit privacy | A2 self-wallet blocker / R6 | Blocked | Current operator rejects `destinationOwner !== requester` |
| Real browser prover in live paths | A4 / R8 | Blocked | C01 verifier compatibility and production runtime evidence absent |
| Recipient discovery/indexer | A5 / R9 | Pending design | Requires viewing-key exchange or view-tag/indexer design |
| Service separation | A5 / R10 | Pending design | Requires prover/relayer/verifier/indexer/operator separation |
| Anonymity-set volume | A6 / R11 | Blocked | Live distinct commitments remain below threshold |
| Legacy v1 plaintext memo quarantine | R12 | Pending design | Must quarantine or migrate before privacy claims |
| Argon2id vault KDF migration | R14 | Pending implementation | PBKDF2 v2 remains current quick-fix |
| Operator keypair env lockdown | R15 | Pending audit | Needs operator path audit beyond current exposed-env checks |
| Positive proof-verified claim gate | R16 | Blocked on verifier | Requires tag-3 valid proof success before proof-verified claims |
| Browser localStorage Merkle mirror | R18 | Blocked on program-owned tree | Current localStorage chain remains non-privacy primitive |
| Threat model | R19 | Pending implementation | Needs docs/threat-model.md or equivalent source-of-truth |

## Completion Decision

Goal is not complete.

The audit is now tracked and several findings are implemented locally, but the remaining blockers include approved-but-unimplemented N2 protocol work, deploy/live approval gates, hosted CI evidence, and substantive privacy architecture work. Do not call this goal complete until `state.yaml` has no partial, pending, or blocked rows except rows explicitly accepted as out-of-scope by Clay.

## Current Lumi Snapshot

- Local: tracker and implementation-path artifacts exist.
- Committed: app branch has local commits through `291e403`.
- Pushed: branch is ahead of origin and the latest tracker commits are not pushed.
- Deployed/live: latest tracker/circuit/CI slices are not deployed or live-verified.
