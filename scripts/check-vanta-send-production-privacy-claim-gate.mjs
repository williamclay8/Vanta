import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runJson(command, args) {
  return JSON.parse(
    execFileSync(command, args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    }),
  );
}

const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const scripts = packageJson.scripts ?? {};
const requiredCommands = [
  "private-core:send-check",
  "private-core:send-operator-no-witness-check",
  "private-core:send-proof-artifact-consistency-check",
  "private-core:send-operator-redaction-check",
  "private-core:send-nullifier-replay-no-witness-check",
  "private-pool-v2:send-proof-request-check",
  "private-pool-v2:send-circuit-check",
  "private-pool-v2:public-input-hash-alignment-check",
  "send:production-privacy-claim-gate",
  "mainnet:send-live-evidence-contract-check",
  "programmatic-privacy:contract-check",
];

for (const command of requiredCommands) {
  assert(typeof scripts[command] === "string", `Missing Send production privacy guard ${command}.`);
  assert(
    scripts["send:verify"]?.includes(`npm run ${command}`),
    `send:verify does not include ${command}.`,
  );
}

const trustPacket = runJson("node", [
  "scripts/print-vanta-protocol-trust-packet.mjs",
  "--action=send",
  "--json",
]);
assert(trustPacket.action === "send", "Expected Send trust packet.");
assert(
  trustPacket.claimBoundary?.fullyPrivate === false,
  "Send trust packet must not claim fully private.",
);
assert(
  trustPacket.claimBoundary?.productionReady === false,
  "Send trust packet must not claim production ready.",
);
assert(
  trustPacket.claimBoundary?.privacyTier ===
    "ledger-gated-no-witness-proof-artifact-beta-not-production-private",
  "Send trust packet must use the repo-checked no-witness beta privacy tier.",
);
assert(
  trustPacket.operatorVisibleFields?.some((field) => field.includes("repo-checked-no-witness-lane")),
  "Send trust packet must expose the repo-checked no-witness operator boundary.",
);

const status = runJson("node", [
  "scripts/print-vanta-send-mainnet-production-status.mjs",
  "--json",
]);
assert(status.status === "blocked", "Send production status must remain blocked without live/external gates.");
assert(status.privacyClaimAllowed === false, "Send privacy claims must remain locked.");
assert(status.productionReady === false, "Send production readiness must remain false.");
assert(
  Array.isArray(status.requiredBeforeProduction) &&
    status.requiredBeforeProduction.some((entry) => entry.includes("live")),
  "Send production status must still name live evidence requirements.",
);

const serialized = JSON.stringify({ status, trustPacket }).toLowerCase();
for (const forbiddenClaim of ["fully private send", "production-private send", "send is production-ready"]) {
  assert(
    !serialized.includes(forbiddenClaim),
    `Send surfaces contain forbidden unverified claim: ${forbiddenClaim}`,
  );
}

console.log("send production privacy claim gate: PASS");
