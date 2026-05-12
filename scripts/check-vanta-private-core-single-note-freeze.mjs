import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const REQUIRED_LEGACY_CIRCUITS = [
  "vanta_private_core_single_note_send",
  "vanta_private_core_single_note_swap",
  "vanta_private_core_single_note_unshield",
];

function readRequired(relativePath) {
  const path = resolve(repoRoot, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing required file ${relativePath}.`);
  }
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, file) {
  assert(source.includes(needle), `${file} is missing ${needle}`);
}

function assertExcludes(source, needle, file) {
  assert(!source.includes(needle), `${file} still contains stale phrase: ${needle}`);
}

try {
  const operator = readRequired("operator/unshield-server.mjs");
  const client = readRequired("src/zk/vantaPrivateCoreOperatorClient.ts");
  const contractPrinter = readRequired("scripts/print-vanta-private-core-operator-contract.mjs");
  const statusPrinter = readRequired("scripts/print-vanta-private-core-operator-status.mjs");
  const contractCheck = readRequired("scripts/check-vanta-private-core-operator-contract.mjs");
  const statusEndpointCheck = readRequired(
    "scripts/check-vanta-private-core-operator-status-endpoint.mjs",
  );
  const review = readRequired("VANTA_ZK_REVIEW.md");
  const ledger = JSON.parse(readRequired("VANTA_ZK_REVIEW.findings.json"));
  const readme = readRequired("README.md");
  const assumptions = readRequired("docs/zk/vanta-zk-v1-assumptions.md");
  const remainingWork = readRequired("docs/zk/vanta-zk-v1-remaining-work.md");
  const sendBoundary = readRequired("docs/zk/vanta-private-core-send-proof-boundary.md");
  const swapBoundary = readRequired("docs/zk/vanta-private-core-swap-proof-boundary.md");
  const unshieldBoundary = readRequired(
    "docs/zk/vanta-private-core-unshield-proof-boundary.md",
  );
  const supportedSend = readRequired("docs/zk/vanta-zk-v1-supported-send-lane.md");
  const supportedUnshield = readRequired("docs/zk/vanta-zk-v1-supported-unshield-lane.md");
  const packageJson = JSON.parse(readRequired("package.json"));
  const scripts = packageJson.scripts ?? {};

  for (const [file, source] of [
    ["operator/unshield-server.mjs", operator],
    ["src/zk/vantaPrivateCoreOperatorClient.ts", client],
    ["scripts/check-vanta-private-core-operator-contract.mjs", contractCheck],
    ["scripts/check-vanta-private-core-operator-status-endpoint.mjs", statusEndpointCheck],
  ]) {
    assertIncludes(source, "vanta_private_core_single_note", file);
    assertIncludes(source, "active-v0-legacy", file);
    assertIncludes(source, "deprecated-for-new-architecture", file);
    assertIncludes(source, "vanta_private_pool_v2_entry", file);
  }

  for (const [file, source] of [
    ["scripts/print-vanta-private-core-operator-contract.mjs", contractPrinter],
    ["scripts/print-vanta-private-core-operator-status.mjs", statusPrinter],
  ]) {
    assertIncludes(source, "supportedPrivateCoreCircuitFamily", file);
    assertIncludes(source, "supportedPrivateCoreCircuitFamilyStatus", file);
    assertIncludes(source, "supportedPrivateCoreCircuitFamilyNewArchitectureStatus", file);
    assertIncludes(source, "supportedPrivateCoreReplacementFamily", file);
    assertIncludes(source, "Supported circuit family", file);
    assertIncludes(source, "Supported replacement family", file);
  }

  for (const circuit of REQUIRED_LEGACY_CIRCUITS) {
    assertIncludes(operator, circuit, "operator/unshield-server.mjs");
    assertIncludes(client, circuit, "src/zk/vantaPrivateCoreOperatorClient.ts");
    assertIncludes(contractCheck, circuit, "scripts/check-vanta-private-core-operator-contract.mjs");
  }

  assert(
    scripts["private-core:single-note-freeze-check"] ===
      "node scripts/check-vanta-private-core-single-note-freeze.mjs",
    "package.json must expose private-core:single-note-freeze-check.",
  );
  assert(
    scripts["zk:review-guards-check"]?.includes(
      "npm run private-core:single-note-freeze-check",
    ),
    "zk:review-guards-check must include private-core:single-note-freeze-check.",
  );

  const loop = ledger.activeFeedbackLoops?.find(
    (entry) =>
      entry.id === "VANTA-ZK-FEEDBACK-2026-05-12-SINGLE-NOTE-LEGACY-LANE-FREEZE",
  );
  assert(loop, "findings ledger must include the single-note legacy freeze feedback loop.");
  assert(
    loop.truthBoundary?.includes("active-v0 compatibility lanes") &&
      loop.truthBoundary?.includes("not the long-term circuit architecture"),
    "single-note legacy freeze truth boundary must stay explicit.",
  );

  for (const [file, source] of [
    ["VANTA_ZK_REVIEW.md", review],
    ["README.md", readme],
    ["docs/zk/vanta-zk-v1-assumptions.md", assumptions],
    ["docs/zk/vanta-zk-v1-remaining-work.md", remainingWork],
    ["docs/zk/vanta-private-core-send-proof-boundary.md", sendBoundary],
    ["docs/zk/vanta-private-core-swap-proof-boundary.md", swapBoundary],
    ["docs/zk/vanta-private-core-unshield-proof-boundary.md", unshieldBoundary],
    ["docs/zk/vanta-zk-v1-supported-send-lane.md", supportedSend],
    ["docs/zk/vanta-zk-v1-supported-unshield-lane.md", supportedUnshield],
  ]) {
    assertIncludes(source, "active-v0 legacy", file);
    assertIncludes(source, "Private Pool v2 entry", file);
  }

  for (const stalePhrase of [
    "having two send circuits is dead weight",
    "vanta_private_core_single_note_send/src/main.nr` (delete; consolidate",
    "vanta_private_core_single_note_swap/src/main.nr` (delete; consolidated",
    "Replace both `vanta_private_pool_v2_swap_to_shielded_entry` and `vanta_private_core_single_note_swap` with a single",
  ]) {
    assertExcludes(review, stalePhrase, "VANTA_ZK_REVIEW.md");
  }

  console.log("Vanta Private Core single-note freeze: PASS");
  console.log(
    JSON.stringify(
      {
        circuitFamily: "vanta_private_core_single_note",
        familyStatus: "active-v0-legacy",
        newArchitectureStatus: "deprecated-for-new-architecture",
        replacementFamily: "vanta_private_pool_v2_entry",
        legacyCircuits: REQUIRED_LEGACY_CIRCUITS,
      },
      null,
      2,
    ),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Vanta Private Core single-note freeze: FAIL - ${message}`);
  process.exitCode = 1;
}
