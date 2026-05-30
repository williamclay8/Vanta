import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES,
  GROTH16_VERIFIER_ADAPTER_CIRCUIT,
  GROTH16_VERIFIER_ADAPTER_H6_PUBLIC_INPUT_COMMITMENT,
  GROTH16_VERIFIER_ADAPTER_H6_PUBLIC_INPUT_VALUE,
  GROTH16_VERIFIER_ADAPTER_PROOF_BYTE_LENGTH,
  GROTH16_VERIFIER_ADAPTER_PROOF_FORMAT_ID,
  GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_BYTE_LENGTH,
  GROTH16_VERIFIER_ADAPTER_TARGET,
  GROTH16_VERIFIER_ADAPTER_VERIFIER_INSTRUCTION_DATA_BYTE_LENGTH,
} from "./privatePoolV2Groth16VerifierAdapter.mjs";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT =
  "ops/fixtures/c01-deterministic-production-artifact-local-prep";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_FILENAME =
  "deterministic-production-artifact-build-receipt.json";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_FILENAME =
  "deterministic-production-artifact-build-manifest.json";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_VERSION =
  "vanta-private-pool-v2-c01-deterministic-production-artifact-local-prep-receipt-0.1";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_VERSION =
  "vanta-private-pool-v2-c01-deterministic-production-artifact-local-prep-manifest-0.1";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_SELECTED_BACKEND =
  "groth16-tag3-solana-v0";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_ROUTE_ID =
  "sunspot-noir-acir-gnark-groth16-solana-v0";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_CANDIDATE_SOURCE_REF =
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry_sunspot_beta18_h6_candidate/src/main.nr";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_CANDIDATE_SOURCE_SHA256 =
  "sha256:caaeb2c2767965bd5d6c68c3043b8be10b43b345f017e32c6aa67658e927d430";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_REVIEWED_SOURCE_ACIR_SHA256 =
  "sha256:9c84b109bb2cf658e645bc971855ef06a8590c8b5b65398c6ae52afc431f8bde";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_COMMAND =
  "npm run private-pool-v2:c01-deterministic-production-artifact-build";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_CHECK_COMMAND =
  "npm run private-pool-v2:c01-deterministic-production-artifact-build-check";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_GATE_EVIDENCE_REF =
  "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json";

export const C01_DETERMINISTIC_PRODUCTION_ARTIFACT_TEMPLATE_REF =
  "ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json";

