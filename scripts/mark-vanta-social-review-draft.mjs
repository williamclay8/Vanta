import {
  VANTA_SOCIAL_REVIEW_STATUSES,
  getDefaultVantaSocialReviewQueuePath,
  markVantaSocialReviewDraft,
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
const status = readArg("--status");
const note = readArg("--note") ?? "";

if (!draftId || !status) {
  console.error("Usage: npm run social:twitter-mark -- --draft-id <id> --status <status> [--note <note>]");
  console.error(`Supported statuses: ${VANTA_SOCIAL_REVIEW_STATUSES.join(", ")}`);
  process.exit(1);
}

try {
  markVantaSocialReviewDraft({
    queuePath: getDefaultVantaSocialReviewQueuePath(),
    batchId,
    draftId,
    status,
    note,
  });
  console.log(`Updated ${draftId} to ${status}.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
