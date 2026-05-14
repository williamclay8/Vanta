import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { Noir, type CompiledCircuit, type InputMap } from "@noir-lang/noir_js";
import {
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_RESPONSE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_RESPONSE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_RESPONSE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SWAP_TO_SHIELDED_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SWAP_TO_SHIELDED_RESPONSE,
  type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverMessage,
  type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload,
  type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverResponse,
  type VantaPrivatePoolV2BrowserWorkerClaimProverMessage,
  type VantaPrivatePoolV2BrowserWorkerClaimProverPayload,
  type VantaPrivatePoolV2BrowserWorkerClaimProverResponse,
  type VantaPrivatePoolV2BrowserWorkerProverMessage,
  type VantaPrivatePoolV2BrowserWorkerProverPayload,
  type VantaPrivatePoolV2BrowserWorkerProverResponse,
  type VantaPrivatePoolV2BrowserWorkerSendProverMessage,
  type VantaPrivatePoolV2BrowserWorkerSendProverPayload,
  type VantaPrivatePoolV2BrowserWorkerSendProverResponse,
  type VantaPrivatePoolV2BrowserWorkerShieldProverMessage,
  type VantaPrivatePoolV2BrowserWorkerShieldProverPayload,
  type VantaPrivatePoolV2BrowserWorkerShieldProverResponse,
  type VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverMessage,
  type VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverPayload,
  type VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverResponse,
} from "./privatePoolV2BrowserProverProtocol";
import {
  createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput,
  createVantaPrivatePoolV2ActualPrivateSpendCircuitNoirInputs,
} from "./privatePoolV2ActualPrivateSpendCircuitFixture";
import {
  createVantaPrivatePoolV2ClaimCircuitFixtureFromWitnessInput,
  createVantaPrivatePoolV2ClaimCircuitNoirInputs,
} from "./privatePoolV2ClaimCircuitFixture";
import {
  createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput,
  createVantaPrivatePoolV2SendCircuitNoirInputs,
} from "./privatePoolV2SendCircuitFixture";
import {
  createVantaPrivatePoolV2ShieldCircuitFixtureFromWitnessInput,
  createVantaPrivatePoolV2ShieldCircuitNoirInputs,
} from "./privatePoolV2ShieldCircuitFixture";
import {
  createVantaPrivatePoolV2SwapToShieldedCircuitFixtureFromWitnessInput,
  createVantaPrivatePoolV2SwapToShieldedCircuitNoirInputs,
} from "./privatePoolV2SwapToShieldedCircuitFixture";
import type {
  VantaPrivatePoolV2ActualPrivateSpendProofArtifact,
  VantaPrivatePoolV2ClaimProofArtifact,
  VantaPrivatePoolV2SendProofArtifact,
  VantaPrivatePoolV2ShieldProofArtifact,
  VantaPrivatePoolV2SwapToShieldedProofArtifact,
} from "./privatePoolV2Types";

const SEND_CIRCUIT = "vanta_private_pool_v2_send_entry" as const;
const SHIELD_CIRCUIT = "vanta_private_pool_v2_shield_entry" as const;
const CLAIM_CIRCUIT = "vanta_private_pool_v2_claim_entry" as const;
const SWAP_TO_SHIELDED_CIRCUIT =
  "vanta_private_pool_v2_swap_to_shielded_entry" as const;
const ACTUAL_PRIVATE_SPEND_CIRCUIT =
  "vanta_private_pool_v2_actual_private_spend_entry" as const;
const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256HexUtf8(value: string) {
  const subtle = globalThis.crypto?.subtle;
  assert(subtle, "Browser worker prover requires Web Crypto SHA-256.");
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function proofArtifactPublicInputCommitment(publicInputs: readonly string[]) {
  return `sha256:${await sha256HexUtf8(JSON.stringify(publicInputs))}`;
}

function normalizeFieldString(value: string, label: string) {
  const input = value.trim();
  const parsed = /^0x[0-9a-f]+$/u.test(input)
    ? BigInt(input)
    : /^(0|[1-9][0-9]*)$/u.test(input)
      ? BigInt(input)
      : null;

  assert(parsed !== null, `${label} must be a BN254 field string.`);
  assert(parsed < BN254_SCALAR_FIELD, `${label} must fit in BN254.`);
  return parsed.toString(10);
}

function compressedWitnessBytes(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value.slice(0));
  assert(bytes.byteLength > 0, "Browser worker prover requires non-empty compressed proof input bytes.");
  return bytes;
}