function sha256(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function readArtifactFile(root, filename, label) {
  const path = join(root, filename);
  if (!existsSync(path)) {
    throw new Error(`C01 deterministic production artifact local prep missing ${label} at ${path}`);
  }
  return readFileSync(path);
}

export function resolveC01DeterministicProductionArtifactLocalPrepRoot(startDir = process.cwd()) {
  return resolve(startDir, C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT);
}

export function requiredC01DeterministicProductionArtifactFilesPresent(root) {
  return Object.values(GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES).every((filename) =>
    existsSync(join(root, filename)),
  );
}

export function buildC01DeterministicProductionArtifactBuildManifestObserved(root) {
  const proof = readArtifactFile(root, GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.proof, "proof");
  const publicWitness = readArtifactFile(
    root,
    GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.publicWitness,
    "public witness",
  );
  const verifyingKey = readArtifactFile(
    root,
    GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifyingKey,
    "verifying key",
  );
  const verifierSbf = readArtifactFile(
    root,
    GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifierSbf,
    "verifier SBF",
  );

  return {
    version: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_VERSION,
    status: "local-prep-not-reviewed-deterministic-build",
    selectedBackend: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_SELECTED_BACKEND,
    routeId: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_ROUTE_ID,
    circuit: GROTH16_VERIFIER_ADAPTER_CIRCUIT,
    target: GROTH16_VERIFIER_ADAPTER_TARGET,
    proofFormatId: GROTH16_VERIFIER_ADAPTER_PROOF_FORMAT_ID,
    proofByteLength: GROTH16_VERIFIER_ADAPTER_PROOF_BYTE_LENGTH,
    publicWitnessByteLength: GROTH16_VERIFIER_ADAPTER_PUBLIC_WITNESS_BYTE_LENGTH,
    verifierInstructionDataByteLength:
      GROTH16_VERIFIER_ADAPTER_VERIFIER_INSTRUCTION_DATA_BYTE_LENGTH,
    generatedVerifierNrPubinputs: 1,
    generatedVerifierCommitmentKeys: 0,
    verifyingKeyHashKind: "local-unsafe-h6-beta18-sunspot-vk-hash-not-production",
    productionReady: false,
    satisfiesDeterministicBuildOutputs: false,
    sourceLineage: {
      candidateSourceRef: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_CANDIDATE_SOURCE_REF,
      candidateSourceSha256: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_CANDIDATE_SOURCE_SHA256,
      requiredProductionSourceAcirSha256:
        C01_DETERMINISTIC_PRODUCTION_ARTIFACT_REVIEWED_SOURCE_ACIR_SHA256,
      reviewedSourceMigrationAccepted: false,
      sourceReviewAcceptanceRef: null,
    },
    publicInputBinding: {
      decodedPublicInputLabel: "private-spend-public-input-hash",
      decodedPublicInputValue: GROTH16_VERIFIER_ADAPTER_H6_PUBLIC_INPUT_VALUE,
      publicInputCommitment: GROTH16_VERIFIER_ADAPTER_H6_PUBLIC_INPUT_COMMITMENT,
      satisfiesProductionPublicInputBinding: false,
    },
    files: {
      proof: {
        path: GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.proof,
        byteLength: proof.length,
        sha256: sha256(proof),
      },
      publicWitness: {
        path: GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.publicWitness,
        byteLength: publicWitness.length,
        sha256: sha256(publicWitness),
      },
      verifyingKey: {
        path: GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifyingKey,
        byteLength: verifyingKey.length,
        sha256: sha256(verifyingKey),
      },
      verifierSbf: {
        path: GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifierSbf,
        byteLength: verifierSbf.length,
        sha256: sha256(verifierSbf),
      },
    },
    truthBoundary:
      "Local-prep deterministic production artifact build manifest only. This records observed Sunspot/Gnark outputs for the beta18 H6 candidate lane but does not satisfy reviewed source acceptance, trusted setup review, reproducibility review, production bundle acceptance, verifier-adapter acceptance, SBF/live lineage, or audit acceptance.",
  };
}

export function buildC01DeterministicProductionArtifactBuildReceiptObserved(root, options = {}) {
  const manifest = buildC01DeterministicProductionArtifactBuildManifestObserved(root);

  return {
    version: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_RECEIPT_VERSION,
    status: "local-prep-not-reviewed-deterministic-build",
    selectedBackend: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_SELECTED_BACKEND,
    routeId: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_ROUTE_ID,
    secretPolicy: "manifest-and-hashes-only-no-raw-proof-vk-witness-pk-keypair-or-signed-transaction-bytes",
    purpose:
      "Observed local-prep build receipt for the C01 Sunspot/Gnark deterministic production artifact lane. This is machine-readable prep evidence for engineering and reviewer intake, not reviewed deterministic production build acceptance.",
    artifactRoot: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT,
    buildManifestRef: `${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}/${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_FILENAME}`,
    gateEvidenceRef: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_GATE_EVIDENCE_REF,
    templateRef: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_TEMPLATE_REF,
    buildCommandRef: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_COMMAND,
    buildCheckCommandRef: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_CHECK_COMMAND,
    checkedAt: options.checkedAt ?? new Date().toISOString(),
    sourceLineage: manifest.sourceLineage,
    productionOutputs: {
      proofArtifactRef: `${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}/${GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.proof}`,
      proofFormatId: manifest.proofFormatId,
      proofByteLength: manifest.proofByteLength,
      publicWitnessArtifactRef: `${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}/${GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.publicWitness}`,
      publicWitnessByteLength: manifest.publicWitnessByteLength,
      productionVerifyingKeyArtifactRef: `${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}/${GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifyingKey}`,
      productionVerifyingKeyHash: `0x${manifest.files.verifyingKey.sha256.slice("sha256:".length)}`,
      verifyingKeyHashKind: manifest.verifyingKeyHashKind,
      verifierSbfArtifactRef: `${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}/${GROTH16_VERIFIER_ADAPTER_ARTIFACT_FILE_NAMES.verifierSbf}`,
      outputManifestRef: `${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}/${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_FILENAME}`,
      satisfiesDeterministicBuildOutputs: false,
    },
    publicInputBinding: manifest.publicInputBinding,
    reproducibilityReview: {
      reproducibilityReviewRef: null,
      secondBuilderOrVerifierRef: null,
      reviewerAcceptedDeterministicBuild: false,
    },
    artifactProducerAttestation: {
      artifactProducerIdentityRef: null,
      reviewerIdentityRef: null,
      reviewScopeRef: null,
      sourceReviewAcceptanceRef: null,
      buildCommandManifestRef: C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_COMMAND,
      outputManifestRef: `${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_LOCAL_PREP_ROOT}/${C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_MANIFEST_FILENAME}`,
      acceptedForC01DeterministicBuild: false,
    },
    satisfiesRequiredPositiveEvidence: {
      sourceReviewAcceptance: false,
      deterministicArtifactBuild: false,
      actualPrivateSpendProductionProofFormat: false,
      privateSpendPublicInputHashBinding: false,
      productionVerifyingKeyHash: false,
      verifierAdapter: false,
      acceptedProofMutatesStateTest: false,
      invalidProofLeavesAccountsUnchangedTest: false,
      wrongPublicInputHashLeavesAccountsUnchangedTest: false,
      wrongVerifyingKeyLeavesAccountsUnchangedTest: false,
      sbfLiveLineage: false,
      auditReviewerAcceptance: false,
    },
    truthBoundary:
      "Local-prep deterministic production artifact build receipt only. This does not satisfy the blocked C01 deterministic production artifact build gate, production bundle acceptance, verifier-adapter acceptance, SBF/live lineage, or audit acceptance.",
  };
}
