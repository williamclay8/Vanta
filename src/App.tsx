import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { WalletProvider } from "@/data/context/WalletContext";
const PrivacyFlowProvider = lazy(() =>
  import("@/data/context/PrivacyFlowContext").then((m) => ({
    default: m.PrivacyFlowProvider,
  })),
);
const LaunchPage = lazy(() => import("@/pages/LaunchPage").then((m) => ({ default: m.LaunchPage })));
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const PayPage = lazy(() => import("@/pages/PayPage").then((m) => ({ default: m.PayPage })));
const SendPage = lazy(() => import("@/pages/SendPage").then((m) => ({ default: m.SendPage })));
const ShieldPage = lazy(() => import("@/pages/ShieldPage").then((m) => ({ default: m.ShieldPage })));
const StrategyPage = lazy(() =>
  import("@/pages/StrategyPage").then((m) => ({ default: m.StrategyPage })),
);
const SwapPage = lazy(() => import("@/pages/SwapPage").then((m) => ({ default: m.SwapPage })));
const UnshieldPage = lazy(() => import("@/pages/UnshieldPage").then((m) => ({ default: m.UnshieldPage })));

function App() {
  return (
    <WalletProvider>
      <Suspense fallback={<div className="app-shell">Loading…</div>}>
        <PrivacyFlowProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="send" replace />} />
              <Route path="shield" element={<ShieldPage />} />
              <Route path="send" element={<SendPage />} />
              <Route path="swap" element={<SwapPage />} />
              <Route path="strategy" element={<StrategyPage />} />
              <Route path="unshield" element={<UnshieldPage />} />
              <Route path="pay" element={<PayPage />} />
              <Route path="launch" element={<LaunchPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/app/send" replace />} />
          </Routes>
        </PrivacyFlowProvider>
      </Suspense>
    </WalletProvider>
  );
}

export default App;
