import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createVantaProgrammaticProductionPrivacyContract } from "../src/readiness/programmaticProductionPrivacyContract.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-product-action-contract-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function requireIncludes(source, marker, message) {
  assert.ok(source.includes(marker), message ?? `Missing marker: ${marker}`);
}

function assertBlocked(result, blocker) {
  assert.ok(
    result.blockers.includes(blocker),
    `Expected ${result.action} blockers to include ${blocker}; got ${result.blockers.join(", ")}`,
  );
}

try {
  mkdirSync(tempTsDir, { recursive: true });
  writeFileSync(
    join(tempTsDir, "privatePoolV2ProductActionContract.ts"),
    readRepoFile("src/privacy/privatePoolV2ProductActionContract.ts"),
  );

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      join(tempTsDir, "privatePoolV2ProductActionContract.ts"),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  const {
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT,
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_ADOPTION,
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_VERSION,
    evaluateVantaPrivatePoolV2SendActionContract,
    evaluateVantaPrivatePoolV2SwapActionContract,
    evaluateVantaPrivatePoolV2UnshieldActionContract,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProductActionContract.js")).href);

  assert.equal(
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_VERSION,
    "vanta-private-pool-v2-product-action-contract-0.1",
  );
  assert.equal(
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT.actions.send.localVisibleCompletionScope,
    "legacy-local-transition-not-production-private",
  );
  assert.equal(
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT.actions.unshield.localVisibleCompletionScope,
    "public-operator-release-not-private",
  );
  assert.equal(
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT.actions.swap.localVisibleCompletionScope,
    "swap-beta-route-not-private",
  );
  assert.equal(
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT.adoption.status,
    "send-swap-unshield-ui-authoritative",
  );
  assert.equal(
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_ADOPTION.status,
    "send-swap-unshield-ui-authoritative",
  );
  assert.equal(
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_ADOPTION.send.productSurfaceStatus,
    "evaluator-authoritative",
  );
  assert.equal(
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_ADOPTION.swap.productSurfaceStatus,
    "evaluator-authoritative",
  );
  assert.equal(
    VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_ADOPTION.unshield.productSurfaceStatus,
    "evaluator-authoritative",
  );

  const programmaticProductionPrivacyContract = createVantaProgrammaticProductionPrivacyContract();
  assert.equal(programmaticProductionPrivacyContract.productionPrivateReady, false);
  assert.equal(programmaticProductionPrivacyContract.privacyClaimAllowed, false);
  assert.equal(programmaticProductionPrivacyContract.mainnetReady, false);

  const legacySend = evaluateVantaPrivatePoolV2SendActionContract({
    legacyUiStatus: "complete",
    productionPrivacyClaimsLocked: true,
  });
  assert.equal(legacySend.legacyVisibleCompletionAllowed, true);
  assert.equal(legacySend.localPrivateCompletionAllowed, false);
  assert.equal(legacySend.productionPrivateCompletionAllowed, false);
  assert.equal(legacySend.visibleCompletionScope, "legacy-local-transition-not-production-private");
  assertBlocked(legacySend, "actual-private-spend-runtime-proof-service-ready");
  assertBlocked(legacySend, "protocol-settlement-receipt-bound");

  const localPrivateSend = {
    legacyUiStatus: "complete",
    privateCoreExecutionStatus: "verified",
    sendLedgerGateReady: true,
    runtimeActualPrivateSpendProofServiceReady: true,
    noWitnessProofArtifactPresent: true,
    operatorProofReceiptPresent: true,
    operatorProofSendLinkReady: true,
    operatorSendBoundaryReady: true,
    operatorContinuityReady: true,
    resultingRootRecorded: true,
    protocolSettlementReceiptBound: true,
    replayProtectionLinked: true,
    memoCiphertextBodyHashBound: true,
    liveMainnetSettlementReviewed: false,
    productionVerifierAccepted: false,
    sharedAnonymityReviewed: false,
    relayerSeparationReviewed: false,
    auditAccepted: false,
    programmaticProductionPrivateReady: false,
    programmaticPrivacyClaimAllowed: false,
    programmaticMainnetReady: false,
    productionPrivacyClaimsLocked: true,
    externalReviewAccepted: false,
    ownerApprovedProductionScope: false,
  };
  const sendLocalResult = evaluateVantaPrivatePoolV2SendActionContract(localPrivateSend);
  assert.equal(sendLocalResult.localPrivateCompletionAllowed, true);
  assert.equal(sendLocalResult.productionPrivateCompletionAllowed, false);
  assert.equal(sendLocalResult.visibleCompletionScope, "local-proof-bound-not-production-private");
  assertBlocked(sendLocalResult, "live-mainnet-settlement-reviewed");
  assertBlocked(sendLocalResult, "production-verifier-accepted");
  assertBlocked(sendLocalResult, "shared-anonymity-reviewed");
  assertBlocked(sendLocalResult, "relayer-separation-reviewed");
  assertBlocked(sendLocalResult, "audit-accepted");
  assertBlocked(sendLocalResult, "programmatic-production-private-ready");
  assertBlocked(sendLocalResult, "programmatic-privacy-claim-allowed");
  assertBlocked(sendLocalResult, "programmatic-mainnet-ready");
  assertBlocked(sendLocalResult, "owner-approved-production-scope");

  for (const [field, value, blocker] of [
    ["privateCoreExecutionStatus", "pending", "private-core-send-execution-verified"],
    ["sendLedgerGateReady", false, "send-ledger-gate-ready"],
    [
      "runtimeActualPrivateSpendProofServiceReady",
      false,
      "actual-private-spend-runtime-proof-service-ready",
    ],
    ["noWitnessProofArtifactPresent", false, "no-witness-proof-artifact-present"],
    ["operatorProofReceiptPresent", false, "operator-proof-receipt-present"],
    ["operatorProofSendLinkReady", false, "operator-proof-send-link-ready"],
    ["operatorSendBoundaryReady", false, "operator-send-boundary-ready"],
    ["operatorContinuityReady", false, "operator-continuity-ready"],
    ["resultingRootRecorded", false, "resulting-root-recorded"],
    ["protocolSettlementReceiptBound", false, "protocol-settlement-receipt-bound"],
    ["replayProtectionLinked", false, "replay-protection-linked"],
    ["memoCiphertextBodyHashBound", false, "memo-ciphertext-body-hash-bound"],
  ]) {
    const broken = { ...localPrivateSend, [field]: value };
    const result = evaluateVantaPrivatePoolV2SendActionContract(broken);
    assert.equal(result.localPrivateCompletionAllowed, false, `Send ${field} must fail closed.`);
    assertBlocked(result, blocker);
  }

  const productionSendWithCurrentProgrammaticGate = evaluateVantaPrivatePoolV2SendActionContract({
    ...localPrivateSend,
    liveMainnetSettlementReviewed: true,
    productionVerifierAccepted: true,
    sharedAnonymityReviewed: true,
    relayerSeparationReviewed: true,
    auditAccepted: true,
    programmaticProductionPrivateReady:
      programmaticProductionPrivacyContract.productionPrivateReady,
    programmaticPrivacyClaimAllowed:
      programmaticProductionPrivacyContract.privacyClaimAllowed,
    programmaticMainnetReady: programmaticProductionPrivacyContract.mainnetReady,
    productionPrivacyClaimsLocked: false,
    externalReviewAccepted: true,
    ownerApprovedProductionScope: true,
  });
  assert.equal(productionSendWithCurrentProgrammaticGate.productionPrivateCompletionAllowed, false);
  assertBlocked(
    productionSendWithCurrentProgrammaticGate,
    "programmatic-production-private-ready",
  );
  assertBlocked(productionSendWithCurrentProgrammaticGate, "programmatic-privacy-claim-allowed");
  assertBlocked(productionSendWithCurrentProgrammaticGate, "programmatic-mainnet-ready");

  const productionSend = evaluateVantaPrivatePoolV2SendActionContract({
    ...localPrivateSend,
    liveMainnetSettlementReviewed: true,
    productionVerifierAccepted: true,
    sharedAnonymityReviewed: true,
    relayerSeparationReviewed: true,
    auditAccepted: true,
    programmaticProductionPrivateReady: true,
    programmaticPrivacyClaimAllowed: true,
    programmaticMainnetReady: true,
    productionPrivacyClaimsLocked: false,
    externalReviewAccepted: true,
    ownerApprovedProductionScope: true,
  });
  assert.equal(productionSend.productionPrivateCompletionAllowed, true);

  const betaSwap = evaluateVantaPrivatePoolV2SwapActionContract({
    uiStatus: "complete",
    productionPrivacyClaimsLocked: true,
  });
  assert.equal(betaSwap.legacyVisibleCompletionAllowed, true);
  assert.equal(betaSwap.localPrivateCompletionAllowed, false);
  assert.equal(betaSwap.productionPrivateCompletionAllowed, false);
  assert.equal(betaSwap.visibleCompletionScope, "swap-beta-route-not-private");
  assertBlocked(betaSwap, "protocol-settlement-receipt-bound");
  assertBlocked(betaSwap, "swap-to-shielded-proof-receipt-present");
  assertBlocked(betaSwap, "no-witness-proof-receipt-ready");

  const localPrivateSwap = {
    uiStatus: "complete",
    exactSpendableNoteSelected: true,
    quoteFresh: true,
    canonicalSwapBridgePresent: true,
    committedSettlementTermsReady: true,
    operatorSwapAuthorizationPresent: true,
    protocolSettlementReceiptBound: true,
    swapToShieldedProofReceiptPresent: true,
    noWitnessProofReceiptReady: true,
    replayProtectionLinked: true,
    outputCommitmentBound: true,
    resultingRootRecorded: true,
    liveMainnetSettlementReviewed: false,
    productionVerifierAccepted: false,
    sharedAnonymityReviewed: false,
    relayerSeparationReviewed: false,
    auditAccepted: false,
    programmaticProductionPrivateReady: false,
    programmaticPrivacyClaimAllowed: false,
    programmaticMainnetReady: false,
    productionPrivacyClaimsLocked: true,
    externalReviewAccepted: false,
    ownerApprovedProductionScope: false,
  };
  const swapLocalResult = evaluateVantaPrivatePoolV2SwapActionContract(localPrivateSwap);
  assert.equal(swapLocalResult.localPrivateCompletionAllowed, true);
  assert.equal(swapLocalResult.productionPrivateCompletionAllowed, false);
  assert.equal(swapLocalResult.visibleCompletionScope, "local-proof-bound-not-production-private");
  assertBlocked(swapLocalResult, "live-mainnet-settlement-reviewed");
  assertBlocked(swapLocalResult, "production-verifier-accepted");
  assertBlocked(swapLocalResult, "shared-anonymity-reviewed");
  assertBlocked(swapLocalResult, "relayer-separation-reviewed");
  assertBlocked(swapLocalResult, "audit-accepted");
  assertBlocked(swapLocalResult, "programmatic-production-private-ready");
  assertBlocked(swapLocalResult, "programmatic-privacy-claim-allowed");
  assertBlocked(swapLocalResult, "programmatic-mainnet-ready");
  assertBlocked(swapLocalResult, "owner-approved-production-scope");

  for (const [field, value, blocker] of [
    ["uiStatus", "finalizing_state", "swap-ui-complete"],
    ["exactSpendableNoteSelected", false, "swap-exact-spendable-note-selected"],
    ["quoteFresh", false, "swap-quote-fresh"],
    ["canonicalSwapBridgePresent", false, "canonical-swap-bridge-present"],
    ["committedSettlementTermsReady", false, "committed-swap-settlement-terms-ready"],
    ["operatorSwapAuthorizationPresent", false, "operator-swap-authorization-present"],
    ["protocolSettlementReceiptBound", false, "protocol-settlement-receipt-bound"],
    ["swapToShieldedProofReceiptPresent", false, "swap-to-shielded-proof-receipt-present"],
    ["noWitnessProofReceiptReady", false, "no-witness-proof-receipt-ready"],
    ["replayProtectionLinked", false, "replay-protection-linked"],
    ["outputCommitmentBound", false, "output-commitment-bound"],
    ["resultingRootRecorded", false, "resulting-root-recorded"],
  ]) {
    const broken = { ...localPrivateSwap, [field]: value };
    const result = evaluateVantaPrivatePoolV2SwapActionContract(broken);
    assert.equal(result.localPrivateCompletionAllowed, false, `Swap ${field} must fail closed.`);
    assertBlocked(result, blocker);
  }

  const productionSwapWithCurrentProgrammaticGate =
    evaluateVantaPrivatePoolV2SwapActionContract({
      ...localPrivateSwap,
      liveMainnetSettlementReviewed: true,
      productionVerifierAccepted: true,
      sharedAnonymityReviewed: true,
      relayerSeparationReviewed: true,
      auditAccepted: true,
      programmaticProductionPrivateReady:
        programmaticProductionPrivacyContract.productionPrivateReady,
      programmaticPrivacyClaimAllowed:
        programmaticProductionPrivacyContract.privacyClaimAllowed,
      programmaticMainnetReady: programmaticProductionPrivacyContract.mainnetReady,
      productionPrivacyClaimsLocked: false,
      externalReviewAccepted: true,
      ownerApprovedProductionScope: true,
    });
  assert.equal(productionSwapWithCurrentProgrammaticGate.productionPrivateCompletionAllowed, false);
  assertBlocked(
    productionSwapWithCurrentProgrammaticGate,
    "programmatic-production-private-ready",
  );
  assertBlocked(productionSwapWithCurrentProgrammaticGate, "programmatic-privacy-claim-allowed");
  assertBlocked(productionSwapWithCurrentProgrammaticGate, "programmatic-mainnet-ready");

  const productionSwap = evaluateVantaPrivatePoolV2SwapActionContract({
    ...localPrivateSwap,
    liveMainnetSettlementReviewed: true,
    productionVerifierAccepted: true,
    sharedAnonymityReviewed: true,
    relayerSeparationReviewed: true,
    auditAccepted: true,
    programmaticProductionPrivateReady: true,
    programmaticPrivacyClaimAllowed: true,
    programmaticMainnetReady: true,
    productionPrivacyClaimsLocked: false,
    externalReviewAccepted: true,
    ownerApprovedProductionScope: true,
  });
  assert.equal(productionSwap.productionPrivateCompletionAllowed, true);

  const failClosedUnshield = evaluateVantaPrivatePoolV2UnshieldActionContract({
    uiStatus: "complete",
    operatorReleaseSignaturePresent: true,
    releaseModel: "program-tag-unshield-pda-cpi-fail-closed",
    pausedBannerVisible: true,
    productionPrivacyClaimsLocked: true,
  });
  assert.equal(failClosedUnshield.legacyVisibleCompletionAllowed, true);
  assert.equal(failClosedUnshield.localPrivateCompletionAllowed, false);
  assert.equal(failClosedUnshield.productionPrivateCompletionAllowed, false);
  assert.equal(failClosedUnshield.visibleCompletionScope, "public-operator-release-not-private");
  assertBlocked(failClosedUnshield, "tag-unshield-release-enabled");
  assertBlocked(failClosedUnshield, "withdrawals-not-paused");
  assertBlocked(failClosedUnshield, "runtime-verifier-wired");

  const localPrivateUnshield = {
    uiStatus: "complete",
    operatorReleaseSignaturePresent: true,
    releaseModel: "program-tag-unshield-pda-cpi-enabled",
    pausedBannerVisible: false,
    unshieldProofRequestReady: true,
    runtimeVerifierWired: true,
    strictNoWitnessArtifactPresent: true,
    operatorProgramReleaseReceiptPresent: true,
    protocolSettlementReceiptBound: true,
    replayProtectionLinked: true,
    releaseEnabledAuditGate: "enabled-reviewed",
    publicExitVerified: true,
    liveMainnetSettlementReviewed: false,
    productionVerifierAccepted: false,
    sharedAnonymityReviewed: false,
    relayerSeparationReviewed: false,
    auditAccepted: false,
    programmaticProductionPrivateReady: false,
    programmaticPrivacyClaimAllowed: false,
    programmaticMainnetReady: false,
    productionPrivacyClaimsLocked: true,
    externalReviewAccepted: false,
    ownerApprovedProductionScope: false,
  };
  const unshieldLocalResult =
    evaluateVantaPrivatePoolV2UnshieldActionContract(localPrivateUnshield);
  assert.equal(unshieldLocalResult.localPrivateCompletionAllowed, true);
  assert.equal(unshieldLocalResult.productionPrivateCompletionAllowed, false);
  assert.equal(unshieldLocalResult.visibleCompletionScope, "local-proof-bound-not-production-private");
  assertBlocked(unshieldLocalResult, "live-mainnet-settlement-reviewed");
  assertBlocked(unshieldLocalResult, "production-verifier-accepted");
  assertBlocked(unshieldLocalResult, "shared-anonymity-reviewed");
  assertBlocked(unshieldLocalResult, "relayer-separation-reviewed");
  assertBlocked(unshieldLocalResult, "audit-accepted");
  assertBlocked(unshieldLocalResult, "programmatic-production-private-ready");
  assertBlocked(unshieldLocalResult, "programmatic-privacy-claim-allowed");
  assertBlocked(unshieldLocalResult, "programmatic-mainnet-ready");
  assertBlocked(unshieldLocalResult, "owner-approved-production-scope");

  for (const [field, value, blocker] of [
    ["uiStatus", "release_ready", "unshield-ui-complete"],
    ["operatorReleaseSignaturePresent", false, "operator-release-signature-present"],
    ["releaseModel", "program-tag-unshield-pda-cpi-fail-closed", "tag-unshield-release-enabled"],
    ["pausedBannerVisible", true, "withdrawals-not-paused"],
    ["unshieldProofRequestReady", false, "unshield-proof-request-ready"],
    ["runtimeVerifierWired", false, "runtime-verifier-wired"],
    ["strictNoWitnessArtifactPresent", false, "strict-no-witness-artifact-present"],
    [
      "operatorProgramReleaseReceiptPresent",
      false,
      "operator-program-release-receipt-present",
    ],
    ["protocolSettlementReceiptBound", false, "protocol-settlement-receipt-bound"],
    ["replayProtectionLinked", false, "replay-protection-linked"],
    ["releaseEnabledAuditGate", "blocked", "release-enabled-audit-gate-reviewed"],
    ["publicExitVerified", false, "public-exit-verified"],
  ]) {
    const broken = { ...localPrivateUnshield, [field]: value };
    const result = evaluateVantaPrivatePoolV2UnshieldActionContract(broken);
    assert.equal(
      result.localPrivateCompletionAllowed,
      false,
      `Unshield ${field} must fail closed.`,
    );
    assertBlocked(result, blocker);
  }

  const productionUnshieldWithCurrentProgrammaticGate =
    evaluateVantaPrivatePoolV2UnshieldActionContract({
      ...localPrivateUnshield,
      liveMainnetSettlementReviewed: true,
      productionVerifierAccepted: true,
      sharedAnonymityReviewed: true,
      relayerSeparationReviewed: true,
      auditAccepted: true,
      programmaticProductionPrivateReady:
        programmaticProductionPrivacyContract.productionPrivateReady,
      programmaticPrivacyClaimAllowed:
        programmaticProductionPrivacyContract.privacyClaimAllowed,
      programmaticMainnetReady: programmaticProductionPrivacyContract.mainnetReady,
      productionPrivacyClaimsLocked: false,
      externalReviewAccepted: true,
      ownerApprovedProductionScope: true,
    });
  assert.equal(
    productionUnshieldWithCurrentProgrammaticGate.productionPrivateCompletionAllowed,
    false,
  );
  assertBlocked(
    productionUnshieldWithCurrentProgrammaticGate,
    "programmatic-production-private-ready",
  );
  assertBlocked(
    productionUnshieldWithCurrentProgrammaticGate,
    "programmatic-privacy-claim-allowed",
  );
  assertBlocked(productionUnshieldWithCurrentProgrammaticGate, "programmatic-mainnet-ready");

  const productionUnshield = evaluateVantaPrivatePoolV2UnshieldActionContract({
    ...localPrivateUnshield,
    liveMainnetSettlementReviewed: true,
    productionVerifierAccepted: true,
    sharedAnonymityReviewed: true,
    relayerSeparationReviewed: true,
    auditAccepted: true,
    programmaticProductionPrivateReady: true,
    programmaticPrivacyClaimAllowed: true,
    programmaticMainnetReady: true,
    productionPrivacyClaimsLocked: false,
    externalReviewAccepted: true,
    ownerApprovedProductionScope: true,
  });
  assert.equal(productionUnshield.productionPrivateCompletionAllowed, true);

  const packageJson = JSON.parse(readRepoFile("package.json"));
  assert.equal(
    packageJson.scripts["private-pool-v2:product-action-contract-check"],
    "node scripts/check-vanta-private-pool-v2-product-action-contract.mjs",
  );
  for (const [scriptName, marker] of [
    ["send:verify", "npm run private-pool-v2:product-action-contract-check"],
    ["swap:committed-settlement-check", "npm run private-pool-v2:product-action-contract-check"],
    ["truth:privacy-claim-gate", "npm run private-pool-v2:product-action-contract-check"],
    ["private-pool-v2:verify", "npm run private-pool-v2:product-action-contract-check"],
  ]) {
    requireIncludes(
      packageJson.scripts[scriptName] ?? "",
      marker,
      `${scriptName} must include ${marker}.`,
    );
  }

  const contractSource = readRepoFile("src/privacy/privatePoolV2ProductActionContract.ts");
  for (const marker of [
    "legacy-local-transition-not-production-private",
    "local-proof-bound-not-production-private",
    "swap-beta-route-not-private",
    "public-operator-release-not-private",
    "actual-private-spend-runtime-proof-service-ready",
    "evaluateVantaPrivatePoolV2SwapActionContract",
    "swap-to-shielded-proof-receipt-present",
    "committed-swap-settlement-terms-ready",
    "operator-swap-authorization-present",
    "no-witness-proof-receipt-ready",
    "output-commitment-bound",
    "resulting-root-recorded",
    "owner-approved-production-scope",
    "production-verifier-accepted",
    "shared-anonymity-reviewed",
    "relayer-separation-reviewed",
    "audit-accepted",
    "programmatic-production-private-ready",
    "programmatic-privacy-claim-allowed",
    "programmatic-mainnet-ready",
    "send-swap-unshield-ui-authoritative",
    "evaluator-authoritative",
    "program-tag-unshield-pda-cpi-enabled",
    "withdrawals-not-paused",
    "release-enabled-audit-gate-reviewed",
  ]) {
    requireIncludes(contractSource, marker, `Product action contract missing marker: ${marker}`);
  }

  const sendPageSource = readRepoFile("src/pages/SendPage.tsx");
  const sendWorkspaceSource = readRepoFile("src/components/SendWorkspaceCard.tsx");
  const sendReceiptModalSource = readRepoFile("src/components/SendReceiptModal.tsx");
  const sendProofLaneSource = readRepoFile("src/components/SendProofLanePanel.tsx");
  const sendSurface = `${sendPageSource}\n${sendWorkspaceSource}\n${sendReceiptModalSource}\n${sendProofLaneSource}`;
  assert.equal(
    sendSurface.includes("evaluateVantaPrivatePoolV2SendActionContract"),
    true,
    "Send UI must import the product action evaluator before claiming evaluator-authoritative adoption.",
  );
  for (const marker of [
    "productActionContract={sendProductActionContract}",
    "data-vanta-send-product-action-scope",
    "data-vanta-send-product-action-proof-scope",
    "Send proof verified; private completion blocked",
    "Product action scope:",
    "privateCoreSendExecution.status === \"verified\"",
    "sendLedgerGateStatus.ready",
    "privateCoreSendPreview.boundary.proofArtifact",
    "requestVantaPrivateCoreOperatorSendTransition",
    "runPrivateCoreSendTransition",
    "privatePoolV2LatestProtocolSettlement",
    "sendActualPrivateSpendRuntimeProofServiceReady",
    "acceptedPublicInputs?.version ===",
    "vanta-actual-private-accepted-public-inputs-0.1",
    "latestSendProofReceipt.proofSystem === \"noir-bb\"",
    "latestSendProofReceipt.proofBackend === \"local-bb-derived-artifact\"",
    "latestSendProofReceipt?.intent === \"private-send\"",
    "proofReceiptPublicInputCommitment",
    "protocolSettlementReceiptBound: sendProtocolSettlementReceiptBound",
    "Local send transition recorded",
    "Production privacy is not enabled for Send",
    "Send proof verified",
    "data-vanta-send-proof-panel",
    "data-vanta-send-receipt-modal",
  ]) {
    requireIncludes(sendSurface, marker, `Send product action surface missing marker: ${marker}`);
  }

  const swapPageSource = readRepoFile("src/pages/SwapPage.tsx");
  const swapWorkspaceSource = readRepoFile("src/components/SwapWorkspaceCard.tsx");
  const swapReceiptSource = readRepoFile("src/components/SwapReceiptModal.tsx");
  const swapSurface = `${swapPageSource}\n${swapWorkspaceSource}\n${swapReceiptSource}`;
  assert.equal(
    swapSurface.includes("evaluateVantaPrivatePoolV2SwapActionContract"),
    true,
    "Swap UI must import the product action evaluator before claiming evaluator-authoritative adoption.",
  );
  for (const marker of [
    "productActionContract={swapProductActionContract}",
    "data-vanta-swap-product-action-scope",
    "data-vanta-swap-product-action-local-private",
    "data-vanta-swap-product-action-status",
    "Swap proof verified",
    "Swap route recorded",
    "Product action scope:",
    "requestVantaPrivatePoolV2ProtocolSettlement",
    "proofReceipt?.intent !== \"swap-to-shielded\"",
    "setLastSwapProtocolSettlement(settlementReceipt)",
    "proofReceiptPublicInputCommitment",
    "proofBackend !== \"local-mock\"",
    "protocolSettlementReceiptBound: swapProtocolSettlementReceiptBound",
  ]) {
    requireIncludes(swapSurface, marker, `Swap product action surface missing marker: ${marker}`);
  }

  const unshieldPageSource = readRepoFile("src/pages/UnshieldPage.tsx");
  const unshieldExecutionSource = readRepoFile("src/components/unshield/useUnshieldExecution.ts");
  const unshieldWorkspaceSource = readRepoFile("src/components/UnshieldWorkspaceCard.tsx");
  const unshieldPausedBannerSource = readRepoFile("src/components/UnshieldPausedBanner.tsx");
  const unshieldReceiptSource = readRepoFile("src/components/unshield/useUnshieldReceiptModal.ts");
  const unshieldSurface = `${unshieldPageSource}\n${unshieldExecutionSource}\n${unshieldWorkspaceSource}\n${unshieldPausedBannerSource}\n${unshieldReceiptSource}`;
  assert.equal(
    unshieldSurface.includes("evaluateVantaPrivatePoolV2UnshieldActionContract"),
    true,
    "Unshield UI must import the product action evaluator before claiming evaluator-authoritative adoption.",
  );
  for (const marker of [
    "productActionContract={unshieldProductActionContract}",
    "data-vanta-unshield-product-action-scope",
    "Private completion remains blocked",
    "Product action scope:",
    "showPrivateReleaseCard = false",
    "setStatus(\"complete\")",
    "requestOperatorUnshield",
    "requestOperatorSolUnshield",
    "data-marker=\"unshield-withdrawals-paused-banner\"",
    "HTTP 503",
    "public operator release reported",
    "Exit visibility: public on-chain exit",
    "Proof-backed release record retained",
    "data-production-privacy-claims-locked",
  ]) {
    requireIncludes(
      unshieldSurface,
      marker,
      `Unshield product action surface missing marker: ${marker}`,
    );
  }

  const unshieldOperatorSource = readRepoFile("operator/unshield-server.mjs");
  for (const marker of [
    "program-tag-unshield-pda-cpi-fail-closed",
    "TAG_UNSHIELD program relay is fail-closed",
    "releaseModel",
  ]) {
    requireIncludes(
      unshieldOperatorSource,
      marker,
      `Unshield operator fail-closed surface missing marker: ${marker}`,
    );
  }

  const transactionEvidenceSource = readRepoFile("src/transactions/vantaTransactionEvidence.ts");
  for (const marker of [
    "createUnshieldTransactionEvidence",
    "not-live-mainnet-settlement",
    "latestProof",
    "latestRelease",
  ]) {
    requireIncludes(
      transactionEvidenceSource,
      marker,
      `Unshield transaction evidence surface missing marker: ${marker}`,
    );
  }

  const protocolClientSource = readRepoFile("src/privacy/privatePoolV2ProtocolSettlementClient.ts");
  for (const marker of [
    'proofReceipt?.intent === "private-send"',
    'proofReceipt?.assetId === "hidden:economic-terms"',
    "proofReceipt.replayKey",
    "createVantaPrivatePoolV2ActualPrivateSpendProofRequest",
    "expectedLocalProofPublicInputCommitment(expectedActualPrivateSpendProofRequest)",
    "Committed Send protocol settlement requires actual-private send fields or full stateful send terms.",
  ]) {
    requireIncludes(protocolClientSource, marker, `Protocol client missing marker: ${marker}`);
  }

  const programmaticContractSource = readRepoFile(
    "src/readiness/programmaticProductionPrivacyContract.mjs",
  );
  requireIncludes(
    programmaticContractSource,
    "npm run private-pool-v2:product-action-contract-check",
    "Programmatic privacy contract must name the product action contract check.",
  );

  console.log("Vanta Private Pool v2 product action contract check: PASS");
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
