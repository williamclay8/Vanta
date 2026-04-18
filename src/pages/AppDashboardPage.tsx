import { Suspense, lazy, useMemo } from "react";
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
  const { account } = useVantaShieldState();
  const {
    clusterLabel,
    walletConnected,
  } = useWalletState();
  const {
    privateCoreHoldState,
    privateCoreReleaseCandidateState,
    privateCoreReleaseHandoffState,
    privateCoreReleasePackageState,
    privateCoreReleaseWorkflowState,
    privateCoreSendState,
    privateCoreSwapState,
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
    privateCoreOperatorLatestSwapProof,
    privateCoreOperatorLatestSwapLinkedProof,
    privateCoreOperatorLatestSwap,
    privateCoreOperatorBoundaryPrimaryNote,
    privateCoreOperatorBoundaryStatusLabel,
    privateCoreOperatorContractMirrorPrimaryNote,
    privateCoreOperatorContractMirrorStatusLabel,
    privateCoreOperatorReleaseBoundaryPrimaryNote,
    privateCoreOperatorReleaseBoundaryStatusLabel,
    privateCoreOperatorRequiredLanesPrimaryNote,
    privateCoreOperatorRequiredLanesStatusLabel,
    privateCoreOperatorZkV1ShippingPrimaryNote,
    privateCoreOperatorZkV1ShippingStatusLabel,
    privateCoreOperatorZkV1FinishLinePrimaryNote,
    privateCoreOperatorZkV1FinishLineStatusLabel,
    privateCoreOperatorSendBoundaryPrimaryNote,
    privateCoreOperatorSendBoundaryStatusLabel,
    privateCoreOperatorSendContinuityPrimaryNote,
    privateCoreOperatorSendContinuityStatusLabel,
    privateCoreOperatorSwapBoundaryPrimaryNote,
    privateCoreOperatorSwapBoundaryStatusLabel,
    privateCoreOperatorSwapContinuityPrimaryNote,
    privateCoreOperatorSwapContinuityStatusLabel,
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
    privateCoreOperatorSupportedSwapV1Role,
    privateCoreOperatorSupportedSwapV1RoleNote,
    privateCoreOperatorSupportedSwapVenue,
    privateCoreOperatorSupportedSwapOutputModel,
    privateCoreOperatorSupportedSwapResultingRootBasis,
    privateCoreOperatorSupportedSwapInputRootPolicy,
    privateCoreOperatorSupportedSwapOutputRegistrationPolicy,
    privateCoreOperatorSupportedReleaseV1Decision,
    privateCoreOperatorSupportedReleaseV1DecisionNote,
    privateCoreOperatorSupportedFlowKind,
    privateCoreOperatorSupportedFlowNote,
    privateCoreOperatorSupportedFlowStatus,
    privateCoreOperatorSupportedFlowVersion,
    privateCoreOperatorSupportedZkV1ScopeDecision,
    privateCoreOperatorSupportedZkV1ScopeNote,
    privateCoreOperatorSupportedZkV1RequiredLanes,
    privateCoreOperatorSupportedZkV1RequiredLanesNote,
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
    privateCoreOperatorSwapResultingRootLinkedProof,
    privateCoreOperatorSwapResultingRootRecord,
    privateCoreOperatorSwapResultingRootPrimaryNote,
    privateCoreOperatorSwapResultingRootRegistrationPrimaryNote,
    privateCoreOperatorSwapResultingRootRegistrationStatusLabel,
    privateCoreOperatorSwapResultingRootProofLinkStatus,
    privateCoreOperatorSwapResultingRootStatusLabel,
    privateCoreOperatorProofConsumeLinkStatus,
    privateCoreOperatorProofError,
    privateCoreOperatorProofs,
    privateCoreOperatorProofSendLinkStatus,
    privateCoreOperatorProofSwapLinkStatus,
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
    privateCoreOperatorStatusKind,
    privateCoreOperatorStatusVersion,
    privateCoreOperatorSnapshotKind,
    privateCoreOperatorSnapshotVersion,
    privateCoreOperatorSupportedStatusNote,
    privateCoreOperatorSupportedStatusTransport,
    privateCoreOperatorSupportedStatusEndpoint,
    privateCoreOperatorSupportedStatusGateVersion,
    privateCoreOperatorSupportedStatusGateKind,
    privateCoreOperatorSupportedStatusGateNote,
    privateCoreOperatorSupportedStatusGateTransport,
    privateCoreOperatorSupportedStatusGateEndpoint,
    privateCoreOperatorSupportedSnapshotGateVersion,
    privateCoreOperatorSupportedSnapshotGateKind,
    privateCoreOperatorSupportedSnapshotGateNote,
    privateCoreOperatorSupportedSnapshotGateTransport,
    privateCoreOperatorSupportedSnapshotGateEndpoint,
    privateCoreOperatorSupportedShippingDecisionGateVersion,
    privateCoreOperatorSupportedShippingDecisionGateKind,
    privateCoreOperatorSupportedShippingDecisionGateNote,
    privateCoreOperatorSupportedShippingDecisionGateTransport,
    privateCoreOperatorSupportedShippingDecisionGateEndpoint,
    privateCoreOperatorSupportedShippingDecisionTransport,
    privateCoreOperatorSupportedShippingDecisionEndpoint,
    privateCoreOperatorSupportedShippingArtifactGateVersion,
    privateCoreOperatorSupportedShippingArtifactGateKind,
    privateCoreOperatorSupportedShippingArtifactGateNote,
    privateCoreOperatorSupportedShippingArtifactGateTransport,
    privateCoreOperatorSupportedShippingArtifactGateEndpoint,
    privateCoreOperatorSupportedSnapshotNote,
    privateCoreOperatorSupportedSnapshotTransport,
    privateCoreOperatorSupportedSnapshotEndpoint,
    privateCoreOperatorSupportedShippingArtifactNote,
    privateCoreOperatorSupportedShippingArtifactTransport,
    privateCoreOperatorSupportedShippingArtifactEndpoint,
    privateCoreOperatorSupportedReleaseCandidateVersion,
    privateCoreOperatorSupportedReleaseCandidateKind,
    privateCoreOperatorSupportedReleaseCandidateNote,
    privateCoreOperatorSupportedReleaseCandidateScope,
    privateCoreOperatorSupportedReleaseCandidateScopeNote,
    privateCoreOperatorSupportedReleaseCandidateGateVersion,
    privateCoreOperatorSupportedReleaseCandidateGateKind,
    privateCoreOperatorSupportedReleaseCandidateGateNote,
    privateCoreOperatorSupportedReleaseCandidateGateTransport,
    privateCoreOperatorSupportedReleaseCandidateGateEndpoint,
    privateCoreOperatorSupportedReleaseCandidateTransport,
    privateCoreOperatorSupportedReleaseCandidateEndpoint,
    privateCoreOperatorShippingArtifactKind,
    privateCoreOperatorShippingArtifactVersion,
    privateCoreOperatorShippingDecisionKind,
    privateCoreOperatorShippingDecisionVersion,
    privateCoreOperatorSupportedShippingDecisionNote,
    privateCoreOperatorSendError,
    privateCoreOperatorSends,
    privateCoreOperatorSendProofError,
    privateCoreOperatorSendProofs,
    privateCoreOperatorSwaps,
    privateCoreOperatorSwapProofs,
    privateCoreOperatorSummaryUpdatedAt,
    privateCoreRecentShield,
    privateCoreUnshieldState,
  } = usePrivacyFlow();

  const summary = useMemo(() => {
    const shieldedBalance = account?.balance ?? 0;
    const shieldedSolBalance = account?.shieldedSolBalance ?? 0;
    const spendableNoteCount = account?.spendableShieldNotes.length ?? 0;
    const swapCount = account?.swapNotes.length ?? 0;
    const latestActivity = account?.lifecycleActivities[0] ?? null;

    let statusLabel = "Connect a wallet to enter the live VUSD path.";

    if (walletConnected && shieldedSolBalance > 0) {
      statusLabel =
        "Shielded SOL output is now present inside Vanta and can use the constrained SOL unshield lane.";
    } else if (walletConnected && spendableNoteCount > 0) {
      statusLabel = "Spendable shielded value is available for Send, Swap, or Unshield.";
    } else if (walletConnected && shieldedBalance > 0) {
      statusLabel =
        "Shielded VUSD is present, but no spendable note is currently available.";
    } else if (walletConnected) {
      statusLabel = "No live VUSD is currently available in Public Wallet.";
    }

    return {
      latestActionLabel: latestActivity
        ? latestActivity.amountLabel
          ? `${latestActivity.title} ${latestActivity.amountLabel}`
          : `${latestActivity.title} ${latestActivity.amount.toFixed(2)} VUSD`
        : "No resolved lifecycle activity yet",
      latestActionTimestamp: latestActivity?.createdAt ?? null,
      liveAsset: "VUSD" as const,
      networkLabel: clusterLabel,
      publicBalance: 0,
      shieldedBalance,
      shieldedSolBalance,
      spendableNoteCount,
      statusLabel,
      swapCount,
      walletConnected,
    };
  }, [account, clusterLabel, walletConnected]);

  const guidance = useMemo(() => {
    const latestActivity = account?.lifecycleActivities[0] ?? null;

    if (!summary.walletConnected) {
      return {
        ctaHref: null,
        ctaLabel: null,
        emphasisLabel: "Wallet connection required",
        message: "Connect a wallet to begin the live constrained VUSD lifecycle.",
      };
    }

    if (summary.spendableNoteCount > 0 && latestActivity?.type === "shield") {
      return {
        ctaHref: "/app/swap",
        ctaLabel: "Open Swap",
        emphasisLabel: "Spendable note ready",
        message: "Shielded VUSD is available from the latest Shield action and can continue into Send, Swap, or Unshield.",
      };
    }

    if (summary.spendableNoteCount > 0 && latestActivity?.type === "change_note_created") {
      return {
        ctaHref: "/app/swap",
        ctaLabel: "Open Swap",
        emphasisLabel: "Change note ready",
        message: "Residual shielded value remains available. It can be sent again, swapped into SOL, or returned to Public Wallet.",
      };
    }

    if (latestActivity?.type === "swap") {
      return {
        ctaHref: "/app/unshield",
        ctaLabel: "Open Unshield",
        emphasisLabel: "Shielded SOL resolved",
        message: "The first constrained swap path completed inside Vanta. Shielded SOL output is now present and can be returned to Public Wallet through the new SOL unshield lane.",
      };
    }

    if (latestActivity?.type === "sol_unshield") {
      return {
        ctaHref: "/app/shield",
        ctaLabel: "Shield again",
        emphasisLabel: "SOL lane completed",
        message: "A shielded SOL note has been authenticated, consumed, and returned to Public Wallet through the constrained operator-backed exit path.",
      };
    }

    if (summary.spendableNoteCount > 0) {
      return {
        ctaHref: "/app/swap",
        ctaLabel: "Open Swap",
        emphasisLabel: "Next constrained action available",
        message: "Spendable VUSD is live in shielded state and can continue through Send, Swap, or Unshield.",
      };
    }

    if (summary.shieldedBalance > 0) {
      return {
        ctaHref: "/app/unshield",
        ctaLabel: "Open Unshield",
        emphasisLabel: "Shielded state present",
        message: "Shielded VUSD is present, but there is no currently spendable note to move forward from this state.",
      };
    }

    return {
      ctaHref: "/app/shield",
      ctaLabel: "Open Shield",
      emphasisLabel: "Awaiting live VUSD",
      message: "No constrained VUSD action is available yet. Public Wallet needs live VUSD to begin the loop.",
    };
  }, [account?.lifecycleActivities, summary]);

  const releaseReview = useMemo(() => {
    const packageStatus =
      privateCoreReleasePackageState?.packageStatusLabel ??
      privateCoreReleaseHandoffState?.handoffStatusLabel ??
      "Exact release package unavailable";
    const packageNote =
      privateCoreReleasePackageState?.packagePrimaryNote ??
      privateCoreReleaseHandoffState?.handoffPrimaryNote ??
      "The canonical primary send -> unshield lane has not assembled its final release package yet.";
    const primaryHref =
      privateCoreReleasePackageState?.packageStatusLabel === "Release package ready"
        ? "/app/unshield"
        : privateCoreReleaseHandoffState?.nextActionHref ?? "/app/send";
    const primaryLabel =
      privateCoreReleasePackageState?.packageStatusLabel === "Release package ready"
        ? "Review release package"
        : privateCoreReleaseHandoffState?.nextActionLabel ?? "Open primary release lane";

    return {
      artifactIdentity:
        privateCoreReleasePackageState?.artifactIdentityLabel ?? "Awaiting shipping artifact",
      lineage:
        privateCoreReleasePackageState?.lineageSummaryLabel ?? "Lineage unavailable",
      note: packageNote,
      packageIdentity:
        privateCoreReleasePackageState?.packageIdentityLabel ?? "Package identity unavailable",
      primaryHref,
      primaryLabel,
      status: packageStatus,
    };
  }, [privateCoreReleaseHandoffState, privateCoreReleasePackageState]);

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

      <div className="dashboard-release-review">
        <div>
          <span className="eyebrow">Exact Release Review</span>
          <h3>Canonical narrow zk v1 handoff package</h3>
          <p>{releaseReview.note}</p>
          <div className="dashboard-release-review__facts">
            <span>Package identity: {releaseReview.packageIdentity}</span>
            <span>Artifact identity: {releaseReview.artifactIdentity}</span>
            <span>Lineage: {releaseReview.lineage}</span>
          </div>
        </div>

        <div className="dashboard-release-review__meta">
          <small>Current package status</small>
          <strong>{releaseReview.status}</strong>
          <p>
            The primary `send -&gt; unshield` path is the exact release-candidate lane that
            determines whether the narrow zk v1 package is ready for handoff.
          </p>
          <div className="dashboard-release-review__actions">
            <Link className="button button-primary" to={releaseReview.primaryHref}>
              {releaseReview.primaryLabel}
            </Link>
            <Link className="button button-ghost" to="/app/unshield">
              Open release handoff
            </Link>
          </div>
        </div>
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
              releaseCandidateState={privateCoreReleaseCandidateState}
              releaseHandoffState={privateCoreReleaseHandoffState}
              releasePackageState={privateCoreReleasePackageState}
              releaseWorkflowState={privateCoreReleaseWorkflowState}
              sendState={privateCoreSendState}
              swapState={privateCoreSwapState}
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
          operatorLatestSwap={privateCoreOperatorLatestSwap}
          operatorLatestSwapLinkedProof={privateCoreOperatorLatestSwapLinkedProof}
          operatorLatestSwapProof={privateCoreOperatorLatestSwapProof}
          operatorBoundaryPrimaryNote={privateCoreOperatorBoundaryPrimaryNote}
          operatorBoundaryStatusLabel={privateCoreOperatorBoundaryStatusLabel}
          operatorContractMirrorPrimaryNote={privateCoreOperatorContractMirrorPrimaryNote}
          operatorContractMirrorStatusLabel={privateCoreOperatorContractMirrorStatusLabel}
          operatorReleaseBoundaryPrimaryNote={privateCoreOperatorReleaseBoundaryPrimaryNote}
          operatorReleaseBoundaryStatusLabel={privateCoreOperatorReleaseBoundaryStatusLabel}
          operatorRequiredLanesPrimaryNote={privateCoreOperatorRequiredLanesPrimaryNote}
          operatorRequiredLanesStatusLabel={privateCoreOperatorRequiredLanesStatusLabel}
          operatorZkV1ShippingPrimaryNote={privateCoreOperatorZkV1ShippingPrimaryNote}
          operatorZkV1ShippingStatusLabel={privateCoreOperatorZkV1ShippingStatusLabel}
          operatorSendBoundaryPrimaryNote={privateCoreOperatorSendBoundaryPrimaryNote}
          operatorSendBoundaryStatusLabel={privateCoreOperatorSendBoundaryStatusLabel}
          operatorSendContinuityPrimaryNote={privateCoreOperatorSendContinuityPrimaryNote}
          operatorSendContinuityStatusLabel={privateCoreOperatorSendContinuityStatusLabel}
          operatorSwapBoundaryPrimaryNote={privateCoreOperatorSwapBoundaryPrimaryNote}
          operatorSwapBoundaryStatusLabel={privateCoreOperatorSwapBoundaryStatusLabel}
          operatorSwapContinuityPrimaryNote={privateCoreOperatorSwapContinuityPrimaryNote}
          operatorSwapContinuityStatusLabel={privateCoreOperatorSwapContinuityStatusLabel}
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
          operatorSupportedSwapV1Role={privateCoreOperatorSupportedSwapV1Role}
          operatorSupportedSwapV1RoleNote={privateCoreOperatorSupportedSwapV1RoleNote}
          operatorSupportedSwapVenue={privateCoreOperatorSupportedSwapVenue}
          operatorSupportedSwapOutputModel={privateCoreOperatorSupportedSwapOutputModel}
          operatorSupportedSwapResultingRootBasis={privateCoreOperatorSupportedSwapResultingRootBasis}
          operatorSupportedSwapInputRootPolicy={privateCoreOperatorSupportedSwapInputRootPolicy}
          operatorSupportedSwapOutputRegistrationPolicy={
            privateCoreOperatorSupportedSwapOutputRegistrationPolicy
          }
          operatorSupportedReleaseV1Decision={privateCoreOperatorSupportedReleaseV1Decision}
          operatorSupportedReleaseV1DecisionNote={
            privateCoreOperatorSupportedReleaseV1DecisionNote
          }
          operatorSupportedFlowKind={privateCoreOperatorSupportedFlowKind}
          operatorSupportedFlowNote={privateCoreOperatorSupportedFlowNote}
          operatorSupportedFlowStatus={privateCoreOperatorSupportedFlowStatus}
          operatorSupportedFlowVersion={privateCoreOperatorSupportedFlowVersion}
          operatorSupportedZkV1ScopeDecision={privateCoreOperatorSupportedZkV1ScopeDecision}
          operatorSupportedZkV1ScopeNote={privateCoreOperatorSupportedZkV1ScopeNote}
          operatorSupportedZkV1RequiredLanes={privateCoreOperatorSupportedZkV1RequiredLanes}
          operatorSupportedZkV1RequiredLanesNote={privateCoreOperatorSupportedZkV1RequiredLanesNote}
          operatorZkV1FinishLineStatusLabel={privateCoreOperatorZkV1FinishLineStatusLabel}
          operatorZkV1FinishLinePrimaryNote={privateCoreOperatorZkV1FinishLinePrimaryNote}
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
          operatorSwapResultingRootLinkedProof={privateCoreOperatorSwapResultingRootLinkedProof}
          operatorSwapResultingRootRecord={privateCoreOperatorSwapResultingRootRecord}
          operatorSwapResultingRootPrimaryNote={privateCoreOperatorSwapResultingRootPrimaryNote}
          operatorSwapResultingRootRegistrationPrimaryNote={
            privateCoreOperatorSwapResultingRootRegistrationPrimaryNote
          }
          operatorSwapResultingRootRegistrationStatusLabel={
            privateCoreOperatorSwapResultingRootRegistrationStatusLabel
          }
          operatorSwapResultingRootProofLinkStatus={
            privateCoreOperatorSwapResultingRootProofLinkStatus
          }
          operatorSwapResultingRootStatusLabel={privateCoreOperatorSwapResultingRootStatusLabel}
          operatorProofConsumeLinkStatus={privateCoreOperatorProofConsumeLinkStatus}
          operatorProofError={privateCoreOperatorProofError}
              operatorProofs={privateCoreOperatorProofs}
              operatorProofSendLinkStatus={privateCoreOperatorProofSendLinkStatus}
              operatorProofSwapLinkStatus={privateCoreOperatorProofSwapLinkStatus}
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
              operatorStatusVersion={privateCoreOperatorStatusVersion}
              operatorStatusKind={privateCoreOperatorStatusKind}
              operatorSnapshotVersion={privateCoreOperatorSnapshotVersion}
              operatorSnapshotKind={privateCoreOperatorSnapshotKind}
              operatorSupportedStatusNote={privateCoreOperatorSupportedStatusNote}
              operatorSupportedStatusTransport={privateCoreOperatorSupportedStatusTransport}
              operatorSupportedStatusEndpoint={privateCoreOperatorSupportedStatusEndpoint}
              operatorSupportedStatusGateVersion={privateCoreOperatorSupportedStatusGateVersion}
              operatorSupportedStatusGateKind={privateCoreOperatorSupportedStatusGateKind}
              operatorSupportedStatusGateNote={privateCoreOperatorSupportedStatusGateNote}
              operatorSupportedStatusGateTransport={
                privateCoreOperatorSupportedStatusGateTransport
              }
              operatorSupportedStatusGateEndpoint={
                privateCoreOperatorSupportedStatusGateEndpoint
              }
              operatorSupportedSnapshotGateVersion={privateCoreOperatorSupportedSnapshotGateVersion}
              operatorSupportedSnapshotGateKind={privateCoreOperatorSupportedSnapshotGateKind}
              operatorSupportedSnapshotGateNote={privateCoreOperatorSupportedSnapshotGateNote}
              operatorSupportedSnapshotGateTransport={
                privateCoreOperatorSupportedSnapshotGateTransport
              }
              operatorSupportedSnapshotGateEndpoint={
                privateCoreOperatorSupportedSnapshotGateEndpoint
              }
              operatorSupportedShippingDecisionGateVersion={
                privateCoreOperatorSupportedShippingDecisionGateVersion
              }
              operatorSupportedShippingDecisionGateKind={
                privateCoreOperatorSupportedShippingDecisionGateKind
              }
              operatorSupportedShippingDecisionGateNote={
                privateCoreOperatorSupportedShippingDecisionGateNote
              }
              operatorSupportedShippingDecisionGateTransport={
                privateCoreOperatorSupportedShippingDecisionGateTransport
              }
              operatorSupportedShippingDecisionGateEndpoint={
                privateCoreOperatorSupportedShippingDecisionGateEndpoint
              }
              operatorSupportedShippingDecisionTransport={
                privateCoreOperatorSupportedShippingDecisionTransport
              }
              operatorSupportedShippingDecisionEndpoint={
                privateCoreOperatorSupportedShippingDecisionEndpoint
              }
              operatorSupportedShippingArtifactGateVersion={
                privateCoreOperatorSupportedShippingArtifactGateVersion
              }
              operatorSupportedShippingArtifactGateKind={
                privateCoreOperatorSupportedShippingArtifactGateKind
              }
              operatorSupportedShippingArtifactGateNote={
                privateCoreOperatorSupportedShippingArtifactGateNote
              }
              operatorSupportedShippingArtifactGateTransport={
                privateCoreOperatorSupportedShippingArtifactGateTransport
              }
              operatorSupportedShippingArtifactGateEndpoint={
                privateCoreOperatorSupportedShippingArtifactGateEndpoint
              }
              operatorSupportedSnapshotNote={privateCoreOperatorSupportedSnapshotNote}
              operatorSupportedSnapshotTransport={privateCoreOperatorSupportedSnapshotTransport}
              operatorSupportedSnapshotEndpoint={privateCoreOperatorSupportedSnapshotEndpoint}
              operatorSupportedShippingArtifactNote={
                privateCoreOperatorSupportedShippingArtifactNote
              }
              operatorSupportedShippingArtifactTransport={privateCoreOperatorSupportedShippingArtifactTransport}
              operatorSupportedShippingArtifactEndpoint={privateCoreOperatorSupportedShippingArtifactEndpoint}
              operatorSupportedReleaseCandidateVersion={
                privateCoreOperatorSupportedReleaseCandidateVersion
              }
              operatorSupportedReleaseCandidateKind={
                privateCoreOperatorSupportedReleaseCandidateKind
              }
              operatorSupportedReleaseCandidateNote={
                privateCoreOperatorSupportedReleaseCandidateNote
              }
              operatorSupportedReleaseCandidateScope={
                privateCoreOperatorSupportedReleaseCandidateScope
              }
              operatorSupportedReleaseCandidateScopeNote={
                privateCoreOperatorSupportedReleaseCandidateScopeNote
              }
              operatorSupportedReleaseCandidateGateVersion={
                privateCoreOperatorSupportedReleaseCandidateGateVersion
              }
              operatorSupportedReleaseCandidateGateKind={
                privateCoreOperatorSupportedReleaseCandidateGateKind
              }
              operatorSupportedReleaseCandidateGateNote={
                privateCoreOperatorSupportedReleaseCandidateGateNote
              }
              operatorSupportedReleaseCandidateGateTransport={
                privateCoreOperatorSupportedReleaseCandidateGateTransport
              }
              operatorSupportedReleaseCandidateGateEndpoint={
                privateCoreOperatorSupportedReleaseCandidateGateEndpoint
              }
              operatorSupportedReleaseCandidateTransport={
                privateCoreOperatorSupportedReleaseCandidateTransport
              }
              operatorSupportedReleaseCandidateEndpoint={
                privateCoreOperatorSupportedReleaseCandidateEndpoint
              }
              operatorShippingArtifactVersion={privateCoreOperatorShippingArtifactVersion}
              operatorShippingArtifactKind={privateCoreOperatorShippingArtifactKind}
              operatorShippingDecisionVersion={privateCoreOperatorShippingDecisionVersion}
              operatorShippingDecisionKind={privateCoreOperatorShippingDecisionKind}
              operatorSupportedShippingDecisionNote={
                privateCoreOperatorSupportedShippingDecisionNote
              }
              operatorSendError={privateCoreOperatorSendError}
              operatorSends={privateCoreOperatorSends}
              operatorSendProofError={privateCoreOperatorSendProofError}
              operatorSendProofs={privateCoreOperatorSendProofs}
              operatorSwaps={privateCoreOperatorSwaps}
              operatorSwapProofs={privateCoreOperatorSwapProofs}
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
