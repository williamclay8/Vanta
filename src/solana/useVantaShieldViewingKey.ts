import { useEffect, useState } from "react";
import { useWalletState } from "@/data/context/WalletContext";
import {
  createVantaShieldViewingKeypair,
  exportVantaShieldViewingKeypair,
  importVantaShieldViewingKeypair,
  type VantaShieldViewingKeypair,
} from "@/solana/vantaShieldViewingKey";

const STORAGE_PREFIX = "vanta:shield:viewing-key:0.1";

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

  return keypair;
}
