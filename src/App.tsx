import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SolanaProvider } from "@solana/react-hooks";
import {
  type WalletConnector,
  watchWalletStandardConnectors,
} from "@solana/client";
import { AppLayout } from "@/components/AppLayout";
import { PrivateVaultProvider } from "@/data/context/PrivateVaultContext";
import { PrivacyFlowProvider } from "@/data/context/PrivacyFlowContext";
import { WalletProvider } from "@/data/context/WalletContext";
import { LaunchPage } from "@/pages/LaunchPage";
import { PayPage } from "@/pages/PayPage";
import { PrivacyReviewPage } from "@/pages/PrivacyReviewPage";
import { SendPage } from "@/pages/SendPage";
import { ShieldPage } from "@/pages/ShieldPage";
import { StrategyPage } from "@/pages/StrategyPage";
import { SwapPage } from "@/pages/SwapPage";
import { UnshieldPage } from "@/pages/UnshieldPage";
import {
  createSolanaClient,
  discoverWalletConnectors,
} from "@/solana/client";
const DocsLayout = lazy(() =>
  import("@/components/DocsLayout").then((m) => ({ default: m.DocsLayout })),
);
const DocsHomePage = lazy(() =>
  import("@/pages/DocsHomePage").then((m) => ({ default: m.DocsHomePage })),
);
const DocsPortalPage = lazy(() =>
  import("@/pages/DocsPortalPage").then((m) => ({ default: m.DocsPortalPage })),
);
const DocsPayPage = lazy(() =>
  import("@/pages/DocsPayPage").then((m) => ({ default: m.DocsPayPage })),
);
const DocsTrustPage = lazy(() =>
  import("@/pages/DocsTrustPage").then((m) => ({ default: m.DocsTrustPage })),
);
const DocsSecurityPage = lazy(() =>
  import("@/pages/DocsSecurityPage").then((m) => ({ default: m.DocsSecurityPage })),
);
const DocsPricingPage = lazy(() =>
  import("@/pages/DocsPricingPage").then((m) => ({ default: m.DocsPricingPage })),
);
const DocsRoadmapPage = lazy(() =>
  import("@/pages/DocsRoadmapPage").then((m) => ({ default: m.DocsRoadmapPage })),
);
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));

function getConnectorSignature(connectors: readonly WalletConnector[]) {
  return connectors
    .map((connector) => `${connector.id}:${connector.name}:${connector.ready}`)
    .join("|");
}

function SolanaRootProvider({ children }: { children: React.ReactNode }) {
  const [walletConnectors, setWalletConnectors] = React.useState<
    readonly WalletConnector[]
  >(() => discoverWalletConnectors());
  const connectorSignature = React.useMemo(
    () => getConnectorSignature(walletConnectors),
    [walletConnectors],
  );
  const client = React.useMemo(
    () => createSolanaClient(walletConnectors),
    [connectorSignature],
  );

  React.useEffect(() => {
    const stopWatching = watchWalletStandardConnectors((nextConnectors) => {
      setWalletConnectors((currentConnectors) => {
        const currentSignature = getConnectorSignature(currentConnectors);
        const nextSignature = getConnectorSignature(nextConnectors);

        return currentSignature === nextSignature
          ? currentConnectors
          : nextConnectors;
      });
    });

    return stopWatching;
  }, []);

  React.useEffect(() => () => client.destroy(), [client]);

  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}

function ProductAppRoot() {
  return (
    <SolanaRootProvider>
      <PrivateVaultProvider>
        <WalletProvider>
          <PrivacyFlowProvider>
            <AppLayout />
          </PrivacyFlowProvider>
        </WalletProvider>
      </PrivateVaultProvider>
    </SolanaRootProvider>
  );
}

function App() {
  return (
    <Suspense fallback={<div className="app-shell">Loading…</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/docs" element={<DocsLayout />}>
          <Route index element={<DocsHomePage />} />
          <Route path="portal" element={<DocsPortalPage />} />
          <Route path="pay" element={<DocsPayPage />} />
          <Route path="trust" element={<DocsTrustPage />} />
          <Route path="security" element={<DocsSecurityPage />} />
          <Route path="pricing" element={<DocsPricingPage />} />
          <Route path="roadmap" element={<DocsRoadmapPage />} />
          <Route path="*" element={<Navigate to="/docs" replace />} />
        </Route>
        <Route path="/app" element={<ProductAppRoot />}>
          <Route index element={<Navigate to="shield" replace />} />
          <Route path="shield" element={<ShieldPage />} />
          <Route path="send" element={<SendPage />} />
          <Route path="swap" element={<SwapPage />} />
          <Route path="strategy" element={<StrategyPage />} />
          <Route path="unshield" element={<UnshieldPage />} />
          <Route path="pay" element={<PayPage />} />
          <Route path="launch" element={<LaunchPage />} />
          <Route path="privacy-review" element={<PrivacyReviewPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/app/shield" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
