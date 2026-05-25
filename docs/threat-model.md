# Vanta Threat Model

Last validated against repo-local code: 2026-05-25.

This document records the current Vanta threat model before mainnet-private claims. It is intentionally conservative: Vanta production privacy is not enabled, the on-chain verifier and program-owned exit path are not wired, and the live anonymity set is below the published threshold.

## Scope

This threat model covers the current Shield, Send, Swap, Unshield, Pay, operator, relayer, prover, indexer, and public-doc surfaces that exist in this repository and the currently verified public bundle.

It does not claim anonymous, untraceable, fully private, production-ready, or live mainnet-private settlement. It is a source-of-truth document for engineering and review until a newer audited model replaces it.

Operational runbook companions:

- `docs/incident-response-runbook.md`
- `docs/key-custody-runbook.md`

They are checked with `npm run compliance:ops-publication-check` and keep launch status unchanged until the external refs named in those files exist.

## Actors

The minimum actor set is users, merchants, relayers, operators, counterparties, provers, verifiers, indexers, wallet providers, RPC providers, auditors, and reviewers.

- Users hold wallets, create shield records, generate or request proofs, keep local state, and initiate sends, swaps, unshields, or payments.
- Merchants and other counterparties receive receipts, payment evidence, or verification artifacts and need truthful settlement status without seeing unsupported privacy claims.
- Operators currently run custody-adjacent and settlement-adjacent services, including nullifier replay checks, proof-artifact checks, root registration, and public-exit unshield handling.
- Relayers are expected to submit or forward private-settlement actions later, but current service separation is incomplete.
- Provers may be local browser workers, local fixtures, or future remote services. A remote prover or prover relay must be explicit opt-in.
- Verifiers are future on-chain proof-verifier paths; current tag-3 and tag-6 paths fail closed instead of verifying or releasing.
- Indexers and discovery services may help recipients find encrypted memos or note state, but production recipient discovery is not deployed.
- Wallet providers and RPC providers can observe wallet, network, timing, and transaction metadata outside Vanta's protocol boundary.
- Auditors and reviewers rely on this document, `SECURITY_LIMITATIONS.md`, the audit tracker, and executable commands for claim evidence.

## Assets And Secrets

Privacy-sensitive material includes note secrets, proof-owner secrets, viewing keys, memo plaintexts, X25519 material, owner recovery payloads, witness inputs, blinding values, nullifiers, commitments, ciphertext body hashes, local browser records, operator database rows, vault signer material, service auth tokens, and deployment secrets.

Review artifacts and receipts are also security-sensitive when they imply liveness, custody, proof verification, or private-settlement readiness. They must separate implementation, verification, deployment, and live evidence.

## Current Trust Boundaries

- Browser localStorage records are diagnostics and continuity aids only. They are not a production privacy primitive, not the shared shielded-state tree, and not recovery by themselves.
- The live anonymity set remains below threshold. The 2026-05-14 live manifest evidence observed `currentDistinctCommitments: 2` and `minimumDistinctCommitments: 1024`; this supports a blocked anonymity-readiness claim, not anonymity.
- `TAG_SPEND_WITH_PROOF = 3` currently reaches `ERR_PROOF_VERIFIER_NOT_WIRED` instead of successful on-chain proof verification.
- `TAG_UNSHIELD = 6` currently reaches `ERR_UNSHIELD_RELEASE_NOT_WIRED` instead of proof-verified SPL or SOL release.
- The current Unshield path remains an operator-keypair public exit. `loadKeypairFromEnv(vaultSignerSecretKeyEnvName)` is the known A2 custody exception until a program-owned PDA vault replaces it.
- Fresh-address exit privacy is not present. The current operator path rejects `destinationOwner !== requester`, so exit-to-fresh-wallet cannot be claimed. Clay approved the proof-bound fresh-address exit direction on 2026-05-14.
- A program-owned shared tree is not deployed. Operator-fed or provenance-checked roots are not proof that the root transition is correct.
- Recipient discovery is not production deployed. Viewing-key AEAD and ciphertext body-hash fields are useful building blocks, but they do not by themselves solve recipient-grade discovery. The local indexer now exposes an authenticated view-tag prefix-bucket pull endpoint with cursor pagination and fail-closed query/response redaction, but this is local evidence only, not deployed query-private recipient discovery. Clay approved hybrid discovery on 2026-05-14.
- Service separation is incomplete. Prover, relayer, verifier, indexer, and operator services must have distinct identities, logs, queues, auth, storage, and failure domains before separation can be treated as a privacy boundary.
- Browser-worker proving remains dev-only evidence. Remote proving must not silently receive witnesses or proof material; it is not production-private proof infrastructure.
- Legacy v1 plaintext memo history is quarantined as parse-compatible history only. It is excluded from production privacy, anonymity, proof-verified, and mainnet-private claims unless migrated or segregated with reviewed evidence.
- Public docs, manifests, and website copy are claim surfaces. The meta description, `.well-known/vanta-audit.json`, docs pages, receipts, and product pages must stay aligned with the negative gates.

