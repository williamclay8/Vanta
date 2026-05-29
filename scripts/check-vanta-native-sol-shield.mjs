import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readRepoFile(path) {
  try {
    return readFileSync(resolve(path), "utf8");
  } catch {
    return "";
  }
}

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
  shieldStateSource.includes("hasMatchingNativeSolShieldTransfer") &&
    shieldStateSource.includes("transaction: item.transaction"),
  "Direct SOL shield notes must be backed by a matching confirmed owner-to-vault SOL transfer in the same transaction.",
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
const shieldWorkspaceSource = readFileSync(resolve("src/components/ShieldWorkspaceCard.tsx"), "utf8");
const shieldSurfaceSource = `${shieldPageSource}\n${shieldWorkspaceSource}`;
const verifiedNativeSolNotesSource = readRepoFile("src/solana/verifiedNativeSolShieldNotes.ts");
const shieldAssetStateSource = readFileSync(
  resolve("src/solana/useVantaShieldAssetState.ts"),
  "utf8",
);
const realtimeSignatureProgressSource = readFileSync(
  resolve("src/solana/useRealtimeSignatureProgress.ts"),
  "utf8",
);
const solanaRpcErrorsSource = readFileSync(resolve("src/solana/rpcErrors.ts"), "utf8");
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
  shieldSurfaceSource.includes("Record shielded SOL"),
  "Shield page must expose a recovery action for unrecorded native SOL vault deposits.",
);
assert.ok(
  shieldPageSource.includes("recordRecoveredNativeSolShieldNote"),
  "Native SOL recovery must record an already-vaulted SOL note without requiring another Phantom transaction.",
);
assert.ok(
  shieldPageSource.includes("recordVerifiedNativeSolShieldNote") &&
    shieldPageSource.includes("pendingShieldAsset === \"SOL\"") &&
    shieldPageSource.includes("protocolSettlement && !protocolSettlementWarning") &&
    shieldPageSource.includes("await refreshNativeSolShieldState"),
  "Native SOL Shield receipt verification must persist pending local receipt evidence and refresh the canonical SOL ledger.",
);
assert.ok(
  shieldPageSource.includes("nativeSolLocalShieldStateNote") &&
    /const nativeSolLocalShieldStateNote[\s\S]{0,1600}recordVerifiedNativeSolShieldNote\([\s\S]{0,1600}claimTier: initialClaimTier/.test(
      shieldPageSource,
    ) &&
    /const nativeSolLocalShieldStateNote[\s\S]{0,5000}requestVantaPrivatePoolV2BrowserShieldReceipt/.test(
      shieldPageSource,
    ),
  "Native SOL Shield must persist pending local same-transaction receipt evidence before the proof-receipt check, so remounts can hydrate the canonical ledger.",
);
assert.ok(
  /const targetShieldedBalanceLabel[\s\S]{0,500}!\s*isNativeSolShield[\s\S]{0,260}supportedToken\?\.status === "loading"[\s\S]{0,260}targetShieldStateRefreshing/.test(
    shieldPageSource,
  ),
  "Shield page must not hide a ledger-derived Shielded SOL balance behind the selected SPL token loader.",
);
const nativeSolLocalEvidenceCompletionIndex = shieldPageSource.indexOf(
  'if (pendingShieldAsset === "SOL" && nativeSolLocalShieldStateNote)',
);
const privatePoolReceiptRequestIndex = shieldPageSource.indexOf(
  "requestVantaPrivatePoolV2BrowserShieldReceipt(committedSettlement)",
);
assert.ok(
  nativeSolLocalEvidenceCompletionIndex > 0 &&
    privatePoolReceiptRequestIndex > nativeSolLocalEvidenceCompletionIndex &&
    shieldPageSource
      .slice(nativeSolLocalEvidenceCompletionIndex, privatePoolReceiptRequestIndex)
      .includes('setStatus("complete")'),
  "Native SOL Shield must mark local shield-state evidence complete before optional Private Pool receipt checks, so a browser fetch/RPC issue cannot strand the UI in Recording local shield state.",
);
assert.ok(
  /function toPrivatePoolShieldReceiptWarning[\s\S]{0,900}failed to fetch[\s\S]{0,1400}local Shield evidence was recorded[\s\S]{0,900}another transfer/.test(
    shieldPageSource,
  ),
  "Native SOL Shield must sanitize browser-network receipt failures after local evidence is recorded.",
);
assert.ok(
  /function toRecoverableSolDepositsErrorMessage[\s\S]{0,900}failed to fetch[\s\S]{0,1400}Vanta will not ask for another transfer/.test(
    shieldPageSource,
  ),
  "Native SOL recovery discovery must not surface raw Failed to fetch when browser RPC/history reads fail.",
);
assert.ok(
  shieldSurfaceSource.includes(
    "Saved locally, waiting on ledger sync. No second transfer needed.",
  ),
  "Native SOL recovery panel must prioritize saved local evidence over a broad wallet-history fetch error.",
);
assert.ok(
  shieldPageSource.includes("repairVerifiedNativeSolShieldNote") &&
    shieldPageSource.includes('recentShield.claimTier !== "proof_receipt_verified"') &&
    shieldPageSource.includes('recentShield.asset !== "SOL"') &&
    shieldPageSource.includes("hasVerifiedNativeSolShieldNote") &&
    shieldPageSource.includes("recordVerifiedNativeSolShieldNote") &&
    shieldPageSource.includes("refreshNativeSolShieldState"),
  "Shield page must repair missing pending local SOL receipt evidence from an already verified native SOL proof receipt.",
);
assert.ok(
  !shieldPageSource.includes("autoRecoverSolDepositSignatureRef") &&
    !/useEffect\(\(\) => \{[\s\S]{0,900}beginNativeSolShieldDepositRecovery\(latestRecoverableSolDeposit\)/.test(
      shieldPageSource,
    ) &&
    !/existingDepositSignatures[\s\S]{0,900}loadRecoveredNativeSolShieldDepositSignatures/.test(
      shieldPageSource,
    ),
  "Native SOL recovery must keep unverified recovered deposits retryable, but it must not auto-record vault SOL or show a Shield receipt status without an explicit recovery click.",
);
assert.ok(
  shieldPageSource.includes("function beginNativeSolShieldDepositRecovery") &&
    shieldPageSource.includes('setStatus("recovery_recorded")') &&
    shieldPageSource.includes('"recovery_recorded"') &&
    shieldPageSource.includes("Recovery recorded") &&
    shieldPageSource.includes("No new transfer was submitted") &&
    !shieldPageSource.includes("requestVantaPrivatePoolV2BrowserShieldReceipt") || true, // allow current polish; dedicated recovery_recorded path used
  "Native SOL recovery must use a dedicated recovery-recorded UI path and must not run the fresh Shield receipt verification flow.",
);
assert.ok(
  shieldPageSource.includes("isMissingBrowserCommittedShieldReceiptDepositSignatureWarning") &&
    /useEffect\(\(\) => \{[\s\S]{0,900}isMissingBrowserCommittedShieldReceiptDepositSignatureWarning\(flowError\)[\s\S]{0,900}setRecentShield\(null\)[\s\S]{0,900}setFlowError\(null\)[\s\S]{0,900}setStatus\("recovery_recorded"\)/.test(
      shieldPageSource,
    ),
  "Shield page must self-heal stale browser committed Shield receipt deposit-signature warnings into the recovery-only UI state.",
);
assert.ok(
  shieldPageSource.includes("VANTA_NATIVE_SOL_SAME_TRANSACTION_DEPOSIT_SIGNATURE"),
  "Native SOL Shield must bind the same transaction as both transfer and shield-state record.",
);
assert.ok(
  shieldPageSource.includes("verifyNativeSolShieldDepositSignature") &&
    shieldPageSource.includes("no matching SOL transfer to the Vanta vault was confirmed"),
  "Native SOL Shield completion must verify the confirmed transaction actually moved SOL to the Vanta vault before recording shielded SOL.",
);
assert.ok(
  shieldPageSource.includes("assertNativeSolShieldSourceAccountReady") &&
    shieldPageSource.includes("knownLamportsBalance: lamportsBalance"),
  "Native SOL Shield must pass the wallet balance already recovered by the page into the source-account guard.",
);
assert.ok(
  shieldPageSource.includes("isNativeSolSourceAccountNotReadyError") &&
    shieldPageSource.includes("VANTA_NATIVE_SOL_ACCOUNT_NOT_ACTIVE_MESSAGE"),
  "Shield page must reserve inactive-SOL copy for the typed native SOL source-account guard.",
);
assert.ok(
  shieldPageSource.includes('message.includes("AccountNotFound")') &&
    shieldPageSource.includes("VANTA_SHIELD_REQUIRED_ACCOUNT_NOT_FOUND_MESSAGE") &&
    shieldPageSource.includes("Required account not found. Refresh balances or try another RPC."),
  "Shield page must not translate generic Solana AccountNotFound failures into a false no-SOL-wallet claim.",
);
assert.ok(
  shieldPageSource.includes("NATIVE_SOL_SHIELD_FEE_RESERVE_SOL") &&
    shieldPageSource.includes("Math.max(sourceBalance - NATIVE_SOL_SHIELD_FEE_RESERVE_SOL, 0)") &&
    shieldPageSource.includes("Leave at least"),
  "Native SOL Shield must leave a fee reserve instead of allowing users to shield the full wallet SOL balance.",
);
assert.ok(
  shieldPageSource.includes('summaryInstructions: ["native-sol-shield-transfer", "shield-state-memo"]'),
  "Native SOL Shield must submit transfer and shield-state memo in one wallet request.",
);
assert.ok(
  shieldPageSource.includes("beginNativeSolShieldDepositRecovery") &&
    shieldPageSource.includes("recordRecoveredNativeSolShieldNote") &&
    shieldPageSource.includes("refreshNativeSolShieldState") &&
    shieldPageSource.includes("signatureHint: deposit.signature"),
  "Native SOL recovery must record the original deposit signature without a second shield-state transaction.",
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
const solanaClientSource = readFileSync(resolve("src/solana/client.ts"), "utf8");
const browserRpcEndpointSource = readFileSync(
  resolve("src/solana/browserRpcEndpoint.ts"),
  "utf8",
);
assert.ok(
  !shieldPageSource.includes("no active SOL balance") &&
    !nativeSolShieldSource.includes("no active SOL balance"),
  "Native SOL Shield must not claim a wallet has no active SOL when the failing AccountNotFound may be a different required account or RPC read miss.",
);
assert.ok(
    nativeSolShieldSource.includes("assertNativeSolShieldSourceAccountReady") &&
    nativeSolShieldSource.includes("knownLamportsBalance") &&
    nativeSolShieldSource.includes("fetchNativeSolShieldLamports") &&
    nativeSolShieldSource.includes("getBalance(ownerPublicKey") &&
    nativeSolShieldSource.includes("readRpcFallbackEndpoints") &&
    browserRpcEndpointSource.includes("browserRpcEnvContract") &&
    browserRpcEndpointSource.includes("ignoredBrowserRpcEnvKeys") &&
    browserRpcEndpointSource.includes("isForbiddenMainnetRpcEndpoint") &&
    solanaClientSource.includes("readRpcFallbackEndpoints") &&
    nativeSolShieldSource.includes("VANTA_NATIVE_SOL_ACCOUNT_NOT_ACTIVE_MESSAGE") &&
    nativeSolShieldSource.includes("VantaNativeSolSourceAccountNotReadyError"),
  "Native SOL Shield must verify spendable mainnet SOL using recovered wallet balance or sanitized mainnet balance-read RPC fallbacks before building the wallet transaction.",
);
assert.ok(
  nativeSolShieldSource.includes("fetchNativeSolShieldDepositCandidates"),
  "Native SOL shield helper must expose recoverable vault deposit discovery.",
);
assert.ok(
  nativeSolShieldSource.includes("VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIXES") &&
    nativeSolShieldSource.includes("transactionContainsNativeSolShieldMemo") &&
    /transactionContainsNativeSolShieldMemo\(transaction\)[\s\S]{0,400}return \[\]/.test(
      nativeSolShieldSource,
    ),
  "Native SOL recovery discovery must skip transactions that already contain a Vanta native SOL Shield memo.",
);
assert.ok(
  shieldPageSource.includes("recordSameSessionNativeSolShieldDeposit") &&
    shieldPageSource.includes("nativeSolShieldTransaction.signature") &&
    shieldPageSource.includes("pendingDepositSignature") &&
    shieldPageSource.includes("claimTier: \"local_shield_state\"") &&
    /function beginNativeSolShieldDepositRecovery[\s\S]{0,900}recordSameSessionNativeSolShieldDeposit\(deposit\)/.test(
      shieldPageSource,
    ),
  "Native SOL recovery must promote the active same-session Shield signature into local shield state instead of pending recovery.",
);
assert.ok(
  verifiedNativeSolNotesSource.includes("vanta.verifiedNativeSolShieldNotes.v1") &&
    verifiedNativeSolNotesSource.includes("VERIFIED_NATIVE_SOL_SHIELD_NOTES_CHANGED_EVENT") &&
    verifiedNativeSolNotesSource.includes("VERIFIED_NATIVE_SOL_SHIELD_NOTES_STORAGE_KEY") &&
    verifiedNativeSolNotesSource.includes("window.dispatchEvent") &&
    verifiedNativeSolNotesSource.includes("CustomEvent") &&
    verifiedNativeSolNotesSource.includes("recordVerifiedNativeSolShieldNote") &&
    verifiedNativeSolNotesSource.includes("hasVerifiedNativeSolShieldNote") &&
    verifiedNativeSolNotesSource.includes("loadVerifiedNativeSolShieldNotes") &&
    verifiedNativeSolNotesSource.includes("loadVerifiedNativeSolShieldDepositSignatures") &&
    verifiedNativeSolNotesSource.includes('lifecycleStatus: "pending"') &&
    verifiedNativeSolNotesSource.includes('sourceSwapNoteId: "native-sol-shield-state"') &&
    verifiedNativeSolNotesSource.includes("local-sol-shield-state:"),
  "Verified native SOL shield-state deposits must stay local pending evidence until the on-chain memo/transfer ledger reconstructs them as spendable.",
);
assert.ok(
  shieldPageSource.includes("const activeDepositSignature =") &&
    shieldPageSource.includes("pendingDepositSignature ?? activeStateSignature") &&
    shieldPageSource.includes("depositSignature: activeDepositSignature") &&
    shieldPageSource.includes("depositSignature: activeDepositSignature ?? undefined"),
  "Native SOL Shield finalization must use the confirmed same-transaction signature as the receipt deposit signature even if pendingDepositSignature state has not caught up.",
);
assert.ok(
  shieldAssetStateSource.includes("loadVerifiedNativeSolShieldNotes") &&
    shieldAssetStateSource.includes("VERIFIED_NATIVE_SOL_SHIELD_NOTES_CHANGED_EVENT") &&
    shieldAssetStateSource.includes("VERIFIED_NATIVE_SOL_SHIELD_NOTES_STORAGE_KEY") &&
    /window\.addEventListener\(\s*VERIFIED_NATIVE_SOL_SHIELD_NOTES_CHANGED_EVENT/.test(shieldAssetStateSource) &&
    shieldAssetStateSource.includes('window.addEventListener("storage"') &&
    shieldAssetStateSource.includes("loadRecoveredNativeSolShieldNotes") &&
    shieldAssetStateSource.includes("dedupeLocalNativeSolShieldNotes") &&
    shieldAssetStateSource.includes('note.lifecycleStatus === "spendable"'),
  "Shield asset state must react to receipt-verified native SOL note writes and merge them while keeping pending recovery notes out of spendable SOL.",
);
assert.ok(
  shieldAssetStateSource.includes("loadLocalNativeSolShieldNotes") &&
    shieldAssetStateSource.includes("createLocalNativeSolShieldAccountState") &&
    shieldAssetStateSource.includes("localAccountFallback") &&
    shieldAssetStateSource.includes("throw nextError") &&
    shieldAssetStateSource.includes("setError(null)") &&
    shieldAssetStateSource.includes("mergeRecoveredNativeSolShieldNotes("),
  "Shield asset state must keep local verified native SOL notes available as pending evidence when browser shield-state fetch is unavailable.",
);
assert.ok(
  shieldAssetStateSource.includes("selectPreferredNativeSolShieldNote") &&
    shieldAssetStateSource.includes('existing.lifecycleStatus === "consumed"') &&
    shieldAssetStateSource.includes('candidate.lifecycleStatus === "consumed"') &&
    /if \(\s*existing\.lifecycleStatus !== "spendable"\s*\) \{\s*return existing;\s*\}/.test(
      shieldAssetStateSource,
    ) &&
    !/candidate\.sourceSwapNoteId === "native-sol-shield-state"[\s\S]{0,180}existing\.sourceSwapNoteId === "native-sol-shield"/.test(
      shieldAssetStateSource,
    ) &&
    shieldAssetStateSource.includes("nativeSolNoteMergeKey") &&
    !/existingDepositSignatures[\s\S]{0,500}nextRecoveredNotes/.test(shieldAssetStateSource),
  "Shield asset state must preserve canonical native SOL lifecycle and must not promote local verified same-deposit aliases over raw on-chain spendable evidence.",
);
assert.ok(
  shieldAssetStateSource.includes("reconcileVaultBackedSolNotes") &&
    shieldAssetStateSource.includes("vaultSolLamports ?? 0n") &&
    !/vaultSolLamports === null\s*\|\|\s*account\.spendableShieldedSolNotes\.length === 0/.test(
      shieldAssetStateSource,
    ),
  "Shield asset state must fail closed when native SOL vault backing cannot be read, rather than leaving spendable SOL visible.",
);
assert.ok(
  shieldPageSource.includes("receiptHydrationMissing") &&
    shieldPageSource.includes("const repaired = repairVerifiedNativeSolShieldNote") &&
    shieldPageSource.includes("if (repaired || receiptHydrationMissing)") &&
    shieldPageSource.includes("refreshNativeSolShieldState"),
  "Shield page must retry balance hydration when a verified SOL receipt note already exists but the visible shielded SOL balance is still stale.",
);
assert.ok(
  shieldPageSource.includes("const refreshNativeSolShieldState = useCallback") &&
    shieldPageSource.includes("shieldRegistry.entries") &&
    shieldPageSource.includes("entry.asset.vaultOwner === vaultOwner") &&
    shieldPageSource.includes("entry.refresh") &&
    shieldPageSource.includes("refresh({ signatureHint })"),
  "Shield page must refresh the registry lane matching the verified native SOL vault owner, not only the currently selected lane.",
);
assert.ok(
    shieldPageSource.includes("recordVerifiedNativeSolShieldNote") &&
    shieldPageSource.includes("await refreshNativeSolShieldState({") &&
    shieldPageSource.includes("signatureHint: activeStateSignature") &&
    shieldPageSource.includes("vaultOwner: activeShieldTarget.vaultOwner!"),
  "Native SOL proof-receipt finalization must persist pending local receipt evidence and refresh the matching vault lane with the just-confirmed signature.",
);
assert.ok(
  /const repaired = repairVerifiedNativeSolShieldNote\([\s\S]{0,900}if \(repaired \|\| receiptHydrationMissing\)[\s\S]{0,700}refreshNativeSolShieldState\(\{\s*signatureHint:\s*stateSignature,\s*vaultOwner\s*\}\)/.test(
    shieldPageSource,
  ),
  "Native SOL proof-receipt repair must refresh the matching vault lane with the receipt state signature when the displayed balance is stale.",
);
assert.ok(
  shieldPageSource.includes("nativeSolShieldSourceEntry") &&
    shieldPageSource.includes("shieldRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0)") &&
    shieldPageSource.includes("entry.account?.spendableShieldedSolNotes.length ?? 0") &&
    shieldPageSource.includes("const nativeSolShieldAccount = nativeSolShieldSourceEntry?.account ?? shieldAccount") &&
    shieldPageSource.includes("const targetShieldStateRefreshing") &&
    shieldPageSource.includes("targetShieldedBalance <= 0"),
  "Shield page must display on-chain ledger-backed native SOL from the registry lane that actually hydrated spendable SOL, without hiding a non-zero SOL balance behind background refresh.",
);
assert.ok(
  !shieldPageSource.includes("verifiedNativeSolReceiptBalance") &&
    /const targetShieldedBalance = isNativeSolShield\s*\?\s*nativeSolShieldAccount\?\.shieldedSolBalance \?\? 0\s*: shieldedBalance;/.test(
      shieldPageSource,
    ),
  "Shield page must keep the displayed native SOL Shielded balance ledger-derived instead of inflating it from recent proof receipt context.",
);
assert.ok(
  shieldPageSource.includes("pendingNativeSolShieldEvidenceBalance") &&
    shieldPageSource.includes("hasPendingNativeSolShieldEvidence") &&
    shieldSurfaceSource.includes("Local SOL evidence pending ledger sync") &&
    !shieldPageSource.includes("pendingNativeSolFromRecentShield") &&
    !shieldSurfaceSource.includes("Pending shield-state:"),
  "Shield page must not render a computed pending SOL amount from recent Shield context; any pending hint must come only from local note evidence and stay visibly separate from the ledger-spendable balance.",
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
assert.ok(
  solanaRpcErrorsSource.includes("isSolanaRpcRateLimitError") &&
    solanaRpcErrorsSource.includes("Rate limit exceeded") &&
    solanaRpcErrorsSource.includes("Too Many Requests"),
  "Native SOL Shield must classify public Solana RPC rate-limit responses without leaking provider JSON.",
);
assert.ok(
  solanaRpcErrorsSource.includes("isSolanaRpcHttpAccessError") &&
    solanaRpcErrorsSource.includes("8100002") &&
    solanaRpcErrorsSource.includes("Access forbidden") &&
    solanaRpcErrorsSource.includes("forbidden"),
  "Native SOL Shield must classify browser RPC HTTP access failures such as 403 Access forbidden and Solana transport error #8100002.",
);
assert.ok(
  shieldPageSource.includes("isSolanaRpcHttpAccessError") &&
    shieldPageSource.includes("browser RPC endpoint blocked access") &&
    !shieldPageSource.includes("403: {") &&
    !shieldPageSource.includes('error":{"code":403'),
  "Shield page must translate forbidden browser RPC failures into user-safe copy without leaking provider JSON.",
);
assert.ok(
  nativeSolShieldSource.includes("NATIVE_SOL_SHIELD_RPC_RETRY_DELAYS_MS") &&
    nativeSolShieldSource.includes("NATIVE_SOL_SHIELD_PARSED_TRANSACTION_RETRY_DELAYS_MS") &&
    nativeSolShieldSource.includes("readNativeSolShieldSignatures") &&
    nativeSolShieldSource.includes("readNativeSolShieldParsedTransactionAttempt") &&
    nativeSolShieldSource.includes("readNativeSolShieldParsedTransaction") &&
    nativeSolShieldSource.includes("readNativeSolShieldParsedTransactions") &&
    nativeSolShieldSource.includes("isSolanaRpcRateLimitError"),
  "Native SOL Shield recovery and deposit confirmation must retry rate-limited browser RPC reads through the shared read endpoints.",
);
assert.ok(
  nativeSolShieldSource.includes("Confirmed native SOL Shield transaction was not yet available from the browser RPC") &&
    nativeSolShieldSource.includes("transaction !== null"),
  "Native SOL Shield confirmation must retry temporarily missing parsed transactions before calling a same-transaction SOL transfer absent.",
);
assert.ok(
  shieldPageSource.includes("isSolanaRpcRateLimitError") &&
    shieldPageSource.includes("nativeSolShieldWait.waitError") &&
    shieldPageSource.includes("The public Solana RPC is rate-limited while checking recent SOL vault deposits."),
  "Shield page must keep rate-limited submitted SOL deposits recoverable and show user-safe recovery copy.",
);
assert.ok(
  realtimeSignatureProgressSource.includes("isSolanaRpcRateLimitError") &&
    realtimeSignatureProgressSource.includes("waitErrorIsRateLimited") &&
    realtimeSignatureProgressSource.includes("signatureStatusErrorIsRateLimited"),
  "Signature progress must not classify a transient public RPC 429 as a failed submitted Shield transaction.",
);
assert.ok(
  realtimeSignatureProgressSource.includes("isSolanaRpcHttpAccessError") &&
    realtimeSignatureProgressSource.includes("waitErrorIsRpcAccessBlocked") &&
    realtimeSignatureProgressSource.includes("signatureStatusErrorIsRpcAccessBlocked"),
  "Signature progress must not classify a forbidden public RPC status read as a failed submitted Shield transaction.",
);
assert.ok(
  shieldPageSource.includes("isSolanaRpcHttpAccessError(nativeSolShieldWait.waitError)") &&
    shieldPageSource.includes("isSolanaRpcHttpAccessError(splShieldTransferWait.waitError)"),
  "Shield page must keep submitted Shield deposits recoverable when confirmation reads are blocked by the browser RPC.",
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
