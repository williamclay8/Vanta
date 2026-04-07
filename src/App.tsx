import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PrivacyFlowProvider } from "@/context/PrivacyFlowContext";
import { WalletProvider } from "@/context/WalletContext";
import { AppDashboardPage } from "@/pages/AppDashboardPage";
import { HomePage } from "@/pages/HomePage";
import { LaunchPage } from "@/pages/LaunchPage";
import { PayPage } from "@/pages/PayPage";
import { SendPage } from "@/pages/SendPage";
import { ShieldPage } from "@/pages/ShieldPage";
import { SwapPage } from "@/pages/SwapPage";
import { UnshieldPage } from "@/pages/UnshieldPage";

function App() {
  return (
    <WalletProvider>
      <PrivacyFlowProvider>
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
      </PrivacyFlowProvider>
    </WalletProvider>
  );
}

export default App;
