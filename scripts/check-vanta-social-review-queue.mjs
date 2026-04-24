import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  appendVantaSocialReviewBatch,
  createVantaSocialReviewEntries,
  editVantaSocialReviewDraft,
  formatVantaSocialFeedbackSummary,
  formatVantaSocialPreferenceProfile,
  formatVantaSocialNextSteps,
  formatApprovedVantaSocialDrafts,
  formatVantaSocialReviewQueue,
  recordVantaSocialReviewFeedback,
  markVantaSocialReviewDraft,
  readVantaSocialReviewQueue,
} from "../src/social/vantaSocialReviewQueue.mjs";
import { createVantaTwitterDraftPacket } from "../src/social/twitterDraftOperator.mjs";

const tempRoot = mkdtempSync(resolve(".tmp/vanta-social-review-queue-check-"));
const queuePath = resolve(tempRoot, "review-queue.json");

try {
  const emptyQueue = readVantaSocialReviewQueue(queuePath);
  assert.equal(emptyQueue.kind, "vanta-social-review-queue-v1", "queue must use the v1 contract");
  assert.deepEqual(emptyQueue.batches, [], "missing queue should start empty");

  const packet = createVantaTwitterDraftPacket({
    generatedAt: "2026-04-24T13:30:00.000Z",
  });
  const entries = createVantaSocialReviewEntries(packet);

  assert.equal(entries.length, packet.drafts.length, "review entries should mirror packet drafts");
  for (const entry of entries) {
    assert.equal(entry.status, "drafted", "new review entries should start drafted");
    assert.equal(entry.manualPostingOnly, true, "review entries must preserve manual posting only");
    assert.equal(entry.postedManuallyAt, null, "unposted entries must not have a posted timestamp");
    assert.ok(entry.voice.archetype, "review entries should preserve voice archetype");
    assert.ok(entry.sourceFacts.length > 0, "review entries should preserve source facts");
  }

  const appended = appendVantaSocialReviewBatch({
    packet,
    queuePath,
    artifactPaths: {
      jsonPath: resolve(tempRoot, "drafts.json"),
      markdownPath: resolve(tempRoot, "drafts.md"),
    },
  });

  assert.equal(appended.batches.length, 1, "appending a packet should create one batch");
  assert.equal(appended.batches[0].entries.length, packet.drafts.length, "batch should include every draft");

  const secondPacket = createVantaTwitterDraftPacket({
    generatedAt: "2026-04-24T14:00:00.000Z",
  });
  appendVantaSocialReviewBatch({
    packet: secondPacket,
    queuePath,
    artifactPaths: {
      jsonPath: resolve(tempRoot, "drafts-2.json"),
      markdownPath: resolve(tempRoot, "drafts-2.md"),
    },
  });

  const approved = markVantaSocialReviewDraft({
    queuePath,
    draftId: packet.drafts[0].id,
    status: "approved",
    note: "Manual review picked this one for editing.",
    markedAt: "2026-04-24T13:35:00.000Z",
  });
  const olderApprovedEntry = approved.batches[0].entries.find((entry) => entry.draftId === packet.drafts[0].id);
  const approvedEntry = approved.batches[1].entries.find((entry) => entry.draftId === packet.drafts[0].id);

  assert.equal(olderApprovedEntry.status, "drafted", "marking by draft id should only target the newest matching batch");
  assert.equal(approvedEntry.status, "approved", "mark command should update draft status");
  assert.equal(approvedEntry.operatorNotes.at(-1).note, "Manual review picked this one for editing.");
  assert.equal(approvedEntry.postedManuallyAt, null, "approved is not the same as posted");

  const posted = markVantaSocialReviewDraft({
    queuePath,
    draftId: packet.drafts[0].id,
    status: "posted-manually",
    note: "Posted from the official account by a human.",
    markedAt: "2026-04-24T13:45:00.000Z",
  });
  const postedEntry = posted.batches[1].entries.find((entry) => entry.draftId === packet.drafts[0].id);

  assert.equal(postedEntry.status, "posted-manually", "posted-manually status should be recorded");
  assert.equal(postedEntry.postedManuallyAt, "2026-04-24T13:45:00.000Z", "posted status must carry a manual timestamp");

  assert.throws(
    () =>
      markVantaSocialReviewDraft({
        queuePath,
        draftId: packet.drafts[1].id,
        status: "posted-automatically",
      }),
    /Unsupported social review status/u,
    "unsupported automation statuses must be rejected",
  );

  const edited = editVantaSocialReviewDraft({
    queuePath,
    draftId: packet.drafts[1].id,
    text: "Private settlement needs careful defaults: typed approvals, clear receipts, and limits people can actually read.",
    note: "Human edit tightened the sentence.",
    editedAt: "2026-04-24T13:50:00.000Z",
  });
  const olderEditedEntry = edited.batches[0].entries.find((entry) => entry.draftId === packet.drafts[1].id);
  const editedEntry = edited.batches[1].entries.find((entry) => entry.draftId === packet.drafts[1].id);

  assert.notEqual(olderEditedEntry.text, editedEntry.text, "editing by draft id should only target the newest matching batch");
  assert.equal(editedEntry.status, "drafted", "editing should reset status to drafted");
  assert.equal(
    editedEntry.text,
    "Private settlement needs careful defaults: typed approvals, clear receipts, and limits people can actually read.",
    "editing should replace review text",
  );
  assert.equal(editedEntry.operatorNotes.at(-1).status, "edited", "editing should record an edit note");

  assert.throws(
    () =>
      editVantaSocialReviewDraft({
        queuePath,
        draftId: packet.drafts[2].id,
        text: "Vanta is fully anonymous and production ready.",
      }),
    /Edited draft failed validation/u,
    "unsafe edits must be rejected before persistence",
  );

  const approvedAgain = markVantaSocialReviewDraft({
    queuePath,
    draftId: packet.drafts[1].id,
    status: "approved",
    note: "Approved edited copy.",
    markedAt: "2026-04-24T13:55:00.000Z",
  });
  const approvedExport = formatApprovedVantaSocialDrafts(approvedAgain);

  assert.ok(approvedExport.includes("# Approved Vanta Social Drafts"), "approved export should have a title");
  assert.ok(approvedExport.includes("Copy/paste text:"), "approved export should be copy/paste-friendly");
  assert.ok(approvedExport.includes(packet.drafts[1].id), "approved export should include approved draft ids");
  assert.ok(!approvedExport.includes(packet.drafts[2].id), "approved export should exclude unapproved drafts");

  const nextSteps = formatVantaSocialNextSteps(approvedAgain, {
    queuePath,
    approvedExportPath: resolve(tempRoot, "approved-twitter-drafts.md"),
  });

  assert.ok(nextSteps.includes("# Vanta Social Next Step"), "next command should have a clear title");
  assert.ok(nextSteps.includes("Latest draft batch"), "next command should show the latest draft batch");
  assert.ok(nextSteps.includes("Recommended draft"), "next command should recommend a draft");
  assert.ok(nextSteps.includes("npm run social:twitter-mark --"), "next command should print the approve command");
  assert.ok(nextSteps.includes("npm run social:twitter-export-approved"), "next command should print the export command");
  assert.ok(nextSteps.includes("approved-twitter-drafts.md"), "next command should show the stable approved export file");

  const feedback = recordVantaSocialReviewFeedback({
    queuePath,
    draftId: packet.drafts[1].id,
    rating: 5,
    note: "This sounds closest to Vanta: concrete, calm, and not overclaiming.",
    preference: "more-like-this",
    recordedAt: "2026-04-24T14:05:00.000Z",
  });
  const feedbackEntry = feedback.batches[1].entries.find((entry) => entry.draftId === packet.drafts[1].id);

  assert.equal(feedbackEntry.feedback.at(-1).rating, 5, "feedback should record the rating");
  assert.equal(feedbackEntry.feedback.at(-1).preference, "more-like-this", "feedback should record preference direction");

  assert.throws(
    () =>
      recordVantaSocialReviewFeedback({
        queuePath,
        draftId: packet.drafts[2].id,
        rating: 6,
        note: "Out of range.",
      }),
    /rating must be an integer from 1 to 5/u,
    "feedback ratings must be bounded",
  );

  const feedbackSummary = formatVantaSocialFeedbackSummary(feedback);
  assert.ok(feedbackSummary.includes("# Vanta Social Feedback Summary"), "feedback summary should have a title");
  assert.ok(feedbackSummary.includes("more-like-this"), "feedback summary should include preference direction");
  assert.ok(feedbackSummary.includes("5/5"), "feedback summary should include ratings");

  recordVantaSocialReviewFeedback({
    queuePath,
    draftId: packet.drafts[3].id,
    rating: 2,
    note: "Too abstract; make the merchant outcome sharper.",
    preference: "less-like-this",
    recordedAt: "2026-04-24T14:10:00.000Z",
  });

  const preferenceQueue = readVantaSocialReviewQueue(queuePath);
  const preferenceProfile = formatVantaSocialPreferenceProfile(preferenceQueue);

  assert.ok(preferenceProfile.includes("# Vanta Social Preference Profile"), "preference profile should have a title");
  assert.ok(preferenceProfile.includes("Top-rated archetypes"), "profile should include top-rated archetypes");
  assert.ok(preferenceProfile.includes("Low-rated archetypes"), "profile should include low-rated archetypes");
  assert.ok(preferenceProfile.includes("more-like-this"), "profile should include positive preference notes");
  assert.ok(preferenceProfile.includes("less-like-this"), "profile should include negative preference notes");
  assert.ok(preferenceProfile.includes("Suggested next draft angles"), "profile should suggest next angles");

  const printed = formatVantaSocialReviewQueue(feedback);
  assert.ok(printed.includes("Vanta Social Review Queue"), "review output should have a title");
  assert.ok(printed.includes(packet.drafts[0].id), "review output should include draft ids");
  assert.ok(printed.includes("posted-manually"), "review output should include statuses");

  const persisted = JSON.parse(readFileSync(queuePath, "utf8"));
  assert.equal(persisted.batches.length, 2, "queue should persist every batch to disk");

  console.log("Vanta social review queue check: PASS");
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
