import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { getDefaultVantaSocialApprovedExportPath } from "../src/social/vantaSocialReviewQueue.mjs";

const approvedExportPath = getDefaultVantaSocialApprovedExportPath();

if (!existsSync(approvedExportPath)) {
  console.error(`Approved export file does not exist yet: ${approvedExportPath}`);
  console.error("Run: npm run social:twitter-export-approved");
  process.exit(1);
}

const result = spawnSync("open", [approvedExportPath], {
  encoding: "utf8",
});

if (result.status !== 0) {
  console.error(result.stderr || `Unable to open ${approvedExportPath}`);
  process.exit(result.status ?? 1);
}

console.log(`Opened approved export file: ${approvedExportPath}`);
