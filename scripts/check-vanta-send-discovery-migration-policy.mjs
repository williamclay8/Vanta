import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaSendMainnetProductionStatus } from "../src/readiness/sendMainnetProductionStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const shieldState = readFileSync(resolve(repoRoot, "src/solana/vantaShieldState.ts"), "utf8");
const sendPage = readFileSync(resolve(repoRoot, "src/pages/SendPage.tsx"), "utf8");
const status = createVantaSendMainnetProductionStatus();
const trustPacket = JSON.parse(
  execFileSync("node", ["scripts/print-vanta-protocol-trust-packet.mjs", "--action=send", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

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
    shieldState.includes("parseSendChangeDiscoveryMemo") &&
    shieldState.includes("VantaSendDiscoveryHandoff") &&
    shieldState.includes("local-encrypted-view-tag-body-hash-handoff-not-production-recipient-discovery"),
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
assert.equal(
  status.sendDiscoveryHandoff?.localViewTagBodyHashHandoffCovered,
  true,
  "Send status must expose the local encrypted view-tag/body-hash handoff coverage.",
);
assert.equal(
  status.sendDiscoveryHandoff?.deployedMemoIndexerHandoffCovered,
  false,
  "Send status must keep deployed memo/indexer handoff blocked.",
);
assert.equal(
  status.sendDiscoveryHandoff?.legacyV1SendHistoryMigrationScoped,
  false,
  "Send status must keep the historical v1 migration/scope blocker explicit.",
);
assert(
  trustPacket.sendDiscoveryHandoff?.blockerIds?.includes(
    "send-memo-indexer-body-hash-handoff-not-deployed",
  ) &&
    trustPacket.sendDiscoveryHandoff?.blockerIds?.includes(
      "legacy-v1-send-history-migration-not-scoped",
    ) &&
    trustPacket.remainingBlockers.includes("send-memo-indexer-body-hash-handoff-not-deployed") &&
    trustPacket.remainingBlockers.includes("legacy-v1-send-history-migration-not-scoped"),
  "Send trust packet must expose exact discovery/migration blocker ids.",
);
assert.equal(
  trustPacket.sendDiscoveryHandoff?.productionReady,
  false,
  "Send trust packet must keep discovery handoff productionReady false.",
);
assert(
  trustPacket.verificationCommands.includes("npm run send:discovery-indexer-handoff-check"),
  "Send trust packet must cite the Send discovery indexer handoff guard.",
);

console.log("send discovery/migration policy guard: PASS");
