import {
  inspectGenericPhase1EncoderBackendProvingSessionForLifecycleNode,
  inspectGenericPhase1EncoderBackendProvingSessionFreezeForLifecycleNode,
  inspectGenericPhase1EncoderBackendWitnessPackageForLifecycleNode,
  inspectGenericPhase1EncoderBackendWitnessPackageFreezeForLifecycleNode,
  inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForLifecycleNode,
  inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForLifecycleNode,
  inspectGenericPhase1EncoderConstraintSystemPackageForLifecycleNode,
  inspectGenericPhase1EncoderConstraintSystemPackageFreezeForLifecycleNode,
  inspectGenericPhase1EncoderProofReceiptForLifecycleNode,
  inspectGenericPhase1EncoderProofReceiptFreezeForLifecycleNode,
  inspectGenericPhase1EncoderProofVerificationReceiptForLifecycleNode,
  inspectGenericPhase1EncoderProofVerificationReceiptFreezeForLifecycleNode,
  inspectGenericPhase1EncoderProvingInputPackageForLifecycleNode,
  inspectGenericPhase1EncoderProvingInputPackageFreezeForLifecycleNode,
  inspectGenericPhase1EncoderProvingInputReadinessForLifecycleNode,
  inspectGenericPhase1EncoderProvingInputReadinessFreezeForLifecycleNode,
  inspectGenericPhase1EncoderVerificationAttestationForLifecycleNode,
  inspectGenericPhase1EncoderVerificationAttestationFreezeForLifecycleNode,
} from "@/zk/backendEncoderStub";

