# AGENTS.md

## Cursor Cloud specific instructions

Vanta is the main product (Solana privacy shield app + Vanta Pay preview). The dev server is started with `npm run dev` (Vite on port 5173). Local operators for Private Pool v2 and Pay are started via npm scripts like `npm run private-pool-v2:demo` or similar (see package.json scripts and README.md for exact commands). Solana RPC URL is required via env (use Helius or public for testing); without it some flows are limited but core UI loads.

Non-obvious: Many verification scripts (`npm run truth:*`, `npm run mainnet:*`) are self-contained and can run without full env. For full E2E, ensure `.env` has VITE_SOLANA_* RPC values. Operator ports default to 8797/8798 but configurable. Trading Lab is separate and optional (uses docker-compose).

Lint/test/build: Use `npm run build`, `npm run lint` (if present), or specific check scripts in package.json. Hot reload works for frontend changes.