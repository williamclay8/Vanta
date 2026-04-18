import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { useWalletState } from "@/data/context/WalletContext";

const appLinks = [
  { to: "/app/send", label: "Send", end: false },
  { to: "/app/swap", label: "Swap", end: false },
  { to: "/app/pay", label: "Pay", end: false },
];

export function AppLayout() {
  const {
    connectWallet,
    currentConnectorName,
    disconnectWallet,
    preferredWalletConnector,
    walletAddressShort,
    walletConnected,
    walletConnecting,
    walletReady,
  } = useWalletState();

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
              onClick={() => {
                void connectWallet(preferredWalletConnector.id).catch(() => {});
              }}
              disabled={walletConnecting}
            >
              {walletConnecting ? "Connecting..." : "Connect wallet"}
            </button>
          )}
          {walletReady && !walletConnected && !preferredWalletConnector && (
            <span className="app-header__wallet-text">No wallet detected</span>
          )}
        </div>
      </header>

      <main className="app-content app-content--minimal">
        <Outlet />
      </main>
    </div>
  );
}
