import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { isBetaMode } from "@/config/deploymentMode";
import { useWalletState } from "@/data/context/WalletContext";

const appLinks = [
  { to: "/app/shield", label: "Shield", end: false },
  { to: "/app/send", label: "Send", end: false },
  { to: "/app/swap", label: "Swap", end: false },
  { to: "/app/strategy", label: "Strategy", end: false },
  { to: "/app/unshield", label: "Unshield", end: false },
  { to: "/app/pay", label: "Pay", end: false },
];

export function AppLayout() {
  const {
    connectWallet,
    createFreshWallet,
    currentConnectorName,
    downloadFreshWalletRecoveryFile,
    disconnectWallet,
    freshWalletAddressShort,
    freshWalletRecoveryFileName,
    preferredWalletConnector,
    walletConnectors,
    walletAddressShort,
    walletConnected,
    walletConnecting,
    walletReady,
  } = useWalletState();
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const sortedWalletConnectors = useMemo(
    () =>
      [...walletConnectors].sort((left, right) => {
        if (left.ready !== right.ready) {
          return left.ready ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      }),
    [walletConnectors],
  );

  const openWalletPicker = () => {
    setWalletPickerOpen((isOpen) => !isOpen);
  };

  const connectWithWallet = async (connectorId: string) => {
    await connectWallet(connectorId).catch(() => {});
    setWalletPickerOpen(false);
  };

  const generateFreshWallet = () => {
    createFreshWallet();
  };

  useEffect(() => {
    document.body.classList.add("app-body");

    const cursor = document.getElementById("appCursor");
    const ring = document.getElementById("appCursorRing");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let frame = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;

      if (cursor) {
        cursor.style.left = `${mouseX}px`;
        cursor.style.top = `${mouseY}px`;
      }
    };

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      if (ring) {
        ring.style.left = `${ringX}px`;
        ring.style.top = `${ringY}px`;
      }

      frame = window.requestAnimationFrame(animateRing);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animateRing();

    return () => {
      document.body.classList.remove("app-body");
      window.removeEventListener("mousemove", handleMouseMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="app-shell app-shell--minimal">
      <div className="app-cursor" id="appCursor" aria-hidden="true" />
      <div className="app-cursor-ring" id="appCursorRing" aria-hidden="true" />
      <div className="app-shell__grid" aria-hidden="true" />
      <div className="app-shell__glow app-shell__glow--left" aria-hidden="true" />
      <div className="app-shell__glow app-shell__glow--right" aria-hidden="true" />

      {isBetaMode && (
        <div className="beta-mode-banner" role="status">
          <strong>Vanta Beta</strong>
          <span>No funds move in this mode. Live private settlement is offline until production services are resumed.</span>
        </div>
      )}

      <header className="app-header">
        <NavLink to="/app/send" className="app-header__brand" aria-label="Vanta">
          <BrandMark />
          <strong>Vanta</strong>
        </NavLink>

        <nav className="app-header__tabs" aria-label="Primary">
          {appLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? "app-header__tab app-header__tab--active" : "app-header__tab"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-header__wallet">
          {!walletReady && <span className="app-header__wallet-text">Checking wallets</span>}
          {walletReady && walletConnected && (
            <>
              <span className="app-header__wallet-text">
                {walletAddressShort ?? currentConnectorName ?? "Connected"}
              </span>
              {sortedWalletConnectors.length > 0 && (
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={openWalletPicker}
                  disabled={walletConnecting}
                >
                  Connect another wallet
                </button>
              )}
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
            <button
              className="button button-primary"
              type="button"
              onClick={openWalletPicker}
              disabled={walletConnecting}
            >
              {walletConnecting ? "Connecting..." : "Connect wallet"}
            </button>
          )}
          {walletReady && !walletConnected && !preferredWalletConnector && (
            <button
              className="button button-primary"
              type="button"
              onClick={openWalletPicker}
            >
              Create wallet
            </button>
          )}
          {walletPickerOpen && (
            <div className="wallet-picker" role="dialog" aria-label="Connect wallet">
              <div className="wallet-picker__header">
                <span>Detected wallets</span>
                <button
                  type="button"
                  aria-label="Close wallet picker"
                  onClick={() => {
                    setWalletPickerOpen(false);
                  }}
                >
                  Close
                </button>
              </div>
              <p>
                Wallet Standard discovery shows the Solana wallets available in this browser.
                Use a fresh wallet for strongest privacy.
              </p>
              <div className="wallet-picker__fresh">
                <div>
                  <span>Create fresh wallet</span>
                  <small>
                    Generated in this browser. Import it into Phantom or Solflare to sign live actions.
                  </small>
                </div>
                <button type="button" onClick={generateFreshWallet}>
                  Create
                </button>
              </div>
              {freshWalletAddressShort && (
                <div className="wallet-picker__fresh-result" role="status">
                  <span>{freshWalletAddressShort}</span>
                  <small>{freshWalletRecoveryFileName ?? "Recovery file ready"}</small>
                  <button type="button" onClick={downloadFreshWalletRecoveryFile}>
                    Download recovery file
                  </button>
                </div>
              )}
              {sortedWalletConnectors.length > 0 ? (
                <div className="wallet-picker__list">
                  {sortedWalletConnectors.map((connector) => (
                    <button
                      className="wallet-picker__option"
                      disabled={walletConnecting || !connector.ready}
                      key={connector.id}
                      type="button"
                      onClick={() => {
                        void connectWithWallet(connector.id);
                      }}
                    >
                      <span>{connector.name}</span>
                      <small>{connector.ready ? "Available" : "Unavailable"}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="wallet-picker__empty">
                  Install a Solana Wallet Standard wallet, then refresh Vanta.
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="app-content app-content--minimal">
        <Outlet />
      </main>
    </div>
  );
}
