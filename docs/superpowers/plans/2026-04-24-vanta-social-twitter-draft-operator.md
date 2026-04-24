# Vanta Social Twitter Draft Operator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a draft-only Vanta official-account social operator that produces source-backed local X/Twitter drafts for manual posting.

**Architecture:** Add a safe `src/social/vantaSocialContext.mjs` allowlisted context loader, a versioned `src/social/vantaSocialVoice.mjs` brand/voice contract, a local `src/social/vantaSocialReviewQueue.mjs` review/edit/export/feedback/preference queue, and a pure `src/social/twitterDraftOperator.mjs` module for draft generation, validation, and artifact formatting. Add Node CLI/check scripts under `scripts/`, and expose npm commands for draft creation, review, editing, marking, export, feedback, preference profiling, and deterministic verification.

**Tech Stack:** Node ESM, npm scripts, plain `node:assert`, ignored `.tmp/social-drafts/` artifacts.

---

### Task 1: Encode The Draft-Only Contract

**Files:**
- Create: `scripts/check-vanta-social-twitter-draft.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing check**

Create `scripts/check-vanta-social-twitter-draft.mjs` with assertions that import `createVantaTwitterDraftPacket`, `validateVantaTwitterDraft`, and `formatVantaTwitterDraftMarkdown` from `src/social/twitterDraftOperator.mjs`.

- [ ] **Step 2: Run the check to verify it fails**

Run: `node scripts/check-vanta-social-twitter-draft.mjs`

Expected: failure because `src/social/twitterDraftOperator.mjs` does not exist yet.

- [ ] **Step 3: Add package scripts**

Add:

```json
"social:twitter-draft": "node scripts/run-vanta-social-twitter-draft.mjs",
"social:twitter-draft-check": "node scripts/check-vanta-social-twitter-draft.mjs"
```

### Task 2: Implement The Pure Draft Operator

**Files:**
- Create: `src/social/twitterDraftOperator.mjs`

- [ ] **Step 1: Implement source-backed draft generation**

Export `createVantaTwitterDraftPacket(options = {})`, returning a packet with `mode: "draft-only"`, `writeCapabilities: []`, and at least three drafts.

- [ ] **Step 2: Implement policy validation**

Export `validateVantaTwitterDraft(draft)`, returning `{ ok: true, failures: [] }` for safe drafts and `{ ok: false, failures }` for unsafe claims.

- [ ] **Step 3: Implement Markdown formatting**

Export `formatVantaTwitterDraftMarkdown(packet)`, including draft text, source facts, rationale, blocked-claim notes, and manual checklist.

- [ ] **Step 4: Run the check to verify it passes**

Run: `npm run social:twitter-draft-check`

Expected: `Vanta social Twitter draft check: PASS`.

### Task 3: Add The Local Draft CLI

**Files:**
- Create: `scripts/run-vanta-social-twitter-draft.mjs`

- [ ] **Step 1: Implement artifact writing**

Write JSON and Markdown artifacts under `.tmp/social-drafts/` using the pure operator packet.

- [ ] **Step 2: Run the CLI**

Run: `npm run social:twitter-draft`

Expected: prints the JSON and Markdown artifact paths.

### Task 4: Verify Repo Health

**Files:**
- Existing verification only

- [ ] **Step 1: Run narrow social check**

Run: `npm run social:twitter-draft-check`

Expected: pass.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: pass.

### Task 5: Add Safe Current-Context Loading

**Files:**
- Create: `src/social/vantaSocialContext.mjs`
- Create: `scripts/check-vanta-social-twitter-context.mjs`
- Modify: `src/social/twitterDraftOperator.mjs`
- Modify: `scripts/run-vanta-social-twitter-draft.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing context check**

Create `scripts/check-vanta-social-twitter-context.mjs` to require a `vanta-social-context-v1` packet, fixed safe source paths, explicit excluded paths, not-production-ready facts, draft-only facts, and no env/tmp-derived facts.

- [ ] **Step 2: Run the check to verify it fails**

Run: `node scripts/check-vanta-social-twitter-context.mjs`

Expected: failure because `src/social/vantaSocialContext.mjs` does not exist yet.

- [ ] **Step 3: Implement the safe context loader**

Create `src/social/vantaSocialContext.mjs` with an allowlist of repo/vault source files and explicit excluded paths: `.env`, `.env.local`, `.tmp`, and `node_modules`.

- [ ] **Step 4: Wire the CLI to loaded context**

Update `scripts/run-vanta-social-twitter-draft.mjs` so generated artifacts use `loadVantaSocialContext()`.

- [ ] **Step 5: Add context verification command**

Add `social:twitter-context-check` to `package.json`.

- [ ] **Step 6: Verify**

Run:

