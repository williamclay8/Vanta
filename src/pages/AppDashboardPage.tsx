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
    privateCoreOperatorConsumeError,
    privateCoreOperatorConsumes,
    privateCoreOperatorCurrentRoot,
    privateCoreOperatorLatestConsume,
    privateCoreOperatorLatestRoot,
    privateCoreOperatorRootCurrentnessLabel,
    privateCoreOperatorRootError,
    privateCoreOperatorRootRegistrationStatus,
    privateCoreOperatorRoots,
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
              operatorCurrentRoot={privateCoreOperatorCurrentRoot}
              operatorConsumeError={privateCoreOperatorConsumeError}
              operatorConsumes={privateCoreOperatorConsumes}
              operatorLatestConsume={privateCoreOperatorLatestConsume}
              operatorLatestRoot={privateCoreOperatorLatestRoot}
              operatorRootCurrentnessLabel={privateCoreOperatorRootCurrentnessLabel}
              operatorRootError={privateCoreOperatorRootError}
              operatorRootRegistrationStatus={privateCoreOperatorRootRegistrationStatus}
              operatorRoots={privateCoreOperatorRoots}
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
