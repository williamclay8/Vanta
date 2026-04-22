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
  const connectedWalletLabel = walletAddressShort ?? currentConnectorName ?? "Connected";
  const accountTriggerLabel = !walletReady
    ? "Checking"
    : walletConnected
      ? connectedWalletLabel
      : "Connect";
  const accountTriggerHint = walletConnected
    ? currentConnectorName ?? "Wallet"
    : preferredWalletConnector
      ? "Wallet"
      : "Fresh wallet";
  const accountTriggerAccessibleLabel = walletConnected
    ? `Open wallet menu for ${connectedWalletLabel}`
    : "Open wallet menu to connect or create a fresh wallet";
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
          <button
            className="app-header__account-trigger"
            type="button"
            onClick={openWalletPicker}
            disabled={!walletReady || walletConnecting}
            aria-haspopup="dialog"
            aria-expanded={walletPickerOpen}
            aria-label={walletConnecting ? "Wallet connection in progress" : accountTriggerAccessibleLabel}
          >
            <span>{walletConnecting ? "Connecting" : accountTriggerLabel}</span>
            <small>{accountTriggerHint}</small>
          </button>
          {walletPickerOpen && (
            <>
              <button
                className="wallet-picker__scrim"
                type="button"
                aria-label="Close wallet menu"
                onClick={() => {
                  setWalletPickerOpen(false);
                }}
              />
              <div className="wallet-picker" role="dialog" aria-label="Wallet menu">
                <div className="wallet-picker__header">
                  <span>Wallet</span>
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
                  Wallet standard discovery shows the Solana wallets available in this browser.
                  Use a fresh wallet for strongest privacy.
                </p>
                {walletConnected && (
                  <div className="wallet-picker__connected">
                    <div>
                      <span>{connectedWalletLabel}</span>
                      <small>{currentConnectorName ?? "Connected wallet"}</small>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void disconnectWallet();
                        setWalletPickerOpen(false);
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
                <div className="wallet-picker__section">
                  <span className="wallet-picker__section-label">
                    {walletConnected ? "Detected wallets · Switch wallet" : "Detected wallets"}
                  </span>
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
                      Install a Solana wallet standard wallet, then refresh Vanta.
                    </div>
                  )}
                </div>
                <div className="wallet-picker__section">
                  <span className="wallet-picker__section-label">Fresh wallet</span>
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
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="app-content app-content--minimal">
        <Outlet />
      </main>
    </div>
  );
}
