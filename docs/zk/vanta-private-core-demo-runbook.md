# Vanta Private Core Demo Runbook

## Goal

Show one coherent private-core loop that proves:

1. a private note can be created
2. the note can be held and recovered
3. the note can be sent privately
4. the residual note can be consumed once
5. replay is rejected
6. the current proof lane is real and repeatable

## Recommended preflight

Run these before a live demo:

```bash
npm run build
npm run private-core:demo-readiness
npm run private-core:operator-status
npm run private-core:operator-status-json
npm run private-core:operator-status-check
npm run private-core:operator-status-check-json
npm run private-core:operator-contract-json
npm run private-core:operator-snapshot
npm run private-core:operator-snapshot-json
npm run private-core:operator-snapshot-check
npm run private-core:operator-snapshot-check-json
npm run private-core:shipping-artifact
npm run private-core:shipping-artifact-json
npm run private-core:shipping-artifact-check
npm run private-core:shipping-artifact-check-json
npm run private-core:release-candidate
npm run private-core:release-candidate-json
npm run private-core:release-candidate-check
npm run private-core:release-candidate-check-json
npm run private-core:shipping-status
npm run private-core:shipping-status-json
npm run private-core:shipping-check-json
```

Or use the single combined command:

```bash
npm run private-core:demo-preflight
```

That confirms:
- the app builds
- the fixed-depth Noir circuit still passes the valid fixture and rejects the invalid fixture
- the current private-core swap live path still accepts a current held note plus fresh live quote and rejects stale or mismatched quote inputs
- source-layer send transitions still consume the input note and recover the change note coherently
- residual change notes from private send still flow into hold and unshield coherently
- recipient notes from private send still recover and spend coherently
- received private notes can still become the input to a second private send coherently
- one operator-backed private send still proves, applies, recovers for the recipient, and preserves sender privacy
- one operator-backed private send now requires the current input root to be registered before transition
- one operator-backed private send now also requires that input root to stay linked to its registration proof
- one operator-backed private send now rejects missing, malformed, or non-transitioning resulting roots before proof execution
- one operator-backed private send can now flow into operator-backed recipient unshield coherently
- one operator-backed private send can now also flow into operator-backed sender-change unshield coherently
- two operator-backed private send transitions can now flow into operator-backed recipient unshield coherently
- two operator-backed private send transitions can now execute in sequence on evolving private state
- two operator-backed private send transitions now persist coherently across operator restart
- one operator-backed private send to recipient unshield now persists coherently across operator restart
- one operator-backed private send to sender-change unshield now persists coherently across operator restart
- two operator-backed private send transitions to recipient unshield now persist coherently across operator restart
- the operator consume regression is still green
- the operator HTTP smoke path is still green
- send-proof state is still explicit and restart-safe
- operator state survives a restart
- replay is still rejected after restart
- local proof generation and verification still succeeds
- the compact shipping summary still says whether the frozen narrow lane is actually ready or which live blocker is preventing that
- the static operator contract is still available as machine-readable JSON, including the frozen shipping-decision and shipping-artifact contract surfaces

The operator-status command gives a quick summary snapshot of:
- the canonical shipping decision version, kind, status, and note
- current registered root
- supported send-lane version and identity
- supported unshield-lane version and identity
- latest proof
- latest send proof
- latest send linked proof
- latest send resulting root
- send resulting root status
- send resulting root registration status
- send resulting root registration basis
- send resulting root record
- current root proof link
- send resulting root proof link
- latest consume
- latest release
- release authorization and root policy
- release execution, atomicity, and persistence model
- source-artifact truth, proving-truth, and source/proving relationship
- proof/send link status
- proof/consume link status
- proof/release link status

The shipping-status command gives the shortest operator-backed summary of:
- the canonical shipping decision version, kind, status, and note
- which summary-state version and mirrored contract version you are looking at
- when the current operator summary snapshot was generated
- whether the frozen narrow zk-v1 lane is `Ready narrow v1`
- whether the frozen minimum finish line is still coherent
- or which current blocker is preventing that:
  - required lanes
  - release boundary
  - contract mirror
  - operator boundary

Use `private-core:shipping-status-json` when a reviewer, shell script, or external tool needs the compact readiness surface as machine-readable JSON.
That JSON now comes from the dedicated `/state/private-core-shipping-decision` endpoint rather than being reconstructed ad hoc from the larger summary payload. Treat that endpoint as the canonical operator-backed ship/no-ship contract for the frozen narrow private-core lane.

