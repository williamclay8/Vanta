import {
  formatVantaSocialReviewQueue,
  getDefaultVantaSocialReviewQueuePath,
  readVantaSocialReviewQueue,
} from "../src/social/vantaSocialReviewQueue.mjs";

const queuePath = getDefaultVantaSocialReviewQueuePath();
const queue = readVantaSocialReviewQueue(queuePath);

console.log(formatVantaSocialReviewQueue(queue));
console.log(`Queue path: ${queuePath}`);