function hasCompressedWitness(
  payload: VantaPrivatePoolV2BrowserWorkerProverPayload,
): payload is VantaPrivatePoolV2BrowserWorkerProverPayload & {
  compressedWitness: ArrayBuffer | Uint8Array;
} {
  return "compressedWitness" in payload && payload.compressedWitness !== undefined;
}

function hasWitnessInput(
  payload: VantaPrivatePoolV2BrowserWorkerProverPayload,
): payload is VantaPrivatePoolV2BrowserWorkerProverPayload & {
  compiledProgramAbi: CompiledCircuit["abi"];
  witnessInput: unknown;
} {
  return "witnessInput" in payload && payload.witnessInput !== undefined;
}

function assertCompiledProgramAbi(value: unknown): asserts value is CompiledCircuit["abi"] {
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "Browser worker witness generation requires the compiled Noir program ABI.",
  );
}

function assertSendPayload(payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload) {
  assert(payload.target === "send", "Browser worker prover only supports Send.");
  assert(payload.circuit === SEND_CIRCUIT, "Browser worker prover requires the Send circuit.");
  assert(
    typeof payload.compiledProgramBytecode === "string" &&
      payload.compiledProgramBytecode.length > 0,
    "Browser worker prover requires compiled ACIR bytecode.",
  );
  assert(
    typeof payload.proofRuntimeVersion === "string" && payload.proofRuntimeVersion.length > 0,
    "Browser worker prover requires the bb.js runtime version.",
  );
  if (payload.expectedPublicInputHash !== undefined) {
    normalizeFieldString(payload.expectedPublicInputHash, "expected Send public input hash");
  }

  const compressedWitnessProvided = hasCompressedWitness(payload);
  const witnessInputProvided = hasWitnessInput(payload);
  assert(
    compressedWitnessProvided !== witnessInputProvided,
    "Browser worker prover requires exactly one Send witness source: compressedWitness or witnessInput.",
  );

  if (witnessInputProvided) {
    assertCompiledProgramAbi(payload.compiledProgramAbi);
  }
}

function assertShieldPayload(payload: VantaPrivatePoolV2BrowserWorkerShieldProverPayload) {
  assert(payload.target === "shield", "Browser worker prover only supports Shield.");
  assert(payload.circuit === SHIELD_CIRCUIT, "Browser worker prover requires the Shield circuit.");
  assert(
    typeof payload.compiledProgramBytecode === "string" &&
      payload.compiledProgramBytecode.length > 0,
    "Browser worker prover requires compiled ACIR bytecode.",
  );
  assert(
    typeof payload.proofRuntimeVersion === "string" && payload.proofRuntimeVersion.length > 0,
    "Browser worker prover requires the bb.js runtime version.",
  );
  if (payload.expectedPublicInputHash !== undefined) {
    normalizeFieldString(payload.expectedPublicInputHash, "expected Shield public input hash");
  }

  const compressedWitnessProvided = hasCompressedWitness(payload);
  const witnessInputProvided = hasWitnessInput(payload);
  assert(
    compressedWitnessProvided !== witnessInputProvided,
    "Browser worker prover requires exactly one Shield witness source: compressedWitness or witnessInput.",
  );

  if (witnessInputProvided) {
    assertCompiledProgramAbi(payload.compiledProgramAbi);
  }
}

function assertClaimPayload(payload: VantaPrivatePoolV2BrowserWorkerClaimProverPayload) {
  assert(payload.target === "claim", "Browser worker prover only supports Claim.");
  assert(payload.circuit === CLAIM_CIRCUIT, "Browser worker prover requires the Claim circuit.");
  assert(
    typeof payload.compiledProgramBytecode === "string" &&
      payload.compiledProgramBytecode.length > 0,
    "Browser worker prover requires compiled ACIR bytecode.",
  );
  assert(
    typeof payload.proofRuntimeVersion === "string" && payload.proofRuntimeVersion.length > 0,
    "Browser worker prover requires the bb.js runtime version.",
  );
  if (payload.expectedPublicInputHash !== undefined) {
    normalizeFieldString(payload.expectedPublicInputHash, "expected Claim public input hash");
  }

  const compressedWitnessProvided = hasCompressedWitness(payload);
  const witnessInputProvided = hasWitnessInput(payload);
  assert(
    compressedWitnessProvided !== witnessInputProvided,
    "Browser worker prover requires exactly one Claim witness source: compressedWitness or witnessInput.",
  );

  if (witnessInputProvided) {
    assertCompiledProgramAbi(payload.compiledProgramAbi);
  }
}

