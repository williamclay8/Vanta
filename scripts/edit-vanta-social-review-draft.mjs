import {
  editVantaSocialReviewDraft,
  getDefaultVantaSocialReviewQueuePath,
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
const text = readArg("--text");
const note = readArg("--note") ?? "Edited by human.";

if (!draftId || !text) {
  console.error('Usage: npm run social:twitter-edit -- --draft-id <id> --text "..." [--note <note>]');
  process.exit(1);
}

try {
  editVantaSocialReviewDraft({
    queuePath: getDefaultVantaSocialReviewQueuePath(),
    batchId,
    draftId,
    text,
    note,
  });
  console.log(`Edited ${draftId}; status reset to drafted.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
