import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial,
  createVantaPrivatePoolV2ProofArtifactPublicInputCommitment,
  verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact,
} from "../operator/private-pool-v2-proof-artifact.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const artifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json",
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} ${args.join(" ")} failed.`);
  }
}

function readArtifact() {
  return JSON.parse(readFileSync(artifactPath, "utf8"));
}

function tamperProofHex(proofHex) {
  const last = proofHex.at(-1);
  return `${proofHex.slice(0, -1)}${last === "0" ? "1" : "0"}`;
}

function tamperPublicInput(value) {
  if (String(value).startsWith("0x")) {
    return `0x${(BigInt(value) + 1n).toString(16)}`;
  }
  return (BigInt(value) + 1n).toString(10);
}

async function expectReject(label, artifact, expectedMessageFragment) {
  try {
    await verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact: artifact });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(
      message.includes(expectedMessageFragment),
      `${label} rejected with unexpected message: ${message}`,
    );
    console.log(`${label}: PASS`);
    return;
  }

  throw new Error(`${label} unexpectedly verified.`);
}

run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "actual-private-spend"]);
const proofArtifact = readArtifact();

assert(
  proofArtifact.circuit === "vanta_private_pool_v2_actual_private_spend_entry",
  "artifact must name Actual Private Spend circuit.",
);
assert(proofArtifact.backend === "barretenberg-ultrahonk", "artifact must name bb.js UltraHonk backend.");
assert(proofArtifact.proofBackend === "local-bb-fixture-artifact", "artifact must name local bb fixture backend.");
assert(proofArtifact.proofSystem === "noir-bb", "artifact must name Noir/bb proof system.");
assert(typeof proofArtifact.proofHex === "string" && proofArtifact.proofHex.length > 0, "artifact needs proofHex.");
assert(Array.isArray(proofArtifact.publicInputs), "artifact needs ordered publicInputs.");
assert(Array.isArray(proofArtifact.publicInputLabels), "artifact needs publicInputLabels.");
assert(
  JSON.stringify(proofArtifact.publicInputLabels) ===
    JSON.stringify(["private-spend-public-input-hash"]),
  "artifact must label the Actual Private Spend public input hash.",
);
assert(typeof proofArtifact.publicInputCommitment === "string", "artifact needs publicInputCommitment.");
assert(typeof proofArtifact.verifyingKeyHash === "string", "artifact needs verifyingKeyHash.");
assert(typeof proofArtifact.acirBytecodeHash === "string", "artifact needs acirBytecodeHash.");
assert(
  proofArtifact.acirBytecodeHash === proofArtifact.verifyingKeyHash,
  "local fixture verifyingKeyHash must be labeled as the ACIR bytecode hash.",
);
assert(
  proofArtifact.verifyingKeyHashKind === "local-acir-bytecode-hash-not-production-vk",
  "artifact must label verifyingKeyHash as local ACIR bytecode metadata.",
);
assert(proofArtifact.proofRuntimePackage === "@aztec/bb.js", "artifact must name bb.js runtime.");
assert(typeof proofArtifact.proofRuntimeVersion === "string", "artifact needs bb.js runtime version.");

assertVantaPrivatePoolV2ProofArtifactHasNoWitnessMaterial(proofArtifact);

const verifiedReceipt = await verifyVantaPrivatePoolV2ActualPrivateSpendProofArtifact({ proofArtifact });
assert(verifiedReceipt.verified === true, "valid artifact must verify.");
assert(
  verifiedReceipt.verifiedPublicInputs.privateSpendPublicInputHash === proofArtifact.publicInputs[0],
  "verified receipt must decode the Actual Private Spend public-input hash.",
);
console.log("private-pool-v2 Actual Private Spend proof artifact no-witness verification: PASS");

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact tampered proof rejection",
  {
    ...proofArtifact,
    proofHex: tamperProofHex(proofArtifact.proofHex),
  },
  "verification returned false",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact tampered public input rejection",
  {
    ...proofArtifact,
    publicInputCommitment: createVantaPrivatePoolV2ProofArtifactPublicInputCommitment([
      tamperPublicInput(proofArtifact.publicInputs[0]),
    ]),
    publicInputs: [tamperPublicInput(proofArtifact.publicInputs[0])],
  },
  "verification returned false",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact circuit relabel rejection",
  {
    ...proofArtifact,
    circuit: "vanta_private_pool_v2_send_entry",
  },
  "vanta_private_pool_v2_actual_private_spend_entry circuit",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact proofSystem relabel rejection",
  {
    ...proofArtifact,
    proofSystem: "mock",
  },
  "proofSystem noir-bb",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact backend relabel rejection",
  {
    ...proofArtifact,
    backend: "not-barretenberg-ultrahonk",
  },
  "barretenberg-ultrahonk",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact public input label relabel rejection",
  {
    ...proofArtifact,
    publicInputLabels: ["send-public-input-hash"],
  },
  "private-spend-public-input-hash",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact commitment mismatch rejection",
  {
    ...proofArtifact,
    publicInputCommitment: "sha256:00",
  },
  "publicInputCommitment mismatch",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact backend mismatch rejection",
  {
    ...proofArtifact,
    proofBackend: "remote-service",
  },
  "local-bb-fixture-artifact",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact malformed proofHex rejection",
  {
    ...proofArtifact,
    proofHex: "not-hex",
  },
  "lowercase hex proofHex",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact extra public input rejection",
  {
    ...proofArtifact,
    publicInputCommitment: createVantaPrivatePoolV2ProofArtifactPublicInputCommitment([
      ...proofArtifact.publicInputs,
      "1",
    ]),
    publicInputs: [...proofArtifact.publicInputs, "1"],
  },
  "exactly one public input",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact verifyingKeyHash tamper rejection",
  {
    ...proofArtifact,
    verifyingKeyHash: "sha256:00",
  },
  "verifyingKeyHash mismatch",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact acirBytecodeHash tamper rejection",
  {
    ...proofArtifact,
    acirBytecodeHash: "sha256:00",
  },
  "acirBytecodeHash mismatch",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact verifyingKeyId tamper rejection",
  {
    ...proofArtifact,
    verifyingKeyId: "local-acir-bytecode:vanta_private_pool_v2_actual_private_spend_entry:sha256:00",
  },
  "verifyingKeyId mismatch",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact witness sidecar rejection",
  {
    ...proofArtifact,
    witnessSource: "target/vanta_private_pool_v2_actual_private_spend_entry.gz",
  },
  "forbidden no-witness field",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact witness alias rejection",
  {
    ...proofArtifact,
    witness: { nullifier: "123" },
  },
  "forbidden no-witness field",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact privateInputs alias rejection",
  {
    ...proofArtifact,
    privateInputs: { nullifier: "123" },
  },
  "forbidden no-witness field",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact private_inputs alias rejection",
  {
    ...proofArtifact,
    private_inputs: { nullifier: "123" },
  },
  "forbidden no-witness field",
);

await expectReject(
  "private-pool-v2 Actual Private Spend proof artifact noteSecret alias rejection",
  {
    ...proofArtifact,
    noteSecret: "do-not-accept",
  },
  "forbidden no-witness field",
);

console.log("Vanta Private Pool v2 Actual Private Spend proof artifact consistency check: PASS");