function assertSwapToShieldedPayload(
  payload: VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverPayload,
) {
  assert(
    payload.target === "swap-to-shielded",
    "Browser worker prover only supports Swap-to-shielded.",
  );
  assert(
    payload.circuit === SWAP_TO_SHIELDED_CIRCUIT,
    "Browser worker prover requires the Swap-to-shielded circuit.",
  );
  assert(
    typeof payload.compiledProgramBytecode === "string" &&
      payload.compiledProgramBytecode.length > 0,
    "Browser worker prover requires compiled ACIR bytecode.",
  );
  assert(
    typeof payload.proofRuntimeVersion === "string" && payload.proofRuntimeVersion.length > 0,
    "Browser worker prover requires the bb.js runtime version.",
  );
  if (payload.expectedPublicInputHash !== undefined) {
    normalizeFieldString(
      payload.expectedPublicInputHash,
      "expected Swap-to-shielded public input hash",
    );
  }

  const compressedWitnessProvided = hasCompressedWitness(payload);
  const witnessInputProvided = hasWitnessInput(payload);
  assert(
    compressedWitnessProvided !== witnessInputProvided,
    "Browser worker prover requires exactly one Swap-to-shielded witness source: compressedWitness or witnessInput.",
  );

  if (witnessInputProvided) {
    assertCompiledProgramAbi(payload.compiledProgramAbi);
  }
}

function assertActualPrivateSpendPayload(
  payload: VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload,
) {
  assert(
    payload.target === "actual-private-spend",
    "Browser worker prover only supports actual-private-spend.",
  );
  assert(
    payload.circuit === ACTUAL_PRIVATE_SPEND_CIRCUIT,
    "Browser worker prover requires the actual-private-spend circuit.",
  );
  assert(
    typeof payload.compiledProgramBytecode === "string" &&
      payload.compiledProgramBytecode.length > 0,
    "Browser worker prover requires compiled ACIR bytecode.",
  );
  assert(
    typeof payload.proofRuntimeVersion === "string" && payload.proofRuntimeVersion.length > 0,
    "Browser worker prover requires the bb.js runtime version.",
  );
  if (payload.expectedPublicInputHash !== undefined) {
    normalizeFieldString(
      payload.expectedPublicInputHash,
      "expected actual-private-spend public input hash",
    );
  }

  const compressedWitnessProvided = hasCompressedWitness(payload);
  const witnessInputProvided = hasWitnessInput(payload);
  assert(
    compressedWitnessProvided !== witnessInputProvided,
    "Browser worker prover requires exactly one actual-private-spend witness source: compressedWitness or witnessInput.",
  );

  if (witnessInputProvided) {
    assertCompiledProgramAbi(payload.compiledProgramAbi);
  }
}

async function generateSendCompressedWitness(
  payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload,
) {
  if (hasCompressedWitness(payload)) {
    return compressedWitnessBytes(payload.compressedWitness);
  }

  assert(hasWitnessInput(payload), "Browser worker prover requires Send witness input.");
  assertCompiledProgramAbi(payload.compiledProgramAbi);

  const fixture = createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput(
    payload.witnessInput,
  );
  const noirInputs = createVantaPrivatePoolV2SendCircuitNoirInputs(fixture);
  const noir = new Noir({
    abi: payload.compiledProgramAbi,
    bytecode: payload.compiledProgramBytecode,
  } as CompiledCircuit);
  const { witness } = await noir.execute(noirInputs as InputMap);

  return compressedWitnessBytes(witness);
}

