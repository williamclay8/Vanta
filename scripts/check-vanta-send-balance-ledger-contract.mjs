import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function compact(source) {
  return source.replace(/\s+/g, " ");
}

const packageJson = JSON.parse(readRepoFile("package.json"));
const sendPageSource = readRepoFile("src/pages/SendPage.tsx");
const shieldPageSource = readRepoFile("src/pages/ShieldPage.tsx");
const privacyFlowSource = readRepoFile("src/data/context/PrivacyFlowContext.tsx");
const shieldStateSource = readRepoFile("src/solana/vantaShieldState.ts");
const liveSendBridgeSource = readRepoFile("src/zk/liveSendBridge.ts");
const trustPacketSource = readRepoFile("scripts/print-vanta-protocol-trust-packet.mjs");
const sendMainnetStatusSource = readRepoFile("src/readiness/sendMainnetProductionStatus.mjs");
const protocolClientSource = readRepoFile("src/privacy/privatePoolV2ProtocolSettlementClient.ts");

const failures = [];

function requireIncludes(source, phrase, message) {
  if (!source.includes(phrase)) {
    failures.push(message ?? `Missing required marker: ${phrase}`);
  }
}

function requireNotIncludes(source, phrase, message) {
  if (source.includes(phrase)) {
    failures.push(message ?? `Forbidden marker still present: ${phrase}`);
  }
}

if (
  packageJson.scripts["send:balance-ledger-check"] !==
  "node scripts/check-vanta-send-balance-ledger-contract.mjs"
) {
  failures.push("package.json must expose send:balance-ledger-check.");
}

if (!packageJson.scripts["send:verify"]?.includes("npm run send:balance-ledger-check")) {
  failures.push("send:verify must include send:balance-ledger-check.");
}
if (!packageJson.scripts["send:verify"]?.includes("npm run private-pool-v2:protocol-client-check")) {
  failures.push("send:verify must include private-pool-v2:protocol-client-check.");
}

if (!packageJson.scripts["private-core:verify"]?.includes("npm run send:balance-ledger-check")) {
  failures.push("private-core:verify must include send:balance-ledger-check.");
}

for (const marker of [
  "selectedCanonicalSendLedgerNote",
  "privateCoreHeldAmountMatchesLedgerNote",
  "privateCoreHeldLedgerBindingMatchesSelectedNote",
  "selectedCanonicalShieldRecord",
  "sendLedgerGateStatus",
  "canonical-spendable-note-ledger",
  "sendLedgerGateStatus.ready",
  "Send requires a canonical ledger-spendable note",
  "sourceLedgerBinding.noteStateSignature",
  "sourceLedgerBinding.canonicalCommitment",
  "sourceLedgerBinding.canonicalRoot",
  "sourceLedgerBinding.canonicalNullifierBasis",
  "sourceLedgerBinding.privateCoreCommitment",
  "sourceLedgerBinding.privateCoreRoot",
]) {
  requireIncludes(
    sendPageSource,
    marker,
    `SendPage must preserve canonical spendable-note ledger gate marker: ${marker}`,
  );
}

for (const marker of [
  "type VantaPrivateCoreLedgerBinding",
  "sourceLedgerBinding: VantaPrivateCoreLedgerBinding | null",
  "sourceLedgerBinding: args.sourceLedgerBinding ?? null",
  "privateCoreCommitment",
  "privateCoreNullifier",
  "privateCoreRoot",
]) {
  requireIncludes(
    privacyFlowSource,
    marker,
    `PrivacyFlowContext must preserve private-core-to-ledger source binding marker: ${marker}`,
  );
}

for (const marker of [
  "sourceLedgerBinding: zkRecord",
  "canonicalCommitment: zkRecord.artifacts.commitment.value",
  "canonicalRoot: zkRecord.insertion.root",
  "canonicalNullifierBasis: zkRecord.artifacts.nullifierBasis.value",
  "noteStateSignature: activeStateSignature",
]) {
  requireIncludes(
    shieldPageSource,
    marker,
    `ShieldPage must bind the local private-core note to the canonical Shield ledger record: ${marker}`,
  );
}

