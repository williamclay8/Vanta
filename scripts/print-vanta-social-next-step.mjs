import {
  formatVantaSocialNextSteps,
  getDefaultVantaSocialReviewQueuePath,
  readVantaSocialReviewQueue,
} from "../src/social/vantaSocialReviewQueue.mjs";

const queuePath = getDefaultVantaSocialReviewQueuePath();
const queue = readVantaSocialReviewQueue(queuePath);

console.log(formatVantaSocialNextSteps(queue, { queuePath }));
