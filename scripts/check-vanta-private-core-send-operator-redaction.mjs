import {
  assert,
  assertNoForbiddenSendNoWitnessMaterial,
  buildSendProofArtifact,
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

const tempRoot = makeTempRoot("private-core-send-operator-redaction-");

try {
  const { fixture, proofArtifact, verifiedReceipt } = await buildSendProofArtifact(tempRoot);
  seedProofArtifactRootStores({ tempRoot, verifiedReceipt });
  const { baseUrl, server, stderr } = startStrictNoWitnessSendOperator({ tempRoot });

  try {
    await waitForHealth(baseUrl);
    const proofResponse = await requestJson(baseUrl, "/private-core/send-proof", { proofArtifact });
    assert(proofResponse.ok, `/private-core/send-proof failed: ${proofResponse.text}`);
    const transitionResponse = await requestJson(baseUrl, "/private-core/send-transition", {
      proofArtifact,
      releaseCandidateId: "private-core-release-candidate:send-redaction-check",
      resultingRoot: fixture.validResultingRoot,
    });
    assert(transitionResponse.ok, `/private-core/send-transition failed: ${transitionResponse.text}`);

    const sendProofStore = readJsonIfExists(join(tempRoot, "send-proofs.json"));
    const sendStore = readJsonIfExists(join(tempRoot, "sends.json"));
    assertNoForbiddenSendNoWitnessMaterial(proofResponse.body, "Send proof HTTP response");
    assertNoForbiddenSendNoWitnessMaterial(transitionResponse.body, "Send transition HTTP response");
    assertNoForbiddenSendNoWitnessMaterial(sendProofStore, "Send proof store");
    assertNoForbiddenSendNoWitnessMaterial(sendStore, "Send transition store");
    printStatus("strict no-witness Send operator response redaction: PASS");
    printStatus("strict no-witness Send operator store redaction: PASS");
  } finally {
    await stopOperator(server);
    if (stderr().includes("Error:")) {
      console.error(stderr());
    }
  }
} finally {
  removeTempRoot(tempRoot);
}
