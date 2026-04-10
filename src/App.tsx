import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PrivacyFlowProvider } from "@/data/context/PrivacyFlowContext";
import { WalletProvider } from "@/data/context/WalletContext";
const AppDashboardPage = lazy(() => import("@/pages/AppDashboardPage").then((m) => ({ default: m.AppDashboardPage })));
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const LaunchPage = lazy(() => import("@/pages/LaunchPage").then((m) => ({ default: m.LaunchPage })));
const PayPage = lazy(() => import("@/pages/PayPage").then((m) => ({ default: m.PayPage })));
const SendPage = lazy(() => import("@/pages/SendPage").then((m) => ({ default: m.SendPage })));
const ShieldPage = lazy(() => import("@/pages/ShieldPage").then((m) => ({ default: m.ShieldPage })));
const SwapPage = lazy(() => import("@/pages/SwapPage").then((m) => ({ default: m.SwapPage })));
const UnshieldPage = lazy(() => import("@/pages/UnshieldPage").then((m) => ({ default: m.UnshieldPage })));

function App() {
  return (
    <WalletProvider>
      <PrivacyFlowProvider>
        <Suspense fallback={<div className="app-shell">Loading…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<AppDashboardPage />} />
              <Route path="shield" element={<ShieldPage />} />
              <Route path="send" element={<SendPage />} />
              <Route path="unshield" element={<UnshieldPage />} />
              <Route path="swap" element={<SwapPage />} />
              <Route path="pay" element={<PayPage />} />
              <Route path="launch" element={<LaunchPage />} />
            </Route>
          </Routes>
        </Suspense>
      </PrivacyFlowProvider>
    </WalletProvider>
  );
}

export default App;
