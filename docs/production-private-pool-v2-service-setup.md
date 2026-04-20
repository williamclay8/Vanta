# Production Private Pool v2 Service Setup

This guide is the references-only handoff for replacing the staging/local Private Pool v2 path with production deployed services.

It does not make Vanta production-ready or mainnet-ready. It records what must exist before production smoke evidence, audit/legal/custody review, and explicit mainnet funds approval can be truthful.

## Current Render inventory

As of April 20, 2026, Render has two Vanta web services:

- Pay staging service: `Vanta`, `srv-d7j3ggqqqhas739for80`, `https://vanta-0wwi.onrender.com`, start command `npm run pay:operator`.
- Private Pool v2 staging service: `vanta-staging-private-pool-v2`, `srv-d7j4aod7vvec73ahsqlg`, `https://vanta-staging-private-pool-v2.onrender.com`, start command `npm run private-pool-v2:operator`.

No production indexer, prover, relayer, verifier, or operator service is currently deployed. The existing Render services are staging evidence only. Keep `mainnetReady: false` and `productionReady: false`.

## Production services to provision

Production Private Pool v2 needs separate deployed services or externally managed equivalents for:

- Indexer: publishes current roots, tree state, and finalized pool state. Repo entrypoint: `npm run private-pool-v2:indexer`.
- Prover: accepts deterministic proof requests and returns proof artifacts without logging private inputs. Repo entrypoint: `npm run private-pool-v2:prover`.
- Relayer: quotes and submits approved claim/settlement requests with replay protection. Repo entrypoint: `npm run private-pool-v2:relayer`.
- Verifier registry: rejects invalid proofs, stale roots, duplicate nullifiers, and unsupported circuit versions. Repo entrypoint: `npm run private-pool-v2:verifier`.
- Operator: assembles the public API and selects deployed services with `VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services`.

The current repo has the remote service client boundary at `src/privacy/privatePoolV2RemoteServices.ts` and a checked role-service network at `operator/private-pool-v2-service-network.mjs`. `npm run private-pool-v2:service-network-check` verifies public health, bearer-authenticated readiness, a prover-to-verifier proof roundtrip, verifier-to-indexer commitment append, duplicate receipt rejection, and relayer quote generation using no-real-funds deterministic inputs. This proves the deployable service shape, not live production readiness.

The same check also starts `npm run private-pool-v2:operator` with `VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services` against the four local role services and completes a deterministic Pay settlement through that network. Local loopback smoke uses `VANTA_PRIVATE_POOL_V2_ALLOW_INSECURE_LOOPBACK_REMOTE_SERVICES=true`; do not set that flag outside localhost test/smoke contexts. Production remote services must use HTTPS URLs.

For local/staging restart evidence, the role services can use:

```bash
VANTA_PRIVATE_POOL_V2_INDEXER_STORE_PATH=<local-json-snapshot-path>
VANTA_PRIVATE_POOL_V2_PROVER_STORE_PATH=<local-json-snapshot-path>
VANTA_PRIVATE_POOL_V2_RELAYER_STORE_PATH=<local-json-snapshot-path>
VANTA_PRIVATE_POOL_V2_VERIFIER_STORE_PATH=<local-json-snapshot-path>
```

The service-network check verifies accepted commitments, proof artifacts, relayer quotes, and verifier receipts survive role-service restarts when these paths are configured. This is not production storage; production still needs managed durable database refs and restore evidence.

The checked role storage seam is:

```bash
npm run private-pool-v2:role-storage-check
```

That check verifies the per-role snapshot boundary can select a `postgres-jsonb-snapshot-store` from `VANTA_PRIVATE_POOL_V2_DATABASE_URL`, rejects local JSON snapshot paths in production, and keeps `productionReady: false` until production database refs and restore evidence exist.

When `NODE_ENV=production`, each role service refuses to boot unless its role auth token and a restart storage configuration are present. The checked guard exists to prevent accidental unauthenticated or stateless production service startup; managed production database refs remain the long-term target.

