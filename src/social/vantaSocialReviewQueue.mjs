import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { validateVantaTwitterDraft } from "./twitterDraftOperator.mjs";

export const VANTA_SOCIAL_REVIEW_QUEUE_KIND = "vanta-social-review-queue-v1";

export const VANTA_SOCIAL_REVIEW_STATUSES = [
  "drafted",
  "approved",
  "rejected",
  "posted-manually",
];

export const VANTA_SOCIAL_FEEDBACK_PREFERENCES = [
  "more-like-this",
  "less-like-this",
  "neutral",
];

export function getDefaultVantaSocialReviewQueuePath() {
  return resolve(import.meta.dirname, "../..", ".tmp/social-drafts/review-queue.json");
}

export function getDefaultVantaSocialApprovedExportPath() {
  return resolve(import.meta.dirname, "../..", ".tmp/social-drafts/approved-twitter-drafts.md");
}

export function readVantaSocialReviewQueue(queuePath = getDefaultVantaSocialReviewQueuePath()) {
  if (!existsSync(queuePath)) {
    return {
      kind: VANTA_SOCIAL_REVIEW_QUEUE_KIND,
      batches: [],
    };
  }

  const parsed = JSON.parse(readFileSync(queuePath, "utf8"));

  if (parsed.kind !== VANTA_SOCIAL_REVIEW_QUEUE_KIND || !Array.isArray(parsed.batches)) {
    throw new Error(`Unsupported Vanta social review queue at ${queuePath}`);
  }

  return parsed;
}

function writeVantaSocialReviewQueue(queuePath, queue) {
  mkdirSync(dirname(queuePath), { recursive: true });
  writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
}

function findTargetBatchIndex(queue, draftId, batchId) {
  if (batchId) {
    const index = queue.batches.findIndex(
      (batch) => batch.batchId === batchId && batch.entries.some((entry) => entry.draftId === draftId),
    );
    return index;
  }

  for (let index = queue.batches.length - 1; index >= 0; index -= 1) {
    if (queue.batches[index].entries.some((entry) => entry.draftId === draftId)) {
      return index;
    }
  }

  return -1;
}

export function createVantaSocialReviewEntries(packet) {
  return packet.drafts.map((draft) => ({
    draftId: draft.id,
    angle: draft.angle,
    text: draft.text,
    status: "drafted",
    manualPostingOnly: true,
    postedManuallyAt: null,
    voice: draft.voice,
    sourceFacts: draft.sourceFacts,
    manualChecklist: draft.manualChecklist,
    operatorNotes: [],
    feedback: [],
  }));
}

export function appendVantaSocialReviewBatch({
  packet,
  queuePath = getDefaultVantaSocialReviewQueuePath(),
  artifactPaths = {},
}) {
  const queue = readVantaSocialReviewQueue(queuePath);
  const nextQueue = {
    ...queue,
    batches: [
      ...queue.batches,
      {
        batchId: `social-batch-${packet.generatedAt.replace(/[^0-9A-Za-z]+/gu, "-").replace(/-$/u, "")}`,
        generatedAt: packet.generatedAt,
        mode: packet.mode,
        manualPostingOnly: true,
        voiceVersion: packet.voiceVersion,
        contextKind: packet.contextKind,
        artifactPaths,
        entries: createVantaSocialReviewEntries(packet),
      },
    ],
  };

  writeVantaSocialReviewQueue(queuePath, nextQueue);
  return nextQueue;
}

export function markVantaSocialReviewDraft({
  queuePath = getDefaultVantaSocialReviewQueuePath(),
  batchId,
  draftId,
  status,
  note = "",
  markedAt = new Date().toISOString(),
}) {
  if (!VANTA_SOCIAL_REVIEW_STATUSES.includes(status)) {
    throw new Error(`Unsupported social review status: ${status}`);
  }

  const queue = readVantaSocialReviewQueue(queuePath);
  const targetBatchIndex = findTargetBatchIndex(queue, draftId, batchId);
  const nextQueue = {
    ...queue,
    batches: queue.batches.map((batch, batchIndex) => ({
      ...batch,
      entries: batch.entries.map((entry) => {
        if (batchIndex !== targetBatchIndex) {
          return entry;
        }

        if (entry.draftId !== draftId) {
          return entry;
        }

        return {
          ...entry,
          status,
          postedManuallyAt: status === "posted-manually" ? markedAt : entry.postedManuallyAt,
          operatorNotes: note
            ? [
                ...entry.operatorNotes,
                {
                  markedAt,
                  status,
                  note,
                },
              ]
            : entry.operatorNotes,
        };
      }),
    })),
  };

  if (targetBatchIndex === -1) {
    throw new Error(`No Vanta social review draft found for id: ${draftId}`);
  }

  writeVantaSocialReviewQueue(queuePath, nextQueue);
  return nextQueue;
}

