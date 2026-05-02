# Live Mainnet Validation Record

Run outcome: `full pass`

## Exact flow proven

`Public Wallet -> Shield USDC -> Shielded USDC -> Swap USDC -> shielded SOL -> Unshield USDC -> Public Wallet -> Unshield SOL -> Public Wallet`

This proof is for Vanta's constrained mainnet lifecycle only.

## Transaction signatures

Latest successful `Shield`
- public wallet deposit tx: `3gPUq9uapuP4HaP9J6b82KwuTupy5MZGqmsAkv2syF1YWVg4PLzF4tQiR1RdFUbjPvs4CKpTFn5vY9xpuZzdzA9o`
- shield note tx: `5Xye7Ly6GPnNLkTLhdNVhxayADSMZcZ5974rNShyWEfJVcroJLwjgsZZsYn1CqNifXZTWXkmdwHiZwV9SbBZAqGv`

Latest successful `Swap USDC -> SOL`
- swap transition tx: `3ZGHnQfHHLULbFjorCFjrHGsryNGDrkEcZtL1Z1RduS3kE58d2BeY8Vgg22DgzVvGvhFvxcW9UF366LxafeBHspV`
- swap spent-marker tx: `4anFsLgusA6WLT3ResHEYusN8oi13oopnGtYzZVV4WzXaSYNC4BQqa1Jp8XyXLFcvRxiXbjwWTNLu96eHV5wztmX`

Post-cleanup confirmation `Swap USDC -> SOL`
- swap request ID retention verified via local operator records
- swap request ID: `711564e4-fa16-4e1b-925f-737d88fa9ce5`
- swap transition note ID: `vnta_note_b65ca419255e82c4`
- swap output note ID: `vnta_note_b19657e3e92864d6`
- swap transition signature: `4XEKJG3u38ZvFxsrNcHCgnGXapHgTHjnBCgpiXGtJtmv5pRvi1Noydr7yR7d7Q3YaaxG64myD4KqrCyGPKepJoUx`

Latest successful `USDC Unshield`
- unshield transition tx: `3bij6K2sFkGv4X5cgcF5WYrwJtfeaw7mKS2sgdEHVbsicjU4nHRH8PFRicrPmu7krvLFpzXoCFUBiag91GAArQhZ`
- USDC spent-marker tx: `325sWUGU9MxVPvRfYoA16awYbVaFNGyj9PyaF3ewNy9MhvpZSZwvQwY1uf4549inUqWVwBfmncmoBGMf5GMGCj4`

Latest successful `SOL Unshield`
- SOL unshield transition tx: `4doqFumxpv7vV6336E87SuWu5ntwtQQPHiop2kzDsYYAT9zPUbLUyTJS2TjwYxSNGGaiZdB1daz5nDbHh2UCyJmb`
- SOL spent-marker tx: `6b5W1SHYfLCj3DMQHT5nnJDjJFk33CyVXcMFTD2uHVB3rHAbtmATUn68dK8ArAxm5qM8oGrVhfTxYLT6ig74xwQ`

## Recoverable operator request IDs

- swap request ID: `711564e4-fa16-4e1b-925f-737d88fa9ce5`
- USDC unshield request ID: `7eed0148-f513-4dc9-ab89-28bea3ccac84`
- SOL unshield request ID: `e88b052b-0d76-4303-a6ef-f43fb52b9336`

Swap request-ID retention was verified in a post-proof confirmation pass through the durable local swap record store.

## Operator release signatures

- USDC unshield release signature: `3rSt3rSaDLMyXwkxXd3NUpVqk85LU5HzSKZ9Ht6EAPFQyWB8mwViyMHWUNFw5FraYhAWP9nHsruUzVRdLTCwmnxX`
- SOL unshield release signature: `37CD4mfdVyibzUNxMxQvaxHvZX8q812TFYGk6XJqWGck46QHdrEcm6E7xGLoEpyuTS5SMHx6t6oWLneTQPcBLVp2`

## Biggest issue fixed

The main blocker was state incoherence across on-chain transitions, operator-local release records, and frontend note resolution. The final hardening removed premature local finalization, added signature-aware transition verification for swap and USDC unshield, and taught the frontend to treat pending or already released notes honestly.

## Residual caveat

- current swap proof is for the intended constrained one-way `USDC -> SOL` lane
- it is not a symmetric two-way market proof
- swap request-ID retention was a known observability gap during the first proof run and is now patched and verified for future runs

## Final truthful product status

Vanta's constrained mainnet lifecycle is now proven live for:
- `Shield`
- `Send`
- `Swap USDC -> shielded SOL`
- `Unshield USDC`
- `Unshield SOL`

The product remains intentionally narrow, mainnet-only, and not yet the final zk privacy system.
