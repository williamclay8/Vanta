import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-local-runtime-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2LocalIndexer.ts",
  "privatePoolV2LocalProver.ts",
  "privatePoolV2LocalRelayer.ts",
  "privatePoolV2LocalVerifierRegistry.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
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
    copySource(file);
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
    patchRelativeImports(file);
  }

  const [
    {
      createVantaPrivatePoolV2ClaimProofRequest,
      createVantaPrivatePoolV2ActualPrivateSpendProofRequest,
      createVantaPrivatePoolV2SendProofRequest,
      createVantaPrivatePoolV2ShieldProofRequest,
      createVantaPrivatePoolV2SwapToShieldedProofRequest,
    },
    { createVantaPrivatePoolV2LocalIndexer },
    { createVantaPrivatePoolV2LocalProver },
    { createVantaPrivatePoolV2LocalRelayer },
    { createVantaPrivatePoolV2LocalVerifierRegistry },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalIndexer.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalRelayer.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalVerifierRegistry.js")).href),
  ]);

  const indexer = createVantaPrivatePoolV2LocalIndexer();
  const previousRoot = await indexer.getCurrentRoot("vanta-test-tree");
  const commitment = indexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:shield-output-commitment",
    treeId: "vanta-test-tree",
  });
  const currentRoot = await indexer.getCurrentRoot("vanta-test-tree");
  const merkleProof = await indexer.getMerkleProof(commitment.commitment);
  const listedCommitments = await indexer.listCommitments({
    assetId: "USDC",
    treeId: "vanta-test-tree",
  });

  assert(commitment.leafIndex === 0, "Expected first local commitment to be leaf 0.");
  assert(commitment.merkleRoot === currentRoot, "Expected appended commitment root to be current.");
  assert(merkleProof.root === currentRoot, "Expected Merkle proof to bind current root.");
  assert(listedCommitments.length === 1, "Expected one listed local commitment.");
  console.log("local indexer append: PASS");

  const nullifier = indexer.registerNullifier({
    nullifier: "field:manual-nullifier",
    spentAtSlot: 1_000_001n,
  });
  assert(nullifier.spentAtSlot === 1_000_001n, "Expected registered nullifier slot.");
  assert(
    (await indexer.getNullifier("field:manual-nullifier"))?.nullifier === "field:manual-nullifier",
    "Expected registered nullifier lookup.",
  );
  console.log("local indexer nullifier registration: PASS");

  await expectRejection(
    () =>
      indexer.registerNullifier({
        nullifier: "field:manual-nullifier",
        spentAtSlot: 1_000_002n,
      }),
    "already registered",
  );
  console.log("local indexer nullifier replay rejection: PASS");

  const proofRequest = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: 1_000_000n,
    ownerCommitment: "field:owner",
    previousRoot,
    routeCommitment: "field:route",
    sourceMintAddress: "mint:public-usdc",
    targetAssetId: "USDC",
    targetMintAddress: "mint:shielded-usdc",
    treeCommitment: commitment,
  });
  const prover = createVantaPrivatePoolV2LocalProver();
  const proof = await prover.prove(proofRequest);
  assert(await prover.verify({ proof, request: proofRequest }), "Expected local proof to verify.");
  console.log("local prover verify: PASS");

  const verifierIndexer = createVantaPrivatePoolV2LocalIndexer();
  const verifierRegistry = createVantaPrivatePoolV2LocalVerifierRegistry({
    indexer: verifierIndexer,
    prover,
  });
  const shieldReceipt = await verifierRegistry.acceptProof({
    proof,
    request: proofRequest,
  });
  assert(shieldReceipt.intent === "shield", "Expected shield receipt.");
  assert(shieldReceipt.proofSystem === "mock", "Expected local shield receipt to preserve mock proof system.");
  assert(
    shieldReceipt.shadowCommitments?.operatorVisibleTermsCommitment ===
      proofRequest.shadowCommitments?.operatorVisibleTermsCommitment,
    "Expected shield receipt to persist shadow operator-visible terms commitment.",
  );
  assert(verifierRegistry.receipts.length === 1, "Expected one verifier receipt.");
  const verifierCommitments = await verifierIndexer.listCommitments({
    assetId: "USDC",
    treeId: "vanta-test-tree",
  });
  assert(verifierCommitments.length === 1, "Expected verifier to append shield commitment.");
  assert(
    verifierCommitments[0]?.commitment === "field:shield-output-commitment",
    "Expected verifier commitment output to match shield public inputs.",
  );
  console.log("local verifier shield commitment append: PASS");
  console.log("local verifier shield receipt: PASS");

  const tamperedShadowRequest = {
    ...proofRequest,
    shadowCommitments: {
      ...proofRequest.shadowCommitments,
      operatorVisibleTermsCommitment: "0xnot-the-canonical-shadow-commitment",
    },
  };
  const tamperedShadowProof = await prover.prove(tamperedShadowRequest);
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalVerifierRegistry({
        indexer: createVantaPrivatePoolV2LocalIndexer(),
        prover,
      }).acceptProof({
        proof: tamperedShadowProof,
        request: tamperedShadowRequest,
      }),
    "shadow commitment",
  );
  console.log("local verifier shadow commitment tamper rejection: PASS");

  const tamperedProof = {
    ...proof,
    publicInputCommitment: `${proof.publicInputCommitment}:tampered`,
  };
  assert(
    !(await prover.verify({ proof: tamperedProof, request: proofRequest })),
    "Expected tampered local proof to be rejected.",
  );
  console.log("local prover tamper rejection: PASS");

  const relayer = createVantaPrivatePoolV2LocalRelayer();
  const quote = await relayer.quoteClaim({
    amountBaseUnits: 1_000_000n,
    assetId: "USDC",
    destinationAddress: "recipient-public-address",
  });
  const claim = await relayer.submitClaim({
    quote,
    serializedTransaction: "serialized-claim-transaction",
  });

  assert(claim.signature.startsWith("0x"), "Expected deterministic local claim signature.");
  assert(relayer.submittedClaims.length === 1, "Expected one submitted local relayer claim.");
  console.log("local relayer claim: PASS");

  const claimProofRequest = createVantaPrivatePoolV2ClaimProofRequest({
    amountBaseUnits: 1_000_000n,
    destinationAddress: "recipient-public-address",
    merkleProof,
    nullifier: "field:nullifier",
    ownerCommitment: "field:owner",
    quote,
  });
  const claimProof = await prover.prove(claimProofRequest);
  assert(
    await prover.verify({ proof: claimProof, request: claimProofRequest }),
    "Expected local claim proof to verify.",
  );
  console.log("local claim proof verify: PASS");

  const claimReceipt = await verifierRegistry.acceptProof({
    proof: claimProof,
    request: claimProofRequest,
  });
  assert(claimReceipt.intent === "claim", "Expected claim receipt.");
  assert(
    claimReceipt.shadowCommitments?.operatorVisibleTermsCommitment ===
      claimProofRequest.shadowCommitments?.operatorVisibleTermsCommitment,
    "Expected claim receipt to persist shadow operator-visible terms commitment.",
  );
  assert(
    (await verifierIndexer.getNullifier("field:nullifier"))?.nullifier === "field:nullifier",
    "Expected verifier registry to register claim nullifier.",
  );
  console.log("local verifier claim receipt: PASS");

  await expectRejection(
    () =>
      verifierRegistry.acceptProof({
        proof: claimProof,
        request: claimProofRequest,
      }),
    "already been accepted",
  );
  console.log("local verifier nullifier replay rejection: PASS");

  const sendPlanningIndexer = createVantaPrivatePoolV2LocalIndexer();
  const sendVerifierIndexer = createVantaPrivatePoolV2LocalIndexer();
  const sendInputPlanningCommitment = sendPlanningIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:send-input-commitment",
    treeId: "vanta-test-tree",
  });
  sendVerifierIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:send-input-commitment",
    treeId: "vanta-test-tree",
  });
  const sendRecipientPlanningCommitment = sendPlanningIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:send-recipient-output-commitment",
    treeId: "vanta-test-tree",
  });
  const sendChangePlanningCommitment = sendPlanningIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:send-change-output-commitment",
    treeId: "vanta-test-tree",
  });
  const sendProofRequest = createVantaPrivatePoolV2SendProofRequest({
    assetIdCommitment: "field:send-asset-id-commitment",
    changeLeafIndex: String(sendChangePlanningCommitment.leafIndex),
    changeOutputCommitment: sendChangePlanningCommitment.commitment,
    changeOutputRoot: sendChangePlanningCommitment.merkleRoot,
    economicsCommitment: "field:send-economics-commitment",
    inputCommitment: sendInputPlanningCommitment.commitment,
    inputRoot: sendInputPlanningCommitment.merkleRoot,
    nullifier: "field:send-nullifier",
    ownerCommitment: "field:send-owner-commitment",
    recipientLeafIndex: String(sendRecipientPlanningCommitment.leafIndex),
    recipientOutputCommitment: sendRecipientPlanningCommitment.commitment,
    recipientOutputRoot: sendRecipientPlanningCommitment.merkleRoot,
    sendContextTag: "field:send-context-tag",
    sendPublicInputHash: "field:send-public-input-hash",
  });
  const sendProof = await prover.prove(sendProofRequest);
  assert(
    await prover.verify({ proof: sendProof, request: sendProofRequest }),
    "Expected local private-send proof to verify.",
  );
  console.log("local private-send proof verify: PASS");

  const sendVerifierRegistry = createVantaPrivatePoolV2LocalVerifierRegistry({
    indexer: sendVerifierIndexer,
    prover,
  });
  const sendReceipt = await sendVerifierRegistry.acceptProof({
    proof: sendProof,
    request: sendProofRequest,
  });
  assert(sendReceipt.intent === "private-send", "Expected private-send receipt.");
  assert(sendReceipt.proofSystem === "mock", "Expected local private-send receipt to preserve mock proof system.");
  assert(sendReceipt.replayKey === "private-send:field:send-nullifier", "Expected nullifier replay key.");
  assert(
    (await sendVerifierIndexer.getNullifier("field:send-nullifier"))?.nullifier ===
      "field:send-nullifier",
    "Expected verifier registry to register private-send nullifier.",
  );
  const sendVerifierCommitments = await sendVerifierIndexer.listCommitments({
    assetId: "USDC",
    treeId: "vanta-test-tree",
  });
  assert(sendVerifierCommitments.length === 3, "Expected input plus two send output commitments.");
  assert(
    sendVerifierCommitments[1]?.commitment === sendRecipientPlanningCommitment.commitment,
    "Expected verifier registry to append recipient output commitment.",
  );
  assert(
    sendVerifierCommitments[1]?.merkleRoot === sendRecipientPlanningCommitment.merkleRoot,
    "Expected recipient output root to match verifier indexer root.",
  );
  assert(
    sendVerifierCommitments[2]?.commitment === sendChangePlanningCommitment.commitment,
    "Expected verifier registry to append change output commitment.",
  );
  assert(
    sendVerifierCommitments[2]?.merkleRoot === sendChangePlanningCommitment.merkleRoot,
    "Expected change output root to match verifier indexer root.",
  );
  console.log("local verifier private-send nullifier and output append: PASS");

  const actualPrivateSpendIndexer = createVantaPrivatePoolV2LocalIndexer();
  const actualPrivateSpendSeed = actualPrivateSpendIndexer.appendCommitment({
    assetId: "USDC:100",
    commitment: "field:actual-private-input-commitment",
    treeId: "pool:stablecoin-usdc-v1:100",
  });
  const actualPrivateSpendRequest = createVantaPrivatePoolV2ActualPrivateSpendProofRequest({
    acceptedRoot: actualPrivateSpendSeed.merkleRoot,
    assetCohort: "USDC:100",
    contextHash: "field:actual-private-context-hash",
    nullifier: "field:actual-private-nullifier",
    outputCommitments: [
      "field:actual-private-merchant-output-commitment",
      "field:actual-private-change-output-commitment",
    ],
    poolId: "pool:stablecoin-usdc-v1:100",
    privateSpendPublicInputHash: "field:actual-private-public-input-hash",
  });
  const actualPrivateSpendJson = JSON.stringify(actualPrivateSpendRequest, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  for (const forbidden of [
    "input-commitment:",
    "leaf-index:",
    "destination:",
    "amount:",
    "raw-amount",
  ]) {
    assert(
      !actualPrivateSpendJson.includes(forbidden),
      `Actual private spend proof request leaked ${forbidden}.`,
    );
  }
  const actualPrivateSpendProof = await prover.prove(actualPrivateSpendRequest);
  assert(
    await prover.verify({
      proof: actualPrivateSpendProof,
      request: actualPrivateSpendRequest,
    }),
    "Expected actual private spend proof to verify.",
  );
  const actualPrivateSpendRegistry = createVantaPrivatePoolV2LocalVerifierRegistry({
    indexer: actualPrivateSpendIndexer,
    prover,
  });
  const actualPrivateSpendReceipt = await actualPrivateSpendRegistry.acceptProof({
    proof: actualPrivateSpendProof,
    request: actualPrivateSpendRequest,
  });
  assert(
    actualPrivateSpendReceipt.proofSystem === "mock",
    "Expected local actual-private spend receipt to preserve mock proof system.",
  );
  assert(
    actualPrivateSpendReceipt.replayKey === "private-send:field:actual-private-nullifier",
    "Expected actual private spend receipt to use the nullifier replay key.",
  );
  assert(
    (await actualPrivateSpendIndexer.getNullifier("field:actual-private-nullifier"))?.nullifier ===
      "field:actual-private-nullifier",
    "Expected actual private spend acceptance to register the nullifier.",
  );
  const actualPrivateSpendCommitments = await actualPrivateSpendIndexer.listCommitments({
    assetId: "USDC:100",
    treeId: "pool:stablecoin-usdc-v1:100",
  });
  assert(
    actualPrivateSpendCommitments.length === 3,
    "Expected actual private spend acceptance to preserve the input commitment and append both output commitments.",
  );
  assert(
    actualPrivateSpendCommitments[1]?.commitment ===
      "field:actual-private-merchant-output-commitment",
    "Expected first actual private spend output commitment to be appended from output-commitment-0.",
  );
  assert(
    actualPrivateSpendCommitments[2]?.commitment ===
      "field:actual-private-change-output-commitment",
    "Expected second actual private spend output commitment to be appended from output-commitment-1.",
  );
  console.log("local verifier actual private spend nullifier and output append: PASS");

  await expectRejection(
    () =>
      sendVerifierRegistry.acceptProof({
        proof: sendProof,
        request: sendProofRequest,
      }),
    "already been accepted",
  );
  console.log("local verifier private-send receipt replay rejection: PASS");

  const sendSpentIndexer = createVantaPrivatePoolV2LocalIndexer();
  sendSpentIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:send-input-commitment",
    treeId: "vanta-test-tree",
  });
  sendSpentIndexer.registerNullifier({
    nullifier: "field:send-nullifier",
    spentAtSlot: 999_999n,
  });
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalVerifierRegistry({
        indexer: sendSpentIndexer,
        prover,
      }).acceptProof({
        proof: sendProof,
        request: sendProofRequest,
      }),
    "already registered",
  );
  console.log("local verifier private-send spent nullifier rejection: PASS");

  const sendAtomicityIndexer = createVantaPrivatePoolV2LocalIndexer();
  sendAtomicityIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:send-input-commitment",
    treeId: "vanta-test-tree",
  });
  const tamperedChangeRootRequest = {
    ...sendProofRequest,
    publicInputs: sendProofRequest.publicInputs.map((input) =>
      input.startsWith("change-output-root:") ? "change-output-root:field:wrong-root" : input,
    ),
  };
  const tamperedChangeRootProof = await prover.prove(tamperedChangeRootRequest);
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalVerifierRegistry({
        indexer: sendAtomicityIndexer,
        prover,
      }).acceptProof({
        proof: tamperedChangeRootProof,
        request: tamperedChangeRootRequest,
      }),
    "change output root",
  );
  assert(
    (await sendAtomicityIndexer.getNullifier("field:send-nullifier")) === null,
    "Expected rejected private-send transition not to register a nullifier.",
  );
  assert(
    (
      await sendAtomicityIndexer.listCommitments({
        assetId: "USDC",
        treeId: "vanta-test-tree",
      })
    ).length === 1,
    "Expected rejected private-send transition not to append partial outputs.",
  );
  console.log("local verifier private-send atomic rejection: PASS");

  const swapPlanningIndexer = createVantaPrivatePoolV2LocalIndexer();
  const swapVerifierIndexer = createVantaPrivatePoolV2LocalIndexer();
  const swapInputPlanningCommitment = swapPlanningIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:swap-input-commitment",
    treeId: "vanta-test-tree",
  });
  swapVerifierIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:swap-input-commitment",
    treeId: "vanta-test-tree",
  });
  const swapOutputPlanningCommitment = swapPlanningIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:swap-output-commitment",
    treeId: "vanta-test-tree",
  });
  const swapProofRequest = createVantaPrivatePoolV2SwapToShieldedProofRequest({
    economicsCommitment: "field:swap-economics-commitment",
    inputCommitment: swapInputPlanningCommitment.commitment,
    inputRoot: swapInputPlanningCommitment.merkleRoot,
    nullifierOrReplayCommitment: "field:swap-nullifier",
    outputCommitment: swapOutputPlanningCommitment.commitment,
    outputLeafIndex: String(swapOutputPlanningCommitment.leafIndex),
    outputRoot: swapOutputPlanningCommitment.merkleRoot,
    ownerCommitment: "field:swap-owner-commitment",
    routeCommitment: "field:swap-route-commitment",
    settlementCommitment: "field:swap-settlement-commitment",
    swapContextTag: "field:swap-context-tag",
    swapPublicInputHash: "field:swap-public-input-hash",
  });
  const swapProof = await prover.prove(swapProofRequest);
  assert(
    await prover.verify({ proof: swapProof, request: swapProofRequest }),
    "Expected local swap-to-shielded proof to verify.",
  );
  console.log("local swap-to-shielded proof verify: PASS");

  const swapVerifierRegistry = createVantaPrivatePoolV2LocalVerifierRegistry({
    indexer: swapVerifierIndexer,
    prover,
  });
  const swapReceipt = await swapVerifierRegistry.acceptProof({
    proof: swapProof,
    request: swapProofRequest,
  });
  assert(swapReceipt.intent === "swap-to-shielded", "Expected swap-to-shielded receipt.");
  assert(
    swapReceipt.proofSystem === "mock",
    "Expected local swap-to-shielded receipt to preserve mock proof system.",
  );
  assert(
    swapReceipt.replayKey === "swap-to-shielded:field:swap-nullifier",
    "Expected swap-to-shielded nullifier replay key.",
  );
  assert(
    (await swapVerifierIndexer.getNullifier("field:swap-nullifier"))?.nullifier ===
      "field:swap-nullifier",
    "Expected verifier registry to register swap-to-shielded nullifier.",
  );
  const swapVerifierCommitments = await swapVerifierIndexer.listCommitments({
    assetId: "USDC",
    treeId: "vanta-test-tree",
  });
  assert(swapVerifierCommitments.length === 2, "Expected input plus swap output commitment.");
  assert(
    swapVerifierCommitments[1]?.commitment === swapOutputPlanningCommitment.commitment,
    "Expected verifier registry to append swap output commitment.",
  );
  assert(
    swapVerifierCommitments[1]?.merkleRoot === swapOutputPlanningCommitment.merkleRoot,
    "Expected swap output root to match verifier indexer root.",
  );
  console.log("local verifier swap-to-shielded nullifier and output append: PASS");

  await expectRejection(
    () =>
      swapVerifierRegistry.acceptProof({
        proof: swapProof,
        request: swapProofRequest,
      }),
    "already been accepted",
  );
  console.log("local verifier swap-to-shielded receipt replay rejection: PASS");

  const tamperedSwapRootIndexer = createVantaPrivatePoolV2LocalIndexer();
  tamperedSwapRootIndexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:swap-input-commitment",
    treeId: "vanta-test-tree",
  });
  const tamperedSwapRootRequest = {
    ...swapProofRequest,
    publicInputs: swapProofRequest.publicInputs.map((input) =>
      input.startsWith("output-root:") ? "output-root:field:wrong-root" : input,
    ),
  };
  const tamperedSwapRootProof = await prover.prove(tamperedSwapRootRequest);
  await expectRejection(
    () =>
      createVantaPrivatePoolV2LocalVerifierRegistry({
        indexer: tamperedSwapRootIndexer,
        prover,
      }).acceptProof({
        proof: tamperedSwapRootProof,
        request: tamperedSwapRootRequest,
      }),
    "Swap-to-shielded output root",
  );
  assert(
    (await tamperedSwapRootIndexer.getNullifier("field:swap-nullifier")) === null,
    "Expected rejected swap-to-shielded transition not to register a nullifier.",
  );
  assert(
    (
      await tamperedSwapRootIndexer.listCommitments({
        assetId: "USDC",
        treeId: "vanta-test-tree",
      })
    ).length === 1,
    "Expected rejected swap-to-shielded transition not to append partial outputs.",
  );
  console.log("local verifier swap-to-shielded atomic rejection: PASS");

  await expectRejection(
    () =>
      relayer.submitClaim({
        quote,
        serializedTransaction: "serialized-claim-transaction",
      }),
    "already been submitted",
  );
  console.log("local relayer replay rejection: PASS");
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
