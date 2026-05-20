# Full Codebase + Website Audit (2026-05-20)

## Objective

Audit the Vanta codebase and website after the Grok kanban and Claude audit cycle, decide which current local changes should be kept or revised, implement the highest-leverage safe local fixes, and verify the result with canonical commands and browser-backed checks where applicable.

## Constraints

- No pushes, deployments, provider mutations, wallet actions, mainnet transactions, social/email actions, or destructive git operations without explicit approval.
- Preserve existing dirty work; do not revert or discard user/agent changes unless Clay explicitly asks.
- Keep Vanta beta-truthful: no anonymous, untraceable, fully private, production-ready, or live-mainnet-private claims unless matching gates prove them.
- Treat local, committed, pushed, deployed, and live as separate Lumi states.
- Prefer canonical verification commands over ad hoc checks.

## Canonical Board

Machine truth lives at:

`docs/goals/2026-05-20-full-codebase-website-audit/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins.
