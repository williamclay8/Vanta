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

Start the operator locally:

```bash
npm run operator:unshield
```

The operator expects:
- `VANTA_DEVNET_TOKEN_MINT`
- `VANTA_DEVNET_VAULT_OWNER`
- `VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY`

## What is real in this milestone

- wallet connection
- supported token balance detection
- wallet-signed SPL token transfer into the configured Vanta vault owner
- confirmed shield receipt reflected in app state
- constrained real Unshield back to Public Wallet through a local operator-backed devnet path

## What remains intentionally narrow

- shielded state is represented in-app from confirmed devnet deposit receipts
- this is the first real Shield milestone, not the final Vanta protocol architecture
- Private Send remains the next real protocol milestone