async function generateShieldCompressedWitness(
  payload: VantaPrivatePoolV2BrowserWorkerShieldProverPayload,
) {
  if (hasCompressedWitness(payload)) {
    return compressedWitnessBytes(payload.compressedWitness);
  }

  assert(hasWitnessInput(payload), "Browser worker prover requires Shield witness input.");
  assertCompiledProgramAbi(payload.compiledProgramAbi);

  const fixture = createVantaPrivatePoolV2ShieldCircuitFixtureFromWitnessInput(
    payload.witnessInput,
  );
  const noirInputs = createVantaPrivatePoolV2ShieldCircuitNoirInputs(fixture);
  const noir = new Noir({
    abi: payload.compiledProgramAbi,
    bytecode: payload.compiledProgramBytecode,
  } as CompiledCircuit);
  const { witness } = await noir.execute(noirInputs as InputMap);

  return compressedWitnessBytes(witness);
}

async function generateClaimCompressedWitness(
  payload: VantaPrivatePoolV2BrowserWorkerClaimProverPayload,
) {
  if (hasCompressedWitness(payload)) {
    return compressedWitnessBytes(payload.compressedWitness);
  }

  assert(hasWitnessInput(payload), "Browser worker prover requires Claim witness input.");
  assertCompiledProgramAbi(payload.compiledProgramAbi);

  const fixture = createVantaPrivatePoolV2ClaimCircuitFixtureFromWitnessInput(
    payload.witnessInput,
  );
  const noirInputs = createVantaPrivatePoolV2ClaimCircuitNoirInputs(fixture);
  const noir = new Noir({
    abi: payload.compiledProgramAbi,
    bytecode: payload.compiledProgramBytecode,
  } as CompiledCircuit);
  const { witness } = await noir.execute(noirInputs as InputMap);

  return compressedWitnessBytes(witness);
}

async function generateSwapToShieldedCompressedWitness(
  payload: VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverPayload,
) {
  if (hasCompressedWitness(payload)) {
    return compressedWitnessBytes(payload.compressedWitness);
  }

  assert(
    hasWitnessInput(payload),
    "Browser worker prover requires Swap-to-shielded witness input.",
  );
  assertCompiledProgramAbi(payload.compiledProgramAbi);

  const fixture = createVantaPrivatePoolV2SwapToShieldedCircuitFixtureFromWitnessInput(
    payload.witnessInput,
  );
  const noirInputs = createVantaPrivatePoolV2SwapToShieldedCircuitNoirInputs(fixture);
  const noir = new Noir({
    abi: payload.compiledProgramAbi,
    bytecode: payload.compiledProgramBytecode,
  } as CompiledCircuit);
  const { witness } = await noir.execute(noirInputs as InputMap);

  return compressedWitnessBytes(witness);
}

async function generateActualPrivateSpendCompressedWitness(
  payload: VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload,
) {
  if (hasCompressedWitness(payload)) {
    return compressedWitnessBytes(payload.compressedWitness);
  }

  assert(
    hasWitnessInput(payload),
    "Browser worker prover requires actual-private-spend witness input.",
  );
  assertCompiledProgramAbi(payload.compiledProgramAbi);

  const fixture = createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput(
    payload.witnessInput,
  );
  const noirInputs = createVantaPrivatePoolV2ActualPrivateSpendCircuitNoirInputs(fixture);
  const noir = new Noir({
    abi: payload.compiledProgramAbi,
    bytecode: payload.compiledProgramBytecode,
  } as CompiledCircuit);
  const { witness } = await noir.execute(noirInputs as InputMap);

  return compressedWitnessBytes(witness);
}

async function proveVantaPrivatePoolV2SendInBrowserWorkerImpl(
  payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload,
): Promise<VantaPrivatePoolV2SendProofArtifact> {
  assertSendPayload(payload);
  const compressedWitness = await generateSendCompressedWitness(payload);
  const api = await Barretenberg.new({ threads: 1 });

  try {
    const backend = new UltraHonkBackend(payload.compiledProgramBytecode, api);
    const proofData = await backend.generateProof(compressedWitness);
    const verified = await backend.verifyProof(proofData);
    assert(verified, "Browser worker prover generated a proof that did not verify.");

    const publicInputs = proofData.publicInputs.map((input) => String(input));
    assert(publicInputs.length === 1, "Browser worker Send proof must expose one public input.");
    const publicInput = normalizeFieldString(publicInputs[0]!, "browser worker Send public input");
    if (payload.expectedPublicInputHash !== undefined) {
      assert(
        publicInput === normalizeFieldString(payload.expectedPublicInputHash, "expected Send public input hash"),
        "Browser worker Send proof public input does not match the expected Send public-input hash.",
      );
    }

    const acirBytecodeHash = `sha256:${await sha256HexUtf8(payload.compiledProgramBytecode)}`;
    const proofHex = bytesToHex(new Uint8Array(proofData.proof));

    return {
      acirBytecodeHash,
      backend: "barretenberg-ultrahonk",
      circuit: SEND_CIRCUIT,
      proofBackend: "local-bb-derived-artifact",
      proofHex,
      proofRuntimePackage: "@aztec/bb.js",
      proofRuntimeVersion: payload.proofRuntimeVersion,
      proofSystem: "noir-bb",
      publicInputCommitment: await proofArtifactPublicInputCommitment(publicInputs),
      publicInputLabels: ["send-public-input-hash"],
      publicInputs,
      verifyingKeyHash: acirBytecodeHash,
      verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk",
      verifyingKeyId: `local-acir-bytecode:${SEND_CIRCUIT}:${acirBytecodeHash}`,
    };
  } finally {
    await api.destroy();
  }
}

