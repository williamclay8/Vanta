# Vanta Privacy Rail Contract

This contract protects Vanta's user-facing privacy claims while the infrastructure path is being finalized.

Render does not create privacy. Render can host services, improve uptime, and make staging or production operators reachable, but privacy comes from the selected rail: an external protocol such as Umbra, or Vanta's own deployed Private Pool v2.

Current status:

- `mainnetReady: false`
- `productionReady: false`
- meaningful privacy claims are blocked

## Rails

### `alpha-public-warning`

This is the current safe fallback. It allows self-custody testing and possible mainnet-alpha wallet flows, but it cannot claim meaningful privacy.

Required stance:

- tell users this is experimental
- do not describe transactions as private
- require explicit wallet approval
- avoid Pay/Strategy production claims

### `umbra-mainnet`

This rail is for an Umbra-backed mainnet integration if Vanta can prove the supported assets, wallet flows, mixer or encrypted-balance route, relayer assumptions, and limitations.

It cannot claim meaningful privacy until Vanta has refs for:

- `VANTA_UMBRA_MAINNET_CAPABILITY_REF`
- `VANTA_UMBRA_SUPPORTED_ASSET_REF`
- `VANTA_UMBRA_WALLET_SIGNING_EVIDENCE_REF`
- `VANTA_UMBRA_PRIVACY_LIMITATIONS_REF`

### `vanta-private-pool-v2`

This rail is for Vanta-operated private settlement.

It cannot claim meaningful privacy until Vanta has refs for:

- `VANTA_PRIVATE_POOL_V2_PRODUCTION_SMOKE_EVIDENCE_REF`
- `VANTA_PRIVATE_POOL_V2_AUDIT_REF`
- `VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF`
- `VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF`
- `VANTA_PRIVATE_POOL_V2_NULLIFIER_ENFORCEMENT_REF`

## User-Facing Rule

Do not claim meaningful privacy unless the selected rail has live mainnet evidence, relayer separation, nullifier/replay enforcement, safe logging, and reviewed limitations.

## Verification

Run:

```bash
npm run privacy-rail:contract-check
npm run mainnet:preflight
```