```bash
npm run social:twitter-context-check
npm run social:twitter-draft-check
npm run social:twitter-draft
npm run mainnet:secret-exposure-check
npm run build
```

Expected: all pass, and the draft CLI writes ignored local artifacts under `.tmp/social-drafts/`.

### Task 6: Add Versioned Social Voice Contract

**Files:**
- Create: `src/social/vantaSocialVoice.mjs`
- Create: `scripts/check-vanta-social-voice.mjs`
- Modify: `src/social/twitterDraftOperator.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing voice check**

Create `scripts/check-vanta-social-voice.mjs` to require `vanta-social-voice-v1`, tone rules, approved themes, banned phrases, post archetypes, and manual cadence guidance. The check should also assert that unsafe generic hype and unsafe anonymity language fail validation.

- [ ] **Step 2: Run the check to verify it fails**

Run: `node scripts/check-vanta-social-voice.mjs`

Expected: failure because `src/social/vantaSocialVoice.mjs` does not exist yet.

- [ ] **Step 3: Implement the voice contract**

Create `src/social/vantaSocialVoice.mjs` with:

- `VANTA_SOCIAL_VOICE`
- `validateVantaSocialVoiceText(text)`
- `createVantaDraftVoiceMetadata(archetype)`

- [ ] **Step 4: Wire voice metadata into drafts**

Update `src/social/twitterDraftOperator.mjs` so every draft includes `voice.version`, `voice.archetype`, and `voice.toneRulesApplied`, and so packet metadata includes `voiceVersion` and `voiceGuidance`.

- [ ] **Step 5: Add voice verification command**

Add `social:twitter-voice-check` to `package.json`.

- [ ] **Step 6: Verify**

Run:

```bash
npm run social:twitter-voice-check
npm run social:twitter-context-check
npm run social:twitter-draft-check
npm run social:twitter-draft
npm run mainnet:secret-exposure-check
npm run build
```

Expected: all pass, and generated Markdown includes each draft's voice archetype/version.

### Task 7: Add Local Human Review Queue

**Files:**
- Create: `src/social/vantaSocialReviewQueue.mjs`
- Create: `scripts/check-vanta-social-review-queue.mjs`
- Create: `scripts/print-vanta-social-review-queue.mjs`
- Create: `scripts/mark-vanta-social-review-draft.mjs`
- Modify: `scripts/run-vanta-social-twitter-draft.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing queue check**

Create `scripts/check-vanta-social-review-queue.mjs` to require `vanta-social-review-queue-v1`, queue persistence, draft statuses, manual posting timestamps, and rejection of unsupported automation statuses.

- [ ] **Step 2: Run the check to verify it fails**

Run: `node scripts/check-vanta-social-review-queue.mjs`

Expected: failure because `src/social/vantaSocialReviewQueue.mjs` does not exist yet.

- [ ] **Step 3: Implement the review queue module**

Create `src/social/vantaSocialReviewQueue.mjs` with queue read/write, batch append, draft marking, and queue formatting helpers. Supported statuses are `drafted`, `approved`, `rejected`, and `posted-manually`.

- [ ] **Step 4: Add review and mark CLIs**

Create:

- `scripts/print-vanta-social-review-queue.mjs`
- `scripts/mark-vanta-social-review-draft.mjs`

- [ ] **Step 5: Wire draft generation into the queue**

Update `scripts/run-vanta-social-twitter-draft.mjs` so every generated batch appends to `.tmp/social-drafts/review-queue.json`.

- [ ] **Step 6: Add npm scripts**

Add:

- `social:twitter-review`
- `social:twitter-mark`
- `social:twitter-review-check`

- [ ] **Step 7: Verify**

Run:

```bash
npm run social:twitter-review-check
npm run social:twitter-draft
npm run social:twitter-review
npm run social:twitter-mark -- --draft-id <id> --status approved --note "Manual queue smoke approval."
npm run social:twitter-review
npm run social:twitter-voice-check
npm run social:twitter-context-check
npm run social:twitter-draft-check
npm run mainnet:secret-exposure-check
npm run build
```

Expected: all pass, and review queue state remains under ignored `.tmp/social-drafts/review-queue.json`.

### Task 8: Add Validated Edits And Approved Export

**Files:**
- Modify: `src/social/vantaSocialReviewQueue.mjs`
- Modify: `scripts/check-vanta-social-review-queue.mjs`
- Create: `scripts/edit-vanta-social-review-draft.mjs`
- Create: `scripts/export-approved-vanta-social-drafts.mjs`
- Modify: `scripts/mark-vanta-social-review-draft.mjs`
- Modify: `package.json`

- [ ] **Step 1: Extend the failing queue check**

Update `scripts/check-vanta-social-review-queue.mjs` to require:

