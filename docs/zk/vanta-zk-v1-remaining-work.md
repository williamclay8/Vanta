# Vanta ZK v1 Remaining Work

## Current estimate

There are two different finish lines in the repo right now:

- `Vanta Private Core zk foundation`
- `Full Vanta zk v1 product`

Current estimate:

- Vanta Private Core zk foundation: `80-90%`
- Full Vanta zk v1 product: `50-60%`

That split matters because the repo already has a real first unshield proof lane, but the product-level `v1` definition in `docs/privacy-model.md` is broader than the current unshield milestone.

## Already done

- frozen `NoteV0`, `NoteType`, field widths, encoding order, and domain tags
- deterministic note commitments
- ordered Merkle roots and proofs
- encrypted payload recovery for held private notes
- deterministic nullifier derivation
- replay rejection
- first executable fixed-depth Noir circuit for single-note unshield
- Poseidon proving lane for the first unshield circuit
- local regression guard via `npm run private-core:check`
- local proof generation and verification via `npm run private-core:prove`
- operator-backed consume seam check via `npm run private-core:consume-check`
- operator HTTP smoke test via `npm run private-core:http-smoke`
- full-stack private-core verification via `npm run private-core:verify`
- operator-backed proof execution and verification for the current narrow unshield lane
- operator-backed proof execution and verification for the current narrow send lane
- operator-summary versioning for the supported narrow:
  - send lane
  - unshield lane
  - release lane
- proof-backed root registration for the current narrow operator lane
- operator-side registered-root and latest-root enforcement for the current narrow consume lane
- explicit operator state contracts for:
  - `currentRoot`
  - `latestConsume`
  - empty-state summaries for both endpoints
- explicit supported-lane and assumption contracts in the operator summary for:
  - send lane
  - unshield lane
  - release lane
  - owner auth mode
  - nullifier key mode
  - proving hash lane
- app-side Shield, Hold, Unshield, and replay demo integration
- operator-backed private send transitions from shielded state
- recipient-output downstream continuity:
  - register
  - consume
  - replay rejection
  - restart persistence
  - tamper detection
- change-output downstream continuity:
  - register
  - consume
  - replay rejection
  - restart persistence
  - tamper detection
- internal diagnostics that expose the source-layer and proving-lane split honestly

## Must-have for zk v1

These are the items that still look mandatory before `zk v1` should be called finished.

### 1. Finish verifier-side semantics into a real release contract

The circuit alone is not enough.

The consuming path still needs the verifier-side contract to be treated as real.

The repo now already has a first narrow operator-side version of that contract:
- verify proof
- bind the verified proving-lane public input vector to the witness package public input vector
- require the source root to be the latest registered private-core state
- require private send transitions to use the latest registered input root too
- enforce nullifier uniqueness in the consume path
- record explicit release outcomes in operator-side release state
- record explicit release authorization basis and root-policy metadata in operator-side release state
- surface proof execution and operator-state summaries in the app
- bind root registration and consume to the same full witness-backed source artifact bundle:
  - `noteCommitment`
  - `merkleLeaf`
  - `witnessRoot`
- reject missing or mismatched source-layer Merkle leaf and witness-root artifacts at the operator boundary
- retain and enforce the registered root artifact basis across registration and consume
- reject replay from both consume state and release state

What still remains for `zk v1` is finishing that into a fuller verifier-side contract:
- stronger root validity policy beyond the current local operator store
- explicit release authorization semantics tied to the real product exit path
- atomic release with nullifier consumption in the chosen real product lane, not just operator-local state
- a clear decision about whether the current operator-summary-supported release lane is already sufficient for the narrowest `v1`, or still only a proving milestone

The repo now freezes that current narrow choice explicitly:
- `supportedReleaseV1Decision = accepted-narrow-v1-path`

### 2. Freeze the owner-auth decision for v1

Today the first circuit explicitly keeps owner authorization off-circuit.

That can be acceptable for a narrow `v1`, but it needs to be frozen clearly:
- either keep off-circuit owner auth as an explicit `v1` assumption
- or move owner auth in-circuit before claiming `zk v1`

The repo now freezes the current narrow choice more explicitly in the operator contract:
- `ownerAuthorizationMode = x25519-secret-prechecked-off-circuit`
- `ownerAuthorizationDecision = accepted-v1-off-circuit-precheck`

What should not happen is leaving this ambiguous.

### 3. Reduce the remaining source/proving split

The first unshield circuit uses the Poseidon proving lane, while broader app-side source artifacts still use transitional SHA-256 surfaces.

`zk v1` does not necessarily require total convergence everywhere, but it does require:
- an explicit frozen contract for what remains source-layer
- an explicit frozen contract for what is proving-lane truth
- no user- or operator-facing ambiguity about which values govern proof validity

The repo now freezes that split more explicitly in the operator contract:
- `sourceArtifactTruthBasis = source-layer-artifact-bundle`
- `provingArtifactTruthBasis = verified-proving-public-input-vector`
- `sourceProvingRelationship = explicit-split-no-implicit-equality`

### 4. Finish the first real private workflow into a product-frozen v1 lane

`docs/privacy-model.md` defines `v1` around:

`Public Wallet -> Shield -> Shielded State -> Send`

The repo is no longer blocked on unshield alone.
It now has a real narrow private-send lane too.

What still remains for `v1` is freezing that send lane into the supported product path:
- one real asset
- one real environment
- one honest sender flow
- one honest recipient / change downstream interpretation in the product surfaces
- a clear statement of which send path is the supported `v1` lane versus deeper private-core diagnostics

The repo now has the first frozen source-layer target for that work in:

- `docs/zk/vanta-private-core-send-boundary.md`
- `docs/zk/vanta-private-core-send-proof-boundary.md`
- `docs/zk/vanta-zk-v1-supported-send-lane.md`
- `docs/zk/vanta-zk-v1-supported-unshield-lane.md`
- `src/zk/vantaPrivateCore.ts`
- `src/zk/vantaPrivateCoreSendProof.ts`

That boundary is intentionally narrow:
- one input note
- one recipient output note
- optional one change output note
- one later proving lane to match it

Until that is frozen as the supported product lane, the current state is better described as:
- a strong private-core with real unshield and send lanes
- not yet the complete `v1` privacy product

## Can slip to v1.1

These look important, but not strictly blocking for the narrowest plausible `zk v1`.

- in-circuit owner authorization, if off-circuit owner auth is explicitly frozen for `v1`
- multi-note proofs
- joins and splits
- private swap
- recursive proofs
- broader multi-asset generality
- production-grade relayer architecture
- total elimination of all transitional source-layer hash surfaces

## Suggested finish order

1. Keep the current unshield proof lane and operator seam green with `npm run private-core:verify`.
2. Freeze the `v1` owner-auth and verifier-side assumptions in writing.
3. Finish the real release-side contract around the current operator-backed proof lane.
4. Freeze the current real private send and release lanes as the explicit supported `v1` product path.
5. Re-evaluate the remaining source/proving split after the supported send/release path is frozen.

## Honest summary

If the question is "is the first Vanta zk lane real yet?", the answer is yes.

If the question is "is Vanta zk v1 finished?", the honest answer is no.

The current repo is much closer to:
- `first real zk consume + send lanes`

than to:
- `finished Vanta zk v1 product`
