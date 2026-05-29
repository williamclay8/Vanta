import { useEffect, useMemo, useState } from "react";
import { toRecoverableSolDepositsErrorMessage } from "@/components/shield/shieldRecoveryUtils";
import {
  fetchNativeSolShieldDepositCandidates,
  type NativeSolShieldDepositCandidate,
} from "@/solana/nativeSolShield";
import { loadVerifiedNativeSolShieldDepositSignatures } from "@/solana/verifiedNativeSolShieldNotes";
import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";

type UseShieldRecoverableSolDepositsArgs = {
  enabled: boolean;
  shieldedSolNotes: readonly VantaShieldedSolNote[];
  vaultOwner: string | null | undefined;
  walletAddress: string | null | undefined;
};

export function useShieldRecoverableSolDeposits({
  enabled,
  shieldedSolNotes,
  vaultOwner,
  walletAddress,
}: UseShieldRecoverableSolDepositsArgs) {
  const [recoverableSolDeposits, setRecoverableSolDeposits] = useState<
    NativeSolShieldDepositCandidate[]
  >([]);
  const [recoverableSolDepositsLoading, setRecoverableSolDepositsLoading] = useState(false);
  const [recoverableSolDepositsError, setRecoverableSolDepositsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!enabled || !walletAddress || !vaultOwner) {
      setRecoverableSolDeposits([]);
      setRecoverableSolDepositsError(null);
      setRecoverableSolDepositsLoading(false);
      return;
    }

    let cancelled = false;
    const existingDepositSignatures = new Set([
      shieldedSolNotes
        .map((note) => note.depositSignature)
        .filter((signature): signature is string => typeof signature === "string" && signature.length > 0),
      ...loadVerifiedNativeSolShieldDepositSignatures({
        owner: walletAddress,
        vaultOwner,
      }),
    ].flat());

    setRecoverableSolDepositsLoading(true);
    setRecoverableSolDepositsError(null);

    fetchNativeSolShieldDepositCandidates({
      existingDepositSignatures,
      owner: walletAddress,
      vaultOwner,
    })
      .then((deposits) => {
        if (!cancelled) {
          setRecoverableSolDeposits(deposits);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRecoverableSolDeposits([]);
          setRecoverableSolDepositsError(toRecoverableSolDepositsErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecoverableSolDepositsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, shieldedSolNotes, vaultOwner, walletAddress]);

  const latestRecoverableSolDeposit = useMemo(
    () => recoverableSolDeposits[0] ?? null,
    [recoverableSolDeposits],
  );

  return {
    latestRecoverableSolDeposit,
    recoverableSolDeposits,
    recoverableSolDepositsError,
    recoverableSolDepositsLoading,
    setRecoverableSolDeposits,
  };
}
