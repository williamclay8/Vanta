# External review request: Private Pool v2 relayer privacy transport

Status: outbound reviewer/operator request. This issue body is not Tor evidence, not blinded-token evidence, not reviewer acceptance, not production privacy, not anonymity evidence, and not mainnet readiness.

## Goal

Return a reviewed refs-only evidence packet for the production Private Pool v2 relayer privacy-transport gate. Vanta needs deployment evidence, log-redaction evidence, no-IP/no-open-retention evidence, reviewer acceptance, and exactly one transport mode:

- Recommended first path: Tor onion ingress.
- Alternate path: blinded-token / Privacy Pass-style ingress.

The returned packet must pass:

```bash
VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH=<reviewed-json> npm run relayer:privacy-transport-closure-check
```

Even if that command passes, Vanta must keep `productionReady=false`, `mainnetReady=false`, and `privacyClaimAllowed=false` until broader production, audit, operator, and mainnet gates pass.

## Current repo refs

- Base commit for the request: `76ddcf4a34c892510ebbec526a7f9d24ef1d4233`
- Acquisition packet: `ops/mainnet/private-pool-v2-relayer-privacy-transport-acquisition.evidence.json`
- External evidence request: `ops/mainnet/private-pool-v2-relayer-privacy-transport-external-evidence-request.md`
- Tor template: `ops/mainnet/private-pool-v2-relayer-privacy-transport-tor-onion.template.json`
- Blinded-token template: `ops/mainnet/private-pool-v2-relayer-privacy-transport-blinded-token.template.json`
- Closure checker: `npm run relayer:privacy-transport-closure-check`
- Acquisition checker: `npm run relayer:privacy-transport-acquisition-check`

## Required common refs

- `deploymentRef`
- `logRedactionReviewRef`
- `retentionPolicyRef`
- `reviewerAcceptanceRef`

Accepted prefixes and meanings are listed in `ops/mainnet/private-pool-v2-relayer-privacy-transport-external-evidence-request.md`.

## Required Tor refs

Use this path first unless the reviewer/operator explicitly chooses blinded-token infrastructure.

- `torOnion.onionHostFingerprintRef`
- `torOnion.onionServiceRef`
- `torOnion.reverseProxyRedactionRef`

Reviewer checks:

- Onion service key material remains outside the repo and returned packet.
- Onion ingress forwards only the intended relayer transport target.
- Reverse-proxy and relayer logs omit or redact IP addresses, forwarded IP headers, user agents, auth tokens, raw token material, proof bytes, witnesses, private inputs, user identifiers, and wallet identifiers.
- Retention policy forbids open-ended persistence of IP/header/user-agent/auth-token/raw-token material.
- Reviewer acceptance binds deployment, onion service, host fingerprint, log redaction, retention, and no-secret returned-packet review.

## Required blinded-token refs

Use this path only if issuer/verifier/token-family/replay-cache review can be performed.

- `blindedToken.issuerRef`
- `blindedToken.verifierRef`
- `blindedToken.tokenFamilyRef`
- `blindedToken.replayCacheRef`

Reviewer checks:

- Issuance and redemption contexts are separated.
- Token family and public-key family are reviewable.
- Replay cache prevents reused redeemed tokens.
- Issuer, verifier, replay cache, and relayer logs follow the same redaction and no-open-retention rules.
- Reviewer acceptance binds issuer, verifier, token family, replay cache, log redaction, retention, and no-secret returned-packet review.

## Forbidden returned material

Do not post or attach raw database URLs, Render API keys, bearer/auth tokens, onion private keys, blinded-token preimages, raw IP addresses, forwarded headers, user agents, wallet identifiers, user identifiers, proof bytes, witnesses, private inputs, seed phrases, private keys, signed transaction material, or credential-bearing URLs.

## Render env boundary

Do not set Render privacy-transport env refs until a returned refs-only packet passes the closure checker. After acceptance, set only refs-only values and verify:

```bash
RENDER_API_KEY=<render-api-key> npm run mainnet:render-relayer-privacy-transport-env-status -- --require-ready
```

## Acceptance output

Please return one filled JSON packet using either:

- `ops/mainnet/private-pool-v2-relayer-privacy-transport-tor-onion.template.json`
- `ops/mainnet/private-pool-v2-relayer-privacy-transport-blinded-token.template.json`

The reviewer acceptance ref should be a refs-only handle, not a report body or secret-bearing artifact.
