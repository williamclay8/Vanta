import {
  formatVantaSocialFeedbackSummary,
  getDefaultVantaSocialReviewQueuePath,
  readVantaSocialReviewQueue,
} from "../src/social/vantaSocialReviewQueue.mjs";

const queue = readVantaSocialReviewQueue(getDefaultVantaSocialReviewQueuePath());

console.log(formatVantaSocialFeedbackSummary(queue));
