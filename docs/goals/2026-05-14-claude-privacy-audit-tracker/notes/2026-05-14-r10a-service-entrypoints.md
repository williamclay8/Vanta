# R10A Service Entrypoints - 2026-05-14

## Status

Local implemented.

## What This Closes

This closes the local stub-replacement part of R10A from the Claude privacy audit: the Private Pool v2 prover, relayer, verifier, and indexer now have role-explicit service entrypoints instead of direct generic role-string startup stubs.

## Files

- `operator/private-pool-v2-indexer-server.mjs`
- `operator/private-pool-v2-prover-server.mjs`
- `operator/private-pool-v2-relayer-server.mjs`
- `operator/private-pool-v2-verifier-server.mjs`
- `operator/private-pool-v2-service-network.mjs`
- `scripts/check-vanta-private-pool-v2-service-network.mjs`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-14-completion-audit.md`

## Guarded Content

- Each role entrypoint exports a named entrypoint descriptor:
  - `vantaPrivatePoolV2IndexerServiceEntrypoint`
  - `vantaPrivatePoolV2ProverServiceEntrypoint`
  - `vantaPrivatePoolV2RelayerServiceEntrypoint`
  - `vantaPrivatePoolV2VerifierServiceEntrypoint`
- Each role entrypoint calls a named role-specific start function:
  - `startVantaPrivatePoolV2IndexerService`
  - `startVantaPrivatePoolV2ProverService`
  - `startVantaPrivatePoolV2RelayerService`
  - `startVantaPrivatePoolV2VerifierService`
- `vantaPrivatePoolV2RoleServiceEntrypoints` records the role, npm script, start file, service name, and beta truth boundary for every local role service.
- The service-network guard now rejects reintroducing generic `startVantaPrivatePoolV2RoleService` startup imports or wrappers inside the role entrypoint files.

## Verification

- Red-first: `npm run private-pool-v2:service-network-check` failed before implementation with `Expected indexer entrypoint to export vantaPrivatePoolV2IndexerServiceEntrypoint.`
- Green: `npm run private-pool-v2:service-network-check`

## Truth Boundary

This is local entrypoint and role-service guard hardening only. It is not production service separation, not deployed service health evidence, not least-privilege secret proof, not on-chain proof verification, not production recipient discovery, not production privacy, and not real-funds readiness.
