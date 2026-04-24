import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createVantaTwitterDraftPacket,
  formatVantaTwitterDraftMarkdown,
} from "../src/social/twitterDraftOperator.mjs";
import { loadVantaSocialContext } from "../src/social/vantaSocialContext.mjs";
import {
  appendVantaSocialReviewBatch,
  getDefaultVantaSocialReviewQueuePath,
} from "../src/social/vantaSocialReviewQueue.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const outputDir = resolve(repoRoot, ".tmp/social-drafts");
const generatedAt = new Date().toISOString();
const fileStamp = generatedAt.replaceAll(":", "-").replace(".", "-");

mkdirSync(outputDir, { recursive: true });

const socialContext = loadVantaSocialContext({ loadedAt: generatedAt });
const packet = createVantaTwitterDraftPacket({ generatedAt, socialContext });
const jsonPath = resolve(outputDir, `${fileStamp}-vanta-twitter-drafts.json`);
const markdownPath = resolve(outputDir, `${fileStamp}-vanta-twitter-drafts.md`);

writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);
writeFileSync(markdownPath, formatVantaTwitterDraftMarkdown(packet));
appendVantaSocialReviewBatch({
  packet,
  artifactPaths: {
    jsonPath,
    markdownPath,
  },
});

console.log("Vanta social Twitter draft operator wrote local manual-posting artifacts:");
console.log(`- ${jsonPath}`);
console.log(`- ${markdownPath}`);
console.log(`- ${getDefaultVantaSocialReviewQueuePath()}`);
