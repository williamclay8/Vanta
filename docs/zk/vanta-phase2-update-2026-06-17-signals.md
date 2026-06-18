# Vanta Phase 2 Update - June 17 Signals

Status: source-grounded research synthesis plus starter stubs. No production privacy, SDK integration, Solana verifier acceptance, legal/compliance approval, audit acceptance, signing, broadcast, deployment, or real-funds claim is moved.

## Source Surface

- Required first source checked: `/Users/clay/.hermes/skills/supergrok-research/references/zk-solana-momentum-2026-06.md`. The file did not expose a retrievable `## June 17` heading, so dated Hermes cron receipts were used for June 17 details.
- June 17 cron receipts used: `/Users/clay/.hermes/cron/output/f056aad8568e/2026-06-17_02-05-51.md`, `/Users/clay/.hermes/cron/output/706e494b5d35/2026-06-17_07-03-34.md`, and `/Users/clay/.hermes/cron/output/ef4569b9417c/2026-06-17_14-03-26.md`.
- Targeted Hermes deep-read receipt: `credential_source=xai-oauth`, `provider=xai`, `tool=x_search`, `model=grok-4.20-reasoning`, `social_write_performed=false`.
- Direct `xurl read` was blocked by X API `CreditsDepleted`. Browser/web open did not return usable X post text. Treat Hermes `x_search` receipts as the X-source layer for this pass.
- Public web artifacts used for Helius/Light: [Helius Privacy](https://www.helius.dev/privacy), [Helius acquires Light](https://www.helius.dev/blog/light-protocol-acquisition), [Lightprotocol/light-protocol](https://github.com/Lightprotocol/light-protocol), and NIST [FIPS 203 ML-KEM](https://csrc.nist.gov/pubs/fips/203/final).

## Priority Adoption List

| Rank | Pattern | Adopt now? | Why |
| --- | --- | --- | --- |
| 1 | ZkMedusa-style local passport verification | Yes, as Vanta-owned circuit/wrapper | Directly advances Phase 2 local proving, private reputation, agent eligibility, and a candidate claim-wallet commitment shape. |
| 2 | Arcium-style crypto-agility for hybrid compute | Yes, as roadmap/registry metadata | Gives Vanta a credible long-term PQ path without pretending Groth16/BN254 is post-quantum. |
| 3 | Helius privacy rings/delegation/API shape | Yes, as interface watch and registry inspiration | Strong Solana-native privacy API signal; current access still looks gated, so integrate patterns, not dependency. |
| 4 | VeerTx / Privacy Cash private ZEC bridge UX | Watch + design placeholder | Useful cross-chain demand signal, but no deep technical artifact or MEV mechanism surfaced. |

## ZkMedusa Passport SDK Deep Dive

### What Was Found

June 17 Hermes found a ZkMedusa SDK/passport post at [x.com/ZkMedusa/status/2067315082040639624](https://x.com/ZkMedusa/status/2067315082040639624). The concrete install line surfaced was:

```bash
npm install solana:HYdWaJRTW4vVTFPjUaUV7J7JXHzxMnvogBr4ZFupump /passport-sdk
```

The same deep-read surfaced the key product claims: local one-call passport verification, tier gating, allowlists, private access control, and no surveillance. The earlier June 17 cron receipt also recorded a claim-wallet/passport flow: browser ZK, wallet history local, main-wallet proof with fresh claim-wallet rotation, and SDK/full-stack open-source claims. Vanta treats those as external claims until verified with code, logging, wallet-isolation, and correlation tests.

### Clean Install Test

Clean test directory: `/tmp/vanta-zkmedusa-passport-sdk-test`.

Commands and results:

```bash
npm init -y
npm install solana:HYdWaJRTW4vVTFPjUaUV7J7JXHzxMnvogBr4ZFupump/passport-sdk
npm install solana:HYdWaJRTW4vVTFPjUaUV7J7JXHzxMnvogBr4ZFupump
npm view passport-sdk name version description repository dist-tags
```

Results:

- Stock npm rejected the `solana:` protocol with `EUNSUPPORTEDPROTOCOL`.
- The plain `passport-sdk` registry package is unpublished.
- No public repo URL or normal registry package was found in this pass.

Limitation: the package likely depends on a custom Solana package resolver, a nonstandard installer, or an unrevealed package source. Manual next search: inspect ZkMedusa's public docs/repo/profile links or ask for resolver docs. Do not connect a real wallet, sign, fund, submit, use provider secrets, or capture live wallet/app traffic for this research path.

### Local Verification Flow To Adopt

Proposed Vanta one-call wrapper:

1. Resolve an active `PassportPolicy` record from Vanta's verifier registry.
2. Scan or import local wallet reputation inputs on device only: wallet age bucket, activity/volume tier, risk flag, allowlist witness, and optional claim-wallet secret.
3. Generate the Noir/Groth16 proof locally in a browser worker or trusted local prover.
4. Locally verify the proof before creating a header.
5. Emit only a proof header: policy hash, verifier id, issuer hash, public-input hash, nullifier, proof bytes, and redacted-fields list.
6. Fail closed for unknown policy, stale verifying key, missing allowlist root, expired policy, risk flag, duplicate nullifier, missing local prover, unsupported proof encoding, or unsupported settlement route.

### No-Surveillance Pattern

Vanta should copy the privacy shape, not the unavailable SDK:

- wallet history, portfolio, and raw activity remain local witness data
- public output is only a predicate receipt such as `tier >= X`, `age >= Y`, and `risk_flag == 0`
- claim-wallet commitment can keep main-wallet details out of public inputs, but wallet-source unlinkability remains unproven until browser-worker, logging, receipt, wallet-isolation, and correlation tests exist
- nullifier prevents replay without publishing wallet identity
- allowlist membership is proven by Merkle inclusion, not by sending the allowlist row

### Solana Integration Shape

Source limitation: no exact ZkMedusa PDA layout or proof format was found.

Recommended Vanta PDAs:

- `PassportPolicy` PDA: seeds `["passport-policy", policy_hash]`; stores thresholds, issuer hash, allowlist root, expiry slot, status.
- `PassportVerifier` PDA: seeds `["passport-verifier", circuit_id, verifier_id]`; stores verifying-key hash, proof encoding, program id, status.
- `PassportNullifier` PDA: seeds `["passport-nullifier", eligibility_nullifier]`; created on accepted use to prevent replay.
- `PassportReceipt` PDA or event: stores policy hash, public-input hash, claim-wallet commitment, redacted-fields hash, and claim boundary.

## Proposed Vanta Stubs

Created artifacts:

- `vanta-june17-artifacts/zk/noir/vanta_passport_reputation_gate/`
- `vanta-june17-artifacts/src/zk/vantaPassportEligibility.ts`

Circuit additions over `vanta_agent_eligibility_gate`:

- volume/tier threshold
- issuer hash
- candidate claim-wallet commitment shape
- private fixed-depth allowlist membership
- expiry slot
- nullifier bound to policy, verifier, passport secret, and slot epoch

The TypeScript wrapper enforces the fail-closed one-call pattern before returning a proof header.

## Arcium Post-Quantum Resilience Plan

June 17 source thread: [Arcium status 2067246504914641242](https://x.com/Arcium/status/2067246504914641242) plus following posts [2067246529078042851](https://x.com/Arcium/status/2067246529078042851), [2067246540851454345](https://x.com/Arcium/status/2067246540851454345), and [2067246552591261777](https://x.com/Arcium/status/2067246552591261777).

Source-backed thread points:

- Arcium describes a path to post-quantum security.
- The thread emphasizes hash functions and LPN/LPN variants.
- The principal component swap identified is ECDH to ML-KEM/Kyber in base oblivious transfers.
- Session-key caching is called out as a way to reduce expensive cryptographic operations.

NIST context: FIPS 203 specifies ML-KEM and says its security is related to Module Learning with Errors; NIST states ML-KEM is believed secure even against quantum adversaries and defines ML-KEM-512/768/1024 parameter sets.

### Vanta Recommendations

1. Add crypto-suite metadata to verifier/receipt registries now:

```json
{
  "schemaVersion": "vanta-crypto-suite-registry-candidate-v0.1",
  "proofSystem": "groth16-bn254",
  "hashSuite": "poseidon-bn254",
  "kexSuite": "ecdh-current | hybrid-ecdh-ml-kem-candidate | ml-kem-candidate",
  "baseOtSuite": "ecdh-current | ml-kem-candidate | lpn-candidate",
  "sessionKeyCachePolicy": {
    "enabled": false,
    "maxUses": 0,
    "maxAgeSlots": 0
  },
  "pqClaimBoundary": "metadata-only-not-post-quantum-vanta"
}
```

2. Treat PQ first as a hybrid-compute and encrypted-channel concern. It does not make the current Groth16/BN254 verifier post-quantum.
3. For client-relayer, agent, and confidential-compute lanes, introduce a KEM abstraction so ECDH can be swapped for hybrid ECDH+ML-KEM and later ML-KEM-only without changing Vanta receipts.
4. Bind `kexSuite`, `baseOtSuite`, `sessionKeyEpoch`, `transcriptHash`, and `externalTrustBoundary` into hybrid-compute receipts.
5. Use session-key caching only with explicit expiry, max-use counters, transcript binding, and fail-closed rotation. Cache reuse without transcript binding creates replay and correlation risk.
6. Maintain a "no PQ claims" guard until Vanta has reviewed libraries, audited integration, verifier compatibility, and migration tests.

### Roadmap

| Horizon | Action |
| --- | --- |
| 0-30 days | Add crypto-suite fields to registry/receipt specs. Inventory all ECDH, signing, hash, proof-system, and encryption assumptions. |
| 30-90 days | Prototype hybrid ECDH+ML-KEM only for off-chain encrypted sessions and confidential-compute adapters. Keep on-chain proof stack unchanged. |
| 90-180 days | Evaluate PQ-friendly proof alternatives or verifier adapters for long-term proof-system agility. Do not block Phase 2 Groth16 UX on this. |

## VeerTx Private Payments / ZEC Bridge Pattern

June 17 targeted Hermes search confirmed the user-linked [VeerTx status 2067301674000040446](https://x.com/VeerTx/status/2067301674000040446) exists as a reply to [theprivacycash status 2067290874988335355](https://x.com/i/status/2067290874988335355).

Source-backed claims:

- Privacy Cash said users requested private ZEC bridging and it shipped within a day.
- VeerTx framed this as fast delivery and said VeerTx is solo-built, on two chains for now, with more coming.
- VeerTx bio/context describes private payments for SOL/USDC on Solana and ETH/USDC on Base, with wallet hiding.

No technical artifact, contract, repo, relayer design, proof format, or MEV mechanism surfaced.

### Comparison vs Vanta Transfer Designs

| Area | Vanta current T22 `vanta_unlinkable_transfer_plus` | VeerTx / Privacy Cash June 17 signal | Recommendation |
| --- | --- | --- | --- |
| Core primitive | Amount bucket, anonymity root, relayer context, spend context, recipient commitment, nullifier | Private payments and private ZEC bridge UX | Keep Vanta's note/nullifier base. Add bridge-intent fields only as design placeholder. |
| Cross-chain | Not modeled | Solana/Base plus ZEC support signal | Add `privacyDomain`, `sourceChain`, `destinationChain`, `bridgeIntentHash`, `destinationReceiptCommitment`. |
| MEV resistance | Relayer context and timing/batching can support it, but not proven | No MEV claim surfaced | Do not claim MEV resistance from VeerTx. Require relayer separation and timing-jitter evidence. |
| UX | Proof/receipt-first local prototype | Fast asset onboarding and private payment UX | Prioritize simple proof-header UX and route registry over broad bridge support. |
| Evidence | Local starter circuit | X signal only | Watch for repo/docs before implementation. |

Proposed future public inputs for Vanta transfer/bridge receipts:

```json
{
  "sourcePrivacyDomain": "solana-vanta-shielded-v0",
  "destinationPrivacyDomain": "zcash-or-base-watch-only",
  "bridgeIntentHash": "poseidon:<intent>",
  "sourceNullifier": "poseidon:<nullifier>",
  "destinationReceiptCommitment": "poseidon:<receipt>",
  "relayerContext": "poseidon:<relayer-policy>",
  "claimBoundary": "bridge-intent-design-only-not-live-bridge"
}
```

## HeliusPrivacy / Light Follow-Up

New public artifacts since acquisition found in this pass:

- [Helius Privacy](https://www.helius.dev/privacy) product page is live and describes simple APIs for private Solana money, payments, and finance.
- [Helius acquisition blog](https://www.helius.dev/blog/light-protocol-acquisition) remains the canonical acquisition source.
- [Lightprotocol/light-protocol](https://github.com/Lightprotocol/light-protocol) remains the core open-source repo for ZK Compression.

Actionable patterns:

- Helius's privacy page exposes a `setDelegate` shape with `owner`, optional `ringId`, `delegate`, `endpoint`, `capabilities`, `expiresAt`, and `ownerSignature`.
- Helius positions privacy rings/policies as configurable, non-custodial, and interoperable.
- Helius says proofs and relays can be generated/handled without holding user keys or funds.
- The acquisition blog identifies Light's Solana ZK syscall contributions: Poseidon and alt_bn128 group/compression syscalls, and points to Light/ZK Compression resources.
- Light's repo is mature and has program examples, JS/web clients, verifiable build instructions, audits, and formal verification notes; however, its current public repo is ZK Compression, not the new Helius private transfer API.

Integration opportunities for Vanta:

- Mirror the `capabilities` array as Vanta verifier/delegate capabilities: `view`, `sync`, `proof`, `relay`, `audit`.
- Model Vanta institutional lanes as policy rings without adding Helius as a dependency until APIs are public.
- Use Light's open repo as an implementation-quality comparator for Solana proof/verifier discipline, audits, and verifiable builds.

## Backlog Additions

| ID | Priority | Item | First artifact |
| --- | --- | --- | --- |
| T30 | P0 | ZkMedusa-style private passport reputation gate | `zk/noir/vanta_passport_reputation_gate` |
| T31 | P0 | Fail-closed passport proof-header SDK wrapper | `src/zk/vantaPassportEligibility.ts` |
| T32 | P1 | Crypto-suite/PQ metadata in verifier registry and hybrid receipts | `docs/zk/post-quantum-resilience-plan-2026-06-17.md` or registry spec update |
| T33 | P1 | Helius-style delegated privacy-ring capabilities | verifier/delegate registry spec |
| T34 | P2 | Private bridge-intent receipt placeholder | transfer circuit/spec only, no live bridge |

## Watchlist

- ZkMedusa: resolver docs for `solana:` package installs, passport SDK repo, examples for local verify, proof format, on-chain verifier, PDA layout.
- Arcium: TGE/mainnet details, any PQ implementation docs, ML-KEM/base-OT code, session-key caching design.
- VeerTx / Privacy Cash: bridge contracts, relayer docs, ZEC route mechanics, MEV/privacy claims, audit links.
- HeliusPrivacy: public APIs, SDK docs, privacy-ring schemas, proof generation/relay API, open-source private transfer repos.

## Human Next Actions

1. Ask ZkMedusa for the package resolver or repo backing `solana:HYdWaJRTW4vVTFPjUaUV7J7JXHzxMnvogBr4ZFupump /passport-sdk`.
2. Lift `vanta_passport_reputation_gate` into the Vanta repo only after deciding whether to replace or extend `vanta_agent_eligibility_gate`.
3. Add TS proof request/result packet tests before connecting any wallet or Solana mutation path.
4. Add registry metadata for crypto-suite and proof-system assumptions before making any post-quantum or hybrid-compute claim.
5. Keep VeerTx/ZEC as a watch item until docs or code appear.