async function proveVantaPrivatePoolV2ShieldInBrowserWorkerImpl(
  payload: VantaPrivatePoolV2BrowserWorkerShieldProverPayload,
): Promise<VantaPrivatePoolV2ShieldProofArtifact> {
  assertShieldPayload(payload);
  const compressedWitness = await generateShieldCompressedWitness(payload);
  const api = await Barretenberg.new({ threads: 1 });

  try {
    const backend = new UltraHonkBackend(payload.compiledProgramBytecode, api);
    const proofData = await backend.generateProof(compressedWitness);
    const verified = await backend.verifyProof(proofData);
    assert(verified, "Browser worker prover generated a proof that did not verify.");

    const publicInputs = proofData.publicInputs.map((input) => String(input));
    assert(publicInputs.length === 1, "Browser worker Shield proof must expose one public input.");
    const publicInput = normalizeFieldString(publicInputs[0]!, "browser worker Shield public input");
    if (payload.expectedPublicInputHash !== undefined) {
      assert(
        publicInput === normalizeFieldString(payload.expectedPublicInputHash, "expected Shield public input hash"),
        "Browser worker Shield proof public input does not match the expected Shield public-input hash.",
      );
    }

    const acirBytecodeHash = `sha256:${await sha256HexUtf8(payload.compiledProgramBytecode)}`;
    const proofHex = bytesToHex(new Uint8Array(proofData.proof));

    return {
      acirBytecodeHash,
      backend: "barretenberg-ultrahonk",
      circuit: SHIELD_CIRCUIT,
      proofBackend: "local-bb-derived-artifact",
      proofHex,
      proofRuntimePackage: "@aztec/bb.js",
      proofRuntimeVersion: payload.proofRuntimeVersion,
      proofSystem: "noir-bb",
      publicInputCommitment: await proofArtifactPublicInputCommitment(publicInputs),
      publicInputLabels: ["shield-public-input-hash"],
      publicInputs,
      verifyingKeyHash: acirBytecodeHash,
      verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk",
      verifyingKeyId: `local-acir-bytecode:${SHIELD_CIRCUIT}:${acirBytecodeHash}`,
    };
  } finally {
    await api.destroy();
  }
}

