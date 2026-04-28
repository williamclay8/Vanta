import { useCallback, useEffect, useMemo, useState } from "react";
import { useWalletState } from "@/data/context/WalletContext";
import {
  createVantaShieldViewingKeypair,
  exportVantaShieldViewingKeypair,
  importVantaShieldViewingKeypair,
  type VantaShieldViewingKeypair,
} from "@/solana/vantaShieldViewingKey";

const STORAGE_PREFIX = "vanta:shield:viewing-key:0.1";

export type VantaShieldViewingKeyControls = VantaShieldViewingKeypair & {
  exportText: string;
  importText: (serializedKeypair: string) => void;
  reset: () => void;
};

function storageKeyForOwner(owner: string) {
  return `${STORAGE_PREFIX}:${owner}`;
}

function loadOrCreateViewingKey(owner: string): VantaShieldViewingKeypair | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = storageKeyForOwner(owner);
  const stored = window.localStorage.getItem(storageKey);
  if (stored) {
    try {
      return importVantaShieldViewingKeypair(JSON.parse(stored) as VantaShieldViewingKeypair);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }

  const keypair = createVantaShieldViewingKeypair();
  window.localStorage.setItem(storageKey, JSON.stringify(exportVantaShieldViewingKeypair(keypair)));
  return keypair;
}

function serializeViewingKeypair(keypair: VantaShieldViewingKeypair): string {
  return JSON.stringify(exportVantaShieldViewingKeypair(keypair), null, 2);
}

function parseViewingKeypair(serializedKeypair: string): VantaShieldViewingKeypair {
  return importVantaShieldViewingKeypair(
    JSON.parse(serializedKeypair) as VantaShieldViewingKeypair,
  );
}

export function useVantaShieldViewingKey() {
  const { walletAddress, walletConnected } = useWalletState();
  const [keypair, setKeypair] = useState<VantaShieldViewingKeypair | null>(null);

  useEffect(() => {
    if (!walletConnected || !walletAddress) {
      setKeypair(null);
      return;
    }

    setKeypair(loadOrCreateViewingKey(walletAddress));
  }, [walletAddress, walletConnected]);

  const importText = useCallback(
    (serializedKeypair: string) => {
      if (!walletConnected || !walletAddress || typeof window === "undefined") {
        throw new Error("Connect a wallet before importing a Shield viewing key.");
      }

      const importedKeypair = parseViewingKeypair(serializedKeypair);
      window.localStorage.setItem(
        storageKeyForOwner(walletAddress),
        serializeViewingKeypair(importedKeypair),
      );
      setKeypair(importedKeypair);
    },
    [walletAddress, walletConnected],
  );

  const reset = useCallback(() => {
    if (!walletConnected || !walletAddress || typeof window === "undefined") {
      throw new Error("Connect a wallet before resetting a Shield viewing key.");
    }

    const nextKeypair = createVantaShieldViewingKeypair();
    window.localStorage.setItem(
      storageKeyForOwner(walletAddress),
      serializeViewingKeypair(nextKeypair),
    );
    setKeypair(nextKeypair);
  }, [walletAddress, walletConnected]);

  return useMemo<VantaShieldViewingKeyControls | null>(() => {
    if (!keypair) {
      return null;
    }

    return {
      ...keypair,
      exportText: serializeViewingKeypair(keypair),
      importText,
      reset,
    };
  }, [importText, keypair, reset]);
}