export function editVantaSocialReviewDraft({
  queuePath = getDefaultVantaSocialReviewQueuePath(),
  batchId,
  draftId,
  text,
  note = "Edited by human.",
  editedAt = new Date().toISOString(),
}) {
  const queue = readVantaSocialReviewQueue(queuePath);
  const targetBatchIndex = findTargetBatchIndex(queue, draftId, batchId);
  let validationFailures = [];
  const nextQueue = {
    ...queue,
    batches: queue.batches.map((batch, batchIndex) => ({
      ...batch,
      entries: batch.entries.map((entry) => {
        if (batchIndex !== targetBatchIndex) {
          return entry;
        }

        if (entry.draftId !== draftId) {
          return entry;
        }

        const candidate = {
          ...entry,
          text,
        };
        const validation = validateVantaTwitterDraft(candidate);

        if (!validation.ok) {
          validationFailures = validation.failures;
          return entry;
        }

        return {
          ...entry,
          text,
          status: "drafted",
          postedManuallyAt: null,
          operatorNotes: [
            ...entry.operatorNotes,
            {
              markedAt: editedAt,
              status: "edited",
              note,
            },
          ],
        };
      }),
    })),
  };

  if (targetBatchIndex === -1) {
    throw new Error(`No Vanta social review draft found for id: ${draftId}`);
  }

  if (validationFailures.length > 0) {
    throw new Error(`Edited draft failed validation: ${validationFailures.join("; ")}`);
  }

  writeVantaSocialReviewQueue(queuePath, nextQueue);
  return nextQueue;
}

export function recordVantaSocialReviewFeedback({
  queuePath = getDefaultVantaSocialReviewQueuePath(),
  batchId,
  draftId,
  rating,
  note,
  preference = "neutral",
  recordedAt = new Date().toISOString(),
}) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("feedback rating must be an integer from 1 to 5");
  }

  if (!VANTA_SOCIAL_FEEDBACK_PREFERENCES.includes(preference)) {
    throw new Error(`Unsupported social feedback preference: ${preference}`);
  }

  if (!note || String(note).trim().length === 0) {
    throw new Error("feedback note is required");
  }

  const queue = readVantaSocialReviewQueue(queuePath);
  const targetBatchIndex = findTargetBatchIndex(queue, draftId, batchId);
  const nextQueue = {
    ...queue,
    batches: queue.batches.map((batch, batchIndex) => ({
      ...batch,
      entries: batch.entries.map((entry) => {
        if (batchIndex !== targetBatchIndex || entry.draftId !== draftId) {
          return entry;
        }

        return {
          ...entry,
          feedback: [
            ...(entry.feedback ?? []),
            {
              recordedAt,
              rating,
              preference,
              note,
            },
          ],
        };
      }),
    })),
  };

  if (targetBatchIndex === -1) {
    throw new Error(`No Vanta social review draft found for id: ${draftId}`);
  }

  writeVantaSocialReviewQueue(queuePath, nextQueue);
  return nextQueue;
}

