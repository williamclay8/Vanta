# Vanta Private Core Single-Note Send

This workspace is the planned first Noir target for Vanta Private Core send.

Current repo status:

- the source-layer send boundary is frozen in:
  - `src/zk/vantaPrivateCore.ts`
- the zk-facing send proof boundary is frozen in:
  - `src/zk/vantaPrivateCoreSendProof.ts`
- deterministic send fixtures are available via:
  - `getVantaPrivateCoreFixedDepthSendFixtureV0()`
  - `serializeVantaPrivateCoreNoirSendWitnessPackageToToml(...)`

Current fixture writer:

```bash
node scripts/write-vanta-private-core-send-fixture.mjs valid
node scripts/write-vanta-private-core-send-fixture.mjs invalid-direction
```

Current regression command:

```bash
npm run private-core:send-check
```

That command proves:

- valid fixture succeeds
- invalid-direction fixture fails
- the workspace ends in valid-fixture state

Current proof command:

```bash
npm run private-core:send-prove
```

That command:

- writes the valid deterministic send fixture
- compiles the Noir send circuit
- executes the witness
- generates a real local proof with Barretenberg
- verifies that proof locally
- writes an ignored proof receipt under `target/`

The first intended circuit target remains intentionally narrow:

- one input note
- one recipient output note
- optional one change output note
- fixed-depth input membership proof
- input nullifier binding
- recipient / change commitment binding
- value conservation

This workspace is intentionally staged before the full circuit lands, so the witness/package contract is frozen before implementation starts.
