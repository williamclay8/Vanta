# Vanta Lane Status

Last updated: 2026-05-10. This page is repo-local truth for reviewers; it is not live deployment evidence.

| Lane | Current target | trust-contract `productionReady` | Verifier present | Vault custody model | Claim-controls flags | Reviewer command |
| --- | --- | --- | --- | --- | --- | --- |
| Shield | Target A-shaped, beta local/private-pool path | `false` | local Noir fixtures plus mock/local proof receipt boundary | operator-key/vault-owner today; PDA/program-owned vault remains future work | no audited, production-private, mainnet-ready, or fully-private claim | `npm run shield:verify` |
| Send | Target A-shaped, currently local ledger-gated beta | `false` | local Noir fixtures and no-witness proof-artifact operator guards; no production verifier | operator-key/vault-owner today; shared-pool PDA remains future work | production-private Send claims locked; trust packet must stay proof-boundary honest | `npm run send:verify` |
| Swap | constrained `USDC -> SOL` private-core/Private Pool v2 beta lane | `false` | local Noir fixtures, committed-settlement checks, and operator guards; no audited production verifier | operator-key/vault-owner today; venue/privacy adapters remain beta | quote/route/live-venue privacy claims locked | `npm run swap:capability-check` |
| Unshield | committed local exit/release evidence lane | `false` | local proof/request guards and operator release checks; no on-chain verifier-enforced private exit | operator release path today; final protocol exit enforcement remains future work | production-private exit and anonymity claims locked | `npm run unshield:balance-ledger-check` |
| Strategy | planning/runtime preview over private-rail handoffs | `false` | hash-bound route/settlement packets, not production proof execution | no autonomous live-custody strategy engine | fully-private strategy and live autonomous execution claims locked | `npm run strategy:private-rail-trust-contract-check` |
| Pay | merchant command center and checkout/API preview | `false` | receipt/trust-packet and committed-settlement contract checks; no production payment processor verifier | operator-backed beta settlement records | production payment-processor and production-private Pay claims locked | `npm run pay:verify` |

Standing blockers across all lanes: live shared-pool settlement evidence, audited shared anonymity, real production proof/verifier integration, production relayer/indexer separation, external audit/custody/legal review, and exact-scope approval before any real-funds movement.
