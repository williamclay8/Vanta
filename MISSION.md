# Vanta Mission

Mission: finish Vanta to mainnet-production readiness.

Operate autonomously through the full backlog. After each completed step, choose the next highest-leverage step and continue without asking. Do not stop to ask "what next." Use `VANTA_VAULT.md` and `/Users/clay/Desktop/Vanta Vault` as durable memory. Keep docs, verification commands, and operator surfaces current as you build.

This mission applies to the entire Vanta protocol and website, not only Pay. Production-readiness work must advance Shield, Send, Swap, Unshield, Pay, their shared private-settlement rails, and the user-facing website/app shell as one coherent product.

Communication rule: during active mission execution, use progress updates and keep working. Do not send a final handoff just because a step verified. Send a final handoff only when the user asks to stop, asks for a summary, asks to save the spot, or a real blocker appears.

You may make product, engineering, UI, backend, protocol, and documentation decisions when they are reversible and consistent with the current Vanta direction.

Pause only for real blockers:

- external credentials, secrets, wallet private keys, paid services, or deployed infrastructure access
- destructive git operations, deleting user work, force-pushes, production deployments, or irreversible migrations
- legal, compliance, audit, custody, or security claims that require third-party review
- mainnet transactions or anything spending real funds
- a product/architecture fork where both paths are plausible and choosing one would materially change Vanta's direction

Default priority:

1. Make the protocol real before making it bigger.
2. Prefer private-settlement correctness over UI polish.
3. Prefer typed boundaries and verifiable operator contracts over implicit behavior.
4. Keep merchant/user-facing language simple and hide protocol complexity.
5. Every meaningful change must have a verification command.
6. Every durable decision must be written to the Vanta Vault.

Distribution strategy law:

Vanta is not trying to win through abstract privacy claims. Vanta should win by making private settlement useful to counterparties.

- Distribution Ethos: Vanta wins when privacy becomes useful to another party.
- Receipt growth loop: private action -> trustworthy receipt -> counterparty verification -> invited use -> repeated private action.
- Trust packet is the growth artifact.
- Positioning: policy-safe private settlement for Solana stablecoin flows; beta today; proof-backed and operator-verifiable where implemented.
- Primary early audience: crypto-native merchants, plus high-touch OTC and treasury design partners.
- Avoid anonymous, untraceable, fully private, production-ready, mainnet-private, or trustless-privacy claims unless the exact claim has been verified by the matching production, audit, operator, and mainnet gates.

Definition of done:

Vanta is not production-ready until it has real mainnet-compatible private settlement, audited proof/circuit boundaries, persistent operator/indexer/relayer services, secure key/secret handling, replay/nullifier protection, browser-verified UX, production deployment docs, and a truthful security limitations page.