async function proveVantaPrivatePoolV2ClaimInBrowserWorkerImpl(
  payload: VantaPrivatePoolV2BrowserWorkerClaimProverPayload,
): Promise<VantaPrivatePoolV2ClaimProofArtifact> {
  assertClaimPayload(payload);
  const compressedWitness = await generateClaimCompressedWitness(payload);
  const api = await Barretenberg.new({ threads: 1 });

  try {
    const backend = new UltraHonkBackend(payload.compiledProgramBytecode, api);
    const proofData = await backend.generateProof(compressedWitness);
    const verified = await backend.verifyProof(proofData);
    assert(verified, "Browser worker prover generated a proof that did not verify.");

    const publicInputs = proofData.publicInputs.map((input) => String(input));
    assert(publicInputs.length === 1, "Browser worker Claim proof must expose one public input.");
    const publicInput = normalizeFieldString(publicInputs[0]!, "browser worker Claim public input");
    if (payload.expectedPublicInputHash !== undefined) {
      assert(
        publicInput === normalizeFieldString(payload.expectedPublicInputHash, "expected Claim public input hash"),
        "Browser worker Claim proof public input does not match the expected Claim public-input hash.",
      );
    }

    const acirBytecodeHash = `sha256:${await sha256HexUtf8(payload.compiledProgramBytecode)}`;
    const proofHex = bytesToHex(new Uint8Array(proofData.proof));

    return {
      acirBytecodeHash,
      backend: "barretenberg-ultrahonk",
      circuit: CLAIM_CIRCUIT,
      proofBackend: "local-bb-derived-artifact",
      proofHex,
      proofRuntimePackage: "@aztec/bb.js",
      proofRuntimeVersion: payload.proofRuntimeVersion,
      proofSystem: "noir-bb",
      publicInputCommitment: await proofArtifactPublicInputCommitment(publicInputs),
      publicInputLabels: ["claim-public-input-hash"],
      publicInputs,
      verifyingKeyHash: acirBytecodeHash,
      verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk",
      verifyingKeyId: `local-acir-bytecode:${CLAIM_CIRCUIT}:${acirBytecodeHash}`,
    };
  } finally {
    await api.destroy();
  }
}

async function proveVantaPrivatePoolV2SwapToShieldedInBrowserWorkerImpl(
  payload: VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverPayload,
): Promise<VantaPrivatePoolV2SwapToShieldedProofArtifact> {
  assertSwapToShieldedPayload(payload);
  const compressedWitness = await generateSwapToShieldedCompressedWitness(payload);
  const api = await Barretenberg.new({ threads: 1 });

  try {
    const backend = new UltraHonkBackend(payload.compiledProgramBytecode, api);
    const proofData = await backend.generateProof(compressedWitness);
    const verified = await backend.verifyProof(proofData);
    assert(verified, "Browser worker prover generated a proof that did not verify.");

    const publicInputs = proofData.publicInputs.map((input) => String(input));
    assert(
      publicInputs.length === 1,
      "Browser worker Swap-to-shielded proof must expose one public input.",
    );
    const publicInput = normalizeFieldString(
      publicInputs[0]!,
      "browser worker Swap-to-shielded public input",
    );
    if (payload.expectedPublicInputHash !== undefined) {
      assert(
        publicInput ===
          normalizeFieldString(
            payload.expectedPublicInputHash,
            "expected Swap-to-shielded public input hash",
          ),
        "Browser worker Swap-to-shielded proof public input does not match the expected Swap-to-shielded public-input hash.",
      );
    }

    const acirBytecodeHash = `sha256:${await sha256HexUtf8(payload.compiledProgramBytecode)}`;
    const proofHex = bytesToHex(new Uint8Array(proofData.proof));

    return {
      acirBytecodeHash,
      backend: "barretenberg-ultrahonk",
      circuit: SWAP_TO_SHIELDED_CIRCUIT,
      proofBackend: "local-bb-derived-artifact",
      proofHex,
      proofRuntimePackage: "@aztec/bb.js",
      proofRuntimeVersion: payload.proofRuntimeVersion,
      proofSystem: "noir-bb",
      publicInputCommitment: await proofArtifactPublicInputCommitment(publicInputs),
      publicInputLabels: ["swap-public-input-hash"],
      publicInputs,
      verifyingKeyHash: acirBytecodeHash,
      verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk",
      verifyingKeyId: `local-acir-bytecode:${SWAP_TO_SHIELDED_CIRCUIT}:${acirBytecodeHash}`,
    };
  } finally {
    await api.destroy();
  }
}