export function InternalCanonicalLifecycleProvingPanel({
  lookupLifecycleId,
}: {
  lookupLifecycleId: string;
}) {
  const encoderProvingInputReadiness =
    inspectGenericPhase1EncoderProvingInputReadinessForLifecycleNode(lookupLifecycleId);
  const encoderProvingInputReadinessFreeze =
    inspectGenericPhase1EncoderProvingInputReadinessFreezeForLifecycleNode(lookupLifecycleId);
  const encoderConstraintSystemHandoffReadiness =
    inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForLifecycleNode(lookupLifecycleId);
  const encoderConstraintSystemHandoffReadinessFreeze =
    inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForLifecycleNode(lookupLifecycleId);
  const encoderConstraintSystemPackage =
    inspectGenericPhase1EncoderConstraintSystemPackageForLifecycleNode(lookupLifecycleId);
  const encoderConstraintSystemPackageFreeze =
    inspectGenericPhase1EncoderConstraintSystemPackageFreezeForLifecycleNode(lookupLifecycleId);
  const encoderProvingInputPackage =
    inspectGenericPhase1EncoderProvingInputPackageForLifecycleNode(lookupLifecycleId);
  const encoderProvingInputPackageFreeze =
    inspectGenericPhase1EncoderProvingInputPackageFreezeForLifecycleNode(lookupLifecycleId);
  const encoderBackendWitnessPackage =
    inspectGenericPhase1EncoderBackendWitnessPackageForLifecycleNode(lookupLifecycleId);
  const encoderBackendWitnessPackageFreeze =
    inspectGenericPhase1EncoderBackendWitnessPackageFreezeForLifecycleNode(lookupLifecycleId);
  const encoderBackendProvingSession =
    inspectGenericPhase1EncoderBackendProvingSessionForLifecycleNode(lookupLifecycleId);
  const encoderBackendProvingSessionFreeze =
    inspectGenericPhase1EncoderBackendProvingSessionFreezeForLifecycleNode(lookupLifecycleId);
  const encoderProofReceipt =
    inspectGenericPhase1EncoderProofReceiptForLifecycleNode(lookupLifecycleId);
  const encoderProofReceiptFreeze =
    inspectGenericPhase1EncoderProofReceiptFreezeForLifecycleNode(lookupLifecycleId);
  const encoderProofVerificationReceipt =
    inspectGenericPhase1EncoderProofVerificationReceiptForLifecycleNode(lookupLifecycleId);
  const encoderProofVerificationReceiptFreeze =
    inspectGenericPhase1EncoderProofVerificationReceiptFreezeForLifecycleNode(lookupLifecycleId);
  const encoderVerificationAttestation =
    inspectGenericPhase1EncoderVerificationAttestationForLifecycleNode(lookupLifecycleId);
  const encoderVerificationAttestationFreeze =
    inspectGenericPhase1EncoderVerificationAttestationFreezeForLifecycleNode(lookupLifecycleId);

  return (
    <>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Proving input readiness kind</span>
            <strong>{`${encoderProvingInputReadiness.artifactKind} · v${encoderProvingInputReadiness.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Proving input readiness status</span>
            <strong>{encoderProvingInputReadiness.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderProvingInputReadiness.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Witness materialization</span>
            <strong>{encoderProvingInputReadiness.witnessMaterializationSummary}</strong>
          </div>
          <div className="review-row">
            <span>Closure provenance</span>
            <strong>{`${encoderProvingInputReadiness.fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind} · ${encoderProvingInputReadiness.fieldMaterializationNextResolvedBoundaryClosureConsumerStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderProvingInputReadiness.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen proving input readiness kind</span>
            <strong>{`${encoderProvingInputReadinessFreeze.snapshotKind} · v${encoderProvingInputReadinessFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen proving input readiness status</span>
            <strong>{encoderProvingInputReadinessFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen proving input readiness summary</span>
            <strong>{encoderProvingInputReadinessFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderProvingInputReadinessFreeze.serialized.length > 96
                ? `${encoderProvingInputReadinessFreeze.serialized.slice(0, 96)}...`
                : encoderProvingInputReadinessFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Constraint-system handoff readiness kind</span>
            <strong>{`${encoderConstraintSystemHandoffReadiness.artifactKind} · v${encoderConstraintSystemHandoffReadiness.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Constraint-system handoff status</span>
            <strong>{encoderConstraintSystemHandoffReadiness.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderConstraintSystemHandoffReadiness.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Handoff footprint</span>
            <strong>{encoderConstraintSystemHandoffReadiness.handoffFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Proving readiness provenance</span>
            <strong>{`${encoderConstraintSystemHandoffReadiness.provingInputReadinessSnapshotKind} · ${encoderConstraintSystemHandoffReadiness.provingInputReadinessStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderConstraintSystemHandoffReadiness.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen constraint-system handoff kind</span>
            <strong>{`${encoderConstraintSystemHandoffReadinessFreeze.snapshotKind} · v${encoderConstraintSystemHandoffReadinessFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen constraint-system handoff status</span>
            <strong>{encoderConstraintSystemHandoffReadinessFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen constraint-system handoff summary</span>
            <strong>{encoderConstraintSystemHandoffReadinessFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderConstraintSystemHandoffReadinessFreeze.serialized.length > 96
                ? `${encoderConstraintSystemHandoffReadinessFreeze.serialized.slice(0, 96)}...`
                : encoderConstraintSystemHandoffReadinessFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Constraint-system package kind</span>
            <strong>{`${encoderConstraintSystemPackage.artifactKind} · v${encoderConstraintSystemPackage.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Constraint-system package status</span>
            <strong>{encoderConstraintSystemPackage.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderConstraintSystemPackage.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Package footprint</span>
            <strong>{encoderConstraintSystemPackage.packageFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Constraint handoff provenance</span>
            <strong>{`${encoderConstraintSystemPackage.constraintSystemHandoffReadinessSnapshotKind} · ${encoderConstraintSystemPackage.constraintSystemHandoffReadinessStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderConstraintSystemPackage.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen constraint-system package kind</span>
            <strong>{`${encoderConstraintSystemPackageFreeze.snapshotKind} · v${encoderConstraintSystemPackageFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen constraint-system package status</span>
            <strong>{encoderConstraintSystemPackageFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen constraint-system package summary</span>
            <strong>{encoderConstraintSystemPackageFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderConstraintSystemPackageFreeze.serialized.length > 96
                ? `${encoderConstraintSystemPackageFreeze.serialized.slice(0, 96)}...`
                : encoderConstraintSystemPackageFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Proving-input package kind</span>
            <strong>{`${encoderProvingInputPackage.artifactKind} · v${encoderProvingInputPackage.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Proving-input package status</span>
            <strong>{encoderProvingInputPackage.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderProvingInputPackage.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Package footprint</span>
            <strong>{encoderProvingInputPackage.packageFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Constraint package provenance</span>
            <strong>{`${encoderProvingInputPackage.constraintSystemPackageSnapshotKind} · ${encoderProvingInputPackage.constraintSystemPackageStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderProvingInputPackage.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen proving-input package kind</span>
            <strong>{`${encoderProvingInputPackageFreeze.snapshotKind} · v${encoderProvingInputPackageFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen proving-input package status</span>
            <strong>{encoderProvingInputPackageFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen proving-input package summary</span>
            <strong>{encoderProvingInputPackageFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderProvingInputPackageFreeze.serialized.length > 96
                ? `${encoderProvingInputPackageFreeze.serialized.slice(0, 96)}...`
                : encoderProvingInputPackageFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Backend witness package kind</span>
            <strong>{`${encoderBackendWitnessPackage.artifactKind} · v${encoderBackendWitnessPackage.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Backend witness package status</span>
            <strong>{encoderBackendWitnessPackage.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderBackendWitnessPackage.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Witness footprint</span>
            <strong>{encoderBackendWitnessPackage.witnessFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Proving-input package provenance</span>
            <strong>{`${encoderBackendWitnessPackage.provingInputPackageSnapshotKind} · ${encoderBackendWitnessPackage.provingInputPackageStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderBackendWitnessPackage.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen backend witness package kind</span>
            <strong>{`${encoderBackendWitnessPackageFreeze.snapshotKind} · v${encoderBackendWitnessPackageFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen backend witness package status</span>
            <strong>{encoderBackendWitnessPackageFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen backend witness package summary</span>
            <strong>{encoderBackendWitnessPackageFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderBackendWitnessPackageFreeze.serialized.length > 96
                ? `${encoderBackendWitnessPackageFreeze.serialized.slice(0, 96)}...`
                : encoderBackendWitnessPackageFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Backend proving session kind</span>
            <strong>{`${encoderBackendProvingSession.artifactKind} · v${encoderBackendProvingSession.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Backend proving session status</span>
            <strong>{encoderBackendProvingSession.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderBackendProvingSession.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Session footprint</span>
            <strong>{encoderBackendProvingSession.sessionFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Package provenance</span>
            <strong>{`${encoderBackendProvingSession.provingInputPackageSnapshotKind} · ${encoderBackendProvingSession.provingInputPackageStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderBackendProvingSession.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen backend proving session kind</span>
            <strong>{`${encoderBackendProvingSessionFreeze.snapshotKind} · v${encoderBackendProvingSessionFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen backend proving session status</span>
            <strong>{encoderBackendProvingSessionFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen backend proving session summary</span>
            <strong>{encoderBackendProvingSessionFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderBackendProvingSessionFreeze.serialized.length > 96
                ? `${encoderBackendProvingSessionFreeze.serialized.slice(0, 96)}...`
                : encoderBackendProvingSessionFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Proof receipt kind</span>
            <strong>{`${encoderProofReceipt.artifactKind} · v${encoderProofReceipt.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Proof receipt status</span>
            <strong>{encoderProofReceipt.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderProofReceipt.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Receipt footprint</span>
            <strong>{encoderProofReceipt.receiptFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Session provenance</span>
            <strong>{`${encoderProofReceipt.backendProvingSessionSnapshotKind} · ${encoderProofReceipt.backendProvingSessionStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderProofReceipt.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen proof receipt kind</span>
            <strong>{`${encoderProofReceiptFreeze.snapshotKind} · v${encoderProofReceiptFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen proof receipt status</span>
            <strong>{encoderProofReceiptFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen proof receipt summary</span>
            <strong>{encoderProofReceiptFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderProofReceiptFreeze.serialized.length > 96
                ? `${encoderProofReceiptFreeze.serialized.slice(0, 96)}...`
                : encoderProofReceiptFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Proof verification receipt kind</span>
            <strong>{`${encoderProofVerificationReceipt.artifactKind} · v${encoderProofVerificationReceipt.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Proof verification receipt status</span>
            <strong>{encoderProofVerificationReceipt.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderProofVerificationReceipt.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Verification footprint</span>
            <strong>{encoderProofVerificationReceipt.verificationFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Receipt provenance</span>
            <strong>{`${encoderProofVerificationReceipt.proofReceiptSnapshotKind} · ${encoderProofVerificationReceipt.proofReceiptStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderProofVerificationReceipt.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen proof verification receipt kind</span>
            <strong>{`${encoderProofVerificationReceiptFreeze.snapshotKind} · v${encoderProofVerificationReceiptFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen proof verification receipt status</span>
            <strong>{encoderProofVerificationReceiptFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen proof verification receipt summary</span>
            <strong>{encoderProofVerificationReceiptFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderProofVerificationReceiptFreeze.serialized.length > 96
                ? `${encoderProofVerificationReceiptFreeze.serialized.slice(0, 96)}...`
                : encoderProofVerificationReceiptFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Verification attestation kind</span>
            <strong>{`${encoderVerificationAttestation.artifactKind} · v${encoderVerificationAttestation.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Verification attestation status</span>
            <strong>{encoderVerificationAttestation.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderVerificationAttestation.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Attestation footprint</span>
            <strong>{encoderVerificationAttestation.attestationFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Verification provenance</span>
            <strong>{`${encoderVerificationAttestation.proofVerificationReceiptSnapshotKind} · ${encoderVerificationAttestation.proofVerificationReceiptStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderVerificationAttestation.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen verification attestation kind</span>
            <strong>{`${encoderVerificationAttestationFreeze.snapshotKind} · v${encoderVerificationAttestationFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen verification attestation status</span>
            <strong>{encoderVerificationAttestationFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen verification attestation summary</span>
            <strong>{encoderVerificationAttestationFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderVerificationAttestationFreeze.serialized.length > 96
                ? `${encoderVerificationAttestationFreeze.serialized.slice(0, 96)}...`
                : encoderVerificationAttestationFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}
