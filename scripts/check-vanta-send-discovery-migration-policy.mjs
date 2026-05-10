import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaSendMainnetProductionStatus } from "../src/readiness/sendMainnetProductionStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const shieldState = readFileSync(resolve(repoRoot, "src/solana/vantaShieldState.ts"), "utf8");
const sendPage = readFileSync(resolve(repoRoot, "src/pages/SendPage.tsx"), "utf8");
const status = createVantaSendMainnetProductionStatus();

assert.equal(status.status, "blocked", "Send must remain blocked while recipient discovery is unfinished.");
assert.equal(status.privacyClaimAllowed, false, "Send privacy claims must remain locked.");
assert(
  status.blockers.includes("send-memo-indexer-body-hash-handoff-not-deployed"),
  "Send status must keep the deployed memo/indexer body-hash handoff blocker.",
);
assert(
  status.blockers.includes("legacy-v1-send-history-migration-not-scoped"),
  "Send status must keep the historical v1 migration/scope blocker.",
);
assert(
  shieldState.includes("createPreparedSendDualAeadMemo") &&
    shieldState.includes("parseSendRecipientDiscoveryMemo") &&
    shieldState.includes("parseSendChangeDiscoveryMemo"),
  "Send must preserve the dual-AEAD discovery scaffold and discovery-leg parsers.",
);
assert(
  shieldState.includes("VANTA_SEND_MEMO_PREFIX_V2") &&
    shieldState.includes("extractMemoPayload(memo, VANTA_SEND_MEMO_PREFIX)"),
  "Send must keep fresh v2 AEAD while limiting v1 plaintext to historical parser fallback.",
);
assert(
  sendPage.includes("External Vanta Send v2 requires recipient viewing-key exchange") &&
    sendPage.includes("createPreparedSendDualAeadMemo("),
  "Send page must stay fail-closed for external recipients and preserve dual-AEAD hash binding.",
);

console.log("send discovery/migration policy guard: PASS");