async function proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorkerImpl(
  payload: VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload,
): Promise<VantaPrivatePoolV2ActualPrivateSpendProofArtifact> {
  assertActualPrivateSpendPayload(payload);
  const compressedWitness = await generateActualPrivateSpendCompressedWitness(payload);
  const api = await Barretenberg.new({ threads: 1 });

  try {
    const backend = new UltraHonkBackend(payload.compiledProgramBytecode, api);
    const proofData = await backend.generateProof(compressedWitness);
    const verified = await backend.verifyProof(proofData);
    assert(verified, "Browser worker prover generated a proof that did not verify.");

    const publicInputs = proofData.publicInputs.map((input) => String(input));
    assert(
      publicInputs.length === 1,
      "Browser worker actual-private-spend proof must expose one public input.",
    );
    const publicInput = normalizeFieldString(
      publicInputs[0]!,
      "browser worker actual-private-spend public input",
    );
    if (payload.expectedPublicInputHash !== undefined) {
      assert(
        publicInput ===
          normalizeFieldString(
            payload.expectedPublicInputHash,
            "expected actual-private-spend public input hash",
          ),
        "Browser worker actual-private-spend proof public input does not match the expected actual-private-spend public-input hash.",
      );
    }

    const acirBytecodeHash = `sha256:${await sha256HexUtf8(payload.compiledProgramBytecode)}`;
    const proofHex = bytesToHex(new Uint8Array(proofData.proof));

    return {
      acirBytecodeHash,
      backend: "barretenberg-ultrahonk",
      circuit: ACTUAL_PRIVATE_SPEND_CIRCUIT,
      proofBackend: "local-bb-derived-artifact",
      proofHex,
      proofRuntimePackage: "@aztec/bb.js",
      proofRuntimeVersion: payload.proofRuntimeVersion,
      proofSystem: "noir-bb",
      publicInputCommitment: await proofArtifactPublicInputCommitment(publicInputs),
      publicInputLabels: ["private-spend-public-input-hash"],
      publicInputs,
      verifyingKeyHash: acirBytecodeHash,
      verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk",
      verifyingKeyId: `local-acir-bytecode:${ACTUAL_PRIVATE_SPEND_CIRCUIT}:${acirBytecodeHash}`,
    };
  } finally {
    await api.destroy();
  }
}

export function proveVantaPrivatePoolV2SendInBrowserWorker(
  payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload,
): Promise<VantaPrivatePoolV2SendProofArtifact> {
  return proveVantaPrivatePoolV2SendInBrowserWorkerImpl(payload);
}

export function proveVantaPrivatePoolV2ShieldInBrowserWorker(
  payload: VantaPrivatePoolV2BrowserWorkerShieldProverPayload,
): Promise<VantaPrivatePoolV2ShieldProofArtifact> {
  return proveVantaPrivatePoolV2ShieldInBrowserWorkerImpl(payload);
}

export function proveVantaPrivatePoolV2ClaimInBrowserWorker(
  payload: VantaPrivatePoolV2BrowserWorkerClaimProverPayload,
): Promise<VantaPrivatePoolV2ClaimProofArtifact> {
  return proveVantaPrivatePoolV2ClaimInBrowserWorkerImpl(payload);
}

export function proveVantaPrivatePoolV2SwapToShieldedInBrowserWorker(
  payload: VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverPayload,
): Promise<VantaPrivatePoolV2SwapToShieldedProofArtifact> {
  return proveVantaPrivatePoolV2SwapToShieldedInBrowserWorkerImpl(payload);
}

export function proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker(
  payload: VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload,
): Promise<VantaPrivatePoolV2ActualPrivateSpendProofArtifact> {
  return proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorkerImpl(payload);
}

function browserWorkerErrorMessage({
  error,
  payload,
}: {
  error: unknown;
  payload: VantaPrivatePoolV2BrowserWorkerProverPayload;
}) {
  if (hasWitnessInput(payload)) {
    if (payload.target === "shield") {
      return "Private Pool v2 browser worker prover rejected the Shield witness input.";
    }

    if (payload.target === "claim") {
      return "Private Pool v2 browser worker prover rejected the Claim witness input.";
    }

    if (payload.target === "swap-to-shielded") {
      return "Private Pool v2 browser worker prover rejected the Swap-to-shielded witness input.";
    }

    if (payload.target === "actual-private-spend") {
      return "Private Pool v2 browser worker prover rejected the actual-private-spend witness input.";
    }

    return "Private Pool v2 browser worker prover rejected the Send witness input.";
  }

  return error instanceof Error ? error.message : String(error);
}

type WorkerLikeGlobal = typeof globalThis & {
  addEventListener?: (
    type: "message",
    listener: (event: MessageEvent<VantaPrivatePoolV2BrowserWorkerProverMessage>) => void,
  ) => void;
  document?: unknown;
  postMessage?: (message: VantaPrivatePoolV2BrowserWorkerProverResponse) => void;
};

const workerGlobal = globalThis as WorkerLikeGlobal;
const isWorkerScope =
  workerGlobal.document === undefined &&
  typeof workerGlobal.addEventListener === "function" &&
  typeof workerGlobal.postMessage === "function";

