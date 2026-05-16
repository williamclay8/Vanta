# Vanta Light Public Indexer

A minimal, production-hardened public service for serving Merkle roots and nullifier sets.

## Features
- Helmet security headers
- Rate limiting (120 req/min per IP)
- Structured logging
- Health and metrics endpoints
- Graceful shutdown

## Endpoints
- `GET /health` — Health check
- `GET /root` — Current Merkle root + nullifier root
- `GET /nullifiers?since=...` — Recent nullifiers
- `GET /metrics` — Uptime + memory stats

## Running Locally
```bash
npm install
npm start
```

## Environment Variables
- `PORT` — Server port (default: 3000)
- `NODE_ENV` — `development` or `production`

## Deployment
Configured for Render via `render.yaml`. Deploy with:
```bash
render deploy
```

## Production Notes
- Rate limited to prevent abuse
- All requests logged with timing
- Returns 429 on rate limit exceed
- Returns 404 for unknown routes
- Graceful shutdown on SIGTERM