# Devnet Shield Setup

This repo now supports one real Shield path for one controlled devnet test token.

The supported asset is surfaced in the app as `VUSD` and is backed by:
- one configured SPL mint
- one configured Vanta vault owner address

## Required environment variables

Create a local `.env` file from `.env.example` and set:

```bash
VITE_VANTA_DEVNET_TOKEN_MINT=...
VITE_VANTA_DEVNET_VAULT_OWNER=...
VITE_VANTA_UNSHIELD_OPERATOR_URL=http://127.0.0.1:8789/unshield

VANTA_DEVNET_TOKEN_MINT=...
VANTA_DEVNET_VAULT_OWNER=...
VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY=[...]
```

Optional:

```bash
VITE_VANTA_DEVNET_TOKEN_NAME=Vanta Devnet Test Dollar
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_WS_URL=wss://api.devnet.solana.com
VANTA_UNSHIELD_OPERATOR_PORT=8789
```

## Suggested SPL CLI setup

Point Solana CLI at devnet:

```bash
solana config set --url devnet
```

Create a controlled mint:

```bash
spl-token create-token
```

Create the connected wallet's token account:

```bash
spl-token create-account <TOKEN_MINT>
```

Mint test balance into the wallet:

```bash
spl-token mint <TOKEN_MINT> 1000
```

Choose a vault owner address for Vanta's first constrained Shield flow. This can be:
- a dedicated devnet wallet address
- a treasury-style devnet address used only for the first shield milestone

The app's real Shield action transfers the supported token from the connected wallet to the configured vault owner on devnet.

For the first constrained Unshield hardening milestone, the frontend no longer carries the vault signer. Instead, a tiny local operator service holds the devnet signer and performs the real return transfer back to Public Wallet.

The current operator path is now minimally authenticated:
- the connected wallet signs an explicit Unshield intent message
- the operator verifies that wallet signature before moving VUSD
- requests carry a timestamped `requestId`
- the operator rejects expired and already-seen requests in-memory during local runs
- the operator confirms the referenced onchain Unshield transition and consumed note are consistent before release
- completed releases are persisted locally so duplicate protection survives operator restarts

Start the operator locally:

```bash
npm run operator:unshield
```

The operator expects:
- `VANTA_DEVNET_TOKEN_MINT`
- `VANTA_DEVNET_VAULT_OWNER`
- `VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY`

By default the operator stores completed release records at:

```text
operator/.vanta-unshield-releases.json
```

Delete that file only if you intentionally want to reset the local operator's remembered release history.

The same local operator now also serves the narrow Vanta Private Core verifier lane used by the fixed-depth single-note unshield proof boundary. That means the current operator process is responsible for:
- authenticated devnet unshield for the live `VUSD` / `SOL` path
- private-core proof verification
- private-core root registration
- private-core consume / replay enforcement
- private-core proof, consume, release, and root summary state

## Recommended local operator preflight

Before a live demo or local verification pass, use:

```bash
npm run private-core:demo-preflight
```

That runs the current full private-core verification stack and then prints the live operator summary snapshot.

If you want the commands separately:

```bash
npm run private-core:verify
npm run private-core:operator-status
```

The operator-status command now prints:
- current root
- latest proof
- latest send linked proof
- latest consume
- latest release
- proof/send link status
- proof/consume link status
- proof/release link status
- operator boundary status
- operator boundary note
- operator summary generation time

## What the private-core verification stack proves today

```bash
npm run private-core:check
npm run private-core:prove
npm run private-core:http-smoke
npm run private-core:restart-check
npm run private-core:verify
```

These commands currently prove:
- the fixed-depth Noir circuit still accepts the valid witness
- the malformed Merkle-path witness still fails
- source-layer send transitions still consume the input note and recover the change note coherently
- residual change notes from private send still hold and unshield coherently
- recipient notes from private send still recover and spend coherently
- received private notes can still chain into a second private send coherently
- one operator-backed private send still proves, applies, recovers for the recipient, and preserves sender privacy
- one operator-backed private send can now flow into operator-backed recipient unshield coherently
- two operator-backed private send transitions can now verify in sequence on evolving private state
- two operator-backed private send transitions now persist coherently across operator restart
- a real local proof can still be generated and verified
- the operator HTTP surface is still coherent
- operator proof, consume, release, and root state survive restart
- replay is still rejected after restart
- the operator summary snapshot remains coherent across app, CLI, and regression surfaces

## What is real in this milestone

- wallet connection
- supported token balance detection
- wallet-signed SPL token transfer into the configured Vanta vault owner
- confirmed shield receipt reflected in app state
- constrained real Unshield back to Public Wallet through a local operator-backed devnet path
- operator-backed Vanta Private Core proof / consume / replay-rejection lane with summary-driven verifier state

## What remains intentionally narrow

- shielded state is represented in-app from confirmed devnet deposit receipts
- this is the first real Shield milestone, not the final Vanta protocol architecture
- Private Send remains the next real protocol milestone
- the current Vanta Private Core lane is still the first narrow single-note unshield boundary, not the full final zk protocol
