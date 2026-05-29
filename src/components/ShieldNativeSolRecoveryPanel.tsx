import type { NativeSolShieldDepositCandidate } from "@/solana/nativeSolShield";

type ShieldNativeSolRecoveryStatus =
  | "idle"
  | "awaiting_wallet_confirmation"
  | "routing_public_swap"
  | "shielding_in_progress"
  | "entering_shielded_state"
  | "recovery_recorded"
  | "complete"
  | "failed";

type ShieldNativeSolRecoveryPanelProps = {
  hasPendingNativeSolShieldEvidence: boolean;
  isBetaMode: boolean;
  latestRecoverableSolDeposit: NativeSolShieldDepositCandidate | null;
  onBeginRecovery: (deposit: NativeSolShieldDepositCandidate) => void;
  recoverableSolDepositsError: string | null;
  recoverableSolDepositsLoading: boolean;
  status: ShieldNativeSolRecoveryStatus;
};

export function ShieldNativeSolRecoveryPanel({
  hasPendingNativeSolShieldEvidence,
  isBetaMode,
  latestRecoverableSolDeposit,
  onBeginRecovery,
  recoverableSolDepositsError,
  recoverableSolDepositsLoading,
  status,
}: ShieldNativeSolRecoveryPanelProps) {
  return (
    <div className="shield-recovery-panel">
      <div>
        <strong>Recover SOL vault deposit</strong>
        <p>
          {latestRecoverableSolDeposit
            ? `${latestRecoverableSolDeposit.amountDisplay} SOL reached the vault but isn't in your shield state yet.`
            : hasPendingNativeSolShieldEvidence
              ? "Saved locally, waiting on ledger sync. No second transfer needed."
              : recoverableSolDepositsLoading
                ? "Checking recent vault deposits…"
                : recoverableSolDepositsError
                  ? recoverableSolDepositsError
                  : "No unrecorded vault deposit found."}
        </p>
      </div>
      <button
        className="button button-ghost"
        type="button"
        disabled={
          isBetaMode ||
          !latestRecoverableSolDeposit ||
          status === "routing_public_swap" ||
          status === "shielding_in_progress" ||
          status === "entering_shielded_state"
        }
        onClick={() => {
          if (latestRecoverableSolDeposit) {
            onBeginRecovery(latestRecoverableSolDeposit);
          }
        }}
      >
        Record shielded SOL
      </button>
    </div>
  );
}
