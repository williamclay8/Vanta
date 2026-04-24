import {
  formatVantaSocialPreferenceProfile,
  getDefaultVantaSocialReviewQueuePath,
  readVantaSocialReviewQueue,
} from "../src/social/vantaSocialReviewQueue.mjs";

const queue = readVantaSocialReviewQueue(getDefaultVantaSocialReviewQueuePath());

console.log(formatVantaSocialPreferenceProfile(queue));
