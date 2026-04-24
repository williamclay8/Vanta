import {
  VANTA_SOCIAL_FEEDBACK_PREFERENCES,
  getDefaultVantaSocialReviewQueuePath,
  recordVantaSocialReviewFeedback,
} from "../src/social/vantaSocialReviewQueue.mjs";

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const draftId = readArg("--draft-id");
const batchId = readArg("--batch-id");
const rating = Number(readArg("--rating"));
const note = readArg("--note");
const preference = readArg("--preference") ?? "neutral";

if (!draftId || !Number.isFinite(rating) || !note) {
  console.error(
    'Usage: npm run social:twitter-feedback -- --draft-id <id> --rating <1-5> --note "..." [--preference more-like-this|less-like-this|neutral]',
  );
  console.error(`Supported preferences: ${VANTA_SOCIAL_FEEDBACK_PREFERENCES.join(", ")}`);
  process.exit(1);
}

try {
  recordVantaSocialReviewFeedback({
    queuePath: getDefaultVantaSocialReviewQueuePath(),
    batchId,
    draftId,
    rating,
    note,
    preference,
  });
  console.log(`Recorded feedback for ${draftId}.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
