import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const status = JSON.parse(
  execFileSync("node", ["scripts/print-vanta-send-mainnet-production-status.mjs", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  }),
);
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert(
  packageJson.scripts?.["mainnet:send-live-evidence-contract-check"] ===
    "node scripts/check-vanta-send-live-evidence-contract.mjs",
  "Send live evidence contract command is not wired.",
);

if (status.productionReady || status.privacyClaimAllowed) {
  const requiredRefs = [
    "sendNoWitnessOperatorBoundary",
    "sendProofArtifactConsistency",
    "sendOperatorRedaction",
    "sendNullifierReplayNoWitness",
    "liveSendSettlementEvidence",
    "publicTranscriptReview",
    "thirdPartyAudit",
  ];
  for (const ref of requiredRefs) {
    assert(
      typeof status.evidenceRefs?.[ref] === "string" && status.evidenceRefs[ref].length > 0,
      `Production-private Send claim is missing live/external evidence ref ${ref}.`,
    );
  }
} else {
  assert(
    Array.isArray(status.blockers) &&
      status.blockers.includes("no-reviewed-live-mainnet-send-settlement-evidence"),
    "Blocked Send status must preserve the missing live settlement evidence blocker.",
  );
}

console.log("send live evidence contract: PASS");
