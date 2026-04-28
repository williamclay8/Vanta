import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-actual-private-transaction-rail-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "actualPrivateTransactionRail.ts",
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2LocalIndexer.ts",
  "privatePoolV2LocalProver.ts",
  "privatePoolV2LocalVerifierRegistry.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stringifyAttackerVisibleSurface(value) {
  return JSON.stringify(value, (_, item) =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

async function expectRejection(action, expectedMessage) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(
      message.includes(expectedMessage),
      `Expected rejection containing "${expectedMessage}", received "${message}".`,
    );
    return;
  }

  throw new Error(`Expected rejection containing "${expectedMessage}".`);
}

try {
  mkdirSync(tempTsDir, { recursive: true });

  for (const file of sourceFiles) {
    writeFileSync(join(tempTsDir, file), readFileSync(resolve(repoRoot, "src/privacy", file), "utf8"));
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
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

  for (const file of sourceFiles) {
    const filePath = join(tempJsDir, file.replace(/\.ts$/, ".js"));
    const source = readFileSync(filePath, "utf8").replace(
      /from "\.\/([A-Za-z0-9]+)"/g,
      'from "./$1.js"',
    );
    writeFileSync(filePath, source);
  }

  const [{
    VANTA_ACTUAL_PRIVATE_TRANSACTION_DENOMINATIONS,
    VANTA_ACTUAL_PRIVATE_TRANSACTION_RAIL_VERSION,
    VantaActualPrivateNullifierSet,
    analyzeVantaActualPrivateTransactionScenario,
    createVantaActualPrivateTransactionScenario,
  }, {
    VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    createVantaPrivatePoolV2ActualPrivateSpendProofRequest,
  }, {
    createVantaPrivatePoolV2LocalIndexer,
  }, {
    createVantaPrivatePoolV2LocalProver,
  }, {
    createVantaPrivatePoolV2LocalVerifierRegistry,
  }] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "actualPrivateTransactionRail.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalIndexer.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalVerifierRegistry.js")).href),
  ]);

  const scenario = createVantaActualPrivateTransactionScenario({
    denomination: "100",
    merchantSettlementAddress: "merchant-visible-address-that-must-not-appear-in-spend",
    payerSourceWallet: "payer-visible-funding-wallet-that-must-not-appear-in-spend",
    relayerFeePayer: "independent-relayer-fee-payer",
  });
  const analysis = analyzeVantaActualPrivateTransactionScenario(scenario);

  assert(
    VANTA_ACTUAL_PRIVATE_TRANSACTION_RAIL_VERSION ===
      "vanta-actual-private-transaction-rail-0.1",
    "Unexpected actual private transaction rail version.",
  );
  assert(
    JSON.stringify(VANTA_ACTUAL_PRIVATE_TRANSACTION_DENOMINATIONS) ===
      JSON.stringify(["10", "25", "100", "500", "1000"]),
    "Actual private transaction rail must use fixed denominations for the MVP.",
  );
  assert(
    scenario.depositPublicTranscript.sourceFundingAddress ===
      "payer-visible-funding-wallet-that-must-not-appear-in-spend",
    "Deposit transcript should preserve that funding remains public.",
  );
  assert(
    scenario.spendPublicTranscript.relayerFeePayer === "independent-relayer-fee-payer",
    "Spend transcript must be relayer-submitted.",
  );
  assert(analysis.depositIsPublicByDesign === true, "Deposit publicness must be explicit.");
  assert(analysis.fixedDenomination === true, "Expected fixed-denomination analysis.");
  assert(analysis.relayerSeparated === true, "Expected relayer separation.");
  assert(
    analysis.spendTranscriptPrivateEnoughForMvp === true,
    `Expected private spend transcript to pass, blockers: ${analysis.blockers.join(", ")}`,
  );
  assert(
    analysis.leakageFindings.length === 0,
    `Expected no spend transcript leakage, found ${JSON.stringify(analysis.leakageFindings)}.`,
  );

  const spendPublicJson = stringifyAttackerVisibleSurface(scenario.spendPublicTranscript);
  for (const forbidden of [
    scenario.secretPacket.payerSourceWallet,
    scenario.secretPacket.merchantSettlementAddress,
    scenario.secretPacket.rawAmountBaseUnits,
    scenario.secretPacket.noteSecret,
    scenario.secretPacket.changeNoteSecret,
    scenario.secretPacket.inputCommitment,
    scenario.depositPublicTranscript.transactionSignature,
  ]) {
    assert(!spendPublicJson.includes(forbidden), `Spend transcript leaked ${forbidden}.`);
  }
  assert(
    !Object.prototype.hasOwnProperty.call(scenario.spendPublicTranscript, "inputLeafIndex"),
    "Spend transcript leaked inputLeafIndex field.",
  );
  assert(
    !Object.prototype.hasOwnProperty.call(scenario.spendPublicTranscript, "inputCommitment"),
    "Spend transcript leaked inputCommitment field.",
  );
  console.log("actual private spend transcript redaction: PASS");

  const spendProofRequest = createVantaPrivatePoolV2ActualPrivateSpendProofRequest({
    acceptedRoot: scenario.spendPublicTranscript.acceptedRoot,
    assetCohort: scenario.spendPublicTranscript.assetCohort,
    contextHash: scenario.spendPublicTranscript.receiptCommitment,
    nullifier: scenario.spendPublicTranscript.nullifier,
    outputCommitments: scenario.spendPublicTranscript.outputCommitments,
    poolId: "pool:stablecoin-usdc-v1:100",
    privateSpendPublicInputHash: scenario.spendPublicTranscript.proofPublicInputHash,
  });
  assert(
    spendProofRequest.assetId === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    "Actual private spend request must use the hidden-economics asset sentinel.",
  );
  assert(
    spendProofRequest.amountBaseUnits === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    "Actual private spend request must use the hidden-economics amount sentinel.",
  );
  const spendProofRequestJson = stringifyAttackerVisibleSurface(spendProofRequest);
  for (const forbidden of [
    scenario.secretPacket.payerSourceWallet,
    scenario.secretPacket.merchantSettlementAddress,
    scenario.secretPacket.rawAmountBaseUnits,
    scenario.secretPacket.noteSecret,
    scenario.secretPacket.changeNoteSecret,
    scenario.secretPacket.inputCommitment,
    scenario.depositPublicTranscript.transactionSignature,
    "input-commitment:",
    "leaf-index:",
    "destination:",
    "amount:",
    "source-wallet:",
  ]) {
    assert(!spendProofRequestJson.includes(forbidden), `Actual private spend proof request leaked ${forbidden}.`);
  }
  const solscanLinkageAnalysis = analyzeVantaActualPrivateTransactionScenario(scenario, {
    arbitraryExactAmountBaseUnits: "123456789",
    attackerVisibleSpendRequest: spendProofRequest,
    plaintextMemo: null,
  });
  assert(
    solscanLinkageAnalysis.spendTranscriptPrivateEnoughForMvp === true,
    `Expected Solscan linkage gate to pass, blockers: ${solscanLinkageAnalysis.blockers.join(", ")}`,
  );
  assert(
    solscanLinkageAnalysis.leakageFindings.length === 0,
    `Expected no attacker-visible leakage, found ${JSON.stringify(solscanLinkageAnalysis.leakageFindings)}.`,
  );
  console.log("actual private spend proof request redaction: PASS");

  const solscanNegativeFixtures = [
    ["source-wallet", { sourceWallet: scenario.secretPacket.payerSourceWallet }],
    ["merchant-address", { merchantAddress: scenario.secretPacket.merchantSettlementAddress }],
    ["raw-amount", { amountBaseUnits: scenario.secretPacket.rawAmountBaseUnits }],
    ["note-secret", { noteSecret: scenario.secretPacket.noteSecret }],
    ["input-commitment", { inputCommitment: scenario.secretPacket.inputCommitment }],
    ["leaf-index", { inputLeafIndex: scenario.secretPacket.inputLeafIndex }],
    ["deposit-signature", { depositSignature: scenario.depositPublicTranscript.transactionSignature }],
    ["plaintext-memo", { publicMemo: `settle ${scenario.secretPacket.merchantSettlementAddress}` }],
    ["arbitrary-exact-amount", { amountBaseUnits: "123456789" }],
  ];
  for (const [label, attackerVisibleSpendRequest] of solscanNegativeFixtures) {
    const negativeAnalysis = analyzeVantaActualPrivateTransactionScenario(scenario, {
      arbitraryExactAmountBaseUnits: "123456789",
      attackerVisibleSpendRequest,
      plaintextMemo: label === "plaintext-memo" ? attackerVisibleSpendRequest.publicMemo : null,
    });
    assert(
      negativeAnalysis.blockers.includes("spend-transcript-leaks-private-linkage"),
      `Expected negative fixture ${label} to block Solscan linkage readiness.`,
    );
  }
  console.log("actual private Solscan linkage negative fixtures: PASS");

  const indexer = createVantaPrivatePoolV2LocalIndexer();
  const prover = createVantaPrivatePoolV2LocalProver();
  const verifier = createVantaPrivatePoolV2LocalVerifierRegistry({ indexer, prover });
  const spendProof = await prover.prove(spendProofRequest);
  const receipt = await verifier.acceptProof({
    proof: spendProof,
    request: spendProofRequest,
  });
  const acceptedCommitments = await indexer.listCommitments({
    assetId: scenario.spendPublicTranscript.assetCohort,
    treeId: "pool:stablecoin-usdc-v1:100",
  });
  assert(receipt.replayKey === `private-send:${scenario.spendPublicTranscript.nullifier}`, "Expected actual private spend receipt to replay-key by nullifier.");
  assert(
    (await indexer.getNullifier(scenario.spendPublicTranscript.nullifier))?.nullifier ===
      scenario.spendPublicTranscript.nullifier,
    "Expected verifier to register actual private spend nullifier.",
  );
  assert(
    acceptedCommitments.length === scenario.spendPublicTranscript.outputCommitments.length,
    "Expected verifier to append actual private spend output commitments.",
  );
  assert(
    acceptedCommitments.every((commitment, index) =>
      commitment.commitment === scenario.spendPublicTranscript.outputCommitments[index]
    ),
    "Expected verifier output commitments to match the actual private spend request.",
  );
  await expectRejection(
    () => verifier.acceptProof({ proof: spendProof, request: spendProofRequest }),
    "already been accepted",
  );
  console.log("actual private verifier acceptance: PASS");

  const sameFeePayerScenario = createVantaActualPrivateTransactionScenario({
    payerSourceWallet: "same-wallet",
    relayerFeePayer: "same-wallet",
  });
  const sameFeePayerAnalysis =
    analyzeVantaActualPrivateTransactionScenario(sameFeePayerScenario);
  assert(
    sameFeePayerAnalysis.blockers.includes("relayer-fee-payer-matches-source-wallet"),
    "Expected same fee payer to block actual private transaction readiness.",
  );
  console.log("actual private relayer separation guard: PASS");

  await expectRejection(
    () => createVantaActualPrivateTransactionScenario({ denomination: "123" }),
    "supported fixed denomination",
  );
  console.log("actual private fixed denomination guard: PASS");

  const nullifiers = new VantaActualPrivateNullifierSet();
  const firstAcceptance = nullifiers.accept(scenario.spendPublicTranscript.nullifier);
  assert(firstAcceptance.accepted === true, "Expected first nullifier acceptance.");
  assert(
    nullifiers.has(scenario.spendPublicTranscript.nullifier),
    "Expected nullifier set lookup after acceptance.",
  );
  await expectRejection(
    () => nullifiers.accept(scenario.spendPublicTranscript.nullifier),
    "nullifier replay rejected",
  );
  console.log("actual private nullifier replay guard: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