const privateCoreReadinessBlock = compact(
  sendPageSource.match(/const isPrivateCoreUsdcSendReady =[\s\S]{0,600}?;/)?.[0] ?? "",
);
if (!privateCoreReadinessBlock.includes("sendLedgerGateStatus.ready")) {
  failures.push(
    "Private Core Send readiness must require sendLedgerGateStatus.ready, not only private-core preview readiness.",
  );
}

const handlePrivateCoreSendProofBlock = compact(
  sendPageSource.match(/async function handlePrivateCoreSendProof\(\) \{[\s\S]*?\n  \}/)?.[0] ?? "",
);
if (
  !handlePrivateCoreSendProofBlock.includes("sendLedgerGateStatus.ready") ||
  !handlePrivateCoreSendProofBlock.includes("Send requires a canonical ledger-spendable note")
) {
  failures.push(
    "handlePrivateCoreSendProof must fail closed when the canonical Send ledger gate is not ready.",
  );
}

for (const marker of [
  "pendingSendByConsumedNoteId",
  "!pendingSendByConsumedNoteId.has(note.noteId)",
  "pendingSendTransition",
  "pendingSendTransition ? \"pending\"",
]) {
  requireIncludes(
    shieldStateSource,
    marker,
    `vantaShieldState must keep constrained pending Send transitions out of spendable notes: ${marker}`,
  );
}

for (const marker of [
  "redactLiveSendRecordForPersistence",
  "redactedRecipientReference",
  "sentAmountCommitment",
  "changeAmountCommitment",
  "predecessorNoteReferenceHash",
  "redactLiveSendArtifactsForPersistence",
  "encryptedPayloadCommitment",
  "lifecycle-record-id",
  "predecessor-lifecycle-id",
  "successor-predecessor-lifecycle-id",
]) {
  requireIncludes(
    liveSendBridgeSource,
    marker,
    `Live Send browser persistence must retain redacted hashes/commitments instead of raw private graph fields: ${marker}`,
  );
}

requireNotIncludes(
  liveSendBridgeSource,
  "canonicalNote: toSerializedCanonicalNote(canonicalNote)",
  "Live Send persistence must not store serialized canonical note secrets/blindings in localStorage.",
);
requireNotIncludes(
  liveSendBridgeSource,
  "const nextRecords = [...listCanonicalSendRecords(), record]",
  "Live Send persistence must persist a redacted record, not the raw in-memory record.",
);
requireNotIncludes(
  liveSendBridgeSource,
  "artifacts: successor.artifacts",
  "Live Send persistence must not persist raw CanonicalNoteArtifacts with encrypted payload recipient public keys.",
);

for (const marker of [
  '"ledger-gated-operator-witness-send-not-production-private"',
  "operatorVisibleFields",
  "operator-visible-in-current-private-core-lane",
  "npm run send:balance-ledger-check",
]) {
  requireIncludes(
    trustPacketSource,
    marker,
    `Send trust packet must preserve ledger/operator-limitation marker: ${marker}`,
  );
}

requireNotIncludes(
  trustPacketSource,
  '"local-proof-backed-private-send-not-production-private"',
  "Send trust packet must not describe the current no-proof-evidence packet as local-proof-backed.",
);

for (const marker of [
  "sendBalanceLedger",
  "sendTrustPacket",
  "npm run send:balance-ledger-check",
  "npm run send:trust-packet-check",
]) {
  requireIncludes(
    sendMainnetStatusSource,
    marker,
    `Send mainnet production status must expose Send ledger/trust-packet evidence ref: ${marker}`,
  );
}

for (const marker of [
  'proofReceipt.replayKey',
  'private-send:${request.nullifierOrReplayCommitment}',
]) {
  requireIncludes(
    protocolClientSource,
    marker,
    `Private Pool v2 protocol client must validate committed Send replay key: ${marker}`,
  );
}

if (failures.length > 0) {
  console.error("Vanta Send balance ledger contract check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Vanta Send balance ledger contract check: PASS");
}
