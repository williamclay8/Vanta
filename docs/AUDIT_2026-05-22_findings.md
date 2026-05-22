# Vanta Audit Findings — 2026-05-22

Companion to `AUDIT_2026-05-22_roadmap.md`. This file is findings-only, no roadmap. Format follows `AUDIT_2026-05-19.md` so a reviewer can diff the two cleanly.

Branch: `main` @ `31d6ac8e`. Live asset: `assets/index-DOw4Hena.js` (newer than manifest's last-verified, honestly disclosed at `/.well-known/vanta-audit.json`).

## Prior-Audit Status

| ID | Title | Status |
| --- | --- | --- |
| H1 | Dead "client-side programmatic privacy" code + misleading signoff docs | FIXED — `indexerClient.ts`, `clientProver.ts`, `light-public-indexer.mjs`, three signoff docs all deleted |
| H2 | `vanta-light-public-indexer.onrender.com` dead | FIXED — service + the code that pointed at it removed |
| H3 | TAG_UNSHIELD zero-nullifier check missing | FIXED — `programs/vanta_private_pool_v2_spend/src/lib.rs:2335-2341` |
| H4 | `cfg!(test)` release/sentinel gating | OUTSTANDING — see H4 carried below |
| H5 | Helius RPC URL baked into bundle | FIXED — verified externally: 0 occurrences of `helius`/`yoko`/`Bearer`/`Authorization` in live bundle |
| M1 | `light-public-indexer.mjs` zero-root fallback | FIXED (file deleted) |
| M2 | CORS / rate-limit in `light-public-indexer.mjs` | FIXED (file deleted); equivalent issue surfaces as L8 on the role-service network |
| M3 | Audit manifest stale | HONESTLY DISCLOSED — manifest carries `status: "pending-reattestation-after-2026-05-14-deploy-drift"` and a truthBoundary that names what is and isn't proved |
| M4 | Inverted `releaseEnabled` semantics | OUTSTANDING — code unchanged but comment now documents the inversion as intentional fail-closed; still needs the design flip when verifier wires in |
| M5 | Caller-supplied verifier_key_hash | OUTSTANDING — transitive binding through the future Groth16 verifier remains the only mitigation; flag in C01 audit scope |
| M6 | Live indexer Bearer auth vs SPA | VERIFIED — expected operator-trusted-beta posture, matches A2-OPERATOR-KEYPAIR-CUSTODY |
| L1 | `clientProver.ts` SHIELD_CIRCUIT = {} stub | FIXED (file deleted) |
| L2 | redacted-commitment sentinel string | FIXED — `src/zk/liveShieldBridge.ts:323-334` preserves Poseidon commitment, only redacts amount fields |
| L3 | `helmet()` with no CSP / HSTS | FIXED at the layer that mattered (file deleted); see new M9 for the live-site equivalent |
| L4 | `process.env` at module load | FIXED (file deleted) |
| L5 | Render service IDs in public manifest | FIXED — removed |

## New Findings (2026-05-22)

### H6 — ActualPrivateSpend circuit does not decompose `context_hash`

`zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr:78-113,115-171`. The circuit takes `context_hash` as an opaque private Field input and binds it into `private_spend_public_input_hash` (the verifier-checked public input) without ever decomposing it into component fields. By contrast, `zk/noir/vanta_private_core_single_note_unshield/src/main.nr:145-152` takes `(release_destination_hi, release_destination_lo)` as separate inputs and recomputes the context-tag in-circuit. The off-circuit code (`src/zk/actualPrivateTransactionRail.ts`) constructs `context_hash = hash(merchant, denomination, settlementEpoch, nullifier)` — but the circuit cannot tell whether that construction matches the user's intent.

Once tag-3 verifier wiring lands (C01), the validity of "this proof pays merchant M" depends on whether the off-circuit `context_hash` is constructed correctly and isn't malleable by a relayer. A circuit that doesn't constrain how `context_hash` was built means the on-chain checker has no way to detect an off-circuit substitution.

**Severity.** High. The circuit / proving / wire-up is hard to change after a trusted setup is committed, so this should be fixed before the C01 ceremony, not after.

**Fix.** Bring ActualPrivateSpend into the Unshield pattern. Take `(merchant_hi, merchant_lo, denomination, settlement_epoch)` as private inputs, recompute `context_hash` in-circuit with the same Poseidon shape, assert equality with the public input. Add fixture `invalid-context-hash-preimage`.

### H4 (carried) — `cfg!(test)` release/sentinel gating

`programs/vanta_private_pool_v2_spend/src/lib.rs:1023-1051, 2372-2384`. Two build-time gates control whether release paths run or fail closed:
- `require_vault_asset_record()` SOL sentinel bypass at lines 1023-1032
- `process_unshield()` SOL release path at line 2382 (`if cfg!(not(test)) { return Err(ERR_UNSHIELD_NOT_WIRED); }`)

Safe today because mainnet SBF is built without `--cfg test`. Risk: a build misconfiguration that flips `--cfg test` on, or a feature flag that transitively pulls in `test` cfg, opens release without warning. Tracked as architecture blocker A1. Fix: move to a runtime field on `pool_state` (e.g., `verifier_wired: bool`) set only by an authority instruction after C01 audit acceptance.

### M6 — Output commitments are bound, but destination/asset are not asserted in-circuit for spend

Same shape as H6 for the pure shielded-spend (non-payment) case. `process_spend_with_proof` reads `output0`, `output1`, `accepted_root`, `public_input_hash`, `verifier_key_hash` from instruction data. The output commitments are Poseidon hashes of `(owner, asset, amount, blinding, derivation_tag)`, so asset+amount are *implicitly* committed. What is not explicitly verified in-circuit is that the consumed-note's asset matches the new outputs', and that withdrawal destinations are tied into the proof. Same fix shape as H6.

### M7 — `TAG_REGISTER_VAULT_ASSET` not idempotent across param changes

`programs/vanta_private_pool_v2_spend/src/lib.rs:848-920` calls `ensure_vault_asset_record()` (`lib.rs:1082-1180`). A second TAG_REGISTER_VAULT_ASSET for the same `asset_id` with different `vault_authority` / `token_program` / `mint` bytes overwrites the prior record. Fail-closed today via the TAG_UNSHIELD cfg gate. Once release is wired, accidental re-registration silently moves vault authority binding. Fix: add an explicit `if account.initialized && record != expected → ERR_VAULT_ASSET_ALREADY_REGISTERED_WITH_DIFFERENT_PARAMS` before any state write.

### M8 — Operator services return raw `err.message`

`operator/private-pool-v2-service-network.mjs:1678, 1970` and ~12 other locations. `sendJson(response, 500, { error: err.message })` patterns. Internal Bearer-authed today, so leak scope is limited. If the service is ever exposed externally or the stack trace surfaces a file path / env value, becomes a reconnaissance vector. Replace with sanitized messages (`"validation failed"`, `"processing error"`) plus structured server-side logging.

### M9 — Missing HTTP security headers on live site

`curl -sI https://vantaprivacy.xyz/` returns `X-Content-Type-Options: nosniff` but no `Content-Security-Policy`, `Strict-Transport-Security`, `Referrer-Policy`, or `Permissions-Policy`. Cloudflare and Render can both set headers. Recommended:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://solana-rpc.publicnode.com https://*.onrender.com; frame-ancestors 'none'; base-uri 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: no-referrer
Permissions-Policy: accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()
```

### M10 — CI does not gate `build` or the privacy aggregates

`.github/workflows/privacy-audit.yml` runs only `privacy-audit:tracker-check` and `frontend:operator-env-exposure-check`. Missing: `npm run build`, `npm run truth:privacy-claim-gate`, `npm run zk:review-guards-check`, `npm run zk:feedback-loop-check`, `npm run private-pool-v2:verify`. Add a `verify` job that runs `npm ci && npm run build && npm run truth:privacy-claim-gate && npm run zk:review-guards-check` on every PR and push to main.

### L6 — TAG_REGISTER_PROVENANCED_ROOT accepts `previous_root == accepted_root`

`programs/vanta_private_pool_v2_spend/src/lib.rs:729-803`. Data quality issue; add `if accepted_root == previous_root { return Err(ERR_ROOT_TRANSITION_NOOP) }`.

### L7 — Output Record PDA seed is index-based, not content-based

`programs/vanta_private_pool_v2_spend/src/lib.rs:1556-1630`. PDA seed `["vanta2out", pool_state, output_index]` — does not include commitment content. By-design; existing init-or-match check prevents reuse. Add an explanatory comment for reviewers.

### L8 — `operator/private-pool-v2-service-network.mjs` lacks CORS/rate-limit

Internal-only today, but should not be the moment we discover this when the role moves to a public endpoint.

### L9 — VantaPay privacy gates are static-config

`src/pay/vantaPayTypes.ts:133-135` carries `fully_private_pay_claim: false` and `production_privacy_claims_locked: true`, but no Pay code path asserts these at proof submission time. Add a runtime guard that throws if production-privacy is requested while the flag is locked.

### L10 — `.env.operator.local` carries a real Helius devnet API key

Correctly `.gitignore`d (no leak). Flagging because the same key being shared across machines means rotating it is an operational action, not automatic.

## Architectural Blockers (Unchanged)

These are not new findings; they are the standing blockers from `LANE_STATUS.md` that cannot be closed by local code edits and that gate every "production-private, mainnet-ready" claim. The roadmap document covers what closing each requires.

| ID | Title | Status |
| --- | --- | --- |
| A1 / R1 / C01 | On-chain Groth16 verifier wiring | partial, see C01 promotability map |
| A2 / R4 | Program-owned PDA vault (replace operator keypair custody) | not started in production |
| A3 / R5 | Program-owned shared Merkle tree | source scaffold only |
| R9 | Real recipient discovery (off operator path) | viewing-key + proof-owner-key scaffolds landed, live discovery still operator-mediated |
| R11 | Live anonymity set ≥ 1024 | `currentDistinctCommitments: 2`, fails closed |
| R20 / R21 | External audit acceptance | none accepted |

## Severities In Brief

- **High:** H6 (new), H4 (carried)
- **Medium:** M6, M7, M8, M9, M10 (all new); M4, M5 (carried)
- **Low:** L6, L7, L8, L9, L10 (all new)

Eight prior-audit findings closed cleanly, three honestly disclosed or carried. New surface is mostly remediable inside a one-week sprint except for H6 (which is small-LOC but blocks the C01 ceremony from going forward without rework) and H4/M4/M5 (which want the verifier-wired runtime flag).