## Adversaries And Failure Modes

- A chain observer can inspect transparent deposits, vault movements, operator-submitted metadata, root registrations, nullifier markers, output records, public exits, timing, and live anonymity-set depth.
- A compromised or malicious operator can correlate requests, misuse logs, expose database contents, delay service, censor actions, or drain operator-controlled vault funds until program-owned custody is deployed.
- A prover or prover relay can observe proof inputs, target circuits, timing, request size, retry behavior, and network metadata if witness construction leaves the user's device.
- A relayer can correlate sender network metadata with action timing unless batching, transport, and service separation are reviewed. The local relayer queue now guards 30-180s Send jitter, 30s-1h Unshield jitter, and Send batch envelopes as a source-level timing-correlation mitigation only. The relayer privacy-transport gate now accepts refs-only Tor/blinded-token evidence, requires exactly one production mode (`tor-onion` or `blinded-token`), and rejects raw IP, token, onion-private-key, user-agent, user, wallet, proof, witness, and secret material from queued/status/evidence metadata. This is not live Tor, not live blinded-token submission, not anonymity-set evidence, not production privacy, and not audit acceptance.
- An indexer or recipient-discovery service can learn request cadence, discovery queries, view-tag prefixes, ciphertext availability, and wallet-associated metadata unless the discovery protocol is deployed with reviewed retention/log-redaction and public or anonymous read posture. The local prefix-pull endpoint rejects exact full-tag queries and wallet/amount/network/private-input filters, but it does not prove query privacy.
- A wallet or RPC provider can correlate wallet identity, IP address, RPC calls, signatures, transaction timing, and balance changes outside Vanta's cryptographic boundary.
- A stale deployment can make local source-level fixes look live when the deployed SBF binary or public bundle has not been rebuilt, pushed, deployed, and verified.
- Copy or receipt drift can overstate proof verification, anonymity, custody, or settlement privacy if a new surface bypasses the existing truth gates.
- Local browser data loss can make browser-local records unavailable; recovery without operator-side records or reviewed recovery flows must not be implied.
- Legacy v1 plaintext memo history can remain linkable and must be migrated, quarantined, or explicitly excluded from any privacy claim.

## Required Before Production-Private Claims

Before Vanta can claim production-private, proof-verified, program-owned custody, fresh-exit privacy, shared-tree privacy, or live anonymity, all of the following must have positive evidence:

- tag-3 on-chain proof verification succeeds against a registered verifying key and no longer returns `ERR_PROOF_VERIFIER_NOT_WIRED`;
- tag-6 release succeeds through a proof-verified program-owned vault path and no longer returns `ERR_UNSHIELD_RELEASE_NOT_WIRED`;
- the operator-keypair public-exit path is replaced by program-owned PDA custody and audited CPI release;
- `destinationOwner !== requester` is supported only when the proof binds the release destination;
- roots come from a program-owned shared tree with verified transitions;
- live anonymity-set depth is above the published threshold and claim flags remain tied to live data;
- recipient discovery is deployed and reviewed;
- prover, relayer, verifier, indexer, and operator services are separated and reviewed;
- legacy v1 plaintext memo history is migrated, quarantined, or excluded from claims, with local Send migration tooling creating sanitized v2 discovery metadata or segregation records only until reviewed migration/segregation evidence exists;
- the deployed bytecode and public bundle are matched to reviewed source;
- hosted CI, local canonical checks, and reviewer-facing docs all agree.

## Verification Commands

Use these commands as the current local guard set for this threat model:

- `npm run docs:source-of-truth-check`
- `npm run compliance:ops-publication-check`
- `npm run privacy-audit:tracker-check`
- `npm run zk:feedback-loop-check`
- `npm run private-core:verify`
- `npm run private-pool-v2:verify`
- `npm run indexer:view-tag-pull-check`
- `npm run private-pool-v2:live-anonymity-set-probe-check`
- `npm run public:live-meta-description-check`
- `npm run operator:keypair-env-lockdown-check`

These commands do not prove production privacy. They prove the local docs and gates still preserve the current limitations, blocked states, and implementation boundaries.
