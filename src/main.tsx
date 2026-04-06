import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SolanaProvider } from "@solana/react-hooks";
import {
  type WalletConnector,
  watchWalletStandardConnectors,
} from "@solana/client";
import App from "@/App";
import {
  createSolanaClient,
  discoverWalletConnectors,
} from "@/solana/client";
import "@/styles.css";

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SolanaRootProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SolanaRootProvider>
  </React.StrictMode>,
);
