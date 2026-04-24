import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  formatApprovedVantaSocialDrafts,
  getDefaultVantaSocialApprovedExportPath,
  getDefaultVantaSocialReviewQueuePath,
  readVantaSocialReviewQueue,
} from "../src/social/vantaSocialReviewQueue.mjs";

const queue = readVantaSocialReviewQueue(getDefaultVantaSocialReviewQueuePath());
const approvedExport = formatApprovedVantaSocialDrafts(queue);
const approvedExportPath = getDefaultVantaSocialApprovedExportPath();

mkdirSync(dirname(approvedExportPath), { recursive: true });
writeFileSync(approvedExportPath, approvedExport);

console.log(approvedExport);
console.log(`Approved export file: ${approvedExportPath}`);