Use `private-core:shipping-check-json` when that same tooling wants a strict machine-readable pass/fail gate for the frozen narrow lane instead of just a status snapshot.

Use `private-core:operator-status-check` when a human wants the full live operator-status surface itself to act as the strict ready gate instead of only the compact shipping slice. It now reads the dedicated `/state/private-core-status-check` endpoint.

Use `private-core:operator-status-check-json` when that same tooling wants the full live operator-status JSON as a strict machine-readable ready gate instead of only the compact shipping slice. It also reads `/state/private-core-status-check`.

That long-form status surface is now itself frozen in the operator contract via:
- `supportedOperatorStatusVersion = 1`
- `supportedOperatorStatusKind = long-form-live-status`
- `supportedOperatorStatusGateVersion = 1`
- `supportedOperatorStatusGateKind = ready-gated-long-form-live-status`
- `supportedOperatorStatusGateTransport = dedicated-endpoint`
- `supportedOperatorStatusGateEndpoint = /state/private-core-status-check`
- `supportedOperatorStatusTransport = dedicated-endpoint`
- `supportedOperatorStatusEndpoint = /state/private-core-status`

Use `private-core:operator-snapshot` when a human operator wants that same bundled artifact in readable form instead of raw JSON.

Use `private-core:operator-snapshot-json` when that tooling wants one bundled operator-backed artifact from the dedicated `/state/private-core-snapshot` endpoint containing:
- the frozen contract
- the live summary/status surface
- the canonical shipping decision

The shared app runtime now hydrates its operator contract, live summary, and shipping decision state from that same bundled snapshot endpoint, so the UI and the automation surface are aligned on one operator-owned artifact instead of rebuilding those slices independently.

That bundled artifact is now itself part of the frozen operator contract:
- `supportedOperatorSnapshotVersion = 1`
- `supportedOperatorSnapshotKind = contract-status-shipping-bundle`
- `supportedOperatorSnapshotGateTransport = dedicated-endpoint`
- `supportedOperatorSnapshotGateEndpoint = /state/private-core-snapshot-check`
- `supportedOperatorSnapshotTransport = dedicated-endpoint`
- `supportedOperatorSnapshotEndpoint = /state/private-core-snapshot`

Use `private-core:operator-snapshot-check` when a human wants the bundled snapshot itself to act as the strict ready gate instead of only the compact shipping slice.

Use `private-core:operator-snapshot-check-json` when that same tooling wants the full bundled operator artifact as a strict ready gate instead of only the compact shipping slice.

Use `private-core:shipping-artifact` when a human wants the release-grade operator artifact itself in readable form instead of only the bundled snapshot or only the compact shipping slice.

Use `private-core:shipping-artifact-json` when that tooling wants one canonical release-grade operator artifact from the dedicated `/state/private-core-shipping-artifact` endpoint containing:
- the shipping decision identity and current decision
- the current registered root lineage
- the latest proof / send / consume / release lineage
- the bundled snapshot identity
- the bundled contract / live summary / canonical shipping snapshot

That shipping artifact is now itself part of the frozen operator contract:
- `supportedShippingArtifactVersion = 1`
- `supportedShippingArtifactKind = shipping-decision-checked-snapshot-bundle`
- `supportedShippingArtifactGateTransport = dedicated-endpoint`
- `supportedShippingArtifactGateEndpoint = /state/private-core-shipping-artifact-check`
- `supportedShippingArtifactTransport = dedicated-endpoint`
- `supportedShippingArtifactEndpoint = /state/private-core-shipping-artifact`

Use `private-core:shipping-artifact-check` when a human wants that release-grade operator artifact itself to act as the strict ready gate.

Use `private-core:shipping-artifact-check-json` when that same tooling wants the full release-grade operator artifact as a strict machine-readable ready gate.

Use `private-core:release-candidate` when a human wants the exact narrow private-core send -> consume -> release candidate in readable form instead of only the broader shipping artifact or bundled snapshot.

Use `private-core:release-candidate-json` when that tooling wants one machine-readable exact-run candidate from the dedicated `/state/private-core-release-candidate` endpoint containing:
- the exact `releaseCandidateId`
- the send lineage
- the consume lineage
- the release lineage
- the bound bundled snapshot identity

