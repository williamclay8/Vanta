import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import {
  createMobileWalletOpenLinks,
  shouldShowMobileWalletPrompt,
} from "@/components/MobileWalletOpenPrompt";
import { isBetaMode } from "@/config/deploymentMode";
import { useWalletState } from "@/data/context/WalletContext";
import { getPeerOnrampAvailability } from "@/peer/peerConfig";
import { launchPeerOnramp } from "@/peer/peerOnramp";
import type { PeerOnrampFulfillment, PeerOnrampLaunchState } from "@/peer/peerOnrampTypes";
import { useWalletPublicAssets } from "@/solana/useWalletPublicAssets";

const appLinks = [
  { to: "/app/shield", label: "Shield", action: "Add funds", end: false },
  { to: "/app/send", label: "Send", action: "Send shielded", end: false },
  { to: "/app/swap", label: "Swap", action: "Trade shielded", end: false },
  { to: "/app/strategy", label: "Strategy", action: "Plan trades", end: false },
  { to: "/app/unshield", label: "Unshield", action: "Move out", end: false },
  { to: "/app/pay", label: "Pay", action: "Get paid", end: false },
];

type MobileWalletOpenLink = {
  id: "phantom" | "solflare";
  label: string;
  href: string;
};

export function AppLayout() {
  const location = useLocation();
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
    walletAddress,
    walletAddressShort,
    walletConnected,
    walletConnecting,
    walletReady,
    solBalance,
  } = useWalletState();
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const {
    assets: walletPublicAssets,
    error: walletPublicAssetsError,
    loading: walletPublicAssetsLoading,
  } = useWalletPublicAssets({
    solBalance,
    walletAddress,
  });
  const [peerLaunchState, setPeerLaunchState] = useState<PeerOnrampLaunchState>("idle");
  const [peerLaunchFulfillment, setPeerLaunchFulfillment] =
    useState<PeerOnrampFulfillment | null>(null);
  const [peerLaunchMessage, setPeerLaunchMessage] = useState<string | null>(null);
  const [showMobileWalletPrompt, setShowMobileWalletPrompt] = useState(false);
  const [showRouteWalletPrompt, setShowRouteWalletPrompt] = useState(false);
  const [mobileWalletOpenLinks, setMobileWalletOpenLinks] = useState<MobileWalletOpenLink[]>([]);
  const [walletConnectionError, setWalletConnectionError] = useState<string | null>(null);
  const peerLaunchAttemptRef = useRef(0);
  const tabRefs = useRef(new Map<string, HTMLAnchorElement>());
  const walletPickerOpenRef = useRef(walletPickerOpen);
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
  const peerOnrampAvailability = getPeerOnrampAvailability({
    desktopSurface:
      typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
    walletAddress,
  });
  const hasUsableBalance = walletPublicAssets.length > 0;
  const peerFundingNeedsWallet = peerOnrampAvailability === "needs_wallet";
  const peerFundingNeedsTopUp =
    peerOnrampAvailability === "available" && !hasUsableBalance;
  const showPeerFundingBlock =
    !walletPublicAssetsLoading &&
    walletPublicAssetsError === null &&
    (peerFundingNeedsWallet || peerFundingNeedsTopUp);
  const peerLaunchDisabled =
    walletConnecting ||
    peerLaunchState === "launching" ||
    !walletAddress ||
    peerOnrampAvailability !== "available";
  const peerLaunchFeedback =
    peerLaunchMessage ??
    (peerLaunchState === "launching"
      ? "Opening Peer..."
      : peerLaunchState === "install_required"
        ? "Install the Peer extension, then try again."
        : peerLaunchState === "connection_required"
          ? "Connect Peer to this browser, then try again."
          : peerLaunchState === "opened"
            ? "Peer opened. Complete the funding step there."
            : peerLaunchState === "fulfilled"
              ? peerLaunchFulfillment?.bridgeStatus === "pending"
                ? "Peer intent submitted. Bridge transfer pending."
                : "Peer intent submitted."
              : peerLaunchState === "error"
                ? "Peer could not open. Try again."
                : null);

  const openWalletPicker = () => {
    setWalletPickerOpen((isOpen) => !isOpen);
  };

  const connectWithWallet = async (connectorId: string) => {
    setWalletConnectionError(null);

    try {
      await connectWallet(connectorId);
      setWalletPickerOpen(false);
    } catch {
      setWalletConnectionError("Wallet connection failed.");
    }
  };

  const generateFreshWallet = () => {
    createFreshWallet();
  };

  const resetPeerLaunchState = (message: string | null = null) => {
    peerLaunchAttemptRef.current += 1;
    setPeerLaunchFulfillment(null);
    setPeerLaunchMessage(message);
    setPeerLaunchState("idle");
  };

  const isCurrentPeerLaunchAttempt = (attemptId: number) =>
    walletPickerOpenRef.current && peerLaunchAttemptRef.current === attemptId;

  const handlePeerLaunch = async () => {
    if (!walletAddress) {
      resetPeerLaunchState("Connect a wallet first to use Peer.");
      return;
    }

    setPeerLaunchFulfillment(null);
    setPeerLaunchMessage(null);
    setPeerLaunchState("launching");
    const launchAttemptId = peerLaunchAttemptRef.current + 1;
    peerLaunchAttemptRef.current = launchAttemptId;
    let launchFulfilled = false;

    try {
      const result = await launchPeerOnramp({ recipientAddress: walletAddress }, (fulfillment) => {
        if (!isCurrentPeerLaunchAttempt(launchAttemptId)) {
          return;
        }

        launchFulfilled = true;
        setPeerLaunchFulfillment(fulfillment);
        setPeerLaunchState("fulfilled");
      });

      if (!isCurrentPeerLaunchAttempt(launchAttemptId) || launchFulfilled) {
        return;
      }

      setPeerLaunchState(result);
    } catch {
      if (!isCurrentPeerLaunchAttempt(launchAttemptId)) {
        return;
      }

      setPeerLaunchState("error");
    }
  };

  useEffect(() => {
    walletPickerOpenRef.current = walletPickerOpen;
  }, [walletPickerOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const shouldShowPrompt = shouldShowMobileWalletPrompt();
    setShowRouteWalletPrompt(shouldShowPrompt);
    setMobileWalletOpenLinks(shouldShowPrompt ? createMobileWalletOpenLinks() : []);

    window.scrollTo({ left: 0, top: 0, behavior: "auto" });

    const activeTab = tabRefs.current.get(location.pathname);
    if (!activeTab || !window.matchMedia("(max-width: 720px)").matches) {
      return;
    }

    const tabs = activeTab.closest<HTMLElement>(".app-header__tabs");
    if (!tabs) {
      return;
    }

    window.requestAnimationFrame(() => {
      const targetScrollLeft = activeTab.offsetLeft - (tabs.clientWidth - activeTab.offsetWidth) / 2;

      tabs.scrollTo({
        left: Math.max(targetScrollLeft, 0),
        behavior: "auto",
      });
    });
  }, [location.pathname]);

  useEffect(() => {
    if (!walletPickerOpen) {
      return;
    }

    const shouldShowPrompt = shouldShowMobileWalletPrompt();
    setShowMobileWalletPrompt(shouldShowPrompt);
    setMobileWalletOpenLinks(shouldShowPrompt ? createMobileWalletOpenLinks() : []);
  }, [walletPickerOpen]);

  useEffect(() => {
    if (walletPickerOpen) {
      return;
    }

    resetPeerLaunchState();
  }, [walletPickerOpen]);

  useEffect(() => {
    document.body.classList.add("app-body");

    return () => {
      document.body.classList.remove("app-body");
    };
  }, []);

  return (
    <div className="app-shell app-shell--minimal" data-product-shell="app">
      <div className="app-shell__grid" aria-hidden="true" />
      <div className="app-shell__glow app-shell__glow--left" aria-hidden="true" />
      <div className="app-shell__glow app-shell__glow--right" aria-hidden="true" />

      {isBetaMode && (
        <div className="beta-mode-banner" role="status">
          <strong>Vanta Beta</strong>
          <span>No funds move in this mode. Live private settlement is offline until production services are resumed.</span>
        </div>
      )}

      {showRouteWalletPrompt && !walletPickerOpen && mobileWalletOpenLinks.length > 0 && (
        <div className="mobile-wallet-open-prompt" role="status">
          <div>
            <span>Open Vanta in your wallet</span>
            <small>
              Safari cannot connect Phantom directly. Open this page in a wallet browser on
              mobile, or use a supported desktop browser with a wallet extension.
            </small>
          </div>
          <div className="wallet-picker__mobile-wallet-actions">
            {mobileWalletOpenLinks.map((link) => (
              <a data-wallet-open={link.id} href={link.href} key={link.id}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <header className="app-header" data-product-topbar>
        <NavLink to="/" className="app-header__brand" aria-label="Vanta home">
          <BrandMark />
          <span className="app-header__brand-copy">
            <strong>Vanta</strong>
            <small>Private settlement beta</small>
          </span>
        </NavLink>

        <div className="app-header__tabs-rail">
          <nav className="app-header__tabs" aria-label="Primary" data-product-nav>
            {appLinks.map((link) => (
              <NavLink
                key={link.to}
                ref={(element) => {
                  if (element) {
                    tabRefs.current.set(link.to, element);
                  } else {
                    tabRefs.current.delete(link.to);
                  }
                }}
                to={link.to}
                end={link.end}
                aria-label={`${link.label}: ${link.action}`}
                className={({ isActive }) =>
                  isActive ? "app-header__tab app-header__tab--active" : "app-header__tab"
                }
              >
                <span>{link.label}</span>
                <small>{link.action}</small>
              </NavLink>
            ))}
          </nav>
          <span className="app-header__tabs-cue" aria-hidden="true">
            Swipe for more
          </span>
        </div>

        <div className="app-header__wallet">
          <button
            className="app-header__account-trigger"
            type="button"
            onClick={openWalletPicker}
            disabled={walletConnecting}
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
                  Standard wallet discovery shows the Solana wallets available in this browser.
                  Use a fresh wallet for the strongest privacy.
                </p>
                {showMobileWalletPrompt && mobileWalletOpenLinks.length > 0 && (
                  <div className="wallet-picker__mobile-wallet-prompt" role="status">
                    <div>
                      <span>Open Vanta in your wallet</span>
                      <small>
                        Safari cannot connect Phantom directly. Open this page in a wallet browser
                        on mobile, or use a supported desktop browser with a wallet extension.
                      </small>
                    </div>
                    <div className="wallet-picker__mobile-wallet-actions">
                      {mobileWalletOpenLinks.map((link) => (
                        <a data-wallet-open={link.id} href={link.href} key={link.id}>
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="wallet-picker__safety" role="status">
                  <span>Simulation before signing</span>
                  <small>Live actions are simulated before wallet approval.</small>
                </div>
                {walletConnectionError && (
                  <div className="wallet-picker__connection-error" role="alert">
                    <span>{walletConnectionError}</span>
                    <small>Check that the wallet is unlocked and allowed to connect to Vanta.</small>
                  </div>
                )}
                {showPeerFundingBlock && (
                  <div className="wallet-picker__section">
                    <span className="wallet-picker__section-label">Funding</span>
                    <div className="wallet-picker__fresh" role="status">
                      <div>
                        <span>No wallet funds detected</span>
                        <small>
                          Connect, create a fresh wallet, or top up with Peer on desktop.
                        </small>
                      </div>
                      <button type="button" disabled={peerLaunchDisabled} onClick={handlePeerLaunch}>
                        Top up with Peer
                      </button>
                    </div>
                    {peerLaunchFeedback && (
                      <div className="wallet-picker__fresh-result" role="status">
                        <span>Peer funding</span>
                        <small>{peerLaunchFeedback}</small>
                        {peerLaunchFulfillment?.trackingUrl && (
                          <a href={peerLaunchFulfillment.trackingUrl} target="_blank" rel="noreferrer">
                            Track transfer
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                      Install a standard Solana wallet then refresh Vanta.
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

      <main className="app-content app-content--minimal" data-route-path={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
}