if (isWorkerScope) {
  workerGlobal.addEventListener!("message", (event) => {
    const message = event.data;

    if (message?.kind === VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE) {
      const sendMessage: VantaPrivatePoolV2BrowserWorkerSendProverMessage = message;
      void proveVantaPrivatePoolV2SendInBrowserWorker(sendMessage.payload)
        .then((artifact) => {
          workerGlobal.postMessage!({
            artifact,
            id: sendMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
            ok: true,
          } satisfies VantaPrivatePoolV2BrowserWorkerSendProverResponse);
        })
        .catch((error: unknown) => {
          workerGlobal.postMessage!({
            error: browserWorkerErrorMessage({ error, payload: sendMessage.payload }),
            id: sendMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
            ok: false,
          } satisfies VantaPrivatePoolV2BrowserWorkerSendProverResponse);
        });

      return;
    }

    if (message?.kind === VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_MESSAGE) {
      const shieldMessage: VantaPrivatePoolV2BrowserWorkerShieldProverMessage = message;
      void proveVantaPrivatePoolV2ShieldInBrowserWorker(shieldMessage.payload)
        .then((artifact) => {
          workerGlobal.postMessage!({
            artifact,
            id: shieldMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_RESPONSE,
            ok: true,
          } satisfies VantaPrivatePoolV2BrowserWorkerShieldProverResponse);
        })
        .catch((error: unknown) => {
          workerGlobal.postMessage!({
            error: browserWorkerErrorMessage({ error, payload: shieldMessage.payload }),
            id: shieldMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_RESPONSE,
            ok: false,
          } satisfies VantaPrivatePoolV2BrowserWorkerShieldProverResponse);
        });

      return;
    }

    if (message?.kind === VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_MESSAGE) {
      const claimMessage: VantaPrivatePoolV2BrowserWorkerClaimProverMessage = message;
      void proveVantaPrivatePoolV2ClaimInBrowserWorker(claimMessage.payload)
        .then((artifact) => {
          workerGlobal.postMessage!({
            artifact,
            id: claimMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_RESPONSE,
            ok: true,
          } satisfies VantaPrivatePoolV2BrowserWorkerClaimProverResponse);
        })
        .catch((error: unknown) => {
          workerGlobal.postMessage!({
            error: browserWorkerErrorMessage({ error, payload: claimMessage.payload }),
            id: claimMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_RESPONSE,
            ok: false,
          } satisfies VantaPrivatePoolV2BrowserWorkerClaimProverResponse);
        });

      return;
    }

    if (message?.kind === VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SWAP_TO_SHIELDED_MESSAGE) {
      const swapToShieldedMessage:
        VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverMessage = message;
      void proveVantaPrivatePoolV2SwapToShieldedInBrowserWorker(swapToShieldedMessage.payload)
        .then((artifact) => {
          workerGlobal.postMessage!({
            artifact,
            id: swapToShieldedMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SWAP_TO_SHIELDED_RESPONSE,
            ok: true,
          } satisfies VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverResponse);
        })
        .catch((error: unknown) => {
          workerGlobal.postMessage!({
            error: browserWorkerErrorMessage({
              error,
              payload: swapToShieldedMessage.payload,
            }),
            id: swapToShieldedMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SWAP_TO_SHIELDED_RESPONSE,
            ok: false,
          } satisfies VantaPrivatePoolV2BrowserWorkerSwapToShieldedProverResponse);
        });

      return;
    }

    if (message?.kind === VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_MESSAGE) {
      const actualPrivateSpendMessage:
        VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverMessage = message;
      void proveVantaPrivatePoolV2ActualPrivateSpendInBrowserWorker(
        actualPrivateSpendMessage.payload,
      )
        .then((artifact) => {
          workerGlobal.postMessage!({
            artifact,
            id: actualPrivateSpendMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_RESPONSE,
            ok: true,
          } satisfies VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverResponse);
        })
        .catch((error: unknown) => {
          workerGlobal.postMessage!({
            error: browserWorkerErrorMessage({
              error,
              payload: actualPrivateSpendMessage.payload,
            }),
            id: actualPrivateSpendMessage.id,
            kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_RESPONSE,
            ok: false,
          } satisfies VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverResponse);
        });
    }
  });
}
