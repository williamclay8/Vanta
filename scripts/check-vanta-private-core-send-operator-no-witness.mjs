import {
  assert,
  assertNoForbiddenSendNoWitnessMaterial,
  buildSendProofArtifact,
  makeTempRoot,
  printStatus,
  removeTempRoot,
  requestJson,
  seedProofArtifactRootStores,
  startStrictNoWitnessSendOperator,
  stopOperator,
  waitForHealth,
} from "./vanta-private-core-send-no-witness-helpers.mjs";

const tempRoot = makeTempRoot("private-core-send-operator-no-witness-");

try {
  const { fixture, proofArtifact, verifiedReceipt, witnessPackage } = await buildSendProofArtifact(tempRoot);
  seedProofArtifactRootStores({ tempRoot, verifiedReceipt });
  const { baseUrl, server, stderr } = startStrictNoWitnessSendOperator({ tempRoot });

  try {
    await waitForHealth(baseUrl);
    const summary = await fetch(`${baseUrl}/state/private-core-summary`).then((response) =>
      response.json(),
    );
    assert(
      summary.operatorWitnessMaterialPolicy === "reject-private-witness-material",
      "Expected strict no-witness operator policy.",
    );
    printStatus("strict no-witness summary policy: PASS");

    const witnessProofResponse = await requestJson(baseUrl, "/private-core/send-proof", {
      witnessPackage,
    });
    assert(
      !witnessProofResponse.ok &&
        witnessProofResponse.text.includes("rejects any witnessPackage material"),
      "Send proof route accepted witness material in strict no-witness mode.",
    );
    printStatus("strict no-witness /private-core/send-proof witness rejection: PASS");

    const witnessTransitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
      resultingRoot: fixture.validResultingRoot,
      witnessPackage,
    });
    assert(
      !witnessTransitionResponse.ok &&
        witnessTransitionResponse.text.includes("rejects any witnessPackage material"),
      "Send transition route accepted witness material in strict no-witness mode.",
    );
    printStatus("strict no-witness /private-core/send-transition witness rejection: PASS");

    const witnessShellResponse = await requestJson(baseUrl, "/private-core/send-proof", {
      proofArtifact,
      witnessPackage: {
        publicInputs: witnessPackage.publicInputs,
        sourcePublicInputs: witnessPackage.sourcePublicInputs,
      },
    });
    assert(
      !witnessShellResponse.ok &&
        witnessShellResponse.text.includes("rejects any witnessPackage material"),
      "Send proof route accepted a witness-package shell alongside a proof artifact.",
    );
    printStatus("strict no-witness /private-core/send-proof witness-shell rejection: PASS");

    const sourceInputSidecarResponse = await requestJson(baseUrl, "/private-core/send-transition", {
      proofArtifact,
      resultingRoot: fixture.validResultingRoot,
      sourcePublicInputs: witnessPackage.sourcePublicInputs,
    });
    assert(
      !sourceInputSidecarResponse.ok &&
        sourceInputSidecarResponse.text.includes("rejects top-level sourcePublicInputs sidecars"),
      "Send transition route accepted raw source public inputs alongside a proof artifact.",
    );
    printStatus("strict no-witness /private-core/send-transition source-input sidecar rejection: PASS");

    const sourceArtifactSidecarResponse = await requestJson(baseUrl, "/private-core/send-proof", {
      proofArtifact,
      sourceArtifacts: {
        noteCommitment: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });
    assert(
      !sourceArtifactSidecarResponse.ok &&
        sourceArtifactSidecarResponse.text.includes("strict no-witness Send mode rejects sourceArtifacts"),
      "Send proof route accepted source artifacts alongside a proof artifact.",
    );
    printStatus("strict no-witness /private-core/send-proof source-artifact sidecar rejection: PASS");

    const proofOnlyResponse = await requestJson(baseUrl, "/private-core/send-proof", {
      proofArtifact,
    });
    assert(
      proofOnlyResponse.ok,
      `/private-core/send-proof rejected verifier-only Send artifact: ${proofOnlyResponse.text}`,
    );
    assertNoForbiddenSendNoWitnessMaterial(proofOnlyResponse.body, "Send proof response");
    printStatus("strict no-witness /private-core/send-proof artifact: PASS");

    const transitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
      proofArtifact,
      releaseCandidateId: "private-core-release-candidate:send-no-witness-check",
      resultingRoot: fixture.validResultingRoot,
    });
    assert(
      transitionResponse.ok,
      `/private-core/send-transition rejected verifier-only Send artifact: ${transitionResponse.text}`,
    );
    assertNoForbiddenSendNoWitnessMaterial(transitionResponse.body, "Send transition response");
    assert(transitionResponse.body?.sendRecorded === true, "Send transition must record the no-witness send.");
    printStatus("strict no-witness /private-core/send-transition artifact: PASS");
  } finally {
    await stopOperator(server);
    if (stderr().includes("Error:")) {
      console.error(stderr());
    }
  }
} finally {
  removeTempRoot(tempRoot);
}
