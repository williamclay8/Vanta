# Vanta ZK v1 Remaining Work

## Current estimate

There are two different finish lines in the repo right now:

- `Vanta Private Core zk foundation`
- `Full Vanta zk v1 product`

Current estimate:

- Vanta Private Core zk foundation: `65-75%`
- Full Vanta zk v1 product: `35-45%`

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
- operator-side registered-root and latest-root enforcement for the current narrow consume lane
- explicit operator state contracts for:
  - `currentRoot`
  - `latestConsume`
  - empty-state summaries for both endpoints
- app-side Shield, Hold, Unshield, and replay demo integration
- internal diagnostics that expose the source-layer and proving-lane split honestly

## Must-have for zk v1

These are the items that still look mandatory before `zk v1` should be called finished.

### 1. Finish verifier-side semantics into a real release contract

The circuit alone is not enough.

The consuming path still needs the verifier-side contract to be treated as real.

The repo now already has a first narrow operator-side version of that contract:
- verify proof
- require the source root to be the latest registered private-core state
- enforce nullifier uniqueness in the consume path
- surface proof execution and operator-state summaries in the app
- bind root registration and consume to the same witness-backed source note commitment

What still remains for `zk v1` is finishing that into a fuller verifier-side contract:
- stronger root validity policy beyond the current local operator store
- explicit release authorization semantics tied to the real product exit path
- atomic release with nullifier consumption in the chosen real product lane, not just operator-local state

### 2. Freeze the owner-auth decision for v1

Today the first circuit explicitly keeps owner authorization off-circuit.

That can be acceptable for a narrow `v1`, but it needs to be frozen clearly:
- either keep off-circuit owner auth as an explicit `v1` assumption
- or move owner auth in-circuit before claiming `zk v1`

What should not happen is leaving this ambiguous.

### 3. Reduce the remaining source/proving split

The first unshield circuit uses the Poseidon proving lane, while broader app-side source artifacts still use transitional SHA-256 surfaces.

`zk v1` does not necessarily require total convergence everywhere, but it does require:
- an explicit frozen contract for what remains source-layer
- an explicit frozen contract for what is proving-lane truth
- no user- or operator-facing ambiguity about which values govern proof validity

### 4. Ship the first real private workflow required by the product spec

`docs/privacy-model.md` defines `v1` around:

`Public Wallet -> Shield -> Shielded State -> Send`

That means full `zk v1` is not finished with unshield alone.

At minimum, `v1` still needs:
- one real asset
- one real environment
- one real private send flow from shielded state

Until that exists, the current state is better described as:
- a strong private-core and unshield milestone
- not the complete `v1` privacy product

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
4. Finish one real private send flow from shielded state.
5. Re-evaluate the remaining source/proving split after send is real.

## Honest summary

If the question is "is the first Vanta zk lane real yet?", the answer is yes.

If the question is "is Vanta zk v1 finished?", the honest answer is no.

The current repo is much closer to:
- `first real zk consume lane`

than to:
- `finished Vanta zk v1 product`
