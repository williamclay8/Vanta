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
  !status.blockers.includes("legacy-v1-send-history-migration-not-scoped"),
  "Send status must not keep the historical v1 migration blocker once fresh-v2-only claim scope is recorded.",
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
    shieldState.includes("extractMemoPayload(memo, VANTA_SEND_MEMO_PREFIX)") &&
    shieldState.includes("getVantaSendHistoryPrivacyScopePolicy") &&
    shieldState.includes("legacy-v1-plaintext-history") &&
    shieldState.includes("productionPrivacyScopeEligible"),
  "Send must keep fresh v2 AEAD while marking v1 plaintext as historical and outside production privacy scope.",
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
  true,
  "Send status must record the fresh-v2-only historical v1 scope boundary.",
);
assert.equal(
  status.sendDiscoveryHandoff?.freshV2OnlyClaimScoped,
  true,
  "Send status must explicitly scope production claims to fresh v2 Send history.",
);
assert.equal(
  status.sendDiscoveryHandoff?.legacyHistoryScope?.migrated,
  false,
  "Send status must not claim legacy v1 history was migrated.",
);
assert.equal(
  status.sendDiscoveryHandoff?.legacyHistoryScope?.legacyV1EligibleForProductionPrivacyClaims,
  false,
  "Legacy v1 plaintext Send history must not be eligible for production privacy claims.",
);
assert(
  trustPacket.sendDiscoveryHandoff?.blockerIds?.includes(
    "send-memo-indexer-body-hash-handoff-not-deployed",
  ) &&
    !trustPacket.sendDiscoveryHandoff?.blockerIds?.includes(
      "legacy-v1-send-history-migration-not-scoped",
    ) &&
    trustPacket.remainingBlockers.includes("send-memo-indexer-body-hash-handoff-not-deployed") &&
    !trustPacket.remainingBlockers.includes("legacy-v1-send-history-migration-not-scoped"),
  "Send trust packet must expose only the remaining deployed discovery blocker id.",
);
assert.equal(
  trustPacket.sendDiscoveryHandoff?.productionReady,
  false,
  "Send trust packet must keep discovery handoff productionReady false.",
);
assert.equal(
  trustPacket.legacyHistoryScope?.freshV2OnlyClaimScoped,
  true,
  "Send trust packet must expose the fresh-v2-only history scope.",
);
assert.equal(
  trustPacket.legacyHistoryScope?.legacyV1EligibleForProductionPrivacyClaims,
  false,
  "Send trust packet must keep legacy v1 plaintext history outside production privacy scope.",
);
assert(
  trustPacket.verificationCommands.includes("npm run send:discovery-indexer-handoff-check"),
  "Send trust packet must cite the Send discovery indexer handoff guard.",
);

console.log("send discovery/migration policy guard: PASS");