The checked deployment manifest is:

```text
ops/mainnet/private-pool-v2-services.manifest.json
```

It now records the repo start command for each production role and the `VANTA_PRIVATE_POOL_V2_*` environment names the operator/service network expects. It must stay names-only and refs-only; do not commit raw URLs, tokens, wallet material, database URLs, or provider credentials.

## Secret refs

Use secret-manager-backed refs only. Do not paste or commit values.

The production operator should receive these from Doppler or the approved production secret manager:

- `VANTA_PRIVATE_POOL_V2_RUNTIME_MODE=remote-services`
- `VANTA_PRIVATE_POOL_V2_INDEXER_URL` from `VANTA_INDEXER_URL_REF`
- `VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN` from `VANTA_INDEXER_AUTH_TOKEN_REF`
- `VANTA_PRIVATE_POOL_V2_PROVER_URL` from `VANTA_PROVER_URL_REF`
- `VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN` from `VANTA_PROVER_AUTH_TOKEN_REF`
- `VANTA_PRIVATE_POOL_V2_RELAYER_URL` from `VANTA_RELAYER_URL_REF`
- `VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN` from `VANTA_RELAYER_AUTH_TOKEN_REF`
- `VANTA_PRIVATE_POOL_V2_VERIFIER_URL` from `VANTA_VERIFIER_URL_REF`
- `VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN` from `VANTA_VERIFIER_AUTH_TOKEN_REF`
- `VANTA_PRIVATE_POOL_V2_DATABASE_URL` from a production database ref, never from git or chat.

## Production smoke evidence

The canonical smoke target template is:

```text
ops/mainnet/private-pool-v2-production-smoke.template.json
```

Fill it with refs only after the services exist. The required evidence refs are:

- `VANTA_PRIVATE_POOL_V2_HEALTH_SMOKE_EVIDENCE_REF`
- `VANTA_PRIVATE_POOL_V2_REMOTE_RUNTIME_SMOKE_EVIDENCE_REF`
- `VANTA_PRIVATE_POOL_V2_PROOF_ROUNDTRIP_SMOKE_EVIDENCE_REF`
- `VANTA_PRIVATE_POOL_V2_NULLIFIER_REPLAY_SMOKE_EVIDENCE_REF`

The smoke path must use deterministic no-real-funds inputs. real funds are not approved, and mainnet transactions are not allowed before explicit approval.

## Approval gates

The canonical approval template is:

```text
ops/mainnet/mainnet-approval-gates.template.json
```

It must remain blocked until refs exist for:

- secret-manager-backed credential access logs and service-token refs
- Private Pool v2 production smoke evidence
- third-party security audit scope/report/finding disposition/fix verification
- legal, compliance, and custody review
- explicit mainnet funds approval

Do not store privileged legal advice, under-NDA audit contents, exploit details, wallet keys, signed transactions, database credentials, or service-token values in this repo.

## Verification commands

Run these after refs are updated:

```bash
npm run mainnet:production-service-setup-check
npm run mainnet:private-pool-v2-production-smoke-check
npm run private-pool-v2:service-network-check
npm run private-pool-v2:role-storage-check
npm run mainnet:approval-gates-check
npm run mainnet:preflight
```

These checks prove the references-only setup contract is present and internally consistent. They do not prove that external auditors, lawyers, custody reviewers, or mainnet-funds approvers have cleared the launch.

## Real blocker line

Codex can keep building local contracts, docs, checks, runbooks, and safe smoke harnesses.

Codex cannot honestly complete these without external evidence:

- deployed production services
- secret-manager values/refs created in the external provider
- production smoke evidence from live services
- third-party audit signoff
- legal/compliance/custody review
- explicit mainnet funds approval

Until those refs are supplied by the responsible humans/providers, Vanta remains `mainnetReady: false` and `productionReady: false`.
