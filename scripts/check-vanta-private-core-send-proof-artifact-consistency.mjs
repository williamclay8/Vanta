import {
  assert,
  assertNoForbiddenSendNoWitnessMaterial,
  buildSendProofArtifact,
  createTamperedProofHex,
  makeTempRoot,
  printStatus,
  removeTempRoot,
  repoRoot,
} from "./vanta-private-core-send-no-witness-helpers.mjs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const tempRoot = makeTempRoot("private-core-send-proof-artifact-");

try {
  const { proofArtifact, verifiedReceipt } = await buildSendProofArtifact(tempRoot);
  assert(verifiedReceipt.verified === true, "Send proof artifact verification must return verified=true.");
  assert(
    typeof verifiedReceipt.verifiedPublicInputs?.provingInputNullifier === "string",
    "Send proof artifact verification must expose a transcript-bound input nullifier.",
  );
  assertNoForbiddenSendNoWitnessMaterial(proofArtifact, "Send proof artifact");
  printStatus("send proof artifact verification: PASS");
  printStatus("send proof artifact redaction: PASS");

  const { verifyVantaPrivateCoreSendProofArtifact } = await import(
    pathToFileURL(resolve(repoRoot, "operator/private-core-proof.mjs")).href
  );

  const tamperedPublicInputArtifact = {
    ...proofArtifact,
    circuitPublicInputs: {
      ...proofArtifact.circuitPublicInputs,
      send_economic_terms_hash: "123",
    },
  };
  try {
    await verifyVantaPrivateCoreSendProofArtifact({ proofArtifact: tamperedPublicInputArtifact });
    throw new Error("tampered send economic terms unexpectedly verified");
  } catch (error) {
    if (error instanceof Error && error.message === "tampered send economic terms unexpectedly verified") {
      throw error;
    }
  }
  printStatus("send proof artifact public-input tamper rejection: PASS");

  const tamperedProofArtifact = {
    ...proofArtifact,
    proofHex: createTamperedProofHex(proofArtifact.proofHex),
  };
  try {
    await verifyVantaPrivateCoreSendProofArtifact({ proofArtifact: tamperedProofArtifact });
    throw new Error("tampered send proof unexpectedly verified");
  } catch (error) {
    if (error instanceof Error && error.message === "tampered send proof unexpectedly verified") {
      throw error;
    }
  }
  printStatus("send proof artifact proof tamper rejection: PASS");
} finally {
  removeTempRoot(tempRoot);
}
