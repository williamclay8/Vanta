import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const formatterSource = readFileSync(resolve("src/solana/solAmountFormat.ts"), "utf8");
const dashboardSource = readFileSync(resolve("src/pages/AppDashboardPage.tsx"), "utf8");
const noteStatePanelSource = readFileSync(resolve("src/components/NoteStatePanel.tsx"), "utf8");
const positionSummarySource = readFileSync(resolve("src/components/PositionSummary.tsx"), "utf8");
const shieldStateSource = readFileSync(resolve("src/solana/vantaShieldState.ts"), "utf8");
const shieldAssetStateSource = readFileSync(resolve("src/solana/useVantaShieldAssetState.ts"), "utf8");
const positionSummaryHookSource = readFileSync(resolve("src/solana/useVantaPositionSummary.ts"), "utf8");
const meteoraContextSource = readFileSync(resolve("operator/meteora-dlmm-context.mjs"), "utf8");

assert.ok(
  formatterSource.includes("maximumFractionDigits: 9"),
  "Shielded SOL account display must preserve native SOL's 9-decimal precision.",
);
assert.ok(
  formatterSource.includes("minimumFractionDigits: 0"),
  "Shielded SOL account display must not pad or imply extra SOL precision.",
);

for (const [label, source] of [
  ["dashboard", dashboardSource],
  ["note state panel", noteStatePanelSource],
  ["position summary", positionSummarySource],
]) {
  assert.ok(
    source.includes("formatVantaSolAmount"),
    `${label} must render shielded SOL balances through the shared 9-decimal formatter.`,
  );
  assert.ok(
    !source.includes("shieldedSolBalance.toFixed(4)") &&
      !source.includes("maximumFractionDigits: 6"),
    `${label} must not round shielded SOL account amounts below lamport precision.`,
  );
}

assert.ok(
  meteoraContextSource.includes("function getMintDecimals") &&
    meteoraContextSource.includes('getMintLabel(mintAddress) === "SOL" ? 9 : 6'),
  "Meteora USDC->SOL quotes must derive SOL output precision from the output mint.",
);
assert.ok(
  meteoraContextSource.includes("const formattedOutputAmount = outputAmount.toFixed(outputDecimals)") &&
    meteoraContextSource.includes("outputAmount: formattedOutputAmount"),
  "Meteora USDC->SOL quotes must emit shielded SOL output at 9-decimal account precision.",
);
assert.ok(
  !meteoraContextSource.includes("outputAmount: outputAmount.toFixed(6)") &&
    !meteoraContextSource.includes("quoteOutputAmount.toFixed(6)"),
  "Meteora USDC->SOL quotes must not force SOL output amounts through 6-decimal USDC precision.",
);

for (const [label, source] of [
  ["dashboard", dashboardSource],
  ["position summary hook", positionSummaryHookSource],
]) {
  assert.ok(
    source.includes("shieldRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0)") ||
      source.includes("useVantaPositionSummary"),
    `${label} must source shielded SOL from the registry entry that actually has shielded SOL, not only the primary USDC account.`,
  );
}
assert.ok(
  positionSummaryHookSource.includes("confirmedShieldedSolNotesByKey") &&
    positionSummaryHookSource.includes("new Map<string, VantaShieldedSolNote>()") &&
    positionSummaryHookSource.includes("entry.account?.spendableShieldedSolNotes ?? []"),
  "Status shielded SOL must dedupe spendable SOL notes across the shield asset registry.",
);
assert.ok(
  positionSummaryHookSource.includes('note.stateSignature.startsWith("local-sol-recovery:")') &&
    positionSummaryHookSource.includes("pendingRecoveredShieldedSolBalance"),
  "Status confirmed shielded SOL must not include local-recovery-only notes.",
);
assert.ok(
  shieldAssetStateSource.indexOf("const accountWithRecoveredSolNotes = mergeRecoveredNativeSolShieldNotes(") <
    shieldAssetStateSource.indexOf("reconcileLocallyReleasedSolNotes(accountWithRecoveredSolNotes, locallyReleasedSolNoteIds)"),
  "Recovered native SOL notes must be merged before locally released SOL reconciliation so released notes cannot reappear as spendable.",
);

for (const [label, source] of [
  ["shield state", shieldStateSource],
  ["shield asset state", shieldAssetStateSource],
]) {
  assert.ok(
    source.includes("spendableShieldedSolNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(9)"),
    `${label} must sum spendable shielded SOL notes at 9-decimal account precision.`,
  );
}

console.log("Vanta shielded SOL account amount check: PASS");
