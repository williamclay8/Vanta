import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
const InternalCanonicalLifecyclePanel = lazy(() =>
  import("@/components/InternalCanonicalLifecyclePanel").then((m) => ({
    default: m.InternalCanonicalLifecyclePanel,
  })),
);
const LifecycleTimeline = lazy(() =>
  import("@/components/LifecycleTimeline").then((m) => ({ default: m.LifecycleTimeline })),
);
const NoteStatePanel = lazy(() =>
  import("@/components/NoteStatePanel").then((m) => ({ default: m.NoteStatePanel })),
);
import { useWalletState } from "@/data/context/WalletContext";
import { useVantaNextStepGuidance } from "@/solana/useVantaNextStepGuidance";
import { useVantaPositionSummary } from "@/solana/useVantaPositionSummary";
import { useVantaShieldState } from "@/solana/useVantaShieldState";

type DashboardActionCard = {
  badge: string;
  body: string;
  href: string;
  label: string;
  state: string;
  title: string;
};

export function AppDashboardPage() {
  const summary = useVantaPositionSummary();
  const guidance = useVantaNextStepGuidance();
  const { account } = useVantaShieldState();
  const {
    privateCoreHoldState,
    privateCoreSendState,
    privateCoreOperatorConsumeError,
    privateCoreOperatorConsumes,
    privateCoreOperatorCurrentRoot,
    privateCoreOperatorLatestConsume,
    privateCoreOperatorLatestConsumeProof,
    privateCoreOperatorLatestProof,
    privateCoreOperatorLatestRoot,
    privateCoreOperatorLatestRelease,
    privateCoreOperatorLatestReleaseProof,
    privateCoreOperatorLatestSendProof,
    privateCoreOperatorLatestSendLinkedProof,
    privateCoreOperatorLatestSend,
    privateCoreOperatorBoundaryPrimaryNote,
    privateCoreOperatorBoundaryStatusLabel,
    privateCoreOperatorContractMirrorPrimaryNote,
    privateCoreOperatorContractMirrorStatusLabel,
    privateCoreOperatorSendBoundaryPrimaryNote,
    privateCoreOperatorSendBoundaryStatusLabel,
    privateCoreOperatorSendContinuityPrimaryNote,
    privateCoreOperatorSendContinuityStatusLabel,
    privateCoreOperatorSupportedSendLaneKind,
    privateCoreOperatorSupportedSendLaneNote,
    privateCoreOperatorSupportedSendLaneStatus,
    privateCoreOperatorSupportedSendLaneVersion,
    privateCoreOperatorSupportedSendV1Decision,
    privateCoreOperatorSupportedSendV1DecisionNote,
    privateCoreOperatorSupportedUnshieldLaneKind,
    privateCoreOperatorSupportedUnshieldLaneNote,
    privateCoreOperatorSupportedUnshieldLaneStatus,
    privateCoreOperatorSupportedUnshieldLaneVersion,
    privateCoreOperatorSupportedUnshieldV1Decision,
    privateCoreOperatorSupportedUnshieldV1DecisionNote,
    privateCoreOperatorSupportedReleaseLaneKind,
    privateCoreOperatorSupportedReleaseLaneNote,
    privateCoreOperatorSupportedReleaseLaneStatus,
    privateCoreOperatorSupportedReleaseLaneVersion,
    privateCoreOperatorSupportedSwapLaneKind,
    privateCoreOperatorSupportedSwapLaneNote,
    privateCoreOperatorSupportedSwapLaneStatus,
    privateCoreOperatorSupportedSwapLaneVersion,
    privateCoreOperatorSupportedSwapV1Decision,
    privateCoreOperatorSupportedSwapV1DecisionNote,
    privateCoreOperatorSupportedSwapVenue,
    privateCoreOperatorSupportedSwapOutputModel,
    privateCoreOperatorSupportedReleaseV1Decision,
    privateCoreOperatorSupportedReleaseV1DecisionNote,
    privateCoreOperatorSupportedFlowKind,
    privateCoreOperatorSupportedFlowNote,
    privateCoreOperatorSupportedFlowStatus,
    privateCoreOperatorSupportedFlowVersion,
    privateCoreOperatorSupportedAssetSymbol,
    privateCoreOperatorSupportedEnvironment,
    privateCoreOperatorSupportedNoteSchema,
    privateCoreOperatorSupportedNoteVersion,
    privateCoreOperatorSupportedRootRegistrationProvenance,
    privateCoreOperatorSupportedSendResultingRootBasis,
    privateCoreOperatorSupportedSendInputRootPolicy,
    privateCoreOperatorSupportedSendOutputRegistrationPolicy,
    privateCoreOperatorSupportedRecipientModel,
    privateCoreOperatorSupportedReleaseDestinationModel,
    privateCoreOperatorSupportedProofSystem,
    privateCoreOperatorSupportedUnshieldCircuit,
    privateCoreOperatorSupportedSendCircuit,
    privateCoreOperatorSupportedUnshieldMerkleDepth,
    privateCoreOperatorSupportedSendMerkleDepth,
    privateCoreOperatorSupportedReleaseAuthorizationBasis,
    privateCoreOperatorSupportedReleaseRootPolicy,
    privateCoreOperatorSupportedReleaseExecutionModel,
    privateCoreOperatorSupportedReleaseAtomicityModel,
    privateCoreOperatorSupportedReleasePersistenceModel,
    privateCoreOperatorOwnerAuthorizationMode,
    privateCoreOperatorOwnerAuthorizationDecision,
    privateCoreOperatorOwnerAuthorizationDecisionNote,
    privateCoreOperatorSourceArtifactTruthBasis,
    privateCoreOperatorProvingArtifactTruthBasis,
    privateCoreOperatorSourceProvingRelationship,
    privateCoreOperatorNullifierKeyMode,
    privateCoreOperatorProvingHashLane,
    privateCoreOperatorCurrentRootLinkedProof,
    privateCoreOperatorCurrentRootProofLinkStatus,
    privateCoreOperatorSendResultingRootLinkedProof,
    privateCoreOperatorSendResultingRootRecord,
    privateCoreOperatorSendResultingRootPrimaryNote,
    privateCoreOperatorSendResultingRootRegistrationPrimaryNote,
    privateCoreOperatorSendResultingRootRegistrationStatusLabel,
    privateCoreOperatorSendResultingRootProofLinkStatus,
    privateCoreOperatorSendResultingRootStatusLabel,
    privateCoreOperatorProofConsumeLinkStatus,
    privateCoreOperatorProofError,
    privateCoreOperatorProofs,
    privateCoreOperatorProofSendLinkStatus,
    privateCoreOperatorProofReleaseLinkStatus,
    privateCoreOperatorReleaseError,
    privateCoreOperatorReleases,
    privateCoreOperatorRootCurrentnessLabel,
    privateCoreOperatorRootError,
    privateCoreOperatorRootRegistrationStatus,
    privateCoreOperatorRoots,
    privateCoreOperatorContractStateVersion,
    privateCoreOperatorContractVersion,
    privateCoreOperatorContractSummaryVersion,
    privateCoreOperatorSendError,
    privateCoreOperatorSends,
    privateCoreOperatorSendProofError,
    privateCoreOperatorSendProofs,
    privateCoreOperatorSummaryUpdatedAt,
    privateCoreRecentShield,
    privateCoreUnshieldState,
  } = usePrivacyFlow();
  const { walletConnected } = useWalletState();

  const actions: DashboardActionCard[] = [
    {
      badge:
        walletConnected && summary.publicBalance > 0 ? "Available now" : "Source state",
      body:
        walletConnected && summary.publicBalance > 0
          ? "Move public VUSD into Vanta to create the first spendable note."
          : "Shield becomes available when Public Wallet holds live VUSD on devnet.",
      href: "/app/shield",
      label: "Open Shield",
      state: "Public Wallet -> Shielded State",
      title: "Shield",
    },
    {
      badge: summary.spendableNoteCount > 0 ? "Spendable note live" : "Awaiting note",
      body:
        summary.spendableNoteCount > 0
          ? "Use current shielded value in the constrained Send flow and evolve note state."
          : "Send becomes available once a spendable VUSD note exists in shielded state.",
      href: "/app/send",
      label: "Open Send",
      state: "Shielded State -> State Evolution",
      title: "Send",
    },
    {
      badge:
        summary.shieldedSolBalance > 0
          ? "SOL exit available"
          : summary.spendableNoteCount > 0
            ? "Exit available"
            : "Awaiting note",
      body:
        summary.shieldedSolBalance > 0
          ? "Return one shielded SOL note created by Swap back to Public Wallet through the constrained SOL unshield path."
          : summary.spendableNoteCount > 0
            ? "Return one spendable VUSD note to Public Wallet through the authenticated operator path."
            : "Unshield becomes available when a spendable VUSD or shielded SOL note is ready for exit.",
      href: "/app/unshield",
      label: "Open Unshield",
      state:
        summary.shieldedSolBalance > 0
          ? "Shielded SOL -> Public Wallet"
          : "Shielded State -> Public Wallet",
      title: "Unshield",
    },
    {
      badge: summary.spendableNoteCount > 0 ? "Transformation live" : "Awaiting note",
      body:
        summary.spendableNoteCount > 0
          ? "Consume one spendable VUSD note and resolve one new shielded SOL output state inside Vanta."
          : "Swap becomes available when a spendable VUSD note exists in shielded state.",
      href: "/app/swap",
      label: "Open Swap",
      state: "Shielded State -> Shielded SOL",
      title: "Swap",
    },
  ];

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Vanta Home</span>
          <h2>One place to understand the live constrained loop.</h2>
          <p>
            Vanta currently supports one constrained real devnet lifecycle:
            move `VUSD` from Public Wallet into note-based shielded state,
            evolve that state through Send, transform it into shielded `SOL`
            through Swap, and exit through authenticated operator-backed
            Unshield.
          </p>
        </div>

        <div className="dashboard-hero__meta">
          <small>Live now</small>
          <strong>{summary.liveAsset} on {summary.networkLabel}</strong>
          <p>Current lifecycle: Shield, Send, Swap, and Unshield.</p>
        </div>
      </div>

      <div className="dashboard-flow-strip">
        <div className="dashboard-flow-strip__path">
          {[
            "Public Wallet",
            "Shield",
            "Shielded State",
            "Send",
            "Swap",
            "Unshield",
          ].map((step) => <span key={step}>{step}</span>)}
        </div>
        <p>{guidance.message}</p>
      </div>

      <div className="dashboard-actions">
        {actions.map((action) => (
          <article key={action.title} className="dashboard-action-card">
            <div className="dashboard-action-card__top">
              <span>{action.badge}</span>
              <small>{action.state}</small>
            </div>
            <h3>{action.title}</h3>
            <p>{action.body}</p>
            <Link className="button button-ghost" to={action.href}>
              {action.label}
            </Link>
          </article>
        ))}
      </div>

      <Suspense fallback={<div className="dashboard-grid"><article className="dashboard-card">Loading dashboard details…</article></div>}>
        <div className="dashboard-grid">
          <article className="dashboard-card dashboard-card--timeline">
            <LifecycleTimeline
              account={account}
              compact
              maxItems={4}
              title="Recent constrained lifecycle"
            />
          </article>

          <article className="dashboard-card">
            <NoteStatePanel
              account={account}
              compact
              maxNotes={3}
              title="Shielded state snapshot"
            />
          </article>

          <article className="dashboard-card">
            <VantaPrivateCoreStatePanel
              compact
              holdState={privateCoreHoldState}
              sendState={privateCoreSendState}
              operatorCurrentRoot={privateCoreOperatorCurrentRoot}
              operatorConsumeError={privateCoreOperatorConsumeError}
              operatorConsumes={privateCoreOperatorConsumes}
              operatorLatestConsume={privateCoreOperatorLatestConsume}
              operatorLatestConsumeProof={privateCoreOperatorLatestConsumeProof}
              operatorLatestProof={privateCoreOperatorLatestProof}
          operatorLatestRelease={privateCoreOperatorLatestRelease}
          operatorLatestReleaseProof={privateCoreOperatorLatestReleaseProof}
          operatorLatestRoot={privateCoreOperatorLatestRoot}
          operatorLatestSend={privateCoreOperatorLatestSend}
          operatorLatestSendLinkedProof={privateCoreOperatorLatestSendLinkedProof}
          operatorLatestSendProof={privateCoreOperatorLatestSendProof}
          operatorBoundaryPrimaryNote={privateCoreOperatorBoundaryPrimaryNote}
          operatorBoundaryStatusLabel={privateCoreOperatorBoundaryStatusLabel}
          operatorContractMirrorPrimaryNote={privateCoreOperatorContractMirrorPrimaryNote}
          operatorContractMirrorStatusLabel={privateCoreOperatorContractMirrorStatusLabel}
          operatorSendBoundaryPrimaryNote={privateCoreOperatorSendBoundaryPrimaryNote}
          operatorSendBoundaryStatusLabel={privateCoreOperatorSendBoundaryStatusLabel}
          operatorSendContinuityPrimaryNote={privateCoreOperatorSendContinuityPrimaryNote}
          operatorSendContinuityStatusLabel={privateCoreOperatorSendContinuityStatusLabel}
          operatorSupportedSendLaneKind={privateCoreOperatorSupportedSendLaneKind}
          operatorSupportedSendLaneNote={privateCoreOperatorSupportedSendLaneNote}
          operatorSupportedSendLaneStatus={privateCoreOperatorSupportedSendLaneStatus}
          operatorSupportedSendLaneVersion={privateCoreOperatorSupportedSendLaneVersion}
          operatorSupportedSendV1Decision={privateCoreOperatorSupportedSendV1Decision}
          operatorSupportedSendV1DecisionNote={privateCoreOperatorSupportedSendV1DecisionNote}
          operatorSupportedUnshieldLaneKind={privateCoreOperatorSupportedUnshieldLaneKind}
          operatorSupportedUnshieldLaneNote={privateCoreOperatorSupportedUnshieldLaneNote}
          operatorSupportedUnshieldLaneStatus={privateCoreOperatorSupportedUnshieldLaneStatus}
          operatorSupportedUnshieldLaneVersion={privateCoreOperatorSupportedUnshieldLaneVersion}
          operatorSupportedUnshieldV1Decision={privateCoreOperatorSupportedUnshieldV1Decision}
          operatorSupportedUnshieldV1DecisionNote={
            privateCoreOperatorSupportedUnshieldV1DecisionNote
          }
          operatorSupportedReleaseLaneKind={privateCoreOperatorSupportedReleaseLaneKind}
          operatorSupportedReleaseLaneNote={privateCoreOperatorSupportedReleaseLaneNote}
          operatorSupportedReleaseLaneStatus={privateCoreOperatorSupportedReleaseLaneStatus}
          operatorSupportedReleaseLaneVersion={privateCoreOperatorSupportedReleaseLaneVersion}
          operatorSupportedSwapLaneKind={privateCoreOperatorSupportedSwapLaneKind}
          operatorSupportedSwapLaneNote={privateCoreOperatorSupportedSwapLaneNote}
          operatorSupportedSwapLaneStatus={privateCoreOperatorSupportedSwapLaneStatus}
          operatorSupportedSwapLaneVersion={privateCoreOperatorSupportedSwapLaneVersion}
          operatorSupportedSwapV1Decision={privateCoreOperatorSupportedSwapV1Decision}
          operatorSupportedSwapV1DecisionNote={privateCoreOperatorSupportedSwapV1DecisionNote}
          operatorSupportedSwapVenue={privateCoreOperatorSupportedSwapVenue}
          operatorSupportedSwapOutputModel={privateCoreOperatorSupportedSwapOutputModel}
          operatorSupportedReleaseV1Decision={privateCoreOperatorSupportedReleaseV1Decision}
          operatorSupportedReleaseV1DecisionNote={
            privateCoreOperatorSupportedReleaseV1DecisionNote
          }
          operatorSupportedFlowKind={privateCoreOperatorSupportedFlowKind}
          operatorSupportedFlowNote={privateCoreOperatorSupportedFlowNote}
          operatorSupportedFlowStatus={privateCoreOperatorSupportedFlowStatus}
          operatorSupportedFlowVersion={privateCoreOperatorSupportedFlowVersion}
          operatorSupportedAssetSymbol={privateCoreOperatorSupportedAssetSymbol}
          operatorSupportedEnvironment={privateCoreOperatorSupportedEnvironment}
          operatorSupportedNoteSchema={privateCoreOperatorSupportedNoteSchema}
          operatorSupportedNoteVersion={privateCoreOperatorSupportedNoteVersion}
          operatorSupportedRootRegistrationProvenance={
            privateCoreOperatorSupportedRootRegistrationProvenance
          }
          operatorSupportedSendResultingRootBasis={
            privateCoreOperatorSupportedSendResultingRootBasis
          }
          operatorSupportedSendInputRootPolicy={
            privateCoreOperatorSupportedSendInputRootPolicy
          }
          operatorSupportedSendOutputRegistrationPolicy={
            privateCoreOperatorSupportedSendOutputRegistrationPolicy
          }
          operatorSupportedRecipientModel={privateCoreOperatorSupportedRecipientModel}
          operatorSupportedReleaseDestinationModel={
            privateCoreOperatorSupportedReleaseDestinationModel
          }
          operatorSupportedProofSystem={privateCoreOperatorSupportedProofSystem}
          operatorSupportedUnshieldCircuit={privateCoreOperatorSupportedUnshieldCircuit}
          operatorSupportedSendCircuit={privateCoreOperatorSupportedSendCircuit}
          operatorSupportedUnshieldMerkleDepth={privateCoreOperatorSupportedUnshieldMerkleDepth}
          operatorSupportedSendMerkleDepth={privateCoreOperatorSupportedSendMerkleDepth}
          operatorSupportedReleaseAuthorizationBasis={
            privateCoreOperatorSupportedReleaseAuthorizationBasis
          }
          operatorSupportedReleaseRootPolicy={privateCoreOperatorSupportedReleaseRootPolicy}
          operatorSupportedReleaseExecutionModel={
            privateCoreOperatorSupportedReleaseExecutionModel
          }
          operatorSupportedReleaseAtomicityModel={
            privateCoreOperatorSupportedReleaseAtomicityModel
          }
          operatorSupportedReleasePersistenceModel={
            privateCoreOperatorSupportedReleasePersistenceModel
          }
          operatorOwnerAuthorizationMode={privateCoreOperatorOwnerAuthorizationMode}
          operatorOwnerAuthorizationDecision={privateCoreOperatorOwnerAuthorizationDecision}
          operatorOwnerAuthorizationDecisionNote={privateCoreOperatorOwnerAuthorizationDecisionNote}
          operatorSourceArtifactTruthBasis={privateCoreOperatorSourceArtifactTruthBasis}
          operatorProvingArtifactTruthBasis={privateCoreOperatorProvingArtifactTruthBasis}
          operatorSourceProvingRelationship={privateCoreOperatorSourceProvingRelationship}
          operatorNullifierKeyMode={privateCoreOperatorNullifierKeyMode}
          operatorProvingHashLane={privateCoreOperatorProvingHashLane}
          operatorCurrentRootLinkedProof={privateCoreOperatorCurrentRootLinkedProof}
          operatorCurrentRootProofLinkStatus={privateCoreOperatorCurrentRootProofLinkStatus}
          operatorSendResultingRootLinkedProof={privateCoreOperatorSendResultingRootLinkedProof}
          operatorSendResultingRootRecord={privateCoreOperatorSendResultingRootRecord}
          operatorSendResultingRootPrimaryNote={privateCoreOperatorSendResultingRootPrimaryNote}
          operatorSendResultingRootRegistrationPrimaryNote={
            privateCoreOperatorSendResultingRootRegistrationPrimaryNote
          }
          operatorSendResultingRootRegistrationStatusLabel={
            privateCoreOperatorSendResultingRootRegistrationStatusLabel
          }
          operatorSendResultingRootProofLinkStatus={privateCoreOperatorSendResultingRootProofLinkStatus}
          operatorSendResultingRootStatusLabel={privateCoreOperatorSendResultingRootStatusLabel}
          operatorProofConsumeLinkStatus={privateCoreOperatorProofConsumeLinkStatus}
          operatorProofError={privateCoreOperatorProofError}
          operatorProofs={privateCoreOperatorProofs}
          operatorProofSendLinkStatus={privateCoreOperatorProofSendLinkStatus}
          operatorProofReleaseLinkStatus={privateCoreOperatorProofReleaseLinkStatus}
              operatorReleaseError={privateCoreOperatorReleaseError}
              operatorReleases={privateCoreOperatorReleases}
              operatorRootCurrentnessLabel={privateCoreOperatorRootCurrentnessLabel}
              operatorRootError={privateCoreOperatorRootError}
              operatorRootRegistrationStatus={privateCoreOperatorRootRegistrationStatus}
              operatorRoots={privateCoreOperatorRoots}
              operatorContractStateVersion={privateCoreOperatorContractStateVersion}
              operatorContractVersion={privateCoreOperatorContractVersion}
              operatorContractSummaryVersion={privateCoreOperatorContractSummaryVersion}
              operatorSendError={privateCoreOperatorSendError}
              operatorSends={privateCoreOperatorSends}
              operatorSendProofError={privateCoreOperatorSendProofError}
              operatorSendProofs={privateCoreOperatorSendProofs}
              operatorSummaryUpdatedAt={privateCoreOperatorSummaryUpdatedAt}
              shieldState={privateCoreRecentShield}
              title="Vanta Private Core private balance"
              unshieldState={privateCoreUnshieldState}
            />
          </article>
        </div>

        <InternalCanonicalLifecyclePanel />
      </Suspense>
    </section>
  );
}