export function formatVantaSocialReviewQueue(queue) {
  const lines = ["# Vanta Social Review Queue", ""];

  if (queue.batches.length === 0) {
    lines.push("No draft batches queued for manual review.");
    return `${lines.join("\n")}\n`;
  }

  for (const batch of queue.batches.toReversed()) {
    lines.push(`## ${batch.batchId}`);
    lines.push(`Generated: ${batch.generatedAt}`);
    lines.push(`Mode: ${batch.mode}`);
    lines.push(`Manual posting only: ${batch.manualPostingOnly}`);
    lines.push("");

    for (const entry of batch.entries) {
      lines.push(`- ${entry.draftId} [${entry.status}]`);
      lines.push(`  Voice: ${entry.voice.archetype} (${entry.voice.version})`);
      lines.push(`  Text: ${entry.text}`);
      lines.push(`  Sources: ${entry.sourceFacts.map((fact) => fact.id).join(", ")}`);
      if (entry.operatorNotes.length > 0) {
        lines.push(`  Latest note: ${entry.operatorNotes.at(-1).note}`);
      }
      if ((entry.feedback ?? []).length > 0) {
        const latestFeedback = entry.feedback.at(-1);
        lines.push(`  Latest feedback: ${latestFeedback.rating}/5 ${latestFeedback.preference} - ${latestFeedback.note}`);
      }
    }

    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

export function formatVantaSocialFeedbackSummary(queue) {
  const feedbackRows = queue.batches.flatMap((batch) =>
    batch.entries.flatMap((entry) =>
      (entry.feedback ?? []).map((feedback) => ({
        ...feedback,
        batchId: batch.batchId,
        draftId: entry.draftId,
        archetype: entry.voice.archetype,
        text: entry.text,
      })),
    ),
  );
  const lines = ["# Vanta Social Feedback Summary", ""];

  if (feedbackRows.length === 0) {
    lines.push("No social draft feedback has been recorded yet.");
    return `${lines.join("\n")}\n`;
  }

  const average = feedbackRows.reduce((sum, row) => sum + row.rating, 0) / feedbackRows.length;
  lines.push(`Feedback count: ${feedbackRows.length}`);
  lines.push(`Average rating: ${average.toFixed(2)}/5`);
  lines.push("");

  for (const row of feedbackRows.toReversed()) {
    lines.push(`## ${row.draftId}`);
    lines.push(`Batch: ${row.batchId}`);
    lines.push(`Voice: ${row.archetype}`);
    lines.push(`Rating: ${row.rating}/5`);
    lines.push(`Preference: ${row.preference}`);
    lines.push(`Note: ${row.note}`);
    lines.push(`Text: ${row.text}`);
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function collectFeedbackRows(queue) {
  return queue.batches.flatMap((batch) =>
    batch.entries.flatMap((entry) =>
      (entry.feedback ?? []).map((feedback) => ({
        ...feedback,
        batchId: batch.batchId,
        draftId: entry.draftId,
        archetype: entry.voice.archetype,
        text: entry.text,
      })),
    ),
  );
}

function summarizeArchetypes(rows, predicate) {
  const stats = new Map();

  for (const row of rows.filter(predicate)) {
    const current = stats.get(row.archetype) ?? {
      archetype: row.archetype,
      count: 0,
      ratingTotal: 0,
    };

    current.count += 1;
    current.ratingTotal += row.rating;
    stats.set(row.archetype, current);
  }

  return Array.from(stats.values())
    .map((stat) => ({
      ...stat,
      averageRating: stat.ratingTotal / stat.count,
    }))
    .sort((left, right) => right.averageRating - left.averageRating || right.count - left.count);
}

export function formatVantaSocialPreferenceProfile(queue) {
  const rows = collectFeedbackRows(queue);
  const lines = ["# Vanta Social Preference Profile", ""];

  if (rows.length === 0) {
    lines.push("No social draft feedback is available yet.");
    lines.push("");
    lines.push("Suggested next draft angles:");
    lines.push("- Generate one batch, manually review it, and record at least one rating.");
    return `${lines.join("\n").trim()}\n`;
  }

  const topArchetypes = summarizeArchetypes(rows, (row) => row.rating >= 4 || row.preference === "more-like-this");
  const lowArchetypes = summarizeArchetypes(rows, (row) => row.rating <= 2 || row.preference === "less-like-this").toReversed();
  const moreRows = rows.filter((row) => row.preference === "more-like-this");
  const lessRows = rows.filter((row) => row.preference === "less-like-this");

  lines.push(`Feedback count: ${rows.length}`);
  lines.push(`Average rating: ${(rows.reduce((sum, row) => sum + row.rating, 0) / rows.length).toFixed(2)}/5`);
  lines.push("");
  lines.push("## Top-rated archetypes");
  if (topArchetypes.length === 0) {
    lines.push("- No positive archetype signal yet.");
  } else {
    lines.push(
      ...topArchetypes.map(
        (stat) => `- ${stat.archetype}: ${stat.averageRating.toFixed(2)}/5 across ${stat.count} feedback item(s)`,
      ),
    );
  }
  lines.push("");
  lines.push("## Low-rated archetypes");
  if (lowArchetypes.length === 0) {
    lines.push("- No negative archetype signal yet.");
  } else {
    lines.push(
      ...lowArchetypes.map(
        (stat) => `- ${stat.archetype}: ${stat.averageRating.toFixed(2)}/5 across ${stat.count} feedback item(s)`,
      ),
    );
  }
  lines.push("");
  lines.push("## Preference notes");
  lines.push("more-like-this:");
  lines.push(...(moreRows.length > 0 ? moreRows.map((row) => `- ${row.note}`) : ["- No positive preference notes yet."]));
  lines.push("");
  lines.push("less-like-this:");
  lines.push(...(lessRows.length > 0 ? lessRows.map((row) => `- ${row.note}`) : ["- No negative preference notes yet."]));
  lines.push("");
  lines.push("## Suggested voice-rule adjustments");
  if (moreRows.length > 0) {
    lines.push("- Preserve the language patterns called out in more-like-this notes.");
  }
  if (lessRows.length > 0) {
    lines.push("- Avoid the abstractions or weak outcomes called out in less-like-this notes.");
  }
  if (moreRows.length === 0 && lessRows.length === 0) {
    lines.push("- Record directional feedback before changing voice rules.");
  }
  lines.push("");
  lines.push("## Suggested next draft angles");
  if (topArchetypes.length > 0) {
    lines.push(`- Generate more ${topArchetypes[0].archetype} drafts using concrete Vanta source facts.`);
  }
  if (lessRows.length > 0) {
    lines.push("- Rewrite low-rated angles with sharper operator or merchant outcomes.");
  }
  lines.push("- Keep every candidate manual-posting-only and source-backed.");

  return `${lines.join("\n").trim()}\n`;
}

function chooseRecommendedDraft(batch) {
  const approved = batch.entries.find((entry) => entry.status === "approved");
  if (approved) {
    return approved;
  }

  return (
    batch.entries.find((entry) => entry.voice.archetype === "agent-permission critique") ??
    batch.entries.find((entry) => entry.status === "drafted") ??
    batch.entries[0]
  );
}

export function formatVantaSocialNextSteps(
  queue,
  {
    queuePath = getDefaultVantaSocialReviewQueuePath(),
    approvedExportPath = getDefaultVantaSocialApprovedExportPath(),
  } = {},
) {
  const lines = ["# Vanta Social Next Step", ""];

  if (queue.batches.length === 0) {
    lines.push("No draft batches exist yet.");
    lines.push("");
    lines.push("Run:");
    lines.push("npm run social:twitter-draft");
    return `${lines.join("\n").trim()}\n`;
  }

  const latestBatch = queue.batches.at(-1);
  const recommended = chooseRecommendedDraft(latestBatch);

  lines.push(`Latest draft batch: ${latestBatch.batchId}`);
  lines.push(`Generated: ${latestBatch.generatedAt}`);
  lines.push(`Queue: ${queuePath}`);
  if (latestBatch.artifactPaths?.markdownPath) {
    lines.push(`Draft file: ${latestBatch.artifactPaths.markdownPath}`);
  }
  lines.push(`Approved export file: ${approvedExportPath}`);
  lines.push("");
  lines.push("Draft IDs:");
  for (const entry of latestBatch.entries) {
    lines.push(`- ${entry.draftId} [${entry.status}] ${entry.voice.archetype}`);
  }
  lines.push("");
  lines.push("Recommended draft:");
  lines.push(`${recommended.draftId} - ${recommended.voice.archetype}`);
  lines.push(recommended.text);
  lines.push("");
  lines.push("Approve it:");
  lines.push(
    `npm run social:twitter-mark -- --draft-id ${recommended.draftId} --status approved --note "Good to post manually."`,
  );
  lines.push("");
  lines.push("Export approved drafts:");
  lines.push("npm run social:twitter-export-approved");
  lines.push("");
  lines.push("Manual posting reminder:");
  lines.push("Open the approved export file, copy the text, and post manually from the official account.");

  return `${lines.join("\n").trim()}\n`;
}

export function formatApprovedVantaSocialDrafts(queue) {
  const approvedEntries = queue.batches.flatMap((batch) =>
    batch.entries
      .filter((entry) => entry.status === "approved")
      .map((entry) => ({
        ...entry,
        batchId: batch.batchId,
        generatedAt: batch.generatedAt,
      })),
  );
  const lines = ["# Approved Vanta Social Drafts", ""];

  if (approvedEntries.length === 0) {
    lines.push("No approved drafts are ready for manual posting.");
    return `${lines.join("\n")}\n`;
  }

  for (const entry of approvedEntries) {
    lines.push(`## ${entry.draftId}`);
    lines.push(`Batch: ${entry.batchId}`);
    lines.push(`Voice: ${entry.voice.archetype} (${entry.voice.version})`);
    lines.push("");
    lines.push("Copy/paste text:");
    lines.push(entry.text);
    lines.push("");
    lines.push("Manual checklist:");
    lines.push(...entry.manualChecklist.map((item) => `- ${item}`));
    lines.push("");
    lines.push("Source facts:");
    lines.push(...entry.sourceFacts.map((fact) => `- ${fact.summary} (${fact.source})`));
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}