That exact-run candidate is canonical only for the primary `send -> unshield` path; `send-change` and `send-chain` downstream release variants remain valid release paths, but their exact candidate surface now honestly reports blocked `consume-mismatch` lineage instead of pretending they share the same exact-run contract.

That exact-run candidate is now itself part of the frozen operator contract:
- `supportedReleaseCandidateVersion = 1`
- `supportedReleaseCandidateKind = exact-run-send-consume-release-candidate`
- `supportedReleaseCandidateScope = primary-send-unshield-only`
- `supportedReleaseCandidateGateTransport = dedicated-endpoint`
- `supportedReleaseCandidateGateEndpoint = /state/private-core-release-candidate-check`
- `supportedReleaseCandidateTransport = dedicated-endpoint`
- `supportedReleaseCandidateEndpoint = /state/private-core-release-candidate`

Use `private-core:release-candidate-check` when a human wants that exact-run candidate itself to act as a strict ready gate.

Use `private-core:release-candidate-check-json` when that same tooling wants the full exact-run candidate as a strict machine-readable ready gate.

Inside the app, the same primary `send -> unshield` lane is now surfaced as a first-class exact release handoff workflow. The shared runtime and primary Send/Unshield product cards now show:
- prepare
- check
- ship
- handoff status
- next recommended action
- release package status
- release package identity

## App demo path

Use the current Vanta app and walk this sequence:

1. Go to `Shield`
2. Create one private-core shield action
3. Confirm the UI shows:
   - private note created
   - source note commitment
   - source Merkle root
4. Move to the dashboard or shared private-core panel
5. Confirm the note is held privately and a witness is available
6. Open `Send`
7. Run one private-core send
8. Confirm:
   - operator send proof verified
   - send transition recorded
   - residual note becomes the current private state
   - recipient note exists privately
9. Open `Unshield`
10. Run the first private-core unshield against the residual note
11. Confirm:
   - consume succeeds
   - operator proof verified
   - operator release recorded
   - operator boundary shows coherent
12. Trigger the replay attempt
13. Confirm replay is rejected clearly

## Internal diagnostics to show

If you want the technical audience version, expand the internal diagnostics and point out:

- source note commitment
- source witness root
- latest send proof
- latest send transition
- latest send resulting-root basis
- proof/send link status
- proving lane
- proving root
- proof execution status
- proof shape
- operator boundary status
- immediate release request id
- immediate transition note id
- latest operator release
- replay rejection

## Command-line proof lane

If you want to show the proof lane outside the UI:

```bash
npm run private-core:check
npm run private-core:prove
```

Use these talking points:

- `private-core:check` proves the circuit still accepts the valid witness and rejects the malformed Merkle path
- `private-core:prove` proves the current narrow lane can generate and verify a real proof locally

## What to say honestly

Use this framing:

- this is the first real Vanta Private Core zk boundary
- it is still narrow and single-note
- owner auth remains off-circuit in the current v0.1 lane
- the source-layer and proving-lane split is still explicit
- this is not the final full privacy protocol yet

## If something wobbles live

Fall back in this order:

1. Show `npm run private-core:verify`
   or `npm run private-core:demo-readiness`
   If the question is whether the Swap page is using a real current-note path or fixture fallback, show `npm run private-core:swap-live-path-check`
   If you need to isolate the constrained swap seam, show `npm run private-core:swap-transition-http-smoke`
   If you need to show the downstream swap handoff, show `npm run private-core:swap-unshield-roundtrip-check`
   If the question is downstream swap durability, show `npm run private-core:swap-unshield-restart-check`
   If the question is operator durability, show `npm run private-core:swap-restart-check`
2. Show the shared internal diagnostics panel
   On the Swap page, point to:
   - `Swap live path`
   - `Swap live path blockers`
   - `Swap live path primary blocker`
   - `Execution venue`
   - `Quote reference`
   The same live-path summary is also retained in the shared private-core swap handoff panel after the action completes.
   If you need the operator-side persisted view after reload or restart, show `npm run private-core:operator-status` and point to:
   - `Latest swap execution venue`
   - `Latest swap quote reference`
3. Show the replay rejection path
4. Keep the framing on:
   - real proof lane
   - real operator-backed verifier path
   - real replay rejection
