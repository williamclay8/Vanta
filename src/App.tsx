import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { VantaBootSplash } from "@/components/VantaBootSplash";
import { NotFoundPage } from "@/pages/NotFoundPage";
const ProductAppRoot = lazy(() =>
  import("@/ProductAppRoot").then((m) => ({ default: m.ProductAppRoot })),
);
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
const DocsRoadmapPage = lazy(() =>
  import("@/pages/DocsRoadmapPage").then((m) => ({ default: m.DocsRoadmapPage })),
);
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const ManifestoPage = lazy(() =>
  import("@/pages/ManifestoPage").then((m) => ({ default: m.ManifestoPage })),
);
const AppDashboardPage = lazy(() =>
  import("@/pages/AppDashboardPage").then((m) => ({ default: m.AppDashboardPage })),
);
const ShieldPage = lazy(() =>
  import("@/pages/ShieldPage").then((m) => ({ default: m.ShieldPage })),
);
const SendPage = lazy(() =>
  import("@/pages/SendPage").then((m) => ({ default: m.SendPage })),
);
const SwapPage = lazy(() => import("@/pages/SwapPage").then((m) => ({ default: m.SwapPage })));
const StrategyPage = lazy(() =>
  import("@/pages/StrategyPage").then((m) => ({ default: m.StrategyPage })),
);
const UnshieldPage = lazy(() =>
  import("@/pages/UnshieldPage").then((m) => ({ default: m.UnshieldPage })),
);
const PayPage = lazy(() => import("@/pages/PayPage").then((m) => ({ default: m.PayPage })));
const ReceiptVerificationPage = lazy(() =>
  import("@/pages/ReceiptVerificationPage").then((m) => ({
    default: m.ReceiptVerificationPage,
  })),
);
const LaunchPage = lazy(() =>
  import("@/pages/LaunchPage").then((m) => ({ default: m.LaunchPage })),
);
const RecoverySettingsPage = lazy(() =>
  import("@/pages/RecoverySettingsPage").then((m) => ({
    default: m.RecoverySettingsPage,
  })),
);
const PrivacyReviewPage = lazy(() =>
  import("@/pages/PrivacyReviewPage").then((m) => ({ default: m.PrivacyReviewPage })),
);
const ProofPage = lazy(() => import("@/pages/ProofPage").then((m) => ({ default: m.ProofPage })));
const ActualPrivateSettlementPage = lazy(() =>
  import("@/pages/ActualPrivateSettlementPage").then((m) => ({
    default: m.ActualPrivateSettlementPage,
  })),
);

function App() {
  return (
    <Suspense fallback={<VantaBootSplash />}>
      <RouteErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/manifesto" element={<ManifestoPage />} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<DocsHomePage />} />
            <Route path="portal" element={<DocsPortalPage />} />
            <Route path="pay" element={<DocsPayPage />} />
            <Route path="trust" element={<DocsTrustPage />} />
            <Route path="security" element={<DocsSecurityPage />} />
            <Route path="roadmap" element={<DocsRoadmapPage />} />
            <Route path="*" element={<NotFoundPage surface="docs" />} />
          </Route>
          <Route path="/app" element={<ProductAppRoot />}>
            <Route index element={<Navigate to="/app/shield" replace />} />
            <Route path="dashboard" element={<AppDashboardPage />} />
            <Route path="shield" element={<ShieldPage />} />
            <Route path="send" element={<SendPage />} />
            <Route path="swap" element={<SwapPage />} />
            <Route path="strategy" element={<StrategyPage />} />
            <Route path="unshield" element={<UnshieldPage />} />
            <Route path="pay" element={<PayPage />} />
            <Route path="launch" element={<LaunchPage />} />
            <Route path="settings/recovery" element={<RecoverySettingsPage />} />
            <Route path="privacy-review" element={<PrivacyReviewPage />} />
            <Route path="proof" element={<ProofPage />} />
            <Route path="actual-private-settlement" element={<ActualPrivateSettlementPage />} />
            <Route path="*" element={<NotFoundPage surface="app" />} />
          </Route>
          <Route path="/receipt/:receiptId" element={<ReceiptVerificationPage />} />
          <Route path="*" element={<NotFoundPage surface="site" />} />
        </Routes>
      </RouteErrorBoundary>
    </Suspense>
  );
}

export default App;
