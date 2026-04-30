import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const shieldStateSource = readFileSync(
  resolve("src/solana/vantaShieldState.ts"),
  "utf8",
);
assert.ok(
  shieldStateSource.includes("VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX"),
  "Shield state must define a native SOL shield memo prefix.",
);
assert.ok(
  shieldStateSource.includes("createNativeSolShieldMemoInstruction"),
  "Shield state must export a native SOL shield memo instruction.",
);
assert.ok(
  shieldStateSource.includes('kind: "native_sol_shield"'),
  "Native SOL shield memo must use native_sol_shield kind.",
);
assert.ok(
  shieldStateSource.includes("parseNativeSolShieldMemo"),
  "Shield state must parse native SOL shield memos.",
);
assert.ok(
  shieldStateSource.includes("directShieldedSolNotes"),
  "Shield state must include direct SOL shield notes.",
);
assert.ok(
  shieldStateSource.includes("...directShieldedSolNotes"),
  "Shielded SOL notes must include direct native SOL shield entries.",
);
assert.ok(
  shieldStateSource.includes("note.owner === args.owner && note.vaultOwner === args.vaultOwner"),
  "Direct native SOL shield notes must be scoped to the active owner and vault.",
);
assert.ok(
  shieldStateSource.includes("depositSignature?: string"),
  "Direct native SOL shield notes must retain the deposit signature for recovery de-duplication.",
);

const shieldPageSource = readFileSync(resolve("src/pages/ShieldPage.tsx"), "utf8");
assert.ok(
  shieldPageSource.includes("beginNativeSolShieldTransfer"),
  "Shield page must have a native SOL shield path.",
);
assert.ok(
  shieldPageSource.includes("isNativeSolShield ? !!selectedShieldAsset?.vaultOwner"),
  "Shield page amount validation must allow native SOL with a vault owner, without requiring a token target mint.",
);
assert.ok(
  shieldPageSource.includes("!isNativeSolShield && (!selectedShieldAsset.mintAddress || !supportedToken)"),
  "Shield page submit guard must allow native SOL without requiring an SPL target token handle.",
);
assert.ok(
  shieldPageSource.includes("Shielded SOL"),
  "Shield page must label SOL as Shielded SOL.",
);
assert.ok(
  shieldPageSource.includes("fetchNativeSolShieldDepositCandidates"),
  "Shield page must check for recoverable native SOL vault deposits.",
);
assert.ok(
  shieldPageSource.includes("beginNativeSolShieldDepositRecovery"),
  "Shield page must let users record shield state for already-submitted native SOL vault deposits.",
);
assert.ok(
  shieldPageSource.includes("Record shielded SOL"),
  "Shield page must expose a recovery action for unrecorded native SOL vault deposits.",
);
assert.ok(
  shieldPageSource.includes("recordRecoveredNativeSolShieldNote"),
  "Native SOL recovery must record an already-vaulted SOL note without requiring another Phantom transaction.",
);
assert.ok(
  shieldPageSource.includes("VANTA_NATIVE_SOL_SAME_TRANSACTION_DEPOSIT_SIGNATURE"),
  "Native SOL Shield must bind the same transaction as both transfer and shield-state record.",
);
assert.ok(
  shieldPageSource.includes('summaryInstructions: ["native-sol-shield-transfer", "shield-state-memo"]'),
  "Native SOL Shield must submit transfer and shield-state memo in one wallet request.",
);
assert.ok(
  shieldPageSource.includes("pendingNativeSolDepositRecovery") &&
    shieldPageSource.includes("? pendingDepositSignature") &&
    shieldPageSource.includes("? true"),
  "Native SOL recovery finalization must use the original deposit signature without a second shield-state transaction.",
);
assert.ok(
  shieldPageSource.includes("nativeSolShieldBlockedByRecoverableDeposit"),
  "Native SOL Shield must block new SOL transfers while an unrecovered vault deposit exists.",
);
assert.ok(
  shieldPageSource.includes("Record it as shielded SOL before sending more."),
  "Native SOL Shield must tell users to recover existing vault deposits before sending more SOL.",
);

const nativeSolShieldSource = readFileSync(resolve("src/solana/nativeSolShield.ts"), "utf8");
assert.ok(
  nativeSolShieldSource.includes("fetchNativeSolShieldDepositCandidates"),
  "Native SOL shield helper must expose recoverable vault deposit discovery.",
);
assert.ok(
  nativeSolShieldSource.includes("getParsedTransactions"),
  "Native SOL deposit discovery must inspect parsed wallet transactions.",
);
assert.ok(
  nativeSolShieldSource.includes("fetchParsedTransactionsOneAtATime"),
  "Native SOL deposit discovery must avoid batched getTransaction requests that public RPC endpoints reject.",
);
assert.ok(
  nativeSolShieldSource.includes("existingDepositSignatures"),
  "Native SOL deposit discovery must de-duplicate already recorded deposit signatures.",
);
assert.ok(
  shieldPageSource.includes("toRecoverableSolDepositsErrorMessage"),
  "Shield page must translate native SOL recovery RPC failures into user-facing language.",
);

const tokenAvailabilitySource = readFileSync(resolve("src/solana/tokenAvailability.ts"), "utf8");
assert.ok(
  tokenAvailabilitySource.includes("isNativeSolShieldConfigured"),
  "Token availability must model native SOL Shield readiness separately from the USDC/SOL swap pair.",
);
assert.ok(
  !tokenAvailabilitySource.includes('if (symbol === "SOL") {\n    return liveSwapPair.configured;\n  }'),
  "SOL Shield readiness must not depend on the old liveSwapPair USDC/SOL configuration.",
);

console.log("Vanta native SOL shield check: PASS");
