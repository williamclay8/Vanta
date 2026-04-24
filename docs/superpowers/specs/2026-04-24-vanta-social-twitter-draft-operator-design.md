# Vanta Social Twitter Draft Operator Design

## Goal

Build a draft-only operator for Vanta's official X/Twitter account. The first version must produce source-backed candidate posts for manual review and manual posting, with no X credentials, no Composio write path, and no automated account actions.

## Scope

In scope:

- Generate local candidate post drafts for the official Vanta account.
- Attach source facts and a manual posting checklist to each draft.
- Load a safe current context packet from fixed repo and vault sources.
- Apply a versioned Vanta social voice contract to every draft.
- Append generated batches to a local ignored human-review queue.
- Support validated human edits and approved-draft export from the local queue.
- Record local taste feedback for future voice tuning.
- Summarize feedback into a local preference profile.
- Provide a one-command next-step guide and stable approved export file.
- Run policy checks that block false readiness, audit, custody, guarantee, and spam-like claims.
- Write ignored local artifacts under `.tmp/social-drafts/`.
- Provide a deterministic verification command that does not need OpenAI, Composio, or X credentials.

Out of scope:

- Posting through X/Twitter.
- Composio tool execution.
- Automated replies, likes, follows, reposts, or DMs.
- Live web scraping or trend-chasing.
- Any account credential handling.

## Architecture

`src/social/vantaSocialContext.mjs` owns the safe source allowlist for current repo and vault facts. `src/social/vantaSocialVoice.mjs` owns the brand voice contract: tone rules, approved themes, banned phrases, post archetypes, and manual cadence guidance. `src/social/vantaSocialReviewQueue.mjs` owns local review-queue state and formatting for review, edit, export, feedback, preference profile, and next-step guidance. `src/social/twitterDraftOperator.mjs` owns the pure draft contract: source facts, candidate generation, policy checks, voice metadata, and artifact formatting. `scripts/run-vanta-social-twitter-draft.mjs` is the operator CLI that writes local JSON/Markdown artifacts and appends to the review queue. `scripts/check-vanta-social-twitter-draft.mjs` is the canonical smoke check for the draft boundary, `scripts/check-vanta-social-twitter-context.mjs` verifies the safe context loader, `scripts/check-vanta-social-voice.mjs` verifies the voice contract, and `scripts/check-vanta-social-review-queue.mjs` verifies the review/edit/export/feedback/preference/next-step queue.

The v0 generator is deterministic and source-backed so the repo can verify the safety surface without external services. A future Composio adapter can be added after the brand voice and approval policy are trusted, but v0 deliberately has no write-capable tool boundary.

## Data Flow

1. Load a compact Vanta context packet from repo and vault-derived constants.
2. Generate a small set of candidate official-account drafts.
3. Validate every draft against Vanta's social policy.
4. Write `.tmp/social-drafts/<timestamp>-vanta-twitter-drafts.json`.
5. Write `.tmp/social-drafts/<timestamp>-vanta-twitter-drafts.md`.
6. Append the batch to `.tmp/social-drafts/review-queue.json`.
7. The operator reviews and may edit a draft locally; edits rerun draft/voice policy before saving.
8. The operator marks approved drafts and exports approved copy for manual posting.
9. The operator records taste feedback such as rating and `more-like-this` / `less-like-this`.
10. The operator prints a preference profile to tune future draft angles.
11. The operator can run `npm run social:twitter-next` for the latest batch, recommended draft, exact approve/export commands, and stable approved export path.
12. The operator posts manually outside the repo.

## Policy

The operator must reject drafts that imply:

- mainnet production readiness
- audits, certifications, or third-party review
- custody or fund-safety guarantees
- anonymity-set guarantees
- investment advice, price promises, or token appreciation
- partnerships or customer claims without an explicit source
- automated posting, automated replies, or account write access

Every accepted draft must include:

- `manualPostingOnly: true`
- at least one source fact
- a rationale
- blocked-claim notes
- a manual checklist that reminds the operator to verify facts and post manually

## Verification

Canonical command:

```bash
npm run social:twitter-draft-check
npm run social:twitter-context-check
npm run social:twitter-voice-check
npm run social:twitter-review-check
```

The check must prove:

- draft generation returns at least three candidates
- every candidate is manual-posting-only
- every candidate has source facts, rationale, and checklist items
- unsafe claims are blocked by the validator
- no Composio or X write capability is exposed in the v0 result
- the context loader preserves the not-production-ready truth
- the context loader excludes `.env`, `.env.local`, `.tmp`, and `node_modules`
- the voice contract blocks generic hype/anonymity language and attaches a voice version/archetype to every draft
- the review queue supports only `drafted`, `approved`, `rejected`, and `posted-manually`
- marking a draft never implies automated posting
- edits are rejected before persistence when they violate draft or voice policy
- approved export includes only approved drafts and manual checklist/source facts
- feedback ratings are bounded to 1-5 and preference direction is explicit
- preference profiles summarize top/low archetypes, preference notes, suggested voice-rule adjustments, and suggested next draft angles
- approved export writes `.tmp/social-drafts/approved-twitter-drafts.md`
- next-step output prints latest draft batch, draft IDs, recommended draft, exact commands, and file paths
