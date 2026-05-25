# PPA-DISCOVERY-001 - View-Tag Pull API on the Indexer

## Source

- Audit: `PRODUCTION_PRIVACY_AUDIT.md`
- Band: 6 - recipient discovery
- Recommended remediation order: 19
- Item: View-tag pull API on the indexer

## Status

`plan-open-awaiting-approval`

No code implementation has started for this item. Clay approval is required after this plan is posted.

## Current Repo Truth

- `src/solana/vantaShieldViewingKey.ts` already derives encrypted view tags for AEAD memo packets.
- `operator/private-pool-v2-service-network.mjs` already stores local Send discovery packets and supports an exact `encryptedViewTag` query used by the local proof-bound handoff fixture.
- `scripts/check-vanta-private-pool-v2-send-discovery-indexer-handoff.mjs` proves local packet ingest/query, proof-bound body-hash handoff, duplicate rejection, forbidden field rejection, and restart persistence.
- That existing exact-tag path is still local-only, not a deployed query-private recipient pull channel, and not production recipient discovery.

## Planned Files

- `operator/private-pool-v2-service-network.mjs`
- `operator/private-pool-v2-indexer-server.mjs`
- `src/solana/vantaShieldViewingKey.ts`
- `src/solana/vantaShieldState.ts`
- `scripts/check-vanta-indexer-view-tag-pull.mjs`
- `scripts/check-vanta-private-pool-v2-send-discovery-indexer-handoff.mjs`
- `docs/threat-model.md`
- `SECURITY_LIMITATIONS.md`
- `docs/operator-runbook.md`
- `package.json`
- `PRODUCTION_PRIVACY_AUDIT.md`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml`
- `docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-discovery-001-view-tag-pull-api-plan.md`

## Planned Design

1. Add a red-first `npm run indexer:view-tag-pull-check`.
2. Add an indexer recipient pull endpoint for view-tag prefix queries with stable cursor pagination and recorded-slot ordering.
3. Require prefix-bucket semantics for the new endpoint rather than exact full-tag lookup, so recipients fetch candidate packets without proving the exact packet they own.
4. Reject sender, recipient wallet, owner public key, raw IP, auth token, plaintext memo, amount, owner secret, witness, proof bytes, and private input fields in indexed packets and API responses.
5. Keep production readiness false and local-only claim boundaries until deployed discovery service evidence, retention/log-redaction evidence, public or anonymous read posture, and reviewer acceptance exist.
6. Preserve the existing exact-tag local handoff path as a verifier-mirrored fixture only, not a production recipient-discovery claim.

## Planned Fixtures

- Red-first: `npm run indexer:view-tag-pull-check` fails before script/package wiring and prefix pull endpoint exist.
- Valid prefix pull returns multiple matching candidate packets with pagination and no sender/recipient identity fields.
- Malformed, too-short, too-long, exact full-tag, and non-hex prefixes reject without mutating indexer state.
- Packet ingest and pull responses reject or omit raw IPs, forwarding headers, wallet identifiers, plaintext memos, amounts, proof bytes, witnesses, owner secrets, note blindings, auth tokens, and raw private inputs.
- Prefix-queryable discovery packets persist across indexer restart.
- Status surfaces expose local implementation plus `productionReady: false` and blockers for deployed service, retention/log-redaction evidence, anonymous/public read posture, and reviewer acceptance.

## Red-First Evidence

- 2026-05-25: `npm run indexer:view-tag-pull-check` fails before implementation with `npm error Missing script: "indexer:view-tag-pull-check"`.

## Planned Script

- `npm run indexer:view-tag-pull-check`

## Planned Test Cases

- Prefix query returns a deterministic page of matching candidate packets and a next cursor when more matches exist.
- Prefix query cannot filter by recipient wallet, recipient owner public key, sender, amount, or user identifier.
- Response packets contain refs and proof-bound ciphertext body hashes only, not plaintext note material or network identifiers.
- New pull endpoint rejects exact full encrypted view tags if the prefix is narrower than the policy bucket.
- Existing local exact-tag handoff fixture remains local-only and does not become a production discovery claim.
- Truth gates continue to report `privacyClaimsAllowed=false`, `productionReady=false`, and recipient-discovery blockers.

## Verification After Approval

- `npm run indexer:view-tag-pull-check`
- `npm run private-pool-v2:send-discovery-indexer-handoff-check`
- `npm run private-pool-v2:service-network-check`
- `npm run send:direct-viewing-key-exchange-check`
- `npm run mainnet:secret-handling-check`
- `npm run truth:privacy-claim-gate`
- `npm run privacy-audit:tracker-check`
- `npm run build`
- `git diff --check`

## Truth Boundary

This plan is for a local indexer API and evidence gate. It does not deploy a recipient discovery service, provide query privacy, migrate legacy v1 memos, prove anonymity, provide audit acceptance, or make Send production-private/mainnet-ready.

## Lumi

- Local: tracker-only Band 6 item 19 plan and red-first missing-script evidence recorded locally; no code implementation yet.
- Committed: latest branch head after this tracker-only plan slice; use `git log` for the exact commit.
- Pushed: `origin/codex/ppa-program-004-runtime-verifier-wired` after this tracker-only plan slice; use `git status` for sync.
- Deployed/live: not deployed/live.
