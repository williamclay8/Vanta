import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PrivacyAssetKey = "VUSD" | "USDC" | "JTO" | "BONK";

export type RecentShieldContext = {
  asset: PrivacyAssetKey;
  amount: number;
  resultingShieldedBalance: number;
  source: "shield";
  depositSignature?: string;
  signature?: string;
  settlement?: "confirmed_deposit";
  timestamp: number;
};

type PrivacyFlowContextValue = {
  recentShield: RecentShieldContext | null;
  setRecentShield: (value: RecentShieldContext | null) => void;
};

const PrivacyFlowContext = createContext<PrivacyFlowContextValue | null>(null);

export function PrivacyFlowProvider({ children }: { children: ReactNode }) {
  const [recentShield, setRecentShield] = useState<RecentShieldContext | null>(null);

  const value = useMemo<PrivacyFlowContextValue>(
    () => ({
      recentShield,
      setRecentShield,
    }),
    [recentShield],
  );

  return (
    <PrivacyFlowContext.Provider value={value}>
      {children}
    </PrivacyFlowContext.Provider>
  );
}

export function usePrivacyFlow() {
  const context = useContext(PrivacyFlowContext);

  if (!context) {
    throw new Error("usePrivacyFlow must be used within PrivacyFlowProvider");
  }

  return context;
}
