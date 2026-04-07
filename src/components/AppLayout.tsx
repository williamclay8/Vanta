import { NavLink, Outlet } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { NextStepGuidance } from "@/components/NextStepGuidance";
import { PositionSummary } from "@/components/PositionSummary";
import { useWalletState } from "@/context/WalletContext";

const appLinks = [
  { to: "/app", label: "Home", badge: "Live", end: true },
  { to: "/app/shield", label: "Shield", badge: "Live / MVP" },
  { to: "/app/send", label: "Send", badge: "Live" },
  { to: "/app/unshield", label: "Unshield", badge: "Live" },
  { to: "/app/swap", label: "Swap", badge: "Live / Constrained" },
  { to: "/app/pay", label: "Pay", badge: "Planned" },
];

export function AppLayout() {
  const {
    clusterLabel,
    connectWallet,
    currentConnectorName,
    disconnectWallet,
    preferredWalletConnector,
    walletAddressShort,
    walletConnected,
    walletConnecting,
    walletReady,
  } = useWalletState();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <BrandMark />
          <div>
            <strong>Vanta Suite</strong>
            <span>Privacy infrastructure for Solana</span>
          </div>
        </div>

        <nav className="app-sidebar__nav" aria-label="Modules">
          {appLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? "app-link app-link--active" : "app-link"
              }
            >
              <span>{link.label}</span>
              <small>{link.badge}</small>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__status">
          <p>Wallet boundary</p>
          <strong>
            {walletConnected
              ? `Connected on ${clusterLabel}`
              : "Connect a wallet to begin"}
          </strong>
          <span>
            {walletConnected
              ? `${walletAddressShort} is the current Public Wallet source for Shield.`
              : "Shield now uses real wallet connection state as the source of Public Wallet."}
          </span>
          <div className="wallet-status-actions">
            {!walletReady && <small>Checking available wallets...</small>}
            {walletReady && walletConnected && (
              <>
                <small>{currentConnectorName ?? "Wallet connected"}</small>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    void disconnectWallet();
                  }}
                >
                  Disconnect
                </button>
              </>
            )}
            {walletReady && !walletConnected && preferredWalletConnector && (
              <>
                <small>{preferredWalletConnector.name}</small>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void connectWallet(preferredWalletConnector.id).catch(() => {});
                  }}
                  disabled={walletConnecting}
                >
                  {walletConnecting ? "Connecting..." : "Connect wallet"}
                </button>
              </>
            )}
            {walletReady && !walletConnected && !preferredWalletConnector && (
              <small>No wallet-standard connector detected.</small>
            )}
          </div>
        </div>
      </aside>

      <main className="app-content">
        <div className="app-topbar">
          <div>
            <span>App shell</span>
            <h1>Demoable Vanta workspace for Solana</h1>
            <p className="app-topbar__copy">
              Shield is the first product action, Send is the first live
              shielded workflow, and Unshield now completes the first
              constrained exit back to Public Wallet state for `VUSD`. Swap
              now adds the first constrained `VUSD` to `SOL` transformation
              inside shielded state, and Unshield now also covers the first
              constrained shielded `SOL` exit back to Public Wallet. Pay is
              planned, and the broader Vanta network remains a future roadmap
              direction.
            </p>
          </div>
          <a className="button button-ghost" href="/">
            Back to site
          </a>
        </div>
        <div className="app-shell__overview">
          <PositionSummary />
          <NextStepGuidance />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
