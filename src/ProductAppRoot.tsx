import React from "react";
import { SolanaProvider } from "@solana/react-hooks";
import type { WalletConnector } from "@solana/client";
import { AppLayout } from "@/components/AppLayout";
import { PrivateVaultProvider } from "@/data/context/PrivateVaultContext";
import { PrivacyFlowProvider } from "@/data/context/PrivacyFlowContext";
import { WalletProvider } from "@/data/context/WalletContext";
import {
  createSolanaClient,
  discoverWalletConnectors,
  watchVantaWalletStandardConnectors,
} from "@/solana/client";

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
    const stopWatching = watchVantaWalletStandardConnectors((nextConnectors) => {
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

export function ProductAppRoot() {
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
