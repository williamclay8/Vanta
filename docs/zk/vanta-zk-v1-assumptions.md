# Vanta ZK v1 Assumptions Freeze

## Purpose

This note freezes the current assumptions that are acceptable for the narrowest plausible `zk v1`.

It exists to stop the finish line from moving while Vanta still has:
- a real first unshield proof lane
- a real first private-send lane
- a broader product `v1` definition that still requires that send lane to be frozen as the supported product path

This is not a final-form protocol document.
It is a `v1` discipline document.

## Scope

These assumptions apply to the current Vanta path:

- one environment
- one supported asset
- one shield flow
- one shielded state model
- one real private send flow that now exists in narrow operator-backed form
- one already-executable single-note unshield proof lane

## Frozen assumptions for v1

### 1. Owner authorization may remain off-circuit in v1

For the current narrow `v1`, owner authorization may remain prevalidated off-circuit.

The repo now freezes that as an explicit operator-contract assumption:
- `ownerAuthorizationMode = x25519-secret-prechecked-off-circuit`
- `ownerAuthorizationDecision = accepted-v1-off-circuit-precheck`

The repo now also freezes the current source/proving split explicitly:
- `sourceArtifactTruthBasis = source-layer-artifact-bundle`
- `provingArtifactTruthBasis = verified-proving-public-input-vector`
- `sourceProvingRelationship = explicit-split-no-implicit-equality`

The repo now also freezes the current release-lane decision explicitly:
- `supportedReleaseV1Decision = accepted-narrow-v1-path`

The repo now also freezes the current send-lane and unshield-lane decisions explicitly:
- `supportedSendV1Decision = accepted-narrow-v1-path`
- `supportedUnshieldV1Decision = accepted-narrow-v1-path`

The repo now also freezes the current nullifier-key decision explicitly:
- `nullifierKeyDecision = accepted-v1-temporary-note-secret-key`

That means:
- the app or operator path may recompute the owner public key from the supplied secret material
- the first Noir unshield circuit does not need to prove X25519 ownership in-circuit

This is acceptable for `v1` only if:
- the assumption is stated explicitly in product and protocol docs
- the implementation does not imply stronger proof guarantees than it actually provides

This should be treated as:
- an allowed `v1` limitation
- a likely `v1.1+` hardening target

### 2. Verifier-side semantics are part of zk v1

The circuit alone is not enough to claim `zk v1`.

For `v1`, the consume path must treat the verifier-side contract as real:
- verify the proof for the current narrow lane
- check that the referenced root is valid and current enough for the chosen state model
- enforce nullifier uniqueness
- authorize release atomically with nullifier consumption

If any of those are only modeled, then the app should describe the path as modeled rather than fully live.

### 3. The source/proving split is temporarily allowed, but must be explicit

The current system has two parallel truth surfaces:

- `source-layer` artifacts in the broader Vanta Private Core app path
- `proving-lane` artifacts in the Noir-facing Poseidon path

That split is acceptable for `v1` only if:
- the distinction is explicit in code and UI
- proving validity is determined by the proving boundary, not by similarly named source-layer values
- operator and internal debugging surfaces do not hide the split

This means `v1` does not require full hash convergence everywhere, but it does require honest naming and binding.

### 4. The current first unshield circuit remains the canonical zk baseline

The current single-note unshield lane is the executable baseline:

- `MERKLE_DEPTH = 3`
- fixed deterministic fixtures
- `poseidon-bn254-proving-lane-v0`
- canonical regression command: `npm run private-core:check`

Changes to the proving lane should be treated as regressions unless that command still proves:
- valid fixture succeeds
- invalid-direction fixture fails
- fixture state is restored

### 5. Real send-lane existence is not the same as full zk v1 completion

The current repo has:
- a real first consume proof lane
- a real first private-send proof lane

Those are necessary, but still not sufficient, for product `v1`.

`zk v1` is only complete once Vanta also has:
- a real shield-to-shielded-state transition
- a frozen supported private send lane from shielded state
- honest frontend truth around what is live versus modeled

## Explicit non-requirements for v1

The following do not need to be finished before the narrowest plausible `zk v1`:

- in-circuit owner authorization
- multi-note proofs
- joins and splits
- private swap
- recursive proofs
- multi-asset generality
- production relayer decentralization
- total elimination of every transitional source-layer hash surface

These remain valid follow-up targets.

## What cannot stay ambiguous

Before `zk v1` is called finished, the repo and docs should not be ambiguous about:

- whether owner auth is off-circuit or in-circuit
- whether proof verification is modeled or real
- whether root validity/currentness is modeled or real
- whether nullifier uniqueness is enforced in the real consume path
- whether the first private send flow is live or still future work

## Practical interpretation

The current best reading is:

- Vanta already has its first real zk consume lane
- Vanta already has its first real zk send lane
- Vanta does not yet have finished `zk v1`

The next major build step after this assumptions freeze was:

- wire real proof generation and verification for the current narrow lane

That step is now done for the current operator-backed unshield lane.

The next major product step from here is:

- freeze the current real private send and release flows as the supported `v1` lane across app, operator, and docs

The operator summary now already freezes the currently supported narrow private-core contracts for:

- send lane
- unshield lane
- release lane
- owner auth mode
- nullifier key mode
- proving hash lane

The first frozen source-layer send target for that work now exists in:

- `docs/zk/vanta-private-core-send-boundary.md`
- `docs/zk/vanta-private-core-send-proof-boundary.md`
- `docs/zk/vanta-zk-v1-supported-send-lane.md`
- `docs/zk/vanta-zk-v1-supported-unshield-lane.md`
- `docs/zk/vanta-zk-v1-supported-release-lane.md`