- editing a draft updates local queue text
- edits reset status to `drafted`
- edits record an `edited` operator note
- unsafe edits are rejected before persistence
- approved export includes only approved drafts
- repeated draft ids target the newest matching batch by default

- [ ] **Step 2: Run the check to verify it fails**

Run: `npm run social:twitter-review-check`

Expected: failure because edit/export helpers are not available yet.

- [ ] **Step 3: Implement edit/export helpers**

Update `src/social/vantaSocialReviewQueue.mjs` with:

- `editVantaSocialReviewDraft`
- `formatApprovedVantaSocialDrafts`
- newest-batch targeting for repeated draft ids
- optional `batchId` targeting

- [ ] **Step 4: Add CLIs and scripts**

Create:

- `scripts/edit-vanta-social-review-draft.mjs`
- `scripts/export-approved-vanta-social-drafts.mjs`

Add:

- `social:twitter-edit`
- `social:twitter-export-approved`

- [ ] **Step 5: Verify**

Run:

```bash
npm run social:twitter-review-check
npm run social:twitter-draft
npm run social:twitter-edit -- --draft-id <id> --text "..." --note "..."
npm run social:twitter-mark -- --draft-id <id> --status approved --note "..."
npm run social:twitter-export-approved
npm run social:twitter-voice-check
npm run social:twitter-context-check
npm run social:twitter-draft-check
npm run mainnet:secret-exposure-check
npm run build
```

Expected: all pass, edit/export stay local, and no X/Composio write path is introduced.

### Task 9: Add Local Taste Feedback Capture

**Files:**
- Modify: `src/social/vantaSocialReviewQueue.mjs`
- Modify: `scripts/check-vanta-social-review-queue.mjs`
- Create: `scripts/record-vanta-social-feedback.mjs`
- Create: `scripts/print-vanta-social-feedback-summary.mjs`
- Modify: `package.json`

- [ ] **Step 1: Extend the failing queue check**

Update `scripts/check-vanta-social-review-queue.mjs` to require feedback recording with:

- rating from 1 to 5
- note
- preference: `more-like-this`, `less-like-this`, or `neutral`
- feedback summary output
- rejection of out-of-range ratings

- [ ] **Step 2: Run the check to verify it fails**

Run: `npm run social:twitter-review-check`

Expected: failure because feedback helpers are not available yet.

- [ ] **Step 3: Implement feedback helpers**

Update `src/social/vantaSocialReviewQueue.mjs` with:

- `recordVantaSocialReviewFeedback`
- `formatVantaSocialFeedbackSummary`

- [ ] **Step 4: Add feedback CLIs and scripts**

Create:

- `scripts/record-vanta-social-feedback.mjs`
- `scripts/print-vanta-social-feedback-summary.mjs`

Add:

- `social:twitter-feedback`
- `social:twitter-feedback-summary`

- [ ] **Step 5: Verify**

Run:

```bash
npm run social:twitter-review-check
npm run social:twitter-draft
npm run social:twitter-feedback -- --draft-id <id> --rating 5 --preference more-like-this --note "..."
npm run social:twitter-feedback-summary
npm run social:twitter-voice-check
npm run social:twitter-context-check
npm run social:twitter-draft-check
npm run mainnet:secret-exposure-check
npm run build
```

Expected: all pass, feedback stays local, and no X/Composio write path is introduced.

### Task 10: Add Local Preference Profile

**Files:**
- Modify: `src/social/vantaSocialReviewQueue.mjs`
- Modify: `scripts/check-vanta-social-review-queue.mjs`
- Create: `scripts/print-vanta-social-preference-profile.mjs`
- Modify: `package.json`

- [ ] **Step 1: Extend the failing queue check**

Update `scripts/check-vanta-social-review-queue.mjs` to require a preference profile that includes:

- top-rated archetypes
- low-rated archetypes
- more-like-this notes
- less-like-this notes
- suggested voice-rule adjustments
- suggested next draft angles

- [ ] **Step 2: Run the check to verify it fails**

Run: `npm run social:twitter-review-check`

Expected: failure because preference profile formatting is not available yet.

- [ ] **Step 3: Implement preference profile formatting**

Update `src/social/vantaSocialReviewQueue.mjs` with `formatVantaSocialPreferenceProfile(queue)`.

- [ ] **Step 4: Add preference CLI and script**

Create `scripts/print-vanta-social-preference-profile.mjs` and add `social:twitter-preferences`.

- [ ] **Step 5: Verify**

Run:

```bash
npm run social:twitter-review-check
npm run social:twitter-preferences
npm run social:twitter-voice-check
npm run social:twitter-context-check
npm run social:twitter-draft-check
npm run mainnet:secret-exposure-check
npm run build
```

Expected: all pass, preference output stays local, and no X/Composio write path is introduced.
