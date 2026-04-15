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
```

Or use the single combined command:

```bash
npm run private-core:demo-preflight
```

That confirms:
- the app builds
- the fixed-depth Noir circuit still passes the valid fixture and rejects the invalid fixture
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

The operator-status command gives a quick summary snapshot of:
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
   If you need to isolate the constrained swap seam, show `npm run private-core:swap-transition-http-smoke`
   If you need to show the downstream swap handoff, show `npm run private-core:swap-unshield-roundtrip-check`
   If the question is operator durability, show `npm run private-core:swap-restart-check`
2. Show the shared internal diagnostics panel
3. Show the replay rejection path
4. Keep the framing on:
   - real proof lane
   - real operator-backed verifier path
   - real replay rejection
