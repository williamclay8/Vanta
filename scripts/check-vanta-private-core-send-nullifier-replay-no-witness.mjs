import {
  assert,
  buildSendProofArtifact,
  createTamperedProofHex,
  makeTempRoot,
  printStatus,
  readJsonIfExists,
  removeTempRoot,
  requestJson,
  seedProofArtifactRootStores,
  startStrictNoWitnessSendOperator,
  stopOperator,
  waitForHealth,
} from "./vanta-private-core-send-no-witness-helpers.mjs";
import { join } from "node:path";

const tempRoot = makeTempRoot("private-core-send-replay-no-witness-");

async function postTransition(baseUrl, proofArtifact, resultingRoot, label) {
  return requestJson(baseUrl, "/private-core/send-transition", {
    proofArtifact,
    releaseCandidateId: `private-core-release-candidate:${label}`,
    resultingRoot,
  });
}

try {
  const { fixture, proofArtifact, verifiedReceipt } = await buildSendProofArtifact(tempRoot);
  seedProofArtifactRootStores({ tempRoot, verifiedReceipt });
  let operator = startStrictNoWitnessSendOperator({ tempRoot });

  try {
    await waitForHealth(operator.baseUrl);
    const invalidArtifact = {
      ...proofArtifact,
      proofHex: createTamperedProofHex(proofArtifact.proofHex),
    };
    const invalidResponse = await postTransition(
      operator.baseUrl,
      invalidArtifact,
      fixture.validResultingRoot,
      "invalid-proof",
    );
    assert(!invalidResponse.ok, "Invalid no-witness Send proof unexpectedly recorded a transition.");
    const afterInvalidStore = readJsonIfExists(join(tempRoot, "sends.json"));
    assert(
      !afterInvalidStore || Object.keys(afterInvalidStore.sends ?? {}).length === 0,
      "Invalid no-witness Send proof poisoned the send store.",
    );
    printStatus("strict no-witness Send invalid proof releases reservation: PASS");

    const firstResponse = await postTransition(
      operator.baseUrl,
      proofArtifact,
      fixture.validResultingRoot,
      "first",
    );
    assert(firstResponse.ok, `/private-core/send-transition first request failed: ${firstResponse.text}`);
    printStatus("strict no-witness Send first transition: PASS");

    const duplicateResponse = await postTransition(
      operator.baseUrl,
      proofArtifact,
      "0x9999999999999999999999999999999999999999999999999999999999999999",
      "duplicate",
    );
    assert(
      !duplicateResponse.ok &&
        duplicateResponse.text.includes("input nullifier is already registered"),
      "Duplicate no-witness Send transition was not rejected before mutation.",
    );
    printStatus("strict no-witness Send duplicate rejection: PASS");
  } finally {
    await stopOperator(operator.server);
  }

  operator = startStrictNoWitnessSendOperator({ tempRoot });
  try {
    await waitForHealth(operator.baseUrl);
    const restartDuplicateResponse = await postTransition(
      operator.baseUrl,
      proofArtifact,
      "0x8888888888888888888888888888888888888888888888888888888888888888",
      "restart-duplicate",
    );
    assert(
      !restartDuplicateResponse.ok &&
        restartDuplicateResponse.text.includes("input nullifier is already registered"),
      "Duplicate no-witness Send transition was not rejected after restart.",
    );
    printStatus("strict no-witness Send restart duplicate rejection: PASS");
  } finally {
    await stopOperator(operator.server);
  }
} finally {
  removeTempRoot(tempRoot);
}
