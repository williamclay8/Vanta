# Vanta Private Core Demo Runbook

## Goal

Show one coherent private-core loop that proves:

1. a private note can be created
2. the note can be held and recovered
3. the note can be consumed once
4. replay is rejected
5. the current proof lane is real and repeatable

## Recommended preflight

Run these before a live demo:

```bash
npm run build
npm run private-core:verify
```

That confirms:
- the app builds
- the fixed-depth Noir circuit still passes the valid fixture and rejects the invalid fixture
- the operator consume regression is still green
- the operator HTTP smoke path is still green
- local proof generation and verification still succeeds

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
6. Open `Unshield`
7. Run the first private-core unshield
8. Confirm:
   - consume succeeds
   - operator proof verified
   - operator release recorded
9. Trigger the replay attempt
10. Confirm replay is rejected clearly

## Internal diagnostics to show

If you want the technical audience version, expand the internal diagnostics and point out:

- source note commitment
- source witness root
- proving lane
- proving root
- proof execution status
- proof shape
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
2. Show the shared internal diagnostics panel
3. Show the replay rejection path
4. Keep the framing on:
   - real proof lane
   - real operator-backed verifier path
   - real replay rejection
