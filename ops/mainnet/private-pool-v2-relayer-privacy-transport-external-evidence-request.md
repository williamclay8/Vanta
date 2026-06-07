# Relayer Privacy Transport External Evidence Request

Status: request packet only. This file is not live Tor evidence, not blinded-token evidence, not reviewer acceptance, not anonymity evidence, not production privacy, and not mainnet readiness.

## Goal

Return a reviewed refs-only evidence packet that lets the production Private Pool v2 relayer boot with exactly one privacy-transport mode while keeping `productionReady=false` and `privacyClaimAllowed=false`.

Vanta needs either:

- Tor onion ingress evidence, recommended first, or
- blinded-token / Privacy Pass-style ingress evidence, valid but heavier.

Do not return raw secrets, raw onion keys, token preimages, raw IPs, forwarded headers, user agents, wallet identifiers, proof bytes, witnesses, private inputs, database URLs, bearer tokens, Render API keys, seed phrases, private keys, or signed transaction material.

## Primary Sources

- Tor Project onion service setup: `https://community.torproject.org/onion-services/setup/`
- Privacy Pass architecture: `https://www.ietf.org/rfc/rfc9576.html`
- Privacy Pass HTTP authentication: `https://www.ietf.org/rfc/rfc9577.html`

The Tor request relies on the Tor Project's `HiddenServiceDir` and `HiddenServicePort` onion-service model. The reviewer must confirm the onion service private key stays out of the repo and returned packet.

The blinded-token request relies on Privacy Pass-style separation of issuance and redemption, token-family review, and replay-cache review. That path is acceptable only if the reviewer can inspect issuer, verifier, token family, replay controls, and log/retention behavior.

## Recommended First Path: Tor Onion

Deploy a Tor onion ingress that forwards the onion virtual port to the relayer transport target. The onion ingress should be isolated from the existing relayer app service and should not require raw onion keys, private key files, or provider secrets to be copied into this repo.

Required reviewer checks:

- `HiddenServiceDir` or equivalent onion-service key material is stored only in the deployment secret/storage boundary and is not committed.
- `HiddenServicePort` or equivalent forwards only the intended relayer transport port/path.
- The onion hostname/fingerprint can be referenced without exposing the onion private key.
- Reverse proxy and relayer logs do not persist raw IP addresses, `x-forwarded-for`, `x-real-ip`, `forwarded`, `cf-connecting-ip`, user agents, bearer/auth tokens, raw token material, proof bytes, witnesses, private inputs, user identifiers, or wallet identifiers.
- Retention policy explicitly forbids open-ended persistence of IP/header/user-agent/auth-token/raw-token material.
- The reviewer acceptance ref binds the deployment, onion service, onion host fingerprint, reverse-proxy redaction, relayer log-redaction, retention policy, and no-secret returned packet review.

Use the Tor template:

```bash
ops/mainnet/private-pool-v2-relayer-privacy-transport-tor-onion.template.json
```

Validate the filled returned packet with:

```bash
VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH=<reviewed-tor-onion-json> npm run relayer:privacy-transport-closure-check
```

## Alternate Path: Blinded Token

Use this only if the reviewer can inspect a real issuer/verifier deployment, token family, and replay cache. This path must preserve Privacy Pass-style separation between issuance and redemption contexts and prevent token replay.

Required reviewer checks:

- Issuer ref identifies the reviewed token issuer or attester/issuer boundary.
- Verifier ref identifies the relayer-side token verification boundary.
- Token-family ref binds the challenge/token type/public key family.
- Replay-cache ref proves redeemed tokens cannot be reused for the accepted challenge window.
- Log redaction and retention reviews cover issuer, verifier, replay cache, and relayer surfaces.
- Reviewer acceptance ref binds issuer, verifier, token family, replay cache, log-redaction, retention, and no-secret returned packet review.

Use the blinded-token template:

```bash
ops/mainnet/private-pool-v2-relayer-privacy-transport-blinded-token.template.json
```

Validate the filled returned packet with:

```bash
VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH=<reviewed-blinded-token-json> npm run relayer:privacy-transport-closure-check
```

## Required Common Refs

| Field | Accepted prefixes | Meaning |
|---|---|---|
| `deploymentRef` | `tor-onion-service:`, `blinded-token-service:`, `deploy:`, `render-deploy:` | Reviewed live transport deployment reference. |
| `logRedactionReviewRef` | `log-redaction:`, `review:` | Reviewed relayer/provider log redaction reference. |
| `retentionPolicyRef` | `retention-policy:`, `review:` | Reviewed no-IP/no-open-retention policy reference. |
| `reviewerAcceptanceRef` | `review:`, `reviewer:` | Reviewer acceptance binding all mode and common refs. |

## Required Tor Refs

| Field | Accepted prefixes | Meaning |
|---|---|---|
| `torOnion.onionHostFingerprintRef` | `sha256:`, `tor-onion-fingerprint:` | Onion hostname/fingerprint ref without private key material. |
| `torOnion.onionServiceRef` | `deploy:`, `render-deploy:`, `tor-onion-service:` | Reviewed onion-service deployment ref. |
| `torOnion.reverseProxyRedactionRef` | `log-redaction:`, `review:` | Reviewed onion ingress / reverse-proxy redaction ref. |

## Required Blinded-Token Refs

| Field | Accepted prefixes | Meaning |
|---|---|---|
| `blindedToken.issuerRef` | `blinded-token-issuer:`, `privacy-pass-issuer:`, `review:` | Reviewed issuer/attester-issuer boundary ref. |
| `blindedToken.verifierRef` | `blinded-token-verifier:`, `privacy-pass-verifier:`, `review:` | Reviewed relayer-side verifier ref. |
| `blindedToken.tokenFamilyRef` | `blinded-token-family:`, `privacy-pass-token-family:`, `sha256:` | Reviewed token family / public-key family ref. |
| `blindedToken.replayCacheRef` | `blinded-token-replay-cache:`, `redis-ref:`, `review:` | Reviewed replay-cache ref. |

## Provider Env Mutation Boundary

Do not set Render privacy-transport envs until a filled returned packet passes:

```bash
VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH=<reviewed-json> npm run relayer:privacy-transport-closure-check
```

After reviewer evidence passes, set only refs-only env values on the relayer service, then verify:

```bash
RENDER_API_KEY=<render-api-key> npm run mainnet:render-relayer-privacy-transport-env-status -- --require-ready
```

Do not set placeholder refs. Do not set onion private keys, blinded-token preimages, bearer tokens, database URLs, wallet keys, proof bytes, witnesses, or private inputs in the relayer privacy-transport evidence envs.

## Promotion Boundary

Even after the reviewed refs are accepted, these remain false until the broader Vanta gates independently pass:

- `productionReady`
- `mainnetReady`
- `privacyClaimAllowed`
- `anonymityClaimAllowed`
- `auditAccepted`
