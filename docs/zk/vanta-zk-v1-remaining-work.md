# Vanta ZK v1 Remaining Work

## Current estimate

There are two different finish lines in the repo right now:

- `Vanta Private Core zk foundation`
- `Full Vanta zk v1 product`

Current estimate:

- Narrow Vanta zk v1 lane frozen in the repo: `78/100`
- Broader Vanta zk v1 product: `55/100`

That split matters because the repo now has real:
- unshield
- private send
- constrained swap

proof lanes with operator-backed seams and restart coverage, but the broader product-level `v1` definition is still larger than the currently frozen narrow lane.

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
- explicit supported-lane, v1-decision, and assumption contracts in the operator summary for:
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

### 1. Freeze the exact finish line and stop letting `zk v1` mean two different things

The repo is now strong enough that ambiguity is a bigger risk than missing infrastructure.

The first thing that should be treated as mandatory is freezing whether `zk v1` means:
- the narrow frozen operator-backed lane already present in the repo
- or the broader product-level privacy system implied by the long-term vision

Without that freeze, every remaining task looks half-finished because the target keeps moving.

The narrow lane is already frozen pretty deeply in operator contract, summary, CLI, UI, and regression coverage.
What is still missing is the single sentence decision saying:
- this narrow lane is the accepted shipping scope for `zk v1`
- or this narrow lane is only a proving foundation and not the real `v1` finish line

### 2. Finish verifier-side semantics into a release contract that is product-honest

The circuit alone is still not the whole product.

The repo already has a first narrow operator-side verifier contract:
- verify proof
- bind the verified proving-lane public input vector to the witness package public input vector
- require the source root to be the latest registered private-core state
- require private send transitions to use the latest registered input root
- enforce nullifier uniqueness in the consume path
- record explicit release outcomes in operator-side release state
- record explicit release authorization basis and root-policy metadata in operator-side release state
- bind root registration and consume to the same witness-backed source artifact bundle
- reject replay from both consume state and release state

What still remains before this feels finished rather than merely strong:
- stronger root validity policy beyond the current local operator store
- explicit release authorization semantics tied to the real product exit path
- atomic release with nullifier consumption in the chosen real product lane, not just operator-local state
- a final statement that the current operator-backed release contract is either:
  - sufficient for the narrow shipping `v1`
  - or still only a proving milestone

The repo now freezes that current narrow choice explicitly:
- `supportedReleaseV1Decision = accepted-narrow-v1-path`

The repo now also freezes the current narrow nullifier-key choice explicitly:
- `nullifierKeyDecision = accepted-v1-temporary-note-secret-key`

### 3. Freeze the owner-auth decision as a final shipping choice, not only an assumption

Today the first circuit explicitly keeps owner authorization off-circuit.

That can be acceptable for a narrow `v1`, but it needs to be frozen clearly:
- either keep off-circuit owner auth as an explicit `v1` assumption
- or move owner auth in-circuit before claiming `zk v1`

The repo now freezes the current narrow choice more explicitly in the operator contract:
- `ownerAuthorizationMode = x25519-secret-prechecked-off-circuit`
- `ownerAuthorizationDecision = accepted-v1-off-circuit-precheck`

What should not happen is leaving this ambiguous.

### 4. Reduce the remaining source/proving split only where it still creates product confusion

The first unshield circuit uses the Poseidon proving lane, while broader app-side source artifacts still use transitional SHA-256 surfaces.

`zk v1` does not necessarily require total convergence everywhere, but it does require:
- an explicit frozen contract for what remains source-layer
- an explicit frozen contract for what is proving-lane truth
- no user- or operator-facing ambiguity about which values govern proof validity

The repo now freezes that split more explicitly in the operator contract:
- `sourceArtifactTruthBasis = source-layer-artifact-bundle`
- `provingArtifactTruthBasis = verified-proving-public-input-vector`
- `sourceProvingRelationship = explicit-split-no-implicit-equality`

The next leverage here is not broad crypto rewrites.
It is removing the last places where a reviewer or operator could still confuse:
- source-layer truth
- proving-lane truth
- operator release truth

### 5. Finish the first real private workflow into one product-frozen supported lane

`docs/privacy-model.md` defines `v1` around:

`Public Wallet -> Shield -> Shielded State -> Send`

The repo is no longer blocked on unshield alone.
It now has a real narrow private-send lane too.

What still remains for `v1` is freezing that send lane into the supported product path:
- one real asset
- one real environment
- one honest sender flow
- one honest recipient / change downstream interpretation in the product surfaces
- one clear statement of which send path is the supported `v1` lane versus deeper private-core diagnostics
- one clear statement of whether the constrained swap lane is part of `v1` or only adjacent supporting infrastructure

The repo now has the first frozen source-layer target for that work in:

- `docs/zk/vanta-private-core-send-boundary.md`
- `docs/zk/vanta-private-core-send-proof-boundary.md`
- `docs/zk/vanta-private-core-swap-proof-boundary.md`
- `docs/zk/vanta-zk-v1-supported-send-lane.md`
- `docs/zk/vanta-zk-v1-supported-unshield-lane.md`
- `docs/zk/vanta-zk-v1-supported-release-lane.md`
- `src/zk/vantaPrivateCore.ts`
- `src/zk/vantaPrivateCoreSendProof.ts`
- `src/zk/vantaPrivateCoreSwapProof.ts`

That boundary is intentionally narrow:
- one input note
- one recipient output note
- optional one change output note
- one later proving lane to match it
- one constrained swap proving boundary and first executable swap/operator lane for the current `VUSD -> shielded SOL` path

Until that is frozen as the supported product lane, the current state is better described as:
- a strong private-core with real unshield, send, and constrained swap lanes
- not yet the complete `v1` privacy product

## Can slip to v1.1

These look important, but not strictly blocking for the narrowest plausible `zk v1`.

- in-circuit owner authorization, if off-circuit owner auth is explicitly frozen for `v1`
- multi-note proofs
- joins and splits
- generalized private swap beyond the constrained current lane
- recursive proofs
- broader multi-asset generality
- production-grade relayer architecture
- total elimination of all transitional source-layer hash surfaces

## Highest-leverage finish order

If the goal is to get from `78/100` to a believable shipping `v1`, this is the best order now:

1. Freeze the finish-line decision in writing.
2. Turn the current release lane from “accepted narrow path” into a clearly defended shipping contract.
3. Freeze off-circuit owner auth as shipping scope or replace it.
4. Remove the last operator/product ambiguities around source-vs-proving truth.
5. Freeze the exact supported product path:
   - shield
   - hold
   - send
   - unshield
   - replay guard
6. Decide whether constrained swap is inside `v1` or support-only.

## Suggested implementation order

1. Keep the current unshield proof lane and operator seam green with `npm run private-core:verify`.
2. Update the remaining-work / assumptions / submission docs so the finish-line decision is explicit.
3. Finish the real release-side contract around the current operator-backed proof lane.
4. Freeze the current send, unshield, and release lanes as the explicit supported `v1` product path.
5. Make the owner-auth decision final instead of provisional.
6. Re-evaluate the remaining source/proving split after the supported send/release path is frozen.

## Honest summary

If the question is "are the first Vanta zk lanes real yet?", the answer is yes.

If the question is "is Vanta zk v1 finished?", the honest answer is no.

The current repo is much closer to:
- `first real zk consume + send + constrained swap lanes`

than to:
- `finished Vanta zk v1 product`
