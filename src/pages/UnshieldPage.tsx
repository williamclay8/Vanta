import { useEffect, useMemo, useRef, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { UnshieldPageHero } from "@/components/UnshieldPageHero";
import { UnshieldPausedBanner } from "@/components/UnshieldPausedBanner";
import { UnshieldReleaseWorkflowSection } from "@/components/UnshieldReleaseWorkflowSection";
import { UnshieldWorkspaceCard } from "@/components/UnshieldWorkspaceCard";
import { LaneFlowIndicator } from "@/components/LaneFlowIndicator";
// import { UnshieldAdvancedPanel } from "@/components/UnshieldAdvancedPanel";
import { buildPrivateCoreStatePanelProps } from "@/components/privateCore/buildPrivateCoreStatePanelProps";
import { abbreviate } from "@/components/unshield/unshieldPanelUtils";
import { buildUnshieldPrivateCoreDemoSteps } from "@/components/unshield/unshieldPrivateCoreDemoSteps";
import { useUnshieldFlow } from "@/components/unshield/useUnshieldFlow";
import { useUnshieldReceiptModal } from "@/components/unshield/useUnshieldReceiptModal";
import { useUnshieldReleasePackageExport } from "@/components/unshield/useUnshieldReleasePackageExport";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { getUnshieldTrustContract } from "@/solana/unshieldTrustContract";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import { createUnshieldTransactionEvidence } from "@/transactions/vantaTransactionEvidence";

export function UnshieldPage() {
  const unshieldTrustContract = useMemo(() => getUnshieldTrustContract(), []);
  const privacyFlow = usePrivacyFlow();
  const {
    privateCoreHoldState,
    privateCoreOperatorConsumeError,
    privateCoreOperatorConsumes,
    privateCoreOperatorLatestConsume,
    privateCoreOperatorLatestProof,
    privateCoreOperatorLatestRelease,
    privateCoreOperatorLatestReleaseProof,
    privateCoreOperatorLatestSend,
    privateCoreOperatorLatestSendProof,
    privateCoreOperatorBoundaryPrimaryNote,
    privateCoreOperatorBoundaryStatusLabel,
    privateCoreOperatorReleaseError,
    privateCoreOperatorReleases,
    privateCoreOperatorRootCurrentnessLabel,
    privateCoreOperatorRootError,
    privateCoreOperatorRootRegistrationStatus,
    privateCoreOperatorRoots,
    privateCoreRecentShield,
    privateCoreReleaseCandidateState,
    privateCoreReleaseHandoffState,
    privateCoreReleasePackageState,
    privateCoreReleaseWorkflowState,
    privateCoreSendState,
    privateCoreUnshieldState,
    refreshPrivateCoreOperatorSummary,
    runPrivateCoreReplayAttempt,
    runPrivateCoreUnshield,
  } = privacyFlow;
  const { walletAddress, walletAddressShort, walletConnected } = useWalletState();
  const viewingKey = useVantaShieldViewingKey();
  const shieldRegistry = useVantaShieldAssetRegistryState();
  const canonicalShieldState = useVantaShieldState();
  const usdcShieldEntry = shieldRegistry.byAssetKey.USDC;
  const [privateCoreActionPending, setPrivateCoreActionPending] = useState(false);

  const setUnshieldReceiptCopyStatusRef = useRef<
    (status: "idle" | "copied" | "failed") => void
  >(() => {});

  const flow = useUnshieldFlow({
    canonicalShieldState,
    splitFollowupRecoveryOptions: { viewingSecretKey: viewingKey?.secretKey },
    splitFollowupMemoOptions: { viewingPublicKey: viewingKey?.publicKey },
    setUnshieldReceiptCopyStatus: (status) => setUnshieldReceiptCopyStatusRef.current(status),
    shieldRegistry,
    splitSpentMarkerMemoOptions: { viewingPublicKey: viewingKey?.publicKey },
    usdcShieldEntry,
    viewingKey,
    walletAddress,
    walletAddressShort,
    walletConnected,
  });

  const latestPrivateCoreOperatorConsume =
    privateCoreOperatorLatestConsume ?? privateCoreOperatorConsumes[0] ?? null;
  const latestPrivateCoreOperatorRelease =
    privateCoreOperatorLatestRelease ?? privateCoreOperatorReleases[0] ?? null;
  const currentUnshieldTransactionEvidence = useMemo(
    () =>
      createUnshieldTransactionEvidence({
        latestProof: privateCoreOperatorLatestReleaseProof ?? privateCoreOperatorLatestProof,
        latestRelease: latestPrivateCoreOperatorRelease,
        transitionSignature: flow.lastTransitionSignature,
      }),
    [
      flow.lastTransitionSignature,
      latestPrivateCoreOperatorRelease,
      privateCoreOperatorLatestProof,
      privateCoreOperatorLatestReleaseProof,
    ],
  );
  const privateCoreSendCompleted = Boolean(
    privateCoreSendState || privateCoreOperatorLatestSend || privateCoreOperatorLatestSendProof,
  );
  const {
    copyReleasePackageExport,
    downloadReleasePackageExport,
    releasePackageExportStatus,
  } = useUnshieldReleasePackageExport(privateCoreReleasePackageState);
  const {
    completionEvidenceLabel,
    copyUnshieldReceipt,
    setUnshieldReceiptCopyStatus,
    setUnshieldReceiptModalOpen,
    unshieldReceiptCopyStatus,
    unshieldReceiptModalDetails,
    unshieldReceiptModalOpen,
  } = useUnshieldReceiptModal({
    currentUnshieldTransactionEvidence,
    lastCompletion: flow.lastCompletion,
    lastTransitionSignature: flow.lastTransitionSignature,
    operatorReleaseSignature: flow.operatorReleaseSignature,
  });
  setUnshieldReceiptCopyStatusRef.current = setUnshieldReceiptCopyStatus;

  const privateCoreDemoSteps = useMemo(
    () =>
      buildUnshieldPrivateCoreDemoSteps({
        privateCoreHoldState,
        privateCoreRecentShield,
        privateCoreSendCompleted,
        privateCoreSendState,
        privateCoreUnshieldState,
      }),
    [
      privateCoreHoldState,
      privateCoreRecentShield,
      privateCoreSendCompleted,
      privateCoreSendState,
      privateCoreUnshieldState,
    ],
  );

  useEffect(() => {
    if (flow.status !== "complete") {
      setUnshieldReceiptModalOpen(false);
    }
  }, [flow.status, setUnshieldReceiptModalOpen]);

  const privateCoreStatePanelProps = useMemo(
    () =>
      buildPrivateCoreStatePanelProps(privacyFlow, {
        compact: true,
        title: "Vanta Private Core unshield state",
      }),
    [privacyFlow],
  );
  const unshieldProductionPrivacyClaimsLocked =
    unshieldTrustContract.claimControls.productionPrivacyClaimsLocked;
  const unshieldVisibleStatusCopy = unshieldTrustContract.visibleStatusCopy;

  return (
    <section
      className="send-page unshield-page"
      data-production-privacy-claims-locked={unshieldProductionPrivacyClaimsLocked}
    >
      <UnshieldPageHero unshieldTrustContract={unshieldTrustContract} />

      <div className="module-state send-layout__status">
        <strong>Unshield truth boundary</strong>
        <p>
          {unshieldProductionPrivacyClaimsLocked
            ? unshieldVisibleStatusCopy
            : "Production Unshield privacy claims are unlocked by current evidence."}
        </p>
      </div>

      {/* <UnshieldAdvancedPanel /> is rendered inside UnshieldWorkspaceCard so the shared
          NotePicker stays inside the advanced disclosure with exit-state controls. */}

      <UnshieldPausedBanner />

      <LaneFlowIndicator
        ariaLabel="Unshield flow"
        activeStepIndex={2}
        steps={[
          { id: "shield", label: "Shield" },
          { id: "hold", label: "Hold" },
          { id: "unshield", label: `Unshield ${flow.selectedLane}` },
        ]}
      />

      <UnshieldReleaseWorkflowSection
        visible={flow.showPrivateReleaseCard}
        latestPrivateCoreOperatorConsume={latestPrivateCoreOperatorConsume}
        latestPrivateCoreOperatorRelease={latestPrivateCoreOperatorRelease}
        privateCoreActionPending={privateCoreActionPending}
        privateCoreDemoSteps={privateCoreDemoSteps}
        privateCoreHoldState={privateCoreHoldState}
        privateCoreOperatorBoundaryPrimaryNote={privateCoreOperatorBoundaryPrimaryNote}
        privateCoreOperatorBoundaryStatusLabel={privateCoreOperatorBoundaryStatusLabel}
        privateCoreOperatorConsumeError={privateCoreOperatorConsumeError}
        privateCoreOperatorConsumes={privateCoreOperatorConsumes}
        privateCoreOperatorReleaseError={privateCoreOperatorReleaseError}
        privateCoreOperatorReleases={privateCoreOperatorReleases}
        privateCoreOperatorRootCurrentnessLabel={privateCoreOperatorRootCurrentnessLabel}
        privateCoreOperatorRootError={privateCoreOperatorRootError}
        privateCoreOperatorRootRegistrationStatus={privateCoreOperatorRootRegistrationStatus}
        privateCoreOperatorRoots={privateCoreOperatorRoots}
        privateCoreRecentShield={privateCoreRecentShield}
        privateCoreReleaseCandidateState={privateCoreReleaseCandidateState}
        privateCoreReleaseHandoffState={privateCoreReleaseHandoffState}
        privateCoreReleaseWorkflowState={privateCoreReleaseWorkflowState}
        privateCoreSendCompleted={privateCoreSendCompleted}
        privateCoreUnshieldState={privateCoreUnshieldState}
        runPrivateCoreReplayAttempt={runPrivateCoreReplayAttempt}
        runPrivateCoreUnshield={runPrivateCoreUnshield}
        setPrivateCoreActionPending={setPrivateCoreActionPending}
        statePanelProps={privateCoreStatePanelProps}
      />

      <div className="send-layout">
        <UnshieldWorkspaceCard
          approvePreparedUnshieldTransition={flow.approvePreparedUnshieldTransition}
          authorizePendingOperatorRelease={flow.authorizePendingOperatorRelease}
          availableLaneOptions={flow.availableLaneOptions}
          completionEvidenceLabel={completionEvidenceLabel}
          copyReleasePackageExport={copyReleasePackageExport}
          copyUnshieldReceipt={copyUnshieldReceipt}
          currentUnshieldTransactionEvidence={currentUnshieldTransactionEvidence}
          currentUnshieldZkDiagnostics={flow.currentUnshieldZkDiagnostics}
          downloadReleasePackageExport={downloadReleasePackageExport}
          exitConsequenceDestination={flow.exitConsequenceDestination}
          exitConsequenceDisplay={flow.exitConsequenceDisplay}
          finalizationProgressLabel={flow.finalizationProgressLabel}
          finalizePendingSplitState={flow.finalizePendingSplitState}
          finalizePendingUnshieldState={flow.finalizePendingUnshieldState}
          flowError={flow.flowError}
          handleSelectUnshieldNote={flow.handleSelectUnshieldNote}
          handleUnshield={flow.handleUnshield}
          isBetaMode={isBetaMode}
          isReady={flow.isReady}
          lastCompletion={flow.lastCompletion}
          lastSpentMarkerSignature={flow.lastSpentMarkerSignature}
          lastTransitionSignature={flow.lastTransitionSignature}
          notePickerOptions={flow.unshieldNotePickerOptions}
          noteSelectionLabel={flow.selectedUnshieldNoteLabel}
          onMaxRequestedAmount={flow.handleMaxRequestedAmount}
          onRequestedAmountChange={flow.handleRequestedAmountChange}
          onSelectLane={flow.selectUnshieldLane}
          onSetUnshieldReceiptModalOpen={setUnshieldReceiptModalOpen}
          operatorReleaseDisabledReason={flow.operatorReleaseDisabledReason}
          operatorReleaseSignature={flow.operatorReleaseSignature}
          pendingFinalizationApproval={flow.pendingFinalizationApproval}
          pendingSplitFinalizationApproval={flow.pendingSplitFinalizationApproval}
          pendingTransitionApproval={flow.pendingTransitionApproval}
          pendingUmbraApprovalDisplay={flow.pendingUmbraApprovalDisplay}
          privateCoreReleaseCandidateState={privateCoreReleaseCandidateState}
          privateCoreReleaseHandoffState={privateCoreReleaseHandoffState}
          privateCoreReleasePackageState={privateCoreReleasePackageState}
          privateCoreReleaseWorkflowState={privateCoreReleaseWorkflowState}
          referenceNoteLabel={
            flow.selectedUnshieldNote ? abbreviate(flow.selectedUnshieldNote.noteId) : "Unavailable"
          }
          refreshPrivateCoreOperatorSummary={refreshPrivateCoreOperatorSummary}
          releaseHandoffRefreshPending={flow.releaseHandoffRefreshPending}
          releasePackageExportStatus={releasePackageExportStatus}
          requestedAmountInput={flow.requestedAmountInput}
          requiresExactSplit={flow.requiresExactSplit}
          selectedDisplayAmount={flow.selectedDisplayAmount}
          selectedFullAmount={flow.selectedFullAmount}
          selectedLane={flow.selectedLane}
          selectedLaneDecimals={flow.selectedLaneDecimals}
          selectedSolNote={flow.selectedSolNote}
          selectedSolPendingAmount={flow.selectedSolPendingAmount}
          selectedUnshieldNoteId={flow.selectedUnshieldNoteId}
          setReleaseHandoffRefreshPending={flow.setReleaseHandoffRefreshPending}
          splitSpentMarkerTransaction={flow.splitSpentMarkerTransaction}
          spentMarkerTransaction={flow.spentMarkerTransaction}
          status={flow.status}
          transitionProgressLabel={flow.transitionProgressLabel}
          transitionTransaction={flow.transitionTransaction}
          unshieldBridgeError={flow.unshieldBridgeError}
          unshieldPrimaryActionLabel={flow.unshieldPrimaryActionLabel}
          unshieldReceiptCopyStatus={unshieldReceiptCopyStatus}
          unshieldReceiptModalDetails={unshieldReceiptModalDetails}
          unshieldReceiptModalOpen={unshieldReceiptModalOpen}
          validationMessage={flow.validationMessage}
          walletAddress={walletAddress}
          walletAddressShort={walletAddressShort}
        />
      </div>
    </section>
  );
}
