import { useCallback, useEffect, useMemo, useState } from "react";
import { useWalletSession } from "@solana/react-hooks";
import { useWalletState } from "@/data/context/WalletContext";
import { vantaSolanaCluster } from "@/solana/shieldConfig";
import {
  createShieldKeyDerivationIntentPayload,
  createShieldKeyDerivationSafetyEnvelope,
  deriveShieldMasterSeedWithSafety,
  toOwnerKeyHierarchyContext,
} from "@/solana/shieldKeyDerivationIntent";
import type { CanonicalNoteOwnerContext } from "@/zk/canonicalNote";
import { createWalletDerivedCanonicalNoteOwnerContext } from "@/zk/ownerKeyHierarchy";

export type VantaShieldOwnerContextStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "unsupported"
  | "failed";

export type VantaShieldOwnerContextControls = {
  canRequestOwnerContext: boolean;
  ensureOwnerContext: () => Promise<CanonicalNoteOwnerContext>;
  errorMessage: string | null;
  ownerContext: CanonicalNoteOwnerContext | null;
  status: VantaShieldOwnerContextStatus;
};

export function useVantaShieldOwnerContext(): VantaShieldOwnerContextControls {
  const { walletAddress, walletConnected } = useWalletState();
  const walletSession = useWalletSession();
  const [ownerContext, setOwnerContext] = useState<CanonicalNoteOwnerContext | null>(null);
  const [status, setStatus] = useState<VantaShieldOwnerContextStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setOwnerContext(null);
    setStatus("idle");
    setErrorMessage(null);
  }, [walletAddress, walletConnected]);

  const canRequestOwnerContext = Boolean(walletConnected && walletAddress && walletSession?.signMessage);

  const ensureOwnerContext = useCallback(async () => {
    if (ownerContext) {
      return ownerContext;
    }

    if (!walletConnected || !walletAddress) {
      const message = "Connect a wallet before deriving recoverable Shield keys.";
      setStatus("failed");
      setErrorMessage(message);
      throw new Error(message);
    }

    const signMessage = walletSession?.signMessage;
    if (!signMessage) {
      const message = "This wallet must support message signing to derive recoverable Shield keys.";
      setStatus("unsupported");
      setErrorMessage(message);
      throw new Error(message);
    }

    setStatus("requesting");
    setErrorMessage(null);

    const payload = createShieldKeyDerivationIntentPayload({
      appDomain: "vanta",
      cluster: vantaSolanaCluster,
      owner: walletAddress,
      requester: walletAddress,
    });
    const envelope = createShieldKeyDerivationSafetyEnvelope({
      connectedWalletAddress: walletAddress,
      humanApprovedSummary: true,
    });
    try {
      const result = await deriveShieldMasterSeedWithSafety({
        envelope,
        payload,
        signMessage,
      });

      if (!result.signed || !result.ephemeralMasterSeed) {
        const message = `Recoverable Shield key derivation was not approved: ${result.decision.reason}.`;
        setStatus("failed");
        setErrorMessage(message);
        throw new Error(message);
      }

      const nextOwnerContext = createWalletDerivedCanonicalNoteOwnerContext({
        context: toOwnerKeyHierarchyContext(payload),
        masterSeed: result.ephemeralMasterSeed,
      });
      setOwnerContext(nextOwnerContext);
      setStatus("ready");
      return nextOwnerContext;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Recoverable Shield key derivation was cancelled or failed.";
      setStatus("failed");
      setErrorMessage(message);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(message);
    }
  }, [ownerContext, walletAddress, walletConnected, walletSession?.signMessage]);

  return useMemo(
    () => ({
      canRequestOwnerContext,
      ensureOwnerContext,
      errorMessage,
      ownerContext,
      status,
    }),
    [canRequestOwnerContext, ensureOwnerContext, errorMessage, ownerContext, status],
  );
}
